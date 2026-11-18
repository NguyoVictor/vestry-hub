# Phase 1: CI repair and genuine staging read-only browser checks

**Status: delivery batch 1, not full Phase 1 acceptance.**

## Why this package exists

The earlier CI member-session test asserted authorization was performed in the browser. Current code delegates token, tenant, expiration, and approval checks to `member-session-context` Edge Function. This package fixes the stale assertion and adds component behavior tests.

Previous Playwright tests in `e2e/platform/people/families-visitors-followup-converts.spec.ts` primarily inspected source strings. They are **not real browser CRUD tests**. We have NOT declared them as validated. A new independent browser suite now tests real pages and network targeting without sending write requests.

## Environment safety (do not weaken)

- Staging Supabase project: `xwbajophstetbnnemsyq`. Shared by Vercel Preview and Production frontend configuration.
- Test tenant A: `20d06ab3-5183-4b0b-b1af-ca009480503b` (Vestry Staging Church A).
- Test tenant B: `db75d0c0-ec9c-406e-a386-a690725b654f` (Vestry Staging Church B).
- These tenants share **one** Supabase database, Auth, Storage, and Edge Functions. They are not disposable environments. The dedicated `Vestry Isolated QA 20261025` tenant has no staff/member profiles.
- **Never** set `PW_PLATFORM_TEST_ENV=disposable` for staging. Keep `e2e/platform/fixtures/safety.ts` unchanged and its destructive-E2E safeguards enabled.
- This package's tests block non-GET/HEAD/OPTIONS requests from the browser and reject other Supabase backends. They don't create/update/delete data.
- No login credentials, service role key, database password or storageState fixture required.
- No migration, DB write, Edge Function deploy, or Vercel promotion in this package.

## Install (from repository root on existing recovery branch)

1. Download the ZIP to `~/Downloads/vestry-hub-phase1-staging-readonly.zip`.
2. `mkdir -p ~/Downloads/vestry-phase1-staging`
3. `unzip -q ~/Downloads/vestry-hub-phase1-staging-readonly.zip -d ~/Downloads/vestry-phase1-staging`
4. `python3 ~/Downloads/vestry-phase1-staging/install.py --check .`
5. Only with **0 conflicts**: `python3 ~/Downloads/vestry-phase1-staging/install.py --apply .`.

Installer supports Python 3.8. It only modifies files whose SHA256 matches the inspected baseline, keeps backups in `.recovery/`, and will not touch uncommitted invitation callback work. On conflict, STOP and send the conflict list for a targeted update; do not force overwrite.

## First verification (local, offline)

```bash
node --test scripts/qa/staging-readonly-guard.node.test.mjs
npx vitest run src/test/p1/people/memberRegistration.test.tsx src/test/p1/people/memberSessionProvider.behavior.test.tsx
npm run test:p1:people
npx tsc --noEmit
npm run build
git diff --check
```

If `npm ci` is necessary, ensure `node_modules` installation is separate from the ZIP; no dependency packages are bundled. The source quality job runs the offline guard tests on every recovery-branch push.

## Configure real read-only browser smoke

1. In Vercel dashboard, select a **READY Preview** deployment of the current recovery branch, **not Production**, and copy its exact unique `https://...vercel.app` deployment URL.
2. Verify the preview build has `VITE_SUPABASE_URL=https://xwbajophstetbnnemsyq.supabase.co` and that no secret is exposed in test logs.
3. From the project root:

```bash
export PW_STAGING_READONLY=1
export PW_STAGING_BASE_URL='https://REPLACE-EXACT-PREVIEW.vercel.app'
export PW_STAGING_ALLOWED_HOST='REPLACE-EXACT-PREVIEW.vercel.app'
export PW_STAGING_SUPABASE_URL='https://xwbajophstetbnnemsyq.supabase.co'
bash scripts/qa/staging-readonly-run.sh
```

The browser suite loads `/member/login` and `/member`, verifies visible controls, triggers a **GET-only** tenant branding lookup with a nonexistent test code, asserts that requests hit the correct Supabase staging hostname, and checks login protection. It does **not** click Sign In, send invitations or touch existing tenant records.

If the browser suite fails, inspect errors and Playwright trace/screenshots; do not mark the issue fixed simply because CI passes.

## Automation in GitHub Actions

Every recovery-branch push runs the **offline staging guard unit tests** and **discovers** (lists) the browser smoke tests without executing them. The live browser test intentionally remains a local, explicit `npm run test:e2e:staging:readonly` command at this stage because a trusted READY Preview URL must be selected. The source-quality check passing is **not** evidence that the live staging browser smoke ran. After stable Preview-to-staging routing is verified, we can configure a separately approved automated browser job without merging to main.

## Stage and push only this delivery batch

```bash
git add \
  .github/workflows/p1-p2-quality.yml \
  docs/recovery/PHASE1_STAGING_READONLY_QA.md \
  e2e/qa/staging-readonly.spec.ts \
  package.json playwright.staging-readonly.config.ts \
  scripts/qa/staging-readonly-guard.mjs \
  scripts/qa/staging-readonly-guard.node.test.mjs \
  scripts/qa/staging-readonly-run.sh \
  scripts/qa/staging-tenant-inventory.sql \
  src/test/p1/people/memberRegistration.test.tsx \
  src/test/p1/people/memberSessionProvider.behavior.test.tsx
git diff --cached --check
git diff --cached --name-status
git commit -m 'test(recovery): repair member session CI and add safe staging browser smoke'
git push origin recovery/system-stabilization-2026-11
```

Don't `git add .`, merge to `main`, or run destructive Playwright against staging. Preserve uncommitted `InviteCallback` and Supabase-client edits.

## Exit criteria for this batch

- Offline safety guard unit tests pass.
- Vitest member session test passes and old CI failure is resolved.
- Real read-only browser smoke passes against the reviewed preview and correct staging backend.
- GitHub Actions source-quality, secret scan and Phase 0 safety are green.
- No staging data was mutated or broad delete/reset attempted.

Full authentication, real write/persistence, cross-tenant permissions and all 27 report findings remain subject to later controlled tests and repair phases. Tenant isolation **does not** remove the need for a disposable backend for destructive tests.
