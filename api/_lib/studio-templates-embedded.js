// ============================================================
// AUTO-GENERATED — DO NOT EDIT BY HAND.
// Source: scripts/build-studio-embedded.mjs
// Generated: 2026-05-24T12:52:14.025Z
//
// These are the verbatim contents of the 3 template files under
// skills/kira-research-report/templates/. Embedded as JS string
// constants so studio-templates.js can fall back to them when the
// Vercel function bundle doesn't ship the actual files (the most
// common production failure mode for Studio).
//
// To regenerate: edit the source files, then run:
//   node scripts/build-studio-embedded.mjs
// ============================================================

export const EMBEDDED_MASTER_STYLES_CSS = `/* ============================================================
   KIRA Research — Master report styles v1.0
   All page types use these styles. Do not edit per-report.
   ============================================================ */

:root {
  --bg: #FFFFFF; --bg-soft: #F8F9FB; --surface-alt: #F4F6F8;
  --text: #0B0D10; --text-mid: #4A5568; --muted: #6B7280;
  --primary: #1E6FFF; --primary-dim: #1850BF; --primary-soft: #EEF3FF;
  --border: #E5E7EB; --border-strong: #D1D5DB;
  --green: #00A88B; --green-soft: #E6F7F3;
  --amber: #D97706; --amber-soft: #FEF3E7;
  --dark-bg: #0B0D10; --dark-text: #FFFFFF;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #DDE0E5; color: var(--text); font-family: 'Satoshi', system-ui, sans-serif; font-weight: 400; line-height: 1.5; -webkit-font-smoothing: antialiased; padding: 40px 0; }
.mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }

/* ============ PAGE BASE ============ */
.page { width: 1280px; height: 720px; margin: 0 auto; background: var(--bg); position: relative; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.15); page-break-after: always; }
.page-inner { padding: 36px 56px 28px; height: 100%; display: flex; flex-direction: column; position: relative; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid var(--border); margin-bottom: 16px; flex-shrink: 0; }
.page-section-tag { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--primary); letter-spacing: 0.2em; text-transform: uppercase; display: flex; align-items: center; gap: 10px; font-weight: 600; }
.page-section-tag::before { content: ""; width: 16px; height: 1px; background: var(--primary); }
.page-section-counter { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.1em; }
.page-footer { margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border); flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.1em; }
.page-footer .logo-foot { font-weight: 700; color: var(--text); }
.page-footer .logo-foot .accent { color: var(--primary); }
.page-h1 { font-family: 'Satoshi', sans-serif; font-weight: 900; font-size: 26px; line-height: 1.1; letter-spacing: -0.025em; margin-bottom: 6px; color: var(--text); flex-shrink: 0; }
.page-subhead { font-size: 13px; color: var(--text-mid); line-height: 1.5; margin-bottom: 16px; max-width: 1100px; flex-shrink: 0; }
.page-subhead strong { color: var(--text); font-weight: 600; }

/* ============ DATA TAGS ============ */
.data-tag { font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 4px 10px; border-radius: 3px; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600; display: inline-block; }
.data-tag.primary { background: var(--primary-soft); color: var(--primary); border: 1px solid rgba(30,111,255,0.3); }
.data-tag.secondary { background: var(--green-soft); color: var(--green); border: 1px solid rgba(0,168,139,0.3); }
.data-tag.estimate { background: var(--amber-soft); color: var(--amber); border: 1px solid rgba(217,119,6,0.3); }

/* ============ DARK DIVIDER ============ */
.divider-page { background: var(--dark-bg); color: var(--dark-text); }
.divider-page .atmosphere { position: absolute; inset: 0; background-image: radial-gradient(ellipse 80% 60% at 70% 50%, rgba(30,111,255,0.18) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(30,111,255,0.08) 0%, transparent 60%); pointer-events: none; }
.divider-content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 80px 96px; }
.divider-section-num { font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--primary); letter-spacing: 0.3em; margin-bottom: 28px; font-weight: 600; }
.divider-title { font-family: 'Satoshi', sans-serif; font-weight: 900; font-size: 72px; line-height: 0.95; letter-spacing: -0.04em; margin-bottom: 24px; max-width: 1000px; color: var(--dark-text); }
.divider-title .accent { color: var(--primary); }
.divider-thesis { font-size: 19px; line-height: 1.45; color: #A3A9B6; max-width: 820px; border-left: 2px solid var(--primary); padding-left: 24px; }
.divider-thesis strong { color: var(--dark-text); font-weight: 600; }
.divider-mini-toc { margin-top: 44px; display: flex; gap: 16px; flex-wrap: wrap; }
.toc-pill { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #A3A9B6; padding: 8px 16px; border: 1px solid #252A33; border-radius: 3px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; }

/* ============ EXEC SUMMARY ============ */
.exec-callouts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px; flex-shrink: 0; }
.callout { background: var(--bg); border: 1px solid var(--border); padding: 14px 16px; border-radius: 6px; position: relative; overflow: hidden; min-height: 100px; }
.callout::before { content: ""; position: absolute; top: 0; left: 0; width: 32px; height: 2px; background: var(--primary); }
.callout .num { font-family: 'Satoshi', sans-serif; font-weight: 900; font-size: 26px; line-height: 1; color: var(--text); letter-spacing: -0.02em; margin-bottom: 6px; }
.callout .num .unit { font-size: 13px; color: var(--primary); margin-left: 4px; font-weight: 700; }
.callout .label { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px; font-weight: 600; }
.callout .change { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--green); font-weight: 600; }
.callout .change.down { color: var(--amber); }
.callout .source-tag { position: absolute; bottom: 6px; right: 8px; font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 0.05em; color: var(--muted); text-transform: uppercase; font-weight: 600; }
.callout .source-tag.est { color: var(--amber); }
.callout .source-tag.sec { color: var(--green); }
.exec-body { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; flex: 1; min-height: 0; }
.exec-narrative h3 { font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 13px; color: var(--text); margin-bottom: 8px; margin-top: 14px; letter-spacing: -0.005em; }
.exec-narrative h3:first-child { margin-top: 0; }
.exec-narrative p { font-size: 12.5px; line-height: 1.55; color: var(--text-mid); margin-bottom: 8px; }
.exec-narrative p strong { color: var(--text); font-weight: 600; }
.exec-chart { background: var(--bg-soft); border: 1px solid var(--border); border-radius: 6px; padding: 16px; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }

/* ============ CHART CARDS ============ */
.chart-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.chart-title { font-size: 12px; font-weight: 700; color: var(--text); }
.chart-subtitle { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 4px; }
.chart-unit { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--primary); letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; }
.chart-body-flex { flex: 1; min-height: 0; position: relative; }
.chart-body-flex svg { width: 100%; height: 100%; max-height: 100%; display: block; }
.chart-source { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--muted); padding-top: 8px; border-top: 1px solid var(--border); font-weight: 600; flex-shrink: 0; letter-spacing: 0.05em; }

/* ============ SOURCE KEY (Phase L.3) ============
   Per-page footer line resolving inline source aliases to full citations.
   Renders just above .page-footer; pages may omit if all numbers are
   [Kira estimates] only. Pattern: alias = full citation · alias = full citation · ... */
.source-key {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  line-height: 1.4;
  color: var(--muted);
  padding: 8px 0 6px;
  border-top: 1px dotted var(--border);
  margin-top: 10px;
  letter-spacing: 0.02em;
  flex-shrink: 0;
  max-height: 32px;
  overflow: hidden;
}
.source-key::before {
  content: "SOURCE KEY · ";
  font-weight: 700;
  color: var(--text-mid);
  font-style: italic;
  letter-spacing: 0.08em;
}
.source-key strong { color: var(--text-mid); font-weight: 700; }
/* Hide entirely when empty so layout doesn't show an orphan dotted line */
.source-key:empty { display: none; }

/* ============ IMPLICATIONS GRID ============ */
.imp-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; flex: 1; min-height: 0; }
.imp-card { background: var(--bg); border: 1px solid var(--border); border-top: 3px solid var(--primary); border-radius: 4px; padding: 16px 14px 14px; display: flex; flex-direction: column; }
.imp-card .num { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--primary); letter-spacing: 0.15em; font-weight: 700; margin-bottom: 8px; }
.imp-card .title { font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 13px; line-height: 1.25; color: var(--text); margin-bottom: 8px; min-height: 32px; }
.imp-card .body-text { font-size: 11px; line-height: 1.5; color: var(--text-mid); flex: 1; }
.imp-card .body-text strong { color: var(--text); font-weight: 600; }
.imp-card .anchor { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border); font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.05em; }
.imp-card .anchor .num-anchor { color: var(--text); font-weight: 700; }

/* ============ COMPETITIVE ============ */
.comp-section-wrap { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; flex-shrink: 0; margin-bottom: 14px; }
.comp-chart-card { background: var(--bg-soft); border: 1px solid var(--border); border-radius: 6px; padding: 14px; display: flex; flex-direction: column; height: 240px; }
.comp-side-text h3 { font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 13px; color: var(--text); margin-bottom: 8px; }
.comp-side-text p { font-size: 11.5px; line-height: 1.55; color: var(--text-mid); margin-bottom: 8px; }
.comp-side-text p strong { color: var(--text); font-weight: 600; }
.comp-side-text .stat-stack { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); }
.comp-side-text .stat-line { display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 4px 0; color: var(--text-mid); }
.comp-side-text .stat-line .val { color: var(--text); font-weight: 700; }
.comp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; flex: 1; min-height: 0; }
.comp-card { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 14px; display: flex; flex-direction: column; position: relative; overflow: hidden; min-height: 0; }
.comp-card.leader { border-color: var(--primary); border-width: 1.5px; padding-top: 22px; }
.comp-card.leader::before { content: "MARKET LEADER"; position: absolute; top: -1px; left: 14px; background: var(--primary); color: #FFFFFF; font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 0.12em; padding: 3px 8px; border-radius: 0 0 3px 3px; font-weight: 600; }
.comp-rank { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.15em; margin-bottom: 6px; font-weight: 600; }
.comp-name { font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 13px; color: var(--text); line-height: 1.2; margin-bottom: 4px; }
.comp-parent { font-size: 10px; color: var(--muted); margin-bottom: 10px; line-height: 1.3; }
.comp-stat-row { display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 4px 0; border-bottom: 1px dotted var(--border); color: var(--text-mid); }
.comp-stat-row:last-of-type { border-bottom: none; }
.comp-stat-row .val { color: var(--text); font-weight: 700; }
.comp-strengths { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); font-size: 10.5px; line-height: 1.45; color: var(--text-mid); }
.comp-strengths strong { color: var(--text); font-weight: 600; }

/* ============ PROFILE DEEP-DIVE ============ */
.profile-hero { background: var(--bg-soft); border-left: 3px solid var(--primary); padding: 14px 18px; margin-bottom: 14px; display: grid; grid-template-columns: 2fr 3fr; gap: 30px; flex-shrink: 0; }
.profile-hero h2 { font-family: 'Satoshi', sans-serif; font-weight: 900; font-size: 20px; line-height: 1.15; letter-spacing: -0.02em; color: var(--text); margin-bottom: 4px; }
.profile-hero .sub { font-size: 11.5px; color: var(--text-mid); margin-bottom: 8px; }
.profile-hero .tags { display: flex; gap: 6px; flex-wrap: wrap; }
.profile-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.profile-stats .stat { border-left: 1px solid var(--border); padding-left: 10px; }
.profile-stats .stat:first-child { border-left: none; padding-left: 0; }
.profile-stats .stat .label { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; }
.profile-stats .stat .val { font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 17px; color: var(--text); line-height: 1.1; }
.profile-stats .stat .val .unit { font-size: 10px; color: var(--text-mid); font-weight: 500; margin-left: 3px; }
.profile-body { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; flex: 1; min-height: 0; }
.profile-col h3 { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--primary); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border); font-weight: 600; }
.profile-col h3:not(:first-child) { margin-top: 14px; }
.profile-col p { font-size: 11.5px; line-height: 1.55; color: var(--text-mid); margin-bottom: 8px; }
.profile-col p strong { color: var(--text); font-weight: 600; }
.profile-col ul { list-style: none; padding: 0; margin: 0; }
.profile-col li { font-size: 11px; line-height: 1.5; color: var(--text-mid); padding-left: 16px; position: relative; margin-bottom: 5px; }
.profile-col li::before { content: "→"; position: absolute; left: 0; color: var(--primary); font-family: 'JetBrains Mono', monospace; font-weight: 700; }
.profile-col li strong { color: var(--text); font-weight: 600; }

/* ============ AI / USE CASE GRID ============ */
.ai-overview-top { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; flex-shrink: 0; margin-bottom: 14px; height: 270px; }
.ai-narrative h3 { font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 13px; color: var(--text); margin-bottom: 6px; margin-top: 12px; }
.ai-narrative h3:first-child { margin-top: 0; }
.ai-narrative p { font-size: 11.5px; line-height: 1.5; color: var(--text-mid); margin-bottom: 6px; }
.ai-narrative p strong { color: var(--text); font-weight: 600; }
.ai-callouts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; flex-shrink: 0; }
.ai-usecase-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap: 14px; flex: 1; min-height: 0; }
.ai-usecase { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 14px; display: flex; flex-direction: column; position: relative; }
.ai-usecase .uc-num { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--primary); letter-spacing: 0.15em; font-weight: 700; margin-bottom: 6px; }
.ai-usecase .uc-title { font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 13px; color: var(--text); margin-bottom: 8px; line-height: 1.2; }
.ai-usecase .uc-body { font-size: 11px; line-height: 1.5; color: var(--text-mid); flex: 1; }
.ai-usecase .uc-body strong { color: var(--text); font-weight: 600; }
.ai-usecase .uc-example { margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--border); font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.03em; text-transform: uppercase; }

/* ============ COVER ============ */
.cover { background: var(--bg); }
.cover .page-inner { padding: 80px; }
.cover-grid { position: absolute; inset: 0; background-image: linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px); background-size: 80px 80px; opacity: 0.7; mask-image: radial-gradient(ellipse 80% 60% at 70% 30%, black 0%, transparent 70%); pointer-events: none; }
.cover-content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
.cover-top { display: flex; align-items: baseline; gap: 14px; }
.cover-main { display: flex; flex-direction: column; gap: 28px; }
.cover-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--primary); letter-spacing: 0.25em; text-transform: uppercase; font-weight: 600; display: flex; align-items: center; gap: 14px; }
.cover-eyebrow::before { content: ""; width: 24px; height: 1px; background: var(--primary); }
.cover h1 { font-family: 'Satoshi', sans-serif; font-weight: 900; font-size: 64px; line-height: 1.0; letter-spacing: -0.035em; max-width: 1000px; color: var(--text); }
.cover h1 .accent { color: var(--primary); }
.cover-subtitle { font-size: 18px; line-height: 1.4; color: var(--text-mid); max-width: 700px; }
.cover-meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; padding-top: 24px; border-top: 1px solid var(--border); }
.cover-meta-item .label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px; font-weight: 600; }
.cover-meta-item .val { font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 16px; color: var(--text); }
.cover-meta-item .val .accent { color: var(--primary); }
.cover-confidential { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 600; }
.cover-confidential strong { color: var(--primary); font-weight: 600;}

/* ============ SVG UTILITIES ============ */
.axis-text { font-family: 'JetBrains Mono', monospace; font-size: 9px; fill: var(--muted); }
.axis-line { stroke: var(--border); stroke-width: 1; }
.grid-line { stroke: var(--border); stroke-width: 1; stroke-dasharray: 2 2; }
.bar-primary { fill: var(--primary); }
.bar-secondary { fill: var(--green); }
.bar-tertiary { fill: var(--amber); }
.label-data { font-family: 'JetBrains Mono', monospace; font-size: 10px; fill: var(--text); font-weight: 700; }
.label-small { font-family: 'JetBrains Mono', monospace; font-size: 9px; fill: var(--text-mid); }

/* ============ PRINT (for PDF) ============ */
@media print {
  body { background: white; padding: 0; }
  .page { box-shadow: none; page-break-after: always; }
  .viewer-divider { display: none; }
}

/* ============================================================
   === Phase H new page types (2026-05-23) ===
   5 new page types: persona_profile, policy_timeline,
   risk_matrix (qualitative), channel_waterfall,
   price_quality_matrix. All conform to 1280x720 canvas with
   page-header + body + page-footer chrome inherited from .page.
   Severity tokens shared across types where useful.
   ============================================================ */

/* shared severity tokens (risk_matrix + winner/loser chips) */
:root {
  --sev-low: #15803D; --sev-low-soft: #DCFCE7;
  --sev-med: #D97706; --sev-med-soft: #FEF3E7;
  --sev-high: #B91C1C; --sev-high-soft: #FEE2E2;
  --sev-neutral: #6B7280; --sev-neutral-soft: #F3F4F6;
}

.severity-chip { font-family: 'JetBrains Mono', monospace; font-size: 9px; padding: 3px 8px; border-radius: 3px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; display: inline-block; }
.severity-chip.low { background: var(--sev-low-soft); color: var(--sev-low); }
.severity-chip.med { background: var(--sev-med-soft); color: var(--sev-med); }
.severity-chip.high { background: var(--sev-high-soft); color: var(--sev-high); }
.severity-chip.neutral { background: var(--sev-neutral-soft); color: var(--sev-neutral); }
.severity-chip.winner { background: var(--green-soft); color: var(--green); }
.severity-chip.loser { background: var(--sev-high-soft); color: var(--sev-high); }
.severity-chip.mixed { background: var(--sev-med-soft); color: var(--sev-med); }
.severity-chip.pending { background: var(--primary-soft); color: var(--primary); }

/* ============ PERSONA PROFILE (consumer_segmentation) ============ */
.persona-profile-page .page-inner { padding-top: 30px; }
.persona-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-bottom: 14px; flex-shrink: 0; }
.persona-header .persona-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--primary); letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; }
.persona-header .persona-headline { font-family: 'Satoshi', sans-serif; font-weight: 900; font-size: 22px; line-height: 1.15; letter-spacing: -0.02em; color: var(--text); flex: 1; max-width: 760px; }
.persona-grid-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; flex-shrink: 0; margin-bottom: 12px; }
.persona-block { background: var(--bg-soft); border: 1px solid var(--border); border-radius: 6px; padding: 12px 14px; }
.persona-block h4 { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--primary); letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
.persona-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.persona-stat { padding: 4px 0; }
.persona-stat .label { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; }
.persona-stat .num { font-family: 'Satoshi', sans-serif; font-weight: 900; font-size: 18px; line-height: 1; color: var(--text); letter-spacing: -0.02em; }
.persona-stat .num .unit { font-size: 10px; color: var(--primary); margin-left: 3px; font-weight: 700; }
.persona-stat .src { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 3px; font-weight: 600; }
.persona-behavior-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.persona-behavior { padding: 4px 0; }
.persona-behavior .metric { font-family: 'Satoshi', sans-serif; font-weight: 900; font-size: 17px; line-height: 1.1; color: var(--text); margin-bottom: 3px; }
.persona-behavior .label { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; margin-bottom: 3px; }
.persona-behavior .change { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--green); font-weight: 600; }
.persona-behavior .change.down { color: var(--amber); }
.persona-bottom-row { display: grid; grid-template-columns: 1.1fr 1fr; gap: 18px; flex: 1; min-height: 0; }
.persona-quote-block { background: var(--primary-soft); border-left: 3px solid var(--primary); padding: 14px 16px; border-radius: 0 4px 4px 0; display: flex; flex-direction: column; justify-content: center; }
.persona-quote-block .qmark { font-family: 'Satoshi', sans-serif; font-weight: 900; font-size: 32px; line-height: 0.6; color: var(--primary); margin-bottom: 4px; }
.persona-quote-block .body { font-size: 13px; line-height: 1.45; color: var(--text); font-style: italic; margin-bottom: 8px; }
.persona-quote-block .attribution { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; }
.persona-channel-pref { display: flex; flex-direction: column; gap: 6px; padding: 10px 0; }
.persona-channel-pref .title { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--primary); letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
.persona-channel-row { display: grid; grid-template-columns: 90px 1fr 38px; gap: 8px; align-items: center; font-size: 10.5px; }
.persona-channel-row .ch-name { color: var(--text-mid); font-weight: 500; }
.persona-channel-row .ch-bar { height: 8px; background: var(--border); border-radius: 2px; overflow: hidden; }
.persona-channel-row .ch-bar-fill { height: 100%; background: var(--primary); }
.persona-channel-row .ch-pct { font-family: 'JetBrains Mono', monospace; color: var(--text); font-weight: 700; text-align: right; }
.persona-channel-caption { font-size: 10.5px; color: var(--text-mid); margin-top: 6px; line-height: 1.4; }
.persona-wtp-anchor { background: var(--bg); border: 1px solid var(--border); border-top: 3px solid var(--primary); border-radius: 4px; padding: 10px 14px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
.persona-wtp-anchor .left .label { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
.persona-wtp-anchor .left .change { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--green); font-weight: 600; }
.persona-wtp-anchor .num { font-family: 'Satoshi', sans-serif; font-weight: 900; font-size: 22px; color: var(--text); letter-spacing: -0.02em; }
.persona-wtp-anchor .num .unit { font-size: 11px; color: var(--primary); margin-left: 3px; font-weight: 700; }
.persona-source-strip { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); font-weight: 600; }

/* ============ POLICY TIMELINE (regulatory_brief) ============ */
.policy-timeline-page .page-inner { padding-top: 30px; }
.policy-timeline-wrap { display: grid; grid-template-columns: 2.4fr 1fr; gap: 20px; flex: 1; min-height: 0; }
.policy-timeline-chart { background: var(--bg-soft); border: 1px solid var(--border); border-radius: 6px; padding: 14px; display: flex; flex-direction: column; min-height: 0; }
.policy-timeline-chart .chart-title { font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 12px; color: var(--text); margin-bottom: 4px; }
.policy-timeline-chart .chart-subtitle { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
.policy-timeline-chart .tl-svg { flex: 1; min-height: 0; width: 100%; }
.policy-timeline-chart .tl-svg svg { width: 100%; height: 100%; display: block; }
.tl-marker-date { font-family: 'JetBrains Mono', monospace; font-size: 9px; fill: var(--primary); font-weight: 700; letter-spacing: 0.06em; }
.tl-marker-label { font-family: 'Satoshi', sans-serif; font-size: 10.5px; fill: var(--text); font-weight: 700; }
.tl-marker-body { font-family: 'Satoshi', sans-serif; font-size: 9.5px; fill: var(--text-mid); }
.tl-axis-line { stroke: var(--border-strong); stroke-width: 1.5; }
.tl-marker-dot { stroke-width: 2; stroke: var(--bg); }
.policy-rail { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.policy-rail-card { background: var(--bg); border: 1px solid var(--border); border-left: 3px solid var(--primary); border-radius: 0 4px 4px 0; padding: 10px 12px; }
.policy-rail-card .tag { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--primary); letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
.policy-rail-card .title { font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 12px; color: var(--text); line-height: 1.2; margin-bottom: 6px; }
.policy-rail-card .body { font-size: 10.5px; line-height: 1.5; color: var(--text-mid); margin-bottom: 6px; }
.policy-rail-card .body strong { color: var(--text); font-weight: 600; }
.policy-rail-card .src { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
.policy-source-strip { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border); font-weight: 600; flex-shrink: 0; }

/* ============ RISK MATRIX (entry_strategy, qualitative) ============ */
.risk-matrix-page .page-inner { padding-top: 30px; }
.risk-matrix-wrap { display: grid; grid-template-columns: 1.8fr 1fr; gap: 20px; flex: 1; min-height: 0; }
.risk-matrix-chart { background: var(--bg-soft); border: 1px solid var(--border); border-radius: 6px; padding: 14px; display: flex; flex-direction: column; min-height: 0; }
.risk-matrix-chart .chart-title { font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 12px; color: var(--text); margin-bottom: 4px; }
.risk-matrix-chart .chart-subtitle { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
.risk-grid-svg { flex: 1; min-height: 0; width: 100%; }
.risk-grid-svg svg { width: 100%; height: 100%; display: block; }
.risk-cell-bg-empty { fill: var(--surface-alt); stroke: var(--border); stroke-width: 0.5; }
.risk-cell-bg-low { fill: var(--sev-low-soft); stroke: var(--sev-low); stroke-width: 0.5; stroke-opacity: 0.6; }
.risk-cell-bg-med { fill: var(--sev-med-soft); stroke: var(--sev-med); stroke-width: 0.5; stroke-opacity: 0.6; }
.risk-cell-bg-high { fill: var(--sev-high-soft); stroke: var(--sev-high); stroke-width: 0.5; stroke-opacity: 0.6; }
.risk-cell-label { font-family: 'Satoshi', sans-serif; font-size: 9px; font-weight: 600; fill: var(--text); }
.risk-axis-label { font-family: 'JetBrains Mono', monospace; font-size: 8.5px; fill: var(--text-mid); letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; }
.risk-axis-title { font-family: 'JetBrains Mono', monospace; font-size: 10px; fill: var(--primary); letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; }
.risk-legend-strip { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--text-mid); letter-spacing: 0.06em; text-transform: uppercase; padding-top: 8px; border-top: 1px solid var(--border); margin-top: 8px; font-weight: 600; flex-shrink: 0; }
.risk-rail { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.risk-rail-card { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 10px 12px; display: flex; flex-direction: column; }
.risk-rail-card .name { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text); letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; margin-bottom: 6px; }
.risk-rail-card .body { font-size: 10.5px; line-height: 1.5; color: var(--text-mid); flex: 1; }
.risk-rail-card .body strong { color: var(--text); font-weight: 600; }
.risk-rail-card .footer-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 6px; border-top: 1px dashed var(--border); }
.risk-rail-card .footer-row .src { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
.risk-source-strip { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); font-weight: 600; flex-shrink: 0; }

/* ============ CHANNEL WATERFALL (distribution_analysis) ============ */
.channel-waterfall-page .page-inner { padding-top: 30px; }
.waterfall-chart { background: var(--bg-soft); border: 1px solid var(--border); border-radius: 6px; padding: 14px; display: flex; flex-direction: column; flex-shrink: 0; margin-bottom: 12px; }
.waterfall-chart .chart-title { font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 12px; color: var(--text); margin-bottom: 4px; }
.waterfall-chart .chart-subtitle { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
.waterfall-svg-wrap { height: 260px; width: 100%; }
.waterfall-svg-wrap svg { width: 100%; height: 100%; display: block; }
.wf-segment-label { font-family: 'Satoshi', sans-serif; font-size: 10.5px; fill: var(--text); font-weight: 700; }
.wf-segment-pct { font-family: 'JetBrains Mono', monospace; font-size: 11px; fill: var(--text); font-weight: 700; }
.wf-segment-note { font-family: 'JetBrains Mono', monospace; font-size: 8.5px; fill: var(--text-mid); letter-spacing: 0.04em; }
.wf-segment-src { font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600; }
.wf-axis-text { font-family: 'JetBrains Mono', monospace; font-size: 9px; fill: var(--muted); letter-spacing: 0.06em; }
.wf-segment-fill-1 { fill: var(--primary); }
.wf-segment-fill-2 { fill: var(--primary-dim); }
.wf-segment-fill-3 { fill: var(--green); }
.wf-segment-fill-4 { fill: var(--amber); }
.wf-segment-fill-5 { fill: #6366F1; }
.wf-segment-fill-6 { fill: #DB2777; }
.wf-segment-fill-7 { fill: #0EA5E9; }
.waterfall-commentary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; flex: 1; min-height: 0; }
.waterfall-commentary h3 { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--primary); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border); font-weight: 600; }
.waterfall-commentary p { font-size: 11.5px; line-height: 1.55; color: var(--text-mid); margin-bottom: 6px; }
.waterfall-commentary p strong { color: var(--text); font-weight: 600; }
.waterfall-commentary ul { list-style: none; padding: 0; margin: 0; }
.waterfall-commentary li { font-size: 11px; line-height: 1.5; color: var(--text-mid); padding-left: 16px; position: relative; margin-bottom: 5px; }
.waterfall-commentary li::before { content: "→"; position: absolute; left: 0; color: var(--primary); font-family: 'JetBrains Mono', monospace; font-weight: 700; }
.waterfall-commentary li strong { color: var(--text); font-weight: 600; }
.waterfall-source-strip { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); font-weight: 600; flex-shrink: 0; }

/* ============ PRICE QUALITY MATRIX (pricing_strategy) ============ */
.price-quality-page .page-inner { padding-top: 30px; }
.pq-matrix-wrap { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; flex: 1; min-height: 0; }
.pq-matrix-chart { background: var(--bg-soft); border: 1px solid var(--border); border-radius: 6px; padding: 14px; display: flex; flex-direction: column; min-height: 0; }
.pq-matrix-chart .chart-title { font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 12px; color: var(--text); margin-bottom: 4px; }
.pq-matrix-chart .chart-subtitle { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
.pq-svg-wrap { flex: 1; min-height: 0; width: 100%; }
.pq-svg-wrap svg { width: 100%; height: 100%; display: block; }
.pq-quadrant-bg { fill: var(--bg); stroke: var(--border); stroke-width: 0.5; }
.pq-axis-line { stroke: var(--border-strong); stroke-width: 1.5; }
.pq-grid-line { stroke: var(--border); stroke-width: 0.5; stroke-dasharray: 2 2; }
.pq-axis-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; fill: var(--primary); letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; }
.pq-axis-tick { font-family: 'JetBrains Mono', monospace; font-size: 9px; fill: var(--muted); letter-spacing: 0.06em; }
.pq-quadrant-label { font-family: 'Satoshi', sans-serif; font-size: 10px; fill: var(--text-mid); font-weight: 700; letter-spacing: -0.005em; text-transform: uppercase; }
.pq-dot { fill: var(--primary); stroke: var(--bg); stroke-width: 1.5; }
.pq-dot-label { font-family: 'Satoshi', sans-serif; font-size: 10px; fill: var(--text); font-weight: 700; }
.pq-sidebar { background: var(--bg); border-left: 3px solid var(--primary); padding: 12px 14px; display: flex; flex-direction: column; min-height: 0; }
.pq-sidebar h3 { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--primary); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--border); font-weight: 600; }
.pq-sidebar p { font-size: 11.5px; line-height: 1.55; color: var(--text-mid); margin-bottom: 8px; }
.pq-sidebar p strong { color: var(--text); font-weight: 600; }
.pq-source-strip { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); font-weight: 600; flex-shrink: 0; }

`;

export const EMBEDDED_MASTER_WRAPPER_HTML = `<!DOCTYPE html>
<html lang="{{LOCALE}}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1280, initial-scale=1.0">
<title>{{REPORT_TITLE}}</title>
<meta name="description" content="{{REPORT_META_DESCRIPTION}}">
<meta property="og:title" content="{{REPORT_TITLE}}">
<meta property="og:description" content="{{REPORT_META_DESCRIPTION}}">
<meta property="og:type" content="article">
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap">
<style>
/* === MASTER STYLES INJECTED HERE === */
{{MASTER_STYLES_CSS}}
</style>
</head>
<body>

<!-- ============ ALL PAGES INJECTED HERE ============ -->
{{PAGES_HTML}}

</body>
</html>
`;

export const EMBEDDED_PAGE_COMPONENTS_HTML = `<!-- ==========================================================
     KIRA Research — Page Component Templates v1.0

     Placeholder syntax: {{VARIABLE_NAME}} or {{#each items}}...{{/each}}
     Use simple Handlebars-style substitution. Loop syntax uses comments.

     Each template = ONE page (1280×720px).
     Pipeline picks template by section_to_page_type_map from page_schemas.json.

     PHASE L.3 — Source key footer:
     Pages that cite named sources include a {{SOURCE_KEY_HTML}} placeholder
     just above .page-footer (see exec_summary_p1, market_data_chart for the
     canonical pattern). The placeholder resolves to "alias_1 = full citation
     · alias_2 = full citation · ..." which the .source-key CSS class formats
     with the "SOURCE KEY ·" prefix via ::before.
     Render pipeline: if SOURCE_KEY_HTML is empty string, the div renders
     blank (no border, no prefix shown — handled by CSS empty-check). If a
     stub doesn't have the placeholder yet but content_per_section.md emitted
     source_key data, the renderer should INJECT the div before .page-footer.
     ========================================================== -->


<!-- ============================================================
     TEMPLATE: cover
     Usage: Section 01 — Report cover page
     ============================================================ -->
<!-- TEMPLATE_START: cover -->
<div class="page cover">
  <div class="cover-grid"></div>
  <div class="cover-content">
    <div class="page-inner">
      <div class="cover-top">
        <span style="font-family: 'Satoshi', sans-serif; font-weight: 900; font-size: 28px;">KIRA<span style="color: var(--primary);">.</span></span>
        <span style="font-family: 'Satoshi', sans-serif; font-weight: 500; font-size: 12px; letter-spacing: 0.32em; color: var(--primary); text-transform: uppercase;">RESEARCH</span>
      </div>
      <div class="cover-main">
        <div class="cover-eyebrow">{{COUNTRY}} · {{INDUSTRY}} · {{YEAR}}</div>
        <h1>{{REPORT_TITLE_LINE_1}}<br>{{REPORT_TITLE_LINE_2}} <span class="accent">{{REPORT_TITLE_ACCENT}}</span></h1>
        <p class="cover-subtitle">{{COVER_SUBTITLE}}</p>
      </div>
      <div>
        <div class="cover-meta-grid">
          <div class="cover-meta-item"><div class="label">Country</div><div class="val">{{COUNTRY}}</div></div>
          <div class="cover-meta-item"><div class="label">Sector</div><div class="val">{{INDUSTRY_SHORT}}</div></div>
          <div class="cover-meta-item"><div class="label">Published</div><div class="val">{{PUBLISH_DATE}}</div></div>
          <div class="cover-meta-item"><div class="label">Report ID</div><div class="val"><span class="accent">{{REPORT_ID}}</span></div></div>
        </div>
        <div class="cover-confidential" style="margin-top: 16px;"><strong>CONFIDENTIAL</strong> · Single-user license · © 2026 KIRA Research</div>
      </div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: cover -->


<!-- ============================================================
     TEMPLATE: divider
     Usage: Section break (dark mode), McKinsey-style chapter signpost
     ============================================================ -->
<!-- TEMPLATE_START: divider -->
<div class="page divider-page">
  <div class="atmosphere"></div>
  <div class="divider-content">
    <div class="divider-section-num">SECTION {{SECTION_NUM}}</div>
    <h1 class="divider-title">{{TITLE_PART_1}} <span class="accent">{{TITLE_PART_2}}</span></h1>
    <div class="divider-thesis">{{THESIS_HTML}}</div>
    <div class="divider-mini-toc">
      <!-- LOOP: pills -->
      <div class="toc-pill">{{PILL_LABEL}}</div>
      <!-- END LOOP -->
    </div>
  </div>
</div>
<!-- TEMPLATE_END: divider -->


<!-- ============================================================
     TEMPLATE: exec_summary_p1
     Usage: Section 04 page 1 — callouts + 2-col narrative + chart
     Slot budgets per page_schemas.json
     ============================================================ -->
<!-- TEMPLATE_START: exec_summary_p1 -->
<div class="page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">{{SECTION_TAG}}</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">{{PAGE_H1}}</h1>
    <p class="page-subhead">{{SUBHEAD_HTML}}</p>

    <div class="exec-callouts">
      <!-- LOOP: 4 callouts -->
      <div class="callout">
        <div class="label">{{CALLOUT_LABEL}}</div>
        <div class="num">{{CALLOUT_NUM}}<span class="unit">{{CALLOUT_UNIT}}</span></div>
        <div class="change {{CALLOUT_CHANGE_DIR}}">{{CALLOUT_CHANGE}}</div>
        <div class="source-tag {{CALLOUT_SOURCE_TAG}}">{{CALLOUT_SOURCE_LABEL}}</div>
      </div>
      <!-- END LOOP -->
    </div>

    <div class="exec-body">
      <div class="exec-narrative">
        <!-- LOOP: 2 narrative sections -->
        <h3>{{NARRATIVE_HEADING}}</h3>
        <p>{{NARRATIVE_BODY_HTML}}</p>
        <!-- END LOOP -->
      </div>

      <div class="exec-chart">
        <div class="chart-header">
          <div>
            <div class="chart-title">{{CHART_TITLE}}</div>
            <div class="chart-subtitle">{{CHART_SUBTITLE}}</div>
          </div>
          <div class="chart-unit">{{CHART_UNIT}}</div>
        </div>
        <div class="chart-body-flex">{{CHART_SVG}}</div>
        <div class="chart-source">{{CHART_SOURCE}}</div>
      </div>
    </div>

    <!-- Phase L.3: source key resolving inline aliases to full citations. Omit if no named sources on this page. -->
    <div class="source-key">{{SOURCE_KEY_HTML}}</div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: exec_summary_p1 -->


<!-- ============================================================
     TEMPLATE: exec_summary_p2_implications
     Usage: Section 04 page 2 + Section 18 — 5-card grid
     ============================================================ -->
<!-- TEMPLATE_START: exec_summary_p2_implications -->
<div class="page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">{{SECTION_TAG}}</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">{{PAGE_H1}}</h1>
    <p class="page-subhead">{{SUBHEAD_HTML}}</p>

    <div class="imp-grid">
      <!-- LOOP: 5 implication cards -->
      <div class="imp-card">
        <div class="num">{{CARD_NUM_TAG}}</div>
        <div class="title">{{CARD_TITLE}}</div>
        <div class="body-text">{{CARD_BODY_HTML}}</div>
        <div class="anchor">{{CARD_ANCHOR_HTML}}</div>
      </div>
      <!-- END LOOP -->
    </div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: exec_summary_p2_implications -->


<!-- ============================================================
     TEMPLATE: market_data_chart
     Usage: Generic page with narrative + 1 chart (market sizing, growth, etc.)
     ============================================================ -->
<!-- TEMPLATE_START: market_data_chart -->
<div class="page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">{{SECTION_TAG}}</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">{{PAGE_H1}}</h1>
    <p class="page-subhead">{{SUBHEAD_HTML}}</p>

    <div class="exec-body">
      <div class="exec-narrative">
        <!-- LOOP: 2-3 narrative sections -->
        <h3>{{NARRATIVE_HEADING}}</h3>
        <p>{{NARRATIVE_BODY_HTML}}</p>
        <!-- END LOOP -->
      </div>

      <div class="exec-chart">
        <div class="chart-header">
          <div>
            <div class="chart-title">{{CHART_TITLE}}</div>
            <div class="chart-subtitle">{{CHART_SUBTITLE}}</div>
          </div>
          <div class="chart-unit">{{CHART_UNIT}}</div>
        </div>
        <div class="chart-body-flex">{{CHART_SVG}}</div>
        <div class="chart-source">{{CHART_SOURCE}}</div>
      </div>
    </div>

    <!-- Phase L.3: source key resolving inline aliases to full citations. Omit if no named sources on this page. -->
    <div class="source-key">{{SOURCE_KEY_HTML}}</div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: market_data_chart -->


<!-- ============================================================
     TEMPLATE: competitive_structure
     Usage: Section 09 page 1 — HHI chart + sidebar + 4-col cards
     ============================================================ -->
<!-- TEMPLATE_START: competitive_structure -->
<div class="page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">{{SECTION_TAG}}</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">{{PAGE_H1}}</h1>
    <p class="page-subhead">{{SUBHEAD_HTML}}</p>

    <div class="comp-section-wrap">
      <div class="comp-chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">{{CHART_TITLE}}</div>
            <div class="chart-subtitle">{{CHART_SUBTITLE}}</div>
          </div>
          <div class="chart-unit">{{CHART_UNIT}}</div>
        </div>
        <div class="chart-body-flex">{{CHART_SVG}}</div>
        <div class="chart-source">{{CHART_SOURCE}}</div>
      </div>
      <div class="comp-side-text">
        <h3>{{SIDEBAR_HEADING}}</h3>
        <p>{{SIDEBAR_BODY_HTML}}</p>
        <div class="stat-stack">
          <!-- LOOP: stat lines (max 4) -->
          <div class="stat-line"><span>{{STAT_LABEL}}</span><span class="val">{{STAT_VALUE}}</span></div>
          <!-- END LOOP -->
        </div>
      </div>
    </div>

    <div class="comp-grid">
      <!-- LOOP: 4 player cards (first is leader if applicable) -->
      <div class="comp-card {{IS_LEADER_CLASS}}">
        <div class="comp-rank">{{RANK_LABEL}}</div>
        <div class="comp-name">{{COMPANY_NAME}}</div>
        <div class="comp-parent">{{COMPANY_PARENT}}</div>
        <!-- LOOP: 3 stat rows -->
        <div class="comp-stat-row"><span>{{STAT_LABEL}}</span><span class="val">{{STAT_VALUE}}</span></div>
        <!-- END LOOP -->
        <div class="comp-strengths">{{STRENGTHS_HTML}}</div>
      </div>
      <!-- END LOOP -->
    </div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: competitive_structure -->


<!-- ============================================================
     TEMPLATE: competitive_profile_deep
     Usage: Section 09 — single player deep dive (hero + 2-col)
     ============================================================ -->
<!-- TEMPLATE_START: competitive_profile_deep -->
<div class="page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">{{SECTION_TAG}}</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>

    <div class="profile-hero">
      <div>
        <h2>{{COMPANY_NAME}}</h2>
        <div class="sub">{{COMPANY_SUBTITLE}}</div>
        <div class="tags">
          <!-- LOOP: tags (max 3) -->
          <span class="data-tag {{TAG_TYPE}}">{{TAG_LABEL}}</span>
          <!-- END LOOP -->
        </div>
      </div>
      <div class="profile-stats">
        <!-- LOOP: 4 stats -->
        <div class="stat">
          <div class="label">{{STAT_LABEL}}</div>
          <div class="val">{{STAT_VAL}}<span class="unit">{{STAT_UNIT}}</span></div>
        </div>
        <!-- END LOOP -->
      </div>
    </div>

    <div class="profile-body">
      <div class="profile-col">
        <!-- LOOP: left col 2 sections -->
        <h3>{{LEFT_SECTION_HEADING}}</h3>
        <p>{{LEFT_SECTION_BODY_HTML}}</p>
        <!-- END LOOP -->
      </div>

      <div class="profile-col">
        <!-- LOOP: right col 2 sections (one can be a list instead of paragraph) -->
        <h3>{{RIGHT_SECTION_HEADING}}</h3>
        <!-- If section type is paragraph: -->
        <p>{{RIGHT_SECTION_BODY_HTML}}</p>
        <!-- If section type is list: -->
        <ul>
          <li>{{LIST_ITEM_HTML}}</li>
        </ul>
        <!-- END LOOP -->
      </div>
    </div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: competitive_profile_deep -->


<!-- ============================================================
     TEMPLATE: ai_overview
     Usage: Section 14 page 1 — narrative + chart + 3 callouts
     ============================================================ -->
<!-- TEMPLATE_START: ai_overview -->
<div class="page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">{{SECTION_TAG}}</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">{{PAGE_H1}}</h1>
    <p class="page-subhead">{{SUBHEAD_HTML}}</p>

    <div class="ai-overview-top">
      <div class="ai-narrative">
        <!-- LOOP: 3 narrative sections -->
        <h3>{{NARRATIVE_HEADING}}</h3>
        <p>{{NARRATIVE_BODY_HTML}}</p>
        <!-- END LOOP -->
      </div>

      <div class="exec-chart">
        <div class="chart-header">
          <div>
            <div class="chart-title">{{CHART_TITLE}}</div>
            <div class="chart-subtitle">{{CHART_SUBTITLE}}</div>
          </div>
          <div class="chart-unit">{{CHART_UNIT}}</div>
        </div>
        <div class="chart-body-flex">{{CHART_SVG}}</div>
        <div class="chart-source">{{CHART_SOURCE}}</div>
      </div>
    </div>

    <div class="ai-callouts">
      <!-- LOOP: 3 callouts -->
      <div class="callout">
        <div class="label">{{CALLOUT_LABEL}}</div>
        <div class="num">{{CALLOUT_NUM}}<span class="unit">{{CALLOUT_UNIT}}</span></div>
        <div class="change">{{CALLOUT_CHANGE}}</div>
        <div class="source-tag {{CALLOUT_SOURCE_TAG}}">{{CALLOUT_SOURCE_LABEL}}</div>
      </div>
      <!-- END LOOP -->
    </div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: ai_overview -->


<!-- ============================================================
     TEMPLATE: use_case_grid_6
     Usage: 6-card 3×2 grid (AI use cases, segmentation breakouts, etc.)
     ============================================================ -->
<!-- TEMPLATE_START: use_case_grid_6 -->
<div class="page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">{{SECTION_TAG}}</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">{{PAGE_H1}}</h1>
    <p class="page-subhead">{{SUBHEAD_HTML}}</p>

    <div class="ai-usecase-grid">
      <!-- LOOP: 6 cards (3 cols × 2 rows) -->
      <div class="ai-usecase">
        <div class="uc-num">{{CARD_NUM_TAG}}</div>
        <div class="uc-title">{{CARD_TITLE}}</div>
        <div class="uc-body">{{CARD_BODY_HTML}}</div>
        <div class="uc-example">{{CARD_EXAMPLE_LABEL}}</div>
      </div>
      <!-- END LOOP -->
    </div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: use_case_grid_6 -->


<!-- ============================================================
     TEMPLATE: methodology_inline
     Usage: Section 02 — methodology overview, 2-col grid
     ============================================================ -->
<!-- TEMPLATE_START: methodology_inline -->
<div class="page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">Section 02 · Methodology</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">{{PAGE_H1}}</h1>
    <p class="page-subhead">{{SUBHEAD_HTML}}</p>

    <div class="exec-body" style="grid-template-columns: 1fr 1fr; gap: 40px;">
      <div>
        <h3 style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--primary); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); font-weight: 600;">{{LEFT_COL_HEADING}}</h3>
        <!-- LOOP: 3-4 items left col -->
        <div style="margin-bottom: 14px; padding-left: 20px; position: relative;">
          <div style="font-weight: 700; font-size: 13px; color: var(--text); margin-bottom: 3px;">→ {{ITEM_LABEL}}</div>
          <div style="font-size: 12px; color: var(--text-mid); line-height: 1.55;">{{ITEM_DESC_HTML}}</div>
        </div>
        <!-- END LOOP -->
      </div>
      <div>
        <h3 style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--primary); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); font-weight: 600;">{{RIGHT_COL_HEADING}}</h3>
        <!-- LOOP: 3-4 items right col -->
        <div style="margin-bottom: 14px; padding-left: 20px; position: relative;">
          <div style="font-weight: 700; font-size: 13px; color: var(--text); margin-bottom: 3px;">→ {{ITEM_LABEL}}</div>
          <div style="font-size: 12px; color: var(--text-mid); line-height: 1.55;">{{ITEM_DESC_HTML}}</div>
        </div>
        <!-- END LOOP -->
      </div>
    </div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: methodology_inline -->


<!-- ============================================================
     TEMPLATE: toc
     Usage: Section 03 — Table of contents (1-2 pages)
     ============================================================ -->
<!-- TEMPLATE_START: toc -->
<div class="page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">Section 03 · Table of Contents</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">{{PAGE_H1}}</h1>

    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px; min-height: 0; overflow: hidden;">
      <!-- LOOP: sections (max 12 per page) -->
      <div style="display: grid; grid-template-columns: 60px 1fr 80px; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--border); align-items: center;">
        <div class="mono" style="font-size: 11px; color: var(--primary); font-weight: 700; letter-spacing: 0.1em;">{{SECTION_NUM}}</div>
        <div>
          <div style="font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 14px; color: var(--text); margin-bottom: 2px;">{{SECTION_TITLE}}</div>
          <div style="font-size: 11px; color: var(--text-mid);">{{SECTION_SUBTITLE}}</div>
        </div>
        <div class="mono" style="font-size: 11px; color: var(--muted); text-align: right; letter-spacing: 0.05em;">PG {{PAGE_REF}}</div>
      </div>
      <!-- END LOOP -->
    </div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: toc -->


<!-- ============================================================
     TEMPLATE: methodology_endnote
     Usage: Section 19 — Final methodology + sources
     ============================================================ -->
<!-- TEMPLATE_START: methodology_endnote -->
<div class="page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">Section 19 · Methodology &amp; Sources</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">{{PAGE_H1}}</h1>
    <p class="page-subhead">{{METHODOLOGY_SUMMARY_HTML}}</p>

    <div style="flex: 1; overflow: hidden; min-height: 0;">
      <h3 style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--primary); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border); font-weight: 600;">Source Index</h3>
      <div style="columns: 2; column-gap: 32px; font-size: 11px; line-height: 1.6;">
        <!-- LOOP: sources -->
        <div style="margin-bottom: 6px; color: var(--text-mid);">
          <span class="mono" style="color: var(--primary); margin-right: 6px;">[{{SOURCE_NUM}}]</span>{{SOURCE_TEXT}}
        </div>
        <!-- END LOOP -->
      </div>
    </div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{DISCLAIMER_SHORT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: methodology_endnote -->


<!-- ============================================================
     === Phase H new page types (2026-05-23) ===
     5 new page types: persona_profile, policy_timeline,
     risk_matrix (qualitative), channel_waterfall,
     price_quality_matrix. Slot specs in schemas/page_schemas.json.
     ============================================================ -->


<!-- ============================================================
     TEMPLATE: persona_profile  (consumer_segmentation)
     One full page per persona. 3 personas per report = 3 pages.
     Layout: header (label + headline) + 2-col grid
       (demo stats / behavior grid) + bottom row (quote + channel
       pref + WTP anchor).
     ============================================================ -->
<!-- TEMPLATE_START: persona_profile -->
<div class="page persona-profile-page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">{{SECTION_TAG}}</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>

    <div class="persona-header">
      <div>
        <div class="persona-label">{{PERSONA_LABEL}}</div>
        <div class="persona-headline">{{PERSONA_HEADLINE}}</div>
      </div>
    </div>
    <p class="page-subhead">{{SUBHEAD_HTML}}</p>

    <div class="persona-grid-row">
      <div class="persona-block">
        <h4>Demographics</h4>
        <div class="persona-stats-grid">
          <!-- LOOP: 4 demo stats (age / income / location / household) -->
          <div class="persona-stat">
            <div class="label">{{STAT_LABEL}}</div>
            <div class="num">{{STAT_NUM}}<span class="unit">{{STAT_UNIT}}</span></div>
            <div class="src">[{{STAT_SOURCE_TAG}}]</div>
          </div>
          <!-- END LOOP -->
        </div>
      </div>

      <div class="persona-block">
        <h4>Behavior</h4>
        <div class="persona-behavior-grid">
          <!-- LOOP: 4 behavior cards (frequency / basket / channel / driver) -->
          <div class="persona-behavior">
            <div class="label">{{BEHAVIOR_LABEL}}</div>
            <div class="metric">{{BEHAVIOR_METRIC}}</div>
            <div class="change">{{BEHAVIOR_CHANGE}}</div>
          </div>
          <!-- END LOOP -->
        </div>
      </div>
    </div>

    <div class="persona-bottom-row">
      <div class="persona-quote-block">
        <div class="qmark">"</div>
        <div class="body">{{QUOTE_BODY}}</div>
        <div class="attribution">— {{QUOTE_ATTRIBUTION}}</div>
      </div>

      <div>
        <div class="persona-channel-pref">
          <div class="title">Channel preference (share of spend)</div>
          <!-- LOOP: 5-6 channels -->
          <div class="persona-channel-row">
            <div class="ch-name">{{CHANNEL_NAME}}</div>
            <div class="ch-bar"><div class="ch-bar-fill" style="width: {{CHANNEL_PCT}}%;"></div></div>
            <div class="ch-pct">{{CHANNEL_PCT}}%</div>
          </div>
          <!-- END LOOP -->
          <div class="persona-channel-caption">{{CHANNEL_CAPTION}}</div>
        </div>

        <div class="persona-wtp-anchor">
          <div class="left">
            <div class="label">Willingness to pay</div>
            <div class="change">{{WTP_CHANGE}} <span class="data-tag {{WTP_SOURCE_TAG}}" style="font-size: 8px; padding: 2px 6px; margin-left: 4px;">[{{WTP_SOURCE_LABEL}}]</span></div>
          </div>
          <div class="num">{{WTP_NUM}}<span class="unit">{{WTP_UNIT}}</span></div>
        </div>
      </div>
    </div>

    <div class="persona-source-strip">{{SOURCE_STRIP}}</div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: persona_profile -->


<!-- ============================================================
     TEMPLATE: policy_timeline  (regulatory_brief)
     Centerpiece horizontal SVG timeline + right-rail callouts.
     5-8 dated markers along axis with winner/loser chips.
     Right rail: dominant winner / dominant loser / biggest pending.
     ============================================================ -->
<!-- TEMPLATE_START: policy_timeline -->
<div class="page policy-timeline-page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">{{SECTION_TAG}}</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">{{PAGE_H1}}</h1>
    <p class="page-subhead">{{SUBHEAD_HTML}}</p>

    <div class="policy-timeline-wrap">
      <div class="policy-timeline-chart">
        <div class="chart-title">{{CHART_TITLE}}</div>
        <div class="chart-subtitle">{{CHART_SUBTITLE}}</div>
        <div class="tl-svg">
          <!-- Inline SVG timeline.
               Example axis line at y=140, dots evenly spaced along x.
               Pipeline emits actual <text> + <circle> nodes per marker.
               Each marker has alternating top/bottom label placement to
               avoid overlap. Winner/loser chips rendered as <rect>+<text>
               beside the marker label. -->
          {{TIMELINE_SVG}}
        </div>
        <div class="policy-source-strip">{{SOURCE_STRIP}}</div>
      </div>

      <div class="policy-rail">
        <!-- LOOP: 2-3 anchor callouts (dominant_winner, dominant_loser, biggest_pending) -->
        <div class="policy-rail-card">
          <div class="tag">{{CALLOUT_TAG}} <span class="severity-chip {{CALLOUT_INDICATOR}}">{{CALLOUT_CHIP_LABEL}}</span></div>
          <div class="title">{{CALLOUT_TITLE}}</div>
          <div class="body">{{CALLOUT_BODY_HTML}}</div>
          <div class="src">[{{CALLOUT_SOURCE_TAG}}]</div>
        </div>
        <!-- END LOOP -->
      </div>
    </div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: policy_timeline -->


<!-- ============================================================
     TEMPLATE: risk_matrix  (entry_strategy, QUALITATIVE)
     5x5 heatmap (likelihood x impact) with LOW/MED/HIGH cell
     shading only — NO numeric scores. 8-12 named risks placed
     in cells. Right rail: 3 key-risk cards.
     ============================================================ -->
<!-- TEMPLATE_START: risk_matrix -->
<div class="page risk-matrix-page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">{{SECTION_TAG}}</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">{{PAGE_H1}}</h1>
    <p class="page-subhead">{{SUBHEAD_HTML}}</p>

    <div class="risk-matrix-wrap">
      <div class="risk-matrix-chart">
        <div class="chart-title">{{CHART_TITLE}}</div>
        <div class="chart-subtitle">{{CHART_SUBTITLE}}</div>
        <div class="risk-grid-svg">
          <!-- Inline SVG 5x5 heatmap.
               Pipeline emits:
                 - 25 <rect class="risk-cell-bg-{empty|low|med|high}">
                 - axis_titles: x="Likelihood" bottom, y="Impact" left
                 - axis_labels: 5 bands per axis (Rare..Almost certain;
                                Marginal..Severe)
                 - per-risk <text class="risk-cell-label"> inside
                   appropriate cell (cap 22 chars).
               NO numeric scores — severity conveyed via cell fill only. -->
          {{RISK_GRID_SVG}}
        </div>
        <div class="risk-legend-strip">{{LEGEND_STRIP}}</div>
      </div>

      <div class="risk-rail">
        <!-- LOOP: 3 key-risk cards (top_likelihood / top_impact / top_combined) -->
        <div class="risk-rail-card">
          <div class="name">{{RISK_NAME}}</div>
          <span class="severity-chip {{RISK_SEVERITY_CLASS}}" style="align-self: flex-start; margin-bottom: 6px;">{{RISK_SEVERITY_TAG}}</span>
          <div class="body">{{RISK_BODY_HTML}}</div>
          <div class="footer-row">
            <div class="src">[{{RISK_SOURCE_TAG}}]</div>
          </div>
        </div>
        <!-- END LOOP -->
      </div>
    </div>

    <div class="risk-source-strip">{{SOURCE_STRIP}}</div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: risk_matrix -->


<!-- ============================================================
     TEMPLATE: channel_waterfall  (distribution_analysis)
     Horizontal stacked-bar showing 4-7 channel link margins
     from brand ex-factory to consumer shelf. Bottom: 2-col
     commentary (structural takeaway + anomalies list).
     ============================================================ -->
<!-- TEMPLATE_START: channel_waterfall -->
<div class="page channel-waterfall-page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">{{SECTION_TAG}}</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">{{PAGE_H1}}</h1>
    <p class="page-subhead">{{SUBHEAD_HTML}}</p>

    <div class="waterfall-chart">
      <div class="chart-title">{{CHART_TITLE}}</div>
      <div class="chart-subtitle">{{CHART_SUBTITLE}}</div>
      <div class="waterfall-svg-wrap">
        <!-- Inline SVG horizontal stacked bar (sum = 100%).
             Pipeline emits per segment:
               - <rect class="wf-segment-fill-N"> sized by margin %
               - <text class="wf-segment-label"> for layer name above bar
               - <text class="wf-segment-pct"> margin % inside / above bar
               - <text class="wf-segment-note"> take_note below bar
               - <text class="wf-segment-src"> source tag chip
             Largest margin segment gets emphasis stroke (stroke-width 2). -->
        {{WATERFALL_SVG}}
      </div>
    </div>

    <div class="waterfall-commentary">
      <div>
        <h3>{{TAKEAWAY_HEADING}}</h3>
        <p>{{TAKEAWAY_BODY_HTML}}</p>
      </div>
      <div>
        <h3>{{ANOMALIES_HEADING}}</h3>
        <ul>
          <!-- LOOP: 2-3 anomalies (compression / fat layer / disintermediation) -->
          <li>{{ANOMALY_HTML}}</li>
          <!-- END LOOP -->
        </ul>
      </div>
    </div>

    <div class="waterfall-source-strip">{{SOURCE_STRIP}}</div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: channel_waterfall -->


<!-- ============================================================
     TEMPLATE: price_quality_matrix  (pricing_strategy)
     2x2 perceptual scatter (perceived quality y x price x).
     4 category-specific quadrant labels. 6-12 brand dots.
     Right-rail narrative interprets contested quadrant + gap.
     ============================================================ -->
<!-- TEMPLATE_START: price_quality_matrix -->
<div class="page price-quality-page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">{{SECTION_TAG}}</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">{{PAGE_H1}}</h1>
    <p class="page-subhead">{{SUBHEAD_HTML}}</p>

    <div class="pq-matrix-wrap">
      <div class="pq-matrix-chart">
        <div class="chart-title">{{CHART_TITLE}}</div>
        <div class="chart-subtitle">{{CHART_SUBTITLE}}</div>
        <div class="pq-svg-wrap">
          <!-- Inline SVG 2x2 perceptual matrix.
               Pipeline emits:
                 - 4 <rect class="pq-quadrant-bg"> background quadrants
                 - 1 horizontal + 1 vertical axis line at midpoints
                 - <text class="pq-axis-label"> x-axis bottom: {{X_AXIS_LABEL}}
                 - <text class="pq-axis-label"> y-axis left: {{Y_AXIS_LABEL}}
                 - 4 <text class="pq-quadrant-label"> in each quadrant
                   (positions: NE / NW / SE / SW)
                 - 6-12 <circle class="pq-dot"> brand points
                   (radius scales with optional share dot-size encoding)
                 - <text class="pq-dot-label"> next to each dot -->
          {{PQ_MATRIX_SVG}}
        </div>
      </div>

      <div class="pq-sidebar">
        <h3>{{SIDEBAR_HEADING}}</h3>
        <p>{{SIDEBAR_BODY_HTML}}</p>
        <div class="pq-source-strip">{{SOURCE_STRIP}}</div>
      </div>
    </div>

    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
<!-- TEMPLATE_END: price_quality_matrix -->


<!-- ============================================================
     END OF TEMPLATES — 15 page types defined (10 original + 5 Phase H).
     Pipeline reads this file, extracts by markers, fills placeholders.
     ============================================================ -->
`;

export const EMBEDDED_FILES = {
  'master_styles.css':    EMBEDDED_MASTER_STYLES_CSS,
  'master_wrapper.html':  EMBEDDED_MASTER_WRAPPER_HTML,
  'page_components.html': EMBEDDED_PAGE_COMPONENTS_HTML
};
