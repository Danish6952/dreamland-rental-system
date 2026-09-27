-- =====================================================================
-- 0002 — Tables
-- See documentation/03_Database_Design.md §3
-- Money: numeric(12,2) PKR. Nothing is ever hard-deleted.
-- =====================================================================

-- ---------------------------------------------------------------------
-- branches (Phase 1 has exactly one; ready for multi-branch)
-- ---------------------------------------------------------------------
create table public.branches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 2 and 80),
  address     text,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- profiles — one row per auth user (created by trigger)
-- ---------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete restrict,
  full_name           text not null check (length(trim(full_name)) between 1 and 80),
  role                public.user_role not null default 'staff',
  is_active           boolean not null default true,
  preferred_language  text not null default 'en' check (preferred_language in ('en', 'ur')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- cars
-- ---------------------------------------------------------------------
create table public.cars (
  id                     uuid primary key default gen_random_uuid(),
  branch_id              uuid not null default '00000000-0000-0000-0000-000000000001'
                           references public.branches (id),
  car_number             text not null check (car_number ~ '^[A-Za-z0-9 -]{2,20}$'),
  car_number_normalized  text generated always as
                           (upper(regexp_replace(car_number, '[^A-Za-z0-9]', '', 'g'))) stored,
  make                   text check (make is null or length(make) <= 40),
  model                  text not null check (length(trim(model)) between 1 and 60),
  year                   smallint check (year between 1980 and 2100),
  color                  text check (color is null or length(color) <= 30),
  registered_to          text check (registered_to is null or length(registered_to) <= 80),
  standard_rent          numeric(12,2) not null check (standard_rent between 0 and 10000000),
  standard_rent_period   public.rent_period not null default 'monthly',
  insurance_expiry       date,
  status                 public.car_status not null default 'available',
  status_changed_at      timestamptz not null default now(),
  notes                  text,
  archived_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid default auth.uid() references public.profiles (id),
  updated_by             uuid references public.profiles (id),
  constraint cars_sold_is_archived check (status <> 'sold' or archived_at is not null)
);

-- ---------------------------------------------------------------------
-- customers (drivers)
-- ---------------------------------------------------------------------
create table public.customers (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null check (length(trim(full_name)) between 2 and 80),
  mobile          text not null check (mobile ~ '^03[0-9]{9}$'),
  license_number  text not null check (length(trim(license_number)) between 3 and 30),
  cnic            text,
  notes           text,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid default auth.uid() references public.profiles (id),
  updated_by      uuid references public.profiles (id)
);

-- ---------------------------------------------------------------------
-- payment_methods (owner-managed list)
-- ---------------------------------------------------------------------
create table public.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[a-z][a-z0-9_]{1,30}$'),
  name        text not null check (length(trim(name)) between 2 and 60),
  is_active   boolean not null default true,
  sort_order  smallint not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- rentals
-- ---------------------------------------------------------------------
create sequence public.rental_number_seq;

create table public.rentals (
  id                      uuid primary key default gen_random_uuid(),
  rental_number           text not null unique
                            default ('DR-' || lpad(nextval('public.rental_number_seq')::text, 4, '0')),
  branch_id               uuid not null default '00000000-0000-0000-0000-000000000001'
                            references public.branches (id),
  car_id                  uuid not null references public.cars (id),
  customer_id             uuid not null references public.customers (id),

  -- driver snapshot (copied at Car Out; rule R-10)
  driver_name             text not null check (length(trim(driver_name)) between 2 and 80),
  driver_mobile           text not null check (driver_mobile ~ '^03[0-9]{9}$'),
  driver_license          text not null check (length(trim(driver_license)) between 3 and 30),

  -- guarantor (required; rule R-9)
  guarantor_name          text not null check (length(trim(guarantor_name)) between 2 and 80),
  guarantor_mobile        text not null check (guarantor_mobile ~ '^03[0-9]{9}$'),

  -- dates
  out_at                  timestamptz not null,
  expected_return_date    date not null,
  returned_at             timestamptz,
  payment_due_date        date,                 -- next payment due (rule P-9)
  payment_due_amount      numeric(12,2) check (payment_due_amount is null or payment_due_amount > 0),

  -- kilometers & fuel (all optional)
  start_km                integer check (start_km >= 0),
  end_km                  integer check (end_km >= 0),
  fuel_out                public.fuel_level,
  fuel_in                 public.fuel_level,

  -- rent values
  rental_type             public.rent_period not null,
  standard_rent_snapshot  numeric(12,2),
  agreed_rate             numeric(12,2) not null check (agreed_rate between 0 and 10000000),
  rent_amount             numeric(12,2) not null check (rent_amount between 0 and 100000000),

  -- charges
  fuel_charge             numeric(12,2) not null default 0 check (fuel_charge between 0 and 10000000),
  damage_charge           numeric(12,2) not null default 0 check (damage_charge between 0 and 10000000),
  damage_notes            text,
  extra_km_charge         numeric(12,2) not null default 0 check (extra_km_charge between 0 and 10000000),
  other_charge            numeric(12,2) not null default 0 check (other_charge between 0 and 10000000),
  other_charge_note       text,
  total_bill              numeric(14,2) generated always as
                            (rent_amount + fuel_charge + damage_charge + extra_km_charge + other_charge) stored,

  -- status
  status                  public.rental_status not null default 'out',
  closed_at               timestamptz,
  notes                   text,
  void_reason             text,
  voided_at               timestamptz,
  voided_by               uuid references public.profiles (id),

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid default auth.uid() references public.profiles (id),
  updated_by              uuid references public.profiles (id),

  constraint rentals_km_order        check (end_km is null or start_km is null or end_km >= start_km),
  constraint rentals_return_after_out check (returned_at is null or returned_at >= out_at),
  constraint rentals_expected_after_out
    check (expected_return_date >= (out_at at time zone 'Asia/Karachi')::date),
  constraint rentals_returned_has_date
    check (status not in ('returned', 'closed') or returned_at is not null),
  constraint rentals_other_charge_note
    check (other_charge = 0 or length(trim(coalesce(other_charge_note, ''))) > 0),
  constraint rentals_void_reason     check (status <> 'void' or void_reason is not null)
);

-- ---------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------
create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  rental_id     uuid not null references public.rentals (id),
  payment_date  date not null,
  amount        numeric(12,2) not null check (amount > 0 and amount <= 100000000),
  type          public.payment_type not null,
  method_id     uuid references public.payment_methods (id),
  reference     text check (reference is null or length(reference) <= 80),
  notes         text,
  is_voided     boolean not null default false,
  void_reason   text,
  voided_at     timestamptz,
  voided_by     uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid default auth.uid() references public.profiles (id),
  updated_by    uuid references public.profiles (id),

  -- "Deposit used" is an internal transfer: no method. Everything else needs one.
  constraint payments_method_rule check ((type = 'deposit_used') = (method_id is null)),
  constraint payments_void_reason check (not is_voided or void_reason is not null)
);

-- ---------------------------------------------------------------------
-- sold_cars
-- ---------------------------------------------------------------------
create table public.sold_cars (
  id            uuid primary key default gen_random_uuid(),
  car_id        uuid not null unique references public.cars (id),
  sale_date     date not null,
  sale_price    numeric(12,2) not null check (sale_price between 0 and 1000000000),
  buyer_name    text not null check (length(trim(buyer_name)) between 2 and 80),
  buyer_mobile  text check (buyer_mobile is null or buyer_mobile ~ '^03[0-9]{9}$'),
  buyer_cnic    text,
  notes         text,
  created_at    timestamptz not null default now(),
  created_by    uuid default auth.uid() references public.profiles (id)
);

-- ---------------------------------------------------------------------
-- car_status_history
-- ---------------------------------------------------------------------
create table public.car_status_history (
  id           bigint generated always as identity primary key,
  car_id       uuid not null references public.cars (id),
  from_status  public.car_status,
  to_status    public.car_status not null,
  reason       text,
  rental_id    uuid references public.rentals (id),
  changed_by   uuid references public.profiles (id),
  changed_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- audit_log (append-only)
-- ---------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   uuid not null,
  action      text not null,
  old_data    jsonb,
  new_data    jsonb,
  reason      text,
  changed_by  uuid references public.profiles (id),
  changed_at  timestamptz not null default now()
);
