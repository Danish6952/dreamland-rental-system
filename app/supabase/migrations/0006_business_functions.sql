-- =====================================================================
-- 0006 — Business actions (RPC functions)
-- See documentation/02_System_Architecture.md §3.1 and 05_Business_Rules.md
--
-- Every multi-step action runs in ONE transaction. Clients cannot write
-- rentals / payments / car status directly (0007); they must call these.
-- All functions: SECURITY DEFINER, fixed search_path, explicit role check.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Internal: current money totals for a rental (non-voided payments)
-- ---------------------------------------------------------------------
create or replace function private.rental_totals(
  p_rental_id uuid,
  out total_bill numeric, out total_paid numeric, out pending numeric, out deposit_balance numeric
)
language sql stable security definer set search_path = public, pg_temp
as $$
  with p as (
    select
      coalesce(sum(case when type in ('advance', 'rent', 'deposit_used') then amount
                        when type = 'refund' then -amount else 0 end), 0) as paid,
      coalesce(sum(case when type = 'deposit_taken' then amount
                        when type in ('deposit_returned', 'deposit_used') then -amount else 0 end), 0) as dep
    from public.payments
    where rental_id = p_rental_id and not is_voided
  )
  select r.total_bill, p.paid, r.total_bill - p.paid, p.dep
  from public.rentals r cross join p
  where r.id = p_rental_id;
$$;

-- ---------------------------------------------------------------------
-- Internal: Returned <-> Closed automatically (rules R-4, R-5)
-- ---------------------------------------------------------------------
create or replace function private.recalc_rental_status(p_rental_id uuid)
returns public.rental_status
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_status public.rental_status;
  t record;
begin
  select status into v_status from public.rentals where id = p_rental_id for update;
  if v_status in ('returned', 'closed') then
    select * into t from private.rental_totals(p_rental_id);
    if t.pending = 0 and t.deposit_balance = 0 then
      update public.rentals set status = 'closed', closed_at = coalesce(closed_at, now())
        where id = p_rental_id and status <> 'closed';
      v_status := 'closed';
    else
      update public.rentals set status = 'returned', closed_at = null
        where id = p_rental_id and status <> 'returned';
      v_status := 'returned';
    end if;
  end if;
  return v_status;
end;
$$;

-- ---------------------------------------------------------------------
-- Internal: money invariants after a payment change.
-- A change may not make things WORSE past the limit (so a correction
-- that improves an already-bad state is still allowed).
--   * deposit balance never below 0                       (D-4, D-5, D-6)
--   * advance / rent / deposit_used never push pending < 0 (P-4, D-4)
--   * refund only up to the overpaid amount               (P-4)
-- ---------------------------------------------------------------------
create or replace function private.assert_money_rules(
  p_type public.payment_type,
  p_before_pending numeric, p_before_deposit numeric,
  p_after_pending numeric,  p_after_deposit numeric
)
returns void
language plpgsql immutable
as $$
begin
  if p_after_deposit < 0 and p_after_deposit < p_before_deposit then
    raise exception 'Not enough deposit held. Available deposit: %', private.rs(greatest(p_before_deposit, 0))
      using errcode = '23514';
  end if;
  if p_type in ('advance', 'rent', 'deposit_used') and p_after_pending < 0 and p_after_pending < p_before_pending then
    raise exception 'Amount is more than the pending balance. Maximum allowed: %', private.rs(greatest(p_before_pending, 0))
      using errcode = '23514';
  end if;
  if p_type = 'refund' and p_after_pending > 0 and p_after_pending > p_before_pending then
    raise exception 'A refund is only allowed for an overpaid amount. Maximum refund: %', private.rs(greatest(-p_before_pending, 0))
      using errcode = '23514';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Internal: validate method + date for a payment
-- ---------------------------------------------------------------------
create or replace function private.check_payment_fields(
  p_rental_id uuid, p_type public.payment_type, p_method_id uuid, p_payment_date date, p_allow_inactive_method uuid default null
)
returns void
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_out_date date;
begin
  if p_type = 'deposit_used' then
    if p_method_id is not null then
      raise exception '"Deposit used" does not take a payment method' using errcode = '22023';
    end if;
  else
    if p_method_id is null then
      raise exception 'Payment method is required' using errcode = '22023';
    end if;
    if not exists (select 1 from public.payment_methods
                   where id = p_method_id and (is_active or id = p_allow_inactive_method)) then
      raise exception 'Payment method is not available' using errcode = '22023';
    end if;
  end if;

  if p_payment_date is null then
    raise exception 'Payment date is required' using errcode = '22023';
  end if;
  if p_payment_date > private.today_pkt() then
    raise exception 'Payment date cannot be in the future' using errcode = '22023';
  end if;
  select private.pkt_date(out_at) into v_out_date from public.rentals where id = p_rental_id;
  if p_payment_date < v_out_date then
    raise exception 'Payment date cannot be before the rental out date (%)', to_char(v_out_date, 'DD Mon YYYY')
      using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Internal: insert a payment with all checks (used by car_out,
-- car_return and record_payment)
-- ---------------------------------------------------------------------
create or replace function private.add_payment(
  p_rental_id uuid, p_type public.payment_type, p_amount numeric, p_payment_date date,
  p_method_id uuid, p_reference text, p_notes text
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_status public.rental_status;
  b record;
  a record;
  v_id uuid;
begin
  select status into v_status from public.rentals where id = p_rental_id for update;
  if not found then
    raise exception 'Rental not found' using errcode = 'P0002';
  end if;
  if v_status not in ('out', 'returned') then
    raise exception 'Payments can only be added to rentals that are Out or Returned (this one is %)', v_status
      using errcode = '23514';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Amount must be more than 0' using errcode = '22023';
  end if;

  perform private.check_payment_fields(p_rental_id, p_type, p_method_id, p_payment_date);

  select * into b from private.rental_totals(p_rental_id);

  insert into public.payments (rental_id, payment_date, amount, type, method_id, reference, notes)
  values (p_rental_id, p_payment_date, round(p_amount, 2), p_type, p_method_id,
          nullif(trim(coalesce(p_reference, '')), ''), nullif(trim(coalesce(p_notes, '')), ''))
  returning id into v_id;

  select * into a from private.rental_totals(p_rental_id);
  perform private.assert_money_rules(p_type, b.pending, b.deposit_balance, a.pending, a.deposit_balance);
  return v_id;
end;
$$;

-- =====================================================================
-- PUBLIC RPC FUNCTIONS
-- =====================================================================

-- ---------------------------------------------------------------------
-- car_out — Flow 2
-- ---------------------------------------------------------------------
create or replace function public.car_out(
  p_car_id               uuid,
  p_driver_name          text,
  p_driver_mobile        text,
  p_driver_license       text,
  p_guarantor_name       text,
  p_guarantor_mobile     text,
  p_rental_type          public.rent_period,
  p_agreed_rate          numeric,
  p_rent_amount          numeric,
  p_expected_return_date date,
  p_customer_id          uuid default null,
  p_out_at               timestamptz default null,
  p_payment_due_date     date default null,
  p_payment_due_amount   numeric default null,
  p_start_km             integer default null,
  p_fuel_out             public.fuel_level default null,
  p_notes                text default null,
  p_advance_amount       numeric default 0,
  p_advance_method_id    uuid default null,
  p_deposit_amount       numeric default 0,
  p_deposit_method_id    uuid default null
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_car        public.cars%rowtype;
  v_out_at     timestamptz := coalesce(p_out_at, now());
  v_out_date   date;
  v_mobile     text;
  v_customer   uuid;
  v_rental_id  uuid;
  v_number     text;
  v_due_date   date;
begin
  perform private.require_active();

  -- Lock the car so two users cannot send it out at the same moment
  select * into v_car from public.cars where id = p_car_id for update;
  if not found then
    raise exception 'Car not found' using errcode = 'P0002';
  end if;
  if v_car.status <> 'available' or v_car.archived_at is not null then
    raise exception 'Car % is no longer available', v_car.car_number using errcode = '23514';
  end if;

  if v_out_at > now() + interval '5 minutes' then
    raise exception 'Out date/time cannot be in the future' using errcode = '22023';
  end if;
  v_out_date := private.pkt_date(v_out_at);
  if p_expected_return_date is null or p_expected_return_date < v_out_date then
    raise exception 'Expected return date must be on or after the out date' using errcode = '22023';
  end if;

  v_mobile := private.normalize_mobile(p_driver_mobile);

  -- Customer: use the given one, or find by mobile, or create (decision Q6)
  if p_customer_id is not null then
    if exists (select 1 from public.customers
               where mobile = v_mobile and archived_at is null and id <> p_customer_id) then
      raise exception 'Mobile number % already belongs to another customer', v_mobile using errcode = '23505';
    end if;
    update public.customers
       set full_name = trim(p_driver_name), mobile = v_mobile, license_number = trim(p_driver_license)
     where id = p_customer_id and archived_at is null
    returning id into v_customer;
    if v_customer is null then
      raise exception 'Customer not found' using errcode = 'P0002';
    end if;
  else
    select id into v_customer from public.customers where mobile = v_mobile and archived_at is null;
    if v_customer is null then
      insert into public.customers (full_name, mobile, license_number)
      values (trim(p_driver_name), v_mobile, trim(p_driver_license))
      returning id into v_customer;
    else
      update public.customers
         set full_name = trim(p_driver_name), license_number = trim(p_driver_license)
       where id = v_customer;
    end if;
  end if;

  -- Next payment due (rule P-9)
  v_due_date := coalesce(
    p_payment_due_date,
    case when p_rental_type in ('daily', 'weekly') then p_expected_return_date
         else least((v_out_date + interval '1 month')::date, p_expected_return_date) end
  );

  insert into public.rentals (
    car_id, customer_id, branch_id,
    driver_name, driver_mobile, driver_license,
    guarantor_name, guarantor_mobile,
    out_at, expected_return_date, payment_due_date, payment_due_amount,
    start_km, fuel_out,
    rental_type, standard_rent_snapshot, agreed_rate, rent_amount,
    status, notes
  ) values (
    p_car_id, v_customer, v_car.branch_id,
    trim(p_driver_name), v_mobile, trim(p_driver_license),
    trim(p_guarantor_name), p_guarantor_mobile,
    v_out_at, p_expected_return_date, v_due_date, p_payment_due_amount,
    p_start_km, p_fuel_out,
    p_rental_type, v_car.standard_rent, p_agreed_rate, p_rent_amount,
    'out', nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id, rental_number into v_rental_id, v_number;

  perform private.set_ctx(null, 'Car Out ' || v_number, v_rental_id);
  update public.cars set status = 'on_rent' where id = p_car_id;
  perform private.clear_ctx();

  if coalesce(p_advance_amount, 0) > 0 then
    perform private.add_payment(v_rental_id, 'advance', p_advance_amount, least(v_out_date, private.today_pkt()),
                                p_advance_method_id, null, 'Advance at Car Out');
  end if;
  if coalesce(p_deposit_amount, 0) > 0 then
    perform private.add_payment(v_rental_id, 'deposit_taken', p_deposit_amount, least(v_out_date, private.today_pkt()),
                                p_deposit_method_id, null, 'Deposit at Car Out');
  end if;

  return v_rental_id;
end;
$$;

-- ---------------------------------------------------------------------
-- car_return — Flow 3
-- ---------------------------------------------------------------------
create or replace function public.car_return(
  p_rental_id                 uuid,
  p_returned_at               timestamptz default null,
  p_end_km                    integer default null,
  p_fuel_in                   public.fuel_level default null,
  p_rent_amount               numeric default null,
  p_fuel_charge               numeric default 0,
  p_damage_charge             numeric default 0,
  p_damage_notes              text default null,
  p_extra_km_charge           numeric default 0,
  p_other_charge              numeric default 0,
  p_other_charge_note         text default null,
  p_next_car_status           public.car_status default 'available',
  p_car_status_reason         text default null,
  p_deposit_used              numeric default 0,
  p_payment_amount            numeric default 0,
  p_payment_method_id         uuid default null,
  p_deposit_returned          numeric default 0,
  p_deposit_return_method_id  uuid default null,
  p_notes                     text default null
)
returns public.rental_status
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_r            public.rentals%rowtype;
  v_returned_at  timestamptz := coalesce(p_returned_at, now());
  v_pay_date     date;
begin
  perform private.require_active();

  select * into v_r from public.rentals where id = p_rental_id for update;
  if not found then
    raise exception 'Rental not found' using errcode = 'P0002';
  end if;
  if v_r.status <> 'out' then
    raise exception 'Only a rental that is Out can be returned (this one is %)', v_r.status using errcode = '23514';
  end if;
  if p_next_car_status not in ('available', 'maintenance') then
    raise exception 'After return the car must be Available or At Maintenance' using errcode = '22023';
  end if;
  if v_returned_at > now() + interval '5 minutes' then
    raise exception 'Return date/time cannot be in the future' using errcode = '22023';
  end if;
  if v_returned_at < v_r.out_at then
    raise exception 'Return date/time cannot be before the out date/time' using errcode = '22023';
  end if;
  if p_end_km is not null and v_r.start_km is not null and p_end_km < v_r.start_km then
    raise exception 'End KM (%) cannot be less than start KM (%)', p_end_km, v_r.start_km using errcode = '22023';
  end if;

  perform private.set_ctx('return', null, p_rental_id);
  update public.rentals set
    returned_at       = v_returned_at,
    end_km            = p_end_km,
    fuel_in           = p_fuel_in,
    rent_amount       = coalesce(p_rent_amount, rent_amount),
    fuel_charge       = coalesce(p_fuel_charge, 0),
    damage_charge     = coalesce(p_damage_charge, 0),
    damage_notes      = nullif(trim(coalesce(p_damage_notes, '')), ''),
    extra_km_charge   = coalesce(p_extra_km_charge, 0),
    other_charge      = coalesce(p_other_charge, 0),
    other_charge_note = nullif(trim(coalesce(p_other_charge_note, '')), ''),
    notes             = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
    status            = 'returned'
  where id = p_rental_id;

  perform private.set_ctx(null,
    coalesce(nullif(trim(coalesce(p_car_status_reason, '')), ''), 'Car Return ' || v_r.rental_number),
    p_rental_id);
  update public.cars set status = p_next_car_status where id = v_r.car_id;
  perform private.clear_ctx();

  v_pay_date := least(private.pkt_date(v_returned_at), private.today_pkt());

  -- Settle now (optional): use deposit, take payment, return deposit
  if coalesce(p_deposit_used, 0) > 0 then
    perform private.add_payment(p_rental_id, 'deposit_used', p_deposit_used, v_pay_date, null, null, 'Deposit used at return');
  end if;
  if coalesce(p_payment_amount, 0) > 0 then
    perform private.add_payment(p_rental_id, 'rent', p_payment_amount, v_pay_date, p_payment_method_id, null, 'Payment at return');
  end if;
  if coalesce(p_deposit_returned, 0) > 0 then
    perform private.add_payment(p_rental_id, 'deposit_returned', p_deposit_returned, v_pay_date,
                                p_deposit_return_method_id, null, 'Deposit returned');
  end if;

  return private.recalc_rental_status(p_rental_id);
end;
$$;

-- ---------------------------------------------------------------------
-- record_payment — Flow 4a (optionally sets the next due date, P-9)
-- ---------------------------------------------------------------------
create or replace function public.record_payment(
  p_rental_id        uuid,
  p_type             public.payment_type,
  p_amount           numeric,
  p_payment_date     date default null,
  p_method_id        uuid default null,
  p_reference        text default null,
  p_notes            text default null,
  p_next_due_date    date default null,
  p_next_due_amount  numeric default null
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  perform private.require_active();
  v_id := private.add_payment(p_rental_id, p_type, p_amount, coalesce(p_payment_date, private.today_pkt()),
                              p_method_id, p_reference, p_notes);
  if p_next_due_date is not null then
    update public.rentals
       set payment_due_date = p_next_due_date, payment_due_amount = p_next_due_amount
     where id = p_rental_id;
  end if;
  perform private.recalc_rental_status(p_rental_id);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- update_payment — Flow 4b (all users, reason required, audited; P-8)
-- Type cannot change: void and re-enter instead.
-- ---------------------------------------------------------------------
create or replace function public.update_payment(
  p_payment_id    uuid,
  p_amount        numeric,
  p_payment_date  date,
  p_method_id     uuid,
  p_reference     text,
  p_notes         text,
  p_reason        text
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_p       public.payments%rowtype;
  v_status  public.rental_status;
  b record;
  a record;
begin
  perform private.require_active();
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Please give a reason for the change (at least 5 characters)' using errcode = '22023';
  end if;

  select * into v_p from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;
  if v_p.is_voided then
    raise exception 'A voided payment cannot be edited' using errcode = '23514';
  end if;
  select status into v_status from public.rentals where id = v_p.rental_id for update;
  if v_status = 'void' then
    raise exception 'Payments of a void rental cannot be edited' using errcode = '23514';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Amount must be more than 0' using errcode = '22023';
  end if;

  perform private.check_payment_fields(v_p.rental_id, v_p.type, p_method_id, p_payment_date, v_p.method_id);

  select * into b from private.rental_totals(v_p.rental_id);

  perform private.set_ctx('update', trim(p_reason), v_p.rental_id);
  update public.payments set
    amount       = round(p_amount, 2),
    payment_date = p_payment_date,
    method_id    = p_method_id,
    reference    = nullif(trim(coalesce(p_reference, '')), ''),
    notes        = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_payment_id;
  perform private.clear_ctx();

  select * into a from private.rental_totals(v_p.rental_id);
  perform private.assert_money_rules(v_p.type, b.pending, b.deposit_balance, a.pending, a.deposit_balance);
  perform private.recalc_rental_status(v_p.rental_id);
end;
$$;

-- ---------------------------------------------------------------------
-- void_payment — Flow 4c (owner only)
-- ---------------------------------------------------------------------
create or replace function public.void_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_p public.payments%rowtype;
  b record;
  a record;
begin
  perform private.require_owner();
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Please give a reason for voiding (at least 5 characters)' using errcode = '22023';
  end if;

  select * into v_p from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;
  if v_p.is_voided then
    raise exception 'This payment is already voided' using errcode = '23514';
  end if;
  perform 1 from public.rentals where id = v_p.rental_id for update;

  select * into b from private.rental_totals(v_p.rental_id);

  perform private.set_ctx('void', trim(p_reason), v_p.rental_id);
  update public.payments set
    is_voided = true, void_reason = trim(p_reason), voided_at = now(), voided_by = auth.uid()
  where id = p_payment_id;
  perform private.clear_ctx();

  select * into a from private.rental_totals(v_p.rental_id);
  if a.deposit_balance < 0 and a.deposit_balance < b.deposit_balance then
    raise exception 'Voiding this would make the deposit balance negative. Void the "deposit used/returned" entries first'
      using errcode = '23514';
  end if;
  perform private.recalc_rental_status(v_p.rental_id);
end;
$$;

-- ---------------------------------------------------------------------
-- set_next_payment_due — rule P-9 (null amount = whole pending is due)
-- ---------------------------------------------------------------------
create or replace function public.set_next_payment_due(p_rental_id uuid, p_due_date date, p_due_amount numeric default null)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_status public.rental_status;
begin
  perform private.require_active();
  select status into v_status from public.rentals where id = p_rental_id for update;
  if not found then
    raise exception 'Rental not found' using errcode = 'P0002';
  end if;
  if v_status not in ('out', 'returned') then
    raise exception 'Due dates can only be set on rentals that are Out or Returned' using errcode = '23514';
  end if;
  if p_due_amount is not null and p_due_amount <= 0 then
    raise exception 'Due amount must be more than 0' using errcode = '22023';
  end if;
  update public.rentals set payment_due_date = p_due_date, payment_due_amount = p_due_amount
   where id = p_rental_id;
end;
$$;

-- ---------------------------------------------------------------------
-- update_rental — corrections and extensions (rule R-12), audited.
-- NULL parameter = keep current value.
-- ---------------------------------------------------------------------
create or replace function public.update_rental(
  p_rental_id             uuid,
  p_reason                text,
  p_expected_return_date  date default null,
  p_agreed_rate           numeric default null,
  p_rent_amount           numeric default null,
  p_fuel_charge           numeric default null,
  p_damage_charge         numeric default null,
  p_damage_notes          text default null,
  p_extra_km_charge       numeric default null,
  p_other_charge          numeric default null,
  p_other_charge_note     text default null,
  p_start_km              integer default null,
  p_end_km                integer default null,
  p_fuel_out              public.fuel_level default null,
  p_fuel_in               public.fuel_level default null,
  p_returned_at           timestamptz default null,
  p_guarantor_name        text default null,
  p_guarantor_mobile      text default null,
  p_notes                 text default null
)
returns public.rental_status
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_r public.rentals%rowtype;
begin
  perform private.require_active();
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Please give a reason for the change (at least 5 characters)' using errcode = '22023';
  end if;

  select * into v_r from public.rentals where id = p_rental_id for update;
  if not found then
    raise exception 'Rental not found' using errcode = 'P0002';
  end if;
  if v_r.status = 'void' then
    raise exception 'A void rental cannot be changed' using errcode = '23514';
  end if;
  if v_r.status = 'out' and (p_returned_at is not null or p_end_km is not null or p_fuel_in is not null) then
    raise exception 'Return details can only be set by returning the car' using errcode = '23514';
  end if;
  if p_returned_at is not null and p_returned_at > now() + interval '5 minutes' then
    raise exception 'Return date/time cannot be in the future' using errcode = '22023';
  end if;

  perform private.set_ctx('update', trim(p_reason), p_rental_id);
  update public.rentals set
    expected_return_date = coalesce(p_expected_return_date, expected_return_date),
    agreed_rate          = coalesce(p_agreed_rate, agreed_rate),
    rent_amount          = coalesce(p_rent_amount, rent_amount),
    fuel_charge          = coalesce(p_fuel_charge, fuel_charge),
    damage_charge        = coalesce(p_damage_charge, damage_charge),
    damage_notes         = coalesce(p_damage_notes, damage_notes),
    extra_km_charge      = coalesce(p_extra_km_charge, extra_km_charge),
    other_charge         = coalesce(p_other_charge, other_charge),
    other_charge_note    = coalesce(p_other_charge_note, other_charge_note),
    start_km             = coalesce(p_start_km, start_km),
    end_km               = coalesce(p_end_km, end_km),
    fuel_out             = coalesce(p_fuel_out, fuel_out),
    fuel_in              = coalesce(p_fuel_in, fuel_in),
    returned_at          = coalesce(p_returned_at, returned_at),
    guarantor_name       = coalesce(nullif(trim(coalesce(p_guarantor_name, '')), ''), guarantor_name),
    guarantor_mobile     = coalesce(nullif(trim(coalesce(p_guarantor_mobile, '')), ''), guarantor_mobile),
    notes                = coalesce(p_notes, notes)
  where id = p_rental_id;
  perform private.clear_ctx();

  return private.recalc_rental_status(p_rental_id);
end;
$$;

-- ---------------------------------------------------------------------
-- set_car_maintenance — Flow 1b (Available <-> At Maintenance only)
-- ---------------------------------------------------------------------
create or replace function public.set_car_maintenance(p_car_id uuid, p_to_maintenance boolean, p_reason text default null)
returns public.car_status
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_status public.car_status;
  v_target public.car_status := case when p_to_maintenance then 'maintenance' else 'available' end;
begin
  perform private.require_active();
  select status into v_status from public.cars where id = p_car_id for update;
  if not found then
    raise exception 'Car not found' using errcode = 'P0002';
  end if;
  if p_to_maintenance and v_status <> 'available' then
    raise exception 'Only an Available car can be sent to maintenance' using errcode = '23514';
  end if;
  if not p_to_maintenance and v_status <> 'maintenance' then
    raise exception 'Only a car At Maintenance can be marked Available' using errcode = '23514';
  end if;

  perform private.set_ctx(null,
    coalesce(nullif(trim(coalesce(p_reason, '')), ''),
             case when p_to_maintenance then 'Sent to maintenance' else 'Back from maintenance' end),
    null);
  update public.cars set status = v_target where id = p_car_id;
  perform private.clear_ctx();
  return v_target;
end;
$$;

-- ---------------------------------------------------------------------
-- sell_car — Flow 5 (owner only). Sold is final and archived.
-- ---------------------------------------------------------------------
create or replace function public.sell_car(
  p_car_id        uuid,
  p_sale_date     date,
  p_sale_price    numeric,
  p_buyer_name    text,
  p_buyer_mobile  text default null,
  p_buyer_cnic    text default null,
  p_notes         text default null
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_car public.cars%rowtype;
  v_id  uuid;
begin
  perform private.require_owner();
  select * into v_car from public.cars where id = p_car_id for update;
  if not found then
    raise exception 'Car not found' using errcode = 'P0002';
  end if;
  if v_car.status = 'sold' then
    raise exception 'This car is already sold' using errcode = '23514';
  end if;
  if v_car.status = 'on_rent' then
    raise exception 'Car % is On Rent. Return the car first', v_car.car_number using errcode = '23514';
  end if;
  if p_sale_date is null or p_sale_date > private.today_pkt() then
    raise exception 'Sale date is required and cannot be in the future' using errcode = '22023';
  end if;
  if p_sale_price is null or p_sale_price < 0 then
    raise exception 'Sale price is required' using errcode = '22023';
  end if;

  insert into public.sold_cars (car_id, sale_date, sale_price, buyer_name, buyer_mobile, buyer_cnic, notes)
  values (p_car_id, p_sale_date, p_sale_price, trim(p_buyer_name), p_buyer_mobile,
          nullif(trim(coalesce(p_buyer_cnic, '')), ''), nullif(trim(coalesce(p_notes, '')), ''))
  returning id into v_id;

  perform private.set_ctx('sell', 'Sold to ' || trim(p_buyer_name), null);
  update public.cars set status = 'sold', archived_at = coalesce(archived_at, now()) where id = p_car_id;
  perform private.clear_ctx();
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- void_rental — Flow 6 (owner only; data-entry mistakes)
-- ---------------------------------------------------------------------
create or replace function public.void_rental(p_rental_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_r public.rentals%rowtype;
begin
  perform private.require_owner();
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Please give a reason for voiding (at least 5 characters)' using errcode = '22023';
  end if;
  select * into v_r from public.rentals where id = p_rental_id for update;
  if not found then
    raise exception 'Rental not found' using errcode = 'P0002';
  end if;
  if v_r.status = 'void' then
    raise exception 'This rental is already void' using errcode = '23514';
  end if;
  if exists (select 1 from public.payments where rental_id = p_rental_id and not is_voided) then
    raise exception 'Void all payments of this rental first' using errcode = '23514';
  end if;

  if v_r.status = 'out' then
    perform private.set_ctx(null, 'Rental ' || v_r.rental_number || ' voided', p_rental_id);
    update public.cars set status = 'available' where id = v_r.car_id and status = 'on_rent';
  end if;

  perform private.set_ctx('void', trim(p_reason), p_rental_id);
  update public.rentals set
    status = 'void', void_reason = trim(p_reason), voided_at = now(), voided_by = auth.uid(), closed_at = null
  where id = p_rental_id;
  perform private.clear_ctx();
end;
$$;

-- ---------------------------------------------------------------------
-- archive_car / restore_car (owner only) — retire a car without selling
-- ---------------------------------------------------------------------
create or replace function public.archive_car(p_car_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_car public.cars%rowtype;
begin
  perform private.require_owner();
  select * into v_car from public.cars where id = p_car_id for update;
  if not found then
    raise exception 'Car not found' using errcode = 'P0002';
  end if;
  if v_car.status in ('on_rent', 'sold') then
    raise exception 'Cars that are On Rent or Sold cannot be archived' using errcode = '23514';
  end if;
  if v_car.archived_at is not null then
    raise exception 'Car is already archived' using errcode = '23514';
  end if;
  perform private.set_ctx('archive', nullif(trim(coalesce(p_reason, '')), ''), null);
  update public.cars set archived_at = now() where id = p_car_id;
  perform private.clear_ctx();
end;
$$;

create or replace function public.restore_car(p_car_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform private.require_owner();
  perform private.set_ctx('restore', null, null);
  update public.cars set archived_at = null where id = p_car_id and status <> 'sold' and archived_at is not null;
  if not found then
    raise exception 'Car cannot be restored' using errcode = '23514';
  end if;
  perform private.clear_ctx();
end;
$$;

-- ---------------------------------------------------------------------
-- archive_customer / restore_customer (owner only)
-- ---------------------------------------------------------------------
create or replace function public.archive_customer(p_customer_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform private.require_owner();
  if exists (select 1 from public.rentals where customer_id = p_customer_id and status = 'out') then
    raise exception 'This customer has a car out. Return it first' using errcode = '23514';
  end if;
  perform private.set_ctx('archive', nullif(trim(coalesce(p_reason, '')), ''), null);
  update public.customers set archived_at = now() where id = p_customer_id and archived_at is null;
  if not found then
    raise exception 'Customer not found or already archived' using errcode = 'P0002';
  end if;
  perform private.clear_ctx();
end;
$$;

create or replace function public.restore_customer(p_customer_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_mobile text;
begin
  perform private.require_owner();
  select mobile into v_mobile from public.customers where id = p_customer_id and archived_at is not null;
  if not found then
    raise exception 'Customer not found or not archived' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.customers where mobile = v_mobile and archived_at is null) then
    raise exception 'Another active customer already uses mobile %', v_mobile using errcode = '23505';
  end if;
  perform private.set_ctx('restore', null, null);
  update public.customers set archived_at = null where id = p_customer_id;
  perform private.clear_ctx();
end;
$$;

-- ---------------------------------------------------------------------
-- set_user_access — owner changes a user's role / active flag
-- ---------------------------------------------------------------------
create or replace function public.set_user_access(p_user_id uuid, p_role public.user_role, p_is_active boolean)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform private.require_owner();
  if p_user_id = auth.uid() and (p_role <> 'owner' or not p_is_active) then
    raise exception 'You cannot remove your own owner access' using errcode = '23514';
  end if;
  update public.profiles set role = p_role, is_active = p_is_active where id = p_user_id;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
end;
$$;
