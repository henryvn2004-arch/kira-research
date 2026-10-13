// Planned contents of a topic (topics.signals.planned), shared by api/topic.js and api/_lib/soon.js.
// signals.planned is plain data written by a script, but the page renders it, so it is re-checked
// and cut to size here: anything that is not the expected shape reads as "no planned contents".
export function plannedOf(signals) {
  const ch = signals && signals.planned && signals.planned.chapters;
  if (!Array.isArray(ch) || ch.length < 4 || ch.length > 6) return null;
  const out = [];
  for (const c of ch) {
    if (!c || typeof c.title !== 'string' || !Array.isArray(c.pages) || !c.pages.length) return null;
    out.push({ title: c.title.slice(0, 80), pages: c.pages.filter(p => typeof p === 'string').slice(0, 4).map(p => p.slice(0, 110)) });
  }
  return out;
}
