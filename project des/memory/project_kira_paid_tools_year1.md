---
name: project-kira-paid-tools-year1
description: kira-research Year 1 is lean-budget — owner declines paid product upgrades unless revenue justifies
metadata: 
  node_type: memory
  type: project
  originSessionId: 410f69cb-ce7f-4d63-9185-96f74b3a4f41
---

Year 1 stack is deliberately all-free-tier: Vercel free, Supabase free, Resend free (3K/mo), GitHub Actions free (public repo). Henry declines paid SaaS upgrades until there's revenue signal.

Confirmed decisions:
- **Vercel Speed Insights** — declined 2026-05-21 (paid product). Script injection removed from `nav.js`. Vercel Web Analytics (free) is enabled.

**Why:** Year 1 = $0 fixed cost target so $39/report pricing has room to absorb PayPal fees + content production. Premium observability tools come after first revenue cohort.

**How to apply:** Before suggesting any paid Vercel/Supabase/3rd-party feature, default to "skip Year 1 unless owner pushes back." If a feature is genuinely blocking (e.g. RLS without service-role workaround), flag it as a hard cost — don't sneak it in. Free-tier limits are not a blocker until traffic actually hits them.
