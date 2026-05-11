# Project Plan

## Current Status

The app now has the core personal CRM implementation: Supabase auth, protected routes, database-backed people, tags, interactions, settings, dashboard status, and JSON export.

## Phase 0 - Setup

Complete. The Next.js app, shadcn/ui, local development setup, and baseline docs are in place.

## Phase 1 - App Shell

Complete. The app has a public homepage, authenticated layout, sidebar navigation, mobile navigation, dashboard, people, person detail, and settings screens.

## Phase 2 - Supabase Setup

Complete in code. Reproducible SQL migrations live in `supabase/migrations` and define tables, constraints, indexes, cascades, RLS, and ownership policies.

## Phase 3 - Authentication

Complete. Email/password signup, login, logout, callback handling, and protected route redirects are implemented.

## Phase 4 - People CRUD

Complete. Users can create, view, edit, tag, and delete their own people. Mutation failures now surface user-visible errors before redirecting.

## Phase 5 - Interaction Logging

Complete. Users can log interactions for their own people, and successful logs update dashboard-facing `last_contacted_at` data.

## Phase 6 - Reminder Dashboard

Complete for in-app status. The dashboard groups people by overdue, due this week, recently contacted, and neglected states.

## Next Work

- Apply migrations to the live Supabase project and test with a fresh database.
- Add automated coverage for client auth redirects and write-failure states.
- Decide whether to calculate last-contacted status from interactions instead of storing duplicate data on people.
- Build actual reminder delivery if email reminders are required.
