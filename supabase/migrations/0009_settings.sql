-- Artbridge OS — Settings: capability-based permissions, AI instruction
-- registry (versioned), admin audit log, and General settings.
--
-- Role/name-based checks scattered through the app (`role === 'kurator'`)
-- stay as a defense-in-depth default, but real authorization for anything
-- this migration touches goes through role_capabilities +
-- profile_capability_overrides — an admin can regrant/restrict access
-- without a code change.

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role in ('adam', 'eszter')
  );
$$ language sql stable;

-- ---------------------------------------------------------------------------
-- Capability-based permissions
-- ---------------------------------------------------------------------------
create table if not exists public.role_capabilities (
  role text not null check (role in ('adam', 'eszter', 'kurator')),
  capability text not null,
  allowed boolean not null default false,
  primary key (role, capability)
);

alter table public.role_capabilities enable row level security;
create policy "authenticated can read role_capabilities"
  on public.role_capabilities for select to authenticated using (true);
create policy "admin can manage role_capabilities"
  on public.role_capabilities for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Per-user overrides on top of the role default (spec §19) — empty until an admin adds one.
create table if not exists public.profile_capability_overrides (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  capability text not null,
  allowed boolean not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, capability)
);

alter table public.profile_capability_overrides enable row level security;
create policy "authenticated can read profile_capability_overrides"
  on public.profile_capability_overrides for select to authenticated using (true);
create policy "admin can manage profile_capability_overrides"
  on public.profile_capability_overrides for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Default capability grants matching current behavior exactly — nothing
-- changes functionally on deploy, it just becomes admin-editable from here.
insert into public.role_capabilities (role, capability, allowed) values
  ('adam', 'home', true), ('eszter', 'home', true), ('kurator', 'home', true),
  ('adam', 'tasks', true), ('eszter', 'tasks', true), ('kurator', 'tasks', true),
  ('adam', 'communications_customer', true), ('eszter', 'communications_customer', true), ('kurator', 'communications_customer', false),
  ('adam', 'communications_artist', true), ('eszter', 'communications_artist', true), ('kurator', 'communications_artist', false),
  ('adam', 'communications_developer', true), ('eszter', 'communications_developer', true), ('kurator', 'communications_developer', false),
  ('adam', 'communications_supplier', true), ('eszter', 'communications_supplier', true), ('kurator', 'communications_supplier', false),
  ('adam', 'communications_other', true), ('eszter', 'communications_other', true), ('kurator', 'communications_other', false),
  ('adam', 'artists', true), ('eszter', 'artists', true), ('kurator', 'artists', true),
  ('adam', 'marketing', true), ('eszter', 'marketing', true), ('kurator', 'marketing', true),
  ('adam', 'marketing_manage', true), ('eszter', 'marketing_manage', true), ('kurator', 'marketing_manage', false),
  ('adam', 'content', true), ('eszter', 'content', true), ('kurator', 'content', false),
  ('adam', 'email_marketing', true), ('eszter', 'email_marketing', true), ('kurator', 'email_marketing', false),
  ('adam', 'seo', true), ('eszter', 'seo', true), ('kurator', 'seo', false),
  ('adam', 'calendar', true), ('eszter', 'calendar', true), ('kurator', 'calendar', true),
  ('adam', 'projects', true), ('eszter', 'projects', true), ('kurator', 'projects', false),
  ('adam', 'settings_view', true), ('eszter', 'settings_view', true), ('kurator', 'settings_view', true),
  ('adam', 'settings_integrations', true), ('eszter', 'settings_integrations', true), ('kurator', 'settings_integrations', false),
  ('adam', 'settings_team', true), ('eszter', 'settings_team', true), ('kurator', 'settings_team', false),
  ('adam', 'settings_ai', true), ('eszter', 'settings_ai', true), ('kurator', 'settings_ai', false),
  ('adam', 'settings_audit_log', true), ('eszter', 'settings_audit_log', true), ('kurator', 'settings_audit_log', false)
on conflict (role, capability) do nothing;

-- ---------------------------------------------------------------------------
-- AI instructions — persistent, versioned, editable outside the codebase.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_instructions (
  key text primary key,
  label text not null,
  body text not null default '',
  version int not null default 1,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.ai_instructions enable row level security;
create policy "admin can manage ai_instructions"
  on public.ai_instructions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.ai_instruction_versions (
  id uuid primary key default gen_random_uuid(),
  instruction_key text not null references public.ai_instructions (key) on delete cascade,
  version int not null,
  body text not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists ai_instruction_versions_key_idx on public.ai_instruction_versions (instruction_key, version);

alter table public.ai_instruction_versions enable row level security;
create policy "admin can manage ai_instruction_versions"
  on public.ai_instruction_versions for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Seed with the exact prompt text already live in code — behavior is
-- unchanged today, it just becomes admin-editable from here on.
insert into public.ai_instructions (key, label, body) values
  ('global', 'Global Artbridge context', 'Artbridge is a curated online gallery/print shop based in Hungary that represents independent artists. Communication with customers and artists is warm, direct and human — never corporate.'),
  ('communication_business_rules', 'Customer Communication — business rules', E'- FrameTrade is NOT an active Artbridge supplier anymore. Any FrameTrade marketing, reminder, or "place your order by ..." email should NOT create a case (should_create_case=false), regardless of urgency language in the email.\n- A supplier deadline or order reminder is only actionable if the supplier is a currently active one Artbridge actually orders from.\n- A system/SaaS notification (Google Workspace, Shopify, GLS, hosting, etc.) should NOT create a case UNLESS it describes something that actually needs a human action (e.g. "91% storage used", a failed payment, a broken integration) — in that case: category=other, status=needs_review, owner=Adam.\n- Judge by content, not by sender domain or whether the message "looks" automated. A templated-looking email can still be genuinely actionable.\n- Artist applications and outreach do NOT belong here — this inbox is for operational communication with existing/known artists only.'),
  ('communication_routing', 'Customer Communication — default routing', E'- category=customer: shopping/order inquiries and complaints -> Eszter unless rules/history indicate otherwise\n- category=artist: operational questions from existing/known artists -> by subject: technical/upload issue -> Adam; curatorial/artwork/portfolio -> route to Adam for now (Curator access is separate from this inbox); commission question -> Eszter\n- category=developer: technical/backend/Shopify development issues -> Adam\n- category=supplier: supplier / procurement -> Adam by default\n- category=other: uncertain/unclassified but potentially relevant communication -> judge by content: Eszter or Adam, or leave unassigned\n\nWhen genuinely unsure, leave owner unassigned (owner = null) rather than guessing — do not assign an owner on low confidence.'),
  ('artist_research', 'Artist research — instructions', 'Artbridge is a curated online gallery/print shop that represents independent artists. Find real, currently-active artists who plausibly fit the brief — never invent facts, emails, exhibitions or biographical details you did not find. Assess fit based on whether their style/practice suits a curated print-friendly gallery, not follower counts or generic popularity.'),
  ('content', 'Content creation — instructions', ''),
  ('marketing', 'Marketing assistance — instructions', ''),
  ('email_marketing', 'Email Marketing — instructions', ''),
  ('seo', 'SEO — instructions', '')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Admin audit log — restrained, system-level events only.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_label text,
  before_summary text,
  after_summary text,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;
create policy "admin can read audit_log"
  on public.audit_log for select to authenticated using (public.is_admin());
create policy "authenticated can insert audit_log"
  on public.audit_log for insert to authenticated with check (true);

-- ---------------------------------------------------------------------------
-- General settings — singleton row.
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_settings (
  id boolean primary key default true check (id),
  company_name text not null default 'Artbridge',
  locale text not null default 'hu',
  timezone text not null default 'Europe/Budapest',
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.workspace_settings enable row level security;
create policy "authenticated can read workspace_settings"
  on public.workspace_settings for select to authenticated using (true);
create policy "admin can update workspace_settings"
  on public.workspace_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.workspace_settings (id) values (true) on conflict (id) do nothing;
