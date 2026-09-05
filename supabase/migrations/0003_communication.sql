-- Artbridge OS — Communication ticket-view expansion
-- Recategorizes email_threads onto the customer/artist/developer/supplier/internal
-- taxonomy used by the new Communication UI, and adds the persistent fields
-- (labels, resolved_at, soft-delete, internal notes) that UI needs to be real.

-- ---------------------------------------------------------------------------
-- Category taxonomy migration (no production rows exist yet, but written to
-- be safe if any do): development -> developer, supplier_logistics ->
-- supplier, finance_admin/marketing_partner -> internal.
-- ---------------------------------------------------------------------------
alter table public.email_threads drop constraint if exists email_threads_category_check;

update public.email_threads set category = 'developer' where category = 'development';
update public.email_threads set category = 'supplier' where category = 'supplier_logistics';
update public.email_threads set category = 'internal' where category in ('finance_admin', 'marketing_partner');

alter table public.email_threads add constraint email_threads_category_check
  check (category in ('customer', 'artist', 'developer', 'supplier', 'internal', 'system', 'noise'));

-- ---------------------------------------------------------------------------
-- New persistent fields
-- ---------------------------------------------------------------------------
alter table public.email_threads
  add column if not exists labels text[] not null default '{}',
  add column if not exists resolved_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists email_threads_deleted_idx on public.email_threads (deleted_at);

alter table public.email_messages
  add column if not exists is_internal_note boolean not null default false;

-- ---------------------------------------------------------------------------
-- Internal notes, "New conversation" and recorded sent replies are written by
-- the signed-in user's own request (not just background sync), so
-- authenticated needs insert access here too. Matches the existing
-- permissive "authenticated can do everything" business model used on
-- email_threads/tasks — gmail_integration remains the sole exception.
-- ---------------------------------------------------------------------------
create policy "authenticated can insert email_messages"
  on public.email_messages for insert
  to authenticated
  with check (true);
