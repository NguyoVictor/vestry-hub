# P2 Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hostname-bound tenant resolution, durable queue-backed email/SMS, and server-authoritative Vestry subscription M-Pesa while reconciling church-giving payment code with the P0 hardened payment foundation.

**Architecture:** Add one tenant-host resolver and tenant URL builder in the frontend, PGMQ-backed server-only communication jobs with transactional credit reservation, and a separate platform billing flow using platform Daraja credentials and idempotent webhook application. Existing church-giving credentials remain tenant-owned and move fully to `tenant_payment_credentials`.

**Tech Stack:** React/Vite, Vercel wildcard domains, Supabase/Postgres, PGMQ/Queues, pg_cron, Edge Functions (Deno), Daraja, Resend/SMS provider, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-09-p2-infrastructure-design.md`

## Global Constraints

- Hostname tenant context never replaces RLS; both must agree.
- No secret value may appear in `VITE_*`, client bundles, logs, committed source, or browser-readable tables.
- Church-giving and Vestry subscription billing use separate credentials, callbacks, and state machines.
- Queue/job/payment mutations must be idempotent and concurrency-safe.
- Migrations are generated with `npx supabase migration new ...` and verified with advisors before closeout.
- Legacy credential columns are removed only after every active code path is proven migrated.

## Review Focus

- Preview/root hosts accidentally treated as tenant slugs.
- Two concurrent communication jobs both reserving the same remaining credits.
- Queue redelivery causing duplicate email/SMS sends or double credit usage.
- Browser price tampering or duplicate M-Pesa callbacks double-applying subscription entitlements.
- Church-giving Edge Functions reading old `tenants.daraja_*` values after protected credentials become authoritative.

---

### Task 1: Tenant hostname resolver and URL builder

**Files:**
- Create: `src/lib/tenantHost.ts`
- Create: `src/hooks/useResolvedTenant.ts`
- Modify: `src/contexts/ChurchContext.tsx`
- Modify: `src/contexts/MemberPortalContext.tsx`
- Modify: `src/components/layout/MemberAuthGuard.tsx`
- Modify: `src/components/shared/ChurchQRModal.tsx`
- Modify: QR/share callers identified by repository search
- Test: `src/test/p2/tenantHost.test.ts`
- Test: `e2e/platform/infrastructure/tenant-domain.spec.ts`

**Interfaces:**
- Produces: `resolveTenantSlug(hostname, baseDomain)`, `buildTenantUrl(slug, path, options)`, and resolved-tenant context.

- [ ] **Step 1:** Add unit tests for root host, `app` host, valid tenant slug, unknown slug, localhost/preview host, and malformed hostname.
- [ ] **Step 2:** Run `npm test -- src/test/p2/tenantHost.test.ts` and confirm failure.
- [ ] **Step 3:** Implement pure hostname functions first, then wire context resolution without changing page behavior.
- [ ] **Step 4:** Replace ad-hoc tenant-sensitive QR/share URL construction with `buildTenantUrl()`.
- [ ] **Step 5:** Run unit/E2E domain-isolation tests and commit with `git commit -m "feat: add tenant hostname isolation"`.

### Task 2: Communication job schema and credit reservation

**Files:**
- Create via CLI: migration from `npx supabase migration new p2_communication_queue_foundation`
- Modify: `src/lib/schema.ts`
- Test: `src/test/p2/communicationCredits.test.ts`

**Interfaces:**
- Produces: `communication_jobs`, reserved credit columns, server-only reservation/finalization RPCs, and queue objects.

- [ ] **Step 1:** Verify current Supabase Queues/PGMQ docs/changelog before implementation.
- [ ] **Step 2:** Generate migration and write failing DB contract tests for server-only access and atomic credit reservation.
- [ ] **Step 3:** Enable/use PGMQ per current Supabase guidance, create `outbound_email` and `outbound_sms`, create `communication_jobs`, and add `email_reserved`/`sms_reserved`.
- [ ] **Step 4:** Add service-role-only RPCs that atomically reserve, finalize, and release credits using row locks or equivalent transactional semantics.
- [ ] **Step 5:** Verify anon/authenticated cannot access queue internals, run advisors, and commit with `git commit -m "feat: add communication queue foundation"`.

### Task 3: Email enqueue and worker

**Files:**
- Modify: `supabase/functions/send-communication/index.ts`
- Create: `supabase/functions/process-email-queue/index.ts`
- Modify: `supabase/functions/process-email-automations/index.ts`
- Test: `src/test/p2/emailQueue.test.ts`

**Interfaces:**
- Consumes: Task 2 queue/RPCs.
- Produces: accepted job response and durable Resend worker.

- [ ] **Step 1:** Add tests proving enqueue returns a job ID without calling Resend synchronously.
- [ ] **Step 2:** Refactor `send-communication` to authorize, validate, reserve, create job, and enqueue only.
- [ ] **Step 3:** Implement `process-email-queue` to claim, send, record recipient outcome, finalize credits, and retry transient failures idempotently.
- [ ] **Step 4:** Make scheduled email automation enqueue due jobs instead of sending outside the queue path.
- [ ] **Step 5:** Run queue tests with provider fetch mocked and commit with `git commit -m "feat: queue outbound email"`.

### Task 4: SMS enqueue and worker

**Files:**
- Modify: `supabase/functions/africastalking-sms/index.ts`
- Create: `supabase/functions/process-sms-queue/index.ts`
- Test: `src/test/p2/smsQueue.test.ts`

**Interfaces:** Consumes Task 2 queue/RPCs and existing `sms_history`/`sms_recipients`.

- [ ] **Step 1:** Add tests for enqueue, partial failure, transient retry, permanent failure, duplicate message delivery, and credit release.
- [ ] **Step 2:** Refactor the public SMS function to enqueue instead of provider-send synchronously.
- [ ] **Step 3:** Implement queue worker with existing provider credential lookup and history tables.
- [ ] **Step 4:** Verify concurrent reservation cannot exceed allowance.
- [ ] **Step 5:** Commit with `git commit -m "feat: queue outbound sms"`.

### Task 5: Platform subscription catalog and payment attempts

**Files:**
- Create via CLI: migration from `npx supabase migration new p2_subscription_mpesa_foundation`
- Modify: `src/config/plans.ts`
- Modify: `src/hooks/useSubscription.ts`
- Modify: `src/pages/settings/Billing.tsx`
- Modify: `src/lib/schema.ts`
- Test: `src/test/p2/subscriptionCatalog.test.ts`

**Interfaces:**
- Produces: server-authoritative `subscription_catalog`, `subscription_payment_attempts`, pending downgrade fields if required, and catalog query contract.

- [ ] **Step 1:** Add tests that reject arbitrary client prices and map product codes to canonical amounts/entitlements.
- [ ] **Step 2:** Generate migration; seed the existing Free/Basic/Growth/Pro plans and add-ons using current plan values.
- [ ] **Step 3:** Refactor frontend plan config to presentation/types only or fetch catalog values from the server while preserving existing UI labels.
- [ ] **Step 4:** Replace the placeholder/manual billing modal action with a server STK initiation path.
- [ ] **Step 5:** Verify catalog access exposes no platform credential and commit with `git commit -m "feat: add server authoritative subscription catalog"`.

### Task 6: Subscription STK and idempotent webhook

**Files:**
- Create: `supabase/functions/initiate-subscription-stk/index.ts`
- Create: `supabase/functions/subscription-payment-webhook/index.ts`
- Test: `src/test/p2/subscriptionPayments.test.ts`
- Test: `e2e/platform/infrastructure/subscription-billing.spec.ts`

**Interfaces:**
- Consumes: platform Daraja secrets and Task 5 catalog/attempts.
- Produces: exactly-once plan/add-on activation and billing history.

- [ ] **Step 1:** Write tests for success, cancellation, timeout, unknown checkout ID, duplicate success, stale failure after success, amount tampering, add-on purchase, and plan upgrade.
- [ ] **Step 2:** Implement STK initiation that derives tenant from authenticated Admin context and loads amount from catalog.
- [ ] **Step 3:** Implement webhook event claim plus transactional entitlement application; never derive product/amount from callback input.
- [ ] **Step 4:** Implement downgrade scheduling without charging a new lower-plan STK.
- [ ] **Step 5:** Run unit/E2E sandbox tests and commit with `git commit -m "feat: add subscription mpesa billing"`.

### Task 7: Reconcile church-giving M-Pesa with P0 foundation

**Files:**
- Modify: `supabase/functions/process-stk-push/index.ts`
- Modify: `supabase/functions/payment-webhook/index.ts`
- Modify: `supabase/functions/c2b-webhook/index.ts` if active path still reads legacy credential columns
- Create via CLI only after verification: migration from `npx supabase migration new p2_remove_legacy_daraja_columns`
- Test: `src/test/p2/churchGivingPayments.test.ts`

**Interfaces:**
- Consumes: `tenant_payment_credentials`, `apply_mpesa_stk_callback`, `record_mpesa_c2b_payment`, `webhook_events`.
- Produces: no active code reads legacy `tenants.daraja_*` secrets.

- [ ] **Step 1:** Add tests asserting credential reads come from `tenant_payment_credentials` and webhook processing calls the P0 transactional RPC.
- [ ] **Step 2:** Refactor STK initiation to load protected credential rows using service role only.
- [ ] **Step 3:** Replace duplicate direct webhook update logic with `apply_mpesa_stk_callback` and preserve realtime notification as a non-authoritative signal.
- [ ] **Step 4:** Search the whole repo for legacy Daraja secret-column reads. Only if none remain and live values are already migrated/empty, generate the cleanup migration and drop the legacy secret columns.
- [ ] **Step 5:** Run payment regression/advisors and commit with `git commit -m "refactor: finish protected mpesa credential migration"`.

### Task 8: Infrastructure closeout

**Files:**
- Create: `docs/p2/infrastructure-changes.md`
- Modify: `docs/payments.md`
- Modify: `docs/messaging.md`

- [ ] **Step 1:** Run all P2 infrastructure unit/integration tests.
- [ ] **Step 2:** Run tenant-domain and subscription Playwright suites.
- [ ] **Step 3:** Verify queues, cron schedule, Edge Functions, live schema, migration history, and advisors.
- [ ] **Step 4:** Run repository secret/JWT scans and `npm run build`.
- [ ] **Step 5:** Document and commit with `git commit -m "docs: close P2 infrastructure"`.
