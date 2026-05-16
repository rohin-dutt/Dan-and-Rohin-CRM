# Roots Mobile TODO

Active execution queue for the Expo React Native iOS app. Product strategy
belongs in `docs/MOBILE_MASTER_PLAN.md`; this file should stay tactical.

## Current Phase

- [ ] Phase 0: Product and launch readiness.

## Blockers / Decisions Needed

- [ ] Create Apple Developer account and assign owner before Phase
      4/TestFlight.
  - Decision: the account will be created; owner remains pending until the
    account exists.
- [x] Confirm App Store bundle ID direction.
  - Decision: use `com.roots.crm` for now; still allow a final revisit before
    Apple provisioning if a stronger brand/company identifier is chosen.
- [x] Confirm production Supabase project strategy for mobile.
  - Decision: use one Supabase project for early mobile development,
    TestFlight, and production for now; revisit separate dev/prod projects
    before public App Store launch.
- [x] Confirm development, TestFlight, and production Supabase environments.
  - Decision: one shared Supabase environment for now.
- [x] Confirm deep link scheme: `roots://`.
- [x] Confirm privacy policy URL.
  - Decision: use the existing website privacy page.
- [x] Confirm support URL.
  - Decision: use the existing website contact page.
- [x] Confirm account deletion and data-retention policy.
  - Decision: deleting an account deletes the user's private CRM data
    immediately for mobile v1.
- [x] Decide whether iOS Contacts import is selected-contact only or can import
      from a reviewed multi-select list.
  - Decision: users can select specific contacts and review before saving;
    also provide an import-all option behind a clear confirmation and review
    step.
- [x] Decide push notification backend: Next.js/Vercel route first.
  - Decision: use the existing Next.js/Vercel backend for scheduled push
    sending in Phase 1; do not introduce Supabase Edge Functions unless a
    later requirement makes that worthwhile.
- [x] Decide mobile privileged API auth pattern: Supabase access
      token in `Authorization: Bearer <token>`.
- [x] Choose offline storage layer and encryption posture.
  - Decision: private offline CRM cache must be encrypted for v1; if a
    practical encrypted storage path is not available, delay offline cache
    rather than storing sensitive relationship data unencrypted.
- [x] Choose mobile E2E test tool: Maestro.
- [x] Decide whether to add crash reporting, analytics, or diagnostic logging.
  - Decision: no analytics and no crash reporting SDK in mobile v1.
- [x] Define build-number process.
  - Decision: use date-based build numbers, such as `2026051601`.
- [ ] Define EAS build profiles.

## Phase 0: Product And Launch Readiness

- [x] Write final mobile v1 scope from `docs/MOBILE_MASTER_PLAN.md`.
- [x] Confirm web/mobile relationship during transition.
  - Decision: web remains live as acquisition surface and desktop/admin
    fallback; mobile becomes the primary daily-use surface. Add an iOS app
    banner/callout to the website after App Store availability.
- [ ] Confirm native permissions list:
  - [x] Contacts
  - [x] Push notifications
  - [x] Offline local cache
- [x] Confirm App Store app name: Roots.
- [x] Confirm no payments in mobile v1.
- [x] Create initial mobile QA checklist before TestFlight.
  - Initial checklist lives in `docs/APP_STORE_READINESS.md`; expand it with
    device-specific findings during TestFlight.
- [x] Create accessibility QA checklist for Dynamic Type, VoiceOver basics,
      contrast, reduced motion, keyboard behavior, and safe areas.
  - Initial checklist lives in `docs/APP_STORE_READINESS.md` and
    `docs/MOBILE_SCREEN_MAP.md`.
- [ ] Confirm realistic non-sensitive sample data for screenshots and demo.

## Phase 1: Backend, API, And Schema Readiness

- [x] Define mobile API auth contract for trusted routes/functions.
  - Decision: mobile sends a Supabase access token in
    `Authorization: Bearer <token>`; trusted routes may keep cookie auth only
    for existing web compatibility.
- [x] Decide whether trusted mobile APIs live in Next.js route handlers,
      Supabase Edge Functions, or both.
  - Decision: use Next.js route handlers for account deletion,
    export/import/restore, push-token registration, and scheduled push sending
    first. Keep Supabase Edge Functions out of Phase 1 unless a concrete need
    appears.
- [x] Design push token schema.
  - Planned table: `push_tokens`, user-owned with token uniqueness, lifecycle
    status, app install metadata, environment, timestamps, and RLS.
- [x] Design notification preference schema.
  - Plan: extend `settings` with push follow-up, birthday, timezone, and quiet
    hours fields instead of adding a second one-row preference table.
- [x] Design notification delivery log or idempotency schema.
  - Planned table: `notification_deliveries`, server-written, privacy-safe,
    with a unique idempotency key and no private message body storage.
- [x] Design account deletion server flow for mobile.
  - Plan: bearer-auth route validates user, requires explicit confirmation,
    clears or expires push tokens, deletes the Supabase auth user with a
    service-role server client, then relies on cascading user-owned data
    deletes.
- [x] Design atomic restore/replace RPC or trusted server route.
  - Plan: add a single `restore_crm_snapshot(payload jsonb,
    replace_existing boolean)` RPC and move destructive restore through one
    transaction before mobile launch.
- [ ] Design mobile export/import API shape if the web file flows are not
      reused directly.
- [x] Add Supabase migrations for approved schema changes.
  - Added `20260516170000_mobile_notification_readiness.sql`.
- [x] Add RLS policies for new user-owned tables.
  - Added user-owned CRUD policies for `push_tokens` and user-owned select for
    server-written `notification_deliveries`.
- [x] Update `DATA_MODEL.MD` after schema changes.
- [ ] Add tests or SQL checks for ownership and cross-user rejection.
- [x] Confirm service-role operations never run in the mobile app.
  - Server-only service-role client creation is isolated behind trusted API
    code after request authentication.

## Phase 2: Shared Core Extraction

- [ ] Create `packages/shared`.
- [ ] Move portable CRM types into shared package.
- [ ] Move dashboard categorization and follow-up state logic.
- [ ] Move duplicate detection helpers.
- [ ] Move date helpers that are portable to React Native.
- [ ] Move validation constants where useful.
- [ ] Move import/export payload validation where runtime-compatible.
- [ ] Keep web UI components out of shared package.
- [ ] Update web imports carefully after each extraction.
- [ ] Add or preserve tests for shared logic.
- [ ] Run `npm.cmd test`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.

## Phase 3: Expo Foundation And Design System

- [ ] Scaffold Expo app under `mobile/`.
- [ ] Configure TypeScript.
- [ ] Configure Expo Router under `mobile/app`.
- [ ] Configure EAS development, preview/TestFlight, and production profiles.
- [ ] Configure environment handling for Supabase values.
- [ ] Add Supabase React Native client setup.
- [ ] Add React Native-compatible URL polyfill.
- [ ] Add AsyncStorage or selected auth-session storage.
- [ ] Add deep link configuration.
- [ ] Add app icon and splash screen.
- [ ] Add NativeWind v4.
- [ ] Create base design tokens.
- [ ] Create `PrivacyInfo.xcprivacy` placeholder if required by selected native
      dependencies or accessed APIs.
- [ ] Create base components:
  - [ ] Screen
  - [ ] Button
  - [ ] TextField
  - [ ] Card
  - [ ] ListRow
  - [ ] TagChip
  - [ ] EmptyState
  - [ ] ErrorBanner
  - [ ] LoadingState
  - [ ] ConfirmDialog
  - [ ] BottomSheet
  - [ ] Floating tab bar

## Phase 4: Auth, Session, And Early TestFlight

- [ ] Build login.
- [ ] Build signup.
- [ ] Build logout.
- [ ] Build forgot password.
- [ ] Build update password deep link handling.
- [ ] Restore session on app launch.
- [ ] Protect authenticated screens.
- [ ] Send mobile bearer auth to trusted APIs.
- [ ] Clear local private cache on logout.
- [ ] Create first EAS/TestFlight build.
- [ ] Install on a real iPhone.
- [ ] Record TestFlight QA result.

## Phase 5: Onboarding

- [ ] Build welcome/value screen.
- [ ] Build add-first-person or import prompt.
- [ ] Build reminder preference step.
- [ ] Ask for push permission only after context is shown.
- [ ] Save onboarding completion.
- [ ] Route completed users to Dashboard.
- [ ] QA onboarding on TestFlight.

## Phase 6: Core CRM Vertical Slice

- [ ] Build Dashboard basic state.
- [ ] Build People list basic state.
- [ ] Build Person detail.
- [ ] Build Add person.
- [ ] Build Log interaction.
- [ ] Build Follow Ups basic tab.
- [ ] Verify a created person and interaction update Dashboard and Follow Ups.
- [ ] Verify data matches Supabase and web behavior.
- [ ] Verify RLS still prevents cross-user access for mobile reads and writes.

## Phase 7: Full CRM Parity

- [ ] Dashboard sections: overdue, due soon, coming up, recent, neglected.
- [ ] Dashboard birthday reminders.
- [ ] People search.
- [ ] People filters.
- [ ] People sort.
- [ ] Edit person.
- [ ] Delete person.
- [ ] Duplicate warnings.
- [ ] Tag display.
- [ ] Tag assignment.
- [ ] Edit interaction.
- [ ] Delete interaction.
- [ ] Follow-up done, reopen, and snooze.
- [ ] Settings account tab.
- [ ] Settings notification preferences.
- [ ] Settings tag management.
- [ ] Unsaved-change handling for edit/create flows.

## Phase 8: Native Contacts Import

- [ ] Add Contacts permission explanation screen.
- [ ] Request Contacts permission.
- [ ] Handle denied and limited permission states.
- [ ] Load contacts from device.
- [ ] Let user select contacts to import.
- [ ] Preview mapped fields.
- [ ] Document and implement field mapping rules.
- [ ] Detect likely duplicates.
- [ ] Support create, update existing, and skip.
- [ ] Handle partial import failures with a result summary.
- [ ] Save imported contacts under authenticated user.
- [ ] Confirm unselected contacts are not uploaded or persisted.
- [ ] QA denied permission fallback.

## Phase 9: Push Notifications

- [ ] Request push permission after onboarding context.
- [ ] Register Expo/APNs push token.
- [ ] Store token per user/device.
- [ ] Add notification preferences to Settings.
- [ ] Build trusted sender for due follow-ups and birthdays.
- [ ] Add delivery logging or idempotency protection.
- [ ] Add timezone handling.
- [ ] Add quiet-hours or send-window behavior if approved.
- [ ] Add notification deep links.
- [ ] Clean token on logout/account deletion where appropriate.
- [ ] Verify notification payloads avoid notes and sensitive relationship
      details.
- [ ] Verify notification delivery on physical iPhone.

## Phase 10: Offline Read Cache

- [ ] Choose storage layer.
- [ ] Decide whether cached private data is encrypted at rest.
- [ ] Define retention window and maximum cached history.
- [ ] Define cache schema versioning and migration approach.
- [ ] Cache people, tags, person_tags, interactions, and settings.
- [ ] Derive dashboard/follow-up data locally from cache.
- [ ] Show offline and stale indicators.
- [ ] Allow app launch while offline with cached data.
- [ ] Define behavior for offline launch with expired or missing session.
- [ ] Disable or clearly block writes while offline.
- [ ] Clear cache on logout, account deletion, and account switch.

## Phase 11: Data Management And Account Deletion

- [ ] Build export flow.
- [ ] Build import/update flow.
- [ ] Build restore/replace flow.
- [ ] Make restore/replace atomic through RPC or trusted route.
- [ ] Validate import files before writes.
- [ ] Build account deletion flow.
- [ ] Confirm account deletion clears server data through cascade/RLS-safe
      helpers.
- [ ] Confirm account deletion clears local cache and push tokens.
- [ ] Add privacy and support links.

## Phase 12: App Store Release

- [ ] Complete App Store readiness checklist.
- [ ] Verify `PrivacyInfo.xcprivacy` and third-party SDK privacy manifests.
- [ ] Prepare screenshots.
- [ ] Prepare demo account.
- [ ] Prepare review notes.
- [ ] Resolve TestFlight feedback.
- [ ] Run full accessibility/device QA.
- [ ] Submit for App Store review.

## Verification Gates

Before finishing meaningful shared, backend, or web-impacting work:

```bash
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

For mobile-specific work, also run the selected Expo checks, mobile unit tests,
and mobile E2E checks where available. Complete real-device TestFlight QA when
the feature touches auth, native permissions, push, offline behavior, import,
restore, or account deletion.
