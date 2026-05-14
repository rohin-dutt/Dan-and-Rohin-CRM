<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation
notices.
<!-- END:nextjs-agent-rules -->

# Personal CRM Agent Rules

`PROJECT_MASTER_PLAN.md` is the source of truth for product direction,
architecture decisions, milestones, and sequencing. `TODO.md` is the active
execution queue. `README.md` is for setup and verification only.

## Project Conventions

- Use the Next.js App Router under `app/`.
- Keep TypeScript strict and prefer existing local patterns over new
  abstractions.
- Keep shared UI in `components/` and shared business/data helpers in `lib/`.
- Prefer route-local private folders such as `_components` or `_lib` for UI or
  helpers used by one route area.
- Keep Supabase code aligned with the existing browser/server client split.
- Do not rewrite `DATA_MODEL.MD` unless schema, migrations, or RLS behavior
  changed.
- Leave `REVIEW_FINDINGS.md` as historical context unless a task explicitly
  archives or reconciles it.

## Verification Gates

Run these before finishing meaningful implementation, route, data, or refactor
work:

```bash
npm test
npm run lint
npm run build
```

If any command fails, stop feature/refactor work. Record the failure in
`TODO.md` under Bugs / Stability with the command, failure summary, and likely
owner if known.

Manual QA is required for touched user flows, especially auth, people, tags,
interactions, follow-ups, settings, export, import, and restore.

## Route-Group Rules

- Preserve existing URLs when moving files into route groups:
  - `/`
  - `/auth/login`
  - `/auth/signup`
  - `/dashboard`
  - `/people`
  - `/settings`
- Route groups such as `(site)`, `(auth)`, and `(app)` are organizational only;
  they must not appear in URLs.
- Keep `app/layout.tsx` as the single root layout for shared HTML, metadata,
  manifest, and global styles.
- Use `app/(app)/layout.tsx` for the CRM shell only when it reduces repeated UI.
- Keep API route handlers under `app/api`.
- Avoid multiple root layouts unless the master plan changes.
- After route moves, verify public pages, auth pages, app pages, and API routes
  separately.

## Auth And Data Safety

- Do not rely on `proxy.ts` as the only auth layer. Proxy may perform optimistic
  redirects, but pages, Server Actions, Route Handlers, and data helpers must
  validate auth close to reads and writes.
- Treat Server Actions and Route Handlers as public entry points.
- Re-check resource ownership for user-owned data before reads, updates, and
  deletes.
- Return JSON-shaped auth errors from API routes instead of page redirects.
- Keep Supabase RLS as the database safety layer and preserve user ownership
  policies during migrations.
- Do not pass broad or sensitive database records into Client Components.
  Return the minimum shape needed by the UI.
- Validate client input from forms, route params, search params, and uploaded
  import files before using it.

## Refactor Rules

- Refactors must be behavior-preserving unless the task explicitly says
  otherwise.
- Do not start route moves or page refactors on top of an unknown failing
  baseline.
- Refactor only where it reduces regression risk or unlocks the next planned
  milestone.
- Keep PR-sized changes narrow by route or feature area.
- Do not mix new features into route moves or behavior-preserving refactors.
- Add or update tests when extracting shared business rules or validation logic.
- Stop and record a blocker if a refactor exposes a behavior bug that cannot be
  safely fixed within the current task.
