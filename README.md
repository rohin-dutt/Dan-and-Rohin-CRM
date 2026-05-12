# Personal CRM

A private personal CRM for tracking relationships, tags, interaction history, follow-ups, birthdays, import/restore, and JSON export.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Supabase Auth, database, and Row-Level Security

## Current Features

- Email/password signup, login, logout, callback handling, and protected app routes
- Dashboard sections for overdue, due soon, coming up, recent, neglected, active follow-ups, and upcoming birthdays
- People CRUD with search across name, company, role, email, notes, and tags
- Duplicate warnings using normalized exact name/email matching
- Quick Log from People and detail pages
- Interaction create, edit, delete, and follow-up status controls
- Follow-up states: due, overdue, done, and snoozed
- Tags with assignment during people forms and management from Settings
- Settings for in-app reminder cadence
- JSON export at `/api/export`
- Import/update and restore/replace flows for files created by the export route
- Reproducible Supabase migrations in `supabase/migrations`
- Focused deterministic tests for relationship categorization and follow-up logic

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with Supabase project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Apply the SQL migrations in `supabase/migrations` to your Supabase database.

4. Start the app:

```bash
npm run dev
```

## Checks

```bash
npm run lint
npm run build
npm test
```

## Notes

- Remote Supabase migrations are not applied by this repo automatically.
- Email reminder delivery is not implemented; the Settings page only controls in-app reminder cadence.
- `proxy.ts` provides optimistic page redirects. API routes perform their own auth checks and return JSON errors.
