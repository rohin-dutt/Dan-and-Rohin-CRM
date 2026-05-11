# Project Plan

## Current Status

The app now has the core personal CRM loop implemented: Supabase auth, protected routes, database-backed people, tags, interactions, settings, dashboard status, follow-up queue, birthday reminders, JSON export, and import/restore.

## Phase 0 - Setup

Complete. The Next.js app, shadcn/ui, local development setup, and baseline docs are in place.

## Phase 1 - App Shell

Complete. The app has a public homepage, authenticated layout, sidebar navigation, mobile navigation, dashboard, people, person detail, and settings screens.

## Phase 2 - Supabase Setup

Complete in code. Reproducible SQL migrations live in `supabase/migrations` and define tables, constraints, indexes, cascades, RLS, follow-up status fields, and RPC helpers for safer multi-step mutations.

## Phase 3 - Authentication

Complete. Email/password signup, login, logout, callback handling, protected route redirects, and API-shaped route-handler auth errors are implemented.

## Phase 4 - People CRUD

Complete. Users can create, view, edit, tag, search, import, restore, and delete their own people. Mutation failures surface user-visible errors before redirecting. Duplicate contact warnings use normalized exact name/email matching.

## Phase 5 - Interaction Logging

Complete. Users can create, edit, and delete interactions. Historical logging only updates `last_contacted_at` when the interaction date is newer, and edits/deletes recalculate the latest interaction date.

## Phase 6 - Reminder Dashboard

Complete for in-app status. The dashboard covers every contact with overdue, due this week, coming up, recently contacted, and neglected sections. It also shows active follow-ups and upcoming birthdays.

## Phase 7 - Reliability and Backups

Complete in code. Export checks Supabase errors, returns API-shaped failures, and the client displays export errors. Settings include import/update and restore/replace flows compatible with the export format.

## Next Work

- Apply migrations to the live Supabase project and test with a fresh database.
- Run full manual QA with real Supabase credentials.
- Expand automated browser/API coverage for auth redirects, mutation failure states, export failures, and import/restore.
- Decide whether to add real email reminder delivery.
- Review npm audit findings before dependency upgrades.
