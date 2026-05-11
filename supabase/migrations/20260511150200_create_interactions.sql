create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  type text not null check (btrim(type) <> ''),
  date date not null,
  notes text,
  follow_up_needed boolean not null default false,
  follow_up_date date,
  created_at timestamptz not null default now()
);

create index interactions_person_id_idx on public.interactions (person_id);
create index interactions_person_id_date_idx on public.interactions (person_id, date desc);
create index interactions_follow_up_date_idx on public.interactions (follow_up_date)
  where follow_up_needed = true;

alter table public.interactions enable row level security;

create policy "Users can read interactions for their people"
  on public.interactions for select
  to authenticated
  using (
    exists (
      select 1
      from public.people
      where people.id = interactions.person_id
        and people.user_id = auth.uid()
    )
  );

create policy "Users can insert interactions for their people"
  on public.interactions for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.people
      where people.id = interactions.person_id
        and people.user_id = auth.uid()
    )
  );

create policy "Users can update interactions for their people"
  on public.interactions for update
  to authenticated
  using (
    exists (
      select 1
      from public.people
      where people.id = interactions.person_id
        and people.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.people
      where people.id = interactions.person_id
        and people.user_id = auth.uid()
    )
  );

create policy "Users can delete interactions for their people"
  on public.interactions for delete
  to authenticated
  using (
    exists (
      select 1
      from public.people
      where people.id = interactions.person_id
        and people.user_id = auth.uid()
    )
  );
