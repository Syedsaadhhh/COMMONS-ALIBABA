-- COMMONS Proof-Loop Migration
-- Run AFTER all prior migrations (001-007).
--
-- This migration is ADDITIVE. It closes the claim-to-evidence proof loop by:
--   1. Adding an `phase` discriminator to evidence (before / after / other).
--   2. Creating a `task_evidence_claims` join table so a task can be linked
--      to the evidence that addresses, proves, or relates to it.
--
-- Both changes preserve existing rows (phase defaults to 'other') and follow
-- the same RLS patterns as the civic-trust tables in migration 006.

-- =====================================================================
-- Evidence phase discriminator (before / after comparison)
-- =====================================================================
alter table public.evidence
  add column if not exists phase text not null default 'other'
  check (phase in ('before', 'after', 'other'));

create index if not exists idx_evidence_phase_project
  on public.evidence(project_id, phase);

-- =====================================================================
-- Task-to-evidence claims (proof loop)
-- =====================================================================
create table if not exists public.task_evidence_claims (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  claimed_by uuid not null references public.users(id) on delete cascade,
  claim_kind text not null check (claim_kind in ('addresses', 'proves', 'relates_to')),
  created_at timestamptz not null default now(),
  constraint task_evidence_claim_unique unique (task_id, evidence_id)
);

create index if not exists idx_task_evidence_claims_task
  on public.task_evidence_claims(task_id);
create index if not exists idx_task_evidence_claims_evidence
  on public.task_evidence_claims(evidence_id);

alter table public.task_evidence_claims enable row level security;

-- Select: project members and the project owner can read claims.
drop policy if exists "tec_select_members" on public.task_evidence_claims;
create policy "tec_select_members" on public.task_evidence_claims
  for select using (
    exists (
      select 1 from public.tasks t
      join public.project_members pm on pm.project_id = t.project_id
      where t.id = task_evidence_claims.task_id
        and pm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_evidence_claims.task_id
        and p.created_by = auth.uid()
    )
  );

-- Insert: authenticated users can record a claim they made. The claim must
-- reference a task and evidence in the same project; the foreign keys and
-- the unique constraint keep the data coherent.
drop policy if exists "tec_insert_auth" on public.task_evidence_claims;
create policy "tec_insert_auth" on public.task_evidence_claims
  for insert with check (auth.uid() = claimed_by);

-- Updates and deletes are intentionally not permitted — claims are part of
-- the audit trail. If a claim is wrong, a new claim can be recorded.
