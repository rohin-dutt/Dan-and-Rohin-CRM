create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  color text not null check (btrim(color) <> ''),
  created_at timestamptz not null default now()
);

create index tags_user_id_idx on public.tags (user_id);
create unique index tags_user_id_lower_name_key on public.tags (user_id, lower(name));

alter table public.tags enable row level security;

create policy "Users can read their own tags"
  on public.tags for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own tags"
  on public.tags for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own tags"
  on public.tags for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own tags"
  on public.tags for delete
  to authenticated
  using (auth.uid() = user_id);
