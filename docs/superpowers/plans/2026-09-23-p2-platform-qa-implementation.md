# P2 Platform QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a repeatable platform-wide regression suite covering routes, meaningful controls, forms, QR codes, imports/exports, permission combinations, tenant boundaries, and the P2 queue/payment infrastructure.

**Architecture:** Add a maintained action manifest, shared disposable tenant/actor fixtures, platform-level Playwright suites, and direct Supabase contract tests. Keep the existing Song Library E2E suite, but stop treating it as the platform-wide test strategy.

**Tech Stack:** Playwright 1.57, Vitest 3.2, Supabase test fixtures, React Testing Library, CSV/PDF fixture assertions.

**Spec:** `docs/superpowers/specs/2026-09-09-p2-platform-qa-design.md`

## Global Constraints

- Automated destructive tests operate only on disposable/dedicated test tenants.
- UI visibility is not proof of authorization; direct database/API denial tests are required.
- Every manifest action must map to a concrete automated test or an explicitly documented manual exception.
- Imports must never trust tenant IDs embedded in input files.
- Exports must prove absence of foreign-tenant rows.

## Review Focus

- Route smoke tests passing while pages log fatal console errors.
- Action manifest drift when new controls/routes are added.
- File download tests checking only filename instead of content/tenant isolation.
- Permission tests validating hidden buttons but not bypassed server calls.
- Destructive E2E accidentally pointing at production customer tenants.

---

### Task 1: Platform fixture safety and Playwright baseline

**Files:**
- Modify: `playwright.config.ts`
- Create: `e2e/platform/fixtures/auth.ts`
- Create: `e2e/platform/fixtures/tenants.ts`
- Create: `e2e/platform/fixtures/supabase.ts`
- Create: `e2e/platform/fixtures/safety.ts`
- Modify: `package.json`

**Interfaces:** Produces Tenant A/Tenant B, full/read-only/limited Admin, Member A/Member B, and environment safety checks.

- [ ] **Step 1:** Add a failing safety test that refuses to run destructive platform E2E without an explicit test-environment marker and disposable tenant IDs.
- [ ] **Step 2:** Run the safety test and confirm failure in an unconfigured environment.
- [ ] **Step 3:** Implement fixture guards and project-level Playwright config without breaking `e2e/song-library`.
- [ ] **Step 4:** Add `test:e2e:platform`, `test:e2e:tenant-boundary`, and `test:e2e:p1-p2` scripts.
- [ ] **Step 5:** Commit with `git commit -m "test: add safe platform e2e fixtures"`.

### Task 2: Action manifest and route inventory

**Files:**
- Create: `e2e/platform/action-manifest.ts`
- Create: `e2e/platform/routes.spec.ts`
- Test input: `src/App.tsx`, `src/config/navigation.ts`, member route definitions.

**Interfaces:** Produces `PLATFORM_ACTIONS` and `PLATFORM_ROUTES` typed inventories.

- [ ] **Step 1:** Define a typed manifest entry with route, actor, module, action, expected state, permission, outcome, and destructive flag.
- [ ] **Step 2:** Seed entries for all registered Admin/Member routes and critical actions from P1/P2 scope.
- [ ] **Step 3:** Add route smoke assertions that fail on HTTP/navigation failure, page error marker, or browser console error.
- [ ] **Step 4:** Add a manifest-consistency test that fails when an action has no test reference.
- [ ] **Step 5:** Commit with `git commit -m "test: add platform action and route manifest"`.

### Task 3: Buttons, links, forms, and QR coverage

**Files:**
- Create: `e2e/platform/actions/buttons-links.spec.ts`
- Create: `e2e/platform/actions/forms.spec.ts`
- Create: `e2e/platform/actions/qr.spec.ts`

- [ ] **Step 1:** For each critical manifest action, assert enabled/disabled state plus the documented resulting state change.
- [ ] **Step 2:** Add form cases for required fields, invalid values, duplicate submit, server error, loading state, success state, and unauthorized bypass.
- [ ] **Step 3:** Add QR assertions that inspect/decode the source value and then navigate to the encoded tenant-aware route.
- [ ] **Step 4:** Run `npx playwright test e2e/platform/actions` and fix only product defects exposed by the approved contracts.
- [ ] **Step 5:** Commit with `git commit -m "test: cover platform controls forms and qr"`.

### Task 4: Admin imports and exports

**Files:**
- Create: `e2e/platform/fixtures/imports/members-valid.csv`
- Create: `e2e/platform/fixtures/imports/members-invalid.csv`
- Create: `e2e/platform/fixtures/imports/members-duplicates.csv`
- Create: `e2e/platform/import-export.spec.ts`
- Modify: import/export product files only when a failing test proves a defect.

- [ ] **Step 1:** Cover valid, malformed, missing-column, duplicate, empty, and cross-tenant-shaped input for member import plus other P1-critical imports discovered in the manifest.
- [ ] **Step 2:** Assert imported records always use the authenticated Admin tenant, never an input tenant ID.
- [ ] **Step 3:** Assert CSV/PDF exports have expected headers/content/filter window and contain zero Tenant B rows.
- [ ] **Step 4:** Run the suite and patch defects.
- [ ] **Step 5:** Commit with `git commit -m "test: verify admin imports and exports"`.

### Task 5: Permission combination matrix

**Files:**
- Create: `e2e/platform/permissions.spec.ts`
- Create: `src/test/p2/permissionContracts.test.ts`

- [ ] **Step 1:** Cover full Admin, read-only Admin, module-limited Admin, no-permission Admin, Member, and anonymous/public actor where supported.
- [ ] **Step 2:** Assert route visibility/read/create/update/delete/bulk/import/export separately.
- [ ] **Step 3:** Attempt direct server/database mutations for blocked operations and assert denial.
- [ ] **Step 4:** Run permission suites to PASS.
- [ ] **Step 5:** Commit with `git commit -m "test: add platform permission matrix"`.

### Task 6: Tenant-boundary regression

**Files:**
- Create: `e2e/platform/tenant-boundary.spec.ts`
- Create: `src/test/p2/tenantBoundaryContracts.test.ts`

- [ ] **Step 1:** Add direct SELECT/INSERT/UPDATE/DELETE cross-tenant attempts for representative People, Operations, Engagement, payment, queue, storage, RPC, and export paths.
- [ ] **Step 2:** Add hostname/session mismatch tests from P2 Infrastructure.
- [ ] **Step 3:** Add Member A -> Member B self-service ID attacks and Admin Tenant A -> Tenant B ID attacks.
- [ ] **Step 4:** Run `npm run test:e2e:tenant-boundary` and resolve every unexplained failure.
- [ ] **Step 5:** Commit with `git commit -m "test: add tenant boundary regression suite"`.

### Task 7: Queue and subscription payment regression

**Files:**
- Create: `e2e/platform/infrastructure/communications.spec.ts`
- Create: `e2e/platform/infrastructure/subscription-payments.spec.ts`

- [ ] **Step 1:** Cover successful/partial/transient/permanent/duplicate/scheduled communication jobs and credit accounting.
- [ ] **Step 2:** Cover canonical price, tampering, success, cancel, timeout, unknown ID, duplicate callback, stale failure, add-on, plan upgrade, downgrade scheduling.
- [ ] **Step 3:** Stub external providers or use sandbox-only configuration; never require real-money production payments.
- [ ] **Step 4:** Run infrastructure E2E to PASS.
- [ ] **Step 5:** Commit with `git commit -m "test: cover queues and subscription payments"`.

### Task 8: QA closeout and CI wiring

**Files:**
- Create or modify: `.github/workflows/p1-p2-quality.yml`
- Create: `docs/p2/platform-qa-coverage.md`
- Modify: `package.json`

- [ ] **Step 1:** Add CI jobs for build, focused Vitest contracts, selected Playwright suites, secret scan, and migration validation using available secrets only in protected CI contexts.
- [ ] **Step 2:** Preserve the existing Song Library E2E workflow behavior.
- [ ] **Step 3:** Run the full local/preview test command `npm run test:e2e:p1-p2` plus `npm run build`.
- [ ] **Step 4:** Generate a documented coverage map from manifest actions to test files and list any explicitly manual scenarios.
- [ ] **Step 5:** Commit with `git commit -m "ci: add P1 P2 quality gates"`.
