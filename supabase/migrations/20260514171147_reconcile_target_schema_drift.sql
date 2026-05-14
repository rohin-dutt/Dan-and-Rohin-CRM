-- Reconcile older target projects with the reproducible schema documented in
-- DATA_MODEL.MD. This is intentionally idempotent so fresh databases that
-- already applied the initial migrations stay unchanged.

update public.people
set contact_frequency_days = 30
where contact_frequency_days is null;

alter table public.people
  alter column contact_frequency_days set default 30,
  alter column contact_frequency_days set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column last_contacted_at type timestamptz
    using last_contacted_at::timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'people_name_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_name_check check (btrim(name) <> '') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_contact_frequency_days_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_contact_frequency_days_check
      check (contact_frequency_days > 0) not valid;
  end if;
end $$;

update public.tags
set color = '#1D9E75'
where color is null;

alter table public.tags
  alter column color set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

create unique index if not exists tags_user_id_lower_name_key
  on public.tags (user_id, lower(name));

update public.interactions
set follow_up_needed = false
where follow_up_needed is null;

update public.interactions
set created_at = now()
where created_at is null;

alter table public.interactions
  alter column follow_up_needed set default false,
  alter column follow_up_needed set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'interactions_type_check'
      and conrelid = 'public.interactions'::regclass
  ) then
    alter table public.interactions
      add constraint interactions_type_check check (btrim(type) <> '') not valid;
  end if;
end $$;

update public.settings
set reminder_frequency_days = 7
where reminder_frequency_days is null;

update public.settings
set email_reminders_enabled = false
where email_reminders_enabled is null;

update public.settings
set created_at = now()
where created_at is null;

alter table public.settings
  alter column reminder_frequency_days set default 7,
  alter column reminder_frequency_days set not null,
  alter column email_reminders_enabled set default false,
  alter column email_reminders_enabled set not null,
  alter column created_at set default now(),
  alter column created_at set not null;
