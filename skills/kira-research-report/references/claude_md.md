# KIRA RESEARCH — Project Context

> Live tại **kiraresearch.com** · Stack: Vercel · Supabase · Claude · Perplexity · PayPal
> 3 locales: English (default), Japanese, Korean

---

## Brand & Positioning

**KIRA RESEARCH** là một **research house** chuyên về Southeast Asia — đội ngũ senior analysts với consulting background, hai thập kỷ kinh nghiệm research khu vực, sử dụng modern tools (bao gồm AI, light touch) để deliver intelligence nhanh hơn và rẻ hơn traditional firms.

**Target buyers:**
- Japanese MNCs expanding vào SEA (highest budget tier)
- Korean conglomerates với SEA operations
- US/EU corporate strategy teams covering SEA
- Singapore-based HQs of regional businesses
- PE/VC funds với SEA portfolio

### Anti-positioning (KHÔNG bao giờ làm)
- ❌ KHÔNG positioning là "AI-powered platform / SaaS / app"
- ❌ KHÔNG claim volume ("1000+ studies", "thousands of reports") — incumbents có 10,000+, mình thua
- ❌ KHÔNG lead với "AI" trong copy marketing — chỉ mention ở Methodology page
- ❌ KHÔNG dùng tên competitors (Mordor, Frost, Euromonitor) trong copy

### Positioning angles (LEAN VÀO)
- ✅ **SEA specialization** — không cover global generic, focus deep regional
- ✅ **Senior analysts** — consulting-grade methodology, không phải data scrapers
- ✅ **Two decades regional experience** — boots-on-the-ground research history
- ✅ **Modern delivery** — accessible pricing ($39 standard) vs $4K incumbent, faster refresh
- ✅ **Methodology rigor** — primary sources + AI augmentation + human curation
- ✅ **Multi-locale** — EN/JA/KO native, serve Japanese + Korean enterprise buyers properly

### Brand voice
- Confident, understated, analytical (Palantir / Apple / consulting tone)
- Numbers minimal, precision maximum
- "Our analysts", "our research team", "we" — never "our platform"

---

## Product Model

**KIRA = storefront + brand + sales channel** cho:

### Tier 1: Research Library (main product)
- Pre-generated market intelligence reports about SEA markets
- **$39 per report flat** across all locales Year 1 (simplify; revisit per-locale pricing Year 2)
- Multi-channel distribution:
  - KIRA own website (full margin) — 3 locale versions
  - **EN aggregators:** ResearchAndMarkets.com, MarketResearch.com, ASDReports
  - **JA aggregators:** GIIResearch (priority — Tokyo-based, biggest JA channel), Yano Research
  - **KO aggregators:** Mordor Korea, dataintelo, custom B2B channels
  - Commission: aggregators take ~30-50%, list giá 2-3x markup ($99-149 retail on aggregator)

### Tier 2: Custom Research (upsell)
- On-demand reports via internal AI tools at `/custom-research/*`
- $499-1999 per project, lead capture via "Talk to our team"
- Tools demoted: Market Analysis (was `/report.html`), Strategy Builder (was `/strategy-builder.html`)
- Doc Intelligence (was `/docreport.html`) removed/merged

### Tier 3: Insights (free, SEO)
- Auto-generated blog articles per locale
- Teaser/preview cho library reports → drive conversion

---

## Multi-Locale Strategy

### Locales supported
- **EN** (English, default) — global default + US/EU/SG audience
- **JA** (Japanese) — Japanese MNCs (highest value segment)
- **KO** (Korean) — Korean conglomerates

### URL structure
- Subpath approach: `/en/...`, `/ja/...`, `/ko/...`
- Root `/` auto-detects via `Accept-Language` header
- Cookie persists manual locale selection
- All locales share single `kiraresearch.com` domain (no subdomain split)

### Phased rollout
- **Phase 1-3 (Week 1-5):** Build EN only, architecture i18n-ready
- **Phase 5.5 (Week 8-10):** Add JA layer + first 10 JA reports + GIIResearch submission
- **Phase 6.5 (Week 10-12):** Add KO layer same pattern

### Translation production
1. Henry generates EN report via Claude chat (Max sub)
2. Henry pastes EN into new Claude chat → translate to JA + KO
3. Henry curates + sends to native reviewer for QA ($50-100/report Year 1 via Upwork, then random sample later)
4. Upload all 3 versions to admin → publish per locale independently

### Pricing per locale
- Year 1: **Flat $39 all locales** (simplify, validate market response)
- Year 2: Consider $59-99 for JA tier (higher willingness to pay)
- Billing in USD via PayPal Year 1, multi-currency Year 2

### Brand & typography per locale
| Element | EN | JA | KO |
|---|---|---|---|
| Headings | Satoshi Black/Bold | Noto Sans JP Bold | Noto Sans KR Bold |
| Body | Satoshi Regular | Noto Sans JP Regular | Noto Sans KR Regular |
| Mono (data) | JetBrains Mono | JetBrains Mono | JetBrains Mono |
| Logo | KIRA RESEARCH (Latin script — keep globally) | Same | Same |
| Date | "May 2026" | "2026年5月" | "2026년 5월" |

### SEO multi-locale
- hreflang tags on every page (EN/JA/KO + x-default)
- 3 separate sitemaps: `/sitemap-en.xml`, `/sitemap-ja.xml`, `/sitemap-ko.xml` + index
- 3 separate Google Search Console properties

---

## Production Workflow

**Reports produced bằng Claude chat (Henry's Max subscription), KHÔNG phải qua KIRA in-platform tools.**

Workflow cho mỗi report:
1. Henry chọn 1 old report từ archive (the 1000 reports collection)
2. Henry upload vào Claude chat → Claude updates: refresh data, add 2026 AI impact section, keep structural insights
3. Henry curate: review, edit, lock final English version
4. Translate to JA + KO via Claude chat (separate sessions)
5. Native reviewer QA (first 10-20 reports per locale)
6. Export PDF (3 versions) → upload vào `report_translations` table + submit to aggregators per locale

**Generation rules:**
- KEEP: structural insights (channels, consumer patterns, value chain — stable theo decade)
- UPDATE qua Perplexity/Claude web search: market size, players, channels, regulatory
- REMOVE: outdated brand-specific numbers không relevant
- ADD: AI impact section (specific use cases industry đó), 2026 outlook

---

## Technical Stack

- **Hosting:** Vercel Pro + GitHub web UI
- **Database:** Supabase (`iygoynbnscednfzdsflc.supabase.co`) — pgvector, RPC, Storage
- **AI generation:** Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- **Embeddings:** OpenAI `text-embedding-3-large` (1536 dims) — for Custom Research only
- **Web research:** Perplexity `sonar-pro`
- **Payments:** PayPal (USD billing Year 1)
- **PDF storage:** Supabase Storage bucket
- **Domain:** `kiraresearch.com` (single domain, no subdomain)
- **Auth:** Supabase Auth (email/password + Google OAuth)
- **Admin auth:** Email whitelist via env var `ADMIN_EMAILS`
- **i18n:** Custom lightweight JSON-based system (no heavy framework)
- **Email:** Manual transactional Year 1 (Resend/SendGrid Year 2)

---

## Key Decisions Log

| Decision | Rationale | Date |
|---|---|---|
| Pivot from "AI platform" to "research house" | Founder dogfood test failed; AI wrapper not defensible vs Claude chat | 2026-05 |
| Library-first IA, demote generation tools to /custom-research | Multi-channel passive sale model > on-demand generation race vs LLMs | 2026-05 |
| Multi-channel distribution via aggregators | Henry already worked with RAM/MR previously, fastest path to revenue Year 1 | 2026-05 |
| Trilingual EN/JA/KO from Day 1 architecture | JA + KO enterprise = highest-value buyer segments for SEA research | 2026-05 |
| Flat $39 pricing Year 1, all locales | Simplify launch, optimize later from data | 2026-05 |
| Kill /studio/* products entirely | Distract from research house brand, no traction | 2026-05 |
| PayPal as sole payment Year 1 | Henry has existing infrastructure; Stripe Year 2 if needed | 2026-05 |
| Admin auth via email whitelist | Simplest; multi-admin role system Year 2 | 2026-05 |
| Manual aggregator tracking | No automation needed Year 1; API integration Year 2 if volume justifies | 2026-05 |
| Supabase Storage for PDFs | Cheap, integrated; revisit S3/R2 if scaling | 2026-05 |
| Native reviewer for JA/KO first 10-20 reports | Quality bar critical for enterprise buyers; mistakes damage brand | 2026-05 |

---

## Database Schema (updated)

### Active tables for new model
| Table | Purpose |
|---|---|
| `auth.users` | Supabase Auth (built-in) |
| `user_profiles` | Extended user info + `preferred_locale` field |
| `living_reports` | Main library table — base metadata (id, slug, country, industry, year, price) |
| **`report_translations`** | **NEW** — per-locale content (report_id, locale, title, preview, full_content, toc, status, published_at) |
| `report_files` | PDF storage references per locale |
| `purchases` | Direct PayPal purchase records (includes locale field) |
| `downloads` | Track download counts |
| `insights` + `insight_translations` | Blog articles + locale variants |
| `leads` | Custom Research inquiries (with locale) |
| `aggregator_submissions` | Track which report+locale submitted to which platform |
| `aggregator_sales` | Manual entry of sales per channel |
| `audit_log` | Admin action logs |

### Custom Research backend (keep, scoped to /custom-research/*)
- `user_credits`, `credit_transactions`, `credit_costs` — for tool gating
- `custom_reports` — on-demand generated

### Deprecated (archive, not used for library)
- `competency_templates`, `industry_patterns`, `report_chunks`, `source_reports`

---

## Site IA

```
[Logo]                              [EN | 日本語 | 한국어]
Library | Insights | About | Methodology | Pricing | Custom Research ▾
                                                      ├─ Market Analysis
                                                      ├─ Strategy Builder
                                                      └─ Talk to Our Team
```

See `site-architecture.md` for full page/API/DB structure.

### Killed entirely
- `/studio/*` — Presentation Maker, Report Writer, Data Workbook, Interactive Brief
- `/docreport.html` — merged into Custom Research or removed

---

## Strategic Context

### Why this model
- Direct competitors at high-end (Mordor, Frost, Euromonitor, IMARC): $4K-5K/report enterprise — different segment, not competing
- Real competitors at $39 entry: Claude/ChatGPT subscriptions, free content, generic templates
- Differentiation: pre-built framework specific cho SEA × industry × 2026 AI impact + analyst curation + JA/KO native versions
- Defensibility: multi-locale moat (JA/KO enterprise underserved by global English-only firms) + aggregator distribution + Henry's SEA primary research foundation

### PMF lessons learned
- Founder dogfood test (Henry himself wouldn't pay $49 for KIRA report) → original "AI report generator" model failed PMF
- Pivoted to research house storefront model: leverages 1000-report archive + Claude Max sunk cost + zero marginal cost economics
- New model: Henry's expertise + Claude (free with Max sub) + multi-channel distribution = sustainable

### Risk register
| Risk | Mitigation |
|---|---|
| Year 1 SEO traffic slow | Multi-channel: aggregators primary, SEO secondary |
| JA/KO translation quality damages brand | Native reviewer QA first 10-20 reports per locale |
| Henry burnout from production | Power law approach — only ~100 evergreen winners needed |
| AI Overviews eats top-funnel | Aggregator B2B buyer base less Google-dependent |
| Aggregators reject AI-augmented content | Henry confirmed prior relationship + "human-led, AI-augmented" framing |
| All-3-locales launch overwhelm | Phased: EN first, JA Phase 5.5, KO Phase 6.5 |

---

## Approach & Communication

- Henry communicates casual Vietnamese mixed English technical terms
- Claude mirrors register (informal Vietnamese, English for technical/system terms)
- Proactive auditing, batch fixes, honest tradeoff analysis
- All instructions as UI click-through steps, NO CLI commands

---

## Out of Scope (defer or kill)

- ❌ Subscription model — revisit after 6 months per-report data
- ❌ Custom domain for library — kiraresearch.com single domain
- ❌ Mobile app
- ❌ Newsletter / email automation system (manual transactional emails Year 1)
- ❌ B2B enterprise sales motion (let aggregators handle B2B)
- ❌ Affiliate program
- ❌ Re-ingestion của RAG library — không cần cho library reports
- ❌ `/studio/*` product line — killed entirely
- ❌ Multi-currency native billing — USD via PayPal Year 1
- ❌ Stripe payment — PayPal sole Year 1
- ❌ Per-locale pricing differentiation — flat $39 Year 1
- ❌ Auto-translation API — manual via Claude chat Year 1
- ❌ Aggregator API auto-sync — manual entry Year 1

---

*Last updated: 2026-05-20*
