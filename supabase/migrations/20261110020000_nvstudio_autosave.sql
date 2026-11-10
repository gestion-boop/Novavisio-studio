-- NovaVisio Studio — sauvegarde automatique instantanée dans Supabase.
-- Migration ADDITIVE : à exécuter APRÈS 20261110000000_nvstudio_init.sql (et, si tu veux les liens publics,
-- 20261110010000_nvstudio_share_links.sql ; l'ordre entre ces deux-là n'a pas d'importance).
--
-- Principe : chaque modification est envoyée aussitôt dans une « copie de travail » de la visite, mise à jour
-- sur place (pas une nouvelle ligne par frappe). Les révisions immuables (liens publics, versions) restent intactes.
-- Protection multi-appareils : la copie de travail porte un numéro de version ; une écriture basée sur une version
-- périmée est refusée (« conflict ») au lieu d'écraser le travail fait ailleurs.
-- N'ajoute que des colonnes et 1 fonction `nvstudio_*` ; ne modifie ni ne supprime aucune donnée existante.

begin;

alter table public.nvstudio_projects
  add column working            jsonb,
  add column working_version    integer not null default 0,
  add column working_updated_at timestamptz;

-- Écriture de la copie de travail (seul moyen de la modifier : pas d'UPDATE direct sur la table)
create function public.nvstudio_save_working(p_project uuid, p_expected integer, p_name text, p_snapshot jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_new integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then raise exception 'invalid_snapshot'; end if;

  update public.nvstudio_projects p
     set working            = p_snapshot,
         name               = left(coalesce(nullif(p_name, ''), p.name), 200),
         working_version    = p.working_version + 1,
         working_updated_at = now()
   where p.id = p_project
     and p.owner_id = v_uid
     and p.working_version = p_expected
  returning p.working_version into v_new;

  if v_new is null then
    if exists (select 1 from public.nvstudio_projects p where p.id = p_project and p.owner_id = v_uid) then
      raise exception 'conflict';
    end if;
    raise exception 'unknown_project';
  end if;

  return jsonb_build_object('version', v_new, 'updated_at', now());
end;
$$;

revoke all on function public.nvstudio_save_working(uuid, integer, text, jsonb) from public, anon;
grant execute on function public.nvstudio_save_working(uuid, integer, text, jsonb) to authenticated;

commit;
