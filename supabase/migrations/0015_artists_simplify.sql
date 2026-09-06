-- Artbridge OS — Artists module simplification.
-- Removes the AI Research/Outreach-draft workflow (kept: real send/reply
-- email mechanics, moved into the Artist detail page's Conversation card).
-- Status/source enums redesigned per the corrected spec. Verified against
-- production before writing this: only 3 real Artist rows exist, all
-- status='candidate', zero rows in any other status/source — no data to
-- remap.

-- Status: candidate/contacted/in_conversation/maybe_later/registered/active/rejected
-- (drops 'accepted' and 'inactive').
alter table public.artists drop constraint if exists artists_status_check;
update public.artists set status = 'active' where status = 'accepted';
update public.artists set status = 'rejected' where status = 'inactive';
alter table public.artists add constraint artists_status_check
  check (status in ('candidate', 'contacted', 'in_conversation', 'maybe_later', 'registered', 'active', 'rejected'));

-- Source: outbound/applied only (drops 'direct'/'research'/'application' — manual
-- entry is a creation method, not a relationship source).
alter table public.artists drop constraint if exists artists_source_check;
update public.artists set source = 'outbound' where source in ('direct', 'research');
update public.artists set source = 'applied' where source = 'application';
alter table public.artists add constraint artists_source_check
  check (source in ('outbound', 'applied'));

-- "Maybe later" is a pause, not a dead end — remembers the status to Resume
-- back to. Rejection reuses the same column for the same reason (an artist
-- is only ever in one paused state at a time).
alter table public.artists
  add column if not exists maybe_later_previous_status text,
  add column if not exists revisit_date date,
  add column if not exists rejection_reason text
    check (rejection_reason is null or rejection_reason in ('portfolio_fit', 'terms', 'no_response', 'not_interested', 'other'));

create index if not exists artists_revisit_date_idx on public.artists (revisit_date) where revisit_date is not null;
