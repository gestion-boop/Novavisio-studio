-- Agents immobiliers (Paramètres > Agents immobiliers) : liste privée par utilisateur.
-- Déjà appliquée sur le projet de production.
create table if not exists public.nvstudio_agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  info_url text not null default '',
  intro_url text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.nvstudio_agents enable row level security;
drop policy if exists nvstudio_agents_owner on public.nvstudio_agents;
create policy nvstudio_agents_owner on public.nvstudio_agents for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index if not exists nvstudio_agents_owner_idx on public.nvstudio_agents(owner_id);
