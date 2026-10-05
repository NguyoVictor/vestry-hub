# VestryHub B-Batch Session Checkpoint

Last complete: P1 closeout - A1 through A8
Current: B1 through B8 implementation and live Supabase deployment complete except deferred legacy Daraja-column removal; awaiting the single final B-batch Git commit/push

## B-batch progress

- B1 - Tenant subdomains: complete in source. Canonical tenant-host resolver, URL builder, admin/member hostname-session checks, and tenant-aware QR/share links are present.
- B2 - Queue-backed email: complete in source. Durable PGMQ job foundation, atomic credit reservation, queued email submission, and retry-safe email worker are present.
- B3 - Queue-backed SMS: complete in source. SMS enqueue, recipient-level retry/idempotency, provider outcome recording, and credit settlement are present.
- B4 - Subscription M-Pesa: complete in source. Server-authoritative catalog, STK initiation, idempotent callback application, upgrades/add-ons/downgrades, and protected webhook callback token are present.
- B5 - Church-giving M-Pesa reconciliation: complete in source. Active code uses `tenant_payment_credentials`, P0 transactional callback RPCs, corrected tenant authorization contracts, and protected STK/C2B callback tokens.
- B6 - Platform QA routes/actions: complete in source. Disposable-test guard, route inventory, protected route smoke coverage, critical controls/forms, import/export, and permission matrix suites are present.
- B7 - Platform QA data boundaries: complete in source. Hostname mismatch, direct Tenant A -> Tenant B CRUD denial probes, queue authorization probes, and subscription tamper/permission probes are present.
- B8 - Closeout: source CI gate, P2 docs, security scan hooks, and release-gate documentation are present.

## Verification completed in this runtime

- P2 dependency-free contracts: 51/51 passed after live-deployment fixes and B6/B7 strengthening.
- P1 A8 dependency-free analytics checker: 11/11 passed.
- TypeScript `npx --no-install tsc --noEmit`: exit 0 (fresh post-deployment run).
- Normal Vitest: still unavailable in this runtime because the local `vitest` package/binary is incomplete and `npm ci` timed out.
- Production Vite build: still unavailable because the local `vite` package/binary is incomplete and `npm ci` timed out.
- Full Playwright platform suites: retained as a protected-CI/release gate; disposable actor credentials/browser execution are not available in this runtime.

## Live Supabase status

B-batch live deployment is complete for the non-deferred scope. Production now has PGMQ email/SMS queues, durable communication job tables and RPCs, server-authoritative subscription catalog/payment-attempt tables, protected queue-worker token auth, worker cron schedules, and the B-batch Edge Functions. Empty-queue worker smoke calls return HTTP 200, and payment/webhook endpoints reject unauthenticated probes with HTTP 401.

The only intentionally deferred B5 cleanup is dropping the legacy `tenants.daraja_consumer_key`, `tenants.daraja_consumer_secret`, `tenants.daraja_passkey`, and `tenants.daraja_transaction_type` columns. Active B5 payment code no longer reads the legacy secret columns, and the secret-bearing legacy values are empty in production. The columns remain temporarily until the final production Daraja key rollout is confirmed.

Security advisors show no new B-specific finding. Existing pre-B-batch findings remain: five RLS-enabled tables with no policies (`automation_settings`, `member_login_challenges`, `staff_invitations`, `tenant_payment_credentials`, `webhook_events`), `pg_net` in `public`, and leaked-password protection disabled. Performance advisor findings for newly created B tables are limited to expected unused-index notices immediately after deployment.

## Final handoff

User requested one Git commit for the entire B batch. Do not create intermediate B1-B8 commits. Overlay the final B-batch package onto a clean branch based on `p1-stabilization-hardening`, run dependency-complete tests/build, review the diff, then create the single final B-batch commit.

Next exact action: create the final post-deployment recovery ZIP/SHA-256 and one-commit handoff. On the user's local clone, overlay the final package, run dependency-complete Vitest/build/Playwright, review the diff, then create and push the single B-batch commit. The deferred Daraja-column drop stays out of this commit until the key rollout is confirmed.
