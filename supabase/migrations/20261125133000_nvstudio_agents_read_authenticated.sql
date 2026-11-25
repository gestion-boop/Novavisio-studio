-- Let signed-in users select agents from the shared directory.
-- The existing owner policy continues to govern writes.
create policy nvstudio_agents_read_authenticated
  on public.nvstudio_agents
  for select
  to authenticated
  using (true);
