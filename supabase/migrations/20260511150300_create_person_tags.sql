create table public.person_tags (
  person_id uuid not null references public.people(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (person_id, tag_id)
);

create index person_tags_tag_id_idx on public.person_tags (tag_id);

alter table public.person_tags enable row level security;

create policy "Users can read their own person tags"
  on public.person_tags for select
  to authenticated
  using (
    exists (
      select 1
      from public.people
      where people.id = person_tags.person_id
        and people.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.tags
      where tags.id = person_tags.tag_id
        and tags.user_id = auth.uid()
    )
  );

create policy "Users can insert their own person tags"
  on public.person_tags for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.people
      where people.id = person_tags.person_id
        and people.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.tags
      where tags.id = person_tags.tag_id
        and tags.user_id = auth.uid()
    )
  );

create policy "Users can update their own person tags"
  on public.person_tags for update
  to authenticated
  using (
    exists (
      select 1
      from public.people
      where people.id = person_tags.person_id
        and people.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.tags
      where tags.id = person_tags.tag_id
        and tags.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.people
      where people.id = person_tags.person_id
        and people.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.tags
      where tags.id = person_tags.tag_id
        and tags.user_id = auth.uid()
    )
  );

create policy "Users can delete their own person tags"
  on public.person_tags for delete
  to authenticated
  using (
    exists (
      select 1
      from public.people
      where people.id = person_tags.person_id
        and people.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.tags
      where tags.id = person_tags.tag_id
        and tags.user_id = auth.uid()
    )
  );
