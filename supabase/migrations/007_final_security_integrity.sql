-- COMMONS Final Security & Integrity Migration
-- Run AFTER all prior migrations (001-006). This file is strictly additive
-- and hardening: it tightens RLS, protects append-only audit tables, validates
-- project status transitions, and revokes public execution on trigger functions.

-- =====================================================================
-- 1. Protect trigger/helper functions from direct RPC invocation.
--    They are still invoked by PostgreSQL triggers and RLS policies.
-- =====================================================================
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.increment_corroboration_count() from public, anon, authenticated;
revoke execute on function public.mark_project_verified() from public, anon, authenticated;
revoke execute on function public.log_project_status(uuid, uuid, text, jsonb) from public, anon, authenticated;

-- =====================================================================
-- 2. Fix civic-trust RLS gaps.
-- =====================================================================

-- Verification reviews should be readable by the project submitter too,
-- so the trust timeline can disclose that a review exists without leaking
-- the reviewer's identity beyond what the submitter already sees in the UI.
drop policy if exists "pvr_select" on public.project_verification_review;
create policy "pvr_select" on public.project_verification_review
  for select using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_verification_review.project_id
        and pm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.projects p
      where p.id = project_verification_review.project_id
        and p.created_by = auth.uid()
    )
    or reviewer_id = auth.uid()
    or submitter_id = auth.uid()
  );

-- Allow only one fully-approved verification review per project. This keeps
-- the denormalised community_verified flag deterministic and prevents
-- duplicate "Verified" badges from being recorded.
create unique index if not exists idx_project_verification_one_approval
  on public.project_verification_review (project_id)
  where all_approved = true;

-- =====================================================================
-- 3. Enforce valid project status transitions at the database layer.
-- =====================================================================
create or replace function public.validate_project_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- If the status is not changing, allow the update (e.g. coordinate patch).
  if old.status = new.status then
    return new;
  end if;

  -- Allowed lifecycle: draft -> active -> completed or archived.
  -- Archiving is permitted from active or completed states.
  if old.status = 'draft' and new.status = 'active' then
    return new;
  elsif old.status = 'active' and new.status in ('completed', 'archived') then
    return new;
  elsif old.status = 'completed' and new.status = 'archived' then
    return new;
  else
    raise exception 'Invalid project status transition: % -> %', old.status, new.status
      using errcode = 'check_violation';
  end if;
end;
$$;

revoke execute on function public.validate_project_status_transition() from public, anon, authenticated;

drop trigger if exists trg_projects_status_transition on public.projects;
create trigger trg_projects_status_transition
  before update of status on public.projects
  for each row execute function public.validate_project_status_transition();

-- =====================================================================
-- 4. Make audit tables strictly append-only.
-- =====================================================================
create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception '% records are append-only and cannot be modified or deleted.', tg_table_name
    using errcode = 'insufficient_privilege';
end;
$$;

revoke execute on function public.prevent_audit_mutation() from public, anon, authenticated;

drop trigger if exists trg_audit_events_append_only on public.audit_events;
create trigger trg_audit_events_append_only
  before update or delete on public.audit_events
  for each row execute function public.prevent_audit_mutation();

drop trigger if exists trg_project_status_history_append_only on public.project_status_history;
create trigger trg_project_status_history_append_only
  before update or delete on public.project_status_history
  for each row execute function public.prevent_audit_mutation();

-- =====================================================================
-- 5. Additional integrity indexes to support RLS lookups.
-- =====================================================================
create index if not exists idx_projects_created_by on public.projects(created_by);
create index if not exists idx_evidence_contributed_by on public.evidence(contributed_by);
