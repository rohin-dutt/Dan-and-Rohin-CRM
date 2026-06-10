alter table public.interactions
  add column if not exists is_touch_point boolean not null default true;

create index if not exists interactions_person_id_touch_date_idx
  on public.interactions (person_id, date desc, created_at desc)
  where is_touch_point = true;

update public.interactions
set is_touch_point = false
where lower(btrim(type)) = 'note';

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

grant execute on function public.recalculate_all_last_contacted_from_touch_points() to authenticated;

create table if not exists public.important_moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  label text not null check (btrim(label) <> ''),
  date date not null,
  recurs_yearly boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists important_moments_user_id_date_idx
  on public.important_moments (user_id, date);

create index if not exists important_moments_person_id_idx
  on public.important_moments (person_id);

alter table public.important_moments enable row level security;

grant select, insert, update, delete on table public.important_moments to authenticated;

drop policy if exists "Users can read their own important moments" on public.important_moments;
create policy "Users can read their own important moments"
  on public.important_moments for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own important moments" on public.important_moments;
create policy "Users can insert their own important moments"
  on public.important_moments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.people
      where people.id = important_moments.person_id
        and people.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their own important moments" on public.important_moments;
create policy "Users can update their own important moments"
  on public.important_moments for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.people
      where people.id = important_moments.person_id
        and people.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete their own important moments" on public.important_moments;
create policy "Users can delete their own important moments"
  on public.important_moments for delete
  to authenticated
  using (auth.uid() = user_id);

alter table public.settings
  add column if not exists push_important_moments_enabled boolean not null default true;

alter table public.notification_deliveries
  drop constraint if exists notification_deliveries_kind_check,
  add constraint notification_deliveries_kind_check
    check (kind in ('follow_up_due', 'follow_up_overdue', 'birthday', 'important_moment'));

alter table public.notification_deliveries
  drop constraint if exists notification_deliveries_subject_type_check,
  add constraint notification_deliveries_subject_type_check
    check (subject_type in ('person', 'interaction', 'important_moment'));
