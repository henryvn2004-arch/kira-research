# KIRA RESEARCH — Site Architecture

> Detailed technical reference for all pages, APIs, database tables, auth, and payment flow.
> Companion to `claude.md` (strategy) and `workplan.md` (build sequence).

---

## 1. Customer-Facing Pages

All pages support trilingual subpath routing: `/en/...`, `/ja/...`, `/ko/...`. Root `/` auto-detects via Accept-Language header.

| Page | URL | Purpose | Status |
|---|---|---|---|
| Landing | `/[locale]/` | Hero + featured reports + industries + methodology | 🆕 build (mockup ready) |
| Library | `/[locale]/library` | Browse + filter + search reports | 🆕 build (mockup ready) |
| Individual report | `/[locale]/reports/[slug]` | Preview + buy box | 🆕 build (mockup ready) |
| Insights blog list | `/[locale]/insights` | SEO articles list | 🆕 Phase 7 |
| Insights article | `/[locale]/insights/[slug]` | Article + CTA to related report | 🆕 Phase 7 |
| About | `/[locale]/about` | Research firm narrative, team | 🆕 Phase 2 |
| Methodology | `/[locale]/methodology` | Detailed process + transparency | 🆕 Phase 2 |
| Pricing | `/[locale]/pricing` | Per-report + bundles + Custom tier | 🆕 Phase 2 |
| Custom Research landing | `/[locale]/custom-research` | Service overview + lead capture | 🆕 Phase 5 |
| Custom: Market Analysis | `/[locale]/custom-research/market-analysis` | Demoted tool (was `/report.html`) | ♻️ move |
| Custom: Strategy Builder | `/[locale]/custom-research/strategy-builder` | Demoted tool | ♻️ move |
| Contact | `/[locale]/contact` | Form + email | ✅ keep |
| Auth | `/login`, `/signup` | Supabase Auth UI (locale-aware) | ✅ keep |
| Profile | `/[locale]/profile` | Purchased reports + downloads | ✅ keep, simplify |
| Payment success | `/[locale]/payment-success` | PayPal return handler | ✅ keep, adjust routing |
| 404 | `/[locale]/404` | Branded 404 | 🆕 build |
| Legal | `/[locale]/terms`, `/privacy`, `/refund-policy` | Required boilerplate | 🆕 build |

---

## 2. Admin / Back-Office Pages

All mounted at `/admin/*` with auth guard (email whitelist via `ADMIN_EMAILS` env var). Admin pages are English-only.

### Dashboard
| Page | URL | Purpose |
|---|---|---|
| Admin home | `/admin` | KPI overview: today sales, week revenue, refund rate, top reports, recent transactions, pending leads, locale breakdown |

### Reports Management
| Page | URL | Purpose |
|---|---|---|
| Reports list | `/admin/reports` | Table all reports với filter (status, country, industry, locale availability), search, sort by sales |
| New report | `/admin/reports/new` | Form: upload PDF + metadata (title, slug, country, industry, year, price, preview content, TOC, sections, charts) — saves as EN draft |
| Edit report | `/admin/reports/[id]/edit` | Tabs: EN / JA / KO. Status indicator per locale (draft/translated/reviewed/published) |
| Translation workflow | `/admin/reports/[id]/translate` | Paste source + generate target side-by-side, save per locale |
| Report performance | `/admin/reports/[id]/stats` | Sales count, revenue, traffic per locale, refund count, conversion rate |
| Bulk import | `/admin/reports/import` | CSV upload cho metadata batch (PDFs uploaded individually) |
| Featured reports | `/admin/reports/featured` | Drag-drop reorder featured 3-6 reports on homepage per locale |

### User Management
| Page | URL | Purpose |
|---|---|---|
| Users list | `/admin/users` | Table all users với filter (signup date, total spent, preferred locale, country) + search |
| User detail | `/admin/users/[id]` | Full info: purchases, downloads, credits, support history |
| User actions | (inline) | Suspend, refund, gift report, send password reset |

### Transaction Management
| Page | URL | Purpose |
|---|---|---|
| Transactions list | `/admin/transactions` | Table all transactions, filter by status (paid/pending/refunded/failed), date range, locale, search by PayPal ID |
| Transaction detail | `/admin/transactions/[id]` | Full info + manual refund action + PayPal raw response |
| Revenue dashboard | `/admin/revenue` | Charts: daily/weekly/monthly revenue, by report, by country, by locale, by channel (own site vs aggregator) |
| Refunds | `/admin/refunds` | List refunds, reasons, refund rate tracking |
| Export | (action) | Download CSV monthly for accounting |

### Content Management
| Page | URL | Purpose |
|---|---|---|
| Insights list | `/admin/insights` | Manage blog articles per locale |
| New insight | `/admin/insights/new` | Article editor với locale tabs |
| Edit insight | `/admin/insights/[id]/edit` | Same với translation status per locale |
| Auto-gen queue | `/admin/insights/cron-status` | Cron status, recent auto-generated articles, manual trigger |
| Site copy editor | `/admin/copy` | Edit hero, about, methodology text per locale without code deploy |

### Custom Research Leads
| Page | URL | Purpose |
|---|---|---|
| Leads list | `/admin/leads` | "Talk to our team" submissions với status (new, contacted, won, lost) |
| Lead detail | `/admin/leads/[id]` | Full inquiry + notes + status + estimated value |

### Aggregator Tracking
| Page | URL | Purpose |
|---|---|---|
| Submissions | `/admin/aggregators` | Table: which report+locale submitted to which platform, status (draft, submitted, approved, listed, sold) |
| Add submission | `/admin/aggregators/new` | Form: select report + locale + platform + upload date + listing URL + listing price |
| Commission tracker | `/admin/aggregators/revenue` | Track sales per channel (manual entry hoặc periodic reconciliation) |

### Settings
| Page | URL | Purpose |
|---|---|---|
| Site settings | `/admin/settings/site` | Pricing tiers default, currency, contact email |
| PayPal config | `/admin/settings/paypal` | Sandbox vs production toggle, client ID display |
| Email templates | `/admin/settings/emails` | Purchase receipt, refund confirmation, welcome — per locale |
| Locale config | `/admin/settings/locales` | Enable/disable locales, set default, manage UI translations JSON |
| Team | `/admin/settings/team` | Add other admin emails (future) |
| Audit log | `/admin/settings/audit-log` | Admin action history |

---

## 3. API Endpoints (Vercel Serverless Functions)

Vercel has 12-function limit on Hobby; Pro has 100. With careful route packing, fewer functions needed. Use catch-all routes like `/api/admin/[...path].js` to pack admin endpoints.

### Public APIs
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/*` | POST | Supabase Auth proxy (signup, login, refresh, logout) |
| `/api/reports/list?locale=en` | GET | Fetch library với filter params + locale |
| `/api/reports/[slug]?locale=en` | GET | Single report preview content |
| `/api/reports/[slug]/download` | GET | Authenticated + paid — download full PDF (locale matched) |
| `/api/insights/list?locale=en` | GET | Blog list per locale |
| `/api/insights/[slug]?locale=en` | GET | Single article per locale |
| `/api/leads/submit` | POST | Public — Custom Research form submission |
| `/api/sitemap-[locale].xml` | GET | Dynamic sitemap per locale |
| `/api/sitemap.xml` | GET | Index sitemap pointing to per-locale sitemaps |
| `/api/rss-[locale].xml` | GET | RSS feed for insights per locale |

### Payment APIs
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/payment/create` | POST | Create PayPal order |
| `/api/payment/capture` | POST | Capture PayPal order on return |
| `/api/payment/webhook` | POST | PayPal IPN webhook (delayed status updates) |
| `/api/payment/refund` | POST | Admin-only — trigger refund |

### Admin APIs (auth guarded)
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/reports/[...]` | GET/POST/PUT/DELETE | CRUD on reports |
| `/api/admin/translations/[...]` | GET/POST/PUT | Manage `report_translations` rows |
| `/api/admin/users/[...]` | GET/POST | User management |
| `/api/admin/transactions/[...]` | GET | Transaction views |
| `/api/admin/leads/[...]` | GET/PUT | Lead management |
| `/api/admin/aggregators/[...]` | GET/POST/PUT | Submission tracking |
| `/api/admin/insights/[...]` | GET/POST/PUT/DELETE | Blog management |
| `/api/admin/copy` | GET/PUT | Site copy editor |
| `/api/admin/upload-pdf` | POST | Upload PDF to Supabase Storage |
| `/api/admin/upload-image` | POST | Upload images (chart screenshots, OG images) |

### Cron Jobs
| Endpoint | Trigger | Purpose |
|---|---|---|
| `/api/cron/insights` | Daily 3AM via pg_cron | Generate SEO articles per locale |
| `/api/cron/refresh-reports` | Weekly via pg_cron | Flag stale reports for refresh |
| `/api/cron/sitemap-rebuild` | Daily | Regenerate sitemaps if needed |

---

## 4. Database Schema (Supabase)

### Active Tables

```sql
-- Built-in
auth.users  -- Supabase Auth

-- Extended user
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  company TEXT,
  country TEXT,
  preferred_locale TEXT DEFAULT 'en',  -- 'en' | 'ja' | 'ko'
  role TEXT DEFAULT 'user',  -- 'user' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main library
CREATE TABLE living_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,  -- canonical slug, same across locales
  country TEXT NOT NULL,
  industry TEXT NOT NULL,
  sub_industry TEXT,
  year INTEGER NOT NULL,
  price DECIMAL(10,2) DEFAULT 39.00,
  status TEXT DEFAULT 'active',  -- 'active' | 'draft' | 'archived'
  featured BOOLEAN DEFAULT FALSE,
  featured_order INTEGER,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-locale translations
CREATE TABLE report_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES living_reports(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,  -- 'en' | 'ja' | 'ko'
  title TEXT NOT NULL,
  subtitle TEXT,
  preview_content JSONB,  -- exec summary + sample chart data
  full_content JSONB,  -- all sections, charts, tables
  toc JSONB,  -- table of contents structure
  meta_description TEXT,
  meta_keywords TEXT[],
  status TEXT DEFAULT 'draft',  -- 'draft' | 'translated' | 'reviewed' | 'published'
  reviewer_email TEXT,
  reviewer_notes TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, locale)
);

-- PDF files per locale
CREATE TABLE report_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES living_reports(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  file_type TEXT NOT NULL,  -- 'pdf' | 'preview_pdf' | 'cover_image'
  storage_path TEXT NOT NULL,  -- Supabase Storage bucket path
  file_size INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, locale, file_type)
);

-- Purchases
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  report_id UUID REFERENCES living_reports(id),
  locale TEXT NOT NULL,  -- which language version purchased
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  paypal_order_id TEXT UNIQUE,
  paypal_capture_id TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'completed' | 'refunded' | 'failed'
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  ip_address TEXT,  -- for fraud + locale detection
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Downloads tracking
CREATE TABLE downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES purchases(id),
  file_id UUID REFERENCES report_files(id),
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  related_report_id UUID REFERENCES living_reports(id),  -- nullable, drives CTAs
  category TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE insight_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID REFERENCES insights(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  meta_description TEXT,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  UNIQUE(insight_id, locale)
);

-- Custom Research leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  country TEXT,
  locale TEXT,  -- which site language they submitted from
  message TEXT NOT NULL,
  budget_range TEXT,
  status TEXT DEFAULT 'new',  -- 'new' | 'contacted' | 'qualified' | 'won' | 'lost'
  value_estimate DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregator submissions
CREATE TABLE aggregator_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES living_reports(id),
  locale TEXT NOT NULL,
  platform TEXT NOT NULL,  -- 'researchandmarkets' | 'marketresearch' | 'giiresearch' | etc.
  status TEXT DEFAULT 'draft',  -- 'draft' | 'submitted' | 'approved' | 'listed' | 'rejected'
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  listing_url TEXT,
  listing_price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, locale, platform)
);

-- Aggregator sales (manual entry)
CREATE TABLE aggregator_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES aggregator_submissions(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  units_sold INTEGER NOT NULL,
  gross_revenue DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2),  -- e.g. 35.00 for 35%
  net_revenue DECIMAL(10,2) NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,  -- 'create_report' | 'refund_purchase' | etc.
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes
```sql
CREATE INDEX idx_living_reports_slug ON living_reports(slug);
CREATE INDEX idx_living_reports_filter ON living_reports(country, industry, year, status);
CREATE INDEX idx_report_translations_lookup ON report_translations(report_id, locale, status);
CREATE INDEX idx_report_translations_published ON report_translations(locale, status) WHERE status = 'published';
CREATE INDEX idx_purchases_user ON purchases(user_id, status);
CREATE INDEX idx_purchases_report ON purchases(report_id, status);
CREATE INDEX idx_insights_slug ON insights(slug);
CREATE INDEX idx_insight_translations_lookup ON insight_translations(insight_id, locale, status);
CREATE INDEX idx_aggregator_submissions_report ON aggregator_submissions(report_id, locale, platform);
```

### Custom Research backend (existing, keep separate)
```sql
-- Keep these for /custom-research/* tools
user_credits, credit_transactions, credit_costs, custom_reports
```

### Deprecated (archive, not actively used)
```sql
-- Keep for archive only, not queried by new code
competency_templates, industry_patterns, report_chunks, source_reports
```

---

## 5. Authentication & Access Control

### Customer-facing
- Supabase Auth (email/password + Google OAuth)
- Anyone browses library + previews
- Auth required for: purchasing, downloads, profile

### Admin-facing
- Same Supabase Auth + email whitelist check
- Env var: `ADMIN_EMAILS=henry@kiraresearch.com,partner@kiraresearch.com`
- Middleware `/api/admin/*`: check `req.user.email in ADMIN_EMAILS`
- All `/admin/*` pages: client-side guard redirects non-admins
- Service role key: server-side only, NEVER exposed to client
- Audit log records all admin actions

### Future (Year 2)
- Multi-admin role system with permissions (super admin / editor / viewer)
- 2FA for admin
- Session timeout

---

## 6. Payment Flow (PayPal)

```
[User on /[locale]/reports/[slug]]
   │
   ▼ Click "Purchase Report" ($39)
   │
[Auth check — redirect to /login if needed]
   │
   ▼
[POST /api/payment/create]
   │ Body: { report_id, locale }
   │ → Create PayPal order ($39 USD)
   │ → Insert pending row in `purchases` table
   │ → Return PayPal approval URL
   │
   ▼
[Browser redirects to PayPal checkout]
   │ User logs in to PayPal + approves
   │
   ▼
[PayPal redirects to /[locale]/payment-success?token=ORDER_ID]
   │
   ▼
[POST /api/payment/capture]
   │ Body: { order_id }
   │ → Call PayPal capture endpoint
   │ → Update `purchases` row → status='completed', capture_id
   │ → Send receipt email (manual or transactional service)
   │ → Trigger download link generation
   │
   ▼
[Redirect to /[locale]/reports/[slug]?unlocked=1]
   │ User can now download PDF + view full online content
```

**PayPal webhook (`/api/payment/webhook`):**
- Listens for: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.DENIED`
- Updates `purchases` status accordingly
- Recommended Year 1, required Year 2 (for accurate refund/dispute tracking)

**Refund flow:**
1. Admin opens `/admin/transactions/[id]`
2. Clicks "Issue Refund"
3. `/api/payment/refund` calls PayPal refund endpoint
4. Updates `purchases` row → status='refunded', refunded_at, refund_reason
5. User loses access to download

---

## 7. i18n Implementation

### File structure
```
/locales/
  en.json     -- English UI strings
  ja.json     -- Japanese UI strings
  ko.json     -- Korean UI strings
```

### JSON structure example (en.json)
```json
{
  "nav": {
    "library": "Library",
    "insights": "Insights",
    "about": "About",
    "methodology": "Methodology",
    "pricing": "Pricing",
    "customResearch": "Custom Research"
  },
  "hero": {
    "eyebrow": "SOUTHEAST ASIA · MARKET INTELLIGENCE",
    "title": "Deep research for the markets we live in.",
    "subtitle": "KIRA Research is a specialized research firm covering Southeast Asia...",
    "ctaPrimary": "Browse Library",
    "ctaSecondary": "Commission Research"
  },
  "library": { ... },
  "report": { ... },
  ...
}
```

### Loader script (client-side, lightweight)
```javascript
// /public/i18n.js
const locale = window.location.pathname.split('/')[1] || 'en';
fetch(`/locales/${locale}.json`)
  .then(r => r.json())
  .then(translations => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const value = key.split('.').reduce((o, k) => o?.[k], translations);
      if (value) el.textContent = value;
    });
  });
```

### Locale switcher (top-right of nav)
```html
<div class="locale-switcher">
  <a href="/en/library">EN</a>
  <a href="/ja/library">日本語</a>
  <a href="/ko/library">한국어</a>
</div>
```

### SEO multi-locale tags (every page)
```html
<link rel="alternate" hreflang="en" href="https://kiraresearch.com/en/reports/[slug]" />
<link rel="alternate" hreflang="ja" href="https://kiraresearch.com/ja/reports/[slug]" />
<link rel="alternate" hreflang="ko" href="https://kiraresearch.com/ko/reports/[slug]" />
<link rel="alternate" hreflang="x-default" href="https://kiraresearch.com/en/reports/[slug]" />
```

---

## 8. File Storage (Supabase Storage)

### Buckets
| Bucket | Access | Purpose |
|---|---|---|
| `reports-pdfs` | Private (signed URLs) | Full PDF downloads, authenticated only |
| `reports-previews` | Public | Preview PDF + cover images for marketing |
| `reports-charts` | Public | Chart images embedded in pages |
| `frameworks` | Private | Existing framework library (legacy) |

### Path conventions
```
reports-pdfs/[report_id]/[locale]/full.pdf
reports-pdfs/[report_id]/[locale]/preview.pdf
reports-previews/[report_id]/cover.jpg
reports-charts/[report_id]/[chart_id].svg
```

### Download flow
1. User clicks "Download PDF" on report page
2. Backend verifies user has paid purchase for that report+locale
3. Backend generates signed URL with 1-hour expiry
4. Browser downloads via signed URL
5. Insert row in `downloads` table for tracking

---

## 9. Vercel Configuration

### `vercel.json` (rewrites for locale routing)
```json
{
  "rewrites": [
    { "source": "/", "destination": "/locale-redirect" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

### Environment variables (Vercel dashboard)
```
# Supabase
SUPABASE_URL=https://iygoynbnscednfzdsflc.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# AI APIs
ANTHROPIC_API_KEY=...
PERPLEXITY_API_KEY=...
OPENAI_API_KEY=...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...

# App
APP_URL=https://kiraresearch.com
ADMIN_EMAILS=henry@kiraresearch.com
CRON_SECRET=...

# Feature flags
PAYWALL_DISABLED=false
DEFAULT_LOCALE=en
ENABLED_LOCALES=en,ja,ko
```

---

## 10. Build Order Summary

1. Phase 1 — Lock report template (no code)
2. Phase 2 — Brand copy + i18n infrastructure
3. Phase 3 + 4 (parallel) — Library + Admin
4. Phase 5 — Tool demotion + Studio kill
5. Phase 6 — Report population (EN first)
6. Phase 7 — SEO/Insights engine (EN)
7. Phase 8 — JA layer
8. Phase 9 — KO layer
9. Phase 10 — Polish & launch

See `workplan.md` for sprint-level detail.

---

*Last updated: 2026-05-20*
