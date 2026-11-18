# Phase 1 — protected Vercel Preview Playwright repair

The browser failures were Vercel Deployment Protection redirects, not verified Vestry Hub regressions. Both tests loaded Vercel's SSO page instead of the application.

## Safe access procedure

Stay on branch `recovery/system-stabilization-2026-11`. Do not change the Supabase backend or disable Vercel Deployment Protection.

1. Choose a **READY, Preview** deployment for this exact branch under the `nguyovictors-projects/vestry-hub` Vercel project.
2. On your workstation, check the Vercel CLI: `vc --version` and `vc whoami`. If not installed, use the official Vercel CLI installation instructions. Authenticate with `vc login` *only if not already authenticated*.
3. Check that `.vercel/project.json` is linked to **vestry-hub** / `nguyovictors-projects`; `vc link` only if needed. Do not check `.vercel` directory into Git.
4. From the Vestry Hub repo root, export the exact Preview host and matching staging Supabase origin:

```bash
export PW_STAGING_READONLY=1
export PW_STAGING_BASE_URL='https://REPLACE_EXACT_PREVIEW.vercel.app'
export PW_STAGING_ALLOWED_HOST='REPLACE_EXACT_PREVIEW.vercel.app'
export PW_STAGING_SUPABASE_URL='https://xwbajophstetbnnemsyq.supabase.co'
export PW_VERCEL_PREVIEW_AUTH=oidc
vc env run -- bash scripts/qa/staging-readonly-run.sh
```

The Vercel CLI injects a **short-lived development OIDC credential** into the command's environment. The script never prints it. Playwright forwards it **only to the exact Preview origin**, never in `extraHTTPHeaders` for all domains. `maxRedirects: 0` prevents leaking it to a redirected login domain. Browser tracing is disabled while an OIDC token is active to avoid recording protected request headers in trace artifacts. Browser traffic to Supabase remains read-only, with all POST/PATCH/PUT/DELETE requests blocked; service workers are disabled.

**Do not run** `PW_PLATFORM_TEST_ENV=disposable` against this shared staging Supabase project.

### Access failure triage

- If `vc` does not exist, install the CLI using Vercel's official instructions; then `vc whoami`.
- If `vc env run` fails, verify the CLI version, authentication, and project link. Do not print `VERCEL_OIDC_TOKEN` or any `.env` contents.
- If OIDC is missing, the script exits early with an actionable error.
- If OIDC is rejected, make sure the target is a Preview of the **same linked Vercel project** and that the Vercel account has project access. If your organization customized Trusted Sources, check those rules with the project owner; don't disable protection.
- If Vestry Hub's email field becomes visible but another assertion fails, inspect the Playwright trace: this is now an **application** failure rather than a Vercel access failure.
- If browser gets Vercel login with no token, rerun with `PW_VERCEL_PREVIEW_AUTH=oidc vc env run -- ...` after authentication.

### Local offline verification

```bash
node --test scripts/qa/staging-readonly-guard.node.test.mjs scripts/qa/staging-preview-auth.node.test.mjs
npx tsc --noEmit
npx playwright test --config playwright.staging-readonly.config.ts --list
```

The last command needs the `PW_STAGING_*` variables but not a valid Vercel token because it only discovers tests. The real browser run additionally requires authenticated Preview access. No database writes, Vercel setting changes, Git branches, migrations or deployment operations are performed by this fix.

### Commit only files in this patch

```bash
git add \
  docs/recovery/PHASE1_VERCEL_PREVIEW_AUTH.md \
  e2e/qa/staging-readonly.spec.ts \
  playwright.staging-readonly.config.ts \
  scripts/qa/staging-preview-auth.mjs \
  scripts/qa/staging-preview-auth.node.test.mjs \
  scripts/qa/staging-readonly-run.sh
git diff --cached --check
git diff --cached --name-status
git commit -m 'test(recovery): authenticate protected previews with scoped Vercel OIDC'
git push origin recovery/system-stabilization-2026-11
```

Do not `git add .`, force-push, change `main` or commit credentials. The earlier uncommitted invitation-callback fixes stay separate.
