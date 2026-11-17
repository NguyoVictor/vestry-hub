# Vestry Hub — Phase 0: environment protection, backups, migration baseline and QA gate

**Branch:** `recovery/system-stabilization-2026-11` (stay on it; do not create another Git branch).
**Scope:** safety configuration and verification, not any of the 27 functional repairs.
**Status when packaged:** local configuration complete; **cloud backup, restore rehearsal and isolated QA setup still require account-side execution**. Do not mark Phase 0 passed until the acceptance table is checked.

## A. What this solution changes

| Path | Purpose |
|---|---|
| `e2e/platform/fixtures/safety.ts` | Hard-denies destructive E2E on Vestry staging and older churchapp; checks explicit disposable ref, frontend/backend URL, app host and distinct tenants; permits local Docker Supabase QA |
| `src/test/p1/people/recoveryE2ESafety.test.ts` | Focused Vitest safety regression cases |
| `scripts/recovery/phase0-safety.node.test.mjs` | Six dependency-free tests of the actual safety guard, runnable in CI without secrets |
| `scripts/recovery/phase0-verify.mjs` | Read-only Git branch, migration checksum, CLI link and QA `.env` check |
| `scripts/recovery/phase0-migrations.json` | Exact 312-version baseline verified against staging on 2026-11-17 |
| `scripts/recovery/phase0-live-audit.sql` | Read-only live schema, RLS, function exposure and bucket inventory |
| `scripts/recovery/phase0-backup.sh` | Encrypted logical backup helper requiring staging identity and an explicit off-repo folder |
| `.github/workflows/phase0-safety.yml` | Offline safety job on recovery branch; no destructive tests or secrets |
| `.env.qa.example` | Safe template for disposable QA backend; never put real values in Git |
| `.gitignore` | Ignore CLI link metadata, private backups and local QA secrets for future commits |

**What it does NOT do:** create a backup, make a new Supabase project, set actual QA credentials, restore a database, change production Vercel, add migration history, or fix application errors. Those actions need separately verified targets and some require the account holder to configure/approve them.

## B. Install and check locally

Use the ZIP install script (`install.sh --check` then `install.sh --apply`) from your existing Vestry Hub working directory. It rejects collisions with modified existing files and checks your branch. The existing uncommitted invitation fixes remain untouched.

```bash
node scripts/recovery/phase0-verify.mjs
node --experimental-strip-types --test scripts/recovery/phase0-safety.node.test.mjs
npx vitest run src/test/p1/people/recoveryE2ESafety.test.ts
```

The Vitest command requires installed Node dependencies; offline Node tests have no NPM dependencies. Run `npm ci` if necessary, after reviewing your existing lockfile. Never use `git reset --hard` or apply previous solution ZIPs wholesale.

## C. Check correct Supabase project *before any write-capable CLI command*

- Intended staging Supabase: `xwbajophstetbnnemsyq` / `vestry-hub-staging` (`eu-west-3`).
- Existing non-disposable older project: `crjdsxxkspvdwknrmijs` / `churchapp` (`eu-west-1`).
- Staging Vercel Preview and Production are presently configured with the **same** staging Supabase URL. Neither is a disposable QA target.
- The local `.temp/project-ref` in the uploaded snapshot points at staging, while `supabase/config.toml` declares the older local project ID. The latter is not necessarily the linked remote; don't blindly rewrite it.

Verify from repo root:

```bash
cat supabase/.temp/project-ref                  # expect xwbajophstetbnnemsyq
npx supabase --version
npx supabase migration list --linked            # read-only; review project target first
```

Do not run `supabase db reset --linked`, `db push`, `migration repair`, or bulk `functions deploy` during Phase 0. We have verified that the **312 version IDs** in local source and remote history match; body/behavior still need auditing. A migration cannot be considered reproduced merely because the IDs exist.

### One-time hygiene for CLI files already tracked in Git

The existing repo tracks `supabase/.temp/` metadata; adding `.gitignore` alone does not untrack those files. After reviewing `git status --short`, remove only the **Git index entries** with:

```bash
git rm -r --cached supabase/.temp
```

This leaves your local files on disk and stages deletions in Git. Review the staged diff before including this action in the Phase 0 commit; do not accidentally remove `supabase/config.toml` or migration files.

## D. Complete the **staging database backup** gate

1. Open https://supabase.com/dashboard/project/xwbajophstetbnnemsyq/database/backups/scheduled and verify a **recent restorable snapshot** exists, its timestamp, retention, and restore option. Availability depends on plan. Capture only status/time as evidence, never personal data or backup contents.
2. Create a second encrypted logical export if you have access. Install PostgreSQL 17+ client (`pg_dump`), `age`, and configure PostgreSQL `PGHOST`, `PGUSER`, `PGPORT`, `PGDATABASE=postgres`, `PGSSLMODE=require`. Obtain values privately from the Supabase **Connect** panel. Provide `PGPASSWORD` through a hidden prompt or `.pgpass`; never store credentials in repo or terminal history.
3. Generate an `age` public encryption recipient and store the private identity separately from the backup. Then run:

```bash
export BACKUP_ROOT="$HOME/vestry-secure-backups"
export AGE_RECIPIENT='age1...YOUR-PUBLIC-RECIPIENT...'
# PGHOST/PGUSER/PGPORT/PGDATABASE/PGPASSWORD/PGSSLMODE must already be set securely.
bash scripts/recovery/phase0-backup.sh
```

The helper refuses a database identity that does not clearly reference staging and refuses to write inside Git. It produces an encrypted `database.pgcustom.age` and its checksum. It does not show or commit secrets. This is an optional supplementary logical snapshot and does **not** replace Supabase platform backups.

4. Verify the ciphertext checksum: from the backup folder, run `sha256sum -c SHA256SUMS`.
5. Prove that the archive is readable without restoring anything:

```bash
age -d -i '/private/path/to/age-identity.txt' '/private/path/to/database.pgcustom.age' | pg_restore --list - > /dev/null
```

6. A **real restore rehearsal** still requires an isolated authorized database. Verify the target identity twice and never restore into staging or the older `churchapp` project. A successful `pg_restore --list` only verifies format readability, not full restore integrity or application usability. For a managed Supabase restore, use the documented supported approach and expect platform-owned roles/extensions to require adaptation.

**Storage is separate.** Supabase PostgreSQL backups contain only Storage metadata, not actual uploaded binary objects. Inventory the 19 current buckets and separately preserve important Storage objects through the Storage UI/approved API into private protected storage. Avoid exposing tenant files or creating public buckets.

Official docs: https://supabase.com/docs/guides/platform/backups , https://supabase.com/docs/reference/cli/supabase-db-dump

## E. Run the **live schema and security audit** safely

Against the **verified staging connection only**, use Supabase SQL Editor and paste `scripts/recovery/phase0-live-audit.sql`. It performs metadata SELECT queries only. Or if PostgreSQL connection environment is already configured, run `psql -X -v ON_ERROR_STOP=1 -f scripts/recovery/phase0-live-audit.sql`.

Compare with the verified baseline:

- 219 public tables, RLS enabled on all 219; 65 public routines, 26 SECURITY DEFINER routines.
- `chart_of_accounts` is absent while `seed_chart_of_accounts()` references it. **Known broken dependency**; fix later with a reviewed finance migration, not by blindly adding a table.
- `fellowship_members.role` is absent. Reconcile frontend query later; don't add an unused column just to satisfy a bad SELECT.
- 19 Storage buckets; `facility-thumbnails`, `incident-attachments`, `church-media`, `church-logos` absent. Confirm names, object paths and policies before adding any.
- Nine deployed Edge Functions; code contains many more. Do not bulk-deploy.
- Security advisor: 44 RLS/no-policy INFO, 30 mutable function search paths, 8 anonymous privileged function grants, 8 authenticated privileged function grants, one leaked-password warning. Examine true exposures, not just count findings. Some no-policy tables are deliberately inaccessible.

Record unexpected differences in the issue tracker and fix them in the relevant implementation phase. Only create **new forward migrations** after confirming design and taking the backup.

## F. Configure isolated QA for destructive Playwright (required gate)

**Preferred:** a separate, explicitly disposable Supabase QA project and its own QA app deployment. A new hosted Supabase project might incur charges; confirm before creating it. **Alternative:** local Docker Supabase on loopback `http://127.0.0.1:54321`, if the full migration stack can be replayed and seeded; CLI/Docker may require significant RAM.

1. Create or start the isolated backend. Do **not** reuse `xwbajophstetbnnemsyq` or `crjdsxxkspvdwknrmijs`.
2. Verify schema replay and two **test-only** tenants. Prepare test-only admin and member accounts and their exact tenant IDs, never real church accounts. Ensure the test app is deployed/built with QA-specific `VITE_SUPABASE_URL` and QA publishable/anon keys; never use a service role in frontend.
3. Copy the committed template to a local ignored file: `cp .env.qa.example .env.qa.local`. Fill only QA values. For local Vite use `npm run dev -- --mode qa`; preview/test commands must use the same QA backend.
4. Configure the E2E runner with these names in its **private** shell/CI environment:

```text
PW_PLATFORM_TEST_ENV=disposable
PW_QA_PROJECT_REF=<exact-qa-project-ref>  # or local, for http://127.0.0.1:54321
PW_SUPABASE_URL=<exact-qa-backend-url>
PW_FRONTEND_SUPABASE_URL=<backend-url-observed-in-built-qa-app>
PW_BASE_URL=<local-qa-app-url>             # default http://127.0.0.1:4173
PW_QA_APP_HOST=<exact-qa-host>             # only for nonlocal QA app URLs
PW_TENANT_A_ID=<disposable-tenant-a-id>
PW_TENANT_B_ID=<disposable-tenant-b-id>
```

These are placeholders **not actual credentials**. Keep test service-role keys and actor tokens in private CI secrets only. Before destructive tests, verify actual browser network calls go to the QA project (not staging). A declared environment variable by itself cannot prove where the built client connects.

5. Run `node --experimental-strip-types --test scripts/recovery/phase0-safety.node.test.mjs` before enabling any Playwright suite. Existing GitHub `platform-e2e` remains **disabled** intentionally until the real disposable backend is verified, seeded, reachable, and cleanup behavior proven. Do not remove the `if: false` gate merely because local tests pass.
6. Set up safe CI secrets on GitHub **only after** isolation works; restrict the environment, use least privilege, and prohibit real user data in fixture artifacts.

## G. Protect `main` and Vercel production

The current Vercel project `nguyovictors-projects/vestry-hub` deploys both Preview and Production with staging Supabase configuration. This is an existing risk; do not overwrite working settings without reviewing the live domains and release strategy.

In GitHub repository Settings > Branches / Rulesets, protect `main`: block direct pushes, require a PR and passing checks, restrict force pushes/deletions and require an explicit release approver. If the GitHub integration cannot edit these settings, the repository owner must do it.

In Vercel Project Settings > Git/Environments, verify the configured Production Branch and its currently assigned production domains. Confirm that a merge to `main` would trigger a production deployment; do not merge until the release gate. Ideally create a separate staging Vercel project backed by staging Supabase, and reserve a distinct production Vercel project plus separate production Supabase for later. Do not buy resources or change live domains without confirming the desired layout.

## H. Phase 0 exit checklist

- [x] Existing Git branch preserved and local source inspected.
- [x] 312 migration versions independently reconciled (2026-11-17).
- [x] Local preflight, six Node safety tests and scripts provided; tests passed in the recovered snapshot.
- [x] Read-only live schema and Storage inventory established, issues recorded.
- [ ] ZIP installed and pushed to the existing recovery branch by repo owner.
- [ ] Verified, restorable staging platform backup or secure logical export.
- [ ] Critical Storage **binaries** backed up separately.
- [ ] Actual restore successfully rehearsed against a disposable target.
- [ ] Disposable QA backend and separate test tenants created/seeded/verified.
- [ ] QA frontend network calls proven to target QA backend.
- [ ] Production branch protection and Vercel release behavior verified.
- [ ] Security advisor warnings triaged or assigned with explicit risk acceptance.

**If any unchecked gate remains, Phase 0 is configured locally but NOT COMPLETE.** Proceeding with safe offline Phase 1 code work is possible, but destructive tests or production merge remain prohibited.
