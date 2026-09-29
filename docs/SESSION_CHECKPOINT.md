# VestryHub Phase 1 — Session Checkpoint

Last complete: P1 closeout — A1 through A8
Current/next: B1 — Tenant subdomains
P1 closeout commit: 75e082e

Verified:
- Deferred Operations closeout completed: 27/27 A1-A4 Operations contract assertions passed through the temporary source-contract runner.
- Broad P1 source-contract regression: 75/75 passed across People, Operations, Engagement/Messaging, and Analytics.
- A8 dependency-free contract checker: 11/11 passed.
- Full TypeScript `tsc --noEmit`: exit 0.
- `git diff --check`: passed.
- All 30 P1 migration source files reconcile with production migration history (raw or single-leading-newline-normalized statement hash).
- All scoped P1 public tables checked have RLS enabled and at least one policy.
- Ordinary linked member live helper checks: Board, Facility, Engagement Admin, and Analytics access denied.
- Authorized staff live helper checks: Board, Facility, Engagement Admin, and Analytics access allowed.
- Sensitive staff-only tables checked have no anonymous table grants.
- Supabase security advisor shows no new P1-specific finding.
- Detailed closeout record: `docs/P1_CLOSEOUT.md`.

P1 complete:
- A1 — Volunteering + Export
- A2 — Member Requests
- A3 — Board Meetings + Jitsi
- A4 — Facility Booking
- Operations closeout
- A5 — Announcements + Surveys
- A6 — Appointments + Testimonies
- A7 — Messaging
- A8 — Dashboard + Reports

Known release-check limitation:
- Normal Vitest commands were attempted but `vitest` is not installed in this checkpoint runtime (exit 127). No normal Vitest pass is claimed.
- `npm run build` was attempted but `vite` is not installed in this checkpoint runtime (exit 127). No fresh Vite build pass is claimed.
- The existing P1 source-contract assertions were still executed through TypeScript emission plus a temporary Vitest-compatible assertion shim: 75/75 passed.
- A dependency-complete environment must run normal Vitest + production build before production release; retain this for B8.

Pre-existing platform advisor items retained for later infrastructure/final closeout:
- no-policy RLS tables: `automation_settings`, `member_login_challenges`, `staff_invitations`, `tenant_payment_credentials`, `webhook_events`
- `pg_net` extension in `public`
- leaked-password protection disabled

Next exact action:
Start B1 — Tenant subdomains. Audit the actual app architecture and current hostname/session tenant resolution. Implement hostname resolver for `<slug>.vestryhub.com`, root/app host behavior, stale-tenant protection, `buildTenantUrl()`, QR/share/invite conversion, and hostname-vs-session tenant checks. Add RED contracts first, then minimal GREEN implementation, focused verification, broader regression, Supabase checks where relevant, commit, update this checkpoint, and create B1 recovery ZIP + SHA-256.

Do not redo: P1 A1-A8 unless a regression test fails.
Recovery ZIP: create from the final P1 checkpoint commit and record its SHA-256 below.
Recovery SHA-256: pending package creation.
