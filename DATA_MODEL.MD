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

`tags_user_id_lower_name_key` prevents duplicate tag names per user regardless of case.

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
| follow_up_status | text | yes, default `open`; one of `open`, `done`, `snoozed` |
| follow_up_snoozed_until | date | no |
| created_at | timestamptz | yes, default `now()` |
| updated_at | timestamptz | yes, default `now()` |

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
| email_reminders_enabled | boolean | yes, default `false`; retained for compatibility but not surfaced as a promise of delivery |
| created_at | timestamptz | yes, default `now()` |

## RPC Helpers

- `create_interaction_and_touch_person(...)` inserts an interaction and only updates `people.last_contacted_at` when the interaction date is newer than the current value.
- `touch_person_last_contacted(person_id, date)` applies the same safe last-contact update rule.
- `recalculate_person_last_contacted(person_id)` derives `last_contacted_at` from the latest interaction after edits/deletes.
- `replace_person_tags(person_id, tag_ids)` replaces tag assignments in one database transaction after confirming the person and every tag belong to the authenticated user.
- `merge_tags(source_tag_id, target_tag_id)` moves assignments to the target tag and deletes the source tag.

## RLS Ownership

- `people`, `tags`, and `settings` use direct `user_id = auth.uid()` policies.
- `interactions` are protected through the related `people.user_id`.
- `person_tags` are protected through both the related `people.user_id` and `tags.user_id`; the replacement RPC repeats the same ownership check before writing associations.

## Migration Notes

- Cascading deletes are defined in migrations for user-owned people, interactions, tags, person tags, and settings.
- The target Supabase project `ojebeswabngvcktqsduc` has the follow-up helper migration, person-tag ownership hardening migration, and restored user-owned cascade constraints applied.
- The local migration `20260514171147_reconcile_target_schema_drift.sql` reconciles older target-project drift in nullability, defaults, `people.last_contacted_at`, check constraints, and tag-name uniqueness. Apply it to the linked project only as an intentional database release step after reviewing existing data.
