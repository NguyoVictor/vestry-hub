# Phase 1 Stage 3 — Module Regression QA

## Scope

Stage 3 verifies the canonical module system introduced in Stage 2 and fixes one parity defect found during regression design: an already signed-in Member Portal session could continue using an old `enabled_modules` snapshot until the member signed in again.

## Changes

- Added `member-session-context` Edge Function.
  - Accepts the existing opaque Member Portal session token.
  - Validates the token against the server-only `member_sessions` table.
  - Rejects expired, inactive, pending, cross-member, and cross-tenant sessions.
  - Returns the tenant's current `enabled_modules` configuration.
- Updated `MemberPortalProvider` to revalidate the session before rendering protected member routes.
- Refreshed `member_session.enabledModules` in local storage from the current server value after successful validation.
- Added table-driven Vitest regression coverage for Admin and Member module routes.
- Added protected Playwright coverage using disposable tenant fixtures for:
  - disabled Admin navigation;
  - disabled Admin direct URLs;
  - stale Member session snapshots;
  - parent Admin module disabling a Member feature;
  - Member-specific feature disabling a route while the parent Admin module stays enabled.
- Added a dependency-free Stage 3 contract checker.

## Security model

`member-session-context` has `verify_jwt = false` because the Member Portal does not use a Supabase Auth JWT. This is intentional: the function authenticates requests using the opaque session token stored in `member_sessions`, which remains service-role-only. The token is not accepted as tenant identity by itself; the function matches member ID, tenant ID, token, and expiry server-side before returning context.

## Verification completed in packaging environment

- `npm run test:p1:modules:qa-contract` — PASS (12/12)
- `npm run test:security:secrets` — PASS

The packaging environment did not have dependencies installed, so Vitest, TypeScript, build, and Playwright must be run before the manual milestone commit.

## Required deployment before protected Member E2E

Deploy the new Edge Function to the Supabase project before running the protected Member Portal regression test:

```bash
supabase functions deploy member-session-context --project-ref crjdsxxkspvdwknrmijs --no-verify-jwt
```

Do not expose the service-role key to the browser. The function reads it only from Supabase Edge Function environment secrets.

## Pre-commit verification

```bash
npm ci
npm run test:security:secrets
npm run test:p1:modules:contract
npm run test:p1:modules:qa-contract
npm run test:p1:modules
npx tsc --noEmit
npm run build
git diff --check
```

For protected browser QA, configure disposable tenants and storage states, then run:

```bash
npm run test:e2e:modules
```

The test suite refuses fixture mutation unless `PW_PLATFORM_TEST_ENV=disposable` and requires service-role credentials only in the Playwright fixture process.

## Exit criteria

Stage 3 is complete when:

1. the Edge Function is deployed;
2. all module Vitest tests pass;
3. TypeScript and production build pass;
4. the protected module Playwright suite passes against disposable tenants;
5. tenant configuration is restored by the E2E teardown;
6. the working tree contains only the intended Stage 3 changes before commit.
