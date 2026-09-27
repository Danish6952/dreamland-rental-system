-- =====================================================================
-- 0003 — Indexes and unique rules
-- See documentation/03_Database_Design.md §5
-- =====================================================================

-- Car number unique ignoring spaces / dashes / case (rule V-1)
create unique index cars_car_number_uq on public.cars (car_number_normalized);
create index cars_active_status_idx   on public.cars (status) where archived_at is null;
create index cars_insurance_idx       on public.cars (insurance_expiry);

-- One active customer per mobile number (decision Q6)
create unique index customers_mobile_active_uq on public.customers (mobile) where archived_at is null;
create index customers_name_trgm_idx on public.customers
  using gin (lower(full_name) extensions.gin_trgm_ops);

-- A car can never have two active rentals (rule R-8)
create unique index rentals_one_active_per_car_uq on public.rentals (car_id) where status = 'out';
create index rentals_car_idx        on public.rentals (car_id, out_at desc);
create index rentals_customer_idx   on public.rentals (customer_id, out_at desc);
create index rentals_status_idx     on public.rentals (status);
create index rentals_due_idx        on public.rentals (payment_due_date) where status in ('out', 'returned');

create index payments_rental_idx    on public.payments (rental_id);
create index payments_date_idx      on public.payments (payment_date);
create index payments_income_idx    on public.payments (type, payment_date) where not is_voided;

create index car_status_history_car_idx on public.car_status_history (car_id, changed_at desc);
create index audit_log_record_idx       on public.audit_log (table_name, record_id, changed_at desc);
create index audit_log_changed_at_idx   on public.audit_log (changed_at desc);
