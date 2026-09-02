-- COMMONS Execution MVP
-- Adds consented location signals, evidence-location context, and the minimum
-- authenticated write rules required for real project creation and check-ins.

alter table public.users alter column email drop not null;

alter table public.projects
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.evidence
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.projects
  drop constraint if exists projects_latitude_range,
  drop constraint if exists projects_longitude_range;

alter table public.projects
  add constraint projects_latitude_range check (latitude is null or latitude between -90 and 90),
  add constraint projects_longitude_range check (longitude is null or longitude between -180 and 180);

alter table public.evidence
  drop constraint if exists evidence_latitude_range,
  drop constraint if exists evidence_longitude_range;

alter table public.evidence
  add constraint evidence_latitude_range check (latitude is null or latitude between -90 and 90),
  add constraint evidence_longitude_range check (longitude is null or longitude between -180 and 180);

-- Anonymous authenticated sessions do not have an email address. They still
-- receive a profile row and can own only the records created in their session.
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

drop policy if exists "audit_insert_project_owner" on public.audit_events;
create policy "audit_insert_project_owner" on public.audit_events
  for insert with check (
    exists (
      select 1 from public.projects p
      where p.id = audit_events.project_id and p.created_by = auth.uid()
    )
  );
