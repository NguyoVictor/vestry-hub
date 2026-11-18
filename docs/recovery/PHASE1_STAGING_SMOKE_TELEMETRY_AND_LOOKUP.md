# Phase 1 browser smoke correction — tenant lookup and Sentry telemetry

**Scope:** existing recovery branch only: `recovery/system-stabilization-2026-11`.

## Evidence behind this patch

The previous run proved Vercel Preview OIDC authentication now works; Playwright reached the login form and the member route. The 13 offline guard tests passed. Two remaining failures were:

1. `lookupRequests === 0` after entering a 9-character synthetic access code. This is **not** proof of a backend bug yet. The test only counted GETs to the expected staging `/rest/v1/tenants` endpoint and did not show other network destinations or page exceptions before timing out.
2. A blocked `POST` to a specific Sentry ingestion endpoint (`o4511190534979584.ingest.de.sentry.io`) was treated as an unsafe application write, despite the fact that the browser guard correctly blocked it.

## Changes

- The member-login smoke explicitly tests both advertised client behaviors of `src/pages/member/MemberLogin.tsx`: `?code=QATEST999` URL prefill, and typing `QATEST998` into the church-code input. Both must issue a GET to the **approved staging Supabase** `/rest/v1/tenants` endpoint. A synthetic non-existent code requires no real member credentials and doesn't submit the login form.
- If no lookup occurs, the test fails with a diagnostic list of Supabase *methods, origins, and URL paths only*. It intentionally does not print query strings, API tokens, headers, email, or response bodies. This helps identify wrong Vercel `VITE_SUPABASE_URL` configuration versus a missing React network call.
- The request guard now recognizes only Sentry POSTs to exact-shaped ingestion endpoints as *expected blocked telemetry*. It still **aborts every POST** (including Sentry) and treats all other unauthorized writes as test failures. The browser also asserts no uncaught JavaScript errors on either route.
- Three additional Node safety tests prove no writes are newly permitted and unexpected Sentry-looking endpoints remain test failures.

These are test harness and diagnostic improvements, **not a claim that member-login functionality has been repaired**. If the stricter tenant-lookup assertion fails again, the new diagnostic evidence should guide the actual application fix.

## Install (Python 3.8+)

From the existing Vestry Hub repo root:

```bash
mkdir -p "$HOME/Downloads/vestry-phase1-smoke-followup"
unzip -q "$HOME/Downloads/vestry-hub-phase1-staging-smoke-followup.zip" -d "$HOME/Downloads/vestry-phase1-smoke-followup"
python3 "$HOME/Downloads/vestry-phase1-smoke-followup/install.py" --check .
# Proceed only when conflicts=0:
python3 "$HOME/Downloads/vestry-phase1-smoke-followup/install.py" --apply .
```

The installer only accepts file contents matching the **previous installed Phase 1 Vercel Preview auth patch**; it refuses unknown changes instead of overwriting them. It never accesses Supabase/Vercel, commits or pushes.

## Verify offline

```bash
node --test scripts/qa/staging-readonly-guard.node.test.mjs scripts/qa/staging-preview-auth.node.test.mjs
npx tsc --noEmit
npx playwright test --config playwright.staging-readonly.config.ts --list
```

The last command uses the environment variables described below and does **not** execute browsers. If they are not exported, skip the `--list` command until after exporting them.

## Run the protected Preview smoke

Keep your reviewed Preview URL and staging settings from the prior run, for example:

```bash
export PW_STAGING_READONLY=1
export PW_STAGING_BASE_URL="https://vestry-jsys1t4jq-nguyovictors-projects.vercel.app"
export PW_STAGING_ALLOWED_HOST="vestry-jsys1t4jq-nguyovictors-projects.vercel.app"
export PW_STAGING_SUPABASE_URL="https://xwbajophstetbnnemsyq.supabase.co"
export PW_VERCEL_PREVIEW_AUTH=oidc
vc env run -- bash scripts/qa/staging-readonly-run.sh
```

**Important:** Use the **latest READY Preview** corresponding to the recovery-branch commit you want to test; do not use Production. Never print or commit `VERCEL_OIDC_TOKEN` or `.env.local`.

If the first test still fails, inspect the new `Observed Supabase requests` and `Browser exceptions` diagnostics. If the backend origin is different, verify Vercel's Preview `VITE_SUPABASE_URL` and the built frontend; do not switch the test to an unapproved backend. If the request list is empty, investigate React browser execution, route and `src/pages/member/MemberLogin.tsx` input handlers.

## Stage and push on the same branch

The initial Phase 1 package may still be uncommitted on your laptop. To ensure the base plus this correction are available to GitHub CI, stage **only** these explicit paths (not `git add .`):

```bash
git add \
  .github/workflows/p1-p2-quality.yml \
  docs/recovery/PHASE1_STAGING_READONLY_QA.md \
  docs/recovery/PHASE1_VERCEL_PREVIEW_AUTH.md \
  docs/recovery/PHASE1_STAGING_SMOKE_TELEMETRY_AND_LOOKUP.md \
  e2e/qa/staging-readonly.spec.ts \
  package.json \
  playwright.staging-readonly.config.ts \
  scripts/qa/staging-readonly-guard.mjs \
  scripts/qa/staging-readonly-guard.node.test.mjs \
  scripts/qa/staging-readonly-run.sh \
  scripts/qa/staging-tenant-inventory.sql \
  scripts/qa/staging-preview-auth.mjs \
  scripts/qa/staging-preview-auth.node.test.mjs \
  src/test/p1/people/memberRegistration.test.tsx \
  src/test/p1/people/memberSessionProvider.behavior.test.tsx

git diff --cached --check
git diff --cached --name-status
# When offline and browser checks pass, or failures have been recorded and deliberately agreed as tests under investigation:
git commit -m "test(recovery): diagnose staging tenant lookup and block expected Sentry telemetry"
git push origin recovery/system-stabilization-2026-11
```

Do not stage unrelated uncommitted auth callback changes, `.env`, `.vercel`, `supabase/.temp` or downloaded ZIPs. Never merge into `main` at this stage.

**Acceptance:** offline tests passing is necessary but not sufficient. Live browser checks are marked PASS only when BOTH tests pass against the reviewed Preview, and the real staging backend is verified from the browser. The read-only suite does not replace later scoped CRUD and tenant-isolation tests.
