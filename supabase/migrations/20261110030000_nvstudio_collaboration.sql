-- NovaVisio Studio — travail à plusieurs sur une même visite (« lien privé »).
-- Migration ADDITIVE : à exécuter APRÈS 20261110000000_nvstudio_init.sql ET 20261110020000_nvstudio_autosave.sql.
--
-- Principe :
--  * le propriétaire invite une personne par son adresse e-mail (table nvstudio_members) ;
--  * cette personne se connecte avec son compte (e-mail + mot de passe) et peut ouvrir, modifier et sauvegarder
--    la copie de travail de la visite ainsi que ses médias ; elle ne peut ni inviter, ni créer de liens publics ;
--  * règle de sauvegarde : « la dernière personne qui agit a la main » : son enregistrement remplace la copie de travail.
--    Pour ne rien perdre, la version remplacée est archivée dans nvstudio_working_history (jamais supprimée).
-- Ne supprime aucune donnée existante. Remplace uniquement la fonction nvstudio_save_working créée par la migration précédente.

begin;

alter table public.nvstudio_projects add column working_updated_by text;  -- e-mail de la dernière personne ayant enregistré

-- 1) Collaborateurs
create table public.nvstudio_members (
  project_id uuid not null references public.nvstudio_projects(id) on delete restrict,
  email      text not null check (email = lower(email) and char_length(email) between 3 and 254),
  added_by   uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (project_id, email)
);
alter table public.nvstudio_members enable row level security;
revoke all on public.nvstudio_members from anon, authenticated;
grant select on public.nvstudio_members to authenticated;

-- 2) Archive des copies de travail remplacées par quelqu'un d'autre (insertion seulement)
create table public.nvstudio_working_history (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.nvstudio_projects(id) on delete restrict,
  version     integer not null,
  snapshot    jsonb not null,
  updated_by  text,
  replaced_by text,
  saved_at    timestamptz not null default now()
);
alter table public.nvstudio_working_history enable row level security;
revoke all on public.nvstudio_working_history from anon, authenticated;
grant select on public.nvstudio_working_history to authenticated;

-- 3) Fonctions d'accès (security definer : pas de récursion entre les politiques)
create function public.nvstudio_is_member(p_project uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.nvstudio_members m
    where m.project_id = p_project and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create function public.nvstudio_can_access(p_project uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (select 1 from public.nvstudio_projects p where p.id = p_project and p.owner_id = auth.uid())
      or public.nvstudio_is_member(p_project);
$$;

create function public.nvstudio_can_access_text(p_project text) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select case when p_project ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then public.nvstudio_can_access(p_project::uuid) else false end;
$$;

-- 4) Gestion des collaborateurs (propriétaire uniquement)
create function public.nvstudio_add_member(p_project uuid, p_email text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.nvstudio_projects p where p.id = p_project and p.owner_id = auth.uid()) then
    raise exception 'not_owner';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email'; end if;
  insert into public.nvstudio_members (project_id, email) values (p_project, v_email) on conflict do nothing;
end;
$$;

create function public.nvstudio_remove_member(p_project uuid, p_email text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.nvstudio_projects p where p.id = p_project and p.owner_id = auth.uid()) then
    raise exception 'not_owner';
  end if;
  delete from public.nvstudio_members where project_id = p_project and email = lower(btrim(coalesce(p_email, '')));
end;
$$;

-- 5) Droits de lecture : le propriétaire voit ses collaborateurs ; chaque collaborateur voit sa propre ligne
create policy nvstudio_members_select on public.nvstudio_members
  for select to authenticated using (
    email = lower(coalesce(auth.jwt() ->> 'email', ''))
    or exists (select 1 from public.nvstudio_projects p where p.id = project_id and p.owner_id = auth.uid())
  );
create policy nvstudio_history_select on public.nvstudio_working_history
  for select to authenticated using (
    exists (select 1 from public.nvstudio_projects p where p.id = project_id and p.owner_id = auth.uid())
  );
-- Les collaborateurs voient les visites auxquelles ils sont invités
create policy nvstudio_projects_member_select on public.nvstudio_projects
  for select to authenticated using (public.nvstudio_is_member(id));
-- ... et lisent leurs médias (quel que soit le dossier d'envoi : chacun écrit dans son propre dossier)
create policy nvstudio_media_collab_read on storage.objects
  for select to authenticated using (
    bucket_id = 'nvstudio-media' and public.nvstudio_can_access_text((storage.foldername(name))[2])
  );

-- 6) Sauvegarde instantanée : propriétaire OU collaborateur ; « la dernière personne qui agit a la main »
drop function if exists public.nvstudio_save_working(uuid, integer, text, jsonb);
create function public.nvstudio_save_working(
  p_project uuid, p_expected integer, p_name text, p_snapshot jsonb, p_takeover boolean default false
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_prev  public.nvstudio_projects;
  v_new   integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then raise exception 'invalid_snapshot'; end if;
  if not public.nvstudio_can_access(p_project) then raise exception 'unknown_project'; end if;

  select * into v_prev from public.nvstudio_projects where id = p_project for update;
  if not found then raise exception 'unknown_project'; end if;
  if v_prev.working_version <> p_expected then raise exception 'conflict'; end if;

  -- Une version enregistrée par quelqu'un d'autre (ou reprise en main après un conflit) est archivée avant d'être remplacée.
  if v_prev.working is not null and (p_takeover or coalesce(v_prev.working_updated_by, '') <> v_email) then
    insert into public.nvstudio_working_history (project_id, version, snapshot, updated_by, replaced_by)
    values (p_project, v_prev.working_version, v_prev.working, v_prev.working_updated_by, v_email);
  end if;

  update public.nvstudio_projects p
     set working            = p_snapshot,
         name               = left(coalesce(nullif(p_name, ''), p.name), 200),
         working_version    = p.working_version + 1,
         working_updated_at = now(),
         working_updated_by = v_email
   where p.id = p_project
  returning p.working_version into v_new;

  return jsonb_build_object('version', v_new, 'updated_at', now(), 'updated_by', v_email);
end;
$$;

revoke all on function public.nvstudio_save_working(uuid, integer, text, jsonb, boolean) from public, anon;
revoke all on function public.nvstudio_add_member(uuid, text) from public, anon;
revoke all on function public.nvstudio_remove_member(uuid, text) from public, anon;
revoke all on function public.nvstudio_is_member(uuid) from public, anon;
revoke all on function public.nvstudio_can_access(uuid) from public, anon;
revoke all on function public.nvstudio_can_access_text(text) from public, anon;
grant execute on function public.nvstudio_save_working(uuid, integer, text, jsonb, boolean) to authenticated;
grant execute on function public.nvstudio_add_member(uuid, text) to authenticated;
grant execute on function public.nvstudio_remove_member(uuid, text) to authenticated;
grant execute on function public.nvstudio_is_member(uuid) to authenticated;
grant execute on function public.nvstudio_can_access(uuid) to authenticated;
grant execute on function public.nvstudio_can_access_text(text) to authenticated;

commit;
