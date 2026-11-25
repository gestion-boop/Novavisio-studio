-- Nombre de panoramas et d'espaces de chaque révision (historique du panneau Cloud). Déjà appliquée sur la production.
create or replace function public.nvstudio_revision_stats(p_project uuid)
returns table(revision integer, scenes integer, spaces integer)
language sql stable security invoker set search_path = public as $$
  select r.revision,
         jsonb_array_length(coalesce(r.snapshot->'scenes','[]'::jsonb)),
         jsonb_array_length(coalesce(r.snapshot->'spaces','[]'::jsonb))
  from public.nvstudio_revisions r where r.project_id = p_project order by r.revision desc limit 100;
$$;
grant execute on function public.nvstudio_revision_stats(uuid) to authenticated;
