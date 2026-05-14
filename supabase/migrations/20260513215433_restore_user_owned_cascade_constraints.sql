alter table public.people
  alter column user_id set not null,
  drop constraint if exists people_user_id_fkey,
  add constraint people_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.tags
  alter column user_id set not null,
  drop constraint if exists tags_user_id_fkey,
  add constraint tags_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.settings
  alter column user_id set not null,
  drop constraint if exists settings_user_id_fkey,
  add constraint settings_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
