create table public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  reminder_frequency_days integer not null default 7 check (reminder_frequency_days > 0),
  email_reminders_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "Users can read their own settings"
  on public.settings for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.settings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.settings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own settings"
  on public.settings for delete
  to authenticated
  using (auth.uid() = user_id);
