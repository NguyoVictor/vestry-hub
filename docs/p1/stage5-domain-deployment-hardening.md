# Phase 1 Stage 5 — Domain & Deployment Hardening

## Live Vercel state verified on 2026-10-05

Project: `vestry-hub` (`prj_n6RVfxpvB6l8jHnfK17zAZuBGwP9`)
Team: `nguyovictors-projects`

The connected Vercel project currently has only these verified project domains:

- `vestryhub.com`
- `vestry-hub.vercel.app`

The apex domain is managed by Vercel DNS and uses Vercel nameservers. The live Vercel project currently has no project-level routing rules configured (`0` routes), so host separation depends on project-domain/DNS assignment plus the application hostname classifier.

**Not currently attached to the project:**

- `app.vestryhub.com`
- `*.vestryhub.com`
- `www.vestryhub.com`

Therefore the desired production topology is **not fully live yet**. Do not claim wildcard tenant routing is operational until those domains are attached and verified.

## Target topology

| Host | Surface | Expected root behavior |
| --- | --- | --- |
| `vestryhub.com` | Marketing | Marketing landing page |
| `www.vestryhub.com` | Marketing alias | Marketing landing page or redirect to apex |
| `app.vestryhub.com` | Admin application | `/` routes to `/dashboard` (AuthGuard decides sign-in vs app) |
| `<tenant>.vestryhub.com` | Tenant/member application | `/` routes to `/member/login`; direct protected routes still enforce tenant/session checks |
| `join.vestryhub.com` | Reserved platform host | Never treated as a tenant slug |
| `*.vercel.app` | Preview | Non-tenant preview surface |
| Supabase project domain | Backend/API | Never routed through the frontend tenant resolver |

Hostname classification is a UI/routing concern only. It is **not** an authorization boundary and never substitutes for RLS or server-side tenant checks.

## Repository changes

`src/lib/tenantHost.ts` now centrally classifies hostnames and reserves platform labels. It rejects `app`, `www`, and `join` as tenant slugs. `resolveTenantSlug` only returns a slug for a valid, exact, one-label tenant hostname.

`src/App.tsx` now uses a hostname-aware root route:

- marketing root -> landing page;
- app root -> `/dashboard`;
- tenant root -> `/member/login`;
- local and Vercel preview roots -> landing page for development/QA;
- malformed/reserved platform hosts fail closed to a non-tenant surface.

`vercel.json` intentionally remains a generic SPA fallback. Custom-domain assignment belongs in Vercel project/domain settings and DNS, not in the SPA rewrite.

## Manual Vercel/DNS configuration required before Stage 5 can be declared fully deployed

1. Add `app.vestryhub.com` to the `vestry-hub` project and verify it.
2. Add `*.vestryhub.com` to the same project and verify wildcard DNS/certificate provisioning.
3. Decide whether `www.vestryhub.com` should be a project domain or a permanent redirect to `vestryhub.com`; configure and verify that choice.
4. Keep `vestryhub.com` as the marketing apex.
5. Confirm the wildcard does not override explicit reserved hosts such as `app`, `www`, or `join`.
6. Verify TLS for apex, app, www (if used), and at least one disposable tenant hostname.
7. Verify a random non-existent tenant hostname reaches the frontend but resolves to `not-found` tenant state rather than another tenant.
8. Never point the Supabase API hostname at Vercel; the Supabase project domain remains backend/API infrastructure.

Vercel's current guidance is to add custom domains to the project, inspect/verify the expected DNS configuration, and let project domain settings own aliases rather than encoding them in `vercel.json`.

## Verification

Run:

```bash
npm run test:p1:domains:contract
npm run test:p2:contracts
npm run test:p2:vitest
npx tsc --noEmit
npm run build
git diff --check
```

After the manual Vercel domain changes, verify in the Vercel dashboard/API that the project-domain list contains the required apex/app/wildcard configuration and that all entries are verified.

## Acceptance status

- Source hostname separation: implemented.
- Reserved-host tenant protection: implemented.
- Root host routing: implemented.
- SPA fallback configuration: verified/normalized.
- Live apex domain: verified.
- Live `app.vestryhub.com`: **pending manual Vercel/DNS configuration**.
- Live wildcard tenant domain: **pending manual Vercel/DNS configuration**.
- Live `www` policy: **pending explicit decision/configuration**.

Stage 5 should be committed as source hardening, but production domain separation is only fully closed after the three pending domain items are configured and verified.
