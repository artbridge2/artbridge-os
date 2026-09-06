-- Artbridge OS — Communications V2 reliability pass.

-- Checkpointed/resumable Gmail sync: threads discovered in one run that
-- weren't fully processed before the time budget ran out stay queued here,
-- independent of whether last_history_id has already advanced past them.
create table if not exists public.gmail_sync_pending (
  gmail_thread_id text primary key,
  discovered_at timestamptz not null default now()
);

-- Confidence-based routing enforced in code, not just the prompt (spec point
-- 3) reuses the existing status='needs_review' queue/filter (already fully
-- wired in the UI) rather than adding a second, competing "review" concept —
-- a low-confidence classification is simply routed there like any other.

-- Separates human-set operational state from AI-derived/refreshable fields
-- (spec point 7) — a fresh classification must never clobber a decision a
-- person deliberately made (e.g. manually setting priority/status), the same
-- way category_source already protects the category field.
alter table public.email_threads
  add column if not exists priority_source text not null default 'ai' check (priority_source in ('ai', 'human')),
  add column if not exists status_source text not null default 'ai' check (status_source in ('ai', 'human'));

-- Configurable confidence threshold (spec point 3) — below this, a
-- classification never fully trusts itself: an "irrelevant" call becomes
-- Needs review instead of silent suppression, and a "real case" call still
-- gets flagged needs_review=true rather than fully automatic routing.
alter table public.workspace_settings
  add column if not exists classification_confidence_threshold numeric not null default 0.6 check (classification_confidence_threshold >= 0 and classification_confidence_threshold <= 1);

-- Lets the Needs-review queue show "Possible artist application" even when
-- confidence was too low to auto-route it (spec point 4's example card).
alter table public.email_threads
  add column if not exists suggested_artist_application boolean not null default false;

-- The AI's actual intended status, always recorded even when a low-confidence
-- classification gets routed to Needs review instead — "Confirm" in the
-- review queue applies this rather than guessing what should happen next.
alter table public.email_threads
  add column if not exists ai_suggested_status text;
