# TODO

## Completed

- [x] Create Next.js app
- [x] Add shadcn/ui and shared app layout
- [x] Add protected navigation and mobile navigation
- [x] Add Supabase browser/server clients
- [x] Add signup, login, logout, auth callback, and route protection
- [x] Add people list, detail, create, edit, and delete flows
- [x] Add tags and person/tag assignment flows
- [x] Add interaction logging and dashboard status sections
- [x] Add settings page
- [x] Add JSON export API route
- [x] Add reproducible Supabase migrations with RLS policies
- [x] Handle failed writes before redirecting from core mutation flows
- [x] Redirect logged-out client loaders to `/auth/login`
- [x] Fix dashboard coverage with a Coming Up steady-state section
- [x] Prevent historical interaction logs from overwriting newer `last_contacted_at`
- [x] Add follow-up status, snooze, done, due, and overdue queue behavior
- [x] Surface follow-ups on dashboard and person detail pages
- [x] Add People search across name, company, role, email, notes, and tags
- [x] Add helpful empty states and clear-filter actions
- [x] Add browser unsaved-change protection for long add/edit/log forms
- [x] Add edit and delete support for interactions
- [x] Add person context to Log Interaction and Quick Log from People
- [x] Replace raw date strings with shared date formatting utilities in main views
- [x] Add birthday reminders to the dashboard
- [x] Add tag rename, delete, merge, and recolor management in Settings
- [x] Add in-flight tag creation guards
- [x] Improve export API and client failure handling
- [x] Keep `proxy.ts` aligned with Next 16 and let API routes return API-shaped auth errors
- [x] Improve settings load/create failure handling
- [x] Remove misleading email reminder controls until delivery exists
- [x] Align auth pages with the app design system
- [x] Replace browser `confirm()` delete flow with in-app confirmation UI
- [x] Make contact detail action-oriented
- [x] Show relationship status, follow-up urgency, and duplicate warnings on People cards
- [x] Add exact duplicate contact detection by normalized name/email
- [x] Add import and restore flows compatible with the existing export format
- [x] Extract shared people form constants/helpers
- [x] Extract shared date formatting utilities
- [x] Add focused deterministic tests for dashboard categorization, historical last-contact behavior, and follow-up queues

## Remaining

### External Authorization / Environment Work

- [ ] Apply migrations to the target Supabase project.
- [ ] Confirm cascade delete behavior in the target Supabase project after migrations are applied.
- [ ] Run full manual QA against a real Supabase project:
  - signup/login/logout
  - dashboard
  - people CRUD
  - search/filter empty states
  - tags
  - interactions create/edit/delete
  - follow-ups due/overdue/done/snoozed
  - birthday reminders
  - settings
  - export/import/restore
- [ ] Push the repository to GitHub.
- [ ] Review npm audit findings and decide whether dependency upgrades are acceptable.

### Future Improvements

- [ ] Add real reminder delivery if email reminders are required.
  - A weekly digest of overdue and due-soon contacts is the highest-impact first version.
- [ ] Add broader automated tests for browser-level auth-guarded loaders, mutation error handling, import/restore, and export route failures.
- [ ] Confirm a fresh clone can run the app with documented setup steps.
- [ ] Consider a fuller server-side data-access/mutation layer if the client mutation surface grows further.
- [ ] Add near-exact duplicate matching beyond normalized exact name/email.

### AI-Readiness Backlog

- [ ] Keep AI out of the core app until search, follow-ups, backups, and data safety are solid.
- [ ] Prepare structured data for future AI features.
  - Add important dates, follow-up status, interaction outcome, note type, and source/import metadata.
- [ ] Design AI privacy rules before sending notes or relationship context to any model provider.
- [ ] Later: add person summary and suggested next action.
- [ ] Later: add duplicate detection, note cleanup, and weekly relationship digest.

### Avoid For Now

- [ ] Avoid enterprise CRM pipelines, deals, teams, permissions, and sales reporting.
- [ ] Avoid heavy AI automation before the basic CRM loop is reliable.
- [ ] Avoid building complex customization before search, reminders, and follow-up workflows work.
