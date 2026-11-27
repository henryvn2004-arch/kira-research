-- 080: email sequences and "new reports" alerts (stage 1, 2026-11-27). Idempotent; applied by hand.
--  * report_alerts        "new reports on <country> / <industry>" alert, double opt-in, weekly digest (no account)
--  * email_sequence_log   one row per nurture email sent (claim-then-send: unique(kind, ref_key) = never twice)
--  * email_optouts        one-click opt-out of the nurture emails (reminders, related reports, abandoned checkout)
--  * checkout_orders      a PayPal order started by a SIGNED-IN buyer (their email is known); guests are not recorded,
--                         we have no email before the payment is captured
--  * locale on transcript_purchases / list_purchases (language of the page they bought on, for the follow-up email)
--  * seq_a_candidates(), seq_buyers(): the reads the daily/hourly sequence job needs (service role only)

create table if not exists public.report_alerts (
  id              bigserial primary key,
  email           text not null,
  country         text not null check (country ~ '^[a-z][a-z0-9-]{1,40}$'),       -- slug: vietnam, south-korea
  industry        text check (industry is null or industry ~ '^[a-z0-9][a-z0-9-]{0,60}$'),
  locale          text not null default 'en' check (locale in ('en','ja','ko','zh')),
  token           text not null unique default encode(gen_random_bytes(18), 'hex'),
  status          text not null default 'pending' check (status in ('pending','active','unsubscribed')),
  source_path     text,
  ip_address      text,
  attribution     jsonb,
  created_at      timestamptz not null default now(),
  confirm_sent_at timestamptz,
  confirmed_at    timestamptz,
  last_digest_at  timestamptz,                 -- items published after this go in the next digest (set at confirm)
  last_sent_at    timestamptz,
  unsubscribed_at timestamptz
);
create unique index if not exists report_alerts_filter_uidx on public.report_alerts (email, country, coalesce(industry, ''));
create index if not exists report_alerts_status_idx on public.report_alerts (status);
alter table public.report_alerts enable row level security;

create table if not exists public.email_sequence_log (
  id       bigserial primary key,
  kind     text not null,                      -- A3 | A10 | D3 | ABN1 | ABN24 | DIGEST
  ref_key  text not null,                      -- topic_requests.id | purchase key | paypal order id | report_alerts.id:week
  email    text not null,
  locale   text,
  sent_at  timestamptz not null default now(),
  unique (kind, ref_key)
);
create index if not exists email_sequence_log_sent_idx on public.email_sequence_log (sent_at desc);
create index if not exists email_sequence_log_email_idx on public.email_sequence_log (kind, email);
alter table public.email_sequence_log enable row level security;

create table if not exists public.email_optouts (
  email      text primary key,                 -- lower-case
  created_at timestamptz not null default now(),
  source     text
);
alter table public.email_optouts enable row level security;

create table if not exists public.checkout_orders (
  paypal_order_id text primary key,
  created_at      timestamptz not null default now(),
  kind            text not null check (kind in ('report','transcript','list')),
  slug            text not null,
  locale          text not null default 'en',
  user_id         uuid,
  email           text not null,               -- lower-case; only signed-in buyers are recorded
  amount          numeric(10,2),
  currency        text default 'USD'
);
create index if not exists checkout_orders_created_idx on public.checkout_orders (created_at desc);
alter table public.checkout_orders enable row level security;

alter table public.transcript_purchases add column if not exists locale text;
alter table public.list_purchases       add column if not exists locale text;

-- Requests whose report was published (notified) in the last `since`, with what the sequence needs to sell it.
create or replace function public.seq_a_candidates(since timestamptz)
returns table (request_id uuid, email text, locale text, topic_title text, report_slug text, notified_at timestamptz,
               country text, industry text, price integer, pages integer, exhibits integer)
language sql stable
set search_path = public
as $$
  select r.id, r.email, r.locale, t.title, lr.slug, r.notified_at, lr.country, lr.industry, lr.price, lr.pages, lr.exhibits
  from topic_requests r
  join topics t on t.id = r.topic_id
  join living_reports lr on lr.id = t.report_id and lr.status = 'published'
  where r.notified_at is not null and r.notified_at >= since
  order by r.notified_at
  limit 2000;
$$;

-- Completed purchases (all three kinds) since `since`, with the buyer's email (auth.users) and the market of the item.
create or replace function public.seq_buyers(since timestamptz)
returns table (purchase_key text, kind text, email text, user_id uuid, slug text, locale text, captured_at timestamptz,
               country text, industry text)
language sql stable
set search_path = public
as $$
  select 'r:' || p.id, 'report'::text, lower(u.email), p.user_id, p.slug, coalesce(p.locale, 'en'), p.captured_at,
         lower(lr.country), lower(lr.industry)
  from purchases p
  join auth.users u on u.id = p.user_id
  left join living_reports lr on lr.id = p.report_id
  where p.status = 'completed' and p.captured_at >= since and u.email is not null
  union all
  select 't:' || p.id, 'transcript', lower(u.email), p.user_id, p.slug, coalesce(p.locale, 'en'), p.captured_at,
         lower(et.market), lower(et.industry)
  from transcript_purchases p
  join auth.users u on u.id = p.user_id
  left join expert_transcripts et on et.id = p.transcript_id
  where p.status = 'completed' and p.captured_at >= since and u.email is not null
  union all
  select 'l:' || p.id, 'list', lower(u.email), p.user_id, p.slug, coalesce(p.locale, 'en'), p.captured_at,
         lower(m.country), lower(m.title)
  from list_purchases p
  join auth.users u on u.id = p.user_id
  left join market_maps m on m.id = p.map_id
  where p.status = 'completed' and p.captured_at >= since and u.email is not null;
$$;

revoke all on function public.seq_a_candidates(timestamptz) from public, anon, authenticated;
revoke all on function public.seq_buyers(timestamptz) from public, anon, authenticated;
grant execute on function public.seq_a_candidates(timestamptz) to service_role;
grant execute on function public.seq_buyers(timestamptz) to service_role;
