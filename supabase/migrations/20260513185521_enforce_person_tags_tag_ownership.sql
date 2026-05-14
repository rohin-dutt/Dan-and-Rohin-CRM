drop policy if exists "Users can view their own person_tags" on public.person_tags;
drop policy if exists "Users can read their own person tags" on public.person_tags;
drop policy if exists "Users can insert their own person_tags" on public.person_tags;
drop policy if exists "Users can insert their own person tags" on public.person_tags;
drop policy if exists "Users can update their own person tags" on public.person_tags;
drop policy if exists "Users can delete their own person_tags" on public.person_tags;
drop policy if exists "Users can delete their own person tags" on public.person_tags;

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

create or replace function public.replace_person_tags(
  p_person_id uuid,
  p_tag_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tag_ids uuid[];
begin
  select coalesce(array_agg(distinct input_tag_id), array[]::uuid[])
  into v_tag_ids
  from unnest(coalesce(p_tag_ids, array[]::uuid[])) as input(input_tag_id);

  if not exists (
    select 1
    from public.people
    where id = p_person_id
      and user_id = auth.uid()
  ) then
    raise exception 'Person not found.';
  end if;

  if exists (
    select 1
    from unnest(v_tag_ids) as input(input_tag_id)
    where not exists (
      select 1
      from public.tags
      where id = input.input_tag_id
        and user_id = auth.uid()
    )
  ) then
    raise exception 'Tag not found.';
  end if;

  delete from public.person_tags
  where person_id = p_person_id;

  insert into public.person_tags (person_id, tag_id)
  select p_person_id, unnest(v_tag_ids)
  on conflict do nothing;
end;
$$;

grant execute on function public.replace_person_tags(uuid, uuid[]) to authenticated;
