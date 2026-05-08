# Data Model

Row-Level Security (RLS) is enabled on all tables.

---

## people

| Column | Type | Required |
|--------|------|----------|
| id | uuid | yes (PK) |
| user_id | uuid | yes (FK → auth.users) |
| name | text | yes |
| email | text | no |
| phone | text | no |
| company | text | no |
| role | text | no |
| location | text | no |
| birthday | date | no |
| how_met | text | no |
| relationship_type | text | no |
| relationship_strength | text | no |
| preferred_contact_method | text | no |
| contact_frequency_days | integer | yes |
| last_contacted_at | timestamptz | no |
| notes | text | no |
| created_at | timestamptz | yes (default: now()) |

---

## interactions

| Column | Type | Required |
|--------|------|----------|
| id | uuid | yes (PK) |
| person_id | uuid | yes (FK → people.id) |
| type | text | yes |
| date | date | yes |
| notes | text | no |
| follow_up_needed | boolean | yes (default: false) |
| follow_up_date | date | no |
| created_at | timestamptz | yes (default: now()) |

---

## tags

| Column | Type | Required |
|--------|------|----------|
| id | uuid | yes (PK) |
| user_id | uuid | yes (FK → auth.users) |
| name | text | yes |
| color | text | yes |
| created_at | timestamptz | yes (default: now()) |

---

## person_tags

| Column | Type | Required |
|--------|------|----------|
| person_id | uuid | yes (PK, FK → people.id) |
| tag_id | uuid | yes (PK, FK → tags.id) |

---

## settings

| Column | Type | Required |
|--------|------|----------|
| id | uuid | yes (PK) |
| user_id | uuid | yes (FK → auth.users, unique) |
| reminder_frequency_days | integer | yes |
| email_reminders_enabled | boolean | yes (default: false) |
| created_at | timestamptz | yes (default: now()) |
