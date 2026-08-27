create table public.groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index groups_user_id_idx on public.groups (user_id);

alter table public.groups enable row level security;

create policy "Users can read their own groups"
  on public.groups for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own groups"
  on public.groups for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own groups"
  on public.groups for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own groups"
  on public.groups for delete
  to authenticated
  using (auth.uid() = user_id);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, person_id)
);

create index group_members_group_id_idx on public.group_members (group_id);
create index group_members_person_id_idx on public.group_members (person_id);

alter table public.group_members enable row level security;

create policy "Users can read their own group members"
  on public.group_members for select
  to authenticated
  using (
    exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
        and groups.user_id = auth.uid()
    )
  );

create policy "Users can insert their own group members"
  on public.group_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
        and groups.user_id = auth.uid()
    )
    and exists (
      select 1 from public.people
      where people.id = group_members.person_id
        and people.user_id = auth.uid()
    )
  );

create policy "Users can delete their own group members"
  on public.group_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
        and groups.user_id = auth.uid()
    )
  );

alter table public.interactions
  add column if not exists group_id uuid references public.groups(id) on delete set null;

create index if not exists interactions_group_id_idx on public.interactions (group_id);
