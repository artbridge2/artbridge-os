-- Artbridge OS Core v0.1 — initial schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`)
-- against a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per Artbridge team member, keyed to auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('adam', 'eszter', 'kurator')),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "authenticated can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "authenticated can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- areas: editable list of work areas (Marketing, SEO, Webshop, ...)
-- ---------------------------------------------------------------------------
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

alter table public.areas enable row level security;

create policy "authenticated can manage areas"
  on public.areas for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'backlog'
    check (status in ('backlog', 'todo', 'in_progress', 'waiting', 'done')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'critical')),
  area_id uuid references public.areas (id) on delete set null,
  due_date date,
  due_time time,
  recurring_rule jsonb,
  recurring_parent_id uuid references public.tasks (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  next_action text,
  notes text
);

create index if not exists tasks_owner_idx on public.tasks (owner_id);
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists tasks_recurring_parent_idx on public.tasks (recurring_parent_id);

alter table public.tasks enable row level security;

create policy "authenticated can manage tasks"
  on public.tasks for all
  to authenticated
  using (true)
  with check (true);

-- keep updated_at current on every change
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- seed areas (safe to re-run)
-- ---------------------------------------------------------------------------
insert into public.areas (name, sort_order) values
  ('Marketing', 1),
  ('SEO', 2),
  ('Webshop', 3),
  ('Development', 4),
  ('Finance', 5),
  ('Admin', 6),
  ('Artists', 7),
  ('Customer Service', 8),
  ('Social', 9),
  ('Email Marketing', 10),
  ('Inventory', 11),
  ('Management', 12),
  ('Other', 13)
on conflict (name) do nothing;
