-- Artbridge OS — Inbox v0.1
-- Adds Gmail-backed email thread tracking, AI classification fields, and a
-- link from tasks back to the thread they were created from.

-- ---------------------------------------------------------------------------
-- email_threads
-- ---------------------------------------------------------------------------
create table if not exists public.email_threads (
  id uuid primary key default gen_random_uuid(),
  gmail_thread_id text not null unique,
  subject text,
  participants jsonb not null default '[]'::jsonb,
  sender text,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  snippet text,

  category text
    check (category in (
      'customer', 'artist', 'development', 'finance_admin',
      'supplier_logistics', 'marketing_partner', 'system', 'noise'
    )),
  action text
    check (action in ('reply', 'task', 'reply_task', 'waiting', 'fyi', 'ignore')),
  owner_id uuid references public.profiles (id) on delete set null,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'critical')),
  status text not null default 'needs_attention'
    check (status in ('needs_attention', 'waiting', 'done')),

  follow_up_at date,
  ai_summary text,
  ai_confidence numeric,
  suggested_task_title text,
  draft_reply text,
  draft_generated_at timestamptz,
  classification_version int not null default 0,
  last_classified_message_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_threads_status_idx on public.email_threads (status);
create index if not exists email_threads_owner_idx on public.email_threads (owner_id);
create index if not exists email_threads_category_idx on public.email_threads (category);
create index if not exists email_threads_last_message_idx on public.email_threads (last_message_at);

alter table public.email_threads enable row level security;

-- Permissive for now (matches tasks: Ádám/Eszter see everything). Written so
-- a future Curator->artist-only restriction is a policy change, not a schema
-- change: swap this for a role/category-aware policy later.
create policy "authenticated can manage email_threads"
  on public.email_threads for all
  to authenticated
  using (true)
  with check (true);

drop trigger if exists email_threads_set_updated_at on public.email_threads;
create trigger email_threads_set_updated_at
  before update on public.email_threads
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- email_messages — individual Gmail messages within a thread
-- ---------------------------------------------------------------------------
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.email_threads (id) on delete cascade,
  gmail_message_id text not null unique,
  sender text,
  recipients jsonb not null default '[]'::jsonb,
  is_inbound boolean not null default true,
  -- Plain-text or pre-sanitized body only. Never store/render raw HTML from
  -- the message — see src/lib/gmail/sanitize.ts.
  sanitized_body text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_messages_thread_idx on public.email_messages (thread_id, sent_at);

alter table public.email_messages enable row level security;

create policy "authenticated can read email_messages"
  on public.email_messages for select
  to authenticated
  using (true);

-- Only server code (service role) inserts messages during sync — no
-- authenticated insert/update/delete policy needed.

-- ---------------------------------------------------------------------------
-- gmail_integration — OAuth tokens, service-role access only (no RLS policy
-- grants anything to `authenticated`; only the service-role client, used
-- exclusively in trusted server code, can read/write this table).
-- ---------------------------------------------------------------------------
create table if not exists public.gmail_integration (
  id uuid primary key default gen_random_uuid(),
  connected_email text not null,
  refresh_token text not null,
  access_token text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  connected_by uuid references public.profiles (id) on delete set null,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_history_id text
);

alter table public.gmail_integration enable row level security;
-- Deliberately no policies: RLS enabled with zero grants means even
-- `authenticated` requests are denied. Only the service-role key bypasses
-- RLS, and that key only ever lives in trusted server code.

-- ---------------------------------------------------------------------------
-- tasks: link back to the email thread a task was created from
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column if not exists source_type text
    check (source_type is null or source_type in ('email')),
  add column if not exists source_thread_id uuid
    references public.email_threads (id) on delete set null;

create index if not exists tasks_source_thread_idx on public.tasks (source_thread_id);
