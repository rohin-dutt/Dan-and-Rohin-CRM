# Personal CRM

A private personal CRM for tracking relationships, tags, interaction history, and follow-up reminders.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Supabase Auth, database, and Row-Level Security

## Current Features

- Email/password signup, login, logout, and protected app routes
- Dashboard for overdue, due soon, recently contacted, and neglected relationships
- People CRUD with relationship details and contact cadence
- Tags and person/tag assignments
- Interaction logging with last-contacted updates
- Settings for reminder preferences
- JSON export at `/api/export`
- Reproducible Supabase migrations in `supabase/migrations`

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
```
