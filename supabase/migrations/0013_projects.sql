-- Artbridge OS — Projects: a real container for multi-task initiatives
-- (e.g. "New website launch", "Store renovation"), structurally similar to
-- Marketing Campaigns but for internal operational work rather than
-- marketing. Tasks optionally belong to a project via the new project_id
-- column, the same way content_items optionally belong to a campaign.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid references public.profiles (id) on delete set null,
  start_date date,
  end_date date,
  status text not null default 'planning' check (status in ('planning', 'active', 'completed', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_owner_idx on public.projects (owner_id);

alter table public.projects enable row level security;
create policy "authenticated can manage projects"
  on public.projects for all to authenticated using (true) with check (true);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create table if not exists public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  from_value text,
  to_value text,
  created_at timestamptz not null default now()
);

create index if not exists project_events_project_idx on public.project_events (project_id, created_at);

alter table public.project_events enable row level security;
create policy "authenticated can manage project_events"
  on public.project_events for all to authenticated using (true) with check (true);

create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists project_comments_project_idx on public.project_comments (project_id, created_at);

alter table public.project_comments enable row level security;
create policy "authenticated can manage project_comments"
  on public.project_comments for all to authenticated using (true) with check (true);

-- A Task can optionally belong to a Project (independent of its existing
-- source_type/source_thread_id link back to a Communication case).
alter table public.tasks
  add column if not exists project_id uuid references public.projects (id) on delete set null;

create index if not exists tasks_project_idx on public.tasks (project_id);
