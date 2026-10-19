# Phase 1 Stage 10 — Final Closeout

## Purpose

Stage 10 converts the Phase 1 implementation into a release-ready closeout state. It verifies the production topology, prevents raw backend/database errors from being rendered to users, records accepted infrastructure exceptions, and defines the final executable regression gate.

## Production topology verified on 2026-10-05

The Vercel project is configured with the following verified domains:

- `vestryhub.com` — marketing/apex surface.
- `www.vestryhub.com` — permanent redirect to `vestryhub.com`.
- `app.vestryhub.com` — Administrative Portal application surface.
- `*.vestryhub.com` — wildcard tenant/member surface.
- `vestry-hub.vercel.app` — Vercel preview/default surface.

Hostname classification remains a routing/UI concern only. Database authorization and tenant isolation remain enforced server-side through tenant-aware RLS, grants, and trusted session validation.

## User-facing error closeout

Raw Supabase/Postgres/provider error messages must not be passed directly into user-facing toast or description surfaces. `src/lib/userFacingError.ts` is the canonical translator for backend errors. It converts authentication, authorization, duplicate/data-integrity, connectivity, capacity, and common database implementation failures into non-technical messages and otherwise falls back to a generic operation-specific message.

Developer diagnostics may retain raw errors in console/monitoring/internal thrown errors, but direct database codes, relation/column/constraint details, PostgREST codes, and provider internals must not be shown to end users.

## Supabase security disposition

Stage 8 established the following live baseline:

- all public tables have RLS enabled;
- five no-policy tables are intentionally server-only and browser roles have no table privileges;
- trigger-only private `SECURITY DEFINER` functions are not directly executable by browser roles;
- `member-session-context` is deployed with custom opaque-session validation;
- `pg_net` remains an accepted Phase 1 infrastructure exception because the installed extension is non-relocatable and is used by scheduled HTTP workers. Moving it requires a planned drop/recreate maintenance operation and worker regression;
- Supabase Leaked Password Protection remains a dashboard-level control and should be enabled before final production acceptance if it has not already been enabled.

## Regression disposition

All dependency-free Phase 1 contracts, security scans, action inventories and TypeScript validation pass in the closeout workspace. Live Vercel verification confirms the apex, www redirect, application host, wildcard tenant host, and default Vercel host are attached and verified. Live Supabase verification confirms `member-session-context` is ACTIVE.

The final local/CI gate is:

```bash
npm ci
npm run test:p1:closeout
```

Protected E2E remains credential-backed. The following suites must execute with disposable tenant actor/session state; credential-based skips are evidence gaps, not passes:

```bash
npm run test:e2e:modules
npm run test:e2e:stage7
npm run test:e2e:platform
```

The three provider/manual exceptions remain payroll execution, platform subscription M-Pesa, and church-giving M-Pesa. They must not be destructively tested against production accounts.

## Phase 1 acceptance

Phase 1 source and live infrastructure are ready for closeout when the dependency-backed local/CI regression and credential-backed protected E2E suites complete without unexplained failures, and any remaining dashboard-only security control is explicitly confirmed or accepted.
