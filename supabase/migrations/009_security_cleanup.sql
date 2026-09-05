-- COMMONS security cleanup
-- Run AFTER 008_proof_loop.sql.
--
-- Keeps the RLS membership helper out of the exposed public API schema,
-- tightens grants for the civic-trust/proof-loop tables, and adds covering
-- indexes for foreign keys used by authorization and timeline queries.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_project_member(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.project_members as pm
    where pm.project_id = target_project_id
      and pm.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_project_member(uuid) from public, anon;
grant execute on function private.is_project_member(uuid) to authenticated;

-- Replace the public SECURITY DEFINER helper with the non-exposed helper.
drop policy if exists projects_select_members on public.projects;
create policy projects_select_members
on public.projects
for select
to authenticated
using (
  created_by = (select auth.uid())
  or (select private.is_project_member(id))
);

drop function if exists public.is_project_member(uuid);

-- The status-history writer is service-only. Express that with the policy
-- target role rather than auth.role(), which is deprecated and ambiguous
-- with anonymous Supabase Auth sessions.
drop policy if exists "psh_insert_service" on public.project_status_history;
create policy "psh_insert_service" on public.project_status_history
  for insert
  to service_role
  with check (true);

-- Explicit Data API privileges for the trust/proof-loop tables. RLS still
-- controls which rows an authenticated session can read or append.
grant select, insert on table public.project_corroboration to authenticated;
grant select, insert on table public.project_verification_review to authenticated;
grant select on table public.project_status_history to authenticated;
grant select, insert on table public.task_evidence_claims to authenticated;

-- Cover foreign keys highlighted by the database advisor.
create index if not exists idx_tasks_assigned_to
  on public.tasks(assigned_to);
create index if not exists idx_kpi_measurements_recorded_by
  on public.kpi_measurements(recorded_by);
create index if not exists idx_evidence_reviews_reviewer_id
  on public.evidence_reviews(reviewer_id);
create index if not exists idx_audit_events_actor_id
  on public.audit_events(actor_id);
create index if not exists idx_project_status_history_actor_id
  on public.project_status_history(actor_id);
create index if not exists idx_project_verification_submitter_id
  on public.project_verification_review(submitter_id);
create index if not exists idx_task_evidence_claims_claimed_by
  on public.task_evidence_claims(claimed_by);
