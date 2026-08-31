-- COMMONS Security Hardening Migration
-- Applies idempotent fixes to the initial schema.
-- Run this after 001_initial_schema.sql.

-- 1. Drop the overly broad users_select_all policy that exposed every user's email.
--    A user can still read and update their own profile via users_select_own / users_update_own.
--    Public display information (id + display_name) will be exposed through a dedicated view
--    when the assignment UI is implemented.
drop policy if exists "users_select_all" on public.users;

-- 2. Fix recursive RLS evaluation on project_members.
--    The old pm_select_members policy queried public.project_members from within a policy
--    on public.project_members, which is recursive. Replace it with a direct ownership check
--    on public.projects plus self-read.
drop policy if exists "pm_select_members" on public.project_members;
create policy "pm_select_members" on public.project_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_members.project_id and p.created_by = auth.uid()
    )
  );

-- 3. Ensure project ownership cannot be transferred through the update policy.
drop policy if exists "projects_update_owner" on public.projects;
create policy "projects_update_owner" on public.projects
  for update using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- 4. Require a measurement source for every KPI reading.
--    The product rule is that real measurements must be sourced. Null sources are no longer allowed.
alter table public.kpi_measurements alter column source set not null;

-- 5. Automatic updated_at trigger for tables that track modification time.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- 6. Trigger to create the public user/profile row after Supabase Auth signup.
--    The public.users table extends auth.users with display_name and timestamps.
--    This trigger runs as a security definer with a minimal search_path.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_auth_users_insert on auth.users;
create trigger trg_auth_users_insert
  after insert on auth.users
  for each row execute function public.handle_new_user();
