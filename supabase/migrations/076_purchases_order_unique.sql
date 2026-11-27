-- 076: one PayPal order can belong to one purchase only (security audit, H2).
-- Guarded: if duplicates already exist the index is skipped with a notice
-- (resolve the duplicates by hand, then re-run).
do $$
begin
  if exists (
    select 1 from public.purchases
    where paypal_order_id is not null
    group by paypal_order_id having count(*) > 1
  ) then
    raise notice 'purchases.paypal_order_id has duplicates: unique index NOT created';
  else
    create unique index if not exists purchases_paypal_order_uniq
      on public.purchases (paypal_order_id) where paypal_order_id is not null;
  end if;
end $$;
