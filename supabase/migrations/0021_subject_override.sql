-- Human-editable display title for a Communication case, separate from the
-- raw Gmail subject (which upsertThread keeps in sync with the real thread
-- on every sync run — overriding `subject` directly would just get
-- clobbered on the next incoming message).
alter table email_threads add column subject_override text;
