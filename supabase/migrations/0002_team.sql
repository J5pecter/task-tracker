-- ===========================================================================
-- Team collaboration: workspace invites + auto-join on signup.
-- Run this in the Supabase SQL editor AFTER 0001_init.sql.
-- ===========================================================================

-- Pending invites by email. When the invited person signs up (or if they
-- already have an account), they become a workspace_member.
create table if not exists workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email        text not null,
  role         member_role not null default 'member',
  invited_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  -- Email is always stored lower-cased by the API, so a plain unique is
  -- effectively case-insensitive and works as an ON CONFLICT target.
  unique (workspace_id, email)
);

alter table workspace_invites enable row level security;

-- Members can see pending invites for their workspace the owner manages them.
drop policy if exists "invites read" on workspace_invites;
create policy "invites read" on workspace_invites
  for select using (is_workspace_member(workspace_id));

drop policy if exists "invites manage" on workspace_invites;
create policy "invites manage" on workspace_invites
  for all using (
    exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  ) with check (
    exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Recreate the signup handler so it also resolves pending invites: a new user
-- is auto-added to every workspace they were invited to, and those invites are
-- consumed.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ws_id uuid;
  inv record;
begin
  insert into user_profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;

  insert into workspaces (name, owner_id) values ('My Workspace', new.id)
  returning id into ws_id;

  insert into workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  -- Consume any invites addressed to this email.
  for inv in
    select * from workspace_invites where lower(email) = lower(new.email)
  loop
    insert into workspace_members (workspace_id, user_id, role)
    values (inv.workspace_id, new.id, inv.role)
    on conflict (workspace_id, user_id) do nothing;
    delete from workspace_invites where id = inv.id;
  end loop;

  return new;
end $$;
