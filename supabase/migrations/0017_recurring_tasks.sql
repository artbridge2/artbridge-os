-- Artbridge OS — Recurring Tasks engine additions (spec §13).
-- The generation engine (computeNextDueDate + completeTask creating exactly
-- one follow-up occurrence, carrying recurring_rule/recurring_parent_id
-- forward) already existed. What was missing: no creation UI, no optional
-- end date, no way to skip a single occurrence without losing history.

alter table public.tasks
  add column if not exists recurring_end_date date,
  add column if not exists skipped_at timestamptz;

create index if not exists tasks_recurring_end_date_idx on public.tasks (recurring_end_date) where recurring_end_date is not null;
