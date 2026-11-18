# Phase 1B.1: Read-only staging telemetry follow-up

This narrowly scoped test-only patch addresses background Google Analytics
POST requests seen in the read-only Playwright smoke against the Phase 1B.1
Vercel Preview commit `c13af50`.

## What failed

- 16/16 **offline safety tests passed**.
- 1/2 **browser tests passed**.
- The member-login read-only test correctly observed staging tenant GETs, but
  reported blocked Google collection POSTs as functional write violations.
- The application and Supabase backend checks were not the cause of this run's failure.

## Correction

The Playwright request interception still calls `route.abort('blockedbyclient')`
for **every** POST, PUT, PATCH and DELETE. An exact HTTPS POST to a reviewed
Google Analytics collection endpoint is now treated like the existing Sentry
telemetry noise: blocked, but not counted as a functional write violation.

Reviewed endpoints (host+path exact; query parameters are irrelevant):

- `www.google-analytics.com`: `/g/collect`, `/collect`, `/j/collect`
- `www.google.com`: `/g/collect`, `/ccm/collect`

No broad hostname allowlist, redirect following, request forwarding, or waiver
for application writes / Supabase writes. Unknown Google POST paths still fail;
for recognized Google hostnames their **path only** is reported (never query
parameters, access tokens, headers, or bodies).

## Install (Python 3.8+; recovery branch only)

From repository root:

```bash
mkdir -p "$HOME/Downloads/vestry-telemetry-fix"
unzip -q "$HOME/Downloads/vestry-hub-phase1b1-readonly-telemetry-fix.zip" -d "$HOME/Downloads/vestry-telemetry-fix"
python3 "$HOME/Downloads/vestry-telemetry-fix/install.py" --check .
# Apply ONLY when the check returns zero conflicts:
python3 "$HOME/Downloads/vestry-telemetry-fix/install.py" --apply .
```

## Offline verification

```bash
node --test scripts/qa/staging-preview-auth.node.test.mjs scripts/qa/staging-readonly-guard.node.test.mjs
node scripts/qa/check-supabase-client-source.mjs
npx tsc --noEmit
npm run build
```

## Re-run protected read-only Preview

Use the same ready and tested commit `c13af50` Preview URL; no new Preview
deployment is needed just to run these local QA script changes.

```bash
vc env run -- env \
  PW_STAGING_READONLY=1 \
  PW_STAGING_BASE_URL="https://vestry-bkh2j05jx-nguyovictors-projects.vercel.app" \
  PW_STAGING_ALLOWED_HOST="vestry-bkh2j05jx-nguyovictors-projects.vercel.app" \
  PW_STAGING_SUPABASE_URL="https://xwbajophstetbnnemsyq.supabase.co" \
  PW_VERCEL_PREVIEW_AUTH=oidc \
  bash scripts/qa/staging-readonly-run.sh
```

Expected: 20/20 offline safety tests (16 prior + 4 additional) and 2/2 browser tests.
If unknown Google POST paths remain, the test will still fail and print their
path without URL query parameters. Share that sanitized output before expanding
allowlisted collection paths. Never disable the non-read-only request guard.

## Commit, only after tests pass

```bash
git add -- scripts/qa/staging-preview-auth.mjs scripts/qa/staging-preview-auth.node.test.mjs docs/recovery/PHASE1B1_STAGING_SMOKE_TELEMETRY_FIX.md
git diff --cached --check
git diff --cached --name-status
git commit -m "test(recovery): block expected analytics collection without false smoke failures"
git push origin recovery/system-stabilization-2026-11
```

This patch makes **no database schema edits, backend deployments, credentials
changes, or production changes**. The staging smoke remains read-only. Keep
other unfinished source changes unstaged.
