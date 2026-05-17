# Project Master Plan

This file is the coordination source of truth for the Personal CRM project.
It exists to keep feature work efficient, reduce regressions, and make the
public website, authenticated app, docs, tests, and refactors move in the same
direction.

## Why This Plan Exists

The project is no longer just a prototype. It has Supabase auth, protected CRM
routes, people CRUD, tags, interactions, follow-ups, birthday reminders,
settings, export, import, restore, migrations, and deterministic tests.

That means the main risk has changed:

- Early risk was "can we build the core loop?"
- Current risk is "can we keep the core loop working while adding more?"

The answer should be a short stabilization phase, not a rewrite. The goal is to
make future changes smaller, safer, and easier for two teammates to coordinate.

## Current Decisions

1. Keep this as one Next.js project for now.
2. Separate the public website and authenticated CRM app with route groups.
3. Start the native iOS app as the next product surface because mobile-native
   requirements are now real: Contacts import, push notifications, offline
   read access, and App Store distribution.
4. Keep the current responsive web app live as the desktop/admin fallback while
   mobile becomes the primary daily-use app.
5. Refactor only where it directly reduces regression risk or unlocks cleaner
   feature work.
6. Keep Supabase Row-Level Security as the database safety layer, but keep auth
   and ownership checks close to reads, writes, Server Actions, and Route
   Handlers.
7. Require verification before merging meaningful work.

## Success Criteria

This plan is working if:

- A teammate can tell where the product is going by reading one file.
- A teammate can run the app from scratch using `README.md`.
- New work starts from `TODO.md`, not scattered notes.
- Public website work does not disturb authenticated CRM routes.
- Authenticated app refactors preserve existing URLs and behavior.
- Large page files shrink over time without changing user-facing behavior.
- `npm test`, `npm run lint`, and `npm run build` stay green before feature
  work stacks on top.
- Manual QA catches broken auth, people, tags, interactions, follow-ups, and
  import/export flows before they reach main.

## Documentation System

The docs should have clear ownership. Avoid duplicating the same status in
multiple files.

| File | Purpose | Rule |
| --- | --- | --- |
| `PROJECT_MASTER_PLAN.md` | Product direction, architecture decisions, milestones, stabilization plan | Source of truth |
| `README.md` | Setup, environment, scripts, deployment, high-level feature list | Keep practical and current |
| `TODO.md` | Active execution queue | Only actionable tasks, grouped by milestone |
| `AGENTS.md` | Coding agent and teammate implementation rules | Include Next.js 16 warning, verification gates, project conventions |
| `CLAUDE.md` | Pointer for Claude-specific context | Keep as a short redirect to `AGENTS.md` and this plan |
| `DATA_MODEL.MD` | Schema reference and migration notes | Do not use as roadmap |
| `REVIEW_FINDINGS.md` | Historical review record | Archive once findings are resolved |

## Target App Structure

Use Next.js route groups to separate product surfaces without changing URLs.
Route groups are omitted from the URL, so this is mostly an organizational
change.

Recommended structure:

```text
app/
  layout.tsx
  globals.css
  api/
    export/route.ts
    import/contacts/route.ts
  (site)/
    page.tsx
  (auth)/
    auth/
      login/page.tsx
      signup/page.tsx
      forgot-password/page.tsx
      update-password/page.tsx
      callback/route.ts
  (app)/
    layout.tsx
    dashboard/page.tsx
    onboarding/page.tsx
    people/
      page.tsx
      new/page.tsx
      [id]/
        page.tsx
        edit/page.tsx
        interactions/new/page.tsx
    settings/page.tsx
```

Important constraints:

- Keep the top-level `app/layout.tsx` for shared HTML, metadata, manifest, and
  global styles.
- Use `app/(app)/layout.tsx` for the CRM shell only. Do not depend on this
  layout as the only auth protection.
- Keep API route handlers under `app/api`.
- Preserve existing URLs:
  - `/`
  - `/auth/login`
  - `/auth/signup`
  - `/dashboard`
  - `/people`
  - `/settings`
- Avoid multiple root layouts at first. They can trigger full page reloads when
  navigating between groups. A single root layout plus nested group layouts is
  enough for this project right now.

## Website And App Strategy

### Website

The website should be the public product surface. It should explain the value,
show the product clearly, and route users to signup/login.

Near-term website scope:

- Home page at `/`
- Clear signup and login paths
- Product-focused copy based on the current CRM features
- Optional future pages: privacy, terms, changelog, help

Do not let website work introduce CRM behavior changes.

### App

The app is the authenticated CRM. The near-term app goal is not more features;
it is making the existing loop reliable.

Current app surfaces:

- Dashboard
- People list
- Person detail
- Person create/edit
- Interaction logging
- Settings
- Import/export/restore

### Native App

The project is now moving forward with a native iOS app for Roots. The mobile
plan lives in `docs/`:

- `docs/MOBILE_MASTER_PLAN.md` controls mobile product strategy.
- `docs/MOBILE_TODO.md` controls mobile execution.
- `docs/MOBILE_TECHNICAL_SPEC.md` records mobile engineering decisions.
- `docs/MOBILE_SCREEN_MAP.md` records mobile screens and QA surfaces.
- `docs/APP_STORE_READINESS.md` tracks App Store submission requirements.

Keep the existing web app operational during mobile development. Do not move
the web app into `apps/web` or perform a broad repo restructuring until the
mobile foundation is stable and the move has a clear review/verification plan.

The native app should reuse the existing Supabase backend, RLS policies,
migrations, and portable CRM business rules. It should not reuse web UI
components directly.

## Refactor Strategy

Refactor now, but narrowly. The goal is to reduce risk, not to redesign the app.

### Refactor When

Refactor a file or flow when one of these is true:

- The file is large enough that unrelated changes are easy to break.
- The same business rule exists in multiple places.
- A mutation has multi-step failure risk.
- A component mixes data loading, mutation logic, rendering, and complex UI
  state.
- A change would be faster after a small extraction.

### Avoid Refactoring When

Do not refactor just because code could be prettier. Avoid:

- Full app rewrites
- Converting every route to Server Components in one pass
- Moving every mutation to Server Actions in one pass
- Rebuilding the design system
- Adding state management libraries before a concrete need exists
- Splitting into multiple apps or repos before product requirements demand it

### Refactor Targets

Start with the highest-risk files:

1. `app/people/[id]/page.tsx`
   - Extract person header, contact details, duplicate warning, interactions
     list, follow-up actions, delete confirmation, and data helpers.
2. `app/people/new/page.tsx` and `app/people/[id]/edit/page.tsx`
   - Extract shared person form UI, tag picker behavior, field mapping, and
     validation constants.
3. `app/settings/page.tsx`
   - Extract settings form, tag management, import/export/restore panels, and
     import validation helpers.
4. `app/dashboard/page.tsx`
   - Extract dashboard section components and keep categorization rules in
     tested pure functions.
5. `app/people/page.tsx`
   - Extract people search/filter helpers and card/list components.

### Suggested Code Organization

Use a mix of shared folders and route-local private folders:

```text
components/
  ui/
  app/
  crm/
lib/
  crm/
    rules.ts
    people.ts
    interactions.ts
    import-export.ts
  supabase/
    browser.ts
    server.ts
  forms/
tests/
  crm-rules.test.mjs
  date-utils.test.mjs
```

Route-specific UI can live near the route:

```text
app/(app)/people/_components/
app/(app)/settings/_components/
app/(app)/dashboard/_components/
```

Use shared `components/crm` only when a component is reused across multiple
routes.

## Stability Plan

### Baseline Before Changes

Before structural refactors, capture the current state:

```bash
npm test
npm run lint
npm run build
```

Then run manual QA against a real Supabase project:

- Signup
- Login
- Logout
- Dashboard load
- Create person
- Edit person
- Delete person
- Search people
- Create tag
- Rename tag
- Merge tag
- Delete tag
- Log interaction
- Edit interaction
- Delete interaction
- Mark follow-up done
- Snooze follow-up
- Export JSON
- Import/update JSON
- Restore/replace JSON

### Verification Rules

For every meaningful PR or work session:

- Run `npm test`.
- Run `npm run lint`.
- Run `npm run build`.
- Manually QA any touched user flow.
- Update docs only when behavior, setup, or architecture changed.

For database work:

- Add or update a Supabase migration.
- Update `DATA_MODEL.MD`.
- Confirm RLS ownership rules still protect user data.
- Test against a fresh database when practical.

For route organization:

- Confirm existing URLs still work.
- Confirm logged-out users are redirected from app routes.
- Confirm API routes return JSON-shaped auth errors instead of page redirects.

## Milestones

### Milestone 1: Documentation Alignment

Goal: Make the team faster by removing ambiguity.

Tasks:

- Keep `PROJECT_MASTER_PLAN.md` as the source of truth.
- Update `README.md` to focus on setup, scripts, env vars, and current
  features.
- Update `TODO.md` to contain only active work and future backlog.
- Update `AGENTS.md` with implementation rules:
  - Read relevant local Next.js docs before Next code changes.
  - Preserve URLs during route-group moves.
  - Do not rely on proxy as the only auth layer.
  - Run test, lint, and build before finishing meaningful changes.
  - Keep refactors behavior-preserving unless a task says otherwise.
- Keep `CLAUDE.md` as a short pointer to `AGENTS.md` and
  `PROJECT_MASTER_PLAN.md`.
- Move resolved historical notes from `REVIEW_FINDINGS.md` into an archive or
  leave it untouched as a historical record.

Acceptance criteria:

- A new teammate can understand the current product, next work, and local setup
  in under 15 minutes.
- There is no disagreement about which file controls roadmap decisions.

### Milestone 2: Safety Baseline

Goal: Know what is currently working before reorganizing files.

Tasks:

- Run `npm test`, `npm run lint`, and `npm run build`.
- Complete the manual QA checklist against a real Supabase project.
- Record any failures in `TODO.md` as bugs before starting new features.
- Confirm migrations work on a fresh database.
- Confirm cascade delete behavior in the target Supabase project.

Acceptance criteria:

- Current failures are known and prioritized.
- No route grouping or refactor work starts on top of unknown breakage.

### Milestone 3: Website/App Route Separation

Goal: Separate the public website from the authenticated app without changing
behavior.

Tasks:

- Move the home page into `app/(site)/page.tsx`.
- Move auth pages into `app/(auth)/auth/...`.
- Move dashboard, people, onboarding, and settings into `app/(app)/...`.
- Add `app/(app)/layout.tsx` for the authenticated app shell if it reduces
  repeated layout code.
- Keep top-level `app/layout.tsx`.
- Keep `proxy.ts` aligned with the new app routes.

Acceptance criteria:

- Existing URLs still work.
- Build passes.
- Logged-out app routes redirect to login.
- Auth pages do not render the CRM shell.
- Public site pages do not load CRM-only UI.

### Milestone 4: Behavior-Preserving Refactor

Goal: Make the code easier to change without changing what users experience.

Tasks:

- Extract route-local components from the largest pages.
- Extract shared person form logic from create/edit pages.
- Extract dashboard categorization and display helpers into tested pure
  functions.
- Extract import/export validation helpers from settings.
- Centralize repeated auth redirect and Supabase error handling patterns where
  doing so reduces duplication.
- Add tests for extracted pure logic.

Acceptance criteria:

- No feature behavior changes are mixed into refactor PRs.
- Each refactor can be reviewed independently.
- Touched flows pass manual QA.
- Large pages are smaller and easier to scan.

### Milestone 5: Reliability Test Expansion

Goal: Catch regressions before users or teammates find them.

Tasks:

- Add tests for import/export shape validation.
- Add tests for duplicate detection edge cases.
- Add tests for follow-up state transitions.
- Add tests for dashboard categories.
- Add browser smoke coverage for:
  - auth redirects
  - people create/edit/delete
  - interaction create/edit/delete
  - export/import/restore

Acceptance criteria:

- Core CRM rules are covered by deterministic tests.
- At least one browser-level smoke path catches broken app wiring.

### Milestone 6: Public Website Improvement

Goal: Improve the public product surface without destabilizing the app.

Tasks:

- Refresh `/` as a product-focused website page.
- Add real screenshots or product visuals once the UI is stable.
- Add privacy/terms/help only when needed.
- Keep signup/login clear.

Acceptance criteria:

- Website work does not change CRM behavior.
- Public pages are mostly Server Components and do not add unnecessary client
  JavaScript.

### Milestone 7: New Feature Work

Goal: Resume feature development with lower regression risk.

Possible next features after stabilization:

- Real reminder delivery, starting with a weekly digest.
- Better duplicate detection.
- More robust contact import formats.
- Person summaries or suggested next action, only after privacy rules are
  written.
- Native mobile offline-read behavior is now tracked in `docs/`; web PWA
  polish should be treated as a separate fallback/admin-surface need only if
  users ask for it.

Acceptance criteria:

- Every new feature has a user flow, data impact, test plan, and rollback note.
- New feature work does not bypass the verification rules.

## Phase 8 - Roots UX & Rebrand

In progress. The app is being renamed Roots and rebuilt toward a
production-quality user experience. This phase covers the full design
system, landing page, auth polish, dashboard redesign, people tab
improvements, add person flow, person profile, sidebar updates, and
settings overhaul. See the Roots UX Build Plan v3 for the full
sequenced phase breakdown and rules.

## Team Workflow

Use two work lanes:

### Lane A: Product And UX

Owns:

- Website copy and structure
- CRM screen flows
- Manual QA checklist
- Product decisions in this plan

### Lane B: Stability And Architecture

Owns:

- Route grouping
- Refactors
- Tests
- Supabase migrations
- Build/lint/test health

Both teammates should avoid editing the same large page at the same time. Split
ownership by route or feature area.

Suggested weekly rhythm:

1. Pick one milestone.
2. Move only the next few tasks into `TODO.md`.
3. Keep PRs small and behavior-specific.
4. Run the verification gate before merging.
5. Update this file only when strategy or architecture decisions change.

## Feature Proposal Template

Before starting a new feature, answer:

```text
Feature:
Problem it solves:
Primary user flow:
Routes touched:
Data model impact:
Auth/RLS impact:
Failure states:
Tests needed:
Manual QA needed:
Docs to update:
Rollback plan:
```

If the answers are unclear, the feature is not ready to build.

## Refactor Proposal Template

Before starting a refactor, answer:

```text
Refactor:
Files touched:
Behavior expected to stay the same:
Risk being reduced:
Tests before:
Tests after:
Manual QA flow:
Stop condition:
```

If the refactor cannot name the risk it reduces, skip it for now.

## Immediate Next Steps

1. Align docs around this file.
2. Run the safety baseline.
3. Fix any baseline bugs before structural changes.
4. Move routes into `(site)`, `(auth)`, and `(app)` groups.
5. Refactor the largest pages in small behavior-preserving passes.
6. Expand tests around the core CRM loop.
7. Resume new feature work.

