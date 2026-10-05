# P2 B-Batch Infrastructure Changes

This batch builds on the completed P1 hardening baseline. B1-B8 are being delivered as one final source commit, with recovery checkpoints between workstreams.

## Progress

- **B1 - Tenant subdomains:** canonical `<slug>.vestryhub.com` hostname resolution, tenant URL builder, hostname/session mismatch protection, and tenant-aware QR/share links.
- **B2 - Queue-backed email:** durable Supabase/PGMQ communication jobs, atomic credit reservation, queued email submission, retry-safe worker processing, and automation routing through the queue.
- **B3 - Queue-backed SMS:** queued SMS submission, recipient-level retry/idempotency, provider outcome recording, and atomic SMS credit settlement.
- **B4 - Subscription M-Pesa:** server-authoritative subscription catalog, payment-attempt records, platform STK initiation, idempotent webhook application, add-ons/upgrades, and scheduled downgrades.
- **B5 - Church-giving M-Pesa reconciliation:** church payment secrets now read/written only through `tenant_payment_credentials`; STK and C2B callbacks delegate authoritative mutations to the P0 transactional RPCs.
- **B6 - Platform QA routes/actions:** disposable test-environment guard, route/action inventory, controls/forms/QR/import-export and permission-matrix suites.
- **B7 - Platform QA data boundaries:** hostname mismatch and Tenant A/Tenant B regression contracts, member self-service boundary cases, queue/payment regression coverage.
- **B8 - Closeout:** CI quality gates, security scanning, documentation, migration/advisor checks, and final recovery packaging.

## Security model

Hostname tenant context is an application safety boundary, **not a replacement for RLS**. Database RLS and server-side authorization remain authoritative. Communication queue tables and RPCs are server-only; browser roles receive no queue or job mutation access.

Platform subscription billing and church-giving M-Pesa remain separate. Subscription billing uses only `PLATFORM_DARAJA_*` Edge Function secrets and canonical prices from `subscription_catalog`. Church-giving credentials remain tenant-owned in `tenant_payment_credentials`; they are never exposed through `VITE_*` values or browser-readable tables.

## Deployment gates

Before production activation: apply migrations in order; deploy the new/changed Edge Functions; configure the platform Daraja secrets and queue-worker schedule; then run normal Vitest, Vite build and Playwright in a dependency-complete environment. External provider E2E must use sandbox/stub configuration and must not make real-money payments.

The church-giving Edge Functions are now deployed against `tenant_payment_credentials`, but the legacy `tenants.daraja_*` columns are intentionally retained temporarily. The secret-bearing legacy values are empty in production; column removal is deferred until the final Daraja key rollout is confirmed so credential onboarding can be completed without a destructive schema step.

### Callback authenticity hardening

Final review added server-only callback tokens for both payment state machines. Vestry subscription callbacks require `PLATFORM_DARAJA_WEBHOOK_SECRET`; church-giving STK/C2B callbacks require `CHURCH_DARAJA_WEBHOOK_SECRET`. The initiation/registration functions append these tokens to callback URLs server-side, and secret-bearing URLs are not returned to browser clients.
