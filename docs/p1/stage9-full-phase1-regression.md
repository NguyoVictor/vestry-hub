# Phase 1 Stage 9 - Full Regression

## Goal

Prove the Phase 1 implementation as one integrated system after Stages 1-8, rather than relying only on milestone-local checks.

## Automated regression gate

Run:

```bash
npm ci
npm run test:p1:regression
```

This covers repository secret scanning; focused People, Operations, Engagement, Analytics, and Module Vitest suites; module, performance, domain, action-inventory, Stage 7, Stage 8 security, and Stage 9 dependency-free contracts; P2 dependency-free and Vitest contracts; TypeScript; and the production build.

## Protected browser gate

Protected browser QA must run only against disposable tenants with local credentials/storage states:

```bash
npm run test:e2e:modules
npm run test:e2e:stage7
npm run test:e2e:platform
```

A credential-dependent skip is not a Phase 1 pass. Cross-tenant denial probes must use actor-scoped clients; destructive mutations must remain limited to fixtures protected by `PW_PLATFORM_TEST_ENV=disposable`.

## Manual provider exceptions

The Stage 6/7 action inventory intentionally keeps three provider-side workflows out of shared/live destructive automation:

- payroll execution;
- platform subscription M-Pesa STK/callback;
- church giving M-Pesa STK/callback.

These require dedicated provider sandbox credentials and explicit test records.

## Stage 8 security baseline entering regression

- `member-session-context` is deployed live with custom opaque-session validation.
- All public tables have RLS enabled.
- Server-only tables remain inaccessible to browser roles.
- Private trigger-only `SECURITY DEFINER` functions are not directly executable by browser roles.
- `pg_net` remains a documented infrastructure exception because the installed extension is non-relocatable and is used by scheduled HTTP workers; changing it requires a maintenance-window drop/recreate and queue/cron retest.
- Supabase Auth Leaked Password Protection is an account-level Dashboard setting and should be enabled before final Phase 1 acceptance.

## Exit criteria

Stage 9 is green only when:

1. `npm run test:p1:regression` passes with zero failures;
2. all protected browser suites execute against disposable fixtures with zero unexpected skips/failures;
3. TypeScript and production build pass;
4. no repository secret or whitespace checks fail;
5. any provider/manual exception has a recorded sandbox/manual verification result rather than an untested assumption.

## Regression execution evidence — 2026-10-05

Executed successfully in the Stage 9 packaging environment:

- repository secret guard;
- module configuration contract;
- module enforcement QA contract (12/12);
- performance index contract (24/24);
- domain separation contract;
- action inventory contract (66 actions);
- Stage 7 protected-E2E contract (57 protected actions + 3 manual exceptions);
- Stage 8 security contract (10/10);
- Stage 9 regression inventory contract (19 focused P1 test files + protected platform suites);
- P2 dependency-free contracts (52/52).

The container could not complete `npm ci` within its execution window, so dependency-backed Vitest, production build, and Playwright execution are **not** marked as passed here. A global TypeScript compiler was available and `tsc --noEmit` completed successfully with zero errors. The project lockfile is present; run the full dependency-backed gate in the real clone where dependencies can install normally.

During Stage 9 orchestration review, the consolidated regression script was corrected to include the Stage 8 security contract explicitly.
