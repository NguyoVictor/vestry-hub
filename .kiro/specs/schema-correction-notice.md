# ⚠️ SCHEMA CORRECTION NOTICE — READ BEFORE ANY OTHER SPEC

## This file overrides ALL phase spec files (phase-1 through phase-9)

The phase spec files were written before the database was built.
The database Kiro built uses different names. This file documents
the corrections. Any time a phase spec file says one thing and this
file says another — THIS FILE WINS.

---

## Table Name Corrections

When any spec file says this → use this instead:

| Spec says | Use this |
|-----------|----------|
| `churches` | `tenants` |
| `donations` | `giving_records` |
| `church_expenses` | `expenses` |
| `budget_lines` | `budget_categories` |
| `church_seo_settings` | `tenant_seo_settings` |
| `training_courses` | `resources` |
| `attendance` | `attendance_records` |
| `church_members` | `role_permissions` |

---

## Column Name Corrections

When any spec file says this → use this instead:

| Spec says | Use this |
|-----------|----------|
| `church_id` | `tenant_id` |
| `events.name` | `events.title` |
| `events.start_datetime` | `events.event_date` + `events.start_time` |
| `events.status = 'published'` | `events.is_published = true` |
| `events.capacity` | `events.capacity_limit` |
| `events.rsvp_deadline` | `events.registration_deadline` |
| `tenants.logo_url` | `tenants.logo` |
| `tenants.email` | `tenants.contact_email` |
| `tenants.onboarding_complete` | `tenants.onboarding_completed` |
| `giving_records.donation_date` | `giving_records.given_at` |
| `giving_records.category` | `giving_records.giving_type` |
| `giving_records.payment_reference` | `giving_records.pesapal_transaction_id` |

---

## ID Type Correction

All spec files say IDs are UUID. They are actually VARCHAR.
Do not use UUID casting, uuid_generate_v4(), or gen_random_uuid().
Use the existing ID generation pattern already in the codebase.

---

## Mandatory Query Pattern

Every Supabase query must use the TABLES and COLS constants:
```typescript
// CORRECT — always do this
import { TABLES, COLS } from '../lib/schema'
supabase.from(TABLES.DONATIONS).eq(COLS.CHURCH_ID, tenantId)

// WRONG — never do this even if a spec file shows it this way
supabase.from('donations').eq('church_id', churchId)
```

---

## Members Table — Columns That Were Added Post-Build

These columns did not exist when Kiro first built the members table.
They were added via migration. They now exist and can be used:

- `first_name` VARCHAR
- `last_name` VARCHAR  
- `email` VARCHAR
- `phone` VARCHAR
- `status` VARCHAR ('active', 'inactive', 'pending')
- `join_date` DATE
- `avatar_url` TEXT
- `gender` VARCHAR
- `date_of_birth` DATE

---

## Giving Records — Columns That Were Added Post-Build

- `is_anonymous` BOOLEAN
- `notes` TEXT
- `receipt_number` VARCHAR
- `fund_id` VARCHAR
- `campaign_id` VARCHAR
- `donor_name` VARCHAR
- `category` VARCHAR (generated from giving_type)

---

## What To Do When Working From a Phase Spec

1. Read the phase spec for the feature/UI requirements and business logic
2. IGNORE all table names, column names, and ID types in the spec
3. Use TABLES.X and COLS.X from src/lib/schema.ts for all queries
4. If a query in the spec references a column that does not exist in
   the actual table — check if it was added in the migrations above,
   or check the actual table columns before writing the query
5. When in doubt: run a quick column check in Supabase SQL editor:
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'your_table' AND table_schema = 'public'