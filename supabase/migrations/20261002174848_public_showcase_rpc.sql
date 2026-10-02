-- Read-only, field-limited snapshot for the public hackathon showcase.
-- This intentionally bypasses project RLS only for the fixed columns below;
-- private workspace data, user identifiers, coordinates, and evidence stay private.
create or replace function public.get_project_showcase()
returns table (
  id uuid,
  title text,
  problem_summary text,
  location text,
  objective text,
  status text,
  corroboration_count integer,
  community_verified boolean,
  created_at timestamptz,
  updated_at timestamptz,
  tasks jsonb,
  kpis jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.title,
    p.problem_summary,
    p.location,
    p.objective,
    p.status,
    p.corroboration_count,
    p.community_verified,
    p.created_at,
    p.updated_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'project_id', t.project_id,
            'title', t.title,
            'owner_role', t.owner_role,
            'status', t.status,
            'created_at', t.created_at
          )
          order by t.created_at
        )
        from public.tasks t
        where t.project_id = p.id
      ),
      '[]'::jsonb
    ) as tasks,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', k.id,
            'project_id', k.project_id,
            'name', k.name,
            'unit', k.unit,
            'baseline', k.baseline,
            'target', k.target,
            'measurement_method', k.measurement_method
          )
          order by k.created_at
        )
        from public.kpis k
        where k.project_id = p.id
      ),
      '[]'::jsonb
    ) as kpis
  from public.projects p
  where p.status in ('active', 'completed')
    and p.created_at <= timestamptz '2026-09-07T00:00:00.000Z'
  order by p.updated_at desc
  limit 12;
$$;

revoke all on function public.get_project_showcase() from public;
grant execute on function public.get_project_showcase() to anon, authenticated;

comment on function public.get_project_showcase() is
  'Field-limited, read-only project snapshot for the COMMONS hackathon showcase.';
