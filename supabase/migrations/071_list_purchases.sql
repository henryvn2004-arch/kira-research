-- ============================================================
-- 071_list_purchases.sql — market-map company lists bought with PayPal (api/list-buy.js)
--
-- One row per paid order. Capture records the purchase at once; the Excel file is built afterwards by the
-- partner build API (api/_lib/list-source.js) and stored in the private bucket `market-lists`.
-- build_status: pending (paid, file not ready), ready (download link live), failed (owner must act).
-- The download link is the random `download_token`, served by /api/list-download: valid 7 days from the moment
-- the file is ready (expires_at) and for at most max_downloads (5) downloads.
-- Written only by the API (service role); a buyer may read their own rows (profile / My Library).
-- Depends on 070_market_maps.sql. Idempotent.
-- ============================================================

create table if not exists public.list_purchases (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  user_id         uuid not null,
  map_id          uuid not null references public.market_maps(id),
  slug            text not null,                       -- '<country>/<segment_key>'
  n_companies     integer not null,                    -- size of the list when bought (decides the price)
  amount          numeric(10,2) not null,
  currency        text not null default 'USD',
  paypal_order_id text not null,
  status          text not null default 'completed' check (status in ('completed', 'refunded')),
  captured_at     timestamptz not null default now(),
  build_status    text not null default 'pending' check (build_status in ('pending', 'ready', 'failed')),
  build_error     text,
  file_path       text,                                -- object path inside bucket market-lists
  download_token  text unique,
  expires_at      timestamptz,
  download_count  integer not null default 0,
  max_downloads   integer not null default 5
);

create unique index if not exists list_purchases_order_idx on public.list_purchases (paypal_order_id);
create index if not exists list_purchases_user_idx on public.list_purchases (user_id, captured_at desc);

alter table public.list_purchases enable row level security;

drop policy if exists list_purchases_owner_select on public.list_purchases;
create policy list_purchases_owner_select
  on public.list_purchases for select to authenticated
  using (user_id = auth.uid());

-- Private bucket for the built Excel files (never public; served only through /api/list-download).
insert into storage.buckets (id, name, public)
values ('market-lists', 'market-lists', false)
on conflict (id) do nothing;
