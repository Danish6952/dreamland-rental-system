-- =====================================================================
-- 0008 — Reference data
-- =====================================================================

insert into public.branches (id, name, address)
values ('00000000-0000-0000-0000-000000000001', 'Dreamland – Aari Syedan', 'Aari Syedan, Islamabad, Pakistan')
on conflict (id) do nothing;

insert into public.payment_methods (code, name, sort_order) values
  ('cash',          'Cash',                                 10),
  ('bank_transfer', 'Bank Transfer',                        20),
  ('mobile_wallet', 'Mobile Wallet (JazzCash / Easypaisa)', 30)
on conflict (code) do nothing;
