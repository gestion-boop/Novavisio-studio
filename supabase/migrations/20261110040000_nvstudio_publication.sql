-- NovaVisio Studio — LIEN PERMANENT (publication) : une adresse stable dont le contenu se met à jour quand on clique sur « Publier ».
-- Migration ADDITIVE : à exécuter APRÈS 20261110010000_nvstudio_share_links.sql (elle remplace deux fonctions créées par celle-ci).
--
-- Principe :
--  * une seule publication par visite, avec un jeton secret de 64 caractères (comme les liens à durée limitée) ;
--  * « Publier » enregistre une révision immuable de la visite puis fait pointer la publication dessus : l'adresse ne change jamais,
--    son contenu change ;
--  * « Arrêter la publication » ferme l'adresse sans rien supprimer ; « Publier » la rouvre ;
--  * pas de date d'expiration : c'est un choix explicite du propriétaire (les liens de 3/5/7/10 jours restent séparés).
-- Ne supprime aucune donnée. Remplace nvstudio_get_share et nvstudio_share_active (mêmes signatures, comportement étendu).

begin;

create table public.nvstudio_publications (
  project_id         uuid primary key references public.nvstudio_projects(id) on delete restrict,
  token              text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  owner_id           uuid not null default auth.uid() references auth.users(id) on delete restrict,
  published_revision integer not null,
  published_at       timestamptz not null default now(),
  revoked_at         timestamptz,
  created_at         timestamptz not null default now(),
  foreign key (project_id, published_revision) references public.nvstudio_revisions (project_id, revision) on delete restrict
);
alter table public.nvstudio_publications enable row level security;
revoke all on public.nvstudio_publications from anon, authenticated;
grant select on public.nvstudio_publications to authenticated;
create policy nvstudio_publications_select on public.nvstudio_publications
  for select to authenticated using (owner_id = auth.uid());

-- Publier (ou mettre à jour) : propriétaire uniquement
create function public.nvstudio_publish(p_project uuid, p_revision integer)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_row public.nvstudio_publications;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (
    select 1 from public.nvstudio_revisions r
    where r.project_id = p_project and r.revision = p_revision and r.owner_id = v_uid
  ) then raise exception 'unknown_revision'; end if;

  insert into public.nvstudio_publications (project_id, owner_id, published_revision)
  values (p_project, v_uid, p_revision)
  on conflict (project_id) do update
     set published_revision = excluded.published_revision, published_at = now(), revoked_at = null
   where public.nvstudio_publications.owner_id = v_uid
  returning * into v_row;

  if v_row.token is null then raise exception 'not_owner'; end if;
  return jsonb_build_object('token', v_row.token, 'published_at', v_row.published_at, 'revision', v_row.published_revision);
end;
$$;

-- Arrêter la publication (ne supprime rien)
create function public.nvstudio_unpublish(p_project uuid)
returns void
language sql security definer set search_path = public, pg_temp as $$
  update public.nvstudio_publications
     set revoked_at = now()
   where project_id = p_project and owner_id = auth.uid() and revoked_at is null;
$$;

-- Lecture publique : les liens à durée limitée (inchangé) ET la publication permanente
create or replace function public.nvstudio_get_share(p_token text)
returns jsonb
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  s   public.nvstudio_shares;
  r   public.nvstudio_revisions;
  pub public.nvstudio_publications;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into s from public.nvstudio_shares where token = p_token;
  if found then
    if s.revoked_at is not null or s.expires_at <= now() then
      return jsonb_build_object('status', 'expired');
    end if;
    select * into r from public.nvstudio_revisions where project_id = s.project_id and revision = s.revision;
    return jsonb_build_object('status', 'ok', 'name', r.name, 'expires_at', s.expires_at, 'snapshot', r.snapshot);
  end if;

  select * into pub from public.nvstudio_publications where token = p_token;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if pub.revoked_at is not null then return jsonb_build_object('status', 'expired'); end if;
  select * into r from public.nvstudio_revisions where project_id = pub.project_id and revision = pub.published_revision;
  return jsonb_build_object(
    'status', 'ok', 'name', r.name, 'expires_at', null, 'permanent', true,
    'published_at', pub.published_at, 'snapshot', r.snapshot
  );
end;
$$;

-- Les médias privés sont lisibles par les visiteurs tant qu'un lien à durée limitée OU la publication est actif
create or replace function public.nvstudio_share_active(p_project text)
returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
           select 1 from public.nvstudio_shares s
           where s.project_id::text = p_project and s.revoked_at is null and s.expires_at > now()
         )
      or exists (
           select 1 from public.nvstudio_publications p
           where p.project_id::text = p_project and p.revoked_at is null
         );
$$;

revoke all on function public.nvstudio_publish(uuid, integer) from public, anon;
revoke all on function public.nvstudio_unpublish(uuid) from public, anon;
grant execute on function public.nvstudio_publish(uuid, integer) to authenticated;
grant execute on function public.nvstudio_unpublish(uuid) to authenticated;

commit;
