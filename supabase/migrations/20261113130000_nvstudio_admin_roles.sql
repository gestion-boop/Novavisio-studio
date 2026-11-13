-- NovaVisio Studio — rôles « admin » / « collaborateur » et choix de la personne qui enregistre.
-- Migration ADDITIVE (aucune donnée supprimée). À exécuter une fois dans le SQL Editor de Supabase. Idempotente.
-- À exécuter APRÈS 20261112155310_nvstudio_write_control_spaces.sql (déjà en production).
--
-- Règles :
--  * Admins = le propriétaire du projet, les personnes marquées « admin » sur ce projet, et les admins globaux ci-dessous
--    (gestion@novavisio.fr et sylvain2909@gmail.com : admins sur tous les projets auxquels ils participent).
--  * Seuls les admins (et la personne qui a la main) peuvent choisir qui enregistre : « Tout le monde » ou une personne précise.
--  * Tous les autres participants sont des collaborateurs : ils travaillent, et enregistrent quand ils ont la main.
begin;

alter table public.nvstudio_members add column if not exists role text not null default 'collaborator';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'nvstudio_members_role_check') then
    alter table public.nvstudio_members add constraint nvstudio_members_role_check check (role in ('admin','collaborator'));
  end if;
end $$;

create table if not exists public.nvstudio_global_admins (email text primary key check (email = lower(email)));
alter table public.nvstudio_global_admins enable row level security;
revoke all on public.nvstudio_global_admins from anon, authenticated;
insert into public.nvstudio_global_admins(email) values ('gestion@novavisio.fr'), ('sylvain2909@gmail.com') on conflict do nothing;

create or replace function nvstudio_internal.is_admin(p_project uuid) returns boolean
language sql security definer stable set search_path to '' as $$
  select exists (select 1 from public.nvstudio_projects p where p.id = p_project and p.owner_id = auth.uid())
      or exists (select 1 from public.nvstudio_members m
                  where m.project_id = p_project and m.email = lower(coalesce(auth.jwt() ->> 'email', '')) and m.role = 'admin')
      or exists (select 1 from public.nvstudio_global_admins g where g.email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function nvstudio_internal.write_state(p_project uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare v_owner uuid; v_owner_email text; v_me text := lower(coalesce(auth.jwt() ->> 'email', '')); v_holder text; v_revision integer; v_participants jsonb; v_admin boolean;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.nvstudio_can_access(p_project) then raise exception 'unknown_project'; end if;
  select owner_id into v_owner from public.nvstudio_projects where id = p_project;
  select lower(email) into v_owner_email from auth.users where id = v_owner;
  select holder_email, revision into v_holder, v_revision from public.nvstudio_write_control where project_id = p_project;
  v_admin := nvstudio_internal.is_admin(p_project);
  select coalesce(jsonb_agg(x order by x ->> 'email'), '[]'::jsonb) into v_participants from (
    select jsonb_build_object('email', v_owner_email, 'owner', true, 'role', 'admin') as x
    union all
    select jsonb_build_object('email', m.email, 'owner', false,
             'role', case when m.role = 'admin' or exists (select 1 from public.nvstudio_global_admins g where g.email = m.email) then 'admin' else 'collaborator' end)
      from public.nvstudio_members m where m.project_id = p_project and m.email <> v_owner_email
  ) participants;
  return jsonb_build_object('projectId', p_project, 'holderEmail', v_holder, 'revision', coalesce(v_revision, 0),
    'ownerEmail', v_owner_email, 'myEmail', v_me, 'isOwner', v_owner = auth.uid(), 'isAdmin', v_admin,
    'canWrite', v_holder is null or v_holder = v_me, 'canManage', v_admin or coalesce(v_holder = v_me, false),
    'participants', v_participants);
end; $$;

create or replace function nvstudio_internal.set_write_holder(p_project uuid, p_email text, p_expected integer) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare v_owner uuid; v_owner_email text; v_me text := lower(coalesce(auth.jwt() ->> 'email', '')); v_holder text; v_revision integer;
        v_target text := nullif(lower(btrim(p_email)), ''); v_admin boolean;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.nvstudio_can_access(p_project) then raise exception 'unknown_project'; end if;
  select owner_id into v_owner from public.nvstudio_projects where id = p_project for update;
  if not public.nvstudio_can_access(p_project) then raise exception 'unknown_project'; end if;
  select lower(email) into v_owner_email from auth.users where id = v_owner;
  select holder_email, revision into v_holder, v_revision from public.nvstudio_write_control where project_id = p_project;
  v_admin := nvstudio_internal.is_admin(p_project);
  if not v_admin and (v_holder is null or v_holder <> v_me) then raise exception 'write_control_not_manager'; end if;
  if p_expected is null or p_expected <> coalesce(v_revision, 0) then raise exception 'write_control_conflict'; end if;
  if v_target is null and not v_admin then raise exception 'not_owner'; end if;
  if v_target is not null and v_target <> v_owner_email and not exists (
    select 1 from public.nvstudio_members where project_id = p_project and email = v_target
  ) then raise exception 'write_control_not_participant'; end if;
  insert into public.nvstudio_write_control(project_id, holder_email, revision, updated_by)
    values (p_project, v_target, coalesce(v_revision, 0) + 1, auth.uid())
  on conflict (project_id) do update set holder_email = excluded.holder_email, revision = excluded.revision, updated_at = now(), updated_by = excluded.updated_by;
  return nvstudio_internal.write_state(p_project);
end; $$;

create or replace function public.nvstudio_set_member_role(p_project uuid, p_email text, p_role text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare v_target text := lower(btrim(p_email));
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.nvstudio_can_access(p_project) then raise exception 'unknown_project'; end if;
  if not nvstudio_internal.is_admin(p_project) then raise exception 'not_admin'; end if;
  if p_role not in ('admin', 'collaborator') then raise exception 'invalid_role'; end if;
  update public.nvstudio_members set role = p_role where project_id = p_project and email = v_target;
  if not found then raise exception 'write_control_not_participant'; end if;
  return nvstudio_internal.write_state(p_project);
end; $$;
revoke all on function public.nvstudio_set_member_role(uuid, text, text) from public, anon;
grant execute on function public.nvstudio_set_member_role(uuid, text, text) to authenticated;

commit;
