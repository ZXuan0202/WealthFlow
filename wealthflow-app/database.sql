-- Run this once in your Supabase project's SQL Editor.
-- Supabase Auth manages passwords; this table holds only your personal finance records.
create table if not exists public.finance_records (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('accounts', 'transactions', 'investments', 'debts', 'goals', 'settings')),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists finance_records_user_idx on public.finance_records (user_id, kind);
alter table public.finance_records enable row level security;

-- Required on new Supabase projects (2026): explicit Data API grants.
-- Financial records are accessible only to authenticated users,
-- and the per-user RLS policies below limit them to their own rows.
revoke all on table public.finance_records from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.finance_records to authenticated;

drop policy if exists "finance_select_own" on public.finance_records;
create policy "finance_select_own" on public.finance_records for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "finance_insert_own" on public.finance_records;
create policy "finance_insert_own" on public.finance_records for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "finance_update_own" on public.finance_records;
create policy "finance_update_own" on public.finance_records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "finance_delete_own" on public.finance_records;
create policy "finance_delete_own" on public.finance_records for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.finance_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists finance_records_updated_at on public.finance_records;
create trigger finance_records_updated_at before update on public.finance_records
for each row execute function public.finance_touch_updated_at();

-- Enable instant cross-device notifications. Polling works even if this command is skipped.
do $$ begin
  alter publication supabase_realtime add table public.finance_records;
exception when duplicate_object then null;
end $$;
