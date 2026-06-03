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
    follow_up_needed boolean not null,
    follow_up_date date,
    follow_up_status text not null,
    follow_up_snoozed_until date,
    created_at timestamptz
  ) on commit drop;

  create temporary table crm_restore_person_tags (
    person_id uuid not null,
    tag_id uuid not null,
    primary key (person_id, tag_id)
  ) on commit drop;

  insert into crm_restore_people (
    id,
    name,
    email,
    phone,
    company,
    role,
    location,
    latitude,
    longitude,
    birthday,
    how_met,
    relationship_type,
    relationship_strength,
    preferred_contact_method,
    contact_frequency_days,
    last_contacted_at,
    notes,
    created_at
  )
  select
    id,
    name,
    email,
    phone,
    company,
    role,
    location,
    latitude,
    longitude,
    birthday,
    how_met,
    relationship_type,
    relationship_strength,
    preferred_contact_method,
    contact_frequency_days,
    last_contacted_at,
    notes,
    created_at
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
    id,
    person_id,
    type,
    date,
    notes,
    follow_up_needed,
    follow_up_date,
    follow_up_status,
    follow_up_snoozed_until,
    created_at
  )
  select
    id,
    person_id,
    type,
    date,
    notes,
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
    follow_up_needed boolean,
    follow_up_date date,
    follow_up_status text,
    follow_up_snoozed_until date,
    created_at timestamptz
  );

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
    delete from public.people
    where user_id = current_user_id;

    delete from public.tags
    where user_id = current_user_id;
  end if;

  insert into public.tags (id, user_id, name, color, created_at)
  select
    id,
    current_user_id,
    name,
    color,
    coalesce(created_at, now())
  from crm_restore_tags
  on conflict (id) do update
    set
      user_id = excluded.user_id,
      name = excluded.name,
      color = excluded.color
    where public.tags.user_id = current_user_id;

  insert into public.people (
    id,
    user_id,
    name,
    email,
    phone,
    company,
    role,
    location,
    latitude,
    longitude,
    birthday,
    how_met,
    relationship_type,
    relationship_strength,
    preferred_contact_method,
    contact_frequency_days,
    last_contacted_at,
    notes,
    created_at
  )
  select
    id,
    current_user_id,
    name,
    email,
    phone,
    company,
    role,
    location,
    latitude,
    longitude,
    birthday,
    how_met,
    relationship_type,
    relationship_strength,
    preferred_contact_method,
    contact_frequency_days,
    last_contacted_at,
    notes,
    coalesce(created_at, now())
  from crm_restore_people
  on conflict (id) do update
    set
      user_id = excluded.user_id,
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
    id,
    person_id,
    type,
    date,
    notes,
    follow_up_needed,
    follow_up_date,
    follow_up_status,
    follow_up_snoozed_until,
    created_at
  )
  select
    id,
    person_id,
    type,
    date,
    notes,
    follow_up_needed,
    follow_up_date,
    case when follow_up_needed then follow_up_status else 'done' end,
    follow_up_snoozed_until,
    coalesce(created_at, now())
  from crm_restore_interactions
  on conflict (id) do update
    set
      person_id = excluded.person_id,
      type = excluded.type,
      date = excluded.date,
      notes = excluded.notes,
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
end;
$$;

grant execute on function public.restore_crm_snapshot(jsonb, boolean) to authenticated;
