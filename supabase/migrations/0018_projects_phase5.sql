-- Artbridge OS — Projects restructuring (spec §15-16).

-- Files tab, mirrors artist_documents exactly.
create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  url text not null,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists project_documents_project_idx on public.project_documents (project_id);

alter table public.project_documents enable row level security;
create policy "authenticated can manage project_documents"
  on public.project_documents for all to authenticated using (true) with check (true);

-- Project Task != Global Task (spec §16): a task linked to a project is
-- scoped to that project's own views by default and doesn't flood the
-- Global Tasks board — until explicitly promoted.
alter table public.tasks
  add column if not exists promoted_to_global boolean not null default false;
