# Data Model

The reproducible schema lives in `supabase/migrations`. Row-Level Security (RLS) is enabled on every table, and policies restrict data to the authenticated owner.

## people

| Column | Type | Required |
|--------|------|----------|
| id | uuid | yes, primary key, default `gen_random_uuid()` |
| user_id | uuid | yes, FK to `auth.users(id)` with `on delete cascade` |
| name | text | yes |
| email | text | no |
| phone | text | no |
| company | text | no |
| role | text | no |
| location | text | no |
| birthday | date | no |
| how_met | text | no |
| relationship_type | text | no |
| relationship_strength | text | no |
| preferred_contact_method | text | no |
| contact_frequency_days | integer | yes, default `30` |
| last_contacted_at | timestamptz | no |
| notes | text | no |
| created_at | timestamptz | yes, default `now()` |

## tags

| Column | Type | Required |
|--------|------|----------|
| id | uuid | yes, primary key, default `gen_random_uuid()` |
| user_id | uuid | yes, FK to `auth.users(id)` with `on delete cascade` |
| name | text | yes |
| color | text | yes |
| created_at | timestamptz | yes, default `now()` |

## interactions

| Column | Type | Required |
|--------|------|----------|
| id | uuid | yes, primary key, default `gen_random_uuid()` |
| person_id | uuid | yes, FK to `people(id)` with `on delete cascade` |
| type | text | yes |
| date | date | yes |
| notes | text | no |
| follow_up_needed | boolean | yes, default `false` |
| follow_up_date | date | no |
| created_at | timestamptz | yes, default `now()` |

## person_tags

| Column | Type | Required |
|--------|------|----------|
| person_id | uuid | yes, composite primary key, FK to `people(id)` with `on delete cascade` |
| tag_id | uuid | yes, composite primary key, FK to `tags(id)` with `on delete cascade` |

## settings

| Column | Type | Required |
|--------|------|----------|
| id | uuid | yes, primary key, default `gen_random_uuid()` |
| user_id | uuid | yes, unique FK to `auth.users(id)` with `on delete cascade` |
| reminder_frequency_days | integer | yes, default `7` |
| email_reminders_enabled | boolean | yes, default `false` |
| created_at | timestamptz | yes, default `now()` |

## RLS Ownership

- `people`, `tags`, and `settings` use direct `user_id = auth.uid()` policies.
- `interactions` are protected through the related `people.user_id`.
- `person_tags` are protected through both the related `people.user_id` and `tags.user_id`.
