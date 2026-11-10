-- NovaVisio Studio — migration ADDITIVE uniquement.
-- Crée exclusivement des objets préfixés `nvstudio_` : 2 tables + 1 bucket privé.
-- Ne modifie, ne vide et ne supprime aucune table, aucun bucket, aucune politique existante.
-- Volontairement SANS `if not exists` : si un nom est déjà pris, le script échoue au lieu de réutiliser un objet existant.
-- À exécuter une seule fois, dans le SQL Editor du projet Supabase dédié au Studio.

begin;

-- 1) Visites (une ligne par visite cloud ; jamais modifiée après création)
create table public.nvstudio_projects (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete restrict,
  name       text not null check (char_length(name) between 1 and 200),
  created_at timestamptz not null default now()
);

-- 2) Révisions immuables (INSERT seulement : aucune politique UPDATE/DELETE n'existe)
create table public.nvstudio_revisions (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.nvstudio_projects(id) on delete restrict,
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete restrict,
  revision   integer not null check (revision >= 1),
  name       text not null check (char_length(name) between 1 and 200),
  snapshot   jsonb not null,   -- le projet SANS médias base64 : références `nvmedia:<chemin>` vers le bucket
  created_at timestamptz not null default now(),
  unique (project_id, revision) -- empêche qu'un navigateur ancien écrase une révision existante
);

alter table public.nvstudio_projects  enable row level security;
alter table public.nvstudio_revisions enable row level security;

revoke all on public.nvstudio_projects  from anon, authenticated;
revoke all on public.nvstudio_revisions from anon, authenticated;
grant select, insert on public.nvstudio_projects  to authenticated;
grant select, insert on public.nvstudio_revisions to authenticated;

create policy nvstudio_projects_select on public.nvstudio_projects
  for select to authenticated using (owner_id = auth.uid());
create policy nvstudio_projects_insert on public.nvstudio_projects
  for insert to authenticated with check (owner_id = auth.uid());

create policy nvstudio_revisions_select on public.nvstudio_revisions
  for select to authenticated using (owner_id = auth.uid());
create policy nvstudio_revisions_insert on public.nvstudio_revisions
  for insert to authenticated with check (
    owner_id = auth.uid()
    and exists (select 1 from public.nvstudio_projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- 3) Bucket privé pour panoramas, images, vidéos, sons, icônes
--    Chemin imposé : <user_id>/<project_uuid>/<sha256>.<ext>  (contenu adressé par hash, jamais réécrit)
insert into storage.buckets (id, name, public, file_size_limit)
values ('nvstudio-media', 'nvstudio-media', false, 52428800);

create policy nvstudio_media_select on storage.objects
  for select to authenticated
  using (bucket_id = 'nvstudio-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy nvstudio_media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'nvstudio-media' and (storage.foldername(name))[1] = auth.uid()::text);
-- Aucune politique UPDATE / DELETE : les médias déjà envoyés ne peuvent être ni remplacés ni supprimés depuis l'application.

commit;
