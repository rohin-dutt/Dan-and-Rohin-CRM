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
2. Shared core extraction.
3. Expo foundation and native design system.
4. Auth, session persistence, and early TestFlight.
5. Onboarding.
6. Core CRM vertical slice.
7. Full CRM parity.
8. Native Contacts import.
9. Push notifications.
10. Offline read cache.
11. Data management and account deletion.
12. App Store release.

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

## Coordination Rules

- `docs/MOBILE_MASTER_PLAN.md` controls mobile strategy.
- `docs/MOBILE_TODO.md` controls active execution.
- `docs/MOBILE_TECHNICAL_SPEC.md` records engineering decisions.
- `docs/MOBILE_SCREEN_MAP.md` records the product and UX map.
- `docs/APP_STORE_READINESS.md` tracks release requirements.

Update this file only when the mobile strategy or scope changes.
