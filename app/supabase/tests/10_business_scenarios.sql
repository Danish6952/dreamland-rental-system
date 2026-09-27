-- =====================================================================
-- Business scenario tests (documentation/08_Testing_Checklist.md)
-- Run by tests/run-db-tests.sh against a throwaway PostgreSQL.
-- Every block raises an exception on failure; the script stops at the
-- first failure (ON_ERROR_STOP).
-- =====================================================================
\set ON_ERROR_STOP 1
\set QUIET 1

-- ---------- helpers ----------
create or replace function pg_temp.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), false);
end $$;

create or replace function pg_temp.expect_error(p_sql text, p_like text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm ilike p_like then
      raise notice 'ok  expected error: %', sqlerrm;
      return;
    end if;
    raise exception 'FAIL: wrong error for [%]: % (expected like %)', p_sql, sqlerrm, p_like;
  end;
  raise exception 'FAIL: expected an error for [%]', p_sql;
end $$;

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is not true then raise exception 'FAIL: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

grant execute on all functions in schema pg_temp to anon, authenticated;

-- ---------- users ----------
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'owner@dreamland.test', '{"full_name":"Owner"}'),
  ('22222222-2222-2222-2222-222222222222', 'brother@dreamland.test', '{"full_name":"Brother"}');

select pg_temp.check((select role from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 'owner',
                     'first user becomes owner');
select pg_temp.check((select role from public.profiles where id = '22222222-2222-2222-2222-222222222222') = 'staff',
                     'second user becomes staff');

-- ---------- anonymous access ----------
set role anon;
select pg_temp.expect_error('select * from public.cars', '%permission denied%');
select pg_temp.expect_error('select * from public.rental_balances', '%permission denied%');
select pg_temp.expect_error($q$select public.set_car_maintenance(gen_random_uuid(), true)$q$, '%permission denied%');
reset role;

-- ---------- staff: cars ----------
select pg_temp.login('22222222-2222-2222-2222-222222222222');
set role authenticated;

insert into public.cars (car_number, make, model, year, color, standard_rent, standard_rent_period, insurance_expiry)
values ('ABC-123', 'Toyota', 'Corolla GLi', 2020, 'White', 50000, 'monthly', current_date + 10),
       ('LEA 777', 'Honda', 'City', 2021, 'Silver', 4000, 'daily', null);

select pg_temp.check((select status from public.cars where car_number = 'ABC-123') = 'available', 'new car is Available');
select pg_temp.expect_error($q$insert into public.cars (car_number, model, standard_rent) values ('abc 123', 'X', 1)$q$,
                            '%duplicate key%');
select pg_temp.expect_error($q$insert into public.cars (car_number, model, standard_rent, status) values ('ZZZ-1', 'X', 1, 'on_rent')$q$,
                            '%permission denied%');
select pg_temp.expect_error($q$update public.cars set status = 'on_rent' where car_number = 'ABC-123'$q$,
                            '%permission denied%');
select pg_temp.expect_error($q$delete from public.cars$q$, '%permission denied%');
select pg_temp.expect_error($q$insert into public.payments (rental_id, payment_date, amount, type) values (gen_random_uuid(), current_date, 1, 'rent')$q$,
                            '%permission denied%');
select pg_temp.check((select count(*) from public.car_alerts where alert_type = 'insurance_expiring') = 1,
                     'insurance expiring alert for ABC-123');

-- ---------- Worked example (05 §5), Customer B ----------
select pg_temp.check(public.car_out(
  p_car_id               => (select id from public.cars where car_number = 'ABC-123'),
  p_driver_name          => 'Customer B',
  p_driver_mobile        => '+92 300 1234567',
  p_driver_license       => 'LHR-12345',
  p_guarantor_name       => 'Guarantor B',
  p_guarantor_mobile     => '0312-7654321',
  p_rental_type          => 'monthly',
  p_agreed_rate          => 45000,
  p_rent_amount          => 45000,
  p_expected_return_date => current_date + 5,
  p_out_at               => now() - interval '25 days',
  p_advance_amount       => 10000,
  p_advance_method_id    => (select id from public.payment_methods where code = 'cash'),
  p_deposit_amount       => 20000,
  p_deposit_method_id    => (select id from public.payment_methods where code = 'bank_transfer')
) is not null, 'car_out succeeds');

create temp view rb as select * from public.rental_balances where driver_name = 'Customer B';
grant select on rb to authenticated;

select pg_temp.check((select driver_mobile from rb) = '03001234567', 'mobile normalized to 03XXXXXXXXX');
select pg_temp.check((select rental_number from rb) = 'DR-0001', 'rental number DR-0001');
select pg_temp.check((select status from public.cars where car_number = 'ABC-123') = 'on_rent', 'car is On Rent');
select pg_temp.check((select (total_bill, total_paid, pending, deposit_balance, status::text) from rb)
                     = (45000::numeric, 10000::numeric, 35000::numeric, 20000::numeric, 'out'::text), 'after car out: 45k / 10k / 35k / dep 20k');

select pg_temp.expect_error($q$select public.car_out((select id from public.cars where car_number = 'ABC-123'),
  'X Y', '03001112223', 'LIC-1', 'G H', '03001112224', 'daily', 1, 1, current_date)$q$, '%no longer available%');

select public.record_payment((select id from rb), 'rent', 15000, current_date - 10,
                             (select id from public.payment_methods where code = 'mobile_wallet'));
select pg_temp.check((select pending from rb) = 20000, 'day 15 payment -> pending 20k');

select pg_temp.expect_error($q$select public.record_payment((select id from rb), 'rent', 30000, current_date,
                             (select id from public.payment_methods where code = 'cash'))$q$, '%more than the pending%');
select pg_temp.expect_error($q$select public.record_payment((select id from rb), 'rent', 100, current_date + 1,
                             (select id from public.payment_methods where code = 'cash'))$q$, '%future%');
select pg_temp.expect_error($q$select public.record_payment((select id from rb), 'deposit_used', 100, current_date,
                             (select id from public.payment_methods where code = 'cash'))$q$, '%does not take a payment method%');

select pg_temp.check(public.car_return(
  p_rental_id                => (select id from rb),
  p_fuel_charge              => 2000,
  p_damage_charge            => 5000,
  p_damage_notes             => 'Rear bumper scratch',
  p_deposit_used             => 5000,
  p_payment_amount           => 20000,
  p_payment_method_id        => (select id from public.payment_methods where code = 'cash'),
  p_deposit_returned         => 15000,
  p_deposit_return_method_id => (select id from public.payment_methods where code = 'cash')
) = 'returned', 'car_return -> Returned');

select pg_temp.check((select (total_bill, total_paid, pending, deposit_balance) from rb)
                     = (52000::numeric, 50000::numeric, 2000::numeric, 0::numeric), 'after return: 52k / 50k / 2k / dep 0');
select pg_temp.check((select status from public.cars where car_number = 'ABC-123') = 'available', 'car back to Available');
select pg_temp.check(exists (select 1 from public.rental_alerts where alert_type = 'payment_pending'), 'payment pending alert');

select pg_temp.expect_error($q$select public.record_payment((select id from rb), 'deposit_used', 1, current_date)$q$,
                            '%Not enough deposit%');

select public.record_payment((select id from rb), 'rent', 2000, current_date,
                             (select id from public.payment_methods where code = 'cash'));
select pg_temp.check((select status from rb) = 'closed', 'final 2k -> Closed');
select pg_temp.check(not exists (select 1 from public.rental_alerts), 'no rental alerts once closed');

-- ---------- edit payment (audited, reopens) ----------
select pg_temp.expect_error($q$select public.update_payment((select id from public.payments where amount = 2000 and type = 'rent'),
   1500, current_date, (select id from public.payment_methods where code = 'cash'), null, null, '')$q$, '%reason%');

select public.update_payment((select id from public.payments where amount = 2000 and type = 'rent'),
   1500, current_date, (select id from public.payment_methods where code = 'cash'), null, null, 'Customer paid 1500 only');
select pg_temp.check((select (status::text, pending) from rb) = ('returned'::text, 500::numeric), 'edit to 1500 -> reopens Returned, pending 500');
select pg_temp.check((select count(*) from public.audit_log where reason = 'Customer paid 1500 only' and table_name = 'payments') = 1,
                     'payment edit is in audit log with reason');
select pg_temp.expect_error($q$update public.audit_log set reason = 'x'$q$, '%permission denied%');

select public.update_payment((select id from public.payments where amount = 1500 and type = 'rent'),
   2000, current_date, (select id from public.payment_methods where code = 'cash'), null, null, 'Corrected back to 2000');
select pg_temp.check((select status from rb) = 'closed', 'corrected -> Closed again');

-- ---------- income ----------
select pg_temp.check((select sum(amount) from public.income_ledger) = 52000,
                     'income = advance + rent + deposit used (52k); deposits not income');

-- ---------- owner-only actions blocked for staff ----------
select pg_temp.expect_error($q$select public.void_payment((select id from public.payments limit 1), 'testing void')$q$, '%only the owner%');
select pg_temp.expect_error($q$select public.sell_car((select id from public.cars where car_number = 'ABC-123'), current_date, 1, 'Buyer')$q$,
                            '%only the owner%');

-- ---------- maintenance ----------
select public.set_car_maintenance((select id from public.cars where car_number = 'LEA 777'), true, 'AC repair');
select pg_temp.check((select status from public.cars where car_number = 'LEA 777') = 'maintenance', 'sent to maintenance');
select pg_temp.expect_error($q$select public.car_out((select id from public.cars where car_number = 'LEA 777'),
  'X Y', '03001112223', 'LIC-1', 'G H', '03001112224', 'daily', 1, 1, current_date)$q$, '%no longer available%');
select public.set_car_maintenance((select id from public.cars where car_number = 'LEA 777'), false);
select pg_temp.check((select reason from public.car_status_history h join public.cars c on c.id = h.car_id
                       where c.car_number = 'LEA 777' and h.to_status = 'maintenance') = 'AC repair',
                     'status history keeps maintenance reason');

-- ---------- yearly rental + next due + void flow ----------
select public.car_out(
  p_car_id => (select id from public.cars where car_number = 'LEA 777'),
  p_driver_name => 'Ali Khan', p_driver_mobile => '03211234567', p_driver_license => 'ISB-555',
  p_guarantor_name => 'Imran', p_guarantor_mobile => '03331234567',
  p_rental_type => 'yearly', p_agreed_rate => 500000, p_rent_amount => 500000,
  p_expected_return_date => current_date + 300, p_out_at => now() - interval '40 days',
  p_payment_due_amount => 45000,
  p_advance_amount => 45000, p_advance_method_id => (select id from public.payment_methods where code = 'cash'));

create temp view ali as select * from public.rental_balances where driver_name = 'Ali Khan';
grant select on ali to authenticated;
select pg_temp.check((select payment_due_date from ali) = (current_date - 40 + interval '1 month')::date,
                     'yearly: default next due = out date + 1 month');
select pg_temp.check((select (is_payment_overdue, due_amount) from ali) = (true, 45000::numeric),
                     'yearly: overdue shows due amount 45k, not whole pending');
select public.record_payment((select id from ali), 'rent', 45000, current_date,
                             (select id from public.payment_methods where code = 'cash'), null, null,
                             current_date + 20, 45000);
select pg_temp.check((select (is_payment_overdue, payment_due_date) from ali) = (false, current_date + 20),
                     'payment with next due clears overdue');

-- deactivated user sees nothing
reset role;
select pg_temp.login('11111111-1111-1111-1111-111111111111');
set role authenticated;
select public.set_user_access('22222222-2222-2222-2222-222222222222', 'staff', false);
select pg_temp.expect_error($q$select public.set_user_access('11111111-1111-1111-1111-111111111111', 'staff', true)$q$,
                            '%own owner access%');
reset role;
select pg_temp.login('22222222-2222-2222-2222-222222222222');
set role authenticated;
select pg_temp.check((select count(*) from public.cars) = 0, 'deactivated user reads no cars');
select pg_temp.check((select count(*) from public.profiles) = 1, 'deactivated user can read own profile only');
select pg_temp.expect_error($q$select public.set_car_maintenance((select id from public.cars limit 1), true)$q$, '%disabled%');
reset role;

-- owner: void flow + sell
select pg_temp.login('11111111-1111-1111-1111-111111111111');
set role authenticated;
select pg_temp.expect_error($q$select public.void_rental((select id from ali), 'wrong car entered')$q$, '%payments of this rental first%');
select public.void_payment(id, 'entered by mistake') from public.payments where rental_id = (select id from ali);
select public.void_rental((select id from public.rentals where driver_name = 'Ali Khan'), 'wrong car entered');
select pg_temp.check((select status from public.cars where car_number = 'LEA 777') = 'available', 'void Out rental frees the car');
select pg_temp.check((select status from public.rentals where driver_name = 'Ali Khan') = 'void', 'rental kept as Void');

select public.sell_car((select id from public.cars where car_number = 'ABC-123'), current_date, 3500000, 'Buyer Name', '0300 9998887');
select pg_temp.check((select (status::text, archived_at is not null) from public.cars where car_number = 'ABC-123') = ('sold'::text, true),
                     'sold car is Sold + archived');
select pg_temp.check((select count(*) from public.rentals r join public.cars c on c.id = r.car_id where c.car_number = 'ABC-123') = 1,
                     'sold car keeps its rental history');
update public.cars set color = 'Red' where car_number = 'ABC-123';
select pg_temp.check((select color from public.cars where car_number = 'ABC-123') = 'White', 'sold car cannot be edited (RLS)');
reset role;
select pg_temp.expect_error($q$update public.cars set color = 'Red' where car_number = 'ABC-123'$q$, '%archived%');
select pg_temp.login('11111111-1111-1111-1111-111111111111');
set role authenticated;
select pg_temp.check((select available_count from public.dashboard_summary) = 1, 'dashboard excludes sold car');
reset role;

\echo
\echo '========================================='
\echo ' ALL DATABASE SCENARIO TESTS PASSED'
\echo '========================================='
