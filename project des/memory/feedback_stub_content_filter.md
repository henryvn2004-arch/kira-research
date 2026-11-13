---
name: stub-content-filter
description: "Public list + detail APIs must filter out rows whose body/full_content is NULL or empty. Seed data + admin-mode publish flows leak stubs to public surface where they render the 'Full article body is being written…' fallback that looks broken to buyers."
metadata:
  node_type: memory
  type: feedback
---

## What surfaced this

Henry clicked into `/en/insights/singapore-family-office-slowdown` (2026-05-27) and saw:

> Full article body is being written. The excerpt above summarises the key idea.

Six insights had this state. All `field-note` or `methodology` category, all seeded by migration 003 with title + excerpt but `body=NULL`. They had been sitting public for ~2 months because nobody clicked through them after seed.

## Root cause

Two-layer mismatch:

1. **Seed pattern:** migration 003 included title + excerpt to give the insights list page some material to render on a fresh deploy. `body` was supposed to be filled in later via admin. It wasn't.
2. **API didn't defend:** `/api/insights-list` joined `insights` ↔ `insight_translations` on `status=eq.published` for both — but a translation with status=published and `body=NULL` still satisfied the join. The list returned the stub. Clicking it hit `/api/insight` which returned the stub. The frontend's "no body" fallback message kicked in.

## Fix shipped 2026-05-27 (`3ac7f40`)

Two defenses, layered:

### A. List endpoint filters body IS NOT NULL

```js
// api/insights-list.js
const tQs =
  `insight_id=in.${idList}` +
  `&status=eq.published` +
  `&body=not.is.null` +        // ← new
  `&locale=in.(${locale},en)` +
  `&select=insight_id,locale,title,excerpt,read_time,body`;
const { rows } = await sb(`insight_translations?${tQs}`);
translations = rows.filter(r => r.body && r.body.length > 0);  // empty-string defense
```

After the byId map, drop items without a matching translation:

```js
const items = insights
  .map(i => {
    const t = byId.get(i.id) || null;
    if (!t) return null;
    return { …, hasTranslation: true };
  })
  .filter(Boolean);

res.status(200).json({ items, total: items.length, … });  // total reflects post-filter
```

### B. Detail endpoint returns 404 on body-empty

```js
// api/insight.js — after translation resolved
if (!translation.body || !translation.body.trim()) {
  res.status(404).json({ error: 'body_empty' });
  return;
}
```

Direct-URL access to a stub now 404s instead of rendering the fallback.

## Apply the same pattern when…

- Adding a new content type with title/excerpt/body split. Always check `body IS NOT NULL` at the public-API boundary.
- Seeding migration data — never seed stubs as `status='published'`. If seed needs them visible at fresh-deploy time, gate on a feature flag, not on publish status.
- Building admin publish flow — `UPDATE` should reject `status='published'` when `body IS NULL` (could enforce via CHECK constraint, but app-layer check is fine for now).

## What wasn't tried (deferred)

- A `CHECK (status <> 'published' OR (body IS NOT NULL AND length(body) > 0))` constraint on `insight_translations` and `report_translations`. Would stop the bug at write-time instead of at the API. Defer until next migration window.
- Visible "Coming soon" treatment for stubs on the list page (instead of hiding entirely). Considered, rejected: a buyer scanning a paid catalog doesn't want to see "Coming soon" tiles; better to keep the list tight to what's actually purchasable.

## See also

- [[feedback_no_fake_counts_on_landing]] — sibling hygiene about not exposing made-up data to public surface
- [[project_q_insight_runner]] — the cron that generates insights with full bodies (no stub risk)
- [[feedback_check_project_des_before_destructive_db]] — same family of "data state ≠ what schema says"
