create extension if not exists pgcrypto;

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  email text,
  phone text,
  company text,
  role text,
  location text,
  birthday date,
  how_met text,
  relationship_type text,
  relationship_strength text,
  preferred_contact_method text,
  contact_frequency_days integer not null default 30 check (contact_frequency_days > 0),
  last_contacted_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index people_user_id_idx on public.people (user_id);
create index people_user_id_name_idx on public.people (user_id, name);
create index people_user_id_last_contacted_at_idx on public.people (user_id, last_contacted_at);

alter table public.people enable row level security;

create policy "Users can read their own people"
  on public.people for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own people"
  on public.people for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own people"
  on public.people for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own people"
  on public.people for delete
  to authenticated
  using (auth.uid() = user_id);
