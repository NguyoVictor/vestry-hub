# Phase 1: Fix Preview-to-Supabase backend mismatch

## Root cause (confirmed on published recovery branch)

The published `src/integrations/supabase/client.ts` is hard-coded to
`https://crjdsxxkspvdwknrmijs.supabase.co` (churchapp), whereas the intended
Vestry Hub staging backend is `https://xwbajophstetbnnemsyq.supabase.co`.
The browser test correctly blocked that unrelated backend. A Vercel environment
variable cannot override a URL that the source code hard-codes.

The supplied pre-Phase-0 local backup already contains a reviewed, **uncommitted**
client.ts change that reads `import.meta.env.VITE_SUPABASE_URL` and
`import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`. Do not overwrite or reset that file.

### A. Review the existing local client edit

```bash
git diff -- src/integrations/supabase/client.ts
node scripts/qa/check-supabase-client-source.mjs
node --test scripts/qa/check-supabase-client-source.node.test.mjs
```

If the audit fails, inspect local client.ts and use this exact pattern for the two
constants, preserving the rest of the client/session fetch logic:

```ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase environment configuration');
}
```

Never put service_role or Supabase secret keys in `VITE_` variables.

### B. Verify Preview build variables in Vercel dashboard

Project `vestry-hub` -> Settings -> Environment Variables. Check that **Preview**
(and any branch-specific Preview override) uses:

- `VITE_SUPABASE_URL`: `https://xwbajophstetbnnemsyq.supabase.co`
- `VITE_SUPABASE_PROJECT_ID`: `xwbajophstetbnnemsyq` (if present)
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the public/publishable key of *vestry-hub-staging*, NOT churchapp

Do not print, share or commit key values. Review Preview scope rather than
modifying Production inadvertently. Vite embeds the values at **build time**.
You must create a **new** Preview deployment after correcting the source / vars.

### C. Commit only reviewed source and Phase 1 files

The only already-existing local code change required for the backend is
`src/integrations/supabase/client.ts`. Verify its diff before staging it.
Other uncommitted files such as `src/pages/auth/InviteCallback.tsx` must be left alone.

```bash
git add src/integrations/supabase/client.ts \
  .github/workflows/p1-p2-quality.yml \
  e2e/qa/staging-readonly.spec.ts \
  scripts/qa/check-supabase-client-source.mjs \
  scripts/qa/check-supabase-client-source.node.test.mjs \
  docs/recovery/PHASE1_PREVIEW_BACKEND_FIX.md
# If the earlier Phase 1 files are still uncommitted, stage those exact files
# separately using their README; never use git add .
git diff --cached --check
git diff --cached --name-status
```

Run your TypeScript, Vitest, and build checks as recommended in the original
Phase 1 package. Commit and push ONLY after passing local checks; stay on
`recovery/system-stabilization-2026-11`. Do not merge to main.

### D. Verify against newly built Vercel Preview

Wait until the new recovery Preview shows READY and matches the latest commit.
Update BOTH `PW_STAGING_BASE_URL` and `PW_STAGING_ALLOWED_HOST` to that Preview;
keep `PW_STAGING_SUPABASE_URL=https://xwbajophstetbnnemsyq.supabase.co`.
Use `vc env run -- bash scripts/qa/staging-readonly-run.sh` and require all
16 existing offline tests plus the two genuine browser tests to pass.

The test now awaits in-flight route handlers during teardown. Any unexpected
third-party POST (such as Google analytics) remains blocked and reported; do not
relax write or cross-project guards to make the test green. Inspect any such
remaining error and create a narrowly reviewed telemetry exception separately.
