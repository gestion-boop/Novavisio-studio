-- NovaVisio Studio — notes par projet (privées ou partagées avec l'équipe du projet).
-- Migration ADDITIVE : crée une seule table (nvstudio_notes). Ne modifie ni ne supprime aucune donnée existante.
-- À exécuter une fois (SQL Editor de Supabase). Idempotente.
--
-- Règles (appliquées par Supabase lui-même, pas seulement par l'écran) :
--  * une note privée n'est visible que par son auteur ;
--  * une note partagée est visible par le propriétaire du projet et par les personnes invitées ;
--  * seul l'auteur peut modifier, rendre privée / partagée ou supprimer sa note ;
--  * ces notes ne sont JAMAIS incluses dans la visite publiée ni dans les exports (elles ne font pas partie du projet).
begin;

create table if not exists public.nvstudio_notes (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.nvstudio_projects(id) on delete cascade,
  author_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_email text not null default lower(coalesce(auth.jwt() ->> 'email', '')),
  body         text not null check (char_length(body) between 1 and 4000),
  shared       boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists nvstudio_notes_project_idx on public.nvstudio_notes (project_id, created_at);
alter table public.nvstudio_notes enable row level security;
revoke all on public.nvstudio_notes from anon, authenticated;
grant select, insert, update, delete on public.nvstudio_notes to authenticated;

create or replace function nvstudio_notes_can_access(p_project uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (select 1 from public.nvstudio_projects p where p.id = p_project and p.owner_id = auth.uid())
      or public.nvstudio_is_member(p_project);
$$;
revoke all on function nvstudio_notes_can_access(uuid) from public, anon;
grant execute on function nvstudio_notes_can_access(uuid) to authenticated;

drop policy if exists nvstudio_notes_select on public.nvstudio_notes;
create policy nvstudio_notes_select on public.nvstudio_notes
  for select to authenticated using (
    author_id = auth.uid() or (shared and nvstudio_notes_can_access(project_id))
  );
drop policy if exists nvstudio_notes_insert on public.nvstudio_notes;
create policy nvstudio_notes_insert on public.nvstudio_notes
  for insert to authenticated with check (author_id = auth.uid() and nvstudio_notes_can_access(project_id));
drop policy if exists nvstudio_notes_update on public.nvstudio_notes;
create policy nvstudio_notes_update on public.nvstudio_notes
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid() and nvstudio_notes_can_access(project_id));
drop policy if exists nvstudio_notes_delete on public.nvstudio_notes;
create policy nvstudio_notes_delete on public.nvstudio_notes
  for delete to authenticated using (author_id = auth.uid());

commit;
