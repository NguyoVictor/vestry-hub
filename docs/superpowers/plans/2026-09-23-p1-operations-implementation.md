# P1 Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Services/Attendance, Events/RSVP, Volunteering, Member Requests, Board Meetings/Jitsi, and Facility Booking behaviorally consistent and tenant-safe across Admin and Member surfaces.

**Architecture:** Keep the existing live schema where it already matches the product. Add only contract/RLS fixes that are proven necessary, then drive each workflow through Playwright parity tests and direct tenant-boundary assertions.

**Tech Stack:** React, TypeScript, TanStack Query, Supabase/Postgres/RLS, Jitsi React SDK, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-09-p1-operations-design.md`

## Global Constraints

- Preserve P0 security controls and tenant isolation.
- `event_management` controls Admin write access; Member pages remain self-service only.
- Exports are Admin-only unless the spec explicitly says otherwise.
- Prefer existing tables and page patterns; do not rebuild Operations UI.
- Use migrations only when live-schema verification proves a database contract gap.

## Review Focus

- Duplicate/capacity RSVP and volunteer sign-up under concurrent clicks.
- Member attempts to edit another member's request, RSVP, assignment, or booking.
- Facility booking time overlap and stale approval races.
- Board/Jitsi links visible to unauthorized users or wrong-tenant attendees.
- Read-only Admin actions that appear disabled but still mutate through direct requests.

---

### Task 1: Add Operations parity harness

**Files:**
- Create: `src/test/p1/operations/operationsContracts.test.ts`
- Create: `e2e/platform/operations/operations.fixtures.ts`
- Modify: `package.json`

**Interfaces:** Produces shared `event_management` actor fixtures and `test:p1:operations` script.

- [ ] **Step 1:** Add failing tests for self-only member mutations and Admin/read-only capability matrix.
- [ ] **Step 2:** Run `npm test -- src/test/p1/operations/operationsContracts.test.ts` and confirm failure.
- [ ] **Step 3:** Implement the shared actor/permission fixtures and add `"test:p1:operations": "vitest run src/test/p1/operations"`.
- [ ] **Step 4:** Run `npm run test:p1:operations` and confirm PASS.
- [ ] **Step 5:** Commit with `git commit -m "test: add P1 Operations parity harness"`.

### Task 2: Services and attendance contract

**Files:**
- Modify: `src/pages/operations/Services.tsx`
- Modify: `src/pages/member/MemberEvents.tsx`
- Test: `e2e/platform/operations/services-attendance.spec.ts`

**Interfaces:** Produces one canonical published-service/attendance lifecycle.

- [ ] **Step 1:** Write E2E cases for published vs unpublished service visibility, current-member attendance intent, Admin attendance visibility, and cross-tenant rejection.
- [ ] **Step 2:** Run `npx playwright test e2e/platform/operations/services-attendance.spec.ts`; capture exact failures.
- [ ] **Step 3:** Patch only the service/attendance queries and mutations that violate the approved contract.
- [ ] **Step 4:** Re-run the focused E2E plus `npm run test:p1:operations`.
- [ ] **Step 5:** Commit with `git commit -m "feat: align services and attendance"`.

### Task 3: Events and RSVP contract

**Files:**
- Modify: `src/pages/operations/Events.tsx`
- Modify: `src/pages/member/MemberEvents.tsx`
- Test: `e2e/platform/operations/events-rsvp.spec.ts`

**Interfaces:** Produces tenant-safe RSVP create/cancel semantics with capacity/duplicate protection.

- [ ] **Step 1:** Add failing tests for published visibility, RSVP, cancellation, duplicate RSVP, full capacity, and Tenant B event IDs.
- [ ] **Step 2:** Run the focused suite and confirm failures.
- [ ] **Step 3:** Implement minimal page/RPC/schema fixes required by the failures. If a DB uniqueness constraint is needed, create it using `npx supabase migration new p1_operations_event_rsvp_constraints`.
- [ ] **Step 4:** Re-run E2E and direct RLS tests.
- [ ] **Step 5:** Commit with `git commit -m "feat: harden events and rsvp"`.

### Task 4: Volunteering and export

**Files:**
- Modify: `src/pages/operations/Volunteering.tsx`
- Modify: `src/pages/member/MemberVolunteer.tsx`
- Test: `e2e/platform/operations/volunteering.spec.ts`

**Interfaces:** Produces self-signup/withdrawal for members and tenant-wide Admin assignment/export.

- [ ] **Step 1:** Add tests for member signup/withdraw, role capacity, duplicate signup, Admin assignment, export contents, and cross-tenant isolation.
- [ ] **Step 2:** Run focused tests and record failures.
- [ ] **Step 3:** Fix only the identified queries/mutations/export filters.
- [ ] **Step 4:** Re-run and verify the exported file contains no foreign-tenant rows.
- [ ] **Step 5:** Commit with `git commit -m "feat: align volunteering and exports"`.

### Task 5: Member Requests lifecycle

**Files:**
- Modify: `src/pages/operations/MemberRequests.tsx`
- Modify: `src/pages/member/MemberRequests.tsx`
- Test: `e2e/platform/operations/member-requests.spec.ts`

**Interfaces:** Produces self-owned member requests and controlled Admin status transitions.

- [ ] **Step 1:** Add tests for create/read/edit/withdraw own request, post-triage edit restrictions, Admin triage, and another member's request ID.
- [ ] **Step 2:** Run focused tests and confirm current failure points.
- [ ] **Step 3:** Patch lifecycle guards and tenant/member predicates.
- [ ] **Step 4:** Re-run tests.
- [ ] **Step 5:** Commit with `git commit -m "feat: harden member request lifecycle"`.

### Task 6: Board Meetings and Jitsi

**Files:**
- Modify: `src/pages/operations/BoardMeetings.tsx`
- Test: `e2e/platform/operations/board-meetings.spec.ts`

**Interfaces:** Produces authorized meeting lifecycle and protected Jitsi join details.

- [ ] **Step 1:** Add tests for create/schedule/update, attendee access, unauthorized member denial, minutes/actions, and Jitsi link visibility.
- [ ] **Step 2:** Run focused suite and identify authorization gaps.
- [ ] **Step 3:** Fix page/database authorization while preserving Jitsi integration.
- [ ] **Step 4:** Re-run E2E and direct tenant-boundary checks.
- [ ] **Step 5:** Commit with `git commit -m "feat: secure board meeting lifecycle"`.

### Task 7: Facility Booking parity

**Files:**
- Modify: `src/pages/operations/FacilityBooking.tsx`
- Modify: `src/pages/member/MemberFacilityBooking.tsx`
- Modify: `supabase/functions/send-booking-confirmation/index.ts`
- Test: `e2e/platform/operations/facility-booking.spec.ts`

**Interfaces:** Produces member-owned booking requests and Admin approval/rejection with collision protection.

- [ ] **Step 1:** Add failing tests for booking create, own booking visibility, conflicting time slot, Admin approve/reject, notification, and Tenant B facility ID.
- [ ] **Step 2:** Run the focused suite.
- [ ] **Step 3:** Add a database exclusion/transactional check only if existing schema cannot safely prevent overlaps; create migration via `npx supabase migration new p1_operations_facility_booking_constraints`.
- [ ] **Step 4:** Re-run E2E and notification tests.
- [ ] **Step 5:** Commit with `git commit -m "feat: complete facility booking parity"`.

### Task 8: Operations closeout

**Files:**
- Create: `docs/p1/operations-changes.md`

- [ ] **Step 1:** Run `npm run test:p1:operations`.
- [ ] **Step 2:** Run `npx playwright test e2e/platform/operations`.
- [ ] **Step 3:** Run `npm run build`.
- [ ] **Step 4:** Verify live/staging RLS/grants for touched Operations tables and run Supabase advisors.
- [ ] **Step 5:** Document changes and commit with `git commit -m "docs: close P1 Operations implementation"`.
