# Roots Mobile Screen Map

This document maps the intended iOS app screens, their data needs, and primary
actions. It should guide implementation and QA.

## Global Screen Requirements

Every screen should account for:

- loading, empty, error, and offline states where relevant
- safe-area layout on small and large iPhones
- keyboard avoidance for forms and search inputs
- Dynamic Type without clipped labels or unusable controls
- VoiceOver labels for icon-only controls, destructive actions, and form fields
- clear disabled states for offline-unavailable writes
- unsaved-change confirmation on create/edit forms where data loss is likely
- privacy-safe display in notifications, screenshots, and review/demo data

## Root App States

### Launch

Purpose: decide whether to show auth, onboarding, or the main app.

Data:

- Supabase session.
- Local onboarding completion state.
- Cached private data availability.

States:

- loading session
- logged out
- logged in, onboarding incomplete
- logged in, onboarding complete
- offline with cached session/data

### Auth Stack

#### Login

Actions:

- log in
- navigate to signup
- navigate to forgot password

States:

- loading
- invalid credentials
- network error

#### Signup

Actions:

- create account
- navigate to login

States:

- loading
- validation error
- account already exists
- email confirmation if required by Supabase settings

#### Forgot Password

Actions:

- request reset link
- return to login

States:

- sent
- error

#### Update Password

Actions:

- set new password from deep link session
- return to app

States:

- invalid link
- loading
- success
- error

## Onboarding

### Welcome

Purpose: explain the app's value in one concise screen.

Actions:

- continue
- skip onboarding where allowed

### First Contacts

Purpose: help users avoid an empty app.

Actions:

- add first person
- import from iOS Contacts
- skip for now

### Reminder Setup

Purpose: set reminder cadence and introduce notifications.

Actions:

- choose reminder preference
- continue to notification permission context

### Notification Permission Context

Purpose: ask for push permission after explaining why it matters.

Actions:

- enable notifications
- not now

### Onboarding Complete

Purpose: route users to Dashboard with a clear next action.

Actions:

- go to Dashboard
- add person if none exist

## Main Tabs

### Dashboard

Purpose: show the user's relationship health and highest priority next actions.

Data:

- people
- interactions
- follow-ups
- birthdays
- tags as needed for display

Sections:

- summary metrics
- overdue
- due soon
- coming up
- recently contacted
- neglected
- upcoming birthdays

Actions:

- open person
- log interaction
- mark follow-up done
- snooze follow-up
- add person

States:

- loading
- empty first-run
- error
- offline cached

### People

Purpose: browse and manage all contacts.

Data:

- people
- tags
- person_tags
- active follow-ups

Actions:

- search
- filter by status
- filter by tag
- sort
- open person detail
- add person
- import contacts

States:

- loading
- no people
- no results
- error
- offline cached

### Your Roots

Purpose: show where saved relationships live without geocoding private contact data.

Data:

- people with saved latitude/longitude
- people with saved location text

Sections:

- native map pins grouped by nearby saved coordinates
- selected location group
- location-based list fallback

Actions:

- open person
- review people without saved coordinates

States:

- loading
- empty
- map unavailable/no coordinates
- error
- offline cached

### Settings

Purpose: account, preferences, data management, and app support.

Sections:

- account
- notifications
- tags
- data
- support/legal

Actions:

- logout
- update notification preferences
- manage tags
- export data
- import/update
- restore/replace
- delete account
- open privacy policy
- open support URL

States:

- loading
- save success
- error
- offline limited

## People Stack

### Person Detail

Data:

- person
- tags
- interactions
- follow-up state

Actions:

- edit person
- delete person
- log interaction
- edit interaction
- delete interaction
- mark follow-up done
- snooze follow-up
- reopen follow-up

States:

- loading
- not found
- error
- offline cached

### Add Person

Fields:

- name
- email
- phone
- company
- role
- location
- birthday
- how met
- relationship type
- relationship strength
- preferred contact method
- contact frequency days
- notes
- tags

Actions:

- save
- cancel
- add tag

States:

- validation error
- save error
- offline unavailable
- unsaved changes

### Edit Person

Same fields and states as Add Person.

Additional actions:

- delete person

### Log Interaction

Fields:

- type
- date
- notes
- follow-up needed
- follow-up date

Actions:

- save
- cancel

States:

- validation error
- save error
- offline unavailable
- unsaved changes

### Edit Interaction

Same fields as Log Interaction.

Additional actions:

- delete interaction
- mark follow-up done
- snooze
- reopen

## Contacts Import

### Contacts Permission

Purpose: explain Contacts access before system prompt.

Actions:

- continue
- skip

States:

- permission denied
- permission unavailable

### Contact Picker

Data:

- local iOS contacts

Actions:

- search contacts
- select contacts
- continue

States:

- loading contacts
- no contacts
- permission denied

### Import Review

Data:

- selected contacts
- mapped CRM fields
- duplicate candidates

Actions:

- create
- update existing
- skip
- import selected

States:

- validation warning
- duplicate warning
- save error

### Import Result

Data:

- created count
- updated count
- skipped count
- errors

Actions:

- view people
- import more

## Data Management

### Export

Actions:

- generate export
- share/save file

States:

- exporting
- error

### Import/Update

Actions:

- choose file
- validate
- review summary
- import

States:

- invalid file
- validation warning
- importing
- complete
- error

### Restore/Replace

Actions:

- choose file
- validate
- confirm destructive restore
- restore

States:

- invalid file
- confirmation required
- restoring
- complete
- error

### Delete Account

Actions:

- confirm deletion
- delete account

States:

- confirmation required
- deleting
- error
- success route to logged-out state
