-- NovaVisio Studio — liens publics à durée limitée (3, 5, 7 ou 10 jours).
-- Migration ADDITIVE : à exécuter APRÈS 20261110000000_nvstudio_init.sql.
-- Crée uniquement `nvstudio_shares`, 4 fonctions `nvstudio_*` et 1 politique de lecture sur le bucket `nvstudio-media`.
-- Ne modifie ni ne supprime rien d'existant.
--
-- Sécurité :
--  * le lien contient un jeton secret de 64 caractères hexadécimaux (≈ 244 bits) : impossible à deviner ;
--  * la date d'expiration est calculée PAR LA BASE (now() + n jours), jamais par le navigateur ;
--  * une visite n'est renvoyée que par la fonction nvstudio_get_share, si le lien est valide ;
--  * les médias (privés) ne sont téléchargeables qu'aux visiteurs anonymes tant qu'un lien actif existe pour la visite ;
--    passé la date, plus rien n'est accessible, même en connaissant l'adresse d'un fichier.

begin;

create table public.nvstudio_shares (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  project_id uuid not null,
  revision   integer not null,
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete restrict,
  days       integer not null check (days in (3, 5, 7, 10)),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  foreign key (project_id, revision) references public.nvstudio_revisions (project_id, revision) on delete restrict
);

alter table public.nvstudio_shares enable row level security;
revoke all on public.nvstudio_shares from anon, authenticated;
grant select on public.nvstudio_shares to authenticated;  -- le propriétaire voit ses liens ; aucune écriture directe

create policy nvstudio_shares_select on public.nvstudio_shares
  for select to authenticated using (owner_id = auth.uid());

-- Création d'un lien (durée imposée : 3, 5, 7 ou 10 jours)
create function public.nvstudio_create_share(p_project uuid, p_revision integer, p_days integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.nvstudio_shares;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_days is null or p_days not in (3, 5, 7, 10) then raise exception 'invalid_duration'; end if;
  if not exists (
    select 1 from public.nvstudio_revisions r
    where r.project_id = p_project and r.revision = p_revision and r.owner_id = v_uid
  ) then raise exception 'unknown_revision'; end if;

  insert into public.nvstudio_shares (project_id, revision, owner_id, days, expires_at)
  values (p_project, p_revision, v_uid, p_days, now() + make_interval(days => p_days))
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'token', v_row.token, 'expires_at', v_row.expires_at);
end;
$$;

-- Révocation anticipée d'un lien par son propriétaire (ne supprime rien : le lien cesse seulement de fonctionner)
create function public.nvstudio_revoke_share(p_share uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.nvstudio_shares
     set revoked_at = now()
   where id = p_share and owner_id = auth.uid() and revoked_at is null;
$$;

-- Lecture publique d'une visite via son jeton
create function public.nvstudio_get_share(p_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  s public.nvstudio_shares;
  r public.nvstudio_revisions;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into s from public.nvstudio_shares where token = p_token;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if s.revoked_at is not null or s.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;
  select * into r from public.nvstudio_revisions where project_id = s.project_id and revision = s.revision;
  return jsonb_build_object(
    'status', 'ok',
    'name', r.name,
    'expires_at', s.expires_at,
    'snapshot', r.snapshot
  );
end;
$$;

-- Un lien actif existe-t-il pour cette visite ? (utilisé par la politique de lecture des médias)
create function public.nvstudio_share_active(p_project text)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.nvstudio_shares s
    where s.project_id::text = p_project and s.revoked_at is null and s.expires_at > now()
  );
$$;

revoke all on function public.nvstudio_create_share(uuid, integer, integer) from public, anon;
revoke all on function public.nvstudio_revoke_share(uuid) from public, anon;
revoke all on function public.nvstudio_get_share(text) from public;
revoke all on function public.nvstudio_share_active(text) from public;
grant execute on function public.nvstudio_create_share(uuid, integer, integer) to authenticated;
grant execute on function public.nvstudio_revoke_share(uuid) to authenticated;
grant execute on function public.nvstudio_get_share(text) to anon, authenticated;
grant execute on function public.nvstudio_share_active(text) to anon, authenticated;

-- Médias : lecture autorisée (y compris anonyme) uniquement tant qu'un lien actif existe pour la visite.
-- Chemin : <user_id>/<project_uuid>/<sha256>.<ext>  →  le 2e dossier est l'identifiant de la visite.
create policy nvstudio_media_shared_read on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'nvstudio-media'
    and public.nvstudio_share_active((storage.foldername(name))[2])
  );

commit;
