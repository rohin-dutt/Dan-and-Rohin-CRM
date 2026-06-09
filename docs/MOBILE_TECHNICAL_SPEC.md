# Roots Mobile Technical Spec

This document records technical decisions for the Expo React Native iOS app.
Update it when architecture changes, not for routine task status.

## Stack

- Expo React Native.
- TypeScript.
- Supabase Auth, database, RPCs, and RLS.
- Shared TypeScript package for portable CRM logic.
- Expo Router for navigation.
- NativeWind v4 for styling.
- EAS for iOS builds and TestFlight distribution.

## Repository Layout

Initial target:

```text
mobile/
  app/
  assets/
  components/
  features/
  lib/
  test/
packages/
  shared/
    src/
    test/
```

Use Expo Router's file-based routing under `mobile/app`. Expo Router is built
on React Navigation, so React Navigation concepts and options can still be used
where needed.

Current repo baseline before Expo scaffolding:

- The web app is still the root Next.js app under `app/`, already using route
  groups for `(site)`, `(auth)`, and `(app)`.
- Current trusted route handlers are limited to `app/api/export`,
  `app/api/import/contacts`, and `app/api/account/delete`.
- Browser Supabase access is centralized in `lib/supabase.ts`; route handlers
  currently create cookie-backed server clients inline.
- Existing migrations and RLS live under `supabase/migrations`.
- Portable CRM logic currently starts in `lib/crm-rules.js`,
  `lib/date-utils.ts`, and `app/(app)/settings/_lib/import-validation.ts`;
  these are candidates for `packages/shared`.
- `mobile/` and `packages/shared/` do not exist yet. Do not move the web app
  into `apps/web` as part of Phase 1.

## Shared Package Boundaries

Allowed in `packages/shared`:

- Data types.
- Pure CRM rules.
- Date helpers that do not depend on browser APIs.
- Duplicate detection.
- Follow-up and dashboard categorization.
- Validation helpers.
- Import/export payload validation where runtime APIs are compatible.

Not allowed in `packages/shared`:

- React DOM components.
- Next.js imports.
- Browser-only APIs.
- React Native UI components.
- Supabase clients with platform-specific storage.

## Supabase Mobile Client

Mobile needs its own Supabase client setup. It should use:

- `@supabase/supabase-js`
- React Native-compatible URL polyfill.
- AsyncStorage for auth session persistence.
- Environment-specific Supabase URL and anon key.

Mobile reads may go directly through Supabase when RLS protects ownership.
Riskier multi-step writes should move to RPCs or trusted server routes.

## Mobile API Contract

The mobile app must not depend on browser cookies for privileged server work.
Any mobile call to a trusted route or function should use a documented
authorization pattern, preferably an authenticated Supabase access token in an
`Authorization: Bearer <token>` header.

Trusted server work includes:

- push token registration if extra ownership checks are needed
- notification sending and delivery logging
- account deletion
- atomic restore/replace
- any operation requiring a service-role key

Server routes and functions must return JSON-shaped auth and validation errors.
They must re-check ownership close to every read and write even when RLS is
also active.

Phase 1 contract decision:

- Mobile privileged API calls will send the current Supabase access token as
  `Authorization: Bearer <token>`.
- Trusted Next.js route handlers may also keep cookie auth for existing web
  flows, but mobile-specific paths must not require cookies.
- Shared server auth code should validate bearer tokens with Supabase Auth,
  return the authenticated user id, and create a user-scoped Supabase client
  with the bearer token so normal RLS still applies.
- Service-role clients may only be created after user authentication succeeds
  and only inside narrow server-only operations such as auth-user deletion or
  notification sending.
- Auth errors should use a consistent JSON shape:

```json
{ "ok": false, "error": { "code": "unauthorized", "message": "Unauthorized" } }
```

Trusted API host decision:

- Use Next.js route handlers on the existing Vercel-hosted web backend first.
- Phase 1 trusted routes should cover account deletion, export/import/restore,
  push-token registration, and scheduled push sending.
- Do not introduce Supabase Edge Functions unless a later requirement makes a
  database-adjacent runtime materially better than the existing backend.

## Backend And Schema Readiness

Mobile v1 likely needs additional schema before launch:

- `push_tokens` or equivalent per-user/per-device token storage
- notification preferences beyond the legacy `email_reminders_enabled` setting
- notification delivery audit rows or idempotency records
- optional device metadata, limited to what is necessary for token lifecycle
- restore/account deletion helpers if the existing web routes are not reused

Every schema change must ship through Supabase migrations, preserve RLS, and
update `DATA_MODEL.MD`.

Push-token rows should be owned by `user_id`, scoped to one device token, and
removable on logout/account deletion where practical. Delivery logs should not
store private notes or detailed relationship content.

Phase 1 schema plan:

### Push Tokens

Create a user-owned `push_tokens` table for Expo/APNs token lifecycle tracking.
The initial shape should include:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `token text not null`
- `provider text not null default 'expo'`
- `platform text not null default 'ios'`
- `app_install_id text`
- `device_name text`
- `app_version text`
- `build_number text`
- `environment text not null`
- `status text not null default 'active'`
- `last_seen_at timestamptz not null default now()`
- `revoked_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Use a unique index on `token` and a secondary index on
`(user_id, status, last_seen_at)`. RLS should allow authenticated users to read,
insert, update, and delete only their own rows. Registration should upsert by
token and always force `user_id = auth.uid()` server-side or through
RLS-checked insert/update code.

### Notification Preferences

Extend the existing one-row-per-user `settings` table instead of creating a
second user preference table in Phase 1. Add push-specific columns:

- `push_followups_enabled boolean not null default true`
- `push_birthdays_enabled boolean not null default true`
- `notification_timezone text`
- `quiet_hours_enabled boolean not null default false`
- `quiet_hours_start time`
- `quiet_hours_end time`

The existing `email_reminders_enabled` column remains compatibility-only and
must not be treated as proof that email delivery exists. Mobile settings should
read and update only the preference fields required by the UI.

### Notification Delivery Logging And Idempotency

Create a server-written `notification_deliveries` table. It should not contain
relationship notes, imported contact payloads, or private message bodies.
Suggested shape:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `push_token_id uuid references public.push_tokens(id) on delete set null`
- `kind text not null`
- `subject_type text not null`
- `subject_id uuid`
- `scheduled_for date not null`
- `send_after timestamptz`
- `idempotency_key text not null`
- `status text not null default 'pending'`
- `attempt_count integer not null default 0`
- `provider_message_id text`
- `error_code text`
- `last_attempt_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Add a unique index on `idempotency_key`. Build the key from stable non-secret
parts such as user id, notification kind, subject id, scheduled date, and
channel. RLS should allow authenticated users to select only their own rows if
the app needs status display; client insert/update/delete should remain
disallowed unless a specific user-facing need is approved.

### Account Deletion

Keep account deletion server-side. The mobile route should:

1. Validate the bearer token and identify the user.
2. Require an explicit confirmation body from the client.
3. Mark or delete the user's push tokens where practical.
4. Use a service-role Supabase client to delete the auth user.
5. Rely on `on delete cascade` for user-owned CRM rows, settings, push tokens,
   and delivery logs.
6. Return JSON success so the mobile app can clear local cache and route to the
   logged-out state.

The remaining product blocker is the final data-retention policy. Unless that
policy says otherwise, mobile v1 should treat account deletion as deletion of
private CRM data rather than long-term retention.

Account deletion policy decision: mobile v1 should delete the user's private
CRM data immediately. The server flow should rely on `on delete cascade` for
user-owned tables and should clear or expire push tokens as part of the
server-side account deletion path.

### Atomic Restore/Replace

The current web restore/replace flow performs multiple client-side writes.
Mobile v1 must not reuse that behavior for destructive restore. Implement a
single database RPC or trusted route backed by a database transaction before
mobile launch.

Preferred Phase 1 approach:

- Add a `restore_crm_snapshot(payload jsonb, replace_existing boolean)` RPC as
  `security invoker`.
- Validate the uploaded JSON in TypeScript before calling the RPC.
- Inside the RPC, derive the user from `auth.uid()`, optionally delete the
  user's existing people and tags when `replace_existing = true`, then insert
  or upsert tags, people, touch-point interactions, person notes, and person
  tags in dependency order.
- Force every imported owner field to `auth.uid()` and reject person/tag
  relationships that are not present in the same payload or already owned by
  the user.
- Use one call for both import/update and restore/replace so the transaction
  boundary is identical.

The web settings restore flow should move to this backend path after the RPC is
available, but that migration should be a separate narrow task with full web
verification.

## Auth And Deep Links

Required auth flows:

- Signup.
- Login.
- Logout.
- Forgot password.
- Update password.
- Session restore.

Deep link scheme proposal:

```text
roots://
```

The exact redirect URLs must be added to Supabase Auth settings and the Expo
app configuration before password reset and OAuth-style redirects can pass QA.

## Navigation

Navigation decision: use Expo Router.

Primary tabs:

- Dashboard
- People
- Your Roots
- Settings

Secondary stack screens:

- Auth screens.
- Onboarding.
- Person detail.
- Add/edit person.
- Log/edit interaction.
- Contacts import review.
- Export/import/restore.
- Account deletion.

The tab bar should be floating, safe-area aware, and iOS-native in feel.

## Styling

Styling decision: use NativeWind v4.

- NativeWind for utility styling.
- Centralized tokens for colors, spacing, typography, and radius.
- Small app-owned component system.

Base components:

- Screen
- Button
- TextField
- Card
- ListRow
- TagChip
- EmptyState
- ErrorBanner
- LoadingState
- ConfirmDialog
- BottomSheet
- FloatingTabBar

## Offline Read Cache

Initial offline scope is read-only.

Cache:

- people
- tags
- person_tags
- interactions, limited to real touch points
- person_notes
- settings

The app should derive dashboard and follow-up views from cached data when
offline. Cached private data must be cleared on logout and account deletion.

The cache design must define:

- storage layer, such as SQLite or another React Native-compatible store
- whether private cached data is encrypted at rest
- retention window and maximum cached history
- cache schema versioning and migrations
- stale-data indicators
- behavior when the app launches offline with an expired or missing session
- clearing behavior on logout, account deletion, and account switch

Offline cache decision: private CRM cache must be encrypted for mobile v1. If a
practical encrypted storage path is not available in the Expo build, delay
offline read cache rather than storing relationship notes, contacts, or
interaction history unencrypted.

Offline writes are out of scope unless explicitly approved later. If added,
they require a sync queue, conflict handling, retry rules, and stronger QA.

## Contacts Import

Contacts import must be review-before-save.

Expected flow:

1. Explain why Contacts access is useful.
2. Request iOS Contacts permission.
3. Let user select contacts, with an import-all option behind a clear
   confirmation.
4. Preview mapped fields.
5. Run duplicate detection.
6. Let user create, update existing, or skip.
7. Save only under the authenticated user.

Denied permission should not block the rest of the app.

Contacts import must define field mapping rules, duplicate scoring, partial
failure behavior, and whether selected contact data is cached before save. Do
not upload or persist contacts the user did not select for import.

Import-all behavior still requires review before save. The app may load local
Contacts for selection and preview, but it must not upload unreviewed contact
data to Supabase.

## Push Notifications

Push notifications should support:

- due follow-up reminders
- overdue follow-up reminders
- birthday reminders
- important-moment reminders
- deep links into person detail and relevant People filters

Push token storage should be per user/device. Tokens should be cleaned up when
practical on logout and account deletion.

Notification payloads must avoid sensitive notes or detailed relationship data.
Use minimal text and fetch private details after the app opens.

The notification backend must define:

- sender platform: Next.js/Vercel route first
- schedule source and authorization
- user timezone handling
- quiet hours or send-window behavior
- token invalidation and retry rules
- idempotency so duplicate sends are avoided
- delivery logging without sensitive payload content

Push backend decision: scheduled push sending starts in the existing
Next.js/Vercel backend. Use a protected route plus a trusted scheduler, such as
Vercel Cron, when scheduled delivery is implemented.

Important moments use the user-owned `important_moments` table. Mobile can
create, edit, delete, and display those rows now. The schema also supports
privacy-safe `notification_deliveries.kind = 'important_moment'`, but actual
scheduled delivery still requires the trusted sender/cron job to include that
kind.

## Notes And Touch Points

Mobile stores note-only records in the user-owned `person_notes` table. Notes
are not interactions, do not call `create_interaction_and_touch_person`, and do
not update `people.last_contacted_at`.

`interactions` is reserved for logged calls, texts, meetings, chats, emails,
coffee, and similar relationship touch points. Dashboard stats, People sort,
Last talked, follow-up queues, streaks, and interaction counters must use only
touch-point interactions. Person detail timelines show touch points; the Notes
tab shows `person_notes`.

## Data Management

Mobile must support:

- export
- import/update
- restore/replace
- account deletion

Exports and restore/import payloads include `person_notes` separately from
`interactions`. Restore/import keeps backward compatibility by converting
legacy `type = "Note"` or `is_touch_point = false` interaction payload rows
into `person_notes`.

Restore/replace should be atomic before mobile launch. Prefer a database RPC or
trusted server route so partial restores cannot leave mixed user data.

Account deletion must run server-side because it requires privileged auth-user
deletion. It must also clear or expire push tokens and local cache, then route
the app to the logged-out state.

## Testing Strategy

Testing is continuous, not a final phase.

Required test categories:

- shared logic unit tests
- mobile component and hook tests where practical
- auth/session checks
- mobile API auth contract tests
- import validation tests
- duplicate detection tests
- notification selection tests
- offline cache behavior tests where practical
- account deletion and cache-clearing tests

Manual real-device QA is required for:

- auth redirects
- password reset
- push notifications
- contacts permissions
- offline launch
- keyboard behavior
- safe areas
- Dynamic Type
- VoiceOver basics
- color contrast
- reduced motion
- TestFlight install/update

Mobile E2E decision: use Maestro for the first mobile E2E path. Use the repo's
existing Node tests for `packages/shared`.

## Environment

Mobile environment values should include:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Do not store service role keys in the mobile app. Trusted notification sending,
account deletion helpers, and any privileged operations must run server-side.

Use one Supabase project for early mobile development, TestFlight, and
production for now. Revisit separate development and production projects before
public App Store launch.

Define EAS build profiles for development, preview/TestFlight, and production.
Each profile should initially point at the shared Supabase environment, and
must still document the bundle identifier, version/build-number process, and
rollback approach.

Build numbering decision: use date-based iOS build numbers. Format should be a
monotonically increasing numeric value such as `YYYYMMDDNN`, for example
`2026051601` for the first build on May 16, 2026.

Mobile v1 will not add analytics or a crash reporting SDK. If this changes,
the privacy policy, App Store privacy answers, and privacy manifest must be
updated before submission.

## App Store Privacy Manifest

The iOS app must include and verify `PrivacyInfo.xcprivacy` as needed for the
app and selected SDKs. Before submission:

- review all native SDKs for required privacy manifests
- declare collected data consistently with App Store privacy answers
- declare required-reason API use if any dependency requires it
- confirm no tracking domains or tracking use are present unless explicitly
  approved and disclosed
