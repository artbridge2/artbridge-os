-- Communication: manual category correction.
--
-- "Internal" returns as a selectable category (Artbridge-to-Artbridge
-- coordination / account & tooling admin between team members) — it was
-- merged into "other" in 0005 for a simpler taxonomy, but that made "other"
-- an unhelpful catch-all once cases needed manual correction.
alter table public.email_threads drop constraint if exists email_threads_category_check;
alter table public.email_threads add constraint email_threads_category_check
  check (category in ('customer', 'artist', 'developer', 'supplier', 'internal', 'other'));

-- Tracks whether the current category came from AI classification or a human
-- correction, so a later AI reclassification (a new inbound message, the
-- backfill batch) never silently reverts a human's fix.
alter table public.email_threads
  add column if not exists category_source text not null default 'ai'
    check (category_source in ('ai', 'human'));
