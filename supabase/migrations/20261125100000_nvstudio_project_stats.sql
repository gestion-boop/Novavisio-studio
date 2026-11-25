-- Statistiques légères des visites pour la liste « Mes projets Cloud » : nombre de panoramas et d'espaces,
-- sans télécharger les visites. SECURITY INVOKER : les politiques RLS s'appliquent.
-- Déjà appliquée sur le projet de production.
create or replace function public.nvstudio_project_stats()
returns table(project_id uuid, scenes integer, spaces integer, source text)
language sql stable security invoker set search_path = public as $$
  with last as (
    select distinct on (r.project_id) r.project_id, r.snapshot
    from public.nvstudio_revisions r order by r.project_id, r.revision desc
  )
  select p.id,
         coalesce(jsonb_array_length(case when p.working_version > 0 then p.working->'scenes' end), jsonb_array_length(l.snapshot->'scenes')),
         coalesce(jsonb_array_length(case when p.working_version > 0 then coalesce(p.working->'spaces','[]'::jsonb) end), jsonb_array_length(coalesce(l.snapshot->'spaces','[]'::jsonb))),
         case when p.working_version > 0 and p.working is not null then 'travail' when l.snapshot is not null then 'revision' else null end
  from public.nvstudio_projects p left join last l on l.project_id = p.id;
$$;
grant execute on function public.nvstudio_project_stats() to authenticated;
