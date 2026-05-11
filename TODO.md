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

## Remaining

### P0 - Must Fix Before Expanding Features

- [ ] Fix dashboard coverage so steady-state contacts do not disappear from all sections.
  - Current issue: a contact last reached 8-89 days ago can be neither overdue, due this week, recently contacted, nor neglected.
  - Options: add a "Coming Up" section, show all contacts sorted by urgency, or define neglected relative to each person's `contact_frequency_days`.
- [ ] Prevent historical interaction logs from corrupting `last_contacted_at`.
  - Only update `last_contacted_at` when the logged interaction date is newer than the current value.
  - Revisit whether `last_contacted_at` should be denormalized or derived from the latest interaction.
- [ ] Make multi-step writes atomic or recoverable.
  - Person creation plus tag assignment should not partially save without clear recovery.
  - Person edit tag replacement should not delete old tags before safely writing replacements.
  - Interaction creation plus last-contact update should not leave dashboard data stale.
- [ ] Add search to the People page.
  - Search name, company, role, and eventually tags/notes.
  - Include a helpful empty state and a clear-filter action.
- [ ] Build a real follow-up queue.
  - Surface follow-ups from interactions.
  - Support due, overdue, done, and snoozed states.
  - Make follow-ups visible from the dashboard and person detail pages.
- [ ] Add unsaved-change protection for long forms.
  - Warn before navigating away from dirty add/edit/log forms.
  - Preserve draft values after failed saves.

### P1 - Important Product and Workflow Improvements

- [ ] Add real reminder delivery or remove/rename the email reminder setting until it works.
  - A weekly digest of overdue and due-soon contacts is the highest-impact first version.
- [ ] Add ability to edit and delete interactions.
  - Users need to correct wrong dates, types, notes, and follow-up flags.
- [ ] Add person context to the Log Interaction page.
  - Show the person's name in the heading and back link.
  - This is especially important when using Quick Log from the dashboard.
- [ ] Add Quick Log from the People list.
  - Users should not need to open person detail just to log a simple interaction.
- [ ] Use formatted dates everywhere.
  - Replace raw database strings in people cards, person detail, birthdays, and interaction timeline.
  - Extract a shared date formatter instead of duplicating helpers.
- [ ] Improve export reliability.
  - Check Supabase query errors in `/api/export`.
  - Do not return an empty export on database failure.
  - Show client-side export failure messages.
- [ ] Tighten proxy/API auth behavior.
  - `proxy.ts` is the correct Next 16 route-protection convention.
  - API routes should return API-shaped errors instead of redirecting to login pages when appropriate.
- [ ] Improve settings load failure handling.
  - If the settings row select and create both fail, show a recoverable error instead of rendering a form that cannot save.
- [ ] Add birthday reminders as a dashboard section.
  - Birthday is collected but currently unused.
- [ ] Add tag management.
  - Rename, delete, merge, and recolor tags from settings.

### P2 - UX Polish and Maintainability

- [ ] Align auth pages with the app design system.
  - Replace blue/gray styling with the zinc/black app palette.
- [ ] Replace browser `confirm()` delete flow with an in-app confirmation UI.
  - Consider undo or soft-delete before permanent deletion.
- [ ] Add better empty states.
  - People empty state should explain the first useful action.
  - Filtered empty state should offer "Clear filters."
  - Person detail should show prompts for missing notes, context, and preferred contact method.
- [ ] Make the contact detail page action-oriented.
  - Put next action, last interaction, follow-up status, and quick log near the top.
- [ ] Show relationship status and follow-up urgency on People list cards.
- [ ] Add duplicate contact detection.
  - Start with exact or near-exact name/email matches.
- [ ] Add import and restore flows.
  - Export exists, but users also need a way to restore or migrate data.

### Technical Quality Backlog

- [ ] Add automated tests for auth-guarded loaders and mutation error handling.
- [ ] Add tests for dashboard categorization edge cases.
- [ ] Add tests for historical interaction logging and `last_contacted_at` behavior.
- [ ] Extract duplicated people form constants and helpers.
  - Move `PRESET_TAGS`, `CUSTOM_TAG_COLORS`, `getTrimmedFormValue`, and `getOptionalFormValue` to a shared module.
- [ ] Extract shared date formatting utilities.
- [ ] Add a shared data-access layer or server-side mutation helpers for people, tags, interactions, settings, and export.
- [ ] Check Supabase read errors consistently instead of treating `data ?? []` as success.
- [ ] Add an in-flight tag creation guard to prevent rapid-click duplicate/race behavior.
- [ ] Confirm cascade delete behavior in applied Supabase migrations.
  - Current migrations define `on delete cascade`; verify the target Supabase project matches.
- [ ] Confirm a fresh clone can run the app with documented setup steps.
- [ ] Apply migrations to the target Supabase project.
- [ ] Push the repository to GitHub.

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
