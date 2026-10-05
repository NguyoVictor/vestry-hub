# Phase 1 Stage 7 — Protected End-to-End QA

Stage 7 converts the Stage 6 action inventory into executable protected browser and actor-scoped authorization checks. It is intentionally gated so destructive or mutation-capable tests only run against disposable tenants.

## Scope

The Stage 6 manifest contains 66 meaningful user actions:

- 57 `protected-e2e` actions covered by the Stage 7 protected suite
- 6 actions already covered by lower-level automation
- 3 manual exceptions that require isolated provider sandboxes

The Stage 7 suite adds four focused evidence groups:

1. **Admin permission enforcement** — full/read-only/no-permission browser behavior on mutation-heavy routes.
2. **Cross-tenant API denial** — actor-scoped Supabase SELECT/UPDATE/DELETE probes across People, Events, Services, Finance, Engagement, Messaging, Appointments, and Testimonies.
3. **Member tenant/session boundary** — stale/cross-host member sessions are rejected and cleared; protected member routes are revalidated.
4. **High-risk workflow smoke** — representative critical/high-risk Admin surfaces load and expose the expected workflow entry points.

The existing platform suites continue to provide route smoke, module enforcement, import/export, permissions, communications/subscription infrastructure, People, Operations, and tenant-boundary coverage.

## Safety interlock

Set this only for disposable tenants:

```bash
PW_PLATFORM_TEST_ENV=disposable
```

`e2e/platform/fixtures/safety.ts` rejects destructive testing unless Tenant A and Tenant B are distinct and refuses production `vestryhub.com` hosts unless the explicit production override is supplied. Do not use that override for normal Phase 1 QA.

## Required fixtures

Minimum protected configuration:

```text
PW_BASE_URL
PW_SUPABASE_URL
PW_SUPABASE_ANON_KEY
PW_TENANT_A_ID
PW_TENANT_B_ID
PW_TENANT_A_SLUG
PW_TENANT_B_SLUG
PW_TENANT_A_ADMIN_ACCESS_TOKEN
PW_FULL_ADMIN_STORAGE_STATE
PW_READ_ONLY_ADMIN_STORAGE_STATE
PW_NO_PERMISSION_ADMIN_STORAGE_STATE
PW_MEMBER_A_STORAGE_STATE
```

For live wildcard-domain/session-mismatch coverage also provide:

```text
PW_TENANT_BASE_DOMAIN
PW_MEMBER_A_SESSION_JSON
```

`PW_MEMBER_A_SESSION_JSON` must be the disposable Tenant A `member_session` localStorage value. It contains an opaque session token and must never be committed.

Optional route fixtures improve deeper route/action coverage:

```text
PW_MEMBER_A_ID
PW_EVENT_ID
PW_FACILITY_ID
PW_SURVEY_ID
PW_GROUP_ID
PW_FELLOWSHIP_ID
PW_BRANCH_ID
PW_ACTIVITY_ID
PW_ALBUM_ID
PW_COURSE_ID
PW_LESSON_ID
PW_SESSION_ID
PW_PARTICIPANT_ID
PW_JOIN_CODE
PW_TENANT_B_MARKER
```

## Manual exceptions

The following remain deliberately manual and must use isolated provider credentials:

- `payroll-run` — external payroll/payment side effects
- `subscription-upgrade` — platform subscription M-Pesa STK/callback
- `member-give-stk` — church-giving M-Pesa STK/callback

Church giving and platform subscription billing must remain separate during QA.

## Commands

Dependency-free contracts:

```bash
npm run test:security:secrets
npm run test:p1:actions:contract
npm run test:p1:stage7:contract
npm run test:p2:contracts
```

Protected browser suite:

```bash
npm run test:e2e:stage7
```

Full platform suite after Stage 7 passes:

```bash
npm run test:e2e:platform
```

## Evidence requirements

A Phase 1 Stage 7 run is considered complete only when:

- no protected test is silently skipped because a required credential is missing;
- both disposable tenants are confirmed distinct;
- read-only and no-permission Admin states are exercised;
- Tenant A actor-scoped API probes cannot read, update, or delete Tenant B records;
- Tenant A member session is rejected on Tenant B hostname;
- import/export remains tenant-filtered;
- module enforcement tests pass for Admin and Member portals;
- failures are recorded with route/action/test name and resolved or explicitly documented.

A skipped test due to missing fixture credentials is **not a pass** for final Phase 1 closeout.

## Current milestone preparation evidence

Prepared in this Stage 7 ZIP:

- Stage 7 action mapping: 57 protected actions + 3 manual exceptions
- stale tenant-host/session `test.fixme` removed
- Stage 7 dependency-free contract passes
- Stage 6 action inventory contract passes
- repository secret guard passes
- P2 dependency-free contracts pass 52/52

Actual protected browser execution is environment-dependent and must be run with disposable tenant credentials before Stage 7 is marked fully verified.
