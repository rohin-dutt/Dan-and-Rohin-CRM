# Personal CRM

A private personal CRM for tracking relationships, tags, interaction history,
follow-ups, birthdays, import/restore, and JSON export.

`PROJECT_MASTER_PLAN.md` is the source of truth for product direction,
architecture decisions, and milestones. This README is only for local setup,
environment, scripts, current features, and verification.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Supabase Auth, database, and Row-Level Security

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Apply the SQL migrations in `supabase/migrations` to the target Supabase
   database.

4. Start the development server:

```bash
npm run dev
```

5. Open the local URL printed by Next.js, usually `http://localhost:3000`.

## Environment Variables

| Variable | Required | Used by |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase browser/server clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase browser/server clients |

Only expose variables with `NEXT_PUBLIC_` when they are safe to ship to the
browser. Do not commit `.env.local`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm test` | Run deterministic CRM and date utility tests |
| `npm run test:e2e` | Run Playwright unauthenticated browser/API smoke tests |
| `npm run test:e2e:signed-in` | Run signed-in Playwright smoke tests against local Supabase |
| `npm run lint` | Run ESLint |
| `npm run build` | Create a production Next.js build |
| `npm start` | Start the production build locally |

On Windows PowerShell, the local execution policy may block `npm.ps1` before a
script starts. Use the equivalent `npm.cmd` commands when that happens:

```bash
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

## Current Features

- Email/password signup, login, logout, auth callback handling, and protected
  app routes
- Dashboard sections for overdue, due soon, coming up, recent, neglected,
  active follow-ups, and upcoming birthdays
- People CRUD with search across name, company, role, email, notes, and tags
- Duplicate warnings using normalized exact name/email matching
- Quick Log from People and person detail pages
- Interaction create, edit, delete, and follow-up status controls
- Follow-up states for due, overdue, done, and snoozed items
- Tags with assignment during people forms and management from Settings
- Settings for in-app reminder cadence
- JSON export at `/api/export`
- Import/update and restore/replace flows for files created by the export route
- Reproducible Supabase migrations in `supabase/migrations`
- Focused deterministic tests for relationship categorization, follow-up logic,
  and date utilities

## Verification

Run the baseline before meaningful changes:

```bash
npm test
npm run test:e2e
npm run test:e2e:signed-in
npm run lint
npm run build
```

To verify the migration chain against local disposable infrastructure, use
Docker-backed Supabase or a throwaway Supabase Postgres container. Do not run
reset or repair commands against a linked remote project unless that is an
explicit release operation.

Manual QA against a real Supabase project should cover signup, login, logout,
dashboard load, people CRUD, search, tags, interactions, follow-ups, birthday
reminders, settings, export, import, and restore.

## Operational Notes

- Remote Supabase migrations are not applied by this repo automatically.
- Email reminder delivery is not implemented; Settings only controls in-app
  reminder cadence.
- `proxy.ts` provides optimistic page redirects. API routes and data/mutation
  paths must still perform their own auth and ownership checks.
