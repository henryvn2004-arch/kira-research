// ============================================================
// KIRA Studio renderer smoke test — runs locally with `node`.
// Verifies the HTML template-fill + PPTX renderer + path resolution
// all work end-to-end without hitting Anthropic or Supabase.
//
//   node tests/studio-renderer-smoke.mjs
//
// Output: writes /tmp-smoke/{report.html, report.pptx} if all pass,
// prints a summary line per template.
// ============================================================

import {
  TEMPLATE_ALLOWLIST,
  renderTemplate,
  renderCoverPage,
  renderSourceKeyPage,
  applyPageNumbers,
  loadMasterWrapper,
  loadMasterCssRobust
} from '../api/_lib/studio-templates.js';
import { renderPptxBuffer } from '../api/_lib/studio-pptx.js';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.resolve('tmp-smoke');

// ── Mock data per template ─────────────────────────────────────
const MOCK_SLOTS = {
  exec_summary_p1: {
    section_tag:  'Section 02 · Executive summary',
    page_h1:      'Key findings at a glance.',
    subhead_html: 'Three years of growth and margin compression — what the numbers say [annual-report.pdf].',
    callouts: [
      { label: 'Revenue',     num: '1.2',  unit: 'B USD', change: '+14% YoY', change_dir: 'up',   source_tag: 'primary', source_label: '[annual-report.pdf]' },
      { label: 'Customers',   num: '420',  unit: 'K',     change: '+22% YoY', change_dir: 'up',   source_tag: 'primary', source_label: '[annual-report.pdf]' },
      { label: 'EBITDA margin', num: '18.5', unit: '%',   change: '-2pp YoY', change_dir: 'down', source_tag: 'primary', source_label: '[annual-report.pdf]' },
      { label: 'Coverage',    num: '63',   unit: 'cities',change: 'flat',     change_dir: '',     source_tag: 'estimate',source_label: '[Kira estimates]' }
    ],
    narrative: [
      { heading: 'Growth held but quality slipped.',  body_html: 'Top-line expansion of 14% YoY [annual-report.pdf] outpaced the sector mean of 8% [Kira estimates], yet EBITDA margin compressed by 2pp on rising marketing spend.' },
      { heading: 'Cohort behavior is the question.',  body_html: 'The 420K customer base [annual-report.pdf] hides a barbell — high-LTV enterprise plus low-LTV consumer trial. Q4 churn was concentrated in the latter.' }
    ],
    chart_title:    'Revenue trajectory',
    chart_subtitle: '2021 – 2024 (consolidated)',
    chart_unit:     'USD bn',
    chart_source:   '[annual-report.pdf]',
    chart_data: {
      type: 'bar',
      series: [
        { label: '2021', value: 720 },
        { label: '2022', value: 880 },
        { label: '2023', value: 1050 },
        { label: '2024', value: 1200 }
      ]
    }
  },

  exec_summary_p2_implications: {
    section_tag:  'Section 03 · Implications',
    page_h1:      'What this means for management.',
    subhead_html: 'Five actions ranked by urgency, anchored in the data you have.',
    cards: [
      { num_tag: '01', title: 'Stem the consumer-tier churn.',     body_html: 'Trial-cohort retention is the single biggest lever for FY25 margin.', anchor_html: '→ See Section 06' },
      { num_tag: '02', title: 'Reprice the mid-market segment.',   body_html: 'Underpriced relative to peer set; ~$80M annualised opportunity.',   anchor_html: '→ See Section 07' },
      { num_tag: '03', title: 'Pause Tier-3 city expansion.',      body_html: 'Unit economics in the latest 12 cities are 40% below mature cities.', anchor_html: '→ See Section 09' },
      { num_tag: '04', title: 'Move enterprise to multi-year.',    body_html: 'Reduces churn surface + locks in pricing before competitive entry.',  anchor_html: '→ See Section 11' },
      { num_tag: '05', title: 'Spin off the logistics arm.',       body_html: 'Standalone valuation could exceed parent contribution.',              anchor_html: '→ See Section 14' }
    ]
  },

  market_data_chart: {
    section_tag:  'Section 04 · Market sizing',
    page_h1:      'The addressable market is still small.',
    subhead_html: 'TAM expanded 28% over three years but most of it remains untaxed.',
    narrative: [
      { heading: 'TAM stalled in 2024.',     body_html: 'Total addressable market hit $4.2B in 2024 [annual-report.pdf], up from $3.5B in 2023 — but growth slowed from 22% to 9%.' },
      { heading: 'Penetration is the gap.',  body_html: 'Only 12% of eligible mid-market firms have adopted any provider [Kira estimates]. The next 18 months will decide who captures them.' }
    ],
    chart_title:    'TAM evolution',
    chart_subtitle: '2021 – 2024',
    chart_unit:     'USD bn',
    chart_source:   '[annual-report.pdf]',
    chart_data: {
      type: 'line',
      groups: [
        { name: 'TAM',     values: [{label:'2021',value:2.8},{label:'2022',value:3.1},{label:'2023',value:3.5},{label:'2024',value:4.2}] },
        { name: 'Served', values: [{label:'2021',value:0.6},{label:'2022',value:0.8},{label:'2023',value:0.95},{label:'2024',value:1.1}] }
      ]
    }
  },

  use_case_grid_6: {
    section_tag:  'Section 05 · Product portfolio',
    page_h1:      'Six lines, one platform.',
    subhead_html: 'Each line has its own P&L; cross-sell rate between them is 38% [annual-report.pdf].',
    cards: [
      { num_tag: '01', title: 'Credit reports',     body_html: 'B2B due diligence. ~45% of revenue.',          example_label: 'Top product' },
      { num_tag: '02', title: 'KYC infrastructure', body_html: 'API-first identity verification for banks.',   example_label: 'Fastest growing' },
      { num_tag: '03', title: 'Fraud signals',      body_html: 'Real-time signal feed; 2.1B events/month.',    example_label: 'Highest margin' },
      { num_tag: '04', title: 'Court records',      body_html: 'Litigation history search; 12 jurisdictions.', example_label: 'Differentiator' },
      { num_tag: '05', title: 'PEP screening',      body_html: 'Politically-exposed-person watchlists.',       example_label: 'Compliance-led' },
      { num_tag: '06', title: 'Embedded scoring',   body_html: 'White-label decisioning APIs.',                example_label: 'New for 2024' }
    ]
  },

  methodology_inline: {
    page_h1:      'How this profile was built.',
    subhead_html: 'Sources and our interpretation rules.',
    left_col_heading:  'Source basis',
    right_col_heading: 'Interpretation rules',
    left_items: [
      { label: 'Audited financials FY22-FY24', desc_html: 'Filings as published. We did not adjust for one-offs.' },
      { label: 'Management interview',         desc_html: 'Sept 2024 — head of strategy, redacted on request.' },
      { label: 'Public press releases',        desc_html: '24 releases YTD 2024; corroborative only.' },
      { label: 'Sector benchmarks',            desc_html: '[Kira estimates] — proprietary peer set.' }
    ],
    right_items: [
      { label: 'Currency conversion', desc_html: 'Year-average rates from the financials\' reporting tables.' },
      { label: 'Segment definitions', desc_html: 'Defined by the company; we did not re-cut.' },
      { label: 'Coverage gaps',       desc_html: 'Where data is silent we said so explicitly.' },
      { label: 'Forward-looking',     desc_html: 'Marked [Kira estimates] throughout; not company guidance.' }
    ]
  },

  competitive_profile_deep: {
    section_tag:   'Section 06 · Company profile',
    company_name:  'VietnamCredit Group',
    company_subtitle: 'Vietnam\'s largest independent credit-reports provider.',
    tags: [
      { label: 'Private',   type: 'primary' },
      { label: 'B2B SaaS',  type: 'primary' },
      { label: 'Founded 2002', type: 'secondary' }
    ],
    profile_stats: [
      { label: 'Revenue',  val: '1.2',  unit: 'B USD' },
      { label: 'Customers',val: '420',  unit: 'K' },
      { label: 'HQ',       val: 'HCMC', unit: '' },
      { label: 'Staff',    val: '850',  unit: '' }
    ],
    left_sections: [
      { heading: 'Business model', body_html: 'Subscription + transactional fees split 70/30 [annual-report.pdf]. Average contract value $34K for enterprise tier.' },
      { heading: 'Leadership',     body_html: 'Founder-led with CEO holding 18% post-Series C. Three independent board members added in 2023.' }
    ],
    right_sections: [
      { heading: 'Recent funding',  body_html: 'Series C of $45M in Q2 2024 — led by a regional sovereign fund [press release Jun 2024].' },
      { heading: 'Risk surface',    body_html: 'Concentration: top 10 customers = 31% of revenue [annual-report.pdf]. Regulatory: new data-residency rules from Q1 2025.' }
    ]
  },

  divider: {
    section_num:  '07',
    title_part_1: 'Where to play',
    title_part_2: 'next.',
    thesis_html:  'The next 18 months are about discipline — not new launches but tightening the existing portfolio.',
    pills: [
      { label: 'Pricing' },
      { label: 'Segments' },
      { label: 'Pricing' },
      { label: 'Geo' }
    ]
  },

  narrative_page: {
    section_tag:  'Section 08 · Outlook',
    page_h1:      'What we will be watching.',
    subhead_html: 'Three signals that will determine FY25.',
    paragraphs: [
      { heading: 'Net retention.',          body_html: 'Currently 108% [annual-report.pdf]. If it dips below 100% in any quarter, the growth story breaks.' },
      { heading: 'Regulatory clarity.',     body_html: 'Data-residency rules expected Q1 2025. The cost of compliance will reset margin math.' },
      { heading: 'Founder transition.',     body_html: 'No succession plan yet articulated externally. Material risk for a founder-led firm at scale.' }
    ]
  }
};

const FAKE_EXTRACTED = [
  { filename: 'annual-report.pdf',          char_count: 87320 },
  { filename: 'investor-deck-2024-q3.pdf',  char_count: 31040 },
  { filename: 'company-profile.docx',       char_count: 14200 }
];

const FAKE_PARSED = {
  report_kind: 'company profile presentation',
  primary_subject: 'VietnamCredit Group',
  working_title: 'VietnamCredit Group — Company Profile',
  subtitle: 'For a private-equity diligence read',
  audience: 'investors',
  tone: 'descriptive',
  country: 'Vietnam',
  industry: 'credit information services',
  year: 2024
};

const FAKE_PLAN = {
  final_title: 'VietnamCredit Group — Company Profile',
  subtitle:    'For a private-equity diligence read',
  rationale:   'Single-entity profile centered on uploaded annual report and investor deck',
  sections: Object.keys(MOCK_SLOTS).map((tid, i) => ({
    title:       `Section ${i + 1}`,
    template_id: tid,
    page_type:   tid,
    brief:       '',
    primary_sources: ['annual-report.pdf']
  }))
};

// ── Build fake "drafts" array matching Stage 5's shape ─────────
const FAKE_DRAFTS = Object.entries(MOCK_SLOTS).map(([tid, slots], i) => ({
  title:        slots.page_h1 || `Section ${i + 1}`,
  page_type:    tid,
  template_id:  tid,
  slots
}));

// ============================================================
async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('\n=== KIRA Studio renderer smoke test ===\n');

  // 1) Path resolution check
  console.log('1) Path resolution + master CSS load');
  const css = await loadMasterCssRobust();
  if (!css) {
    console.error('   ✗ master CSS not found');
    process.exit(1);
  }
  console.log(`   ✓ master_styles.css loaded (${css.length} chars)`);

  const wrapper = await loadMasterWrapper();
  console.log(`   ✓ master_wrapper.html loaded (${wrapper.length} chars)`);

  // 2) Per-template HTML render
  console.log('\n2) renderTemplate() — every allowlisted template');
  const pageHtmls = [];
  for (const tmpl of TEMPLATE_ALLOWLIST) {
    const slots = MOCK_SLOTS[tmpl.id];
    if (!slots) {
      console.error(`   ✗ no mock slots for ${tmpl.id}`);
      process.exit(1);
    }
    try {
      const html = await renderTemplate(tmpl.id, slots);
      if (!html || html.length < 200) {
        console.error(`   ✗ ${tmpl.id} produced suspiciously small output (${html?.length || 0} chars)`);
        process.exit(1);
      }
      if (html.includes('{{') && /\{\{[A-Z]/.test(html)) {
        // Page numbering placeholders are expected and will be filled later.
        const stray = html.match(/\{\{[A-Z0-9_]+\}\}/g)?.filter(m =>
          !/\{\{PAGE_NUM\}\}|\{\{TOTAL_PAGES\}\}/.test(m)
        );
        if (stray && stray.length > 0) {
          console.warn(`   ! ${tmpl.id} has unresolved placeholders: ${stray.slice(0, 5).join(', ')}`);
        }
      }
      pageHtmls.push(html);
      console.log(`   ✓ ${tmpl.id.padEnd(34)} ${String(html.length).padStart(6)} chars`);
    } catch (err) {
      console.error(`   ✗ ${tmpl.id} threw: ${err.message}`);
      process.exit(1);
    }
  }

  // 3) Cover + source-key page rendering
  console.log('\n3) Cover + source-key pages');
  const cover = renderCoverPage({
    finalTitle:     FAKE_PLAN.final_title,
    subtitle:       FAKE_PLAN.subtitle,
    reportKind:     FAKE_PARSED.report_kind,
    primarySubject: FAKE_PARSED.primary_subject,
    country:        FAKE_PARSED.country,
    industry:       FAKE_PARSED.industry,
    year:           FAKE_PARSED.year,
    jobId:          'smoke-test-job-1234'
  });
  console.log(`   ✓ cover (${cover.length} chars)`);

  const sourceKey = renderSourceKeyPage({
    extracted:  FAKE_EXTRACTED,
    totalPages: '{{TOTAL_PAGES}}'
  });
  console.log(`   ✓ source key (${sourceKey.length} chars)`);

  // 4) Page numbering pass
  console.log('\n4) applyPageNumbers — fills {{PAGE_NUM}} / {{TOTAL_PAGES}}');
  const allPages = [cover, ...pageHtmls, sourceKey].join('\n');
  const numbered = applyPageNumbers(allPages);
  const stillUnresolved = numbered.match(/\{\{PAGE_NUM\}\}|\{\{TOTAL_PAGES\}\}/g);
  if (stillUnresolved) {
    console.error(`   ✗ ${stillUnresolved.length} unresolved page-numbering tokens remain`);
    process.exit(1);
  }
  console.log(`   ✓ all page placeholders resolved (${numbered.length} chars total)`);

  // 5) Final assembled HTML (wrap in master_wrapper)
  console.log('\n5) Assemble final HTML document');
  const masterHtml = wrapper
    .replace(/\{\{LOCALE\}\}/g, 'en')
    .replace(/\{\{REPORT_TITLE\}\}/g, FAKE_PLAN.final_title)
    .replace(/\{\{REPORT_META_DESCRIPTION\}\}/g, FAKE_PLAN.subtitle || '')
    .replace('{{MASTER_STYLES_CSS}}', css)
    .replace('{{PAGES_HTML}}', numbered);
  await writeFile(path.join(OUT_DIR, 'report.html'), masterHtml, 'utf8');
  console.log(`   ✓ wrote tmp-smoke/report.html (${(masterHtml.length / 1024).toFixed(1)} KB)`);

  // 6) PPTX render
  console.log('\n6) renderPptxBuffer() — native PPTX');
  const pptxBuf = await renderPptxBuffer({
    drafts:    FAKE_DRAFTS,
    parsed:    FAKE_PARSED,
    plan:      FAKE_PLAN,
    extracted: FAKE_EXTRACTED,
    finalTitle: FAKE_PLAN.final_title,
    subtitle:   FAKE_PLAN.subtitle
  });
  if (!pptxBuf || pptxBuf.length < 5000) {
    console.error(`   ✗ PPTX buffer too small (${pptxBuf?.length || 0} bytes)`);
    process.exit(1);
  }
  await writeFile(path.join(OUT_DIR, 'report.pptx'), pptxBuf);
  console.log(`   ✓ wrote tmp-smoke/report.pptx (${(pptxBuf.length / 1024).toFixed(1)} KB)`);

  // PPTX must start with the ZIP magic (PK\x03\x04) — that's how
  // .pptx files are structured. Any other prefix means a bad encode.
  const magic = pptxBuf.slice(0, 4);
  if (magic[0] !== 0x50 || magic[1] !== 0x4B) {
    console.error(`   ✗ PPTX magic bytes wrong: ${Array.from(magic).map(b => b.toString(16)).join(' ')}`);
    process.exit(1);
  }
  console.log(`   ✓ PPTX has valid ZIP magic header (PK..)`);

  console.log('\n=== ALL PASS ===\n');
  console.log(`Outputs:`);
  console.log(`  HTML: ${path.join(OUT_DIR, 'report.html')}`);
  console.log(`  PPTX: ${path.join(OUT_DIR, 'report.pptx')}`);
}

main().catch(err => {
  console.error('\n=== FAIL ===');
  console.error(err.stack || err.message);
  process.exit(1);
});
