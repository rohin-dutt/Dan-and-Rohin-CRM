# TODO

Active execution queue for the milestones in `PROJECT_MASTER_PLAN.md`.
Do not use this file for product strategy; update `PROJECT_MASTER_PLAN.md` when
the roadmap or architecture direction changes.

## Bugs / Stability

- [ ] `npm test` fails on `tests/date-utils.test.mjs` with
      `ERR_UNKNOWN_FILE_EXTENSION` for `.ts` — Node ESM loader cannot import
      TypeScript directly. Command: `npm test`. Fix: add a loader flag (e.g.
      `--import tsx` or `ts-node/esm`) to the test script, or compile
      `lib/date-utils.ts` before running the test. Pre-existing; confirmed
      present before Phase 2/3 landing + auth changes. Owner: test runner
      configuration.
- [ ] Local shell issue: `npm test` failed in PowerShell before the test script
      started because `C:\Program Files\nodejs\npm.ps1` is blocked by the system
      execution policy. Workaround used for the baseline: `npm.cmd test`, which
      passed. Owner: local Windows shell configuration.
  - README now documents the `npm.cmd` workaround for Windows PowerShell.
- [x] Apply the schema-drift reconciliation migration to the linked Supabase
      project as an intentional database release.
  - Read-only inspection found the linked project migration history only lists
    the later helper/hardening/cascade migrations, and the live base schema
    still differs from `DATA_MODEL.MD` in some nullability, defaults,
    `people.last_contacted_at`, check constraints, and tag-name uniqueness.
  - Local migration added:
    `supabase/migrations/20260514171147_reconcile_target_schema_drift.sql`.
  - Released on May 14, 2026 through Supabase MCP because local Supabase CLI
    login/linking was unavailable in this shell.
    - `git fetch origin main` succeeded; local `main` matched `origin/main` at
      `b6b01106da47d3050d1847ebac6cf7e1f0bb3cf6`.
    - `npx.cmd supabase migration list` failed with `Cannot find project ref.
Have you run supabase link?`.
    - `npx.cmd supabase link --project-ref ojebeswabngvcktqsduc` failed with
      `Access token not provided. Supply an access token by running supabase
login or setting the SUPABASE_ACCESS_TOKEN environment variable.`
    - `npx.cmd supabase db push --dry-run` failed with `Cannot find project
ref. Have you run supabase link?`.
    - Pre-apply Supabase MCP migration history check showed only
      `20260512010828_followups_and_atomic_helpers`,
      `20260513185521_enforce_person_tags_tag_ownership`, and
      `20260513215433_restore_user_owned_cascade_constraints`; the
      reconciliation migration was not applied.
    - Pre-apply Supabase MCP data preflight found no duplicate tag names per
      user after `lower(trim(name))`, no duplicates for the actual
      `lower(name)` index, and zero rows for the checked null/blank/nonpositive
      risks in `people`, `tags`, `interactions`, and `settings`.
    - Applied `reconcile_target_schema_drift` with the checked-in SQL through
      Supabase MCP `apply_migration`; no destructive reset or data deletion was
      performed.
    - MCP initially recorded the applied migration as generated version
      `20260514215454`, creating a clear migration-history mismatch with the
      local file `20260514171147_reconcile_target_schema_drift.sql`. The single
      unambiguous history row was repaired to version `20260514171147`.
    - Post-apply Supabase MCP migration history now includes
      `20260514171147_reconcile_target_schema_drift`.
    - Post-apply schema checks confirmed restored `not null`/default drift,
      `people.last_contacted_at` as `timestamptz`, the
      `tags_user_id_lower_name_key` unique index, and the intended `not valid`
      check constraints.
    - Verification passed: `npm.cmd test`, `npm.cmd run lint`, and
      `npm.cmd run build`.
    - Manual smoke checks documented for follow-up: create person, edit person,
      create tag, rename tag, merge tag, delete tag, export JSON,
      import/update JSON, and restore/replace JSON should be spot-checked in
      the authenticated app against the linked project after CLI/browser access
      is available.
- [x] Restore/import is validated before writes and now runs through a single
      trusted server/RPC boundary.
  - The import parser rejects malformed nested records and invalid
    cross-references before any write begins.
  - Web and mobile restore/import both call `/api/import/restore`, which wraps
    the `restore_crm_snapshot(payload jsonb, replace_existing boolean)` RPC.
    Keep future destructive restore work on this server/RPC path.
- [x] Milestone 4 build type regression fixed.
  - Failure: `npm.cmd run build` failed after dashboard extraction because
    `app/(app)/dashboard/_components/dashboard-sections.tsx` lost the inline
    type annotation for the birthday reminder map callback.
  - Fix: restored the explicit `{ person, nextBirthday, daysUntil }` callback
    type.
- [x] Milestone 4.1 authenticated refactor QA completed against the linked
      Supabase project with a disposable test account.
  - Signed-in QA passed for login, dashboard load, people list, create/edit/
    detail/delete person, people search, tag create/rename/merge/delete,
    interaction log/edit/delete, follow-up done/reopen/snooze, settings
    load/update, export JSON, import/update JSON, and restore/replace JSON.
  - Route QA passed for preserved authenticated URLs and logged-out redirects
    from `/dashboard`, `/people`, and `/settings`.
  - Auth page QA passed: `/auth/login` and `/auth/signup` did not render the
    CRM shell.
  - API auth QA passed: logged-out `/api/export` and `/api/import/contacts`
    returned JSON-shaped 401 errors.
  - Note: one non-blocking dev-console Supabase 409 appeared during first
    new-user Settings load; the UI recovered by loading/saving settings
    successfully, matching the existing duplicate-insert fallback behavior.

## Milestone 2 Stability / Bugs

- [x] Settings duplicate insert bug fixed in Milestone 2.1.
  - Original failure: browser QA on May 13, 2026 showed
    `duplicate key value violates unique constraint "settings_user_id_key"` and
    a Supabase 409 response from `rest/v1/settings?select=*`.
  - Fix: settings creation now handles an existing row by re-selecting it
    instead of surfacing the duplicate insert error.
  - Verification: new-user Settings load/create browser QA passed against the
    linked Supabase project.
- [x] Import/update `person_tags` RLS bug fixed in Milestone 2.1.
  - Original failure: browser QA on May 13, 2026 showed `Import failed.` and a
    Supabase 403 response:
    `new row violates row-level security policy (USING expression) for table
"person_tags"`.
  - Fix: import/update now writes tag assignments through
    `replace_person_tags`; the RPC and `person_tags` policies now verify both
    the person and every tag belong to the authenticated user.
  - Verification: import/update JSON with `person_tags` passed against the
    linked Supabase project; practical RLS SQL rejected cross-user person/tag
    assignment attempts.
- [x] Target-project cascade constraints restored in Milestone 2.1.
  - Original risk: the linked database schema had drifted from the repo
    migrations and was missing `auth.users` cascade FKs on `people`, `tags`,
    and `settings`.
  - Fix: migration restored `on delete cascade` foreign keys for user-owned
    rows.
  - Verification: transactional cascade SQL deleted an auth user and confirmed
    zero remaining people, interactions, tags, person_tags, and settings.
- [x] Fresh-database migration initialization verified locally.
  - Docker Desktop and `npx.cmd supabase` are available locally.
  - `npx.cmd supabase init --yes` created `supabase/config.toml`; seed loading
    is disabled because this repo has no seed file.
  - Full `npx.cmd supabase start` and `npx.cmd supabase db start` were blocked
    by public image registry EOF/rate-limit errors while pulling secondary
    Supabase images.
  - Verification fallback: started a throwaway local container from the pulled
    `public.ecr.aws/supabase/postgres:17.6.1.106` image and applied all eight
    local migration files in order with `psql -v ON_ERROR_STOP=1`.
  - Result: all migrations applied cleanly; public `people`, `tags`,
    `interactions`, `person_tags`, and `settings` tables existed; cascade FKs
    to `auth.users` and person/tag relations were present; expected helper RPCs
    existed.
  - The linked Supabase project was not reset, repaired, wiped, or used for
    destructive reconciliation.

## Milestone 1: Documentation Alignment

Goal: make ownership clear across project docs.

- [x] Keep `PROJECT_MASTER_PLAN.md` as the source of truth.
- [x] Update `README.md` to focus on setup, environment variables, scripts,
      current features, and verification commands.
- [x] Convert `TODO.md` into the active execution queue organized by milestone.
- [x] Update `AGENTS.md` with the Next.js 16 warning, project conventions,
      verification gates, route-group rules, auth/data safety expectations, and
      refactor rules.
- [x] Keep `CLAUDE.md` short and point Claude to `AGENTS.md` and
      `PROJECT_MASTER_PLAN.md`.
- [x] Leave `DATA_MODEL.MD` unchanged unless schema or migration notes change.
- [x] Leave `REVIEW_FINDINGS.md` as historical context.

## Milestone 2: Safety Baseline

Goal: know what is currently working before route grouping or refactoring.

- [x] Run `npm test`.
  - Result: `npm test` was blocked by the PowerShell `npm.ps1` execution
    policy before tests started; equivalent `npm.cmd test` passed. Re-run after
    Milestone 2.1 fixes passed.
- [x] Run `npm run lint`.
  - Result: `npm.cmd run lint` passed. Re-run after Milestone 2.1 fixes passed.
- [x] Run `npm run build`.
  - Result: `npm.cmd run build` passed. Re-run after Milestone 2.1 fixes passed.
- [x] Record any baseline failures in the Bugs / Stability section before
      starting refactors.
- [x] Complete manual QA against a real Supabase project:
  - [x] Signup
  - [x] Login
  - [x] Logout
  - [x] Dashboard load
  - [x] Create person
  - [x] Edit person
  - [x] Delete person
  - [x] Search people
  - [x] Create tag
  - [x] Rename tag
  - [x] Merge tag
  - [x] Delete tag
  - [x] Log interaction
  - [x] Edit interaction
  - [x] Delete interaction
  - [x] Mark follow-up done
  - [x] Snooze follow-up
  - [x] Export JSON
  - [x] Import/update JSON
    - Passed after Milestone 2.1 fix using JSON export with `person_tags`.
  - [x] Restore/replace JSON
- [x] Confirm migrations work on a fresh database.
  - Verified on a throwaway local Supabase Postgres Docker container on
    May 14, 2026.
- [x] Confirm cascade delete behavior in the target Supabase project.
  - Deleting a person cascaded interactions and person_tags.
  - Deleting an auth user cascaded people, interactions, tags, person_tags, and
    settings after the Milestone 2.1 cascade-constraint migration.
- [x] Confirm RLS prevents cross-user data access where practical.
  - Transactional SQL simulation as `authenticated` user A saw only user A rows
    and saw 0 user B people/tags.
  - Transactional SQL simulation rejected attempts for user A to attach user B's
    tag to user A's person and to attach user A's tag to user B's person.

## Milestone 3: Website/App Route Separation

Do not start until Milestone 2 command baseline is known. Status after
Milestone 2.1: safe to start route-group work, with fresh database migration
reconciliation still tracked as a database release/setup risk.

- [x] Move the home page into `app/(site)/page.tsx`.
- [x] Move auth pages into `app/(auth)/auth/...`.
- [x] Move dashboard, people, onboarding, and settings into `app/(app)/...`.
- [ ] Add `app/(app)/layout.tsx` for the authenticated app shell only if it
      reduces repeated layout code.
- [x] Keep top-level `app/layout.tsx`.
- [x] Keep API route handlers under `app/api`.
- [x] Keep `proxy.ts` aligned with preserved URLs.
- [x] Verify existing URLs still work.
- [x] Verify logged-out app routes redirect to login.
  - `/onboarding` is now treated as an authenticated app route by both
    `proxy.ts` and page-level auth.
- [x] Verify API routes return JSON-shaped auth errors instead of page
      redirects.
  - Result: `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`
    passed after the route-group move.
  - Smoke checks passed for `/`, `/auth/login`, `/auth/signup`, logged-out
    redirects from `/dashboard`, `/people`, and `/settings`, and unauthenticated
    JSON errors from `/api/export` and `/api/import/contacts`.
  - `app/(app)/layout.tsx` was not added in Milestone 3 because the current
    CRM shell is still page-local via `components/AppLayout`; moving ownership
    cleanly requires removing wrappers across CRM pages and is better handled
    as a behavior-preserving refactor slice.

## Milestone 4: Behavior-Preserving Refactor

Do not start until route separation is complete and verified.

- [x] Extract route-local components from `app/people/[id]/page.tsx`.
  - Result: `app/(app)/people/[id]/_components/person-detail-sections.tsx`
    now owns person detail presentation, delete confirmation, and interaction
    timeline UI.
- [x] Extract shared person form UI and mapping logic from create/edit pages.
  - Result: `app/(app)/people/_components/person-form.tsx` now owns shared
    fields and tag picker UI; create/edit pages keep their own Supabase writes.
- [x] Extract settings form, tag management, import/export/restore panels, and
      import validation helpers from Settings.
  - Result: settings panels moved to
    `app/(app)/settings/_components/settings-panels.tsx`; import payload
    validation moved to `app/(app)/settings/_lib/import-validation.ts`;
    import/restore sequencing remains page-local.
- [x] Extract dashboard section components and tested categorization helpers.
  - Result: dashboard display moved to
    `app/(app)/dashboard/_components/dashboard-sections.tsx`; categorization
    remains in tested `lib/crm-rules`.
- [x] Extract people search/filter helpers and card/list components.
  - Result: people header, filters, empty state, and grid moved to
    `app/(app)/people/_components/people-list-sections.tsx`.
- [ ] Centralize repeated auth redirect and Supabase error handling patterns
      only where doing so reduces duplication.
  - Deferred: no narrow helper emerged that reduced risk without broadening the
    refactor.
- [x] Add tests for extracted pure logic.
  - No new pure business logic was extracted in Milestone 4. Existing
    dashboard categorization, duplicate detection, follow-up, and date utility
    tests continued to pass after each slice.

## Milestone 5: Reliability Test Expansion

- [x] Add tests for import/export shape validation.
  - `tests/import-validation.test.mjs` covers accepted export payloads,
    missing top-level arrays, malformed nested records, invalid
    cross-references, and invalid JSON.
- [x] Add tests for duplicate detection edge cases.
  - `tests/crm-rules.test.mjs` now covers normalized email, names, accents,
    and punctuation.
- [x] Add tests for follow-up state transitions.
  - `tests/crm-rules.test.mjs` now covers expired snoozes returning to due or
    overdue states.
- [x] Add tests for dashboard categories.
  - Existing dashboard category tests stayed green after Milestone 5.
- [x] Add browser smoke coverage for auth redirects.
  - `tests/e2e/unauthenticated-smoke.spec.ts` covers logged-out redirects from
    `/dashboard`, `/people`, and `/settings` to `/auth/login`.
- [x] Add browser/API smoke coverage for public and auth route wiring.
  - `tests/e2e/unauthenticated-smoke.spec.ts` covers `/`, `/auth/login`,
    `/auth/signup`, logged-out `/api/export`, and logged-out
    `/api/import/contacts`.
- [x] Add browser smoke coverage for people create/edit/delete.
  - `tests/e2e/people-authenticated-smoke.spec.ts` covers signed-in create,
    edit, and delete against local Supabase.
- [x] Add browser smoke coverage for interaction create/edit/delete.
  - `tests/e2e/interactions-authenticated-smoke.spec.ts` covers signed-in
    interaction create, edit, and delete against local Supabase.
- [x] Add browser smoke coverage for export/import/restore.
  - `tests/e2e/import-export-restore-authenticated-smoke.spec.ts` covers
    signed-in export download, import/update, and restore/replace against local
    Supabase.
- [x] Milestone 5 verification gate passed.
  - Result: `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`, and
    `npm.cmd run test:e2e` passed after reliability tests were added.
  - Signed-in e2e now uses reduced local Supabase services started with
    `npx.cmd supabase start -x realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit`.
  - Result: `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`,
    `npm.cmd run test:e2e`, and `npm.cmd run test:e2e:signed-in` passed on
    May 14, 2026.

## Milestone 6: Public Website Improvement

- [x] Refresh `/` as a product-focused website page.
  - Result: `app/(site)/page.tsx` now has focused product copy, preserved
    signup/login calls to action, and a server-rendered product preview.
- [x] Add real screenshots or product visuals once the UI is stable.
  - Result: added a lightweight product preview without new dependencies or
    client-side JavaScript.
- [x] Add privacy, terms, changelog, or help pages only when needed.
  - Deferred: the master plan makes these optional future pages, and no current
    launch/legal requirement is documented.
- [x] Keep signup and login paths clear.
  - Verified by public smoke coverage and homepage links to `/auth/signup` and
    `/auth/login`.
- [x] Confirm website work does not change CRM behavior.
  - Result: `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`
    passed after the website update.
  - Smoke checks passed for `/`, `/auth/login`, `/auth/signup`, and logged-out
    redirect from `/dashboard` to `/auth/login`.

## Milestone 7: New Feature Work

Do not start until stabilization milestones are complete.

- [x] Recommended first feature to select next: Stronger duplicate review.
  - Reason: it builds on existing deterministic duplicate logic, has high value
    during import/edit workflows, and can likely start without paid services or
    broad infrastructure changes.
- [ ] Feature: Weekly reminder digest.
  - Problem it solves: users currently see follow-ups only after opening the
    app, so important reconnect prompts can still be missed.
  - User flow: user enables a weekly digest in Settings, receives one email
    with due follow-ups and upcoming birthdays, then opens the app to act on
    each item.
  - Routes touched: `/settings`, `/dashboard`, new API/cron route if approved.
  - Data model impact: likely add digest preferences and delivery audit rows;
    no contact schema change expected.
  - Auth/RLS impact: delivery queries must read only one user's due data per
    digest job and avoid exposing data across users in logs.
  - Tests needed: preference validation, digest item selection, opt-out state,
    and API auth/cron authorization.
  - Manual QA needed: settings toggle, digest preview, unsubscribe/disable,
    and empty-digest behavior.
  - Rollback note: disable the scheduler and hide the setting while preserving
    stored preferences.
- [ ] Feature: Stronger duplicate review.
  - Problem it solves: normalized exact name/email matching misses likely
    duplicates with nicknames, company changes, or missing emails.
  - User flow: user imports or edits contacts, reviews possible duplicate
    pairs, then chooses keep separate, merge, or update existing.
  - Routes touched: `/people`, `/people/new`, `/people/[id]/edit`,
    `/settings` import panels.
  - Data model impact: possibly none for computed suggestions; add persisted
    dismissals only if users need ignored pairs remembered.
  - Auth/RLS impact: duplicate candidates must be computed only from the
    authenticated user's people.
  - Tests needed: scoring rules, ignored-pair behavior if added, import/update
    interactions, and merge safety.
  - Manual QA needed: import duplicates, edit-created duplicates, merge review,
    and undo/rollback path if available.
  - Rollback note: return to exact normalized matching and ignore stored
    dismissals if the feature adds them.
- [ ] Feature: Additional import formats.
  - Problem it solves: users may have contacts in CSV or common address-book
    exports instead of the app's JSON format.
  - User flow: user uploads CSV/vCard, maps columns if needed, previews rows,
    then imports or updates contacts.
  - Routes touched: `/settings` import/restore area and import API helpers.
  - Data model impact: no schema change expected unless import jobs or mapping
    presets are persisted.
  - Auth/RLS impact: all imported rows must be written under the authenticated
    user's ID and preserve tag ownership checks.
  - Tests needed: parser fixtures, invalid row reporting, duplicate detection,
    tag assignment, and partial failure handling.
  - Manual QA needed: CSV import, vCard import if supported, invalid files,
    update-existing mode, and restore compatibility.
  - Rollback note: hide non-JSON upload options and keep existing JSON import
    behavior unchanged.
- [ ] Feature: Private person summaries and suggested next action.
  - Problem it solves: long interaction histories make it slower to prepare for
    the next conversation.
  - User flow: user opens a person detail page, reviews a generated or manually
    refreshed summary, and optionally saves a suggested next action.
  - Routes touched: `/people/[id]`, possibly `/settings` for privacy controls.
  - Data model impact: add summary/next-action storage only after retention and
    privacy rules are decided.
  - Auth/RLS impact: summaries must be generated and read only for the owner;
    external AI use requires explicit product/privacy approval.
  - Tests needed: ownership checks, summary state transitions, disabled-state
    behavior, and prompt/input minimization if AI is used.
  - Manual QA needed: empty history, long history, refresh, save/remove next
    action, and privacy opt-out.
  - Rollback note: hide summary UI and stop generation while preserving raw
    interactions.
- [ ] Feature: Web PWA polish if the desktop/admin fallback needs offline read.
  - Status: superseded for primary daily use by the native iOS mobile plan in
    `docs/`; keep this only as a future web-fallback/admin-surface option.
  - Problem it solves: users may want reliable access to relationship context
    while traveling or away from stable connectivity.
  - User flow: user installs the app, opens cached people/detail data offline,
    and resumes normal online behavior when connectivity returns.
  - Routes touched: manifest/service worker setup, `/dashboard`, `/people`,
    `/people/[id]`.
  - Data model impact: no database change expected; browser cache strategy
    needs a local data-retention decision.
  - Auth/RLS impact: cached private data must respect sign-out clearing and
    avoid leaking between browser users.
  - Tests needed: cache invalidation, sign-out clearing, offline page loads,
    and stale data indicators.
  - Manual QA needed: install prompt, offline people/detail loads, sign-out
    cache clearing, and reconnect behavior.
  - Rollback note: remove service worker registration and keep the manifest
    only if install metadata remains useful.

## External / Repository Work

- [ ] Release the June 9, 2026 mobile schema migrations to the linked Supabase
      project through the required database preflight.
  - Pending local migrations:
    `20260609090000_important_moments_and_note_touchpoints.sql` and
    `20260609193834_separate_person_notes.sql`.
  - These add important moments, the dedicated `person_notes` table, note
    backfill/repair, and last-contact recomputation from real touch-point
    interactions only.
  - Do not apply remotely without first running the release preflight
    (`npx.cmd supabase migration list` and
    `npx.cmd supabase db push --dry-run`) or documenting the approved fallback
    if local CLI auth/linking is unavailable.
- [ ] Configure/deploy scheduled mobile push sender for follow-ups, birthdays,
      and important moments.
  - Current implementation: mobile can register push tokens, store
    important moments, and the schema supports privacy-safe
    `notification_deliveries.kind = 'important_moment'`.
  - Remaining external/backend work: extend the trusted sender and scheduler
    (for example Vercel Cron) to select due important moments, send Expo/APNs
    notifications, and write delivery audit rows.
- [ ] Push the repository to GitHub.
  - Remote readiness inspected on May 14, 2026: `origin` is configured for
    fetch and push at `https://github.com/rohin-dutt/Dan-and-Rohin-CRM`, and
    the current branch is `main`.
  - No push was performed.
- [x] Review npm audit findings and decide whether dependency upgrades are
      acceptable.
  - Decision: accepted as temporary moderate risk; reassess when Next.js 
    publishes a safe upgrade path that does not downgrade the major version.
  - Read-only `npm.cmd audit --json` on May 14, 2026 reported two moderate
    findings: `postcss <8.5.10`, via `next`.
  - npm's reported fix path suggests `next@9.3.3` as a semver-major downgrade,
    so no automatic fix was run. Reassess after Next publishes or the project
    selects an acceptable upgrade path.
  - Rechecked after stabilization cleanup; the same two moderate findings
    remain.
- [x] Confirm a fresh clone can run the app with the documented setup steps.
  - Not fully verified in this worktree because the repository currently has
    uncommitted route-group, test, migration, and documentation changes. Verify
    from a clean clone after committing or stashing this stabilization work.
