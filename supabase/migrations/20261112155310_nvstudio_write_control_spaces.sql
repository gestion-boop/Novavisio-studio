-- « La main » pour enregistrer + partage des espaces.
-- ATTENTION : ces éléments ont déjà été appliqués sur le projet Supabase de production (migrations
-- 20261112155310 et 20261112160716). Ce fichier en garde une copie lisible dans le dépôt ; il est idempotent.
-- Non repris ici : les triggers « write_guard » posés sur les tables de la visite (ils appellent nvstudio_internal.write_guard()).
create schema if not exists nvstudio_internal;

create table if not exists public.nvstudio_write_control(
  project_id uuid primary key references public.nvstudio_projects(id) on delete cascade,
  holder_email text,
  revision integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.nvstudio_write_control enable row level security;
alter table public.nvstudio_members add column if not exists include_spaces boolean not null default true;

-- Règle : sans ligne (ou holder_email NULL), tout participant peut enregistrer ; sinon seul le titulaire.
create or replace function nvstudio_internal.assert_write(p_project uuid) returns void
language plpgsql security definer set search_path to '' as $$
declare v_holder text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.nvstudio_can_access(p_project) then raise exception 'unknown_project'; end if;
  perform 1 from public.nvstudio_projects where id=p_project for update;
  if not public.nvstudio_can_access(p_project) then raise exception 'unknown_project'; end if;
  select holder_email into v_holder from public.nvstudio_write_control where project_id=p_project;
  if v_holder is not null and v_holder<>lower(coalesce(auth.jwt()->>'email','')) then
    raise exception 'write_control_denied' using detail=jsonb_build_object('holderEmail',v_holder)::text;
  end if;
end; $$;

create or replace function nvstudio_internal.write_state(p_project uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare v_owner uuid; v_owner_email text; v_me text:=lower(coalesce(auth.jwt()->>'email','')); v_holder text; v_revision integer; v_participants jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.nvstudio_can_access(p_project) then raise exception 'unknown_project'; end if;
  select owner_id into v_owner from public.nvstudio_projects where id=p_project;
  select lower(email) into v_owner_email from auth.users where id=v_owner;
  select holder_email,revision into v_holder,v_revision from public.nvstudio_write_control where project_id=p_project;
  select coalesce(jsonb_agg(x order by x->>'email'),'[]'::jsonb) into v_participants from (
    select jsonb_build_object('email',v_owner_email,'owner',true) as x
    union all
    select jsonb_build_object('email',m.email,'owner',false) from public.nvstudio_members m where m.project_id=p_project and m.email<>v_owner_email
  ) participants;
  return jsonb_build_object('projectId',p_project,'holderEmail',v_holder,'revision',coalesce(v_revision,0),
    'ownerEmail',v_owner_email,'myEmail',v_me,'isOwner',v_owner=auth.uid(),
    'canWrite',v_holder is null or v_holder=v_me,'canManage',v_owner=auth.uid() or coalesce(v_holder=v_me,false),
    'participants',v_participants);
end; $$;

create or replace function nvstudio_internal.set_write_holder(p_project uuid, p_email text, p_expected integer) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare v_owner uuid; v_owner_email text; v_me text:=lower(coalesce(auth.jwt()->>'email','')); v_holder text; v_revision integer; v_target text:=nullif(lower(btrim(p_email)),'');
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.nvstudio_can_access(p_project) then raise exception 'unknown_project'; end if;
  select owner_id into v_owner from public.nvstudio_projects where id=p_project for update;
  if not public.nvstudio_can_access(p_project) then raise exception 'unknown_project'; end if;
  select lower(email) into v_owner_email from auth.users where id=v_owner;
  select holder_email,revision into v_holder,v_revision from public.nvstudio_write_control where project_id=p_project;
  if v_owner<>auth.uid() and (v_holder is null or v_holder<>v_me) then raise exception 'write_control_not_manager'; end if;
  if p_expected is null or p_expected<>coalesce(v_revision,0) then raise exception 'write_control_conflict'; end if;
  if v_target is null and v_owner<>auth.uid() then raise exception 'not_owner'; end if;
  if v_target is not null and v_target<>v_owner_email and not exists (
    select 1 from public.nvstudio_members where project_id=p_project and email=v_target
  ) then raise exception 'write_control_not_participant'; end if;
  insert into public.nvstudio_write_control(project_id,holder_email,revision,updated_by)
    values(p_project,v_target,coalesce(v_revision,0)+1,auth.uid())
  on conflict(project_id) do update set holder_email=excluded.holder_email,revision=excluded.revision,updated_at=now(),updated_by=excluded.updated_by;
  return nvstudio_internal.write_state(p_project);
end; $$;

create or replace function public.nvstudio_write_state(p_project uuid) returns jsonb
language sql set search_path to '' as $$ select nvstudio_internal.write_state(p_project); $$;
create or replace function public.nvstudio_set_write_holder(p_project uuid, p_email text, p_expected integer) returns jsonb
language sql set search_path to '' as $$ select nvstudio_internal.set_write_holder(p_project,p_email,p_expected); $$;
