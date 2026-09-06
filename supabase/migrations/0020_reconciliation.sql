-- Artbridge OS — Communications reconciliation fix.
--
-- Root cause found live: once a thread was suppressed (should_create_case =
-- false) by an OLDER, worse classifier version, it was PERMANENTLY excluded
-- from ever being reconsidered — classifyBacklogBatch only looks at
-- suppressed=false threads, and upsertThread short-circuits on any
-- suppressed thread regardless of why. A real artist application
-- ("Fehér Luca Kata — Illusztrációs portfólió") got silently hidden this
-- way and never resurfaced even after CLASSIFICATION_VERSION bumped.
--
-- suppressed_by distinguishes a deterministic, genuinely-permanent
-- ingestion_rule suppression (admin rule / automated-sender heuristic) from
-- an 'ai' suppression, which is just a should_create_case=false verdict
-- that a later, improved classifier should get to re-examine.
alter table public.email_threads
  add column if not exists suppressed_by text check (suppressed_by in ('ingestion_rule', 'ai'));

-- Backfill: every currently-suppressed thread predates this column, so
-- without a real audit trail we can't know which path suppressed it. Default
-- existing suppressions to 'ai' (the more permissive assumption) rather than
-- 'ingestion_rule' (the permanent one) — this pass exists specifically to
-- give previously-suppressed threads a chance to be reconsidered, not to
-- lock them out further.
update public.email_threads set suppressed_by = 'ai' where suppressed = true and suppressed_by is null;
