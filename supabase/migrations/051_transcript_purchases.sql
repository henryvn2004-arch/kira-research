-- 051_transcript_purchases.sql — one expert-interview transcript bought with PayPal (S19 follow-up).
-- A completed row unlocks the full text of that transcript, in every language it exists in, for that user.
-- Written only by /api/transcript-buy (service role); a buyer may read their own rows. Idempotent.

create table if not exists public.transcript_purchases (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  user_id         uuid not null,
  transcript_id   uuid not null references public.expert_transcripts(id),
  slug            text not null,
  amount          numeric(10,2) not null,
  currency        text not null default 'USD',
  paypal_order_id text not null,
  status          text not null default 'completed' check (status in ('completed', 'refunded')),
  captured_at     timestamptz not null default now()
);

create unique index if not exists transcript_purchases_user_transcript_idx
  on public.transcript_purchases (user_id, transcript_id) where status = 'completed';
create unique index if not exists transcript_purchases_order_idx
  on public.transcript_purchases (paypal_order_id);

alter table public.transcript_purchases enable row level security;

drop policy if exists transcript_purchases_owner_select on public.transcript_purchases;
create policy transcript_purchases_owner_select
  on public.transcript_purchases for select to authenticated
  using (user_id = auth.uid());
