# Roots Mobile QA Audit

Date: 2026-06-10 America/Indianapolis

## 1. Executive Summary

Overall readiness: not ready for TestFlight or App Store submission. The app is coherent as a relationship-focused product and the main navigation model is understandable, but several launch-blocking backend and business-logic issues remain.

Biggest risks:

- The linked Supabase project is missing `20260609193834_separate_person_notes`, so mobile note creation fails and `/api/export` returns HTTP 500 for signed-in users with people.
- Account deletion failed for the disposable QA account because the local backend lacks `SUPABASE_SERVICE_ROLE_KEY`; the account remained able to sign in.
- Home and People use cadence-derived due state from `people.last_contacted_at + contact_frequency_days`, while person detail uses `interactions.follow_up_*`. Completed and snoozed follow-ups can still look overdue elsewhere.
- First-run onboarding is not consistently reached. A brand-new disposable account logged in directly to Dashboard with an empty state instead of the documented onboarding flow.
- Native-only behavior still needs real iPhone/TestFlight coverage. Browser preview cannot verify Contacts permission prompts, push token registration, native map behavior, document picker/share sheet, secure storage, notification deep links, or iOS safe-area/accessibility behavior.

Product coherence: the app feels like Roots rather than generic CRM software in the main screens. Copy is mostly warm and clear. The main weakness is inconsistency: the same concepts, especially notes, follow-ups, and onboarding, behave differently depending on entry point.

## 2. Repo And Test Environment Summary

- Required branch check: `git branch --show-current` returned `codex/mobile-roots-ui-overhaul`.
- Initial working tree: `git status --short` returned clean.
- Dirty files before audit: none.
- Changes created by audit: `QA_AUDIT.md` only.
- Existing local servers:
  - Next backend: `http://127.0.0.1:3000`, HTTP 200.
  - Expo web preview: `http://127.0.0.1:8081`, packager status running.
- LAN IP:
  - Wi-Fi IPv4: `192.168.1.18`.
  - `mobile/.env` has `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.18:3000`, matching current LAN IP.
- Existing in-app browser session:
  - Already signed in as an existing `Daniel` account.
  - Treated as real user data. No mutations were performed in that session.
- Disposable QA account used for seeded data:
  - `roots.qa.1781136609394@example.com`
  - User id: `98a9ce61-1c99-498c-bac5-26acc4922d83`
  - Synthetic people/interactions/important moments were created.
  - Account deletion test failed, so this account and its QA data remain in the configured Supabase project.
- Disposable onboarding account:
  - `roots.onboarding.1781137503095@example.com`
  - Used only to verify empty-account first-run behavior.
- Expo SDK 54 reference checked:
  - Official docs list SDK 54 with React Native 0.81, React 19.1.0, React Native Web 0.21.0, minimum Node 20.19.x, iOS 15.1+, Xcode 16.1+.
  - Current mobile package versions align with Expo doctor.

Verification commands:

| Command | Result | Notes |
| --- | --- | --- |
| `mobile`: `npm.cmd run typecheck` | Pass | `tsc --noEmit` passed. |
| `mobile`: `npm.cmd run lint` | Pass | `expo lint` passed. |
| `mobile`: `npx.cmd expo-doctor` | Pass | 18/18 checks passed. |
| root: `npm.cmd test` | Pass | All root unit tests passed. |
| root: `npm.cmd run lint` | Pass with warnings | 0 errors, 7 warnings. Warnings are unused prop and `<img>` usage. |
| root: `npm.cmd run build` | Pass | Next 16.2.6 production build passed. |
| root: `npm.cmd run test:e2e` | Blocked | Failed because an existing `next dev` server was already running on port 3000, PID 24848. I did not kill it. |
| root: `npm.cmd run test:e2e:signed-in` | Blocked | Local Supabase stack was not configured/running; script could not read local Supabase status. |

Environment/log notes:

- Next dev log contains LAN-origin warnings for `192.168.1.18` requesting dev resources such as HMR/fonts. For phone testing, consider `allowedDevOrigins` if dev-resource loading causes visible issues.
- Next dev log contains `Error: Missing SUPABASE_SERVICE_ROLE_KEY.` during account deletion.
- Browser console repeatedly logs:
  - `[expo-notifications] Listening to push token changes is not yet fully supported on web.`
  - `Cannot manually set color scheme, as dark mode is type 'media'. Please use StyleSheet.setFlag('darkMode', 'class')`
  - React Native Web deprecation warnings for `props.pointerEvents`, `shadow*`, and image `tintColor`.

## 3. Feature Inventory

Mobile app surfaces found:

- Launch/session routing through `mobile/app/index.tsx` and `mobile/app/_layout.tsx`.
- Auth stack:
  - Login
  - Signup
  - Forgot password
  - Update password
  - Password recovery deep-link parsing for `roots://update-password`
- Onboarding:
  - Three-step intro/add-first-person/log-first-interaction flow
  - No Contacts import step
  - No notification permission context step
  - Skip only on final interaction step
- Main tabs:
  - Home/Dashboard
  - People
  - Center quick-add action
  - Your Roots
  - Settings
- Dashboard:
  - Greeting and streak
  - Invite/share
  - Overdue/due-this-week/coming-up cards
  - People to follow up with
  - Upcoming birthdays and important moments
  - Recent notes
  - Total contacts, interactions, on-time outreach, most contacted
- People:
  - List
  - Name search
  - Friend/Family/Professional category pills
  - Status filters
  - Location filter
  - Upcoming moments URL filter
  - Sort by last contacted/name/most contacted/recently added
  - Person cards with tags/status/last interaction
- Person stack:
  - Add person
  - Edit person
  - Person detail
  - Log interaction
  - Add note mode through log screen
  - Contacts import review
- Person data:
  - Name, email, phone, company, role, location, latitude/longitude, birthday, how met, relationship type, relationship strength, preferred contact method, contact frequency, notes, tags, important moments
- Interactions:
  - Touch-point interactions
  - Follow-up needed/date/status
  - Done and snooze controls on person detail
  - No dedicated edit/delete interaction UI
  - No follow-up reopen UI
- Notes:
  - Dedicated `person_notes` code path
  - Add/edit/delete note UI in person detail
  - Recent notes on Dashboard
- Quick add:
  - Add someone new
  - Log interaction
  - Add note
- Contacts import:
  - Permission request
  - Selected contacts review
  - Duplicate warnings
  - Create/import selected
  - No update-existing implementation
- Your Roots:
  - Native `react-native-maps` map on device
  - Web list fallback
  - Map groups by saved coordinates
  - Search locations via Mapbox token if configured
  - Location list/sheet navigation to People location filter
- Settings:
  - Profile display name
  - Email update
  - Password update
  - Logout
  - Push preference toggle
  - Invite/share
  - Export data
  - Import/update JSON
  - Restore/replace JSON
  - Manage tags placeholder
  - Legal/support links
  - Delete account
- Trusted APIs:
  - `/api/export`
  - `/api/import/contacts`
  - `/api/import/restore`
  - `/api/mobile/push-token`
  - `/api/account/delete`
  - `/api/send-digest` exists but email reminders are out of mobile v1 scope
- Shared logic:
  - Date formatting and local date helpers
  - Follow-up state and queue helpers
  - Dashboard categorization
  - Duplicate detection
  - Important moment draft validation
  - Streak update helper
- Schema/migrations:
  - Local migrations include `person_notes` and note/touch-point separation.
  - Linked Supabase migrations currently stop at `20260609090000_important_moments_and_note_touchpoints`; `20260609193834_separate_person_notes` is not applied.

## 4. Coverage Matrix

| Area | Status | Notes |
| --- | --- | --- |
| Branch/status guard | Pass | Correct branch and clean initial tree. |
| Auth login validation | Pass | Missing email and invalid credentials show errors. |
| Signup validation | Pass | Missing first name shows error. |
| Signup success | Partial | Disposable account creation succeeded through Supabase client; browser signup was blocked in sandboxed browser by network restrictions. |
| Forgot password validation | Pass | Missing email shows error. |
| Update password | Issue | Direct no-session route rendered blank in browser check; deep-link session not testable here. |
| Session persistence | Partial | Disposable login persisted inside isolated browser context. Native app close/reopen not tested. |
| Onboarding | Issue | Empty disposable account logged into Dashboard instead of onboarding. Onboarding code also does not match screen-map steps. |
| Dashboard empty state | Pass | Empty account shows "No people yet". |
| Dashboard populated state | Issue | Renders data, but follow-up sections misclassify snoozed/done cadence states. |
| Dashboard upcoming moments | Pass | Birthday and important moments within 14 days displayed correctly. |
| Dashboard recent notes | Issue | Shows empty because linked DB lacks `person_notes`; add note fails. |
| People list | Pass | List renders seeded people. |
| People search | Partial | Name search exists; other fields are not searched. |
| People filters | Issue | Status filters use cadence, not follow-up rows; "overdue" includes "Due today" labels. |
| People sorting | Pass | Sort options present; not exhaustively clicked due time. |
| Add person | Partial | Required validation and save work; stale error and direct-route back behavior issues. |
| Edit person | Partial | Code inspected; UI not fully edited to avoid broader data mutation. |
| Delete person | Partial | Code inspected; not executed because account deletion test already failed and broad destructive UI testing was limited. |
| Person detail | Issue | Timeline/about/follow-up surfaces render; header next-action uses cadence even when follow-up done/snoozed. |
| Add note | Issue | UI fails with generic "Failed to log interaction"; backend table missing. |
| Log interaction | Pass with caveat | Interaction saved; direct URL had no history for `router.back()`, producing dev warning. |
| Follow-up done/snooze | Issue | Done state works on detail, but Home/People still use cadence; snoozed state is displayed like normal open overdue follow-up. |
| Quick add | Partial/Issue | Code inspected. Cross-entry differences are significant. |
| Contacts import web preview | Pass/Partial | Web fallback reports denied permission and does not upload. Native permission and real contacts untested. |
| Contacts import API | Pass/Partial | Auth and basic create import pass; update-existing not implemented. |
| Your Roots web fallback | Pass/Issue | List fallback renders coordinate groups; people without coordinates are not surfaced clearly. |
| Native map | Not tested | Requires Expo Go/development build/TestFlight. |
| Settings account/profile | Partial | Screen renders; profile/email/password not all mutated. |
| Settings push preferences | Partial | UI renders; native push registration not testable in web. |
| Export data | Issue | `/api/export` returns HTTP 500 due missing `person_notes` table. |
| Import/update | Partial | API validation checked; native document picker not testable. |
| Restore/replace | Blocked | Destructive restore was not executed because export is broken and file picker is native-only. |
| Account deletion | Issue | Confirmed disposable session, route returned HTTP 500; account could still log in. |
| Offline/private cache | Not tested | Offline read cache not implemented; secure storage behavior requires native. |
| Accessibility/polish | Partial | Code has many labels; real VoiceOver/Dynamic Type/safe-area checks require iPhone. |
| API auth errors | Pass | Export/import contacts unauthenticated requests return JSON 401. |
| API bad input | Pass | Bad JSON and bad push-token payloads return JSON errors. |

## 5. Native Testing Matrix

Browser-tested:

- Login, signup validation, forgot-password validation.
- Dashboard, People, person detail, add person, log interaction, contacts import web fallback, Your Roots web fallback, Settings rendering.
- Trusted API smoke checks with disposable bearer token.

Expo Go-tested:

- None in this environment.

Physical iPhone or TestFlight required:

- Real Contacts permission prompts, limited/denied/granted states, contact picker, imported contact data boundaries.
- Push permission prompt, Expo/APNs token registration, revocation, notification delivery, notification deep links.
- Native `react-native-maps` markers/callouts/sheet gestures.
- Native document picker for import/restore and native share sheet for export/invite.
- Secure storage and local private cache cleanup.
- Keyboard avoidance, safe areas, Dynamic Type, VoiceOver, reduced motion, small/large iPhone layouts.
- TestFlight install/update and generated privacy manifest verification.

Not testable here:

- App Store Connect, Apple provisioning, TestFlight upload/install.
- Scheduled push sender because it is not implemented/deployed.
- Offline encrypted read cache because it is not implemented.

## 6. Findings By Severity

### P0 Blocker

#### P0-1: Linked Supabase project is missing `person_notes`, breaking notes and export

- Area/screen: Notes, Dashboard recent notes, Settings export, `/api/export`.
- Steps:
  1. Use disposable account `roots.qa.1781136609394@example.com`.
  2. Attempt to insert a `person_notes` row through Supabase client or add note from mobile UI.
  3. Call `GET http://127.0.0.1:3000/api/export` with the disposable bearer token.
- Expected:
  - Add Note saves to `person_notes`.
  - Recent notes appear.
  - Export returns JSON snapshot with `person_notes`.
- Actual:
  - Direct seed insert failed: `Could not find the table 'public.person_notes' in the schema cache`.
  - Add Note UI showed generic `Failed to log interaction`.
  - `/api/export` returned HTTP 500 with `Could not find the table 'public.person_notes' in the schema cache`.
- Evidence:
  - Supabase migration list lacks `20260609193834_separate_person_notes`.
  - Supabase public tables list has no `public.person_notes`.
  - `/api/export` response: `{ ok: false, error: { code: "internal_error", message: "Could not find the table 'public.person_notes' in the schema cache" } }`.
- Suggested fix direction:
  - Release `20260609193834_separate_person_notes` through the required database preflight.
  - After release, retest note creation, recent notes, export, import/update, restore/replace, and person detail notes.

### P1 Serious

#### P1-1: Account deletion fails in local QA because service-role configuration is missing

- Area/screen: Settings, `/api/account/delete`.
- Steps:
  1. Confirm disposable session: `roots.qa.1781136609394@example.com`, user id `98a9ce61-1c99-498c-bac5-26acc4922d83`.
  2. Call `/api/account/delete` with body `{ "confirm": "WRONG" }`.
  3. Call `/api/account/delete` with body `{ "confirm": "DELETE" }`.
  4. Attempt to sign in again.
- Expected:
  - Wrong confirmation returns JSON 400.
  - Correct confirmation deletes the auth user and private data.
  - Follow-up sign-in fails.
- Actual:
  - Wrong confirmation returned JSON 400 as expected.
  - Correct confirmation returned HTTP 500 with no JSON body.
  - Account could still sign in.
  - Next dev log: `Error: Missing SUPABASE_SERVICE_ROLE_KEY.`
- Evidence:
  - Account deletion response: `status: 500`, `reloginError: null`.
- Suggested fix direction:
  - Ensure local and deployed backend environments have `SUPABASE_SERVICE_ROLE_KEY`.
  - Wrap route-level missing-config errors in JSON-shaped responses.
  - Retest deletion and cascade cleanup with a disposable account.

#### P1-2: Home and People follow-up states disagree with person-detail follow-up state

- Area/screen: Dashboard, People, Person detail, shared follow-up logic.
- Steps:
  1. Seed people with open, snoozed, and done follow-up interactions.
  2. Open Home and People filters.
  3. Open person detail follow-up tab for snoozed and completed people.
- Expected:
  - Open due/overdue follow-ups appear in due sections.
  - Snoozed follow-ups are hidden or shown as snoozed until their snooze date.
  - Completed follow-ups do not appear as overdue.
  - Home, People, and person detail agree.
- Actual:
  - Dashboard showed 4 overdue, including snoozed and completed follow-up people.
  - People `status=overdue` included `QA Snoozed Followup` and `QA Completed Followup`.
  - Person detail for completed follow-up correctly showed `Open follow-ups 0`, but header still showed `Next action 11d overdue`.
  - Snoozed follow-up detail showed as an ordinary open follow-up with due date `Jun 8, 2026`, no snoozed-until context.
- Evidence:
  - Dashboard body: `QA Snoozed Followup` and `QA Completed Followup` under "People to follow up with".
  - Completed detail body: `Open follow-ups 0` and `Next action 11d overdue`.
- Suggested fix direction:
  - Centralize dashboard/people status derivation around `getFollowUpQueue` or another shared rule that considers `interactions.follow_up_status` and `follow_up_snoozed_until`.
  - Keep cadence reminders and explicit follow-ups as separate concepts if both are intended.

#### P1-3: Empty new accounts do not reliably enter onboarding

- Area/screen: Login, launch routing, onboarding.
- Steps:
  1. Create disposable empty account `roots.onboarding.1781137503095@example.com`.
  2. Sign in through mobile login.
- Expected:
  - First-run account routes to onboarding per `docs/MOBILE_SCREEN_MAP.md`.
- Actual:
  - User landed on `/dashboard`.
  - Dashboard showed `No people yet`; onboarding was not shown.
- Evidence:
  - Browser URL after login: `http://127.0.0.1:8081/dashboard`.
  - Body: `No people yet Add someone you want to stay in touch with...`
- Suggested fix direction:
  - Route post-login users with zero people to onboarding, or explicitly retire onboarding from docs and product flow.
  - Add a durable onboarding-complete flag if "has people" is not enough.

#### P1-4: Onboarding implementation does not match the documented screen map

- Area/screen: Onboarding.
- Steps:
  1. Compare `docs/MOBILE_SCREEN_MAP.md` onboarding requirements to `mobile/app/(app)/onboarding.tsx`.
- Expected:
  - Welcome, first contacts, reminder setup, notification permission context, onboarding complete.
  - Add first person, import from Contacts, skip for now.
- Actual:
  - Current onboarding is a 3-step welcome/add one person/log one interaction flow.
  - No Contacts import entry point.
  - No notification permission context.
  - No reminder preference step.
  - Skip is only exposed on the final interaction step.
- Evidence:
  - Static code inspection of `mobile/app/(app)/onboarding.tsx`.
- Suggested fix direction:
  - Bring implementation and docs into alignment before TestFlight. Either update onboarding to match the screen map or revise the screen map if strategy changed.

#### P1-5: Update password no-session route can render blank and lacks invalid-link handling

- Area/screen: Update password.
- Steps:
  1. Open `http://127.0.0.1:8081/update-password` without recovery session.
- Expected:
  - Clear invalid/expired link message and return-to-login action.
- Actual:
  - Browser check timed out reading body; route appeared blank.
  - Static code has no explicit invalid-link/session check before `supabase.auth.updateUser`.
- Evidence:
  - Auth validation capture: `BODY_ERROR locator.innerText: Timeout 10000ms exceeded`.
- Suggested fix direction:
  - Add explicit recovery-session/invalid-link state.
  - Confirm `roots://update-password` exchange works on real device.

#### P1-6: Settings export/import/restore are not releasable until schema and native file flows are verified

- Area/screen: Settings Data, `/api/export`, `/api/import/restore`.
- Steps:
  1. Open Settings Data section.
  2. Call export API with disposable bearer token.
  3. Inspect import/restore implementation.
- Expected:
  - Export returns a backup.
  - Import/update validates and applies backup.
  - Restore/replace can be safely tested on disposable data.
- Actual:
  - Export fails due missing `person_notes`.
  - Import/restore file selection requires native document picker and was not browser-testable.
  - Destructive restore was not executed because export is broken.
- Evidence:
  - `/api/export` HTTP 500.
- Suggested fix direction:
  - Fix migration state first.
  - Then test export, import/update, and restore/replace end-to-end on a disposable account in Expo Go/TestFlight.

### P2 Normal

#### P2-1: People cards label overdue contacts as "Due today"

- Area/screen: People list and filters.
- Steps:
  1. Seed person last contacted 40 days ago with 30-day cadence.
  2. Open People list.
- Expected:
  - Overdue contacts show overdue wording.
- Actual:
  - `QA Overdue`, `QA Snoozed Followup`, and `QA Completed Followup` showed `Due today`.
- Evidence:
  - People body: `QA Overdue ... Last interaction May 1 ... Due today`.
- Suggested fix direction:
  - Update `statusLabel` to distinguish `days < 0` from `days === 0`.

#### P2-2: Snoozed follow-ups do not show snoozed state or snoozed-until date

- Area/screen: Person detail Follow-ups tab.
- Steps:
  1. Open a person with `follow_up_status = "snoozed"` and future `follow_up_snoozed_until`.
  2. Open Follow-ups tab.
- Expected:
  - Clearly show snoozed state and date.
- Actual:
  - It appears as a normal open follow-up with original due date and `Snooze 7d`/`Done`.
- Evidence:
  - Detail body: `Email Jun 8, 2026 Snoozed touch point Snooze 7d Done`.
- Suggested fix direction:
  - Render follow-up state from `getFollowUpState`; display snoozed-until date and consider hiding snoozed items from urgent lists.

#### P2-3: Cross-entry interaction creation differs materially

- Area/screen: Quick add, Person detail Log Interaction.
- Steps:
  1. Inspect quick-add log interaction sheet.
  2. Inspect person detail log interaction screen.
- Expected:
  - Same essential interaction fields and behavior unless intentionally scoped.
- Actual:
  - Quick add offers only `Text / Email`, `Call`, `In Person`.
  - Person detail offers many types: Text, Call, Coffee, Lunch, Dinner, Email, Video Call, In Person, LinkedIn, Letter, Other.
  - Quick add has no follow-up toggle/date.
  - Person detail supports follow-up creation.
- Evidence:
  - Static code in `QuickAddFormSheet` and `people/[id]/log.tsx`.
- Suggested fix direction:
  - Decide whether quick add is intentionally lightweight. If so, label it accordingly. If not, share options/validation with the full log screen.

#### P2-4: Cross-entry note creation differs and currently fails

- Area/screen: Quick add Add note, Person detail Add Note.
- Steps:
  1. Compare quick add note and person-detail note mode.
  2. Attempt note save on disposable account.
- Expected:
  - Notes save to `person_notes` with consistent date behavior and clear errors.
- Actual:
  - Quick add always uses today; person detail note can choose date.
  - Save fails while schema is missing.
  - UI error says `Failed to log interaction`, which is misleading for note mode.
- Evidence:
  - Add note browser body after save: `Failed to log interaction`.
- Suggested fix direction:
  - Fix schema, then harmonize note date options and note-specific error copy.

#### P2-5: Add Person, onboarding, and contact import use different required fields/defaults

- Area/screen: Add Person, Onboarding, Contacts import API.
- Steps:
  1. Compare add person, onboarding, and import code.
- Expected:
  - Required fields and defaults are consistent or intentionally documented.
- Actual:
  - Add Person requires first name, last name, and relationship type.
  - Onboarding only requires first name.
  - Contacts import requires only name and defaults contact frequency to 30.
  - Add Person defaults frequency to 90 days.
  - Onboarding defaults frequency to 30 days.
- Evidence:
  - Static inspection and Add Person validation browser run.
- Suggested fix direction:
  - Define one product rule for required name/category/frequency defaults across all entry points.

#### P2-6: Add Person validation leaves stale error text

- Area/screen: Add Person.
- Steps:
  1. Open Add Person.
  2. Tap Save with empty fields.
  3. Fill first and last name.
  4. Tap Save without relationship type.
- Expected:
  - First-name error clears or is replaced by category error.
- Actual:
  - `First name is required` remained visible while `Please select a relationship type` also appeared.
- Evidence:
  - Browser capture `missingCategory` contained both errors.
- Suggested fix direction:
  - Clear general error before each validation branch.

#### P2-7: Direct URL entry exposes weak back-navigation behavior

- Area/screen: Add Person, Log Interaction, other secondary screens.
- Steps:
  1. Open `/people/new` or `/people/:id/log` directly.
  2. Save or cancel.
- Expected:
  - App returns to a sensible fallback route when no navigation history exists.
- Actual:
  - Dev warning: `The action 'GO_BACK' was not handled by any navigator`.
  - User remains on the same direct route after save.
- Evidence:
  - Browser logs during Add Person and Log Interaction direct-route tests.
- Suggested fix direction:
  - Use a safe back helper that falls back to `/people` or person detail when history is absent.

#### P2-8: Your Roots does not clearly surface people without coordinates

- Area/screen: Your Roots.
- Steps:
  1. Seed people with a location string but no latitude/longitude.
  2. Open Your Roots.
- Expected:
  - People without coordinates are listed in a separate "needs location" or "without coordinates" area.
- Actual:
  - Header says `8 people across 6 locations`, but map/list only groups coordinate-backed locations.
  - The person with `No Coordinates City` was not visible in the map fallback list.
- Evidence:
  - Your Roots body listed Austin, Chicago, Indianapolis, Denver, New York, Seattle only.
- Suggested fix direction:
  - Add an explicit "people without mapped coordinates" list and a route to edit/add geocoded location.

#### P2-9: Location search likely does nothing without `EXPO_PUBLIC_MAPBOX_TOKEN`

- Area/screen: Add/Edit location autocomplete, Your Roots location search.
- Steps:
  1. Inspect `mobile/.env` and `mobile/lib/mapbox.ts`.
- Expected:
  - If location search is unavailable, UI explains why or hides search suggestions.
- Actual:
  - `mobile/.env` does not expose `EXPO_PUBLIC_MAPBOX_TOKEN`.
  - `geocodePlace` silently returns `[]` when token is absent.
- Evidence:
  - Env redaction showed only Supabase URL/anon key and API base URL.
- Suggested fix direction:
  - Add configuration or a clear disabled state for map search/geocoding.

#### P2-10: Contacts import update-existing and import-all are not implemented

- Area/screen: Contacts import.
- Steps:
  1. Inspect mobile contacts import and `/api/import/contacts`.
- Expected:
  - Docs say create, update existing, skip; import-all behind review.
- Actual:
  - Current API creates only.
  - Duplicate contacts can be selected but become new people.
  - No update-existing path.
  - No import-all command found.
- Evidence:
  - Static code inspection and API route behavior.
- Suggested fix direction:
  - Add update-existing mode and explicit import-all review flow, or revise v1 scope.

#### P2-11: Settings tag management is a placeholder

- Area/screen: Settings Tags.
- Steps:
  1. Open Settings.
- Expected:
  - Mobile v1 docs include tag display/assignment and settings tag management.
- Actual:
  - Settings says dedicated tag management is not available in app yet.
- Evidence:
  - Settings body: `Not available in the app yet - add or remove tags from a person's edit screen`.
- Suggested fix direction:
  - Either implement mobile tag management or move it out of v1 readiness.

#### P2-12: Search in People is narrower than users may expect

- Area/screen: People.
- Steps:
  1. Inspect `matchesSearch`.
- Expected:
  - Search people often searches name, company, email, phone, tags, and location.
- Actual:
  - Search only matches `person.name`.
- Evidence:
  - `matchesSearch` checks only normalized name.
- Suggested fix direction:
  - Expand search fields or change placeholder/copy to "Search by name".

### P3 Polish

#### P3-1: Expo web preview has repeated console warnings/errors

- Area/screen: Global.
- Steps:
  1. Load Expo web preview.
- Expected:
  - No page errors; only expected native-web limitation warnings.
- Actual:
  - Repeated page error: `Cannot manually set color scheme, as dark mode is type 'media'.`
  - RN web warnings for deprecated `pointerEvents`, `shadow*`, and image `tintColor`.
  - Some 404 resource logs.
- Evidence:
  - Browser console logs from every page load.
- Suggested fix direction:
  - Configure NativeWind dark mode behavior for web or avoid manual color scheme setting.
  - Clean deprecated RN web props over time.

#### P3-2: Root lint has existing warnings

- Area/screen: Web/root lint.
- Steps:
  1. Run `npm.cmd run lint`.
- Expected:
  - No lint warnings before release.
- Actual:
  - 7 warnings: unused `onStreakUpdate` and several `<img>` warnings.
- Evidence:
  - Lint output listed exact files.
- Suggested fix direction:
  - Clean before release, but not a mobile blocker by itself.

#### P3-3: Some mobile copy exposes implementation gaps well, but may reduce confidence

- Area/screen: Settings notifications/tags.
- Steps:
  1. Open Settings.
- Expected:
  - Honest but confidence-building copy.
- Actual:
  - Push row says delivery is still in development.
  - Tags row says management is not available.
- Evidence:
  - Settings body.
- Suggested fix direction:
  - Keep honesty, but resolve before TestFlight if these are v1 commitments.

## 7. Cross-Entry Consistency Findings

- Quick add log interaction vs person detail log interaction:
  - Quick add has fewer interaction types.
  - Quick add cannot create a follow-up.
  - Person detail supports follow-up toggle/date.
- Quick add add note vs person detail add note:
  - Quick add note always uses today's date.
  - Person detail note can choose a date.
  - Both write `person_notes`, which currently fails against linked Supabase.
- Add person vs onboarding vs contacts import:
  - Add Person requires first and last name plus relationship type.
  - Onboarding requires only first name.
  - Contacts import requires only name.
  - Default cadence differs: Add Person 90 days, onboarding/API contacts 30 days.
- Follow-up status:
  - Person detail knows completed follow-ups are done.
  - Dashboard/People still mark the person overdue from cadence.
  - Snoozed follow-ups are not visibly snoozed.
- Settings data flows vs backend:
  - Settings offers export/import/restore, but export fails until `person_notes` migration is released.

## 8. Business Logic And Date-Math Findings

- Controlled date basis: browser/Supabase seed used local date `2026-06-10`.
- Due today:
  - Person last contacted 30 days ago with 30-day cadence appeared as overdue count on Dashboard because dashboard treats `days <= 0` as overdue.
  - People label displays `Due today` for `days <= 0`, including truly overdue contacts.
- Due in 3 days:
  - Seeded person appeared in due-this-week bucket, but displayed `Due in 2 days` after date/time elapsed during UTC/local boundary. This is worth retesting around timezone boundaries.
- Overdue:
  - Cadence overdue people appeared as overdue as expected, but label text was wrong.
- Snoozed:
  - `follow_up_status = "snoozed"` and future `follow_up_snoozed_until` were not reflected in Home/People and not clearly shown in person detail.
- Completed:
  - Completed follow-up hidden on person detail follow-up tab, but person still displayed overdue elsewhere from cadence.
- Birthday/important moment soon:
  - Birthday in 2 days, custom moment in 5 days, birthday in 10 days, and recurring moment at 14 days appeared in upcoming moments as expected.
- Item about 2 weeks out:
  - Recurring custom moment at 14 days appeared in upcoming moments and People `moments=upcoming`.
- Note-only behavior:
  - Code correctly separates notes from interactions, but cannot be verified end-to-end until `person_notes` exists remotely.

## 9. UX Improvement List

- Make the first-run path obvious: after signup/login with no people, show onboarding or a dashboard with primary Add/Import actions.
- Split cadence reminders from explicit follow-ups in UI copy, or merge them into one clear "next action" model.
- Show snoozed state and snoozed-until date.
- Use "Overdue by X days" instead of "Due today" for overdue people.
- Give Add Note a note-specific error message.
- Make People search broader or rename it to "Search by name".
- Add a visible list of people without mapped coordinates on Your Roots.
- Add empty/error states for missing Mapbox token or unavailable geocoding.
- Add a fallback route after save/cancel when a secondary screen was opened directly.
- Resolve placeholder Settings rows before TestFlight or move them out of v1.
- Make destructive data flows state exactly which account/data will be affected.

## 10. Things That Worked Well

- Expo SDK dependency health is good: `expo-doctor` passed all checks.
- Mobile typecheck and lint passed.
- Root unit tests and production build passed.
- Login/signup/forgot-password client validation is clear.
- API unauthenticated errors are JSON-shaped for export and contacts import.
- Contacts import web fallback is privacy-safe: it did not upload anything when permission was denied.
- Important moments display worked with controlled data.
- Your Roots web fallback clearly states the phone app uses the native map.
- Settings honestly explains that push delivery is not live yet.
- Account deletion route correctly rejects missing/incorrect confirmation before attempting deletion.

## 11. Untested Items And Reasons

- Expo Go on physical phone: not available in this environment.
- TestFlight/development build: Apple/EAS setup not available.
- Native Contacts prompt and contact picker: browser preview only returns denied.
- Push token registration: `registerPushToken` throws on web by design; native build required.
- Scheduled push delivery: sender/cron not implemented.
- Notification deep links: no sender/native notification available.
- Native map markers/callouts: browser uses list fallback.
- Document picker import/restore: native document picker not testable in browser.
- Native share sheet export/invite: browser cannot fully represent iOS share sheet.
- Offline encrypted read cache: not implemented.
- VoiceOver/Dynamic Type/safe-area/reduced-motion: require physical iPhone or simulator.
- Destructive restore: not executed because export is broken and file picker is native-only.
- Full edit/delete person flows: code inspected; broad destructive UI changes were limited after account deletion failed.

## 12. Recommended Fix Order

1. Release `20260609193834_separate_person_notes` to the linked Supabase project using the required migration preflight.
2. Re-test notes, recent notes, export, import/update, and restore/replace with disposable data.
3. Fix local/deployed service-role configuration and retest account deletion end-to-end.
4. Unify follow-up/cadence business rules across Dashboard, People, and Person Detail.
5. Fix onboarding routing and align onboarding with `docs/MOBILE_SCREEN_MAP.md`.
6. Resolve update-password invalid/no-session handling and verify `roots://update-password` on device.
7. Harmonize cross-entry forms: quick add, full log interaction, add note, add person, onboarding, and contacts import.
8. Add native-device QA for Contacts, push, map, file/share, safe areas, accessibility, and TestFlight install.
9. Address P2 UX gaps: map no-coordinate list, search scope, tag management, stale validation, direct-route back fallback.
10. Clean console/lint warnings before release.

## 13. App Store/TestFlight Readiness Gaps

- No TestFlight build installed on a real iPhone.
- Apple Developer/App Store Connect setup remains open per docs.
- Account deletion fails in local QA.
- Export is broken against linked Supabase.
- Restore/replace not device-tested.
- Contacts permission and selected-contact import not device-tested.
- Push permission/token/delivery/deep links not device-tested; sender not implemented.
- Offline encrypted read cache not implemented.
- Privacy manifest not verified in generated build.
- Accessibility/device QA not completed.
- Demo account/review notes/screenshots remain open.
- Settings still exposes not-live/not-available features.

## 14. Security And Data-Safety Concerns

- Good:
  - API auth failures are JSON-shaped for tested routes.
  - Trusted mobile API contract uses bearer tokens.
  - Contacts import API writes under authenticated user id.
  - Account deletion requires explicit `{ confirm: "DELETE" }`.
  - RLS is enabled on listed public tables in Supabase.
- Concerns:
  - Account deletion depends on service-role config and currently fails locally.
  - `/api/export` fails from schema drift; users cannot reliably obtain data backup before destructive actions.
  - Multi-step person saves are not atomic; docs already track this.
  - `person_notes` missing remotely means the app masks read failures by returning empty notes, which can hide schema drift and user data absence.
  - Supabase security advisor reports leaked password protection disabled.
  - Direct client writes are used for many user-owned tables. RLS helps, but high-risk multi-step writes should move to RPC/trusted route where already planned.

## 15. Reproducibility Notes

- Disposable seeded account remains because account deletion failed:
  - `roots.qa.1781136609394@example.com`
  - User id `98a9ce61-1c99-498c-bac5-26acc4922d83`
- Secondary empty disposable account remains:
  - `roots.onboarding.1781137503095@example.com`
- Do not use these as production/demo accounts. They exist only as QA artifacts until account deletion is fixed or they are cleaned through an admin path.
