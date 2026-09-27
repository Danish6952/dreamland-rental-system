-- =====================================================================
-- 0005 — Calculation views
-- See documentation/05_Business_Rules.md §3–§6 and 03_Database_Design.md §4
--
-- All money numbers shown anywhere in the app come from these views,
-- so the dashboard, rental screens and reports always agree.
-- security_invoker = true -> the caller's RLS applies.
-- =====================================================================

-- ---------------------------------------------------------------------
-- rental_balances — one row per rental (including void; consumers
-- exclude status = 'void' from totals).
--   Paid     = advance + rent + deposit_used − refund        (rule P-2)
--   Pending  = total_bill − paid                             (rule P-3)
--   Deposit  = taken − returned − used                       (rule D-2)
-- ---------------------------------------------------------------------
create view public.rental_balances with (security_invoker = true) as
with pay as (
  select
    rental_id,
    coalesce(sum(amount) filter (where type = 'advance'), 0)          as advance_paid,
    coalesce(sum(amount) filter (where type = 'rent'), 0)             as rent_paid,
    coalesce(sum(amount) filter (where type = 'deposit_used'), 0)     as deposit_used,
    coalesce(sum(amount) filter (where type = 'refund'), 0)           as refunded,
    coalesce(sum(amount) filter (where type = 'deposit_taken'), 0)    as deposit_taken,
    coalesce(sum(amount) filter (where type = 'deposit_returned'), 0) as deposit_returned,
    max(payment_date) filter (where type in ('advance', 'rent'))      as last_payment_date
  from public.payments
  where not is_voided
  group by rental_id
),
base as (
  select
    r.id, r.rental_number, r.branch_id, r.status,
    r.car_id, c.car_number, c.make as car_make, c.model as car_model, c.color as car_color,
    r.customer_id, r.driver_name, r.driver_mobile, r.driver_license,
    r.guarantor_name, r.guarantor_mobile,
    r.rental_type, r.agreed_rate, r.standard_rent_snapshot,
    r.out_at, r.expected_return_date, r.returned_at, r.closed_at,
    r.payment_due_date, r.payment_due_amount,
    r.start_km, r.end_km, r.fuel_out, r.fuel_in,
    r.rent_amount, r.fuel_charge, r.damage_charge, r.damage_notes,
    r.extra_km_charge, r.other_charge, r.other_charge_note, r.total_bill,
    r.notes, r.void_reason, r.voided_at, r.created_at, r.updated_at,
    coalesce(p.advance_paid, 0)     as advance_paid,
    coalesce(p.rent_paid, 0)        as rent_paid,
    coalesce(p.deposit_used, 0)     as deposit_used,
    coalesce(p.refunded, 0)         as refunded,
    coalesce(p.deposit_taken, 0)    as deposit_taken,
    coalesce(p.deposit_returned, 0) as deposit_returned,
    p.last_payment_date
  from public.rentals r
  join public.cars c on c.id = r.car_id
  left join pay p on p.rental_id = r.id
),
calc as (
  select
    b.*,
    b.advance_paid + b.rent_paid + b.deposit_used - b.refunded                 as total_paid,
    b.total_bill - (b.advance_paid + b.rent_paid + b.deposit_used - b.refunded) as pending,
    b.deposit_taken - b.deposit_returned - b.deposit_used                       as deposit_balance,
    private.today_pkt()                                                         as today
  from base b
)
select
  c.id, c.rental_number, c.branch_id, c.status,
  c.car_id, c.car_number, c.car_make, c.car_model, c.car_color,
  c.customer_id, c.driver_name, c.driver_mobile, c.driver_license,
  c.guarantor_name, c.guarantor_mobile,
  c.rental_type, c.agreed_rate, c.standard_rent_snapshot,
  c.out_at, c.expected_return_date, c.returned_at, c.closed_at,
  c.payment_due_date, c.payment_due_amount,
  c.start_km, c.end_km, c.fuel_out, c.fuel_in,
  c.rent_amount, c.fuel_charge, c.damage_charge, c.damage_notes,
  c.extra_km_charge, c.other_charge, c.other_charge_note, c.total_bill,
  c.notes, c.void_reason, c.voided_at, c.created_at, c.updated_at,
  c.advance_paid, c.rent_paid, c.deposit_used, c.refunded,
  c.deposit_taken, c.deposit_returned, c.last_payment_date,
  c.total_paid, c.pending, c.deposit_balance,
  (c.pending = 0 and c.deposit_balance = 0) as is_settled,
  -- Amount due by payment_due_date (whole pending when no due amount set)
  case when c.pending > 0 then least(coalesce(c.payment_due_amount, c.pending), c.pending) else 0 end
    as due_amount,
  -- Alert flags (rules A-1 … A-7)
  (c.status in ('out', 'returned') and c.pending > 0
     and c.payment_due_date < c.today)                                     as is_payment_overdue,
  (c.status in ('out', 'returned') and c.pending > 0
     and c.payment_due_date between c.today and c.today + 3)               as is_payment_due_soon,
  (c.status = 'out' and c.expected_return_date < c.today)                  as is_return_overdue,
  (c.status in ('out', 'returned') and c.pending < 0)                      as is_overpaid,
  case when c.payment_due_date < c.today then c.today - c.payment_due_date else 0 end
    as days_payment_overdue,
  case when c.status = 'out' and c.expected_return_date < c.today
       then c.today - c.expected_return_date else 0 end                   as days_return_overdue
from calc c;

-- ---------------------------------------------------------------------
-- rental_alerts — one row per active alert on a rental
-- ---------------------------------------------------------------------
create view public.rental_alerts with (security_invoker = true) as
select
  rb.id as rental_id, rb.rental_number, rb.status as rental_status,
  rb.car_id, rb.car_number, rb.car_model,
  rb.customer_id, rb.driver_name, rb.driver_mobile,
  rb.pending, rb.deposit_balance,
  a.alert_type, a.severity, a.amount, a.days, a.ref_date,
  a.sort_rank
from public.rental_balances rb
cross join lateral (
  values
    ('payment_overdue',  'red',   rb.due_amount,        rb.days_payment_overdue,                  rb.payment_due_date,     1,
       rb.is_payment_overdue),
    ('return_overdue',   'red',   null::numeric,        rb.days_return_overdue,                   rb.expected_return_date, 2,
       rb.is_return_overdue),
    ('overpaid',         'red',   -rb.pending,          null::integer,                            null::date,              3,
       rb.is_overpaid),
    ('payment_pending',  'red',   greatest(rb.pending, 0), null::integer,                         rb.returned_at::date,    4,
       rb.status = 'returned' and (rb.pending > 0 or rb.deposit_balance > 0) and not rb.is_payment_overdue),
    ('payment_due_soon', 'amber', rb.due_amount,        (rb.payment_due_date - private.today_pkt()), rb.payment_due_date, 5,
       rb.is_payment_due_soon)
) as a (alert_type, severity, amount, days, ref_date, sort_rank, active)
where a.active and rb.status in ('out', 'returned');

-- ---------------------------------------------------------------------
-- car_alerts — insurance expiring (≤ 30 days) / expired (rules A-5, A-6)
-- ---------------------------------------------------------------------
create view public.car_alerts with (security_invoker = true) as
select
  c.id as car_id, c.car_number, c.make, c.model, c.status,
  case when c.insurance_expiry < private.today_pkt() then 'insurance_expired' else 'insurance_expiring' end as alert_type,
  case when c.insurance_expiry < private.today_pkt() then 'red' else 'amber' end as severity,
  c.insurance_expiry,
  (c.insurance_expiry - private.today_pkt()) as days_left
from public.cars c
where c.status <> 'sold'
  and c.archived_at is null
  and c.insurance_expiry is not null
  and c.insurance_expiry <= private.today_pkt() + 30;

-- ---------------------------------------------------------------------
-- income_ledger — payments that count as income, cash basis (rule P-7)
--   advance, rent, deposit_used  -> +amount
--   refund                       -> −amount
--   deposit_taken / returned     -> not income
-- ---------------------------------------------------------------------
create view public.income_ledger with (security_invoker = true) as
select
  p.id as payment_id,
  p.payment_date,
  p.type,
  case when p.type = 'refund' then -p.amount else p.amount end as amount,
  pm.name as method_name,
  p.method_id,
  r.id as rental_id, r.rental_number,
  r.car_id, c.car_number, c.model as car_model,
  r.customer_id, r.driver_name,
  r.branch_id
from public.payments p
join public.rentals r on r.id = p.rental_id
join public.cars c on c.id = r.car_id
left join public.payment_methods pm on pm.id = p.method_id
where not p.is_voided
  and r.status <> 'void'
  and p.type in ('advance', 'rent', 'deposit_used', 'refund');

-- ---------------------------------------------------------------------
-- payment_list — every payment with context (payment history report)
-- ---------------------------------------------------------------------
create view public.payment_list with (security_invoker = true) as
select
  p.id, p.rental_id, p.payment_date, p.amount, p.type, p.method_id,
  pm.name as method_name, p.reference, p.notes,
  p.is_voided, p.void_reason, p.voided_at,
  p.created_at, p.updated_at, p.created_by, p.updated_by,
  (p.updated_at > p.created_at + interval '1 second') as is_edited,
  cp.full_name as created_by_name,
  r.rental_number, r.status as rental_status,
  r.car_id, c.car_number, c.model as car_model,
  r.customer_id, r.driver_name
from public.payments p
join public.rentals r on r.id = p.rental_id
join public.cars c on c.id = r.car_id
left join public.payment_methods pm on pm.id = p.method_id
left join public.profiles cp on cp.id = p.created_by;

-- ---------------------------------------------------------------------
-- dashboard_summary — single row
-- ---------------------------------------------------------------------
create view public.dashboard_summary with (security_invoker = true) as
select
  (select count(*) from public.cars where archived_at is null and status = 'available')   as available_count,
  (select count(*) from public.cars where archived_at is null and status = 'on_rent')     as on_rent_count,
  (select count(*) from public.cars where archived_at is null and status = 'maintenance') as maintenance_count,
  (select count(*) from public.cars where archived_at is null and status <> 'sold')       as active_car_count,
  (select coalesce(sum(greatest(pending, 0)), 0) from public.rental_balances
     where status in ('out', 'returned'))                                                 as total_outstanding,
  (select coalesce(sum(due_amount), 0) from public.rental_balances
     where is_payment_overdue)                                                            as total_overdue,
  (select coalesce(sum(deposit_balance), 0) from public.rental_balances
     where status in ('out', 'returned'))                                                 as deposits_held,
  (select coalesce(sum(amount), 0) from public.income_ledger
     where payment_date >= date_trunc('week', private.today_pkt())::date)                 as income_this_week,
  (select coalesce(sum(amount), 0) from public.income_ledger
     where payment_date >= date_trunc('month', private.today_pkt())::date)                as income_this_month;

-- ---------------------------------------------------------------------
-- car_earnings — lifetime totals per car
-- ---------------------------------------------------------------------
create view public.car_earnings with (security_invoker = true) as
select
  c.id as car_id, c.car_number, c.make, c.model, c.status, c.archived_at,
  count(rb.id) filter (where rb.status <> 'void')                                      as rentals_count,
  coalesce(sum(rb.total_bill) filter (where rb.status <> 'void'), 0)                   as total_billed,
  coalesce(sum(rb.total_paid) filter (where rb.status <> 'void'), 0)                   as total_received,
  coalesce(sum(greatest(rb.pending, 0)) filter (where rb.status in ('out', 'returned')), 0) as total_pending,
  max(rb.out_at) filter (where rb.status <> 'void')                                    as last_rented_at
from public.cars c
left join public.rental_balances rb on rb.car_id = c.id
group by c.id;

-- ---------------------------------------------------------------------
-- customer_balances — totals per customer (pending by customer report)
-- ---------------------------------------------------------------------
create view public.customer_balances with (security_invoker = true) as
select
  cu.id as customer_id, cu.full_name, cu.mobile, cu.license_number, cu.archived_at,
  count(rb.id) filter (where rb.status <> 'void')                                      as rentals_count,
  count(rb.id) filter (where rb.status = 'out')                                        as active_rentals_count,
  coalesce(sum(rb.total_bill) filter (where rb.status <> 'void'), 0)                   as total_billed,
  coalesce(sum(rb.total_paid) filter (where rb.status <> 'void'), 0)                   as total_paid,
  coalesce(sum(greatest(rb.pending, 0)) filter (where rb.status in ('out', 'returned')), 0) as total_pending,
  coalesce(sum(rb.due_amount) filter (where rb.is_payment_overdue), 0)                 as total_overdue,
  coalesce(sum(rb.deposit_balance) filter (where rb.status in ('out', 'returned')), 0) as deposit_held,
  max(rb.out_at) filter (where rb.status <> 'void')                                    as last_rental_at
from public.customers cu
left join public.rental_balances rb on rb.customer_id = cu.id
group by cu.id;

-- ---------------------------------------------------------------------
-- car_list — cars with their current rental (for list screens)
-- ---------------------------------------------------------------------
create view public.car_list with (security_invoker = true) as
select
  c.*,
  ar.id as active_rental_id, ar.rental_number as active_rental_number,
  ar.driver_name as active_driver_name, ar.expected_return_date as active_expected_return_date,
  (select h.reason from public.car_status_history h
     where h.car_id = c.id order by h.changed_at desc, h.id desc limit 1) as last_status_reason
from public.cars c
left join public.rentals ar on ar.car_id = c.id and ar.status = 'out';
