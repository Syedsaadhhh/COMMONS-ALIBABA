-- COMMONS Initial Schema
-- Entities: users, projects, project_members, tasks, kpis, kpi_measurements, evidence, evidence_reviews, audit_events

-- Extend Supabase auth.users with a public profile row
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  problem_summary text not null,
  description text,
  location text not null,
  objective text,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  image_url text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Project members and roles
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'contributor' check (role in ('owner', 'admin', 'contributor', 'reviewer', 'viewer')),
  joined_at timestamptz not null default now(),
  unique (project_id, user_id)
);

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  owner_role text,
  assigned_to uuid references public.users(id),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- KPI definitions
create table if not exists public.kpis (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  unit text not null,
  baseline numeric,
  target numeric,
  measurement_method text not null,
  created_at timestamptz not null default now()
);

-- KPI measurements (individual readings)
create table if not exists public.kpi_measurements (
  id uuid primary key default gen_random_uuid(),
  kpi_id uuid not null references public.kpis(id) on delete cascade,
  value numeric not null,
  measured_at timestamptz not null default now(),
  source text,
  recorded_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

-- Evidence
create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  file_url text not null,
  file_hash text not null,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'CLARIFICATION_REQUIRED')),
  contributed_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

-- Evidence reviews
create table if not exists public.evidence_reviews (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  reviewer_id uuid not null references public.users(id),
  decision text not null check (decision in ('ACCEPTED', 'REJECTED', 'CLARIFICATION_REQUIRED')),
  notes text,
  reviewed_at timestamptz not null default now()
);

-- Audit events
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references public.users(id),
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_project_members_project on public.project_members(project_id);
create index if not exists idx_project_members_user on public.project_members(user_id);
create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_kpis_project on public.kpis(project_id);
create index if not exists idx_kpi_measurements_kpi on public.kpi_measurements(kpi_id);
create index if not exists idx_evidence_project on public.evidence(project_id);
create index if not exists idx_evidence_reviews_evidence on public.evidence_reviews(evidence_id);
create index if not exists idx_audit_events_project on public.audit_events(project_id);

-- Row Level Security
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.kpis enable row level security;
alter table public.kpi_measurements enable row level security;
alter table public.evidence enable row level security;
alter table public.evidence_reviews enable row level security;
alter table public.audit_events enable row level security;

-- Users: users can read their own profile and all profiles (for assignment)
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_select_all" on public.users
  for select using (true);
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- Projects: anyone can list, members can read, owner can update
create policy "projects_select_members" on public.projects
  for select using (
    created_by = auth.uid()
    or exists (select 1 from public.project_members pm where pm.project_id = projects.id and pm.user_id = auth.uid())
  );
create policy "projects_insert_auth" on public.projects
  for insert with check (auth.uid() = created_by);
create policy "projects_update_owner" on public.projects
  for update using (created_by = auth.uid());

-- Project members: members can list, owner can manage
create policy "pm_select_members" on public.project_members
  for select using (
    exists (select 1 from public.project_members pm2 where pm2.project_id = project_members.project_id and pm2.user_id = auth.uid())
    or exists (select 1 from public.projects p where p.id = project_members.project_id and p.created_by = auth.uid())
  );
create policy "pm_manage_owner" on public.project_members
  for all using (
    exists (select 1 from public.projects p where p.id = project_members.project_id and p.created_by = auth.uid())
  );

-- Tasks: project members can CRUD
create policy "tasks_select_members" on public.tasks
  for select using (
    exists (select 1 from public.project_members pm where pm.project_id = tasks.project_id and pm.user_id = auth.uid())
    or exists (select 1 from public.projects p where p.id = tasks.project_id and p.created_by = auth.uid())
  );
create policy "tasks_manage_members" on public.tasks
  for all using (
    exists (select 1 from public.project_members pm where pm.project_id = tasks.project_id and pm.user_id = auth.uid() and pm.role in ('owner', 'admin', 'contributor'))
    or exists (select 1 from public.projects p where p.id = tasks.project_id and p.created_by = auth.uid())
  );

-- KPIs: same as tasks
create policy "kpis_select_members" on public.kpis
  for select using (
    exists (select 1 from public.project_members pm where pm.project_id = kpis.project_id and pm.user_id = auth.uid())
    or exists (select 1 from public.projects p where p.id = kpis.project_id and p.created_by = auth.uid())
  );
create policy "kpis_manage_members" on public.kpis
  for all using (
    exists (select 1 from public.project_members pm where pm.project_id = kpis.project_id and pm.user_id = auth.uid() and pm.role in ('owner', 'admin'))
    or exists (select 1 from public.projects p where p.id = kpis.project_id and p.created_by = auth.uid())
  );

-- KPI measurements: members can read, contributors can insert
create policy "kpi_m_select" on public.kpi_measurements
  for select using (
    exists (
      select 1 from public.kpis k
      join public.project_members pm on pm.project_id = k.project_id
      where k.id = kpi_measurements.kpi_id and pm.user_id = auth.uid()
    )
  );
create policy "kpi_m_insert" on public.kpi_measurements
  for insert with check (
    exists (
      select 1 from public.kpis k
      join public.project_members pm on pm.project_id = k.project_id
      where k.id = kpi_measurements.kpi_id and pm.user_id = auth.uid() and pm.role in ('owner', 'admin', 'contributor')
    )
  );

-- Evidence: members can read, contributors can submit
create policy "evidence_select_members" on public.evidence
  for select using (
    exists (select 1 from public.project_members pm where pm.project_id = evidence.project_id and pm.user_id = auth.uid())
    or exists (select 1 from public.projects p where p.id = evidence.project_id and p.created_by = auth.uid())
  );
create policy "evidence_insert_contributors" on public.evidence
  for insert with check (
    auth.uid() = contributed_by
    and (
      exists (select 1 from public.project_members pm where pm.project_id = evidence.project_id and pm.user_id = auth.uid() and pm.role in ('owner', 'admin', 'contributor'))
      or exists (select 1 from public.projects p where p.id = evidence.project_id and p.created_by = auth.uid())
    )
  );

-- Evidence reviews: reviewers and admins can manage
create policy "er_select" on public.evidence_reviews
  for select using (
    exists (
      select 1 from public.evidence e
      join public.project_members pm on pm.project_id = e.project_id
      where e.id = evidence_reviews.evidence_id and pm.user_id = auth.uid()
    )
  );
create policy "er_manage" on public.evidence_reviews
  for all using (
    exists (
      select 1 from public.evidence e
      join public.project_members pm on pm.project_id = e.project_id
      where e.id = evidence_reviews.evidence_id and pm.user_id = auth.uid() and pm.role in ('owner', 'admin', 'reviewer')
    )
  );

-- Audit events: members can read, system inserts (service role)
create policy "audit_select_members" on public.audit_events
  for select using (
    exists (select 1 from public.project_members pm where pm.project_id = audit_events.project_id and pm.user_id = auth.uid())
    or exists (select 1 from public.projects p where p.id = audit_events.project_id and p.created_by = auth.uid())
  );
