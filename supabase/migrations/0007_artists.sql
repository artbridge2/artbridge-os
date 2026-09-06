-- Artbridge OS — Artists module
-- Canonical Artist record + the full acquisition pipeline (Application,
-- Research session/result, Outreach thread — deliberately separate from
-- Communication's email_threads to keep the ownership boundary the spec
-- requires — Discussion, Onboarding, Documents, audit events.
--
-- Unlike Communication, Artists is NOT locked away from any role: Lili
-- (curator) is its primary user and Adam/Eszter (admin) have full
-- oversight, so RLS here stays permissive to any authenticated user,
-- matching the original Tasks/Communication baseline model.

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  artist_name text,
  email text,
  phone text,
  bio text,
  technique text,
  location text,
  website text,
  instagram text,
  other_links jsonb not null default '[]'::jsonb,
  source text not null check (source in ('application', 'research', 'direct')),
  status text not null default 'candidate'
    check (status in ('candidate', 'contacted', 'in_conversation', 'maybe_later', 'accepted', 'active', 'inactive', 'rejected')),
  owner_id uuid references public.profiles (id) on delete set null,
  fit_assessment text check (fit_assessment is null or fit_assessment in ('strong', 'possible', 'weak')),
  fit_rationale text,
  commission_terms text,
  onboarding_commission_at timestamptz,
  onboarding_commission_by uuid references public.profiles (id) on delete set null,
  onboarding_registration_at timestamptz,
  onboarding_registration_by uuid references public.profiles (id) on delete set null,
  onboarding_upload_at timestamptz,
  onboarding_upload_by uuid references public.profiles (id) on delete set null,
  onboarding_published_at timestamptz,
  onboarding_published_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists artists_status_idx on public.artists (status);
create index if not exists artists_owner_idx on public.artists (owner_id);
create index if not exists artists_email_idx on public.artists (email);
create index if not exists artists_instagram_idx on public.artists (instagram);

alter table public.artists enable row level security;
create policy "authenticated can manage artists"
  on public.artists for all to authenticated using (true) with check (true);

drop trigger if exists artists_set_updated_at on public.artists;
create trigger artists_set_updated_at
  before update on public.artists
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Applications
-- ---------------------------------------------------------------------------
create table if not exists public.artist_applications (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists (id) on delete set null,
  raw_name text,
  raw_email text,
  raw_message text,
  raw_links jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'accepted', 'rejected', 'maybe_later')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists artist_applications_status_idx on public.artist_applications (review_status);
create index if not exists artist_applications_artist_idx on public.artist_applications (artist_id);

alter table public.artist_applications enable row level security;
create policy "authenticated can manage artist_applications"
  on public.artist_applications for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Research sessions, conversation turns and results
-- ---------------------------------------------------------------------------
create table if not exists public.artist_research_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  brief text not null,
  created_by uuid references public.profiles (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.artist_research_sessions enable row level security;
create policy "authenticated can manage artist_research_sessions"
  on public.artist_research_sessions for all to authenticated using (true) with check (true);

drop trigger if exists artist_research_sessions_set_updated_at on public.artist_research_sessions;
create trigger artist_research_sessions_set_updated_at
  before update on public.artist_research_sessions
  for each row execute function public.set_updated_at();

create table if not exists public.artist_research_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.artist_research_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists artist_research_messages_session_idx on public.artist_research_messages (session_id, created_at);

alter table public.artist_research_messages enable row level security;
create policy "authenticated can manage artist_research_messages"
  on public.artist_research_messages for all to authenticated using (true) with check (true);

create table if not exists public.artist_research_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.artist_research_sessions (id) on delete cascade,
  full_name text not null,
  artist_name text,
  location text,
  bio text,
  technique text,
  website text,
  instagram text,
  email text,
  portfolio_links jsonb not null default '[]'::jsonb,
  source_links jsonb not null default '[]'::jsonb,
  fit_assessment text check (fit_assessment is null or fit_assessment in ('strong', 'possible', 'weak')),
  fit_rationale text,
  state text not null default 'pending' check (state in ('pending', 'saved', 'dismissed')),
  saved_artist_id uuid references public.artists (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists artist_research_results_session_idx on public.artist_research_results (session_id);

alter table public.artist_research_results enable row level security;
create policy "authenticated can manage artist_research_results"
  on public.artist_research_results for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Outreach — deliberately separate from email_threads/email_messages so an
-- acquisition conversation never becomes a duplicate CommunicationCase.
-- ---------------------------------------------------------------------------
create table if not exists public.artist_outreach_threads (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  gmail_thread_id text unique,
  subject text,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists artist_outreach_threads_artist_idx on public.artist_outreach_threads (artist_id);
create index if not exists artist_outreach_threads_gmail_idx on public.artist_outreach_threads (gmail_thread_id);

alter table public.artist_outreach_threads enable row level security;
create policy "authenticated can manage artist_outreach_threads"
  on public.artist_outreach_threads for all to authenticated using (true) with check (true);

create table if not exists public.artist_outreach_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.artist_outreach_threads (id) on delete cascade,
  gmail_message_id text unique,
  sender text,
  is_inbound boolean not null default true,
  sanitized_body text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists artist_outreach_messages_thread_idx on public.artist_outreach_messages (thread_id, sent_at);

alter table public.artist_outreach_messages enable row level security;
create policy "authenticated can manage artist_outreach_messages"
  on public.artist_outreach_messages for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Internal discussion (@mentions handled in app code via shared notifications)
-- ---------------------------------------------------------------------------
create table if not exists public.artist_comments (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists artist_comments_artist_idx on public.artist_comments (artist_id, created_at);

alter table public.artist_comments enable row level security;
create policy "authenticated can manage artist_comments"
  on public.artist_comments for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Documents — same lightweight name+URL pattern as task_attachments.
-- ---------------------------------------------------------------------------
create table if not exists public.artist_documents (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  name text not null,
  url text not null,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists artist_documents_artist_idx on public.artist_documents (artist_id);

alter table public.artist_documents enable row level security;
create policy "authenticated can manage artist_documents"
  on public.artist_documents for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Audit events
-- ---------------------------------------------------------------------------
create table if not exists public.artist_events (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  from_value text,
  to_value text,
  created_at timestamptz not null default now()
);

create index if not exists artist_events_artist_idx on public.artist_events (artist_id, created_at);

alter table public.artist_events enable row level security;
create policy "authenticated can manage artist_events"
  on public.artist_events for all to authenticated using (true) with check (true);
