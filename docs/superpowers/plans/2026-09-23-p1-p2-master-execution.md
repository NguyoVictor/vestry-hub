# P1 + P2 Master Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute all approved P1 and P2 plans on one isolated branch, verify production-safe database/application behavior, then deliver the complete updated project ZIP and change documentation before the final Git push.

**Architecture:** Five subsystem plans are executed sequentially because later infrastructure/QA work depends on earlier domain contracts. Source control remains isolated from `main`; database changes are migration-backed and verified; final packaging happens before the remote push as requested.

**Tech Stack:** Git/GitHub, React/Vite/TypeScript, Supabase/Postgres/Edge Functions/Queues, Vercel, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-09-p1-p2-master-delivery-contract.md`

## Global Constraints

- Branch: `p1-p2-product-hardening`.
- Do not push until implementation, verification, documentation, and project ZIP are complete.
- Do not commit `.env*`, Vercel auth material, service-role keys, PATs, or provider secrets.
- Production database changes occur only through reviewed migration/Edge Function deployment steps with post-change verification.
- No completion claim without fresh verification evidence.

## Review Focus

- Main branch changing accidentally before the final push gate.
- A production migration applied without its exact source migration file present in the package.
- Generated ZIP containing `.env.local`, `.git`, `node_modules`, or secret-bearing artifacts.
- P1/P2 tests passing locally while the deployed Supabase/Vercel state still points at old functions/schema.
- Final documentation describing intended changes rather than the changes actually verified.

---

### Task 1: Create isolated execution workspace

**Files:**
- Add: all approved specs under `docs/superpowers/specs/`
- Add: all implementation plans under `docs/superpowers/plans/`

- [ ] **Step 1:** Fetch current `main` and record the exact baseline SHA.
- [ ] **Step 2:** Create an isolated worktree using the required git-worktree workflow and branch `p1-p2-product-hardening`.
- [ ] **Step 3:** Confirm `git status --short` is clean before copying specs/plans.
- [ ] **Step 4:** Add the approved spec/plan documents only and commit them as the first branch commit.
- [ ] **Step 5:** Record the branch SHA in the implementation log.

### Task 2: Execute P1 People plan

- [ ] **Step 1:** Follow `docs/superpowers/plans/2026-09-23-p1-people-implementation.md` task-by-task with TDD.
- [ ] **Step 2:** Apply and verify required People migrations in the controlled environment.
- [ ] **Step 3:** Do not continue until the People closeout tests/build/advisors are green or any accepted limitation is explicitly documented.

### Task 3: Execute P1 Operations plan

- [ ] **Step 1:** Follow `docs/superpowers/plans/2026-09-23-p1-operations-implementation.md`.
- [ ] **Step 2:** Verify Operations parity/tenant tests before continuing.

### Task 4: Execute P1 Engagement and Analytics plan

- [ ] **Step 1:** Follow `docs/superpowers/plans/2026-09-23-p1-engagement-analytics-implementation.md`.
- [ ] **Step 2:** Verify analytics parity and engagement security before continuing.

### Task 5: Execute P2 Infrastructure plan

- [ ] **Step 1:** Re-check current Supabase changelog/docs for Queues, Cron, Edge Functions, and security guidance before implementation.
- [ ] **Step 2:** Follow `docs/superpowers/plans/2026-09-23-p2-infrastructure-implementation.md`.
- [ ] **Step 3:** Verify each production/staging schema/function change immediately after application.

### Task 6: Execute P2 Platform QA plan

- [ ] **Step 1:** Follow `docs/superpowers/plans/2026-09-23-p2-platform-qa-implementation.md`.
- [ ] **Step 2:** Run the full platform regression only against the explicitly safe test environment/tenants.

### Task 7: Full verification gate

**Files:**
- Create: `docs/closeout/p1-p2-verification.md`

- [ ] **Step 1:** Run `npm run build` and save the fresh result.
- [ ] **Step 2:** Run the P1/P2 Vitest contract suites.
- [ ] **Step 3:** Run the P1/P2 Playwright suites including tenant-boundary, imports/exports, queues, and payments.
- [ ] **Step 4:** Run repository secret scans, including JWT-shaped token scan and service-role key-name/value checks.
- [ ] **Step 5:** Verify Supabase migration history, live schema, RLS/grants, Edge Functions, queue/cron state, and security/DDL advisors.
- [ ] **Step 6:** Verify Vercel preview build/deployment from the branch when remote preview is available.
- [ ] **Step 7:** Record exact commands/results and any accepted non-P1/P2 legacy failures in `docs/closeout/p1-p2-verification.md`.

### Task 8: Final documentation package

**Files:**
- Create: `docs/closeout/P1_P2_CHANGELOG.md`
- Create: `docs/closeout/P1_P2_DATABASE_AND_EDGE_FUNCTIONS.md`
- Create: `docs/closeout/P1_P2_DEPLOYMENT.md`
- Create: `docs/closeout/P1_P2_KNOWN_LIMITATIONS.md`

- [ ] **Step 1:** Summarize actual verified P1 changes by People, Operations, Engagement/Analytics.
- [ ] **Step 2:** Summarize actual verified P2 Infrastructure and QA changes.
- [ ] **Step 3:** List every added migration and Edge Function plus deployment order and required secret names without secret values.
- [ ] **Step 4:** Document remaining accepted limitations only if they were observed and intentionally deferred.
- [ ] **Step 5:** Commit documentation with `git commit -m "docs: add P1 P2 closeout package"`.

### Task 9: Create the complete updated project ZIP before push

**Files:**
- Create outside repository: `vestry-hub-p1-p2-complete.zip`
- Create outside repository: `vestry-hub-p1-p2-complete.sha256`

- [ ] **Step 1:** Verify the worktree is clean except for intentionally uncommitted files, which must be resolved before packaging.
- [ ] **Step 2:** Build an archive excluding `.git`, `node_modules`, `dist`, caches, `.env*`, `.vercel`, Playwright reports/screenshots, and other ignored secret/private files.
- [ ] **Step 3:** Scan the extracted archive for JWT-shaped tokens, `SUPABASE_SERVICE_ROLE_KEY=`, PAT-like values, and private `.env` files.
- [ ] **Step 4:** Generate SHA-256 checksum and a file manifest.
- [ ] **Step 5:** Provide the ZIP, checksum, manifest, and closeout docs to the user before any Git push.

### Task 10: Final source-control and deployment gate

- [ ] **Step 1:** After user review of the package, run `git status --short`, `git log --oneline --decorate -n 20`, and a final secret scan.
- [ ] **Step 2:** Push `p1-p2-product-hardening` as the final source-control upload step.
- [ ] **Step 3:** Verify the remote branch points at the exact intended local SHA using the authenticated GitHub connector.
- [ ] **Step 4:** Create/review PR to `main` only after the user agrees.
- [ ] **Step 5:** Verify Vercel Preview and, after merge, production deployment plus Supabase live state against the merged commit.
