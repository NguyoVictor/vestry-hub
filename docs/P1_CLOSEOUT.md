# VestryHub P1 Closeout

Date: 2026-09-29
Baseline entering closeout: `f739b88` (A8 checkpoint)

## Status

P1 product hardening across People, Operations, Engagement, Messaging, and Dashboard/Reports is closed at the source/database-contract level. No product regression was found during this closeout.

The only source changes made during closeout were two test-hardening corrections:
- A5 survey audience assertion now tolerates SQL whitespace while checking the same `target_audience = 'group'` condition.
- A7 messaging assertions now validate the final migration state rather than treating the presence of a historical policy name in an earlier migration as a regression, and accept the actual guarded sender assignment through `v_actor`.

## Deferred Operations closeout

The previously skipped A1-A4 Operations closeout was completed.

Executed existing Operations source-contract assertions using a temporary Vitest-compatible assertion shim after TypeScript emission because the `vitest` executable is unavailable in this runtime.

Result: **27/27 Operations assertions passed**.

Covered:
- A1 Volunteering + Export
- Events/RSVP and service attendance contracts
- A2 Member Requests
- A3 Board Meetings + Jitsi
- A4 Facility Booking
- Operations actor/read-only/export contract

## Broad P1 regression

The same temporary execution method ran the existing source-contract tests without rewriting their product assertions.

- People: **24/24 passed**
- Operations: **27/27 passed**
- Engagement + Messaging: **18/18 passed**
- Analytics: **6/6 passed**
- Total executable P1 source-contract assertions: **75/75 passed**

A8 dependency-free contract checker also passed **11/11**.

Full TypeScript: `tsc --noEmit` -> **exit 0**.

`git diff --check` -> **passed**.

## Live Supabase closeout

### Migration parity

All 30 P1 migration files in source were reconciled against `supabase_migrations.schema_migrations` in production.

Result: **30/30 match production**, using the production raw statement hash where the history entry is byte-identical and the normalized hash where Supabase stored the statement with a single leading newline.

This includes the recovery-era duplicate descriptive name for A7 messaging; both migration versions are preserved intentionally because they exist in production history.

### RLS coverage

All scoped P1 public tables checked in People, Operations, Engagement, Messaging, Finance metrics, and Analytics have RLS enabled and at least one policy.

The scope includes canonical People tables, services/attendance/events, volunteering, requests, Board meetings, facilities/bookings, announcements/surveys, appointments/testimonies, messaging, giving, and expenses.

### Staff/member boundaries

Rechecked with live authenticated identities:

Ordinary linked member:
- Board read/write: false
- Facility read/write: false
- Engagement Admin read/write: false
- Analytics read: false

Authorized staff:
- Board read/write: true
- Facility read/write: true
- Engagement Admin read/write: true
- Analytics read: true

Sensitive staff-only tables checked during closeout returned no anonymous table grants.

Public RPC exposure remains intentional and invoker-gated for member/public workflows. The canonical analytics RPC is `SECURITY INVOKER`, not executable by `anon`, and delegates to a private tenant/staff-authorized implementation.

### Security advisor

No new P1-specific advisor finding was introduced.

Pre-existing platform findings remain and are not silently treated as P1 regressions:
- RLS enabled with no policy on `automation_settings`
- RLS enabled with no policy on `member_login_challenges`
- RLS enabled with no policy on `staff_invitations`
- RLS enabled with no policy on `tenant_payment_credentials`
- RLS enabled with no policy on `webhook_events`
- `pg_net` installed in `public`
- Auth leaked-password protection disabled

These belong to later infrastructure/final closeout where applicable, especially B2/B4/B5/B7/B8.

## Release-check limitation

The repository checkpoint does not contain the local package executables for Vitest or Vite.

Attempts made during this closeout:
- `npm run test:p1:operations` -> exit 127, `vitest: not found`
- `npm run test:p1:engagement` -> exit 127, `vitest: not found`
- `npm run test:p1:analytics` -> exit 127, `vitest: not found`
- `npm run build` -> exit 127, `vite: not found`

No real Vitest or fresh Vite build pass is claimed.

This does not erase the successful 75/75 execution of the existing source-contract assertions through the temporary assertion runner or the successful full TypeScript check. A dependency-complete environment must still run the normal Vitest/build commands before production release; that remains a release verification item for B8.

## Secret scan note

A tracked-file pattern scan was run. Hits were configuration names, environment-variable reads, documentation examples/placeholders, legacy migration references, and a PEM header string used by push-notification code. No literal production credential was identified by this pattern scan. Full secret scanning remains part of B8.

## P1 completion summary

Completed segments:
- A1 Volunteering + Export
- A2 Member Requests
- A3 Board Meetings + Jitsi
- A4 Facility Booking
- Deferred Operations closeout
- A5 Announcements + Surveys
- A6 Appointments + Testimonies
- A7 Messaging
- A8 Dashboard + Reports

Next phase: **B1 — Tenant subdomains**.
