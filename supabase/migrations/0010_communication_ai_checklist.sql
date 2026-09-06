-- Artbridge OS — Communication: AI-generated next-actions checklist,
-- inferred from case context at classification time rather than manually
-- created by a human every time (spec: "AI should generate the checklist").
alter table public.email_threads
  add column if not exists ai_checklist jsonb not null default '[]'::jsonb;
