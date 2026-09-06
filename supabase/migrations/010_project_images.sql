-- 010: Multi-image project media storage
-- Adds project_images table and private project-media storage bucket.

-- Project images: 1-3 images per project, uploaded after human confirmation.
create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size > 0),
  file_hash text not null check (char_length(file_hash) = 64),
  ordinal integer not null check (ordinal between 1 and 3),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (project_id, ordinal)
);

create index if not exists idx_project_images_project_id
  on public.project_images (project_id);
create index if not exists idx_project_images_uploaded_by
  on public.project_images (uploaded_by);

alter table public.project_images enable row level security;

drop policy if exists project_images_select_members on public.project_images;
create policy project_images_select_members
  on public.project_images for select
  to authenticated
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_images.project_id
        and pm.user_id = (select auth.uid())
    )
  );

drop policy if exists project_images_insert_owner on public.project_images;
create policy project_images_insert_owner
  on public.project_images for insert
  to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_images.project_id
        and p.created_by = (select auth.uid())
    )
  );

-- Private storage bucket for project media.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-media',
  'project-media',
  false,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists project_media_insert on storage.objects;
create policy project_media_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = (select created_by::text from public.projects where id::text = (storage.foldername(name))[1])
    and (storage.foldername(name))[2] = (select auth.uid()::text)
    and (select auth.uid()) = (select created_by from public.projects where id::text = (storage.foldername(name))[1])
  );

drop policy if exists project_media_select on storage.objects;
create policy project_media_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-media'
    and exists (
      select 1 from public.project_members pm
      where pm.project_id::text = (storage.foldername(name))[1]
        and pm.user_id = (select auth.uid())
    )
  );

drop policy if exists project_media_delete_owner on storage.objects;
create policy project_media_delete_owner
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = (select created_by::text from public.projects where id::text = (storage.foldername(name))[1])
    and (storage.foldername(name))[2] = (select auth.uid()::text)
    and (select auth.uid()) = (select created_by from public.projects where id::text = (storage.foldername(name))[1])
  );
