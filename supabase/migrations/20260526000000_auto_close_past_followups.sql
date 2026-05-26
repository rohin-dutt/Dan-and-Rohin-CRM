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
  -- Auto-close any open follow-ups whose follow_up_date
  -- is on or before the date of this new interaction.
  -- If you logged a chat today, any past follow-up
  -- reminders for this person are now resolved.
  update public.interactions
  set follow_up_status = 'done'
  where person_id = p_person_id
    and follow_up_needed = true
    and follow_up_status = 'open'
    and follow_up_date is not null
    and follow_up_date <= p_date;

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

grant execute on function public.create_interaction_and_touch_person(uuid, text, date, text, boolean, date, text) to authenticated;
