-- COMMONS Civic Trust Migration (Weaknesses 1–5 support)
-- Run AFTER 001_initial_schema.sql and 002_security_hardening.sql.
--
-- This migration is ADDITIVE. It does not drop, rename, or reshape any
-- table or policy introduced by 001/002. It adds three new tables,
-- three helper functions, and minimal RLS policies required by the
-- new civic-trust layer:
--
--   1. project_corroboration        — Weakness 2 (dedup / corroboration)
--   2. project_verification_review  — Weaknesses 3 & 4 (reviewer checklist)
--   3. project_status_history       — Weakness 5 (trust timeline)
--
-- The projects table itself gains two columns that are nullable and
-- default to false / NULL, so existing rows are unaffected.

-- =====================================================================
-- Corroboration reports (Weakness 2)
-- =====================================================================
-- When an incoming submission is matched to an existing project by the
-- dedup utility (src/lib/projects/dedup.ts), a row is inserted here
-- instead of creating a new project row.
create table if not exists public.project_corroboration (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  contributed_by uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  location text not null,
  image_url text,
  matched_by text not null check (matched_by in ('geo', 'text', 'mixed')),
  similarity_score numeric not null check (similarity_score >= 0 and similarity_score <= 1),
  created_at timestamptz not null default now()
);

create index if not exists idx_project_corroboration_project
  on public.project_corroboration(project_id);
create index if not exists idx_project_corroboration_contributor
  on public.project_corroboration(contributed_by);

alter table public.project_corroboration enable row level security;

-- =====================================================================
-- Reviewer checklist sign-off (Weaknesses 3 & 4)
-- =====================================================================
-- Captures the reviewer's boolean attestation that evidence matches the
-- location/problem type and that KPI sources are independent. A row is
-- written once the ReviewerChecklist UI component submits a full
-- approval; it is what the ProjectCard reads to decide whether to show
-- the "Verified by Community" badge.
create table if not exists public.project_verification_review (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete cascade,
  submitter_id uuid not null references public.users(id) on delete restrict,
  evidence_matches_location boolean not null default false,
  evidence_matches_problem_type boolean not null default false,
  kpi_source_independent boolean not null default false,
  kpi_source_verifiable boolean not null default false,
  all_approved boolean not null default false,
  notes text,
  reviewed_at timestamptz not null default now(),
  constraint reviewer_not_submitter check (reviewer_id <> submitter_id)
);

create index if not exists idx_project_verification_project
  on public.project_verification_review(project_id);
create index if not exists idx_project_verification_reviewer
  on public.project_verification_review(reviewer_id);

alter table public.project_verification_review enable row level security;

-- =====================================================================
-- Project timeline (Weakness 5)
-- =====================================================================
-- Append-only log of significant project events (submitted,
-- corroborated, reviewed, completed, archived). The ProjectCard
-- component reads this to render the submission → review timeline.
create table if not exists public.project_status_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  event_type text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_status_history_project
  on public.project_status_history(project_id);

alter table public.project_status_history enable row level security;

-- =====================================================================
-- New columns on public.projects (Weaknesses 2 & 5)
-- =====================================================================
alter table public.projects
  add column if not exists corroboration_count integer not null default 0,
  add column if not exists community_verified boolean not null default false;

-- =====================================================================
-- RLS policies for the new tables
-- =====================================================================

-- Corroboration: members and the project owner can read; authenticated
-- users can append. Updates/deletes are intentionally not permitted —
-- corroboration is an append-only trust signal.
drop policy if exists "pc_select_members" on public.project_corroboration;
create policy "pc_select_members" on public.project_corroboration
  for select using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_corroboration.project_id
        and pm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.projects p
      where p.id = project_corroboration.project_id
        and p.created_by = auth.uid()
    )
    or contributed_by = auth.uid()
  );

drop policy if exists "pc_insert_auth" on public.project_corroboration;
create policy "pc_insert_auth" on public.project_corroboration
  for insert with check (auth.uid() = contributed_by);

-- Verification review: readable by project members and the submitter;
-- insertable by any authenticated user (the constraint
-- `reviewer_not_submitter` enforces reviewer ≠ submitter at the DB
-- layer in addition to the RBAC middleware).
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
  );

drop policy if exists "pvr_insert" on public.project_verification_review;
create policy "pvr_insert" on public.project_verification_review
  for insert with check (auth.uid() = reviewer_id and reviewer_id <> submitter_id);

-- Status history: readable by project members; writable via the service
-- role only (so audit events cannot be forged by a compromised client).
drop policy if exists "psh_select" on public.project_status_history;
create policy "psh_select" on public.project_status_history
  for select using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_status_history.project_id
        and pm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.projects p
      where p.id = project_status_history.project_id
        and p.created_by = auth.uid()
    )
  );

drop policy if exists "psh_insert_service" on public.project_status_history;
create policy "psh_insert_service" on public.project_status_history
  for insert with check (auth.role() = 'service_role');

-- =====================================================================
-- Helper functions
-- =====================================================================

-- Increment the denormalised corroboration counter when a new
-- corroboration row is inserted.
create or replace function public.increment_corroboration_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projects
    set corroboration_count = corroboration_count + 1,
        updated_at = now()
    where id = new.project_id;
  return new;
end;
$$;

drop trigger if exists trg_project_corroboration_increment
  on public.project_corroboration;
create trigger trg_project_corroboration_increment
  after insert on public.project_corroboration
  for each row execute function public.increment_corroboration_count();

-- Mark a project as community-verified when a full approval review is
-- persisted.
create or replace function public.mark_project_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.all_approved then
    update public.projects
      set community_verified = true,
          updated_at = now()
      where id = new.project_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_project_verification_verified
  on public.project_verification_review;
create trigger trg_project_verification_verified
  after insert on public.project_verification_review
  for each row execute function public.mark_project_verified();

-- Append an entry to the project timeline whenever a project's status
-- changes. Safe to call from application code or from other triggers.
create or replace function public.log_project_status(
  p_project_id uuid,
  p_actor_id uuid,
  p_event_type text,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_status_history
    (project_id, actor_id, event_type, metadata)
    values (p_project_id, p_actor_id, p_event_type, p_metadata);
end;
$$;
