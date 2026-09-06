-- Artbridge OS — Content module: a real pipeline for blog/social/video/email-
-- copy/product-page-copy pieces, optionally linked to a Marketing Campaign
-- via the existing campaign_links seam (linked_type = 'content').

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content_type text not null default 'blog_post'
    check (content_type in ('blog_post', 'social_post', 'video', 'email_copy', 'product_page_copy', 'other')),
  status text not null default 'idea'
    check (status in ('idea', 'drafting', 'in_review', 'scheduled', 'published')),
  body text,
  owner_id uuid references public.profiles (id) on delete set null,
  campaign_id uuid references public.marketing_campaigns (id) on delete set null,
  publish_date date,
  published_url text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists content_items_status_idx on public.content_items (status);
create index if not exists content_items_owner_idx on public.content_items (owner_id);
create index if not exists content_items_campaign_idx on public.content_items (campaign_id);
create index if not exists content_items_publish_date_idx on public.content_items (publish_date);

alter table public.content_items enable row level security;
create policy "authenticated can manage content_items"
  on public.content_items for all to authenticated using (true) with check (true);

drop trigger if exists content_items_set_updated_at on public.content_items;
create trigger content_items_set_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();

create table if not exists public.content_item_events (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  from_value text,
  to_value text,
  created_at timestamptz not null default now()
);

create index if not exists content_item_events_item_idx on public.content_item_events (content_item_id, created_at);

alter table public.content_item_events enable row level security;
create policy "authenticated can manage content_item_events"
  on public.content_item_events for all to authenticated using (true) with check (true);
