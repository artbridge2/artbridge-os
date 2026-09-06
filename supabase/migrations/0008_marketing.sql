-- Artbridge OS — Marketing shell: Campaigns + shared Marketing Calendar
-- Content, Email Marketing and SEO get their own migrations later and plug
-- into campaign_links via linked_type — deliberately no FK from campaign_links
-- to those tables yet since they don't exist.

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brief text,
  owner_id uuid references public.profiles (id) on delete set null,
  start_date date,
  end_date date,
  status text not null default 'planning' check (status in ('planning', 'active', 'completed', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  goal_notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists marketing_campaigns_status_idx on public.marketing_campaigns (status);
create index if not exists marketing_campaigns_owner_idx on public.marketing_campaigns (owner_id);
create index if not exists marketing_campaigns_start_idx on public.marketing_campaigns (start_date);

alter table public.marketing_campaigns enable row level security;
create policy "authenticated can manage marketing_campaigns"
  on public.marketing_campaigns for all to authenticated using (true) with check (true);

drop trigger if exists marketing_campaigns_set_updated_at on public.marketing_campaigns;
create trigger marketing_campaigns_set_updated_at
  before update on public.marketing_campaigns
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Campaign links — a reference to an object owned by another marketing
-- submodule (Content/Email/SEO). Deliberately no duplicate copy of the
-- source object's title/status here; those modules are resolved live.
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_links (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns (id) on delete cascade,
  linked_type text not null check (linked_type in ('content', 'email', 'seo')),
  linked_id uuid not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (campaign_id, linked_type, linked_id)
);

create index if not exists campaign_links_campaign_idx on public.campaign_links (campaign_id);
create index if not exists campaign_links_type_idx on public.campaign_links (linked_type, linked_id);

alter table public.campaign_links enable row level security;
create policy "authenticated can manage campaign_links"
  on public.campaign_links for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Standalone marketing calendar events — for dates with no source object yet
-- (photoshoot, decision deadline, asset delivery, external PR date).
-- ---------------------------------------------------------------------------
create table if not exists public.marketing_calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  description text,
  owner_id uuid references public.profiles (id) on delete set null,
  campaign_id uuid references public.marketing_campaigns (id) on delete set null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  event_type text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_calendar_events_date_idx on public.marketing_calendar_events (event_date);
create index if not exists marketing_calendar_events_campaign_idx on public.marketing_calendar_events (campaign_id);

alter table public.marketing_calendar_events enable row level security;
create policy "authenticated can manage marketing_calendar_events"
  on public.marketing_calendar_events for all to authenticated using (true) with check (true);

drop trigger if exists marketing_calendar_events_set_updated_at on public.marketing_calendar_events;
create trigger marketing_calendar_events_set_updated_at
  before update on public.marketing_calendar_events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Internal discussion (@mentions handled in app code via shared notifications)
-- ---------------------------------------------------------------------------
create table if not exists public.marketing_campaign_comments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists marketing_campaign_comments_campaign_idx on public.marketing_campaign_comments (campaign_id, created_at);

alter table public.marketing_campaign_comments enable row level security;
create policy "authenticated can manage marketing_campaign_comments"
  on public.marketing_campaign_comments for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Audit events
-- ---------------------------------------------------------------------------
create table if not exists public.marketing_campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  from_value text,
  to_value text,
  created_at timestamptz not null default now()
);

create index if not exists marketing_campaign_events_campaign_idx on public.marketing_campaign_events (campaign_id, created_at);

alter table public.marketing_campaign_events enable row level security;
create policy "authenticated can manage marketing_campaign_events"
  on public.marketing_campaign_events for all to authenticated using (true) with check (true);
