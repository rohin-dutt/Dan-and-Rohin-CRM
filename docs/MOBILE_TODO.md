# Roots Mobile TODO

Active execution queue for the Expo React Native iOS app. Product strategy
belongs in `docs/MOBILE_MASTER_PLAN.md`; this file should stay tactical.

## Current Phase

- [ ] Phase 0: Product and launch readiness.

## Blockers / Decisions Needed

- [ ] Confirm Apple Developer account owner.
- [ ] Confirm App Store bundle ID, proposed: `com.roots.crm`.
- [ ] Confirm production Supabase project for mobile.
- [ ] Confirm deep link scheme, proposed: `roots://`.
- [ ] Confirm privacy policy URL.
- [ ] Confirm support URL.
- [ ] Decide whether Expo Router or React Navigation will own navigation.
- [ ] Confirm NativeWind as styling approach.
- [ ] Decide whether iOS Contacts import is selected-contact only or can import
      from a reviewed multi-select list.
- [ ] Decide push notification backend: Supabase Edge Function, Vercel route,
      or other trusted sender.

## Phase 0: Product And Launch Readiness

- [ ] Write final mobile v1 scope from `docs/MOBILE_MASTER_PLAN.md`.
- [ ] Confirm web/mobile relationship during transition.
- [ ] Confirm native permissions list:
  - [ ] Contacts
  - [ ] Push notifications
  - [ ] Offline local cache
- [ ] Confirm App Store app name: Roots.
- [ ] Confirm no payments in mobile v1.
- [ ] Create initial mobile QA checklist before TestFlight.

## Phase 1: Shared Core Extraction

- [ ] Create `packages/shared`.
- [ ] Move portable CRM types into shared package.
- [ ] Move dashboard categorization and follow-up state logic.
- [ ] Move duplicate detection helpers.
- [ ] Move date helpers that are portable to React Native.
- [ ] Move validation constants where useful.
- [ ] Keep web UI components out of shared package.
- [ ] Update web imports carefully after each extraction.
- [ ] Add or preserve tests for shared logic.
- [ ] Run `npm.cmd test`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.

## Phase 2: Expo Foundation And Design System

- [ ] Scaffold Expo app under `mobile/`.
- [ ] Configure TypeScript.
- [ ] Configure EAS.
- [ ] Configure environment handling for Supabase values.
- [ ] Add Supabase React Native client setup.
- [ ] Add AsyncStorage session persistence.
- [ ] Add deep link configuration.
- [ ] Add app icon and splash screen.
- [ ] Add NativeWind or selected styling system.
- [ ] Create base design tokens.
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

## Phase 3: Auth, Session, And Early TestFlight

- [ ] Build login.
- [ ] Build signup.
- [ ] Build logout.
- [ ] Build forgot password.
- [ ] Build update password deep link handling.
- [ ] Restore session on app launch.
- [ ] Protect authenticated screens.
- [ ] Clear local private cache on logout.
- [ ] Create first EAS/TestFlight build.
- [ ] Install on a real iPhone.
- [ ] Record TestFlight QA result.

## Phase 4: Onboarding

- [ ] Build welcome/value screen.
- [ ] Build add-first-person or import prompt.
- [ ] Build reminder preference step.
- [ ] Ask for push permission only after context is shown.
- [ ] Save onboarding completion.
- [ ] Route completed users to Dashboard.
- [ ] QA onboarding on TestFlight.

## Phase 5: Core CRM Vertical Slice

- [ ] Build Dashboard basic state.
- [ ] Build People list basic state.
- [ ] Build Person detail.
- [ ] Build Add person.
- [ ] Build Log interaction.
- [ ] Build Follow Ups basic tab.
- [ ] Verify a created person and interaction update Dashboard and Follow Ups.
- [ ] Verify data matches Supabase and web behavior.

## Phase 6: Full CRM Parity

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

## Phase 7: Native Contacts Import

- [ ] Add Contacts permission explanation screen.
- [ ] Request Contacts permission.
- [ ] Load contacts from device.
- [ ] Let user select contacts to import.
- [ ] Preview mapped fields.
- [ ] Detect likely duplicates.
- [ ] Support create, update existing, and skip.
- [ ] Save imported contacts under authenticated user.
- [ ] QA denied permission fallback.

## Phase 8: Push Notifications

- [ ] Request push permission after onboarding context.
- [ ] Register Expo/APNs push token.
- [ ] Store token per user/device.
- [ ] Add notification preferences to Settings.
- [ ] Build trusted sender for due follow-ups and birthdays.
- [ ] Add delivery logging.
- [ ] Add notification deep links.
- [ ] Clean token on logout/account deletion where appropriate.
- [ ] Verify notification delivery on physical iPhone.

## Phase 9: Offline Read Cache

- [ ] Choose storage layer.
- [ ] Cache people, tags, interactions, and settings.
- [ ] Derive dashboard/follow-up data locally from cache.
- [ ] Show offline and stale indicators.
- [ ] Allow app launch while offline.
- [ ] Disable or clearly block writes while offline.
- [ ] Clear cache on logout and account deletion.

## Phase 10: Data Management

- [ ] Build export flow.
- [ ] Build import/update flow.
- [ ] Build restore/replace flow.
- [ ] Make restore/replace atomic through RPC or trusted route.
- [ ] Validate import files before writes.
- [ ] Build account deletion flow.
- [ ] Add privacy and support links.

## Phase 11: App Store Release

- [ ] Complete App Store readiness checklist.
- [ ] Prepare screenshots.
- [ ] Prepare demo account.
- [ ] Prepare review notes.
- [ ] Resolve TestFlight feedback.
- [ ] Submit for App Store review.

## Verification Gates

Before finishing meaningful work:

```bash
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

For mobile-specific work, also run the relevant Expo checks and complete
real-device TestFlight QA when the feature touches native behavior.
