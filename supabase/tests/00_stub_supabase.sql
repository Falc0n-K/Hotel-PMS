-- Reproduit le strict nécessaire de Supabase (rôles, auth.users, auth.uid())
-- pour exécuter les migrations et les tests sur un Postgres nu, en CI.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
-- Comme sur Supabase, les extensions vivent dans le schéma « extensions ».
do $$ begin
  execute format('alter database %I set search_path = "$user", public, extensions', current_database());
end $$;
create schema auth;
create schema extensions;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public, extensions to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
alter default privileges in schema public grant all on tables to authenticated, anon;
alter default privileges in schema public grant execute on functions to authenticated;
