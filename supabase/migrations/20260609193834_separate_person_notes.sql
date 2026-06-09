alter table public.interactions
  add column if not exists is_touch_point boolean not null default true;

create table if not exists public.person_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  body text not null check (btrim(body) <> ''),
  note_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists person_notes_user_id_created_at_idx
  on public.person_notes (user_id, created_at desc);

create index if not exists person_notes_person_id_created_at_idx
  on public.person_notes (person_id, created_at desc);

alter table public.person_notes enable row level security;

grant select, insert, update, delete on table public.person_notes to authenticated;

drop policy if exists "Users can read their own person notes" on public.person_notes;
create policy "Users can read their own person notes"
  on public.person_notes for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own person notes" on public.person_notes;
create policy "Users can insert their own person notes"
  on public.person_notes for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.people
      where people.id = person_notes.person_id
        and people.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their own person notes" on public.person_notes;
create policy "Users can update their own person notes"
  on public.person_notes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.people
      where people.id = person_notes.person_id
        and people.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete their own person notes" on public.person_notes;
create policy "Users can delete their own person notes"
  on public.person_notes for delete
  to authenticated
  using (auth.uid() = user_id);

insert into public.person_notes (user_id, person_id, body, note_date, created_at, updated_at)
select
  people.user_id,
  interactions.person_id,
  btrim(interactions.notes),
  interactions.date,
  coalesce(interactions.created_at, now()),
  coalesce(interactions.updated_at, interactions.created_at, now())
from public.interactions
join public.people on people.id = interactions.person_id
where (
    lower(btrim(interactions.type)) = 'note'
    or interactions.is_touch_point = false
  )
  and interactions.notes is not null
  and btrim(interactions.notes) <> ''
  and not exists (
    select 1
    from public.person_notes existing
    where existing.person_id = interactions.person_id
      and existing.body = btrim(interactions.notes)
      and existing.created_at = coalesce(interactions.created_at, now())
  );

insert into public.person_notes (user_id, person_id, body, note_date, created_at, updated_at)
select
  people.user_id,
  people.id,
  btrim(people.notes),
  people.created_at::date,
  coalesce(people.created_at, now()),
  coalesce(people.created_at, now())
from public.people
where people.notes is not null
  and btrim(people.notes) <> ''
  and not exists (
    select 1
    from public.person_notes existing
    where existing.person_id = people.id
      and existing.body = btrim(people.notes)
  );

delete from public.interactions
where lower(btrim(type)) = 'note'
  or is_touch_point = false;

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
  where interactions.person_id = p_person_id
    and interactions.is_touch_point = true;

  update public.people
  set last_contacted_at = latest_interaction_date::timestamptz
  where id = p_person_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.recalculate_all_last_contacted_from_touch_points()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.people
  set last_contacted_at = latest.latest_date::timestamptz
  from (
    select people.id as person_id, max(interactions.date) as latest_date
    from public.people
    left join public.interactions
      on interactions.person_id = people.id
      and interactions.is_touch_point = true
    where people.user_id = auth.uid()
    group by people.id
  ) latest
  where people.id = latest.person_id
    and people.user_id = auth.uid();
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
  normalized_type text := btrim(coalesce(p_type, ''));
begin
  if normalized_type = '' or lower(normalized_type) = 'note' then
    raise exception 'Notes must be saved as person notes, not interactions.';
  end if;

  update public.interactions
  set follow_up_status = 'done'
  where person_id = p_person_id
    and is_touch_point = true
    and follow_up_needed = true
    and follow_up_status = 'open'
    and follow_up_date is not null
    and follow_up_date <= p_date;

  insert into public.interactions (
    person_id,
    type,
    date,
    notes,
    is_touch_point,
    follow_up_needed,
    follow_up_date,
    follow_up_status
  )
  values (
    p_person_id,
    normalized_type,
    p_date,
    nullif(btrim(coalesce(p_notes, '')), ''),
    true,
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

create or replace function public.restore_crm_snapshot(
  payload jsonb,
  replace_existing boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  invalid_interaction_count integer;
  invalid_person_note_count integer;
  invalid_person_tag_count integer;
begin
  if current_user_id is null then
    raise exception 'Unauthorized.';
  end if;

  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Import payload must be an object.';
  end if;

  if jsonb_typeof(payload -> 'people') <> 'array'
    or jsonb_typeof(payload -> 'tags') <> 'array'
    or jsonb_typeof(payload -> 'interactions') <> 'array'
    or jsonb_typeof(payload -> 'person_tags') <> 'array' then
    raise exception 'Import payload must include people, tags, interactions, and person_tags arrays.';
  end if;

  if payload ? 'person_notes' and jsonb_typeof(payload -> 'person_notes') <> 'array' then
    raise exception 'person_notes must be an array when present.';
  end if;

  create temporary table crm_restore_people (
    id uuid primary key,
    name text not null,
    email text,
    phone text,
    company text,
    role text,
    location text,
    latitude double precision,
    longitude double precision,
    birthday date,
    how_met text,
    relationship_type text,
    relationship_strength text,
    preferred_contact_method text,
    contact_frequency_days integer not null,
    last_contacted_at timestamptz,
    notes text,
    created_at timestamptz
  ) on commit drop;

  create temporary table crm_restore_tags (
    id uuid primary key,
    name text not null,
    color text not null,
    created_at timestamptz
  ) on commit drop;

  create temporary table crm_restore_interactions (
    id uuid primary key,
    person_id uuid not null,
    type text not null,
    date date not null,
    notes text,
    is_touch_point boolean not null,
    follow_up_needed boolean not null,
    follow_up_date date,
    follow_up_status text not null,
    follow_up_snoozed_until date,
    created_at timestamptz
  ) on commit drop;

  create temporary table crm_restore_person_notes (
    id uuid primary key,
    person_id uuid not null,
    body text not null,
    note_date date,
    created_at timestamptz,
    updated_at timestamptz
  ) on commit drop;

  create temporary table crm_restore_person_tags (
    person_id uuid not null,
    tag_id uuid not null,
    primary key (person_id, tag_id)
  ) on commit drop;

  insert into crm_restore_people (
    id, name, email, phone, company, role, location, latitude, longitude,
    birthday, how_met, relationship_type, relationship_strength,
    preferred_contact_method, contact_frequency_days, last_contacted_at,
    notes, created_at
  )
  select
    id, name, email, phone, company, role, location, latitude, longitude,
    birthday, how_met, relationship_type, relationship_strength,
    preferred_contact_method, contact_frequency_days, last_contacted_at,
    notes, created_at
  from jsonb_to_recordset(payload -> 'people') as person(
    id uuid,
    user_id uuid,
    name text,
    email text,
    phone text,
    company text,
    role text,
    location text,
    latitude double precision,
    longitude double precision,
    birthday date,
    how_met text,
    relationship_type text,
    relationship_strength text,
    preferred_contact_method text,
    contact_frequency_days integer,
    last_contacted_at timestamptz,
    notes text,
    created_at timestamptz
  );

  insert into crm_restore_tags (id, name, color, created_at)
  select id, name, color, created_at
  from jsonb_to_recordset(payload -> 'tags') as tag(
    id uuid,
    user_id uuid,
    name text,
    color text,
    created_at timestamptz
  );

  insert into crm_restore_interactions (
    id, person_id, type, date, notes, is_touch_point, follow_up_needed,
    follow_up_date, follow_up_status, follow_up_snoozed_until, created_at
  )
  select
    id,
    person_id,
    type,
    date,
    notes,
    coalesce(is_touch_point, true),
    follow_up_needed,
    follow_up_date,
    coalesce(follow_up_status, 'open'),
    follow_up_snoozed_until,
    created_at
  from jsonb_to_recordset(payload -> 'interactions') as interaction(
    id uuid,
    person_id uuid,
    type text,
    date date,
    notes text,
    is_touch_point boolean,
    follow_up_needed boolean,
    follow_up_date date,
    follow_up_status text,
    follow_up_snoozed_until date,
    created_at timestamptz
  )
  where coalesce(is_touch_point, true) = true
    and lower(btrim(type)) <> 'note';

  insert into crm_restore_person_notes (id, person_id, body, note_date, created_at, updated_at)
  select id, person_id, body, note_date, created_at, updated_at
  from jsonb_to_recordset(coalesce(payload -> 'person_notes', '[]'::jsonb)) as note(
    id uuid,
    user_id uuid,
    person_id uuid,
    body text,
    note_date date,
    created_at timestamptz,
    updated_at timestamptz
  )
  where body is not null
    and btrim(body) <> '';

  insert into crm_restore_person_notes (id, person_id, body, note_date, created_at, updated_at)
  select
    id,
    person_id,
    btrim(notes),
    date,
    created_at,
    created_at
  from jsonb_to_recordset(payload -> 'interactions') as interaction(
    id uuid,
    person_id uuid,
    type text,
    date date,
    notes text,
    is_touch_point boolean,
    created_at timestamptz
  )
  where (
      coalesce(is_touch_point, true) = false
      or lower(btrim(type)) = 'note'
    )
    and notes is not null
    and btrim(notes) <> ''
  on conflict (id) do nothing;

  insert into crm_restore_person_tags (person_id, tag_id)
  select distinct person_id, tag_id
  from jsonb_to_recordset(payload -> 'person_tags') as person_tag(
    person_id uuid,
    tag_id uuid
  );

  select count(*)
  into invalid_interaction_count
  from crm_restore_interactions imported
  where not exists (
    select 1 from crm_restore_people people where people.id = imported.person_id
  )
  and not exists (
    select 1
    from public.people existing
    where existing.id = imported.person_id
      and existing.user_id = current_user_id
  );

  if invalid_interaction_count > 0 then
    raise exception 'Import contains interactions for unknown or inaccessible people.';
  end if;

  select count(*)
  into invalid_person_note_count
  from crm_restore_person_notes imported
  where not exists (
    select 1 from crm_restore_people people where people.id = imported.person_id
  )
  and not exists (
    select 1
    from public.people existing
    where existing.id = imported.person_id
      and existing.user_id = current_user_id
  );

  if invalid_person_note_count > 0 then
    raise exception 'Import contains notes for unknown or inaccessible people.';
  end if;

  select count(*)
  into invalid_person_tag_count
  from crm_restore_person_tags imported
  where (
    not exists (
      select 1 from crm_restore_people people where people.id = imported.person_id
    )
    and not exists (
      select 1
      from public.people existing
      where existing.id = imported.person_id
        and existing.user_id = current_user_id
    )
  )
  or (
    not exists (
      select 1 from crm_restore_tags tags where tags.id = imported.tag_id
    )
    and not exists (
      select 1
      from public.tags existing
      where existing.id = imported.tag_id
        and existing.user_id = current_user_id
    )
  );

  if invalid_person_tag_count > 0 then
    raise exception 'Import contains tag assignments for unknown or inaccessible records.';
  end if;

  if replace_existing then
    delete from public.people where user_id = current_user_id;
    delete from public.tags where user_id = current_user_id;
  end if;

  insert into public.tags (id, user_id, name, color, created_at)
  select id, current_user_id, name, color, coalesce(created_at, now())
  from crm_restore_tags
  on conflict (id) do update
    set user_id = excluded.user_id,
        name = excluded.name,
        color = excluded.color
    where public.tags.user_id = current_user_id;

  insert into public.people (
    id, user_id, name, email, phone, company, role, location, latitude,
    longitude, birthday, how_met, relationship_type, relationship_strength,
    preferred_contact_method, contact_frequency_days, last_contacted_at,
    notes, created_at
  )
  select
    id, current_user_id, name, email, phone, company, role, location, latitude,
    longitude, birthday, how_met, relationship_type, relationship_strength,
    preferred_contact_method, contact_frequency_days, last_contacted_at,
    notes, coalesce(created_at, now())
  from crm_restore_people
  on conflict (id) do update
    set user_id = excluded.user_id,
        name = excluded.name,
        email = excluded.email,
        phone = excluded.phone,
        company = excluded.company,
        role = excluded.role,
        location = excluded.location,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        birthday = excluded.birthday,
        how_met = excluded.how_met,
        relationship_type = excluded.relationship_type,
        relationship_strength = excluded.relationship_strength,
        preferred_contact_method = excluded.preferred_contact_method,
        contact_frequency_days = excluded.contact_frequency_days,
        last_contacted_at = excluded.last_contacted_at,
        notes = excluded.notes
    where public.people.user_id = current_user_id;

  insert into public.interactions (
    id, person_id, type, date, notes, is_touch_point, follow_up_needed,
    follow_up_date, follow_up_status, follow_up_snoozed_until, created_at
  )
  select
    id, person_id, type, date, notes, true, follow_up_needed, follow_up_date,
    case when follow_up_needed then follow_up_status else 'done' end,
    follow_up_snoozed_until, coalesce(created_at, now())
  from crm_restore_interactions
  on conflict (id) do update
    set person_id = excluded.person_id,
        type = excluded.type,
        date = excluded.date,
        notes = excluded.notes,
        is_touch_point = true,
        follow_up_needed = excluded.follow_up_needed,
        follow_up_date = excluded.follow_up_date,
        follow_up_status = excluded.follow_up_status,
        follow_up_snoozed_until = excluded.follow_up_snoozed_until,
        updated_at = now()
    where exists (
      select 1
      from public.people
      where people.id = public.interactions.person_id
        and people.user_id = current_user_id
    );

  insert into public.person_notes (id, user_id, person_id, body, note_date, created_at, updated_at)
  select
    id,
    current_user_id,
    person_id,
    btrim(body),
    note_date,
    coalesce(created_at, now()),
    coalesce(updated_at, created_at, now())
  from crm_restore_person_notes
  on conflict (id) do update
    set user_id = excluded.user_id,
        person_id = excluded.person_id,
        body = excluded.body,
        note_date = excluded.note_date,
        updated_at = now()
    where public.person_notes.user_id = current_user_id;

  delete from public.person_tags
  where person_id in (
    select id from crm_restore_people
    union
    select person_id from crm_restore_person_tags
  );

  insert into public.person_tags (person_id, tag_id)
  select person_id, tag_id
  from crm_restore_person_tags
  on conflict do nothing;

  perform public.recalculate_all_last_contacted_from_touch_points();
end;
$$;

grant execute on function public.recalculate_person_last_contacted(uuid) to authenticated;
grant execute on function public.recalculate_all_last_contacted_from_touch_points() to authenticated;
grant execute on function public.create_interaction_and_touch_person(uuid, text, date, text, boolean, date, text) to authenticated;
grant execute on function public.restore_crm_snapshot(jsonb, boolean) to authenticated;

update public.people
set last_contacted_at = latest.latest_date::timestamptz
from (
  select people.id as person_id, max(interactions.date) as latest_date
  from public.people
  left join public.interactions
    on interactions.person_id = people.id
    and interactions.is_touch_point = true
  group by people.id
) latest
where people.id = latest.person_id;
