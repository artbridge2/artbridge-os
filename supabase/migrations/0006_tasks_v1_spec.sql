-- Artbridge OS — Tasks v1 spec alignment
-- Collapses the 5-state status to the spec's To do/In progress/Completed,
-- renames priority "critical" -> "urgent" (matching Communication/Home),
-- generalizes the single Communication-only link into a generic linked
-- object, and adds lightweight checklist/comments/attachments.

-- ---------------------------------------------------------------------------
-- 1. Status: backlog/todo/in_progress/waiting/done -> todo/in_progress/completed
-- ---------------------------------------------------------------------------
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks alter column status drop default;
alter table public.tasks alter column status type text;

update public.tasks set status = 'todo' where status in ('backlog', 'waiting');
update public.tasks set status = 'completed' where status = 'done';

alter table public.tasks add constraint tasks_status_check
  check (status in ('todo', 'in_progress', 'completed'));
alter table public.tasks alter column status set default 'todo';

-- ---------------------------------------------------------------------------
-- 2. Priority: "critical" -> "urgent"
-- ---------------------------------------------------------------------------
alter table public.tasks drop constraint if exists tasks_priority_check;
update public.tasks set priority = 'urgent' where priority = 'critical';
alter table public.tasks add constraint tasks_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));

-- ---------------------------------------------------------------------------
-- 3. Generalized linked object (replaces the Communication-only source_thread_id)
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column if not exists linked_type text,
  add column if not exists linked_id text,
  add column if not exists linked_href text,
  add column if not exists linked_title text;

update public.tasks
  set linked_type = 'communication', linked_id = source_thread_id::text, linked_href = '/communication/' || source_thread_id::text
  where source_thread_id is not null;

alter table public.tasks drop column if exists source_type;
alter table public.tasks drop column if exists source_thread_id;

-- ---------------------------------------------------------------------------
-- 4. Lightweight checklist (kept on the task row — never independent records)
-- ---------------------------------------------------------------------------
alter table public.tasks add column if not exists checklist jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- 5. Comments (@mentions handled in app code via the shared notifications table)
-- ---------------------------------------------------------------------------
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_idx on public.task_comments (task_id, created_at);

alter table public.task_comments enable row level security;
create policy "authenticated can manage task_comments"
  on public.task_comments for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 6. Attachments — v1 stores a name + external URL (e.g. a Drive link) only;
-- no binary upload/storage layer exists yet, so we never fabricate one.
-- ---------------------------------------------------------------------------
create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  name text not null,
  url text not null,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists task_attachments_task_idx on public.task_attachments (task_id);

alter table public.task_attachments enable row level security;
create policy "authenticated can manage task_attachments"
  on public.task_attachments for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 7. Audit events (mirrors communication_case_events)
-- ---------------------------------------------------------------------------
create table if not exists public.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  from_value text,
  to_value text,
  created_at timestamptz not null default now()
);

create index if not exists task_events_task_idx on public.task_events (task_id, created_at);

alter table public.task_events enable row level security;
create policy "authenticated can manage task_events"
  on public.task_events for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 8. Curator scope on tasks itself: own tasks only. Admins (non-curator)
-- keep full access — this replaces the old fully-permissive policy.
-- ---------------------------------------------------------------------------
drop policy if exists "authenticated can manage tasks" on public.tasks;

create policy "admins manage all tasks"
  on public.tasks for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'kurator'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'kurator'));

create policy "curators manage their own tasks"
  on public.tasks for all
  to authenticated
  using (owner_id = auth.uid() or created_by = auth.uid())
  with check (owner_id = auth.uid());
