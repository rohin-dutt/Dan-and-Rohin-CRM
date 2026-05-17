# Roots Mobile Master Plan

This file is the source of truth for the Roots iOS app direction. The mobile
app should become a fully functioning product surface that a user can rely on
without needing the website.

## Product Goal

Build Roots as an App Store-ready iOS app using Expo React Native. The app
should support signup, login, relationship management, contacts import, push
reminders, offline read access, export/import/restore, and account management.

The mobile app should feel like a native iOS product, not a resized website.
Reuse the current Supabase backend, data model, RLS policies, migrations, and
portable CRM business rules. Do not reuse web UI components directly.

## Current Decision

- Platform: iOS first.
- Framework: Expo React Native.
- Backend: existing Supabase project.
- Repository: same GitHub repository as the web app.
- App name: Roots.
- Payments: not in mobile v1.
- Email reminders: intentionally out of scope for this mobile build plan.
- Web app: remains live as a desktop/admin fallback while mobile becomes the
  primary daily-use app.
- Top-level project direction: `PROJECT_MASTER_PLAN.md` now recognizes the
  native iOS app as approved product work. This file owns the detailed mobile
  strategy.

## Web And Mobile Transition

The web app remains live during and after the mobile launch. Do not deprecate
the web app as part of mobile v1.

Web responsibilities:

- public acquisition surface for users who find Roots through search, social,
  direct links, or referrals
- desktop/admin fallback for settings, import/export/restore, account
  management, and support flows
- continued support for existing CRM workflows while mobile reaches parity
- future email reminder or weekly digest delivery if that feature is built;
  email delivery is server/web-owned unless a later mobile plan explicitly
  changes that

Mobile responsibilities:

- primary daily-use surface for relationship review, follow-ups, Contacts
  import, push reminders, and offline read access
- native iOS experience through TestFlight and App Store distribution

After the iOS app is available, add a restrained website banner or callout that
points users to the App Store listing. Keep signup/login and web CRM access
available.

## Target Repository Shape

Start with a low-churn structure:

```text
personal-crm/
  app/
  components/
  lib/
  mobile/
  packages/
    shared/
  supabase/
    migrations/
  docs/
```

If the repo later needs a fuller monorepo layout, move the web app into
`apps/web` after the mobile foundation is stable.

## Mobile V1 Scope

Mobile v1 includes:

- Signup, login, logout, forgot password, and password update.
- Session restore after app close/reopen.
- Onboarding for new users.
- Dashboard.
- People list, search, filters, sort, create, edit, and delete.
- Person detail.
- Tags and tag assignment.
- Interaction create, edit, and delete.
- Follow-up status controls, including done, reopen, and snooze.
- Dedicated Follow Ups tab.
- iOS Contacts import with review before save.
- Push notifications for follow-ups and birthdays.
- Offline read cache for recently synced private CRM data.
- Export, import/update, restore/replace.
- Account deletion.
- Privacy and support links.

Mobile v1 excludes:

- Payments or subscriptions.
- Email reminders.
- AI summaries.
- Android-specific polish.
- Offline writes and conflict resolution unless explicitly approved later.

## Navigation Model

The primary navigation should use a floating iOS-style tab bar:

- Dashboard
- People
- Follow Ups
- Settings

Secondary screens should be stack-based:

- Login
- Signup
- Forgot Password
- Update Password
- Onboarding
- Person Detail
- Add Person
- Edit Person
- Log Interaction
- Edit Interaction
- Contacts Import Review
- Export/Import/Restore
- Account Deletion

## Build Phases

1. Product and launch readiness.
2. Backend, API, and schema readiness.
3. Shared core extraction.
4. Expo foundation and native design system.
5. Auth, session persistence, and early TestFlight.
6. Onboarding.
7. Core CRM vertical slice.
8. Full CRM parity.
9. Native Contacts import.
10. Push notifications.
11. Offline read cache.
12. Data management and account deletion.
13. App Store release.

Backend readiness comes before deep feature work because push notifications,
offline cache clearing, account deletion, mobile API authentication, and
atomic restore/replace all affect schema, server boundaries, privacy answers,
and QA.

## Launch Blockers

Mobile v1 must not ship until:

- Restore/replace runs atomically through an RPC or trusted server route.
- Account deletion works from the app and deletes or expires all private app
  data, cached data, and push tokens.
- Push notification storage, delivery, preferences, and logging are defined.
- Mobile privileged operations use a documented API authentication contract;
  service-role keys never ship in the app.
- Offline private data has a documented storage layer, retention policy,
  stale-data UI, and logout/account-deletion clearing behavior.
- App Store privacy labels, privacy manifest, permission strings, support URL,
  privacy URL, and review notes match the app's real behavior.
- TestFlight has been used on at least one real iPhone for auth, push,
  contacts, offline launch, import/restore, and account deletion.

## Success Criteria

The plan is working if:

- A user can manage their CRM entirely from the iOS app.
- Mobile behavior matches the web app where features overlap.
- The app works on a real iPhone through TestFlight early in development.
- Supabase RLS remains the database safety layer.
- Multi-step writes are protected by RPCs or server routes where needed.
- Private cached data is cleared on logout and account deletion.
- Push notification payloads do not leak sensitive relationship details.
- App Store metadata and privacy answers match the app's actual behavior.
- Mobile release operations are repeatable: EAS profiles, build numbers,
  environment selection, crash/logging decisions, and rollback approach are
  documented before submission.
- Accessibility and device QA cover Dynamic Type, VoiceOver basics, contrast,
  reduced motion, keyboard behavior, safe areas, and small/large iPhone
  layouts.

## Coordination Rules

- `docs/MOBILE_MASTER_PLAN.md` controls mobile strategy.
- `docs/MOBILE_TODO.md` controls active execution.
- `docs/MOBILE_TECHNICAL_SPEC.md` records engineering decisions.
- `docs/MOBILE_SCREEN_MAP.md` records the product and UX map.
- `docs/APP_STORE_READINESS.md` tracks release requirements.

Update this file only when the mobile strategy or scope changes.
