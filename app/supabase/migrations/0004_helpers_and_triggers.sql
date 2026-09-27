-- =====================================================================
-- 0004 — Helper functions and triggers
--   * auth / role helpers used by RLS and RPC functions
--   * timestamps (updated_at / updated_by)
--   * mobile number normalization (rule V-5)
--   * car status guard + status history (rules C-3 … C-9)
--   * audit log (NFR-05)
--   * profile creation for new auth users
-- =====================================================================

-- ---------------------------------------------------------------------
-- Auth / role helpers
-- ---------------------------------------------------------------------
create or replace function private.is_active_user()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active);
$$;

create or replace function private.is_owner()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active and role = 'owner');
$$;

create or replace function private.require_active()
returns void
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not private.is_active_user() then
    raise exception 'You are not signed in or your account is disabled' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.require_owner()
returns void
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not private.is_owner() then
    raise exception 'Only the owner can do this' using errcode = '42501';
  end if;
end;
$$;

-- "Today" in Pakistan time — used for all date rules and alerts
create or replace function private.today_pkt()
returns date
language sql stable
as $$
  select (now() at time zone 'Asia/Karachi')::date;
$$;

create or replace function private.pkt_date(p_ts timestamptz)
returns date
language sql immutable
as $$
  select (p_ts at time zone 'Asia/Karachi')::date;
$$;

-- Format money for error messages: 45000 -> "Rs 45,000"
create or replace function private.rs(p_amount numeric)
returns text
language sql immutable
as $$
  select 'Rs ' || trim(to_char(round(p_amount), 'FM999,999,999,990'));
$$;

-- ---------------------------------------------------------------------
-- Mobile normalization: accepts 03XXXXXXXXX, 3XXXXXXXXX, 923XXXXXXXXX,
-- +92 3XX XXXXXXX, 0300-1234567 … and stores 03XXXXXXXXX (rule V-5)
-- ---------------------------------------------------------------------
create or replace function private.normalize_mobile(p text)
returns text
language plpgsql immutable
as $$
declare
  v text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if v ~ '^92[0-9]{10}$' then
    v := '0' || substr(v, 3);
  elsif v ~ '^3[0-9]{9}$' then
    v := '0' || v;
  end if;
  if v !~ '^03[0-9]{9}$' then
    raise exception 'Invalid mobile number "%". Use the format 03XXXXXXXXX', p using errcode = '22023';
  end if;
  return v;
end;
$$;

create or replace function private.trg_normalize_customer_mobile()
returns trigger language plpgsql as $$
begin
  new.mobile := private.normalize_mobile(new.mobile);
  return new;
end;
$$;

create or replace function private.trg_normalize_rental_mobiles()
returns trigger language plpgsql as $$
begin
  new.driver_mobile    := private.normalize_mobile(new.driver_mobile);
  new.guarantor_mobile := private.normalize_mobile(new.guarantor_mobile);
  return new;
end;
$$;

create or replace function private.trg_normalize_buyer_mobile()
returns trigger language plpgsql as $$
begin
  if nullif(trim(coalesce(new.buyer_mobile, '')), '') is null then
    new.buyer_mobile := null;
  else
    new.buyer_mobile := private.normalize_mobile(new.buyer_mobile);
  end if;
  return new;
end;
$$;

create trigger customers_normalize_mobile
  before insert or update of mobile on public.customers
  for each row execute function private.trg_normalize_customer_mobile();

create trigger rentals_normalize_mobiles
  before insert or update of driver_mobile, guarantor_mobile on public.rentals
  for each row execute function private.trg_normalize_rental_mobiles();

create trigger sold_cars_normalize_mobile
  before insert or update of buyer_mobile on public.sold_cars
  for each row execute function private.trg_normalize_buyer_mobile();

-- ---------------------------------------------------------------------
-- Timestamps
-- ---------------------------------------------------------------------
create or replace function private.trg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- For tables that also track who made the change
create or replace function private.trg_set_updated_by()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger branches_updated        before update on public.branches        for each row execute function private.trg_set_updated_at();
create trigger profiles_updated        before update on public.profiles        for each row execute function private.trg_set_updated_at();
create trigger payment_methods_updated before update on public.payment_methods for each row execute function private.trg_set_updated_at();
create trigger cars_updated            before update on public.cars            for each row execute function private.trg_set_updated_by();
create trigger customers_updated       before update on public.customers       for each row execute function private.trg_set_updated_by();
create trigger rentals_updated         before update on public.rentals         for each row execute function private.trg_set_updated_by();
create trigger payments_updated        before update on public.payments        for each row execute function private.trg_set_updated_by();

-- ---------------------------------------------------------------------
-- Transaction-local context used by business functions to pass a
-- reason / action / rental into the audit and status-history triggers.
-- ---------------------------------------------------------------------
create or replace function private.set_ctx(p_action text default null, p_reason text default null, p_rental_id uuid default null)
returns void language plpgsql as $$
begin
  perform set_config('app.audit_action', coalesce(p_action, ''), true);
  perform set_config('app.audit_reason', coalesce(p_reason, ''), true);
  perform set_config('app.rental_id',    coalesce(p_rental_id::text, ''), true);
end;
$$;

create or replace function private.clear_ctx()
returns void language plpgsql as $$
begin
  perform private.set_ctx(null, null, null);
end;
$$;

-- ---------------------------------------------------------------------
-- Car status guard (rules C-3 … C-8)
-- Clients cannot update cars.status at all (column privileges, 0007);
-- this trigger additionally guarantees only legal transitions happen,
-- even from inside business functions.
-- ---------------------------------------------------------------------
create or replace function private.trg_cars_guard()
returns trigger language plpgsql as $$
begin
  if old.status = 'sold' then
    raise exception 'Sold cars are archived and cannot be changed' using errcode = '23514';
  end if;

  if new.status is distinct from old.status then
    if not (
         (old.status = 'available'   and new.status in ('on_rent', 'maintenance', 'sold'))
      or (old.status = 'maintenance' and new.status in ('available', 'sold'))
      or (old.status = 'on_rent'     and new.status in ('available', 'maintenance'))
    ) then
      raise exception 'A car cannot change from % to %', old.status, new.status using errcode = '23514';
    end if;
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

create trigger cars_guard before update on public.cars
  for each row execute function private.trg_cars_guard();

create or replace function private.trg_cars_status_history()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into public.car_status_history (car_id, from_status, to_status, reason, changed_by)
    values (new.id, null, new.status, 'Car added', auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.car_status_history (car_id, from_status, to_status, reason, rental_id, changed_by)
    values (
      new.id, old.status, new.status,
      nullif(current_setting('app.audit_reason', true), ''),
      nullif(current_setting('app.rental_id', true), '')::uuid,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger cars_status_history after insert or update of status on public.cars
  for each row execute function private.trg_cars_status_history();

-- ---------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------
create or replace function private.trg_audit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_old jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
  v_new jsonb := to_jsonb(new);
begin
  -- Skip no-op updates (only timestamps changed)
  if tg_op = 'UPDATE'
     and (v_old - 'updated_at' - 'updated_by') = (v_new - 'updated_at' - 'updated_by') then
    return new;
  end if;

  insert into public.audit_log (table_name, record_id, action, old_data, new_data, reason, changed_by)
  values (
    tg_table_name,
    (v_new ->> 'id')::uuid,
    coalesce(nullif(current_setting('app.audit_action', true), ''), lower(tg_op)),
    v_old,
    v_new,
    nullif(current_setting('app.audit_reason', true), ''),
    auth.uid()
  );
  return new;
end;
$$;

create trigger cars_audit      after insert or update on public.cars      for each row execute function private.trg_audit();
create trigger customers_audit after insert or update on public.customers for each row execute function private.trg_audit();
create trigger rentals_audit   after insert or update on public.rentals   for each row execute function private.trg_audit();
create trigger payments_audit  after insert or update on public.payments  for each row execute function private.trg_audit();
create trigger sold_cars_audit after insert or update on public.sold_cars for each row execute function private.trg_audit();
create trigger profiles_audit  after update on public.profiles            for each row execute function private.trg_audit();
create trigger payment_methods_audit after insert or update on public.payment_methods for each row execute function private.trg_audit();

-- ---------------------------------------------------------------------
-- New auth user -> profile. The very first user becomes the owner;
-- everyone after that starts as staff (the owner can promote them).
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    case when exists (select 1 from public.profiles where role = 'owner') then 'staff' else 'owner' end::public.user_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();
