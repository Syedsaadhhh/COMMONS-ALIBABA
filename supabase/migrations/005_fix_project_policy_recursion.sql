create or replace function public.is_project_member(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.project_members as pm
    where pm.project_id = target_project_id
      and pm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_project_member(uuid) from public;
grant execute on function public.is_project_member(uuid) to authenticated;

drop policy if exists projects_select_members on public.projects;
create policy projects_select_members
on public.projects
for select
using (
  created_by = auth.uid()
  or public.is_project_member(id)
);
