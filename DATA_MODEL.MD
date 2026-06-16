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
| birthday_month | integer | no; 1-12 when birthday is set |
| birthday_day | integer | no; valid day for the month when birthday is set |
| birthday_year | integer | no; nullable for unknown-year birthdays |
| birthday | date | no; legacy compatibility date only when a birth year is known |
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
| notes | text | no, legacy overview text |
| is_touch_point | boolean | yes, default `true` |
| follow_up_needed | boolean | yes, default `false` |
| follow_up_date | date | no |
| follow_up_status | text | yes, default `open`; one of `open`, `done`, `snoozed` |
| follow_up_snoozed_until | date | no |
| created_at | timestamptz | yes, default `now()` |
| updated_at | timestamptz | yes, default `now()` |

Interactions are real relationship touch points only. They drive
`people.last_contacted_at`, "Last talked", follow-up queues, streaks, and
interaction counters. Note-only records are migrated to `person_notes` and
should not be stored in this table. The `is_touch_point` column remains as a
defensive compatibility guard and defaults to `true`; shared rules and repair
RPCs ignore any historical row where `is_touch_point = false` or
`type = 'Note'`.

## person_notes

| Column | Type | Required |
|--------|------|----------|
| id | uuid | yes, primary key, default `gen_random_uuid()` |
| user_id | uuid | yes, FK to `auth.users(id)` with `on delete cascade` |
| person_id | uuid | yes, FK to `people(id)` with `on delete cascade` |
| body | text | yes |
| note_date | date | no |
| created_at | timestamptz | yes, default `now()` |
| updated_at | timestamptz | yes, default `now()` |

Person notes are user-authored notes about a person. They do not update
`people.last_contacted_at`, do not count as touch points, and do not affect
follow-up state, streaks, most-contacted stats, or interaction counters.

## important_moments

| Column | Type | Required |
|--------|------|----------|
| id | uuid | yes, primary key, default `gen_random_uuid()` |
| user_id | uuid | yes, FK to `auth.users(id)` with `on delete cascade` |
| person_id | uuid | yes, FK to `people(id)` with `on delete cascade` |
| label | text | yes |
| date | date | yes |
| recurs_yearly | boolean | yes, default `true` |
| created_at | timestamptz | yes, default `now()` |
| updated_at | timestamptz | yes, default `now()` |

Important moments are user-created dates for a person, such as anniversaries
or graduations. They are not auto-generated presets. Recurring moments roll
forward yearly for upcoming-moment reminders; one-time moments are ignored
after their date passes.

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
| push_followups_enabled | boolean | yes, default `true` |
| push_birthdays_enabled | boolean | yes, default `true` |
| push_important_moments_enabled | boolean | yes, default `true` |
| notification_timezone | text | no |
| quiet_hours_enabled | boolean | yes, default `false` |
| quiet_hours_start | time | no |
| quiet_hours_end | time | no |
| created_at | timestamptz | yes, default `now()` |

## push_tokens

| Column | Type | Required |
|--------|------|----------|
| id | uuid | yes, primary key, default `gen_random_uuid()` |
| user_id | uuid | yes, FK to `auth.users(id)` with `on delete cascade` |
| token | text | yes |
| provider | text | yes, default `expo`; one of `expo`, `apns` |
| platform | text | yes, default `ios`; one of `ios`, `android` |
| app_install_id | text | no |
| device_name | text | no |
| app_version | text | no |
| build_number | text | no |
| environment | text | yes |
| status | text | yes, default `active`; one of `active`, `revoked`, `invalid` |
| last_seen_at | timestamptz | yes, default `now()` |
| revoked_at | timestamptz | no |
| created_at | timestamptz | yes, default `now()` |
| updated_at | timestamptz | yes, default `now()` |

`push_tokens_token_key` prevents duplicate push tokens. Push token rows are
owned by `user_id` and should not contain private relationship notes or contact
payloads.

## notification_deliveries

| Column | Type | Required |
|--------|------|----------|
| id | uuid | yes, primary key, default `gen_random_uuid()` |
| user_id | uuid | yes, FK to `auth.users(id)` with `on delete cascade` |
| push_token_id | uuid | no, FK to `push_tokens(id)` with `on delete set null` |
| kind | text | yes; one of `follow_up_due`, `follow_up_overdue`, `birthday`, `important_moment` |
| subject_type | text | yes; one of `person`, `interaction`, `important_moment` |
| subject_id | uuid | no |
| scheduled_for | date | yes |
| send_after | timestamptz | no |
| idempotency_key | text | yes |
| status | text | yes, default `pending`; one of `pending`, `sent`, `failed`, `skipped`, `invalid_token` |
| attempt_count | integer | yes, default `0` |
| provider_message_id | text | no |
| error_code | text | no |
| last_attempt_at | timestamptz | no |
| created_at | timestamptz | yes, default `now()` |
| updated_at | timestamptz | yes, default `now()` |

`notification_deliveries_idempotency_key_key` prevents duplicate delivery
records for the same scheduled notification. Delivery rows are server-written
audit/idempotency records and must not store private notes, notification message
bodies, or raw contact payloads.

## RPC Helpers

- `create_interaction_and_touch_person(...)` inserts a touch-point interaction and only updates `people.last_contacted_at` when the interaction date is newer than the current value.
- `touch_person_last_contacted(person_id, date)` applies the same safe last-contact update rule.
- `recalculate_person_last_contacted(person_id)` derives `last_contacted_at` from the latest touch-point interaction after edits/deletes.
- `recalculate_all_last_contacted_from_touch_points()` repairs the authenticated user's `people.last_contacted_at` values from interactions where `is_touch_point = true`.
- `replace_person_tags(person_id, tag_ids)` replaces tag assignments in one database transaction after confirming the person and every tag belong to the authenticated user.
- `merge_tags(source_tag_id, target_tag_id)` moves assignments to the target tag and deletes the source tag.
- `restore_crm_snapshot(payload jsonb, replace_existing boolean)` imports or
  restore/replaces a validated CRM snapshot in one database transaction. It
  runs as `security invoker`, requires `auth.uid()`, forces imported people,
  tags, and person notes to the authenticated owner, validates interaction,
  note, and tag-assignment relationships, converts legacy note-like
  interaction records into `person_notes`, and rejects unknown or inaccessible
  cross-user references.

## RLS Ownership

- `people`, `tags`, `settings`, `push_tokens`, `person_notes`, and `important_moments` use direct `user_id = auth.uid()` policies.
- `interactions` are protected through the related `people.user_id`.
- `person_tags` are protected through both the related `people.user_id` and `tags.user_id`; the replacement RPC repeats the same ownership check before writing associations.
- `person_notes` policies also check that the related person belongs to the authenticated user before insert or update.
- `important_moments` policies also check that the related person belongs to the authenticated user before insert or update.
- `notification_deliveries` allows authenticated users to read only their own rows. Client insert, update, and delete are intentionally not allowed; trusted server code should write delivery records.

## Migration Notes

- Cascading deletes are defined in migrations for user-owned people, interactions, tags, person tags, settings, push tokens, person notes, important moments, and notification deliveries.
- The local migration `20260616090000_birthday_parts.sql` adds
  `people.birthday_month`, `people.birthday_day`, and nullable
  `people.birthday_year`, backfills them from legacy `people.birthday`, and
  updates restore/import to round-trip both new birthday parts and older
  full-date exports. The legacy `birthday` date remains for compatibility and
  is written only when a year is known.
- The target Supabase project `ojebeswabngvcktqsduc` has the follow-up helper migration, person-tag ownership hardening migration, and restored user-owned cascade constraints applied.
- The local migration `20260514171147_reconcile_target_schema_drift.sql` reconciles older target-project drift in nullability, defaults, `people.last_contacted_at`, check constraints, and tag-name uniqueness. Apply it to the linked project only as an intentional database release step after reviewing existing data.
- The local migration `20260516170000_mobile_notification_readiness.sql` adds mobile push token storage, push notification settings fields, and privacy-safe notification delivery logging/idempotency records for the Roots iOS app.
- The local migration `20260602170834_restore_crm_snapshot.sql` adds the
  transactional restore/import RPC for mobile and web trusted restore flows.
  It was applied to the linked Supabase project `ojebeswabngvcktqsduc` through
  Supabase MCP on June 2, 2026. The linked project accepted the function as
  `security invoker`, and an unauthenticated SQL-console call rejected with
  `Unauthorized.` as expected. Supabase MCP recorded the remote migration
  history row as `20260602172604_restore_crm_snapshot`; the checked-in local
  migration file remains `20260602170834_restore_crm_snapshot.sql`.
- The local migration
  `20260609090000_important_moments_and_note_touchpoints.sql` adds
  user-owned important moments, marks note-only interactions with
  `is_touch_point`, expands notification delivery metadata for important
  moments, and adds a user-scoped recompute RPC for repairing
  `people.last_contacted_at` from touch-point interactions only. Apply it only
  through the required database-release preflight.
- The local migration
  `20260609193834_separate_person_notes.sql` creates the user-owned
  `person_notes` table, backfills existing note-like interaction rows and
  legacy `people.notes` text into person notes, removes note-like rows from
  `interactions`, rejects `type = 'Note'` in
  `create_interaction_and_touch_person`, updates restore/import to carry
  `person_notes`, and recomputes `people.last_contacted_at` from real
  touch-point interactions only. Apply it only through the required
  database-release preflight.
