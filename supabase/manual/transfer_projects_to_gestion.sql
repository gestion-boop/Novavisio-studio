-- NovaVisio Studio — transférer TOUS les projets de sylvain2909@gmail.com vers gestion@novavisio.fr
-- et faire de gestion@novavisio.fr un administrateur.
-- À exécuter dans le SQL Editor de Supabase (projet qui héberge NovaVisio Studio). Aucune donnée n'est supprimée.
--
-- Étape 0 (avant) : gestion@novavisio.fr doit s'être connecté AU MOINS UNE FOIS à NovaVisio Studio
-- (sinon son compte n'existe pas encore et le script s'arrête avec un message clair).

-- ───────── 1) APERÇU (lecture seule) : les projets qui vont changer de propriétaire ─────────
select p.id, p.name, p.created_at
  from public.nvstudio_projects p
 where p.owner_id = (select id from auth.users where lower(email) = 'sylvain2909@gmail.com')
 order by p.created_at desc;

-- ───────── 2) TRANSFERT (une seule transaction : tout ou rien) ─────────
begin;
do $$
declare
  v_from uuid := (select id from auth.users where lower(email) = 'sylvain2909@gmail.com');
  v_to   uuid := (select id from auth.users where lower(email) = 'gestion@novavisio.fr');
  n_projects int; n_rev int; n_shares int; n_pub int;
begin
  if v_from is null then raise exception 'Compte sylvain2909@gmail.com introuvable.'; end if;
  if v_to   is null then raise exception 'Compte gestion@novavisio.fr introuvable : connecte-toi une fois avec ce compte à NovaVisio Studio, puis relance.'; end if;
  if v_from = v_to  then raise exception 'Les deux comptes sont identiques.'; end if;

  -- Les projets, leurs révisions, liens temporaires et publications permanentes changent de propriétaire.
  update public.nvstudio_projects     set owner_id = v_to where owner_id = v_from; get diagnostics n_projects = row_count;
  update public.nvstudio_revisions    set owner_id = v_to where owner_id = v_from; get diagnostics n_rev      = row_count;
  update public.nvstudio_shares       set owner_id = v_to where owner_id = v_from; get diagnostics n_shares   = row_count;
  update public.nvstudio_publications set owner_id = v_to where owner_id = v_from; get diagnostics n_pub      = row_count;

  -- gestion est désormais propriétaire : plus besoin d'une ligne « membre » pour lui.
  delete from public.nvstudio_members m
   using public.nvstudio_projects p
   where m.project_id = p.id and p.owner_id = v_to and m.email = 'gestion@novavisio.fr';

  -- sylvain2909@gmail.com garde la main sur ces projets, en tant qu'administrateur.
  insert into public.nvstudio_members (project_id, email, added_by)
  select p.id, 'sylvain2909@gmail.com', v_to
    from public.nvstudio_projects p
   where p.owner_id = v_to
     and not exists (select 1 from public.nvstudio_members m where m.project_id = p.id and m.email = 'sylvain2909@gmail.com')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'nvstudio_members' and column_name = 'role');
  -- (la colonne « role » existe si la migration 20261113130000 est appliquée)
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'nvstudio_members' and column_name = 'role') then
    execute $q$update public.nvstudio_members set role = 'admin' where email = 'sylvain2909@gmail.com'
                 and project_id in (select id from public.nvstudio_projects where owner_id = $1)$q$ using v_to;
    -- gestion@novavisio.fr : administrateur sur tous les projets (en plus d'être propriétaire des siens).
    execute $q$create table if not exists public.nvstudio_global_admins (email text primary key check (email = lower(email)))$q$;
    execute $q$insert into public.nvstudio_global_admins(email) values ('gestion@novavisio.fr') on conflict do nothing$q$;
  end if;

  raise notice 'Transfert terminé : % projet(s), % révision(s), % lien(s) temporaire(s), % publication(s).', n_projects, n_rev, n_shares, n_pub;
end $$;
commit;

-- ───────── 3) CONTRÔLE ─────────
select p.name, (select email from auth.users where id = p.owner_id) as proprietaire
  from public.nvstudio_projects p
 order by p.created_at desc;
select * from public.nvstudio_global_admins;
