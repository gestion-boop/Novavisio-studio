-- Notes privées ou partagées, liées aux projets Studio.
-- La lecture exige une identité connectée et un accès au projet.
create table if not exists public.nvstudio_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.nvstudio_projects(id) on delete cascade,
  author_id uuid not null default auth.uid(),
  author_email text not null default lower(coalesce(auth.jwt()->>'email','')),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  shared boolean not null default true,
  scene_id text,
  yaw double precision,
  pitch double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nvstudio_notes_project_created on public.nvstudio_notes(project_id,created_at desc);
alter table public.nvstudio_notes enable row level security;
grant select,insert,update,delete on public.nvstudio_notes to authenticated;
create policy nvstudio_notes_select on public.nvstudio_notes for select to authenticated
  using (author_id=auth.uid() or (shared and (
    exists(select 1 from public.nvstudio_projects p where p.id=project_id and p.owner_id=auth.uid())
    or public.nvstudio_is_member(project_id)
  )));
create policy nvstudio_notes_insert on public.nvstudio_notes for insert to authenticated
  with check (author_id=auth.uid() and author_email=lower(coalesce(auth.jwt()->>'email',''))
    and (exists(select 1 from public.nvstudio_projects p where p.id=project_id and p.owner_id=auth.uid())
      or public.nvstudio_is_member(project_id)));
create policy nvstudio_notes_update on public.nvstudio_notes for update to authenticated
  using (author_id=auth.uid()) with check (author_id=auth.uid());
create policy nvstudio_notes_delete on public.nvstudio_notes for delete to authenticated
  using (author_id=auth.uid());
