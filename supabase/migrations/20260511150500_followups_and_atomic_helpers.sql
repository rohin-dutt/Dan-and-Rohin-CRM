alter table public.interactions
  add column if not exists follow_up_status text not null default 'open'
    check (follow_up_status in ('open', 'done', 'snoozed')),
  add column if not exists follow_up_snoozed_until date,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists interactions_follow_up_status_date_idx
  on public.interactions (follow_up_status, follow_up_date)
  where follow_up_needed = true;

create index if not exists people_user_id_birthday_idx
  on public.people (user_id, birthday)
  where birthday is not null;

create or replace function public.touch_person_last_contacted(
  p_person_id uuid,
  p_interaction_date date
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.people
  set last_contacted_at = p_interaction_date::timestamptz
  where id = p_person_id
    and user_id = auth.uid()
    and (
      last_contacted_at is null
      or last_contacted_at::date <= p_interaction_date
    );
end;
$$;

create or replace function public.recalculate_person_last_contacted(
  p_person_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  latest_interaction_date date;
begin
  select max(interactions.date)
  into latest_interaction_date
  from public.interactions
  where interactions.person_id = p_person_id;

  update public.people
  set last_contacted_at = latest_interaction_date::timestamptz
  where id = p_person_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.create_interaction_and_touch_person(
  p_person_id uuid,
  p_type text,
  p_date date,
  p_notes text,
  p_follow_up_needed boolean,
  p_follow_up_date date,
  p_follow_up_status text default 'open'
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  insert into public.interactions (
    person_id,
    type,
    date,
    notes,
    follow_up_needed,
    follow_up_date,
    follow_up_status
  )
  values (
    p_person_id,
    p_type,
    p_date,
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_follow_up_needed,
    p_follow_up_date,
    case
      when p_follow_up_needed then coalesce(p_follow_up_status, 'open')
      else 'done'
    end
  )
  returning id into inserted_id;

  perform public.touch_person_last_contacted(p_person_id, p_date);
  return inserted_id;
end;
$$;

create or replace function public.replace_person_tags(
  p_person_id uuid,
  p_tag_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.person_tags
  where person_id = p_person_id;

  insert into public.person_tags (person_id, tag_id)
  select p_person_id, unnest(coalesce(p_tag_ids, array[]::uuid[]))
  on conflict do nothing;
end;
$$;

create or replace function public.merge_tags(
  p_source_tag_id uuid,
  p_target_tag_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_source_tag_id = p_target_tag_id then
    raise exception 'Choose two different tags.';
  end if;

  insert into public.person_tags (person_id, tag_id)
  select person_id, p_target_tag_id
  from public.person_tags
  where tag_id = p_source_tag_id
  on conflict do nothing;

  delete from public.tags
  where id = p_source_tag_id
    and user_id = auth.uid();
end;
$$;

grant execute on function public.touch_person_last_contacted(uuid, date) to authenticated;
grant execute on function public.recalculate_person_last_contacted(uuid) to authenticated;
grant execute on function public.create_interaction_and_touch_person(uuid, text, date, text, boolean, date, text) to authenticated;
grant execute on function public.replace_person_tags(uuid, uuid[]) to authenticated;
grant execute on function public.merge_tags(uuid, uuid) to authenticated;
