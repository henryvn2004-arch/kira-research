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
  STUDIO_INPUTS_BUCKET,
  STUDIO_REPORTS_BUCKET,
  sb, uploadToBucket, downloadFromBucket,
  updateJobProgress, logActivity, slugify
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

// Stage 5 drafting concurrency. SEQUENTIAL (=1) since N.21 because
// Anthropic API rate-limits parallel calls at the account level —
// confirmed empirically: 3 parallel section drafts succeed on the
// first batch, then subsequent batches hang indefinitely. Same
// failure mode that killed Stage 4 web_search, just at the inference
// layer this time. Trade-off: 10 sections × ~18s = ~3 min instead of
// ~1 min, but reliable.
const SECTION_CONCURRENCY = 1;
// Section count is now decided by the planner (Phase N.21) based on
// uploaded content + user intent. This is just the hard upper bound
// so a verbose plan can't blow Stage 5's wall-clock budget.
const MIN_SECTIONS   = 3;
const MAX_SECTIONS   = 12;
export { MIN_SECTIONS, MAX_SECTIONS };

// ── Phase N.20: upload-only architecture ────────────────────
// Stage 4 (Anthropic web_search) was removed. The autonomous
// web_search tool proved unreliable in Vercel serverless background
// context — calls hung indefinitely with no abort mechanism (SDK
// signal, Promise.race timeout, and SDK-level timeout option all
// failed to interrupt in-flight tool use calls). Strategic pivot:
// require users to upload their own research sources (which matches
// KIRA's actual analyst workflow + the "for pro analysts" positioning).
//
// New Stage 2 (file extraction): downloads each uploaded file from
// studio-inputs bucket, extracts text via format-specific parser,
// caches in-memory for Stage 5.
const MAX_CHARS_PER_FILE       = 100_000; // ~25K tokens — safety cap per file
const MAX_TOTAL_EXTRACTED_CHARS = 400_000; // ~100K tokens — total source budget

// SDK-level timeout still useful for the (no-tool) per-section
// Claude calls. Each section is plain text in, text out, no
// web_search tool — should reliably finish in <40s.
const ANTHROPIC_REQUEST_TIMEOUT_MS = 90 * 1000;

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
//
// timeout: SDK-level per-request fetch timeout. This is the
// authoritative interrupt for hung requests — empirically more
// reliable than userland Promise.race + setTimeout in Vercel
// waitUntil context (setTimeout timers don't fire predictably
// while the function is idle on I/O).
//
// maxRetries: 0 because we handle resilience at the worker level
// (failed sections proceed with empty findings). Default of 2 with
// exponential backoff stretches a hung request to ~37s minimum
// before throwing, which steals budget from other sections.
// ---------------------------------------------------------------
function client() {
  if (!ANTHROPIC_API_KEY) throw new Error('missing_anthropic_api_key');
  return new Anthropic({
    apiKey:     ANTHROPIC_API_KEY,
    timeout:    ANTHROPIC_REQUEST_TIMEOUT_MS,
    maxRetries: 0
  });
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

// HTML-escape utility used by the cover page assembler (Phase N.23).
// User-controlled fields (title, subtitle, primary_subject, ...) flow
// into the cover HTML — escape so embedded `<`, `&`, etc. don't break
// the document. Section bodies stay as raw HTML on purpose because
// Stage 5 returns marked-up HTML.
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
// STAGE 1 — Free-form intent classifier  (Phase N.23)
// ===============================================================
// Studio's job is to gen WHATEVER the user wants from their uploaded
// sources — company profiles, service decks, market analyses, exec
// briefs, technical docs, investor pitches, training material, etc.
// This stage parses the user's INTENT, not market-report metadata.
//
// Previously (N.20-N.22) we forced extraction of country/industry/
// year/local_language — fields only meaningful for market reports.
// That hardcoding made Studio mis-classify uploads like a company
// profile PDF + "make a presentation for this file" as a market-
// report request, inventing country=Vietnam / industry=credit / year=2027
// from filename keywords.
//
// New behaviour:
//   • LLM infers `report_kind` freely (any short noun phrase) from
//     the user's brief + filenames + first content snippet.
//   • Honors user directives verbatim — if they say "3-slide brief"
//     the planner gets `user_section_count: 3` and uses that.
//   • country/industry/year are only filled if they're genuinely
//     part of the report (e.g. "Vietnam fintech 2027" market analysis);
//     null otherwise. studio_reports row accepts null for these.
// ===============================================================
export async function stage1ParseTopic({ topic_input, uploaded_file_paths }) {
  const c = client();
  const system = `You are the intent classifier for KIRA Studio, a tool that turns user-uploaded source documents into whatever deliverable the user describes.

Read the user's brief + the list of uploaded filenames. Return a single JSON object describing what they want. NO prose, NO preamble — JSON only.

The user controls everything. Honor their words literally:
  • If they say "presentation", "deck", "slides" → it's a presentation.
  • If they say "report", "analysis", "study" → it's a report.
  • If they specify a number ("3-page brief", "5 sections", "10 slides") → record it.
  • If they're vague ("make something from this") → flag for content-driven planning.
  • If they don't specify report type at all → infer from filenames + brief (e.g. "vietnamcredit company profile.pdf" + "make a presentation for this" → report_kind: "company profile presentation").

Required fields:
- report_kind: free-form short noun phrase describing the deliverable. Examples:
    "company profile", "service overview deck", "market analysis report",
    "investor briefing", "competitive intel brief", "technical methodology doc",
    "training material", "executive summary", "case study deck", "due diligence memo".
    Make it match what the user + sources actually call for. Don't force categories.
- user_directives: 1-3 sentences capturing the user's explicit asks (length, format, audience, focus) — what they EXPLICITLY said. Empty string if they were silent.
- user_section_count: integer if the user explicitly stated a number of sections/slides/pages, else null.
- working_title: a draft title for the deliverable (planner will refine after seeing content). E.g. "VietnamCredit — Company Profile" or "Vietnam Coffee Market 2027" or "Q3 Sales Performance Brief".
- subtitle: optional 1-line subtitle / framing tag. Null if not natural.
- primary_subject: the THING the report is about — could be a company name, a market, a process, a region, a product. E.g. "VietnamCredit Group" or "Vietnam fintech market" or "Q3 sales performance".
- audience: 1 sentence on who reads this ("internal sales team", "external prospects", "investors", "management board", "general business audience"). Best guess.
- tone: 1 word — analyst / descriptive / technical / promotional / instructional / strategic / neutral. Pick the closest fit.
- has_uploaded_files: boolean.
- uploaded_file_summary: 1-line description of what the uploads appear to contain (read filenames). Null if no files.

Optional market-context fields (fill ONLY if genuinely relevant; null otherwise):
- country: best-guess primary country IF the deliverable is country/market-specific. Null otherwise.
- industry: short industry phrase IF the deliverable is industry-specific. Null otherwise.
- year: target year IF the deliverable carries a year (forecast/period). Null otherwise.
  Example: "Vietnam coffee market 2027" → country/industry/year filled.
  Example: "VietnamCredit company profile" → country may be "Vietnam" (where company operates) but industry/year null.
  Example: "Q3 sales recap" → all three null.

- parse_notes: 1-2 sentences explaining your classification reasoning (especially for ambiguous cases).
- confidence: 0..1 float — your subjective confidence.

Hard rules:
- The user is authoritative. If they say "make a presentation for this file", do NOT invent a market-report frame.
- NEVER use the words: Claude, McKinsey, Mordor, Frost, Euromonitor, Synovate, Ipsos, IMARC.
- NEVER frame KIRA as an "AI platform / SaaS / app". KIRA Studio is a tool; the output is the user's deliverable, not KIRA's.`;

  const filenames = (uploaded_file_paths || []).map(p => String(p).split('/').pop());
  const userMsg = `User brief:
"${String(topic_input || '').trim()}"

Uploaded filenames (${filenames.length}):
${filenames.length ? filenames.map(n => `  - ${n}`).join('\n') : '  (none)'}

Today's date: ${new Date().toISOString().slice(0, 10)}

Classify the intent. Return JSON only.`;

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
// STAGE 3 — Free-form planner  (Phase N.23)
// ===============================================================
// Planner sees: user brief + Stage 1 classification + actual file
// content, then designs whatever structure makes sense for THIS
// deliverable. No page_type enum, no hard section ranges unless the
// user specified one.
//
// Page types are free-form strings the planner picks. Examples that
// might show up: "cover", "executive_summary", "company_overview",
// "service_portfolio", "leadership_team", "financial_highlights",
// "case_study", "market_sizing", "competitive_landscape", "outlook",
// "methodology", "appendix". The drafter (Stage 5) doesn't switch
// on these — they're just hints for the cover/section CSS class.
// ===============================================================
export async function stage3PlanSections({ parsed, extracted, topic_input }) {
  const c = client();
  const files = Array.isArray(extracted) ? extracted : [];
  const filenames = files.map(f => f.filename);

  // Preview block — first ~3000 chars per file is enough for the
  // planner to see what's in there without blowing the context.
  const PREVIEW_CHARS = 3000;
  const previewBlock = files
    .map(f => `### ${f.filename}\n${(f.text || '').slice(0, PREVIEW_CHARS)}${(f.text || '').length > PREVIEW_CHARS ? '\n[…]' : ''}`)
    .join('\n\n');

  // Section-count guidance comes from Stage 1's user_section_count if
  // the user explicitly stated one; otherwise the planner chooses.
  const userCount   = Number.isInteger(parsed.user_section_count) ? parsed.user_section_count : null;
  const minSections = MIN_SECTIONS;
  const maxSections = MAX_SECTIONS;

  const countGuidance = userCount
    ? `The user EXPLICITLY asked for ${userCount} sections/slides/pages. You MUST produce exactly ${userCount} sections (clamp to ${minSections}-${maxSections} if outside that range).`
    : `Pick a section count between ${minSections} and ${maxSections} that matches what's actually in the sources + the report kind:
       • A thin upload (one short file, narrow topic) → ${minSections}-5 sections
       • A rich upload (multiple files, broad topic) → 6-${maxSections} sections
       • Short formats (exec summary, brief, snapshot) → ${minSections}-5
       • Long formats (full report, deep dive, comprehensive) → 8-${maxSections}`;

  const system = `You are the structural planner for a KIRA Studio deliverable. The user has uploaded source documents and described what they want. Your job is to design the section structure of the final deliverable based on:
  (a) what the user asked for (Stage 1 already classified intent),
  (b) what's actually in the uploaded sources, and
  (c) the type of deliverable being produced.

You have FULL freedom to choose section titles + page types that suit the deliverable. There is NO fixed enum. A company profile presentation has different sections than a market analysis; an investor brief has different sections than a training doc. Match the structure to the deliverable.

SECTION COUNT
${countGuidance}

SECTION DESIGN PRINCIPLES
  • Ground every section in the actual uploaded content. If the files have leadership bios → include a leadership section. If they have revenue data → include a financial highlights section. If they have product specs → include a product section.
  • Do NOT invent sections for data the files don't contain. If files lack a macro context, don't plan a "macro context" section.
  • If the user gave directives ("focus on X", "skip Y", "audience is investors"), honor them.
  • A cover page + source key page are ALWAYS added by the renderer — DO NOT include them in your sections list.

Required fields per section (return JSON):
- title: sentence-case headline for the section. E.g. "Company at a glance." not "Company At A Glance".
- page_type: a short snake_case string describing the section's role. Free-form — pick what fits.
  Examples (NOT exhaustive — use whatever fits the deliverable):
    "executive_summary", "company_overview", "service_portfolio", "leadership_team",
    "financial_highlights", "case_studies", "client_logos", "product_features",
    "market_sizing", "competitive_landscape", "regulatory_environment", "outlook",
    "methodology", "appendix", "key_findings", "recommendations", "action_plan", "contact"
- brief: 2-3 sentences telling the drafter EXACTLY what to cover, referencing which uploaded files this section draws from.
- primary_sources: array of filenames (from the upload list) this section will lean on. Empty array if section is general framing.

Top-level return shape:
{
  "final_title": "<refined working_title — what should appear on the cover>",
  "subtitle": "<optional subtitle, 1 short line; null if not natural>",
  "sections": [ { title, page_type, brief, primary_sources }, ... ],
  "estimated_pages": <int>,
  "rationale": "1-sentence explanation of why you picked this structure based on Stage 1's intent + what's in the sources"
}

Hard rules:
- Every section title uses sentence case.
- No filler titles like "Conclusion", "Final thoughts" — use a substantive title like "Outlook" or "What's next".
- Never mention: Claude, McKinsey, Mordor, Frost, Euromonitor, Synovate, Ipsos, IMARC.
- Never frame KIRA as a "platform / SaaS / app". KIRA Studio is invisible infrastructure — the deliverable is the user's, not KIRA's.`;

  const userMsg = `User brief (verbatim):
"${String(topic_input || '').trim()}"

Stage 1 classification:
${JSON.stringify({
  report_kind:        parsed.report_kind,
  user_directives:    parsed.user_directives,
  user_section_count: parsed.user_section_count,
  working_title:      parsed.working_title,
  subtitle:           parsed.subtitle,
  primary_subject:    parsed.primary_subject,
  audience:           parsed.audience,
  tone:               parsed.tone,
  country:            parsed.country,
  industry:           parsed.industry,
  year:               parsed.year
}, null, 2)}

Uploaded files (${filenames.length}):
${JSON.stringify(filenames)}

Source content previews (first ${PREVIEW_CHARS} chars of each file):
${previewBlock || '(no extractable content)'}

Design the section structure. Return JSON only.`;

  const msg = await c.messages.create({
    model: MODEL,
    max_tokens: 3072,
    system,
    messages: [{ role: 'user', content: userMsg }]
  });

  const text = textFromMessage(msg);
  const planObj = parseJsonLoose(text);

  // Defensive cleanup:
  if (Array.isArray(planObj?.sections)) {
    // Drop any sections the planner accidentally labeled as cover/source-key
    // (the renderer always adds those at fixed positions).
    planObj.sections = planObj.sections.filter(s => {
      if (!s || typeof s !== 'object') return false;
      const pt = String(s.page_type || '').toLowerCase();
      return pt !== 'cover' && pt !== 'title_cover' && pt !== 'source_key' && pt !== 'sources';
    });
    if (planObj.sections.length > MAX_SECTIONS) {
      planObj.sections = planObj.sections.slice(0, MAX_SECTIONS);
    }
  }

  return {
    plan: planObj,
    tokens_in:  msg.usage?.input_tokens  || 0,
    tokens_out: msg.usage?.output_tokens || 0
  };
}

// ===============================================================
// STAGE 2 — File extraction (Phase N.20, replaces former Stage 4)
//
// Studio is now upload-only: the user provides the research sources
// (PDF/DOCX/XLSX/CSV/TXT) and the worker writes the report directly
// from them. This stage downloads each uploaded file from the
// studio-inputs bucket and extracts text via a format-specific
// parser. Text is capped per-file and globally so Stage 5 prompts
// never blow Claude's context budget.
//
// Why not Anthropic web_search anymore: the autonomous tool proved
// unreliable in Vercel serverless background context — calls hung
// indefinitely with no working abort mechanism. The upload-only
// architecture removes that failure mode entirely, matches KIRA's
// actual analyst workflow (analysts curate sources first, then
// write), and aligns with the "for pro analysts" positioning.
// ===============================================================
export async function stage2ExtractFiles({ jobId, userId: _userId, uploaded_file_paths, log }) {
  const paths = Array.isArray(uploaded_file_paths) ? uploaded_file_paths : [];
  if (paths.length === 0) {
    return { extracted: [], total_chars: 0 };
  }

  const extracted = [];
  let totalChars = 0;
  let fileIndex = 0;

  for (const path of paths) {
    fileIndex++;
    const filename = String(path).split('/').pop() || `file_${fileIndex}`;
    const ext = (filename.split('.').pop() || '').toLowerCase();

    if (log) await log('info', 'extract', `Reading file ${fileIndex}/${paths.length}: ${filename}`);
    await updateJobProgress(jobId, {
      current_stage: `Extracting source files (${fileIndex}/${paths.length})…`,
      progress: 28 + Math.floor(12 * (fileIndex / paths.length))   // 28→40
    }).catch(() => {});

    const buf = await downloadFromBucket(STUDIO_INPUTS_BUCKET, path);
    if (!buf) {
      if (log) await log('error', 'extract', `Could not download ${filename}`);
      continue;
    }

    let text = '';
    try {
      if (ext === 'pdf') {
        // pdf-parse has a known issue where the package entry-point
        // tries to read a local test PDF in debug mode. Import the
        // internal module directly to bypass.
        const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
        const res = await pdfParse(buf);
        text = String(res?.text || '');
      } else if (ext === 'docx') {
        const mammoth = await import('mammoth');
        const res = await mammoth.extractRawText({ buffer: buf });
        text = String(res?.value || '');
      } else if (ext === 'xlsx' || ext === 'xls') {
        const xlsx = await import('xlsx');
        const wb = xlsx.read(buf, { type: 'buffer' });
        text = (wb.SheetNames || [])
          .map(n => `--- Sheet: ${n} ---\n${xlsx.utils.sheet_to_csv(wb.Sheets[n])}`)
          .join('\n\n');
      } else if (ext === 'csv' || ext === 'tsv') {
        text = buf.toString('utf8');
      } else if (ext === 'txt' || ext === 'md') {
        text = buf.toString('utf8');
      } else {
        if (log) await log('error', 'extract', `Unsupported format: ${filename} (.${ext})`);
        continue;
      }
    } catch (err) {
      if (log) await log('error', 'extract', `Parse failed for ${filename}: ${String(err?.message || err).slice(0, 200)}`);
      continue;
    }

    // Per-file cap.
    if (text.length > MAX_CHARS_PER_FILE) {
      text = text.slice(0, MAX_CHARS_PER_FILE) + '\n\n[…truncated…]';
    }
    // Global cap — drop if we're already over budget.
    if (totalChars + text.length > MAX_TOTAL_EXTRACTED_CHARS) {
      const remaining = Math.max(0, MAX_TOTAL_EXTRACTED_CHARS - totalChars);
      text = text.slice(0, remaining) + (remaining > 0 ? '\n\n[…truncated to fit context…]' : '');
    }

    if (text.length > 0) {
      extracted.push({ filename, ext, text, char_count: text.length });
      totalChars += text.length;
      if (log) await log('done', 'extract', `Extracted ${filename} (${text.length.toLocaleString()} chars)`);
    } else {
      if (log) await log('error', 'extract', `${filename}: no extractable text`);
    }

    if (totalChars >= MAX_TOTAL_EXTRACTED_CHARS) {
      if (log) await log('info', 'extract',
        `Total source budget reached (${MAX_TOTAL_EXTRACTED_CHARS.toLocaleString()} chars) — skipping remaining files`);
      break;
    }
  }

  return { extracted, total_chars: totalChars };
}


// ===============================================================
// STAGE 5 — Voice-adaptive single-section drafter  (Phase N.23)
// ===============================================================
// Previous (N.20-N.22) version was hardcoded "senior consultant
// writing a section of a market report". That voice is wrong for
// company profiles, service decks, technical docs, etc.
//
// Now: the drafter adapts voice based on `report_kind` + `tone` from
// Stage 1. Three pieces stay constant regardless of deliverable type:
//   1. Output HTML only (no markdown / preamble).
//   2. Cite uploaded sources inline as [filename].
//   3. Never use banned words; never frame KIRA as "platform/SaaS/app".
//
// Phase N.22 architectural note: this function is called per-section
// inside Inngest step.run, so each section is an independent Vercel
// invocation with its own retry/timeout budget.
// ===============================================================

// Per-tone style guidance. The drafter system prompt picks the line
// matching the tone Stage 1 inferred. Falls back to "neutral" if
// the tone isn't recognised.
const TONE_GUIDE = {
  analyst: `Voice: analyst — measured, data-led, "our analysts" / "our research team" / "we". Sentence-case headlines. De-cliented ("Market participants face…" not "Clients should…"). No filler ("It is worth noting", "In conclusion"). Every quantitative claim carries an inline source tag.`,
  descriptive: `Voice: descriptive — clear, factual, third-person about the subject. Reads like a company profile or org snapshot ("The company operates…", "Its services include…"). Concrete and concise; no marketing puffery; no analyst-style hedging.`,
  technical: `Voice: technical — precise, structured, neutral. State methodology, results, and findings explicitly. Use semantic structure (lists, sub-headings) when material is enumerable. Avoid promotional adjectives.`,
  promotional: `Voice: promotional but credible — describe value proposition, differentiation, outcomes. Active voice. Avoid hype words ("revolutionary", "world-class", "best-in-class") and superlatives without evidence; lean on specific facts from the sources.`,
  instructional: `Voice: instructional — direct, step-led, second-person where natural ("you can…", "to do X, follow…"). Lead with the action, then context. Numbered steps where a sequence is required.`,
  strategic: `Voice: strategic — situation → insight → implication → recommendation. Crisp executive register. Speaks to decision-makers. Quantify where possible.`,
  neutral: `Voice: neutral and professional. Adapt naturally to whatever the section demands — factual where reporting, analytical where interpreting, recommendatory where advising. Sentence-case headlines.`
};

function buildSectionSystemPrompt({ report_kind, tone }) {
  const tg = TONE_GUIDE[String(tone || '').toLowerCase()] || TONE_GUIDE.neutral;
  return `You are an expert document writer drafting ONE section of a "${report_kind || 'document'}" for KIRA Studio. The user uploaded source material and described what they want; another LLM has already structured the deliverable. Your job: write this one section.

Return HTML only — no preamble, no markdown, no commentary.

VOICE FOR THIS DELIVERABLE
${tg}

SOURCE MATERIAL
The user uploaded source documents. Pull facts, numbers, quotes, and qualitative observations PRIMARILY from those uploaded sources. You may add general context from your training knowledge, but quantitative claims should be anchored to the uploaded sources whenever possible.

SOURCE CITATIONS (inline)
- Format: [filename] for figures pulled from a user-uploaded file. Example: "Revenue grew 14% YoY [annual-report.pdf]."
- Use [Kira estimates] only if no source supports the number but the number is genuinely an analyst inference.
- Never fabricate filenames — only cite files actually in the upload list provided below.
- If no source supports a claim, either tag [Kira estimates] or simply omit the number.

FORMAT
- Wrap the section in <div class="page page-{page_type}">…</div> using the page_type passed in.
- Start with <div class="eyebrow">{short framing tag}</div> then <h2>{title}</h2>.
- 3-5 short paragraphs. ~250-450 words.
- Use semantic HTML for structure: <ul>, <table>, <ol>, <blockquote> when material is naturally listy / tabular / quoted.
- No "in summary" / "to conclude" paragraphs.

HARD RULES (apply to every deliverable kind)
- Never mention: Claude, McKinsey, Mordor, Frost, Euromonitor, Synovate, Ipsos, IMARC.
- Never frame KIRA Studio as an "AI platform / SaaS / app".
- Never lead a headline with "AI".
- If the uploaded sources don't cover this section's topic, write it more qualitatively — do NOT fabricate numbers, names, or facts to fill space.

Output: HTML for this single section only.`;
}

export async function stage5DraftSection({ section, parsed, extracted }) {
  const c = client();
  const sourceBlock = (Array.isArray(extracted) ? extracted : [])
    .map((f, i) => `### Source ${i + 1}: ${f.filename}\n${f.text}`)
    .join('\n\n');
  const sourceFilenames = (Array.isArray(extracted) ? extracted : []).map(f => f.filename);

  const system = buildSectionSystemPrompt({
    report_kind: parsed.report_kind,
    tone:        parsed.tone
  });

  const userMsg = `Deliverable context:
${JSON.stringify({
  report_kind:     parsed.report_kind,
  primary_subject: parsed.primary_subject,
  audience:        parsed.audience,
  tone:            parsed.tone,
  user_directives: parsed.user_directives,
  // Pass market-context fields only when relevant — null otherwise.
  country:  parsed.country  || null,
  industry: parsed.industry || null,
  year:     parsed.year     || null
})}

This section:
${JSON.stringify({
  title:           section.title,
  brief:           section.brief,
  page_type:       section.page_type,
  primary_sources: section.primary_sources || []
})}

Available source files (for inline citations — tag as [filename]):
${JSON.stringify(sourceFilenames)}

Uploaded source material (verbatim text extracted from the files):
${sourceBlock || '(no source material was provided — write the section using general knowledge only, tagged as [Kira estimates] where appropriate)'}

Write the HTML for this section now.`;

  const msg = await c.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: userMsg }]
  });

  const html = scrub(textFromMessage(msg)) || `<div class="page"><h2>${section.title}</h2><p>Content unavailable.</p></div>`;
  return {
    title:     section.title,
    page_type: section.page_type,
    html,
    tokens_in:  msg.usage?.input_tokens  || 0,
    tokens_out: msg.usage?.output_tokens || 0
  };
}

// Legacy multi-section orchestrator — still used by `processStudioJob`
// fallback path. The Inngest workflow uses `stage5DraftSection` directly
// to split sections into independent step.run() invocations.
async function stage5Content({ parsed, plan, extracted, onSectionStart, onSectionDone }) {
  const sections = (plan?.sections || []).slice(0, MAX_SECTIONS);
  const results = new Array(sections.length);
  let cursor = 0;
  let completed = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= sections.length) return;
      if (onSectionStart) await onSectionStart(sections[idx], idx);
      results[idx] = await stage5DraftSection({ section: sections[idx], parsed, extracted });
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
// STAGE 7 — Adaptive assemble + render + upload  (Phase N.23)
// ===============================================================
// Cover + title + studio_reports row populate from Stage 3's free-form
// `final_title` + `subtitle` (NOT the hardcoded "Industry in Country
// Year" format from N.20-N.22). KIRA branding moved to a discrete
// footer line — the deliverable itself is the user's, not KIRA's.
//
// `parsed.country / industry / year` are passed through to the row
// when Stage 1 actually populated them; null is fine for the table.
// ===============================================================
export async function stage7AssembleAndRender({ jobId, userId, parsed, plan, extracted, sectionsOut }) {
  const css = await loadMasterCss();

  // ── Free-form title + subtitle from the planner. Fall back to
  // Stage 1's working_title, then a generic "Untitled deliverable".
  const reportKind   = String(parsed.report_kind   || 'document').trim();
  const finalTitle   = String(plan?.final_title    || parsed.working_title || 'Untitled deliverable').trim();
  const subtitle     = String(plan?.subtitle       || parsed.subtitle      || '').trim();
  const rationale    = String(plan?.rationale      || '').trim();
  const primarySubj  = String(parsed.primary_subject || '').trim();

  // Eyebrow on the cover surfaces the deliverable kind + (optional)
  // subject — not "KIRA Studio · industry · year" which was wrong for
  // company profiles etc.
  const coverEyebrow = primarySubj
    ? `${reportKind} · ${primarySubj}`
    : reportKind;

  // ── Source key page (unchanged — lists uploaded files) ───────
  const sourceKeyItems = (Array.isArray(extracted) ? extracted : [])
    .slice(0, 40)
    .map(f => {
      const name = String(f?.filename || '').trim();
      if (!name) return null;
      const chars = Number(f?.char_count || 0);
      const sizeLabel = chars >= 1000 ? `~${Math.round(chars / 1000)}K chars` : `${chars} chars`;
      return `<li><span class="alias">${name}</span> <span style="color:#94A3B8;">· ${sizeLabel}</span></li>`;
    })
    .filter(Boolean)
    .join('\n');

  const sourceKeyHtml = `
    <div class="page page-source_key">
      <div class="eyebrow">Source key</div>
      <h2>Source key &amp; traceability</h2>
      <ul class="source-key-list">
        ${sourceKeyItems || '<li>No source files uploaded — deliverable drafted from analyst inference (tagged [Kira estimates]).</li>'}
      </ul>
      <div class="source-key">Inline tags of the form [&lt;filename&gt;] resolve to the user-uploaded sources above. Tags of the form [Kira estimates] indicate analyst inference not directly traceable to an uploaded source.</div>
    </div>
  `;

  // ── Cover page — built from free-form title / subtitle ──────
  const coverHtml = `
    <div class="page page-cover">
      <div class="eyebrow">${escapeHtml(coverEyebrow)}</div>
      <h1>${escapeHtml(finalTitle)}</h1>
      ${subtitle ? `<p style="font-size:18px;color:#475569;margin-top:8px;">${escapeHtml(subtitle)}</p>` : ''}
      ${rationale ? `<p style="margin-top:36px;font-size:14px;color:#64748B;line-height:1.6;max-width:680px;">${escapeHtml(rationale)}</p>` : ''}
      <p style="margin-top:64px;font-size:11px;color:#94A3B8;letter-spacing:0.08em;text-transform:uppercase;">
        Generated with KIRA Studio · ${new Date().toISOString().slice(0, 10)}
      </p>
    </div>
  `;

  const sectionsHtml = (sectionsOut?.sections || []).map(s => s.html).join('\n');
  const pagesHtml = `${coverHtml}\n${sectionsHtml}\n${sourceKeyHtml}`;

  const masterHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(finalTitle)}</title>
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
  const pdfFilename = `${slugify(finalTitle) || 'studio-deliverable'}.pdf`;
  const rpRes = await fetch(RENDER_PDF_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key':    PDF_RENDER_SECRET
    },
    body: JSON.stringify({
      html: masterHtml,
      filename: pdfFilename
    })
  });
  if (!rpRes.ok) {
    throw new Error(`render_pdf_${rpRes.status}:${(await rpRes.text()).slice(0, 200)}`);
  }
  const rpJson = await rpRes.json();
  if (!rpJson.success || !rpJson.pdf_base64) {
    throw new Error('render_pdf_no_output');
  }

  // Preview text — pick the first content section (exec_summary or
  // whatever the planner put first), strip HTML.
  const firstSection = (sectionsOut?.sections || [])[0];
  const previewText =
    firstSection?.html
      ?.replace(/<[^>]+>/g, ' ')
      ?.replace(/\s+/g, ' ')
      ?.trim()
      ?.slice(0, 320) ||
    (subtitle || `${reportKind}${primarySubj ? ` · ${primarySubj}` : ''} — generated by KIRA Studio.`);

  // Insert studio_reports row. country/industry/year are passed through
  // only if Stage 1 found them genuinely relevant (else null).
  const insertedReport = await sb('studio_reports', 'POST', {
    user_id:      userId,
    job_id:       jobId,
    title:        finalTitle,
    eyebrow:      coverEyebrow,
    preview:      previewText,
    country:      parsed.country  || null,
    industry:     parsed.industry || null,
    year:         parsed.year     || null,
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

  // ───────────────────────────────────────────────────────────
  // FLOW (Phase N.21):
  //   1. Parse topic        → country/industry/year/scope from brief
  //   2. Extract files      → text from each uploaded source
  //   3. Plan (content-aware) → planner chooses 3-12 sections based on
  //                             what's IN the files + user's intent
  //   5. Draft              → write each section using uploaded text
  //   7. Render             → assemble + PDF + upload
  // ───────────────────────────────────────────────────────────

  // --- Stage 1: Parse topic ---------------------------------
  await updateJobProgress(jobId, {
    current_stage: 'Parsing topic…',
    progress: 5
  });
  await log('stage', 'parse', 'Parsing the report brief — identifying country, industry, year, scope…');
  const s1 = await stage1ParseTopic({
    topic_input:         job.topic_input,
    uploaded_file_paths: job.uploaded_file_paths || []
  });
  tokIn  += s1.tokens_in;
  tokOut += s1.tokens_out;
  await log('done', 'parse',
    `Topic locked: ${s1.parsed.industry || '—'} in ${s1.parsed.country || '—'} ${s1.parsed.year || ''}`);
  await updateJobProgress(jobId, {
    progress: 12,
    stages_completed: [...(job.stages_completed || []), 'parse']
  });

  // --- Stage 2: Extract uploaded files (must come BEFORE Plan) ---
  await updateJobProgress(jobId, {
    current_stage: 'Extracting source files…',
    progress: 15
  });
  const uploadedPaths = job.uploaded_file_paths || [];
  await log('stage', 'search',
    `Extracting ${uploadedPaths.length} uploaded source file${uploadedPaths.length === 1 ? '' : 's'}…`);
  const s2 = await stage2ExtractFiles({
    jobId, userId,
    uploaded_file_paths: uploadedPaths,
    log
  });
  await log('done', 'search',
    `Source extraction complete · ${s2.extracted.length} file${s2.extracted.length === 1 ? '' : 's'} · ${s2.total_chars.toLocaleString()} total chars`);
  await updateJobProgress(jobId, {
    progress: 30,
    stages_completed: [...(job.stages_completed || []), 'parse', 'search']
  });

  // --- Stage 3: Plan sections (content-aware) -----------------
  await updateJobProgress(jobId, {
    current_stage: 'Planning section structure from sources…',
    progress: 32
  });
  await log('stage', 'plan',
    `Planning report structure (${MIN_SECTIONS}-${MAX_SECTIONS} sections, based on uploaded content + your brief)…`);
  const s3 = await stage3PlanSections({
    parsed:      s1.parsed,
    extracted:   s2.extracted,
    topic_input: job.topic_input
  });
  tokIn  += s3.tokens_in;
  tokOut += s3.tokens_out;
  const sectionTitles = (s3.plan?.sections || []).map(s => s.title);
  await log('done', 'plan',
    `Planned ${sectionTitles.length} sections` + (s3.plan?.rationale ? ` · ${s3.plan.rationale}` : ''),
    { titles: sectionTitles });
  await updateJobProgress(jobId, {
    progress: 40,
    stages_completed: [...(job.stages_completed || []), 'parse', 'search', 'plan']
  });

  // --- Stage 5: Draft sections from uploads ------------------
  await updateJobProgress(jobId, {
    current_stage: 'Drafting sections (0/—)…',
    progress: 42
  });
  const sectionsToDraft = Math.min(sectionTitles.length, MAX_SECTIONS);
  await log('stage', 'content',
    `Drafting ${sectionsToDraft} sections sequentially (1 at a time, Anthropic rate-limit safe) using uploaded sources…`);
  const s5 = await stage5Content({
    parsed: s1.parsed,
    plan: s3.plan,
    extracted: s2.extracted,
    onSectionStart: async (section) => {
      await log('info', 'content', `Drafting: ${section.title}`);
    },
    onSectionDone: async (done, total, section) => {
      // Map 42→88% across content gen.
      const pct = 42 + Math.floor(46 * (done / Math.max(1, total)));
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
    extracted: s2.extracted,
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
