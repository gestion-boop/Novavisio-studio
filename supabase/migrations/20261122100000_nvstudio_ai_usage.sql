-- NovaStudio AI — compteur de générations par compte et par jour (limite de consommation).
-- Additive : une seule table nouvelle, lisible et modifiable uniquement par le compte concerné.
create table if not exists public.nvstudio_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);
alter table public.nvstudio_ai_usage enable row level security;
revoke all on public.nvstudio_ai_usage from anon, authenticated;
grant select, insert, update on public.nvstudio_ai_usage to authenticated;
drop policy if exists nvstudio_ai_usage_own on public.nvstudio_ai_usage;
create policy nvstudio_ai_usage_own on public.nvstudio_ai_usage for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
