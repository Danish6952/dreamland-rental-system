-- LOCAL STACK ONLY: the roles/schemas Supabase normally provides
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit password 'local-dev';
grant anon, authenticated, service_role to authenticator;
create role supabase_auth_admin login createrole password 'local-dev';
create schema auth authorization supabase_auth_admin;
grant create on database postgres to supabase_auth_admin;
alter role supabase_auth_admin set search_path = auth;
create schema extensions;
grant usage on schema public, extensions to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
