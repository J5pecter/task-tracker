-- ===========================================================================
-- TaskTracker schema
-- ClickUp-inspired hierarchy: workspaces -> folders -> lists -> tasks -> subtasks
-- Plus: comments, custom fields, dependencies, time tracking, labels, and
-- Outlook link metadata. Designed to support multi-user teams via memberships,
-- protected by Row Level Security (RLS).
--
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type task_priority as enum ('urgent', 'high', 'normal', 'low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dependency_type as enum ('blocking', 'waiting_on');
exception when duplicate_object then null; end $$;

do $$ begin
  create type custom_field_type as enum ('text', 'number', 'dropdown', 'date', 'checkbox');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_role as enum ('owner', 'admin', 'member', 'guest');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- user_profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists user_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  avatar_url    text,
  -- Microsoft identity + encrypted refresh token (set by the auth function).
  ms_user_id    text,
  ms_email      text,
  -- AES-256-GCM payload: iv:authTag:ciphertext (hex). Never exposed to client.
  ms_refresh_token_enc text,
  ms_token_expires_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_user_profiles_updated
  before update on user_profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
create table if not exists workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text default '#4f46e5',
  owner_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_workspaces_updated before update on workspaces
  for each row execute function set_updated_at();

-- workspace_members: who can access a workspace (enables future team features).
create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         member_role not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- ---------------------------------------------------------------------------
-- folders  (optional grouping inside a workspace)
-- ---------------------------------------------------------------------------
create table if not exists folders (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_folders_updated before update on folders
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- lists  (a.k.a. projects). May belong to a folder or directly to a workspace.
-- statuses: ordered array of {name, color} stored as jsonb for per-list customization.
-- ---------------------------------------------------------------------------
create table if not exists lists (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  folder_id    uuid references folders(id) on delete set null,
  name         text not null,
  color        text default '#6366f1',
  position     int not null default 0,
  statuses     jsonb not null default
    '[{"name":"Open","color":"#94a3b8"},{"name":"In Progress","color":"#3b82f6"},{"name":"Done","color":"#22c55e"}]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_lists_updated before update on lists
  for each row execute function set_updated_at();
create index if not exists idx_lists_workspace on lists(workspace_id);

-- ---------------------------------------------------------------------------
-- tasks  (subtasks are tasks with parent_task_id set)
-- ---------------------------------------------------------------------------
create table if not exists tasks (
  id             uuid primary key default gen_random_uuid(),
  list_id        uuid not null references lists(id) on delete cascade,
  parent_task_id uuid references tasks(id) on delete cascade,
  title          text not null,
  description    text,                         -- rich text (HTML/markdown)
  status         text not null default 'Open', -- must match one of list.statuses[].name
  priority       task_priority not null default 'normal',
  -- FK to user_profiles (not auth.users) so PostgREST can embed the assignee.
  assignee_id    uuid references user_profiles(id) on delete set null,
  due_date       timestamptz,
  start_date     timestamptz,
  estimated_minutes int,
  position       int not null default 0,
  is_completed   boolean not null default false,
  -- recurrence rule, e.g. {"freq":"weekly","interval":1,"byweekday":[1,3]}
  recurrence     jsonb,
  -- Outlook link: set when a task is imported from Microsoft To Do.
  outlook_task_id   text,
  outlook_list_id   text,
  outlook_synced_at timestamptz,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_tasks_updated before update on tasks
  for each row execute function set_updated_at();
create index if not exists idx_tasks_list   on tasks(list_id);
create index if not exists idx_tasks_parent on tasks(parent_task_id);
create index if not exists idx_tasks_assignee on tasks(assignee_id);
-- Full text search over title + description.
alter table tasks
  add column if not exists search_tsv tsvector
  generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored;
create index if not exists idx_tasks_search on tasks using gin(search_tsv);

-- ---------------------------------------------------------------------------
-- labels / tags (per workspace) + join table
-- ---------------------------------------------------------------------------
create table if not exists labels (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  color        text not null default '#64748b',
  created_at   timestamptz not null default now()
);
create table if not exists task_labels (
  task_id  uuid not null references tasks(id) on delete cascade,
  label_id uuid not null references labels(id) on delete cascade,
  primary key (task_id, label_id)
);

-- ---------------------------------------------------------------------------
-- dependencies
-- ---------------------------------------------------------------------------
create table if not exists task_dependencies (
  id              uuid primary key default gen_random_uuid(),
  task_id         uuid not null references tasks(id) on delete cascade,
  depends_on_task_id uuid not null references tasks(id) on delete cascade,
  type            dependency_type not null default 'waiting_on',
  created_at      timestamptz not null default now(),
  unique (task_id, depends_on_task_id, type),
  check (task_id <> depends_on_task_id)
);

-- ---------------------------------------------------------------------------
-- comments (threaded via parent_comment_id)
-- ---------------------------------------------------------------------------
create table if not exists comments (
  id                uuid primary key default gen_random_uuid(),
  task_id           uuid not null references tasks(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete cascade,
  -- FK to user_profiles so PostgREST can embed the comment author.
  author_id         uuid references user_profiles(id) on delete set null,
  body              text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger trg_comments_updated before update on comments
  for each row execute function set_updated_at();
create index if not exists idx_comments_task on comments(task_id);

-- ---------------------------------------------------------------------------
-- custom fields (defined per list) + values (per task)
-- ---------------------------------------------------------------------------
create table if not exists custom_fields (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references lists(id) on delete cascade,
  name       text not null,
  type       custom_field_type not null,
  -- for 'dropdown': {"options":[{"label":"A","color":"#..."}]}
  config     jsonb not null default '{}'::jsonb,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists custom_field_values (
  id              uuid primary key default gen_random_uuid(),
  custom_field_id uuid not null references custom_fields(id) on delete cascade,
  task_id         uuid not null references tasks(id) on delete cascade,
  value           jsonb,   -- shape depends on the field type
  unique (custom_field_id, task_id)
);

-- ---------------------------------------------------------------------------
-- time tracking
-- ---------------------------------------------------------------------------
create table if not exists time_entries (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  started_at   timestamptz not null,
  ended_at     timestamptz,             -- null while a timer is running
  duration_seconds int,                 -- populated when stopped
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_time_entries_task on time_entries(task_id);
create index if not exists idx_time_entries_user on time_entries(user_id);

-- ---------------------------------------------------------------------------
-- attachments (metadata; files live in the Supabase Storage bucket "attachments")
-- ---------------------------------------------------------------------------
create table if not exists attachments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  file_name   text not null,
  storage_path text not null,
  mime_type   text,
  size_bytes  bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ===========================================================================
-- Membership helper (SECURITY DEFINER to avoid RLS recursion)
-- ===========================================================================
create or replace function is_workspace_member(ws uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

-- Auto-create a profile + personal workspace on signup.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ws_id uuid;
begin
  insert into user_profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;

  insert into workspaces (name, owner_id) values ('My Workspace', new.id)
  returning id into ws_id;

  insert into workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table user_profiles      enable row level security;
alter table workspaces         enable row level security;
alter table workspace_members  enable row level security;
alter table folders            enable row level security;
alter table lists              enable row level security;
alter table tasks              enable row level security;
alter table labels             enable row level security;
alter table task_labels        enable row level security;
alter table task_dependencies  enable row level security;
alter table comments           enable row level security;
alter table custom_fields      enable row level security;
alter table custom_field_values enable row level security;
alter table time_entries       enable row level security;
alter table attachments        enable row level security;

-- user_profiles: a user manages only their own row, but can *read* the
-- profiles of anyone who shares a workspace with them (needed to display
-- assignees and comment authors on teams).
create policy "profiles read shared" on user_profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1
      from workspace_members m1
      join workspace_members m2 on m1.workspace_id = m2.workspace_id
      where m1.user_id = auth.uid() and m2.user_id = user_profiles.id
    )
  );
create policy "profiles self insert" on user_profiles
  for insert with check (id = auth.uid());
create policy "profiles self update" on user_profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- workspaces: members can read; owner can write.
create policy "ws read" on workspaces
  for select using (is_workspace_member(id));
create policy "ws insert" on workspaces
  for insert with check (owner_id = auth.uid());
create policy "ws update" on workspaces
  for update using (owner_id = auth.uid());
create policy "ws delete" on workspaces
  for delete using (owner_id = auth.uid());

-- workspace_members: members can read the roster; owner manages membership.
create policy "members read" on workspace_members
  for select using (is_workspace_member(workspace_id));
create policy "members manage" on workspace_members
  for all using (
    exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  ) with check (
    exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

-- Generic helper policies for workspace-scoped tables.
create policy "folders member" on folders
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

create policy "lists member" on lists
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

create policy "labels member" on labels
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- tasks: access derived from the parent list's workspace.
create policy "tasks member" on tasks
  for all using (
    exists (
      select 1 from lists l
      where l.id = tasks.list_id and is_workspace_member(l.workspace_id)
    )
  ) with check (
    exists (
      select 1 from lists l
      where l.id = tasks.list_id and is_workspace_member(l.workspace_id)
    )
  );

-- child tables scoped through tasks -> lists -> workspace
create policy "task_labels member" on task_labels
  for all using (
    exists (select 1 from tasks t join lists l on l.id = t.list_id
            where t.id = task_labels.task_id and is_workspace_member(l.workspace_id))
  ) with check (
    exists (select 1 from tasks t join lists l on l.id = t.list_id
            where t.id = task_labels.task_id and is_workspace_member(l.workspace_id))
  );

create policy "deps member" on task_dependencies
  for all using (
    exists (select 1 from tasks t join lists l on l.id = t.list_id
            where t.id = task_dependencies.task_id and is_workspace_member(l.workspace_id))
  ) with check (
    exists (select 1 from tasks t join lists l on l.id = t.list_id
            where t.id = task_dependencies.task_id and is_workspace_member(l.workspace_id))
  );

create policy "comments member" on comments
  for all using (
    exists (select 1 from tasks t join lists l on l.id = t.list_id
            where t.id = comments.task_id and is_workspace_member(l.workspace_id))
  ) with check (
    exists (select 1 from tasks t join lists l on l.id = t.list_id
            where t.id = comments.task_id and is_workspace_member(l.workspace_id))
  );

create policy "cf member" on custom_fields
  for all using (
    exists (select 1 from lists l where l.id = custom_fields.list_id and is_workspace_member(l.workspace_id))
  ) with check (
    exists (select 1 from lists l where l.id = custom_fields.list_id and is_workspace_member(l.workspace_id))
  );

create policy "cfv member" on custom_field_values
  for all using (
    exists (select 1 from tasks t join lists l on l.id = t.list_id
            where t.id = custom_field_values.task_id and is_workspace_member(l.workspace_id))
  ) with check (
    exists (select 1 from tasks t join lists l on l.id = t.list_id
            where t.id = custom_field_values.task_id and is_workspace_member(l.workspace_id))
  );

create policy "time member" on time_entries
  for all using (
    exists (select 1 from tasks t join lists l on l.id = t.list_id
            where t.id = time_entries.task_id and is_workspace_member(l.workspace_id))
  ) with check (
    exists (select 1 from tasks t join lists l on l.id = t.list_id
            where t.id = time_entries.task_id and is_workspace_member(l.workspace_id))
  );

create policy "attachments member" on attachments
  for all using (
    exists (select 1 from tasks t join lists l on l.id = t.list_id
            where t.id = attachments.task_id and is_workspace_member(l.workspace_id))
  ) with check (
    exists (select 1 from tasks t join lists l on l.id = t.list_id
            where t.id = attachments.task_id and is_workspace_member(l.workspace_id))
  );

-- ===========================================================================
-- Storage bucket for attachments (run once).
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments storage member read" on storage.objects
  for select using (bucket_id = 'attachments' and auth.role() = 'authenticated');
create policy "attachments storage member write" on storage.objects
  for insert with check (bucket_id = 'attachments' and auth.role() = 'authenticated');
