-- Artbridge OS — Global @mentions (spec §9). Adds structured mention storage
-- (an array of the actually-mentioned profile ids) next to each place a
-- human writes free text that can @-mention someone, replacing the old
-- fragile "does the body contain @FullName" substring matching. Comment/note
-- bodies keep the literal "@Name" text for readability; this column is what
-- notifications/highlighting actually key off now.

alter table public.task_comments
  add column if not exists mentioned_profile_ids uuid[] not null default '{}';

alter table public.artist_comments
  add column if not exists mentioned_profile_ids uuid[] not null default '{}';

alter table public.marketing_campaign_comments
  add column if not exists mentioned_profile_ids uuid[] not null default '{}';

alter table public.project_comments
  add column if not exists mentioned_profile_ids uuid[] not null default '{}';

-- Internal notes live in email_messages (is_internal_note = true), not a
-- dedicated comments table — same treatment per spec §9.
alter table public.email_messages
  add column if not exists mentioned_profile_ids uuid[] not null default '{}';
