---
name: Kira Chain (S10) — state at handoff 2026-10-11
description: What is built, what is live in the DB, what is left, and that the owner wants to change direction
type: project
---

Owner said 2026-10-11: "cần chuyển hướng phần Kira Chain". Do not continue the old to-do list below without asking where the new direction goes.

**Built and merged to main (PRs #73, #80, #82, #85, #88, #90):**
- Search page `/en/chain/`, chain page `/en/chain/<country>/<slug>` (rewrite to `_view.html`), noindex, not in nav or sitemap. APIs: `chain-search.js`, `chain.js`, `chain-request.js`. Tables `chains`, `chain_requests` (migration 037).
- One network view with Kira Data / Market Estimate toggle. No company-to-company links; flow arrows between stages only, analyst-defined. Websites preferred over tax ID.
- Hand-made chain: VN coffee (`public/chain-data/vn-coffee.json`, 95 companies).
- Auto builder `skills/kira-research-report/scripts/build-chain.mjs` (runner step 5.3b-5): needs >=8 players in >=3 stages from `industry_players`, writes draft with `stats.auto=true`, straight-line arrows, verification status `reported`; never overwrites non-auto rows. Live: VN `convenience-store-licensing` (23 companies, 5 stages, published).
- Admin `/en/admin/chains` (`api/admin-chains.js`): take down / publish, shows unmatched searches.

**Not built:** email sender for `chain_requests` (copy `notify-topic-published`, use `notified_at`); plan gating (Annual plan sees company lists); analyst review of arrows and stage estimates for auto chains.

**Not verified:** post-deploy smoke on main and the live pages after the last merge.

**Gotchas:** push the owner's email on commits (Vercel blocks other authors); CodeQL flags file data in outbound requests, so validate inputs before building REST URLs; never merge a PR unless the owner says so.
