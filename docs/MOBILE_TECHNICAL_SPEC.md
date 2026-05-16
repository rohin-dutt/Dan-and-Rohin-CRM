# Roots Mobile Technical Spec

This document records technical decisions for the Expo React Native iOS app.
Update it when architecture changes, not for routine task status.

## Stack

- Expo React Native.
- TypeScript.
- Supabase Auth, database, RPCs, and RLS.
- Shared TypeScript package for portable CRM logic.
- NativeWind preferred for styling unless a blocker appears.
- EAS for iOS builds and TestFlight distribution.

## Repository Layout

Initial target:

```text
mobile/
  app/ or src/
  assets/
  components/
  features/
  lib/
  navigation/
  test/
packages/
  shared/
    src/
    test/
```

The exact `mobile/` routing layout depends on the final navigation choice:
Expo Router or React Navigation.

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

Primary tabs:

- Dashboard
- People
- Follow Ups
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

Preferred approach:

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
- interactions
- settings

The app should derive dashboard and follow-up views from cached data when
offline. Cached private data must be cleared on logout and account deletion.

Offline writes are out of scope unless explicitly approved later. If added,
they require a sync queue, conflict handling, retry rules, and stronger QA.

## Contacts Import

Contacts import must be review-before-save.

Expected flow:

1. Explain why Contacts access is useful.
2. Request iOS Contacts permission.
3. Let user select contacts.
4. Preview mapped fields.
5. Run duplicate detection.
6. Let user create, update existing, or skip.
7. Save only under the authenticated user.

Denied permission should not block the rest of the app.

## Push Notifications

Push notifications should support:

- due follow-up reminders
- overdue follow-up reminders
- birthday reminders
- deep links into person detail or Follow Ups

Push token storage should be per user/device. Tokens should be cleaned up when
practical on logout and account deletion.

Notification payloads must avoid sensitive notes or detailed relationship data.
Use minimal text and fetch private details after the app opens.

## Data Management

Mobile must support:

- export
- import/update
- restore/replace
- account deletion

Restore/replace should be atomic before mobile launch. Prefer a database RPC or
trusted server route so partial restores cannot leave mixed user data.

## Testing Strategy

Testing is continuous, not a final phase.

Required test categories:

- shared logic unit tests
- auth/session checks
- import validation tests
- duplicate detection tests
- notification selection tests
- offline cache behavior tests where practical

Manual real-device QA is required for:

- auth redirects
- password reset
- push notifications
- contacts permissions
- offline launch
- keyboard behavior
- safe areas
- TestFlight install/update

## Environment

Mobile environment values should include:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Do not store service role keys in the mobile app. Trusted notification sending,
account deletion helpers, and any privileged operations must run server-side.
