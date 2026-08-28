create table public.person_notification_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  notification_type text not null check (notification_type in ('overdue_reminder', 'inactivity_nudge')),
  last_notified_at timestamptz not null default now(),
  notify_count integer not null default 1,
  created_at timestamptz not null default now()
);

create unique index person_notification_schedule_person_idx
  on public.person_notification_schedule (user_id, person_id, notification_type)
  where person_id is not null;

create unique index person_notification_schedule_user_idx
  on public.person_notification_schedule (user_id, notification_type)
  where person_id is null;

create index person_notification_schedule_user_id_idx on public.person_notification_schedule (user_id);

alter table public.person_notification_schedule enable row level security;

create policy "Users can read their own notification schedule"
  on public.person_notification_schedule for select
  to authenticated
  using (auth.uid() = user_id);

alter table public.settings
  add column if not exists last_app_open_at timestamptz;
