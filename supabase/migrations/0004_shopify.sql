-- Artbridge OS — Shopify integration
-- Mirrors gmail_integration's security model: the access token is only ever
-- reachable through the service-role client in trusted server code, never
-- through an RLS-scoped query path.

create table if not exists public.shopify_integration (
  id uuid primary key default gen_random_uuid(),
  shop_domain text not null,
  access_token text not null,
  scope text,
  connected_by uuid references public.profiles (id) on delete set null,
  connected_at timestamptz not null default now()
);

alter table public.shopify_integration enable row level security;
-- Deliberately no policies: RLS enabled with zero grants denies even
-- `authenticated` requests. Only the service-role key bypasses RLS.
