-- Habit Tracker database setup.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- It's safe to run again; it won't delete anything.

-- One row per user, holding all of their habits, check-ins, challenge and tree progress.
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: nobody can read or write any row unless a policy below allows it.
alter table public.user_state enable row level security;

-- Each signed-in user can only see, add and change THEIR OWN row.
drop policy if exists "Users can read their own state" on public.user_state;
create policy "Users can read their own state"
  on public.user_state for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own state" on public.user_state;
create policy "Users can insert their own state"
  on public.user_state for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own state" on public.user_state;
create policy "Users can update their own state"
  on public.user_state for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own state" on public.user_state;
create policy "Users can delete their own state"
  on public.user_state for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Signed-in users can reach the table through the API (the policies above still limit them
-- to their own row). Guests and signed-out visitors get no access at all.
grant select, insert, update, delete on public.user_state to authenticated;
revoke all on public.user_state from anon;

-- Stop one account from storing a huge amount of data (about 200 KB is years of habits).
alter table public.user_state drop constraint if exists user_state_size_limit;
alter table public.user_state
  add constraint user_state_size_limit check (pg_column_size(state) < 200000);
