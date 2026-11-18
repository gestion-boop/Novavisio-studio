-- Bilan du stockage NovaVisio (lecture seule : ne supprime RIEN).
-- À exécuter dans le SQL Editor de Supabase.

-- 1) Poids total du bucket de médias, par projet (les chemins sont uid/projectId/…).
select
  split_part(name, '/', 2)                         as project_id,
  count(*)                                         as fichiers,
  round(sum((metadata->>'size')::bigint) / 1048576.0, 1) as mo
from storage.objects
where bucket_id = 'nvstudio-media'
group by 1
order by mo desc;

-- 2) Nombre de révisions par projet, et lesquelles sont utilisées par un lien ou une publication.
select
  r.project_id,
  p.name,
  count(*)                                         as revisions,
  count(*) filter (where exists (
    select 1 from public.nvstudio_publications pub
    where pub.project_id = r.project_id and pub.published_revision = r.revision
  ))                                               as revisions_publiees
from public.nvstudio_revisions r
left join public.nvstudio_projects p on p.id = r.project_id
group by r.project_id, p.name
order by revisions desc;

-- 3) Taille totale du bucket.
select round(sum((metadata->>'size')::bigint) / 1048576.0, 1) as mo_total
from storage.objects
where bucket_id = 'nvstudio-media';
