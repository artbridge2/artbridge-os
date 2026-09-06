-- Real AI usage/cost observability (Settings → AI usage) — every Anthropic
-- call site now logs here via src/lib/ai/usage-log.ts. Deliberately no full
-- prompt/response content stored, only what's needed for cost analysis.
create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  capability text not null,
  provider text not null default 'anthropic',
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_usd numeric(10, 6),
  related_object_id text,
  latency_ms integer,
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_log_created_at_idx on public.ai_usage_log (created_at);
create index if not exists ai_usage_log_capability_idx on public.ai_usage_log (capability, created_at);

alter table public.ai_usage_log enable row level security;
create policy "non-curators can read ai_usage_log"
  on public.ai_usage_log for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'kurator'));
-- No insert policy for the authenticated role — every write goes through the
-- service-role admin client (src/lib/ai/usage-log.ts), never client-facing.
