# Roots — UX Build Plan v3

> **North star:** Every phase should make the app feel and function like an
> industry-leading product with millions of users. Fun, helpful, and as
> frictionless as possible.
>
> **Codebase rule:** Every phase must leave the codebase in the same or better
> shape than it found it. The verification gate from `AGENTS.md` is mandatory
> at the end of every phase — no exceptions.

---

## How This Plan Was Written

This plan is grounded in the actual repo state as of May 2026 and reviewed
by Codex before finalization. Changes from v2:

- `PROJECT_MASTER_PLAN.md` update added as explicit pre-work step
- Phase 4 (Dashboard) and Phase 5 (People) dependency resolved: clickable
  dashboard cards are fully implemented in Phase 5, not Phase 4
- Export Data relocation consolidated into Phase 9 — no temporary regression
- Invite a Friend scoped to a copy-link / mailto flow; real email delivery
  deferred until an email provider is chosen
- Delete Account marked as backend/security work requiring a secure server
  route, not a client operation
- Add Person hidden-field preservation rule defined explicitly before Phase 6
- Stats formulas centralized in `lib/crm-rules` with tests; "most neglected"
  renamed to "Needs attention"
- Friend/Family/Professional defined as primary relationship categories, not
  strict MECE; multiple selection allowed; custom tags remain in Settings

---

## Pre-Work: Four Steps Before Any Phase

These must be completed before starting Phase 1.

**1. Update `PROJECT_MASTER_PLAN.md`**
The current master plan still frames near-term goals as stabilization.
Before phases begin, add a new section summarizing this UX/rebrand push as
the accepted next direction. `PROJECT_MASTER_PLAN.md` is the source of truth
and should reflect where the project is actually heading.

**2. Apply the Supabase schema-drift migration**
File: `supabase/migrations/20260514171147_reconcile_target_schema_drift.sql`
Before applying: check the live Supabase project for duplicate tag names or
rows that would violate the restored constraints.
After applying: re-run `npm test`, `npm run lint`, `npm run build` and
smoke-test people, tags, import, restore, and export against the live project.
Record completion in `TODO.md`.

**3. Verify a fresh clone runs using only the README**
Clone into a new folder, follow the README exactly, run
`npm test`, `npm run lint`, `npm run build`, and start the app.
Fix any README gaps found. Record completion in `TODO.md`.

**4. Document the npm audit decision**
Re-run `npm audit`. Do not run `npm audit fix` — the reported fix path is a
major Next.js downgrade. Write one decision sentence in `TODO.md`
(e.g. "Accepted as temporary moderate risk; reassess when Next.js publishes
a safe upgrade path").

---

## Verification Gate (required after every phase)

```
npm test
npm run lint
npm run build
```

If any command fails, stop. Record the failure in `TODO.md` under
Bugs / Stability before continuing. Do not merge or deploy a phase that
fails the gate.

Manual QA is also required for every user flow touched by the phase.

---

## Phase 1 — Design System & Rebrand

**Route groups touched:** all (`app/layout.tsx`, global CSS,
`components/AppLayout`, `app/(site)`, `app/(auth)`, `app/(app)`)

**Why first:** every subsequent phase builds on the visual foundation set
here. Doing this first means each later phase only needs to use the system,
not define it.

**No schema or data changes. `DATA_MODEL.MD` unchanged.**

### Tasks

- Rename the app to **Roots** everywhere: page titles, `<title>` tags,
  meta descriptions, `README.md` heading, and any visible "Personal CRM"
  strings in UI components
- Create a **leaf logo** as a clean SVG and update the favicon in `public/`
- Define the design system using CSS variables in the global stylesheet:
  - Background: off-white (e.g. `#F7F4EF`)
  - Primary: sage green (e.g. `#7C9A7E`)
  - Surface: slightly warmer white for cards (e.g. `#FDFAF6`)
  - Text: warm near-black (e.g. `#1C1917`)
  - Accent: muted terracotta or warm gold for primary CTAs
  - Border: soft warm gray
- Choose and load a **font pairing** via `next/font` — one warm display font
  for headings, one readable body font; apply globally in `app/layout.tsx`
- Apply the color scheme and typography to `components/AppLayout` (sidebar,
  nav, shell) and across all existing pages so the app is visually consistent
  before new features are added
- Update `tailwind.config` to reference the new CSS variables so all
  subsequent phases can use Tailwind utility classes that resolve to the
  design system

### Verification

- Run the full gate: `npm test`, `npm run lint`, `npm run build`
- Manual QA: load `/`, `/auth/login`, `/dashboard`, `/people`, `/settings`
  and confirm the new palette and fonts render correctly on each
- Confirm the favicon and page title show "Roots" in the browser tab

---

## Phase 2 — Landing Page

**Route group touched:** `app/(site)` only

**Blast radius:** isolated. `(site)` changes cannot affect `(auth)` or
`(app)` pages.

**No schema or data changes. `DATA_MODEL.MD` unchanged.**

### Tasks

- **Navigation bar:** Roots logo + links to About, FAQ, Contact Us, Log In,
  Sign Up
- **Hero section:** headline, subheadline, and a single strong CTA
  ("Start for free") linking to `/auth/signup`
- **Product preview section:** 2–3 static screenshots or illustrated mockups
  of the dashboard, people tab, and person detail; keep server-rendered with
  no new client-side JavaScript (consistent with the Milestone 6 approach)
- **Feature highlights:** 3 short callouts with icons — Remember, Follow
  through, Stay close
- **Footer pages — create as static pages under `app/(site)`:**
  - `/about` — origin story (two recent grads who felt this problem)
  - `/faq` — what Roots is, how it differs from LinkedIn, is it free, how
    data is stored
  - `/privacy` — standard privacy policy (generate from a reputable template;
    review before publishing)
  - `/contact` — simple mailto link; no backend dependency at this stage
  - `/roadmap` — optional; list planned features in plain language
- Apply the Phase 1 design system fully; warm, inviting, credible

### Verification

- Run the full gate: `npm test`, `npm run lint`, `npm run build`
- Manual QA: load each new page, confirm all nav links work, confirm Sign Up
  leads to `/auth/signup`
- Smoke test: confirm logged-out redirect from `/dashboard` → `/auth/login`
  still works (confirms `(site)` changes did not disturb `(app)` routing)

---

## Phase 3 — Auth Pages Polish

**Route group touched:** `app/(auth)` only

**Blast radius:** isolated.

**No schema or data changes. `DATA_MODEL.MD` unchanged.**

### Tasks

- Apply Phase 1 design system to `/auth/login` and `/auth/signup`
- Add a **rotating warm greeting** on the login page — a short human
  sentence, implemented as a static array with client-side random selection
  (no API call, no new dependency):
  - *"Someone out there is hoping you'll reach out."*
  - *"Good relationships don't just happen."*
  - *"The best time to reconnect was yesterday. The next best time is now."*
- Ensure sign-up form only asks for email and password at this stage
- Confirm both pages link to each other correctly

### Verification

- Run the full gate: `npm test`, `npm run lint`, `npm run build`
- Manual QA: confirm design matches Roots palette, greeting rotates on login,
  and sign-up and login flows work end-to-end against live Supabase

---

## Phase 4 — Dashboard Redesign

**Route group touched:** `app/(app)/dashboard` only

**Key file:** `app/(app)/dashboard/_components/dashboard-sections.tsx`
(already extracted — edit this file, do not rewrite the page)

**Dependency note:** The follow-up cards will show counts only in this phase.
Making them clickable links to filtered People views is done in Phase 5,
once URL-backed filters on `/people` exist. Do not implement clickable cards
in this phase.

**No schema or data changes. `DATA_MODEL.MD` unchanged.**
All stats below are computable from data already in the database.

### Tasks

**Follow-up cards — slim to exactly 3:**
- Keep: Overdue, Due This Week, Coming Up
- Each card shows a count only in this phase (clickable links added in Phase 5)
- Ensure card labels match the terminology that will be used in Phase 5
  People filters — agree on the exact three terms now and use them consistently
  in both phases

**Below the cards — contextual sections:**
- Upcoming birthdays (already exists — keep, confirm it renders below cards)
- Active follow-ups (already exists — keep)

**Add a Stats / Milestones tracker section:**
All formulas must be implemented as pure functions in `lib/crm-rules` with
corresponding unit tests — not inline in the component. This keeps them
testable and consistent with the existing pattern in the codebase.

- Total contacts added (count of `people` rows for the user)
- Total interactions logged (count of `interactions` rows for the user)
- On-time outreach rate (percentage of contacts currently within their
  `contact_frequency_days` window)
- Most contacted person (person with highest `interactions` count)
- **"Needs attention"** — person most overdue relative to their
  `contact_frequency_days`; use this label, not "most neglected"

Style as warm, encouraging achievement-style cards. "Needs attention" is a
nudge, not a verdict.

### Verification

- Run the full gate: `npm test`, `npm run lint`, `npm run build`
- Confirm new stat formulas have unit tests in `lib/crm-rules` that pass
- Manual QA: load `/dashboard` with real data, confirm exactly 3 follow-up
  cards render with counts, confirm stats section shows accurate numbers,
  confirm birthday and follow-up sections still render

---

## Phase 5 — People Tab & URL Filters

**Route group touched:** `app/(app)/people` only

**Key files:**
- `app/(app)/people/_components/people-list-sections.tsx` (already extracted)
- Search/filter UI in the people header component

**Dependency note:** This phase also completes the dashboard card click
behavior from Phase 4. Once URL-backed filters exist here, update the Phase 4
dashboard cards to link to `/people?filter=overdue` etc.

**No schema or data changes. `DATA_MODEL.MD` unchanged.**

### Tasks

- **URL-backed filter state:** replace any local component state for filters
  with URL search params (e.g. `?filter=overdue`, `?tag=friend`) so that:
  - the back button works correctly after navigating from a dashboard card
  - filter state is shareable via URL
  - this is the prerequisite for dashboard card links

- **Filter by tag:** tag pill selector above or beside the search bar;
  selecting a tag filters the people grid; multiple tag selection supported

- **Sort options** via a dropdown: Last Contacted (default), Most Contacted,
  Date Added, A–Z by name

- **Dashboard card links:** now that URL filters exist, update the Phase 4
  dashboard cards to be clickable links to `/people?filter=overdue`,
  `/people?filter=due-this-week`, `/people?filter=coming-up`; use the exact
  same three labels agreed in Phase 4

- **Export Data stays on this page for now.** It will be relocated to
  Settings in Phase 9. Do not remove it here — removing before it exists in
  Settings creates a temporary regression.

- Confirm the search bar filters in real time and coexists correctly with
  the new URL filter params

### Verification

- Run the full gate: `npm test`, `npm run lint`, `npm run build`
- Manual QA: test tag filter with multiple tags, test each sort option,
  confirm dashboard card links navigate to the correct filtered view, confirm
  the back button returns to the dashboard correctly, confirm export still
  works from this page

---

## Phase 6 — Add Person Flow

**Route group touched:** `app/(app)/people/new` and shared
`app/(app)/people/_components/person-form.tsx`

**Note:** `person-form.tsx` is shared between create and edit pages.
Changes here affect both. Test both after this phase.

**Critical rule — hidden field preservation:**
When a user is editing an existing contact, any field hidden by the template
or collapsed into "More details" must not be submitted as `null` or an empty
string and must not overwrite the stored value. The form must load all
existing values on mount regardless of which fields are visible, and the
submit payload must only include fields that are explicitly shown and edited.
This is the highest regression risk in this phase. Define and test this
behavior before writing any UI.

**No schema or data changes. `DATA_MODEL.MD` unchanged.**
All fields used already exist in the `people` table.

### Tasks

- **Default form (visible to everyone on open):** Name, Relationship category,
  Contact frequency, Notes — nothing else

- **Relationship categories:** Friend, Family, Professional
  - These are primary relationship categories, not strict MECE
  - Multiple selection is allowed (e.g. a college roommate who is also a
    professional contact)
  - They are distinct from the custom tags users can create in Settings tag
    management; do not remove or replace custom tag functionality
  - Label them "relationship type" or "category" in the UI, not "tags," to
    avoid confusion with the custom tag system

- **Template-based fields that appear after category selection:**
  - Friend: Name, Phone, Birthday, How you know them, Notes
  - Family: Name, Phone, Birthday, Relationship, Notes
  - Professional: Name, Email, Company, Role, How you met, Notes
  - Multiple categories selected: show the union of relevant fields
  - These are the *primary* visible fields; remaining `people` table fields
    go in "More details"

- **"More details" collapsible section:** remaining optional fields from the
  `people` table (location, relationship strength, preferred contact method,
  etc.); collapsed by default; clearly labelled with a chevron

- **Field labels must be human:** "How did you meet?" not `how_met`,
  "Birthday" not `birthday date`, etc.

- **Implement and test hidden field preservation** before shipping this phase:
  write a test that loads an existing person with values in all fields, opens
  the edit form, does not touch any hidden fields, submits, and confirms all
  hidden field values are unchanged in the database

### Verification

- Run the full gate: `npm test`, `npm run lint`, `npm run build`
- Manual QA: add a Friend, a Family member, and a Professional contact;
  confirm template fields appear for each category; confirm "More details"
  expands and saves; confirm the edit page still works and does not
  overwrite hidden fields; confirm a contact with all fields populated can
  be edited without data loss

---

## Phase 7 — Person Profile & Interaction Timeline

**Route group touched:** `app/(app)/people/[id]` only

**Key file:** `app/(app)/people/[id]/_components/person-detail-sections.tsx`
(already extracted in Milestone 4)

**No schema or data changes. `DATA_MODEL.MD` unchanged.**
`interactions.type` already accepts any text value; expanding the type
options is a UI-only change.

### Tasks

**Profile layout:**
- Display fields matching the contact's relationship category template
  (defined in Phase 6); a Friend profile shows different primary fields
  than a Professional profile
- Move Delete and Edit actions off the top of the page — place them in a
  three-dot menu (⋯) in the top-right corner; they should not be the first
  thing a user sees

**Interaction timeline:**
- Show **time elapsed between interactions** inline (e.g. "3 months since
  last contact"); computed from adjacent sorted interaction dates
- Expand interaction type options to include: Coffee, Lunch, Dinner, Phone
  Call, Video Call, In Person, Message, Email, Other — in addition to
  existing types
- Ensure the `interactions.notes` field is surfaced on each timeline entry
  if it is not already
- Timeline renders chronologically; dates and elapsed time readable at a
  glance

### Verification

- Run the full gate: `npm test`, `npm run lint`, `npm run build`
- Manual QA: open a person with interaction history, confirm elapsed time
  shows correctly, confirm new interaction types appear in the log dropdown,
  confirm delete/edit are no longer at the top, confirm existing interactions
  and follow-ups are unchanged

---

## Phase 8 — Sidebar & Navigation

**Component touched:** `components/AppLayout` (shared across all `(app)`
pages — test all authenticated routes after this phase)

**Scope change from v2:** Invite a Friend is scoped to a copy-link or
`mailto:` flow. Real email delivery requires choosing an email provider
(Resend, SMTP, etc.), adding env vars, rate limiting, and safe SDK
initialization for Next.js build. That work is deferred as a separate
backend slice when the provider decision is made.

**No schema or data changes. `DATA_MODEL.MD` unchanged.**

### Tasks

- Add **Invite a Friend** item to the sidebar:
  - Opens a small modal with a single action: copy a pre-built signup link
    to the clipboard, or a `mailto:` link that pre-fills a short invite
    message with the signup URL
  - No API call, no email provider, no new backend route in this phase
  - Show a "Link copied" confirmation state after the user copies
  - When the team is ready to add real email delivery, this becomes a
    separate backend slice with provider setup, env vars, rate limiting,
    and abuse controls

- **Stats tab decision:** evaluate whether a dedicated Stats sidebar item
  adds value beyond the dashboard milestone tracker (Phase 4); only add it
  if it shows a meaningfully deeper breakdown; do not add it if it would
  duplicate the same data

- Keep the sidebar clean; every item must earn its place

### Verification

- Run the full gate: `npm test`, `npm run lint`, `npm run build`
- Manual QA: load `/dashboard`, `/people`, and `/settings`, confirm sidebar
  renders correctly on all three; test the copy-link flow, confirm the
  correct URL is copied and the confirmation state appears

---

## Phase 9 — Settings Overhaul

**Route group touched:** `app/(app)/settings` only

**Key files:**
- `app/(app)/settings/_components/settings-panels.tsx` (already extracted)
- `app/(app)/settings/_lib/import-validation.ts` (already extracted)

**Export relocation:** Export Data moves from the People tab to Settings in
this phase. Remove it from the People tab only after confirming it is live
and working in Settings.

**Delete Account:** this is backend/security work, not a simple client
operation. Deleting a Supabase Auth user from the client requires service-role
access or a carefully designed RPC. Implement as a secure server route
(`POST /api/account/delete`) that validates the authenticated user, calls
the Supabase Admin API to delete the auth user (which cascades all user data
via existing FK constraints), and returns a JSON-shaped response. Requires a
confirmation step in the UI before the route is called.

**No other schema or data changes. `DATA_MODEL.MD` unchanged.**
The `settings` table already has `reminder_frequency_days` and
`email_reminders_enabled`. Account updates (name, email, password) go through
Supabase Auth.

### Tasks

Restructure Settings into **named sections** with a left-side nav or tab
strip:

**Account**
- Change display name
- Change email address (via Supabase Auth update)
- Change password (via Supabase Auth update)
- Profile photo (defer if it requires storage setup not yet in place)

**Notifications**
- Reminder frequency (already exists — surface here)
- Email reminders toggle (already exists — note in UI if delivery is not
  yet active)

**Data**
- Export contacts — moved here from the People tab; remove from People tab
  only after confirming it works here
- Import / update contacts (already exists — keep)
- Restore / replace contacts (already exists — keep)
- Delete account — implement as described above with server route and
  confirmation step; mark as backend/security work in `TODO.md`

**Billing** (placeholder only)
- A single card: "Free plan — paid plans coming soon"; no functional elements

Each section reachable from the settings nav without a full page reload.

### Verification

- Run the full gate: `npm test`, `npm run lint`, `npm run build`
- Manual QA: test changing display name, email, password; test export from
  its new Settings location; test import and restore; confirm export is
  removed from the People tab only after it works here; confirm the delete
  account flow shows a confirmation before executing and that the server
  route returns the correct response; confirm all existing settings
  functionality is unchanged

---

## Build Order Summary

| Phase | Name | Route Group(s) Touched | Backend Changes | Dependency |
|---|---|---|---|---|
| Pre-work | 4 steps before anything | `PROJECT_MASTER_PLAN.md` + infra | Schema migration | Must complete first |
| 1 | Design System & Rebrand | All (global CSS + AppLayout) | None | After pre-work |
| 2 | Landing Page | `(site)` only | None | After Phase 1 |
| 3 | Auth Pages Polish | `(auth)` only | None | After Phase 1 |
| 4 | Dashboard Redesign | `(app)/dashboard` only | None | After Phase 1 |
| 5 | People Tab & URL Filters | `(app)/people` only + dashboard card links | None | After Phase 4 |
| 6 | Add Person Flow | `(app)/people/new` + shared form | None | After Phase 5 |
| 7 | Person Profile & Timeline | `(app)/people/[id]` only | None | After Phase 6 |
| 8 | Sidebar & Navigation | `components/AppLayout` (all app pages) | None (email deferred) | After Phase 1 |
| 9 | Settings Overhaul | `(app)/settings` only | New `/api/account/delete` route | After Phase 8 |

---

## Rules for Every Phase

1. **Read `AGENTS.md` before writing any code.** The Next.js version in this
   repo has breaking changes from training data.
2. **Do not mix concerns.** UI phases stay UI-only; backend work is called out
   explicitly (Phase 9 delete account only).
3. **Do not touch `DATA_MODEL.MD`** — no phase requires a schema change.
4. **Run the verification gate** at the end of every phase. Record failures
   in `TODO.md` before continuing.
5. **Manual QA every touched user flow** before a phase is complete.
6. **Keep changes narrow.** Each phase is one PR-sized unit of work. Do not
   start Phase N+1 on top of a failing Phase N.
7. **Export Data must never be absent.** Do not remove it from People until
   it is confirmed working in Settings (Phase 9).
8. **Hidden fields must never be overwritten with null** during edit
   operations. Verify this explicitly in Phase 6 before shipping.
