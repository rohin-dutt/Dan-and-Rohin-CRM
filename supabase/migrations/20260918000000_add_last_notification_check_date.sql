-- Tracks the last local calendar day (YYYY-MM-DD, in the user's notification
-- timezone) the push reminder job processed this user, so a missed send slot
-- can be caught up by a later run without ever double-processing a day.
alter table public.settings
  add column if not exists last_notification_check_date text;
