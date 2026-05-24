// ============================================================
// KIRA RESEARCH — api/_lib/studio-worker.js
// The Studio gen orchestrator. Runs the 7 stages of the
// kira-research-report skill via the Anthropic API and writes
// output back to Supabase + the studio-reports bucket.
//
// PHASE N MVP SCOPE
//   • Real Anthropic API calls for stages 1 (parse), 3 (plan),
//     4 (web_search), 5 (per-section content).
//   • Stage 2 is decided inline in this file (UC2 vs UC3).
//   • Stage 6 (charts) is deferred — sections render text-only.
//   • Stage 7 (render) POSTs to existing /api/render-pdf, uploads
//     output to the studio-reports bucket, then inserts the
//     studio_reports row and marks the job completed.
//
//   • Uploaded files (UC3) are referenced by FILENAME ONLY in the
//     prompt for now — file-content extraction is a follow-up
//     phase (would need docx/pdf/xlsx parsers in this function).
//     Henry confirmed file upload was Phase N scope but full
//     extraction can iterate.
//
//   • Local-language search (M.1/M.4) is signalled in the
//     analyst prompt — Anthropic's web_search tool accepts
//     queries in any language so we just instruct the model.
//
// SAFETY
//   • Never mentions "Claude", "McKinsey", or any competitor name
//     in generated output (system prompt enforces this).
//   • Never frames KIRA as an "AI platform / SaaS / app".
//   • Source tags (L.3): every numeric claim carries
//     [<alias> <year>] or [Kira estimates].
//   • PDF visually indistinguishable from consulting-grade output
//     per Henry's brief — no AI watermark.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import {
  STUDIO_REPORTS_BUCKET,
  sb, uploadToBucket, updateJobProgress, logActivity, slugify
} from './studio-shared.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// ---------------------------------------------------------------
// Configuration knobs
// ---------------------------------------------------------------
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL             = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
const RENDER_PDF_URL    = process.env.PDF_RENDER_URL  || 'https://kiraresearch.com/api/render-pdf';
const PDF_RENDER_SECRET = process.env.PDF_RENDER_SECRET;

// Max parallel section-content calls. Higher = faster but more API pressure.
const SECTION_CONCURRENCY = 3;
// Number of sections in the MVP report — smaller than the full 19-section
// blueprint so the gen fits comfortably inside the 800s function budget.
const TARGET_SECTIONS     = 10;

// ── Stage 4 (research) configuration — Phase N.17 ────────────
// PREVIOUSLY: one monolithic Stage 4 message.create with
// `max_uses: 18` letting the model autonomously plan + execute
// all research in a single turn. This worked for well-anchored
// industry topics but blew the 13.3-min Vercel budget on niche
// or single-company queries (the model kept retrying searches
// until it hit max_uses).
//
// NOW: Stage 4 fans out to one research call PER SECTION, capped
// at PER_SECTION_SEARCHES each. Calls run in parallel (RESEARCH_
// CONCURRENCY at a time) and each is bounded by a hard timeout.
// Mimics the per-section research pattern of the UC1 skill in
// Claude Chat and gives the model a clear, focused scope per call
// instead of a 10-section monolith.
const PER_SECTION_SEARCHES   = 3;
const RESEARCH_CONCURRENCY   = 3;
const STAGE4_SECTION_TIMEOUT = 90 * 1000;       // 90s per section
const STAGE4_OVERALL_TIMEOUT = 6 * 60 * 1000;   // 6 min total budget

const SKILL_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'skills', 'kira-research-report'
);

// ---------------------------------------------------------------
// Lazy-loaded master CSS — keeps Studio outputs visually identical
// to consulting reports (per Henry's no-watermark brief).
// ---------------------------------------------------------------
let _cachedCss = null;
async function loadMasterCss() {
  if (_cachedCss) return _cachedCss;
  try {
    _cachedCss = await readFile(
      path.join(SKILL_DIR, 'templates', 'master_styles.css'),
      'utf8'
    );
  } catch (err) {
    console.warn('[studio-worker] master_styles.css unavailable, using minimal fallback:', err.message);
    _cachedCss = `
      body { font-family: 'Inter', system-ui, sans-serif; margin: 0; color: #0F172A; background:#fff; }
      .page { width: 1280px; min-height: 720px; padding: 72px; box-sizing: border-box; page-break-after: always; }
      h1,h2,h3 { font-weight: 700; line-height: 1.15; }
      h1 { font-size: 56px; margin: 0 0 24px; }
      h2 { font-size: 32px; margin: 0 0 16px; color:#1E6FFF; }
      h3 { font-size: 22px; margin: 24px 0 12px; }
      p { font-size: 16px; line-height: 1.55; margin: 0 0 14px; }
      .eyebrow { font-size: 14px; letter-spacing: .08em; text-transform: uppercase; color:#1E6FFF; margin-bottom: 16px; }
      .source-key { font-size: 11px; color:#64748B; border-top: 1px solid #E2E8F0; padding-top: 12px; margin-top: 32px; line-height:1.5; }
    `;
  }
  return _cachedCss;
}

// ---------------------------------------------------------------
// Anthropic client
// ---------------------------------------------------------------
function client() {
  if (!ANTHROPIC_API_KEY) throw new Error('missing_anthropic_api_key');
  return new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

// Extract concatenated text from a non-streaming message response.
function textFromMessage(msg) {
  if (!msg || !Array.isArray(msg.content)) return '';
  return msg.content
    .filter(b => b && b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text)
    .join('\n')
    .trim();
}

// Strip ```json fences and parse. Falls back to extracting the first
// {...} block. Throws if no parseable JSON is found.
function parseJsonLoose(s) {
  if (!s) throw new Error('empty_json');
  let t = s.trim();
  const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) t = fenceMatch[1].trim();
  try { return JSON.parse(t); } catch (_) { /* fall through */ }
  // Best-effort: pick the first {...} block.
  const start = t.indexOf('{');
  const end   = t.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(t.slice(start, end + 1));
  }
  throw new Error('json_parse_failed');
}

// ---------------------------------------------------------------
// Anti-positioning blacklist — system prompt enforces it; we also
// scrub belt-and-braces on every text chunk before assembly.
// ---------------------------------------------------------------
const BANNED_WORDS = ['Claude', 'McKinsey', 'Mordor', 'Frost', 'Euromonitor', 'Synovate', 'Ipsos', 'IMARC'];
function scrub(text) {
  if (!text) return text;
  let out = text;
  BANNED_WORDS.forEach(w => {
    out = out.replace(new RegExp(`\\b${w}\\b`, 'gi'), '[redacted]');
  });
  return out;
}

// ===============================================================
// STAGE 1 — Parse topic input
// ===============================================================
async function stage1ParseTopic({ topic_input, uploaded_file_paths }) {
  const c = client();
  const system = `You are the input parser for KIRA Research's Studio report generator.

Given a user's free-text topic (and optionally a list of filenames they uploaded), return a single JSON object describing the report to generate. No prose, no preamble — JSON only.

Required fields:
- country: best-guess primary country (e.g. "Vietnam", "South Korea", "Brazil"). If pan-regional, pick the most prominent. If purely cross-border, return "Global".
- country_iso: ISO 3166-1 alpha-2 (e.g. "VN", "KR", "BR"). "XX" for Global.
- industry: short industry/topic phrase (e.g. "coffee", "fintech", "EV charging").
- industry_normalized: lowercase slug-friendly form (e.g. "coffee", "fintech", "ev-charging").
- year: target analysis year as integer (default to current year + 1 if not specified; today is 2026).
- scope: 1-sentence phrase describing what the report covers ("market sizing + competitive landscape + 2027 outlook").
- intent_keywords: 3-6 short noun phrases the user implicitly wants covered.
- local_language_code: LLM-infer the BUSINESS PRESS language of the country (any ISO 639-1; NOT the official-language list). Examples: VN→vi, KR→ko, BR→pt, MX→es, EG→ar, CH→de, IN→en, SG→en, HK→en. "en" for Global.
- local_language_name: full English name of that language ("Vietnamese", "Korean", "Portuguese (Brazil)", etc.).
- has_uploaded_files: boolean.
- uploaded_file_summary: 1-line description if files present, else null.
- parse_notes: 1-2 sentences explaining your reasoning, especially for the language pick if non-obvious.
- confidence: 0..1 float — your subjective confidence in the parse.

Hard rules:
- NEVER use the words: Claude, McKinsey, Mordor, Frost, Euromonitor, Synovate, Ipsos, IMARC.
- NEVER frame KIRA as an "AI platform / SaaS / app".
- KIRA is a research house. Authorial voice: "our analysts" / "our research team".`;

  const userMsg = `Topic: ${topic_input}

${uploaded_file_paths && uploaded_file_paths.length
  ? `Uploaded files (path / inferred name only): ${uploaded_file_paths.map(p => p.split('/').pop()).join(', ')}`
  : 'No files uploaded.'}

Return JSON only.`;

  const msg = await c.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: userMsg }]
  });

  const text = textFromMessage(msg);
  const parsed = parseJsonLoose(text);
  return {
    parsed,
    tokens_in:  msg.usage?.input_tokens  || 0,
    tokens_out: msg.usage?.output_tokens || 0
  };
}

// ===============================================================
// STAGE 3 — Plan section structure
// ===============================================================
async function stage3PlanSections({ parsed, uploaded_file_paths }) {
  const c = client();
  const hasFiles = !!(uploaded_file_paths && uploaded_file_paths.length);

  const system = `You are the section planner for a KIRA Research market report.

Given a parsed topic spec, return JSON describing the report's section structure. Aim for ${TARGET_SECTIONS} sections that flow logically from macro to micro to outlook.

Required fields per section:
- title: sentence-case (NOT title case). E.g. "A market at inflection." not "A Market At Inflection".
- page_type: one of: title_cover | exec_summary | macro_context | sector_overview | competitive_landscape | demand_channels | regulatory | ai_impact | forecast_outlook | methodology | source_key.
- brief: 2-3 sentences telling the writer what to cover.
- needs_search: boolean — true if web research is required.
- ${hasFiles ? 'use_user_files: boolean — true if this section should draw primarily from user-uploaded files.' : ''}

Return shape: { "sections": [...], "estimated_pages": int, "rationale": "1-sentence why this structure" }

Hard rules: every section name uses sentence case. No filler titles like "Conclusion" or "Final thoughts" — use "Outlook" or "Forward view". No mention of competitor firms or AI tools by name.`;

  const userMsg = `Parsed spec:
${JSON.stringify(parsed, null, 2)}

${hasFiles ? 'User uploaded these files (treat as primary data sources where relevant): ' + uploaded_file_paths.map(p => p.split('/').pop()).join(', ') : ''}

Return JSON only.`;

  const msg = await c.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: userMsg }]
  });

  const text = textFromMessage(msg);
  const parsed_sections = parseJsonLoose(text);
  return {
    plan: parsed_sections,
    tokens_in:  msg.usage?.input_tokens  || 0,
    tokens_out: msg.usage?.output_tokens || 0
  };
}

// ===============================================================
// STAGE 4 — Web search (per-section parallel, Phase N.17)
//
// One Anthropic call per section that has needs_search=true.
// Each call has its own AbortController with STAGE4_SECTION_TIMEOUT,
// and there's an overall AbortController with STAGE4_OVERALL_TIMEOUT
// that aborts every in-flight call if Stage 4 as a whole runs long.
// Partial results are kept — a section whose research timed out
// just contributes an empty findings entry, and Stage 5 falls back
// gracefully via its existing empty-findings handling.
// ===============================================================
async function stage4Research({ parsed, plan, log }) {
  const c = client();
  const allSections     = Array.isArray(plan?.sections) ? plan.sections : [];
  // Skip sections explicitly marked needs_search=false (methodology,
  // source key, etc.) — they get empty findings entries via fallback.
  const targetSections  = allSections
    .filter(s => s && s.needs_search !== false)
    .slice(0, TARGET_SECTIONS);

  if (targetSections.length === 0) {
    return { findings: { findings: [], source_key: [] }, queries: [], tokens_in: 0, tokens_out: 0 };
  }

  const system = `You are a research analyst at KIRA Research gathering source material for ONE section of a market report.

Cover BOTH English AND ${parsed.local_language_name || 'English'} (code ${parsed.local_language_code || 'en'}) — search in both languages for tier-1 KIRA markets (vi/id/th/ja/ko) or whenever the country is non-English-dominant.

Process:
1. Fire 1-2 searches in English.
2. Fire 1 search in the local language (translate query terms; keep proper nouns + acronyms in original form).
3. Capture: source name, year, URL, the key quantitative claim or qualitative finding.

Output ONE structured JSON object — NO prose preamble. Shape:

{
  "key_numbers": [{ "claim": "...", "value": "...", "source": "<short alias>", "year": <int>, "url": "..." }],
  "qualitative": ["...","..."],
  "source_key": [{ "alias": "GSO 2024", "full_name": "General Statistics Office of Vietnam — Statistical Yearbook 2024", "url": "..." }]
}

Hard rules:
- NEVER cite Mordor / Frost / Euromonitor / IMARC / Synovate / Ipsos — discard those results.
- Prefer stat-bureau / industry-association / central-bank / listed-co filings.
- A number is "well-anchored" if it appears in 3+ independent sources within ±10%.
- Source aliases stay English even when the original is local-language (e.g. [GSO 2024] not [Tổng cục Thống kê 2024]).
- If you cannot find good sources after 2-3 searches, RETURN what you have. Do NOT keep trying — empty is fine.`;

  const researchOne = async (section, signal) => {
    const userMsg = `Report context: ${JSON.stringify({
      country: parsed.country, industry: parsed.industry, year: parsed.year,
      local_language: parsed.local_language_name
    })}

Section to research:
- Title: ${section.title}
- Brief: ${section.brief || '(no brief — use the title)'}
- Page type: ${section.page_type}

Run your ${PER_SECTION_SEARCHES} searches, then return the JSON object. Empty fields are acceptable if data is thin.`;

    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 3072,
      system,
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: PER_SECTION_SEARCHES
      }],
      messages: [{ role: 'user', content: userMsg }]
    }, { signal });

    const text = textFromMessage(msg);
    let parsedOut;
    try { parsedOut = parseJsonLoose(text); }
    catch { parsedOut = { key_numbers: [], qualitative: [], source_key: [] }; }

    const queries = Array.isArray(msg?.content)
      ? msg.content
          .filter(b => b && b.type === 'server_tool_use' && b.name === 'web_search' && b.input && b.input.query)
          .map(b => String(b.input.query))
      : [];

    return {
      section_title: section.title,
      page_type:     section.page_type,
      key_numbers:   Array.isArray(parsedOut.key_numbers) ? parsedOut.key_numbers : [],
      qualitative:   Array.isArray(parsedOut.qualitative) ? parsedOut.qualitative : [],
      source_key:    Array.isArray(parsedOut.source_key)  ? parsedOut.source_key  : [],
      queries,
      tokens_in:     msg.usage?.input_tokens  || 0,
      tokens_out:    msg.usage?.output_tokens || 0
    };
  };

  // ── Concurrency cap + overall timeout orchestration ────────
  const overallAc = new AbortController();
  const overallTimer = setTimeout(() => overallAc.abort(), STAGE4_OVERALL_TIMEOUT);

  const results = new Array(targetSections.length);
  let cursor = 0;

  async function worker() {
    while (cursor < targetSections.length) {
      if (overallAc.signal.aborted) return;
      const idx = cursor++;
      const section = targetSections[idx];

      if (log) await log('info', 'search', `Researching: ${section.title}`);

      const sectionAc = new AbortController();
      const sectionTimer = setTimeout(() => sectionAc.abort(), STAGE4_SECTION_TIMEOUT);
      // Forward the overall abort to every in-flight section so
      // when the global cap fires, all running calls die together.
      const propagateAbort = () => sectionAc.abort();
      overallAc.signal.addEventListener('abort', propagateAbort);

      try {
        results[idx] = await researchOne(section, sectionAc.signal);
        if (log) {
          for (const q of results[idx].queries) {
            await log('search', 'search', `Searched: ${q}`);
          }
          const srcCount = results[idx].source_key.length;
          await log('done', 'search', `Section researched: ${section.title} · ${srcCount} source${srcCount === 1 ? '' : 's'}`);
        }
      } catch (err) {
        // Timeout or transport error — record empty findings and
        // keep going. Don't let one section take down the whole
        // research phase.
        const isAbort = err?.name === 'AbortError' || /aborted/i.test(String(err?.message || ''));
        if (log) {
          await log(
            'error',
            'search',
            isAbort
              ? `Section timed out: ${section.title} (proceeding with empty findings)`
              : `Section research failed: ${section.title} — ${String(err?.message || err).slice(0, 200)}`
          );
        }
        results[idx] = {
          section_title: section.title,
          page_type:     section.page_type,
          key_numbers:   [],
          qualitative:   [],
          source_key:    [],
          queries:       [],
          tokens_in:     0,
          tokens_out:    0
        };
      } finally {
        clearTimeout(sectionTimer);
        overallAc.signal.removeEventListener('abort', propagateAbort);
      }
    }
  }

  try {
    await Promise.all(
      Array.from(
        { length: Math.min(RESEARCH_CONCURRENCY, targetSections.length) },
        worker
      )
    );
  } finally {
    clearTimeout(overallTimer);
  }

  // ── Aggregate per-section findings into the shape Stage 5 expects ──
  const findingsArr = results.filter(Boolean).map(r => ({
    section_title: r.section_title,
    page_type:     r.page_type,
    key_numbers:   r.key_numbers,
    qualitative:   r.qualitative
  }));

  // Dedupe source_key entries by alias across all sections.
  const sourceKeyMap = new Map();
  for (const r of results) {
    if (!r) continue;
    for (const s of r.source_key) {
      const alias = String(s?.alias || '').trim();
      if (alias && !sourceKeyMap.has(alias)) sourceKeyMap.set(alias, s);
    }
  }
  const sourceKey = [...sourceKeyMap.values()];

  const allQueries  = results.filter(Boolean).flatMap(r => r.queries);
  const tokens_in   = results.filter(Boolean).reduce((a, r) => a + r.tokens_in,  0);
  const tokens_out  = results.filter(Boolean).reduce((a, r) => a + r.tokens_out, 0);

  return {
    findings: { findings: findingsArr, source_key: sourceKey },
    queries:  allQueries,
    tokens_in,
    tokens_out
  };
}

// ===============================================================
// STAGE 5 — Generate per-section HTML (parallel, capped)
// ===============================================================
async function stage5Content({ parsed, plan, findings, onSectionStart, onSectionDone }) {
  const c = client();
  const sections = (plan?.sections || []).slice(0, TARGET_SECTIONS);

  const system = `You are a senior consultant at KIRA Research writing a section of a market report.

You write ONE section at a time and return HTML only — no preamble, no markdown, no commentary.

VOICE
- "our analysts" / "our research team" / "we" — never "our platform" or "AI-powered".
- Sentence-case headlines.
- No filler ("It is worth noting", "In conclusion", "It goes without saying").
- De-cliented voice: "Market participants face…" not "Client should…".

SOURCE TAGS (L.3)
- Every quantitative claim carries an inline tag: [<Alias> <year>] or [Kira estimates].
- Use the source_key aliases provided. Keep aliases English even for local-language sources.

FORMAT
- Wrap section in <div class="page page-{page_type}">…</div> (use the page_type from the plan).
- Start with <div class="eyebrow">{eyebrow}</div> then <h2>{title}</h2>.
- 3-5 short paragraphs. ~250-400 words.
- If the section needs a list/table, use semantic HTML (<ul>, <table>).
- End sections with a footer line if appropriate, but no "in summary" paragraphs.

HARD RULES
- Never mention: Claude, McKinsey, Mordor, Frost, Euromonitor, Synovate, Ipsos, IMARC.
- Never frame KIRA as an "AI platform / SaaS / app". KIRA is a research house.
- Never lead with "AI" in headlines.
- If user-uploaded files are flagged for this section, lean on them as the primary data source and tag [user-input] for direct quotes/data.

Output: HTML for this single section only.`;

  const runOne = async (section) => {
    const relevantFindings = (findings?.findings || []).find(
      f => f.section_title && section.title && f.section_title.toLowerCase().includes(section.title.toLowerCase().slice(0, 24))
    ) || { key_numbers: [], qualitative: [] };

    const userMsg = `Report context:
${JSON.stringify(parsed)}

This section:
${JSON.stringify(section)}

Relevant research findings:
${JSON.stringify(relevantFindings)}

Available source aliases (use these in inline tags):
${JSON.stringify((findings?.source_key || []).slice(0, 30))}

Write the HTML for this section now.`;

    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: userMsg }]
    });

    const html = scrub(textFromMessage(msg)) || `<div class="page"><h2>${section.title}</h2><p>Content unavailable.</p></div>`;
    return {
      title: section.title,
      page_type: section.page_type,
      html,
      tokens_in:  msg.usage?.input_tokens  || 0,
      tokens_out: msg.usage?.output_tokens || 0
    };
  };

  // Concurrency-capped Promise.all.
  const results = new Array(sections.length);
  let cursor = 0;
  let completed = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= sections.length) return;
      if (onSectionStart) await onSectionStart(sections[idx], idx);
      results[idx] = await runOne(sections[idx]);
      completed++;
      if (onSectionDone) await onSectionDone(completed, sections.length, sections[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(SECTION_CONCURRENCY, sections.length) }, worker)
  );

  const tokens_in  = results.reduce((a, r) => a + (r?.tokens_in  || 0), 0);
  const tokens_out = results.reduce((a, r) => a + (r?.tokens_out || 0), 0);
  return { sections: results, tokens_in, tokens_out };
}

// ===============================================================
// STAGE 7 — Assemble + render PDF + upload + insert row
// ===============================================================
async function stage7AssembleAndRender({ jobId, userId, parsed, plan, findings, sectionsOut }) {
  const css = await loadMasterCss();

  // Build a SOURCE KEY block from findings.source_key (L.3 traceability).
  const sourceKeyItems = (findings?.source_key || []).slice(0, 40).map(s => {
    const alias = String(s?.alias || '').trim();
    const full  = String(s?.full_name || '').trim();
    const url   = String(s?.url || '').trim();
    if (!alias) return null;
    const left  = `<span class="alias">${alias}</span>`;
    const right = full ? ` = ${full}` : '';
    const link  = url ? ` <a href="${url}" target="_blank" rel="noopener">link</a>` : '';
    return `<li>${left}${right}${link}</li>`;
  }).filter(Boolean).join('\n');

  const sourceKeyHtml = `
    <div class="page page-source_key">
      <div class="eyebrow">Source key</div>
      <h2>Source key &amp; traceability</h2>
      <ul class="source-key-list">
        ${sourceKeyItems || '<li>Sources cited inline. No additional aliases.</li>'}
      </ul>
      <div class="source-key">All numeric claims carry inline tags of the form [&lt;Alias&gt; &lt;year&gt;] or [Kira estimates]. Aliases above resolve to the named primary sources.</div>
    </div>
  `;

  // Cover page.
  const coverHtml = `
    <div class="page page-title_cover">
      <div class="eyebrow">KIRA Studio · ${parsed.industry || 'market analysis'} · ${parsed.year || ''}</div>
      <h1>${(parsed.industry || 'Market').replace(/^./, c => c.toUpperCase())} in ${parsed.country || ''} ${parsed.year || ''}</h1>
      <p>${plan?.rationale || 'A research-led view of the market — sized, structured, and forecast by our analysts.'}</p>
      <p style="margin-top:48px;font-size:13px;color:#64748B;">
        Prepared by KIRA Research analysts · generated ${new Date().toISOString().slice(0, 10)}
      </p>
    </div>
  `;

  const sectionsHtml = (sectionsOut?.sections || []).map(s => s.html).join('\n');
  const pagesHtml = `${coverHtml}\n${sectionsHtml}\n${sourceKeyHtml}`;

  const masterHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${parsed.industry || ''} in ${parsed.country || ''} ${parsed.year || ''} — KIRA Research</title>
  <meta name="viewport" content="width=1280">
  <style>${css}</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;

  // Call the existing render-pdf endpoint.
  if (!PDF_RENDER_SECRET) {
    throw new Error('missing_pdf_render_secret');
  }
  const rpRes = await fetch(RENDER_PDF_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key':    PDF_RENDER_SECRET
    },
    body: JSON.stringify({
      html: masterHtml,
      filename: `${slugify(parsed.industry || 'studio')}-${slugify(parsed.country || 'global')}-${parsed.year || 'na'}.pdf`
    })
  });
  if (!rpRes.ok) {
    throw new Error(`render_pdf_${rpRes.status}:${(await rpRes.text()).slice(0, 200)}`);
  }
  const rpJson = await rpRes.json();
  if (!rpJson.success || !rpJson.pdf_base64) {
    throw new Error('render_pdf_no_output');
  }

  // Insert studio_reports first so we have an ID for the storage paths.
  const previewText =
    (sectionsOut?.sections || [])
      .find(s => s.page_type === 'exec_summary')?.html
      ?.replace(/<[^>]+>/g, ' ')
      ?.replace(/\s+/g, ' ')
      ?.trim()
      ?.slice(0, 320) ||
    `${parsed.industry || 'Market'} in ${parsed.country || ''} — generated by KIRA Studio.`;

  const insertedReport = await sb('studio_reports', 'POST', {
    user_id:      userId,
    job_id:       jobId,
    title:        `${(parsed.industry || 'Market').replace(/^./, c => c.toUpperCase())} in ${parsed.country || ''} ${parsed.year || ''}`.trim(),
    eyebrow:      `${parsed.country || 'Global'} · ${parsed.year || ''}`,
    preview:      previewText,
    country:      parsed.country,
    industry:     parsed.industry,
    year:         parsed.year,
    toc:          (plan?.sections || []).map(s => ({ title: s.title, page_type: s.page_type })),
    full_content: null,                  // full HTML lives in storage; row carries metadata only
    pages:        rpJson.page_count || (sectionsOut?.sections?.length || 0) + 2
  });
  const reportRow = Array.isArray(insertedReport) ? insertedReport[0] : insertedReport;
  if (!reportRow || !reportRow.id) throw new Error('studio_report_insert_failed');

  const reportId  = reportRow.id;
  const htmlPath  = `${userId}/${reportId}/report.html`;
  const pdfPath   = `${userId}/${reportId}/report.pdf`;

  const pdfBytes = Buffer.from(rpJson.pdf_base64, 'base64');
  const htmlOk = await uploadToBucket(STUDIO_REPORTS_BUCKET, htmlPath, Buffer.from(masterHtml, 'utf8'), 'text/html', true);
  const pdfOk  = await uploadToBucket(STUDIO_REPORTS_BUCKET, pdfPath,  pdfBytes,                       'application/pdf', true);
  if (!htmlOk || !pdfOk) {
    throw new Error(`storage_upload_failed:html=${htmlOk},pdf=${pdfOk}`);
  }

  // Patch the storage paths back onto the row.
  await sb(`studio_reports?id=eq.${reportId}`, 'PATCH', {
    html_path: htmlPath,
    pdf_path:  pdfPath
  }, false);

  return reportId;
}

// ===============================================================
// MAIN ENTRY
// ===============================================================
export async function processStudioJob({ jobId, userId }) {
  // Load job (also serves as cancellation check).
  const rows = await sb(
    `studio_jobs?id=eq.${jobId}&user_id=eq.${userId}&select=*&limit=1`
  );
  const job = Array.isArray(rows) ? rows[0] : null;
  if (!job) throw new Error('job_not_found');
  if (job.status === 'cancelled') return;

  // Activity-log streamer — Phase N.16. Powers the live feed on
  // public/studio/jobs.html. Best-effort; never throws.
  //   type:  'stage' | 'info' | 'search' | 'done' | 'error'
  //   stage: 'parse' | 'plan' | 'search' | 'content' | 'render' | 'complete'
  const log = (type, stage, msg, detail) => logActivity(jobId, {
    ts: new Date().toISOString(),
    type, stage, msg,
    ...(detail !== undefined ? { detail } : {})
  });

  let tokIn = 0;
  let tokOut = 0;

  await log('info', 'parse', `Starting report: "${(job.topic_input || '').slice(0, 200)}"`);

  // --- Stage 1 --------------------------------------------------
  await updateJobProgress(jobId, {
    current_stage: 'Parsing topic…',
    progress: 5
  });
  await log('stage', 'parse', 'Parsing topic — identifying country, industry, year, search languages…');
  const s1 = await stage1ParseTopic({
    topic_input:         job.topic_input,
    uploaded_file_paths: job.uploaded_file_paths || []
  });
  tokIn  += s1.tokens_in;
  tokOut += s1.tokens_out;
  await log('done', 'parse',
    `Topic locked: ${s1.parsed.industry || '—'} in ${s1.parsed.country || '—'} ${s1.parsed.year || ''} · `
    + `research languages: English + ${s1.parsed.local_language_name || 'English'}`);
  await updateJobProgress(jobId, {
    progress: 12,
    stages_completed: [...(job.stages_completed || []), 'parse']
  });

  // --- Stage 3 (Stage 2 = inline UC2/UC3 decision based on files) ---
  await updateJobProgress(jobId, {
    current_stage: 'Planning section structure…',
    progress: 18
  });
  await log('stage', 'plan', `Planning report structure (~${TARGET_SECTIONS} sections)…`);
  const s3 = await stage3PlanSections({
    parsed: s1.parsed,
    uploaded_file_paths: job.uploaded_file_paths || []
  });
  tokIn  += s3.tokens_in;
  tokOut += s3.tokens_out;
  const sectionTitles = (s3.plan?.sections || []).map(s => s.title);
  await log('done', 'plan',
    `Planned ${sectionTitles.length} sections`,
    { titles: sectionTitles });
  await updateJobProgress(jobId, {
    progress: 25,
    stages_completed: [...(job.stages_completed || []), 'parse', 'plan']
  });

  // --- Stage 4 --------------------------------------------------
  await updateJobProgress(jobId, {
    current_stage: `Searching ${s1.parsed.local_language_name || 'English'} + English sources…`,
    progress: 30
  });
  // Per-section parallel research (Phase N.17). Stage 4 now logs
  // each "Researching: <title>" + "Searched: <query>" + "Section
  // researched: …" event itself in real-time, so don't replay
  // queries here.
  const searchableCount = (s3.plan?.sections || []).filter(s => s && s.needs_search !== false).length;
  await log('stage', 'search',
    `Researching ${searchableCount} sections in parallel · ${PER_SECTION_SEARCHES} searches each · English + ${s1.parsed.local_language_name || 'English'}…`);
  const s4 = await stage4Research({ parsed: s1.parsed, plan: s3.plan, log });
  tokIn  += s4.tokens_in;
  tokOut += s4.tokens_out;
  const sourceCount  = Array.isArray(s4.findings?.source_key) ? s4.findings.source_key.length : 0;
  const findingCount = Array.isArray(s4.findings?.findings)   ? s4.findings.findings.length   : 0;
  await log('done', 'search',
    `Research complete · ${s4.queries?.length || 0} searches · ${sourceCount} sources captured · ${findingCount} section bundles`);
  await updateJobProgress(jobId, {
    progress: 55,
    stages_completed: [...(job.stages_completed || []), 'parse', 'plan', 'search']
  });

  // --- Stage 5 --------------------------------------------------
  await updateJobProgress(jobId, {
    current_stage: 'Drafting sections (0/—)…',
    progress: 58
  });
  const sectionsToDraft = Math.min(sectionTitles.length, TARGET_SECTIONS);
  await log('stage', 'content',
    `Drafting ${sectionsToDraft} sections in parallel (concurrency ${SECTION_CONCURRENCY})…`);
  const s5 = await stage5Content({
    parsed: s1.parsed,
    plan: s3.plan,
    findings: s4.findings,
    onSectionStart: async (section) => {
      await log('info', 'content', `Drafting: ${section.title}`);
    },
    onSectionDone: async (done, total, section) => {
      // Map 58→88% across content gen.
      const pct = 58 + Math.floor(30 * (done / Math.max(1, total)));
      await updateJobProgress(jobId, {
        current_stage: `Drafting sections (${done}/${total})…`,
        progress: pct
      });
      await log('done', 'content', `Finished: ${section.title} (${done}/${total})`);
    }
  });
  tokIn  += s5.tokens_in;
  tokOut += s5.tokens_out;
  await log('done', 'content', `All ${sectionsToDraft} sections drafted`);
  await updateJobProgress(jobId, {
    progress: 90,
    stages_completed: [...(job.stages_completed || []), 'parse', 'plan', 'search', 'content']
  });

  // --- Stage 7 --------------------------------------------------
  await updateJobProgress(jobId, {
    current_stage: 'Rendering PDF + uploading…',
    progress: 93
  });
  await log('stage', 'render', 'Assembling pages, rendering PDF, uploading to storage…');
  const reportId = await stage7AssembleAndRender({
    jobId, userId,
    parsed: s1.parsed,
    plan: s3.plan,
    findings: s4.findings,
    sectionsOut: s5
  });
  await log('done', 'render', 'PDF rendered and uploaded');

  // --- Done -----------------------------------------------------
  // Best-effort cost estimate: ~$3/MTok in, $15/MTok out (Sonnet 4.5 ballpark).
  const cost = (tokIn / 1_000_000) * 3 + (tokOut / 1_000_000) * 15;
  await updateJobProgress(jobId, {
    status:             'completed',
    progress:           100,
    current_stage:      'Done',
    studio_report_id:   reportId,
    tokens_input:       tokIn,
    tokens_output:      tokOut,
    estimated_cost_usd: Number(cost.toFixed(4)),
    stages_completed:   ['parse', 'plan', 'search', 'content', 'render'],
    completed_at:       new Date().toISOString()
  });
  await log('done', 'complete',
    `Report ready · ${tokIn.toLocaleString()} input + ${tokOut.toLocaleString()} output tokens · est $${cost.toFixed(2)}`);
}
