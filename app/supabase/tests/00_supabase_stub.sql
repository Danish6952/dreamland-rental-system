-- =====================================================================
-- LOCAL TESTING ONLY — never run this on Supabase.
-- Recreates the small part of Supabase that the migrations depend on
-- (auth schema, auth.uid(), API roles, extensions schema) so the
-- migrations can be tested on a plain PostgreSQL 15+/16 server.
-- =====================================================================
create schema if not exists extensions;
create schema if not exists auth;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon')          then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create table auth.users (
  id                  uuid primary key,
  email               text,
  raw_user_meta_data  jsonb default '{}'::jsonb
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema public, auth, extensions to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
