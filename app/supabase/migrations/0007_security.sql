-- =====================================================================
-- 0007 — Row Level Security, privileges
-- See documentation/03_Database_Design.md §7
--
-- Model:
--   * anon (not logged in)  -> nothing at all
--   * authenticated         -> read everything IF profile is active
--                              write only the columns listed below
--   * rentals, payments, sold_cars, car status, history, audit
--                           -> only through the SECURITY DEFINER
--                              functions in 0006
--   * DELETE                -> nobody, on any table
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Start from zero
-- ---------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

-- Supabase grants new objects to anon/authenticated by default; stop that
-- for objects created by later migrations.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Enable RLS on every table
-- ---------------------------------------------------------------------
alter table public.branches           enable row level security;
alter table public.profiles           enable row level security;
alter table public.cars               enable row level security;
alter table public.car_status_history enable row level security;
alter table public.customers          enable row level security;
alter table public.payment_methods    enable row level security;
alter table public.rentals            enable row level security;
alter table public.payments           enable row level security;
alter table public.sold_cars          enable row level security;
alter table public.audit_log          enable row level security;

-- ---------------------------------------------------------------------
-- 3. Helpers used inside policies / views
-- ---------------------------------------------------------------------
grant usage on schema private to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.is_owner()       to authenticated;
grant execute on function private.today_pkt()      to authenticated;

-- ---------------------------------------------------------------------
-- 4. Read access (tables + views) for authenticated; RLS filters rows
-- ---------------------------------------------------------------------
grant select on all tables in schema public to authenticated;

create policy "active users read"  on public.branches           for select to authenticated using (private.is_active_user());
create policy "active users read"  on public.cars               for select to authenticated using (private.is_active_user());
create policy "active users read"  on public.car_status_history for select to authenticated using (private.is_active_user());
create policy "active users read"  on public.customers          for select to authenticated using (private.is_active_user());
create policy "active users read"  on public.payment_methods    for select to authenticated using (private.is_active_user());
create policy "active users read"  on public.rentals            for select to authenticated using (private.is_active_user());
create policy "active users read"  on public.payments           for select to authenticated using (private.is_active_user());
create policy "active users read"  on public.sold_cars          for select to authenticated using (private.is_active_user());
create policy "active users read"  on public.audit_log          for select to authenticated using (private.is_active_user());

-- A disabled user can still read their OWN profile (to show "Account disabled")
create policy "read own or active" on public.profiles for select to authenticated
  using (id = auth.uid() or private.is_active_user());

-- ---------------------------------------------------------------------
-- 5. Direct writes (column-limited)
-- ---------------------------------------------------------------------

-- cars: details only. status / archived_at / created_by are NOT writable.
grant insert (car_number, make, model, year, color, registered_to,
              standard_rent, standard_rent_period, insurance_expiry, notes)
  on public.cars to authenticated;
grant update (car_number, make, model, year, color, registered_to,
              standard_rent, standard_rent_period, insurance_expiry, notes)
  on public.cars to authenticated;

create policy "active users add cars" on public.cars for insert to authenticated
  with check (private.is_active_user());
create policy "active users edit unsold cars" on public.cars for update to authenticated
  using (private.is_active_user() and status <> 'sold')
  with check (private.is_active_user());

-- customers
grant insert (full_name, mobile, license_number, cnic, notes) on public.customers to authenticated;
grant update (full_name, mobile, license_number, cnic, notes) on public.customers to authenticated;

create policy "active users add customers" on public.customers for insert to authenticated
  with check (private.is_active_user());
create policy "active users edit customers" on public.customers for update to authenticated
  using (private.is_active_user()) with check (private.is_active_user());

-- rentals: only free-text notes directly; everything else via functions
grant update (notes) on public.rentals to authenticated;
create policy "active users edit rental notes" on public.rentals for update to authenticated
  using (private.is_active_user()) with check (private.is_active_user());

-- profiles: own name / language only (role & active via set_user_access)
grant update (full_name, preferred_language) on public.profiles to authenticated;
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = auth.uid() and private.is_active_user())
  with check (id = auth.uid());

-- payment_methods: owner manages the list
grant insert (code, name, is_active, sort_order) on public.payment_methods to authenticated;
grant update (name, is_active, sort_order)       on public.payment_methods to authenticated;
create policy "owner adds methods" on public.payment_methods for insert to authenticated
  with check (private.is_owner());
create policy "owner edits methods" on public.payment_methods for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

-- branches: read only in Phase 1

-- No policy or privilege for: INSERT/UPDATE on payments, sold_cars,
-- car_status_history, audit_log; INSERT on rentals; DELETE anywhere.

-- ---------------------------------------------------------------------
-- 6. RPC functions callable by logged-in users (each checks role itself)
-- ---------------------------------------------------------------------
grant execute on function public.car_out(uuid, text, text, text, text, text, public.rent_period, numeric, numeric, date,
                                         uuid, timestamptz, date, numeric, integer, public.fuel_level, text,
                                         numeric, uuid, numeric, uuid) to authenticated;
grant execute on function public.car_return(uuid, timestamptz, integer, public.fuel_level, numeric, numeric, numeric, text,
                                            numeric, numeric, text, public.car_status, text, numeric, numeric, uuid,
                                            numeric, uuid, text) to authenticated;
grant execute on function public.record_payment(uuid, public.payment_type, numeric, date, uuid, text, text, date, numeric) to authenticated;
grant execute on function public.update_payment(uuid, numeric, date, uuid, text, text, text) to authenticated;
grant execute on function public.void_payment(uuid, text) to authenticated;
grant execute on function public.set_next_payment_due(uuid, date, numeric) to authenticated;
grant execute on function public.update_rental(uuid, text, date, numeric, numeric, numeric, numeric, text, numeric, numeric, text,
                                               integer, integer, public.fuel_level, public.fuel_level, timestamptz, text, text, text) to authenticated;
grant execute on function public.set_car_maintenance(uuid, boolean, text) to authenticated;
grant execute on function public.sell_car(uuid, date, numeric, text, text, text, text) to authenticated;
grant execute on function public.void_rental(uuid, text) to authenticated;
grant execute on function public.archive_car(uuid, text) to authenticated;
grant execute on function public.restore_car(uuid) to authenticated;
grant execute on function public.archive_customer(uuid, text) to authenticated;
grant execute on function public.restore_customer(uuid) to authenticated;
grant execute on function public.set_user_access(uuid, public.user_role, boolean) to authenticated;
