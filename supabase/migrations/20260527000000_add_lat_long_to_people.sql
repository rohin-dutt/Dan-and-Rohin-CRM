alter table public.people
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;
