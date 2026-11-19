-- NovaVisio Studio — SUPPRESSION D'UNE VISITE / D'UNE FICHE CLIENT (propriétaire uniquement)
-- Le Cloud n'avait aucune suppression (toutes les clés étrangères sont « restrict »).
-- nvstudio_delete_project(p_project) supprime, dans l'ordre, tout ce qui dépend de la visite puis la visite.
-- Réservé au PROPRIÉTAIRE. Irréversible. Les fichiers déjà envoyés dans le stockage (panoramas…) ne sont pas touchés.
-- Migration idempotente. À exécuter dans le SQL Editor Supabase de NovaStudio.
begin;
create or replace function public.nvstudio_delete_project(p_project uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.nvstudio_projects where id = p_project and owner_id = auth.uid()) then
    raise exception 'not_owner';
  end if;
  delete from public.nvstudio_notes where project_id = p_project;
  delete from public.nvstudio_publications where project_id = p_project;
  delete from public.nvstudio_shares where project_id = p_project;
  delete from public.nvstudio_working_history where project_id = p_project;
  delete from public.nvstudio_members where project_id = p_project;
  delete from public.nvstudio_write_control where project_id = p_project;
  delete from public.nvstudio_revisions where project_id = p_project;
  delete from public.nvstudio_projects where id = p_project;
end $$;
revoke all on function public.nvstudio_delete_project(uuid) from public, anon;
grant execute on function public.nvstudio_delete_project(uuid) to authenticated;
commit;
