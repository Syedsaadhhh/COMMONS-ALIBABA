-- 011: Evidence media storage
-- Adds storage_key column to evidence and private evidence-media bucket.

alter table public.evidence
  add column if not exists storage_key text;

-- Private storage bucket for evidence media.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence-media',
  'evidence-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists evidence_media_insert on storage.objects;
create policy evidence_media_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'evidence-media'
    and (select auth.uid()) in (
      select pm.user_id
      from public.project_members pm
      where pm.project_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists evidence_media_delete_uploader on storage.objects;
create policy evidence_media_delete_uploader
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'evidence-media'
    and owner_id = (select auth.uid()::text)
  );

drop policy if exists evidence_media_select on storage.objects;
create policy evidence_media_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'evidence-media'
    and exists (
      select 1 from public.project_members pm
      where pm.project_id::text = (storage.foldername(name))[1]
        and pm.user_id = (select auth.uid())
    )
  );
