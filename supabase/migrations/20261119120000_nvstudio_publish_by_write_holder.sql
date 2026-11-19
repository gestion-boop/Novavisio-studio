-- NovaVisio Studio — PUBLICATION PAR LE TITULAIRE DE « LA MAIN »
-- Avant : seul le propriétaire pouvait publier, arrêter la publication ou même lire la publication.
-- Après : le propriétaire ET le participant qui détient explicitement « la main » sur la visite peuvent publier,
--         arrêter la publication, et lire la publication (donc télécharger le fichier HTML pour NovaTour).
--
-- Règle (nvstudio_can_publish) :
--   * propriétaire de la visite ; ou
--   * participant (nvstudio_members) dont l'adresse est le titulaire explicite de la main (nvstudio_write_control.holder_email).
--   Un participant SANS la main, ou quand personne n'est titulaire, ne peut PAS publier : publier est une action visible
--   à l'extérieur, elle exige un titulaire désigné.
--
-- Ce qui ne change pas : l'adresse permanente (jeton) reste attachée à la visite et reste stable ; elle est toujours
-- créée au nom du propriétaire ; les liens à durée limitée ; la lecture publique par jeton (nvstudio_get_share).
-- Migration idempotente (create or replace). À exécuter APRÈS 20261110040000 et 20261112155310.

begin;

create or replace function public.nvstudio_can_publish(p_project uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
           select 1 from public.nvstudio_projects p
            where p.id = p_project and p.owner_id = auth.uid()
         )
      or exists (
           select 1
             from public.nvstudio_write_control w
             join public.nvstudio_members m on m.project_id = w.project_id and lower(m.email) = lower(w.holder_email)
            where w.project_id = p_project
              and w.holder_email is not null
              and lower(w.holder_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
         );
$$;
revoke all on function public.nvstudio_can_publish(uuid) from public, anon;
grant execute on function public.nvstudio_can_publish(uuid) to authenticated;

-- Publier (ou mettre à jour) : propriétaire ou titulaire de la main.
create or replace function public.nvstudio_publish(p_project uuid, p_revision integer)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
  v_row   public.nvstudio_publications;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.nvstudio_can_publish(p_project) then raise exception 'not_owner'; end if;
  if not exists (
    select 1 from public.nvstudio_revisions r
     where r.project_id = p_project and r.revision = p_revision
  ) then raise exception 'unknown_revision'; end if;

  select owner_id into v_owner from public.nvstudio_projects where id = p_project;

  insert into public.nvstudio_publications (project_id, owner_id, published_revision)
  values (p_project, v_owner, p_revision)
  on conflict (project_id) do update
     set published_revision = excluded.published_revision, published_at = now(), revoked_at = null
  returning * into v_row;

  return jsonb_build_object('token', v_row.token, 'published_at', v_row.published_at, 'revision', v_row.published_revision);
end;
$$;

-- Arrêter la publication (ne supprime rien) : propriétaire ou titulaire de la main.
create or replace function public.nvstudio_unpublish(p_project uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.nvstudio_can_publish(p_project) then raise exception 'not_owner'; end if;
  update public.nvstudio_publications
     set revoked_at = now()
   where project_id = p_project and revoked_at is null;
end;
$$;

-- Lecture de la publication (jeton compris) : propriétaire ou titulaire de la main.
drop policy if exists nvstudio_publications_select on public.nvstudio_publications;
create policy nvstudio_publications_select on public.nvstudio_publications
  for select to authenticated
  using (owner_id = auth.uid() or public.nvstudio_can_publish(project_id));

commit;
