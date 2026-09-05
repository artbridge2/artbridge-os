-- Artbridge OS — Communication v1 spec alignment
-- Real 7-state lifecycle, category taxonomy without "internal", issue types,
-- Shopify linkage, ingestion suppression, notifications, audit events, and
-- role-based RLS (curators get zero Communication access at the DB level,
-- not just a hidden nav item).

-- ---------------------------------------------------------------------------
-- 1. Status: needs_attention/waiting/done -> full lifecycle
-- ---------------------------------------------------------------------------
alter table public.email_threads drop constraint if exists email_threads_status_check;

alter table public.email_threads alter column status drop default;
alter table public.email_threads alter column status type text;

update public.email_threads set status = 'needs_reply'
  where status = 'needs_attention' and action in ('reply', 'reply_task');
update public.email_threads set status = 'needs_review'
  where status = 'needs_attention' and (action is null or action not in ('reply', 'reply_task'));
update public.email_threads set status = 'resolved' where status = 'done';
-- 'waiting' already matches the new enum's spelling.

alter table public.email_threads add constraint email_threads_status_check
  check (status in ('new', 'needs_reply', 'needs_review', 'in_progress', 'waiting', 'resolved', 'archived'));
alter table public.email_threads alter column status set default 'new';

-- ---------------------------------------------------------------------------
-- 2. Priority: reuse of the Task enum's "critical" -> spec's "urgent"
-- ---------------------------------------------------------------------------
alter table public.email_threads drop constraint if exists email_threads_priority_check;
update public.email_threads set priority = 'urgent' where priority = 'critical';
alter table public.email_threads add constraint email_threads_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));

-- ---------------------------------------------------------------------------
-- 3. Category: drop "internal" (replaced by internal notes on any case) and
-- "system"/"noise" (replaced by the `suppressed` ingestion flag below).
-- ---------------------------------------------------------------------------
alter table public.email_threads drop constraint if exists email_threads_category_check;
update public.email_threads set category = 'other'
  where category in ('internal', 'system', 'noise') or category is null;
alter table public.email_threads add constraint email_threads_category_check
  check (category in ('customer', 'artist', 'developer', 'supplier', 'other'));
alter table public.email_threads alter column category set default 'other';
alter table public.email_threads alter column category set not null;

-- ---------------------------------------------------------------------------
-- 4. Ingestion: a message that shouldn't be an active case (newsletter,
-- automated no-reply, etc.) is `suppressed`, not force-categorized as noise.
-- ---------------------------------------------------------------------------
alter table public.email_threads
  add column if not exists suppressed boolean not null default false;

update public.email_threads set suppressed = true where action = 'ignore';

-- ---------------------------------------------------------------------------
-- 5. New case fields the spec requires
-- ---------------------------------------------------------------------------
alter table public.email_threads
  add column if not exists issue_type text,
  add column if not exists suggested_next_action text,
  add column if not exists shopify_customer_id text,
  add column if not exists shopify_order_id text,
  add column if not exists shopify_match_confidence text
    check (shopify_match_confidence is null or shopify_match_confidence in ('confirmed', 'suggested')),
  add column if not exists archived_at timestamptz;

-- `action` (reply/task/reply_task/waiting/fyi/ignore) is superseded by the
-- real `status` + `issue_type` + `suggested_next_action` fields above.
alter table public.email_threads drop column if exists action;

create index if not exists email_threads_suppressed_idx on public.email_threads (suppressed);
create index if not exists email_threads_shopify_customer_idx on public.email_threads (shopify_customer_id);

-- ---------------------------------------------------------------------------
-- 6. Ingestion suppression rules ("Never/Always create ticket from this…")
-- ---------------------------------------------------------------------------
create table if not exists public.communication_ingestion_rules (
  id uuid primary key default gen_random_uuid(),
  rule_type text not null check (rule_type in ('never_create', 'always_create')),
  match_type text not null check (match_type in ('sender', 'domain', 'subject_pattern')),
  pattern text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.communication_ingestion_rules enable row level security;
create policy "non-curators can manage ingestion rules"
  on public.communication_ingestion_rules for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'kurator'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'kurator'));

-- ---------------------------------------------------------------------------
-- 7. Audit events (assignment/status/category changes, sends, notes, ...)
-- ---------------------------------------------------------------------------
create table if not exists public.communication_case_events (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.email_threads (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  from_value text,
  to_value text,
  created_at timestamptz not null default now()
);

create index if not exists communication_case_events_thread_idx on public.communication_case_events (thread_id, created_at);

alter table public.communication_case_events enable row level security;
create policy "non-curators can read case events"
  on public.communication_case_events for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'kurator'));
create policy "non-curators can insert case events"
  on public.communication_case_events for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'kurator'));

-- ---------------------------------------------------------------------------
-- 8. Real per-user notifications (bell)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at);

alter table public.notifications enable row level security;
create policy "users can read their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());
create policy "users can update their own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- Inserts happen from trusted server actions using the regular client while
-- acting on another user's behalf (e.g. notifying an assignee) — allow any
-- non-curator authenticated user to insert, matching the existing
-- permissive-internal-tool model.
create policy "non-curators can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'kurator'));

-- ---------------------------------------------------------------------------
-- 9. Role-based RLS: curators get zero Communication access at the DB level.
-- ---------------------------------------------------------------------------
drop policy if exists "authenticated can manage email_threads" on public.email_threads;
create policy "non-curators can manage email_threads"
  on public.email_threads for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'kurator'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'kurator'));

drop policy if exists "authenticated can read email_messages" on public.email_messages;
create policy "non-curators can read email_messages"
  on public.email_messages for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'kurator'));

drop policy if exists "authenticated can insert email_messages" on public.email_messages;
create policy "non-curators can insert email_messages"
  on public.email_messages for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'kurator'));
