alter table public.settings
  add column if not exists push_followups_enabled boolean not null default true,
  add column if not exists push_birthdays_enabled boolean not null default true,
  add column if not exists notification_timezone text,
  add column if not exists quiet_hours_enabled boolean not null default false,
  add column if not exists quiet_hours_start time,
  add column if not exists quiet_hours_end time;

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null check (btrim(token) <> ''),
  provider text not null default 'expo' check (provider in ('expo', 'apns')),
  platform text not null default 'ios' check (platform in ('ios', 'android')),
  app_install_id text,
  device_name text,
  app_version text,
  build_number text,
  environment text not null check (btrim(environment) <> ''),
  status text not null default 'active' check (status in ('active', 'revoked', 'invalid')),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index push_tokens_token_key
  on public.push_tokens (token);

create index push_tokens_user_id_status_last_seen_at_idx
  on public.push_tokens (user_id, status, last_seen_at);

create index push_tokens_user_id_app_install_id_idx
  on public.push_tokens (user_id, app_install_id)
  where app_install_id is not null;

alter table public.push_tokens enable row level security;

create policy "Users can read their own push tokens"
  on public.push_tokens for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own push tokens"
  on public.push_tokens for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own push tokens"
  on public.push_tokens for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own push tokens"
  on public.push_tokens for delete
  to authenticated
  using (auth.uid() = user_id);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  push_token_id uuid references public.push_tokens(id) on delete set null,
  kind text not null check (kind in ('follow_up_due', 'follow_up_overdue', 'birthday')),
  subject_type text not null check (subject_type in ('person', 'interaction')),
  subject_id uuid,
  scheduled_for date not null,
  send_after timestamptz,
  idempotency_key text not null check (btrim(idempotency_key) <> ''),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped', 'invalid_token')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  provider_message_id text,
  error_code text,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index notification_deliveries_idempotency_key_key
  on public.notification_deliveries (idempotency_key);

create index notification_deliveries_user_id_status_scheduled_for_idx
  on public.notification_deliveries (user_id, status, scheduled_for);

create index notification_deliveries_push_token_id_idx
  on public.notification_deliveries (push_token_id);

create index notification_deliveries_subject_idx
  on public.notification_deliveries (subject_type, subject_id);

alter table public.notification_deliveries enable row level security;

create policy "Users can read their own notification deliveries"
  on public.notification_deliveries for select
  to authenticated
  using (auth.uid() = user_id);
