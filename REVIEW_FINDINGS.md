# Review Findings

This document explains the seven review findings in plain terms, why each one matters, and how to fix it.

## 1. Database Schema Is Documented But Not Reproducible

**Where:** `DATA_MODEL.MD`

**Simple explanation**

The project describes the Supabase database tables in a markdown file, but it does not include the actual SQL files needed to create those tables, relationships, indexes, or security rules.

Right now, someone can read what the database should look like, but they cannot reliably recreate it from the repo.

**Why it matters**

If another developer clones the project, they can install the code, but they still need to manually build the Supabase database. That creates a high risk that their database will be slightly different from yours.

This matters especially for:

- Row-Level Security policies
- Foreign keys between tables
- Cascading deletes
- Required columns and defaults
- Indexes for performance

**How to fix it**

Add Supabase migration files to the repo. A normal structure would be:

```text
supabase/
  migrations/
    202605110001_create_people.sql
    202605110002_create_interactions.sql
    202605110003_create_tags.sql
    202605110004_create_settings.sql
    202605110005_rls_policies.sql
```

Those files should create the tables and enable RLS policies such as "users can only read their own rows."

**Relevant info**

RLS means Row-Level Security. It is the database rule system that prevents one logged-in user from reading or changing another user's CRM data.

## 2. Tag Insert Failures Are Ignored

**Where:** `app/people/new/page.tsx`

**Simple explanation**

When a user creates a new person and selects tags, the app first saves the person, then saves the tag links. The app checks whether the person was saved correctly, but it does not check whether the tags were saved correctly.

**Why it matters**

The user could select tags, click save, and get redirected to the person page even if the tags failed to attach.

The person would exist, but the selected tags might be missing.

**How to fix it**

Capture the result of the tag insert:

```ts
const { error: tagInsertError } = await supabase
  .from("person_tags")
  .insert(selectedTagIds.map((tag_id) => ({ person_id: data.id, tag_id })));

if (tagInsertError) {
  setError(tagInsertError.message);
  setSaving(false);
  return;
}
```

**Relevant info**

For a more advanced fix, create the person and tag links in one database transaction or server-side function so the whole save either succeeds together or fails together.

## 3. Edit Can Silently Drop Or Fail Tag Updates

**Where:** `app/people/[id]/edit/page.tsx`

**Simple explanation**

When editing a person, the app deletes all existing tag links and then inserts the newly selected tag links. It does not check whether either operation worked.

**Why it matters**

This can cause data loss. For example:

1. The app deletes the old tags.
2. The app tries to insert the new tags.
3. The insert fails.
4. The app still redirects as if everything worked.

The person could end up with no tags.

**How to fix it**

Check both database operations:

```ts
const { error: deleteError } = await supabase
  .from("person_tags")
  .delete()
  .eq("person_id", params.id);

if (deleteError) {
  setError(deleteError.message);
  setSaving(false);
  return;
}

if (selectedTagIds.length > 0) {
  const { error: insertError } = await supabase
    .from("person_tags")
    .insert(selectedTagIds.map((tag_id) => ({ person_id: params.id, tag_id })));

  if (insertError) {
    setError(insertError.message);
    setSaving(false);
    return;
  }
}
```

**Relevant info**

The best version is to replace tags in a transaction, because delete-then-insert can leave partial data if the second step fails.

## 4. Delete Redirects Even If The Database Delete Fails

**Where:** `app/people/[id]/page.tsx`

**Simple explanation**

When the user deletes a person, the app sends a delete request to Supabase but does not check whether Supabase actually deleted the row.

It always redirects back to `/people`.

**Why it matters**

If the delete fails, the user may think the person is gone when they are not.

Deletes can fail because of:

- RLS policies
- Foreign key constraints
- Missing cascade rules
- Network errors
- Supabase errors

**How to fix it**

Check the delete result before redirecting:

```ts
const { error: deleteError } = await supabase
  .from("people")
  .delete()
  .eq("id", params.id);

if (deleteError) {
  setError(deleteError.message);
  setDeleting(false);
  return;
}

router.push("/people");
```

This requires adding an error state to the page.

**Relevant info**

The database should also define what happens to related rows. If a person is deleted, should their interactions and tag links also be deleted? Usually yes for this app. That should be handled with foreign keys using `on delete cascade`.

## 5. Interaction Logging Can Leave Dashboard Data Stale

**Where:** `app/people/[id]/interactions/new/page.tsx`

**Simple explanation**

When a user logs an interaction, the app does two things:

1. Inserts the interaction.
2. Updates the person's `last_contacted_at` date.

The app checks whether step 1 worked, but it does not check whether step 2 worked.

**Why it matters**

The interaction could be saved, but the dashboard might still think the person has not been contacted recently.

That would make reminder status wrong.

**How to fix it**

Check the update result:

```ts
const { error: updateError } = await supabase
  .from("people")
  .update({ last_contacted_at: date })
  .eq("id", params.id);

if (updateError) {
  setError(updateError.message);
  setSaving(false);
  return;
}
```

**Relevant info**

An even better design is to calculate "last contacted" from the most recent interaction instead of storing it separately on the person row. That avoids duplicated data getting out of sync.

## 6. Missing User Path Leaves Pages Loading Forever

**Where:** `app/dashboard/page.tsx` and similar client-side data loaders

**Simple explanation**

Some pages ask Supabase for the current user. If there is no user, the function returns early, but it does not stop the loading state or redirect.

**Why it matters**

Normally the proxy should redirect logged-out users to the login page. But if the browser session is expired, missing, or in an odd state, the user could see a page stuck on "Loading..." forever.

**How to fix it**

When no user exists, stop loading and redirect:

```ts
if (!user) {
  setLoading(false);
  router.push("/auth/login");
  return;
}
```

This requires importing `useRouter` from `next/navigation` in those client pages.

**Relevant info**

The same pattern should be checked in:

- `app/dashboard/page.tsx`
- `app/people/page.tsx`
- `app/people/new/page.tsx`
- `app/people/[id]/edit/page.tsx`
- `app/settings/page.tsx`

## 7. Public Landing Page Is Stale

**Where:** `app/page.tsx`

**Simple explanation**

The homepage still says sign-in is disabled and that there is no auth, database, API routes, or data mutation.

That was true during Phase 1, but it is no longer true.

**Why it matters**

Anyone testing the app will get the wrong impression. The project now has real auth pages, Supabase data access, API export, and mutation flows.

**How to fix it**

Update the homepage copy and links.

Good options:

- Link directly to `/auth/login` and `/auth/signup`
- Remove the disabled fake login form
- Keep dashboard preview links only if they are intended for logged-in users
- Explain that the app requires a Supabase-backed account

**Relevant info**

The docs should also be updated. `TODO.md`, `PROJECT_PLAN.md`, and `README.md` still describe earlier project phases and do not reflect the current implementation.

## Suggested Fix Order

1. Add Supabase migrations and RLS policies.
2. Add error handling for delete, tag insert, tag replacement, and interaction update.
3. Fix logged-out loading states.
4. Update the landing page and docs.
5. Add basic manual QA steps or lightweight tests for auth, people CRUD, tags, interactions, and export.

## Current Verification Status

At the time of review:

- `npm run lint` passed.
- `npm run build` passed.
- The git worktree was clean on `main`.
