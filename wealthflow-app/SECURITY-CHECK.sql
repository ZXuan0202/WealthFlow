-- READ ONLY security check. Run in Supabase SQL Editor if uncertain.
-- Expect relrowsecurity=true. Do not share private table rows.
select c.relname as table_name,c.relrowsecurity as rls_enabled
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='finance_records';
select policyname,cmd,roles,qual,with_check from pg_policies
  where schemaname='public' and tablename='finance_records'
  order by policyname;
select grantee,privilege_type from information_schema.role_table_grants
  where table_schema='public' and table_name='finance_records'
    and grantee in ('anon','authenticated') order by grantee,privilege_type;
-- anon must NOT have table privileges. Authenticated should have only SELECT,INSERT,UPDATE,DELETE.
