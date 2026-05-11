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

- [ ] Push the repository to GitHub
- [ ] Confirm a fresh clone can run the app with documented setup steps
- [ ] Apply migrations to the target Supabase project
- [ ] Add automated tests for auth-guarded loaders and mutation error handling
- [ ] Decide whether `last_contacted_at` should remain denormalized or be derived from interactions
- [ ] Implement real reminder email delivery if reminders are meant to send messages
