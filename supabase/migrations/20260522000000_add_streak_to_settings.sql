alter table public.settings
  add column if not exists current_streak integer
    not null default 0,
  add column if not exists last_streak_date date;

create or replace function public.update_streak(
  p_user_id uuid,
  p_local_date date
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current_streak integer;
  v_last_streak_date date;
  v_new_streak integer;
begin
  select current_streak, last_streak_date
  into v_current_streak, v_last_streak_date
  from public.settings
  where user_id = p_user_id;

  if not found then
    return 0;
  end if;

  if v_last_streak_date = p_local_date then
    return v_current_streak;
  end if;

  if v_last_streak_date = (p_local_date - interval '1 day')::date then
    v_new_streak := v_current_streak + 1;
  else
    v_new_streak := 1;
  end if;

  update public.settings
  set
    current_streak = v_new_streak,
    last_streak_date = p_local_date
  where user_id = p_user_id;

  return v_new_streak;
end;
$$;

grant execute on function public.update_streak(uuid, date)
  to authenticated;
