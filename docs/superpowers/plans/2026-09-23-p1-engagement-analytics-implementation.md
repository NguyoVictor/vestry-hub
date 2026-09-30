# P1 Engagement and Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile Announcements, Surveys, Appointments, Testimonies, Messaging, Dashboard, and Reports so Admin and Member surfaces share a correct tenant-safe domain model and consistent analytics definitions.

**Architecture:** Repair missing live schema first, choose one canonical survey representation, preserve the existing messaging model, and introduce shared analytics definitions so Dashboard and Reports stop computing the same metric differently.

**Tech Stack:** React, TypeScript, TanStack Query, Supabase, Realtime, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-09-p1-engagement-analytics-design.md`

## Global Constraints

- `communication_tools` gates Admin engagement writes; `reports_analytics` gates reporting/export.
- Member actors may only mutate self-owned engagement records.
- Published/audience rules must be enforced by data authorization, not only React filtering.
- Use `surveys.questions` JSON plus `survey_responses` as the canonical survey model unless current response-page inspection proves a hard dependency on normalized question rows.
- Shared analytics definitions must be centralized and covered by tests.

## Review Focus

- Group/audience announcements exposed to non-members of the target audience.
- Anonymous surveys accepting duplicate or malformed submissions beyond the intended policy.
- Appointment status changes by the wrong member or wrong tenant.
- Message/reaction operations against conversations the actor does not participate in.
- Dashboard and Reports differing because they use different active-member/date-window definitions.

---

### Task 1: Engagement contract harness and schema reconciliation

**Files:**
- Create: `src/test/p1/engagement/engagementContracts.test.ts`
- Create via CLI: migration from `npx supabase migration new p1_engagement_schema_reconciliation`
- Modify: `src/lib/schema.ts`
- Modify: `package.json`

**Interfaces:** Produces canonical `announcement_types`, `announcement_reactions`, `announcement_comments`, `appointment_types`, `appointments`, `testimony_categories` if missing, with tenant-safe policies.

- [ ] **Step 1:** Write failing schema/access contract tests for the expected engagement tables and policies.
- [ ] **Step 2:** Run focused tests and confirm missing-schema failures.
- [ ] **Step 3:** Generate the migration with the Supabase CLI and implement additive schema/RLS only for objects absent or inconsistent live.
- [ ] **Step 4:** Add `test:p1:engagement` script and run it to PASS.
- [ ] **Step 5:** Verify RLS/grants/advisors and commit with `git commit -m "feat: reconcile P1 engagement schema"`.

### Task 2: Announcements parity

**Files:**
- Modify: `src/pages/communications/Announcements.tsx`
- Modify: `src/pages/member/MemberAnnouncements.tsx`
- Test: `e2e/platform/engagement/announcements.spec.ts`

- [ ] **Step 1:** Add tests for publish/unpublish, everyone/members/group audience, reaction/comment self-ownership, and cross-tenant visibility.
- [ ] **Step 2:** Run focused suite and confirm failures.
- [ ] **Step 3:** Fix audience predicates and self-owned reaction/comment mutations.
- [ ] **Step 4:** Re-run tests.
- [ ] **Step 5:** Commit with `git commit -m "feat: align announcements audience and reactions"`.

### Task 3: Canonical survey model

**Files:**
- Modify: `src/pages/communications/Surveys.tsx`
- Modify: `src/pages/communications/SurveyResponses.tsx`
- Modify: `src/pages/member/MemberSurveys.tsx`
- Modify: `src/pages/SurveyTake.tsx`
- Test: `e2e/platform/engagement/surveys.spec.ts`

**Interfaces:** Produces one survey definition source (`surveys.questions`) and one response lifecycle.

- [ ] **Step 1:** Inspect `SurveyTake.tsx` and current migrations to confirm no required runtime dependency on normalized `survey_questions` rows.
- [ ] **Step 2:** Add failing tests for draft/published/closed state, target audience, one-response policy where applicable, anonymous mode, and export.
- [ ] **Step 3:** Remove conflicting representation usage and normalize reads/writes to the approved model.
- [ ] **Step 4:** Re-run survey tests and export assertions.
- [ ] **Step 5:** Commit with `git commit -m "feat: standardize survey model"`.

### Task 4: Appointments parity

**Files:**
- Modify: `src/pages/engagement/Appointments.tsx`
- Modify: `src/pages/member/MemberAppointments.tsx`
- Test: `e2e/platform/engagement/appointments.spec.ts`

- [ ] **Step 1:** Add tests for member booking, own visibility, cancel/reschedule rules, Admin assignment/status transitions, Jitsi details, and cross-tenant IDs.
- [ ] **Step 2:** Run focused suite.
- [ ] **Step 3:** Add missing page permission checks and lifecycle validation.
- [ ] **Step 4:** Re-run tests.
- [ ] **Step 5:** Commit with `git commit -m "feat: align appointment lifecycle"`.

### Task 5: Testimonies and Messaging

**Files:**
- Modify: `src/pages/communications/Testimonies.tsx`
- Modify: `src/pages/member/MemberTestimonies.tsx`
- Modify: `src/pages/communications/MemberMessaging.tsx`
- Modify: `src/pages/member/MemberMessages.tsx`
- Test: `e2e/platform/engagement/testimonies-messaging.spec.ts`

- [ ] **Step 1:** Add testimony moderation/self-edit tests and messaging participant/self-delete/reaction/attachment tests.
- [ ] **Step 2:** Run focused suite.
- [ ] **Step 3:** Patch status/participant ownership rules and any RLS/RPC gaps found.
- [ ] **Step 4:** Re-run with realtime disabled and enabled paths where possible.
- [ ] **Step 5:** Commit with `git commit -m "feat: harden testimonies and messaging"`.

### Task 6: Shared analytics definitions

**Files:**
- Create: `src/lib/analyticsDefinitions.ts`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/analytics/Reports.tsx`
- Modify: `src/pages/analytics/Branches.tsx`
- Modify: `src/pages/analytics/BranchDetail.tsx`
- Test: `src/test/p1/engagement/analyticsDefinitions.test.ts`
- Test: `e2e/platform/engagement/analytics.spec.ts`

**Interfaces:** Produces shared metric functions/query fragments for active members, date windows, giving, attendance, events, groups, visitors, and volunteering.

- [ ] **Step 1:** Write failing unit cases that pin definitions such as active-member inclusion and month boundaries.
- [ ] **Step 2:** Run unit tests and confirm current pages disagree with the intended definitions.
- [ ] **Step 3:** Implement `analyticsDefinitions.ts` and refactor only the affected queries/calculations to consume it.
- [ ] **Step 4:** Add E2E assertions that Dashboard and Reports show the same metric for the same fixture set.
- [ ] **Step 5:** Run tests and commit with `git commit -m "feat: unify dashboard and report metrics"`.

### Task 7: Engagement and Analytics closeout

**Files:**
- Create: `docs/p1/engagement-analytics-changes.md`

- [ ] **Step 1:** Run `npm run test:p1:engagement`.
- [ ] **Step 2:** Run `npx playwright test e2e/platform/engagement`.
- [ ] **Step 3:** Run `npm run build`.
- [ ] **Step 4:** Verify touched schema, RLS/grants, Realtime assumptions, and Supabase advisors.
- [ ] **Step 5:** Document and commit with `git commit -m "docs: close P1 engagement and analytics"`.
