# P1 People Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the People domain against production schema and deliver tenant-safe Admin/Member behavior with parity tests for Members, Groups, House Fellowships, Families, Visitors, Follow-Up, New Converts, and Children's Ministry.

**Architecture:** Keep existing page structure and React Query patterns, but make the database/RLS contract authoritative. Fix legacy registration to use the canonical member registration path, restore missing People schema through generated Supabase migrations, and add focused contract/E2E coverage instead of broad UI rewrites.

**Tech Stack:** React 18, TypeScript 5.8, Vite 5.4, TanStack Query, Supabase/Postgres/RLS/Edge Functions, Vitest 3.2, Playwright 1.57.

**Spec:** `docs/superpowers/specs/2026-09-09-p1-people-foundation-design.md`

## Global Constraints

- Preserve every P0 security control; no browser service-role access and no broad tenant policies.
- Every exposed table must have deliberate grants plus RLS; server-only tables remain inaccessible to `anon` and `authenticated`.
- Admin/Member parity means consistent domain state, not identical permissions.
- Use `supabase migration new <name>` for each schema migration; never invent migration timestamps.
- Do not make unrelated visual redesigns or refactors.
- Keep all queries tenant-scoped even where RLS also enforces tenant isolation.

## Review Focus

- Legacy `/member-registration/:orgId` direct insert must not create immediately active members or bypass the canonical pending-approval path.
- Member session tenant mismatch must fail instead of loading another tenant's member record.
- Join requests, fellowship attendance, and children's records must reject cross-tenant IDs even when submitted directly.
- Family/group changes must not silently orphan membership rows or expose another tenant's people.
- Read-only Admin permissions must block mutations at the UI and still be rejected when the client call is attempted directly.

---

### Task 1: Establish People contract test helpers

**Files:**
- Create: `src/test/p1/people/peopleTestData.ts`
- Create: `src/test/p1/people/peopleContracts.test.ts`
- Create: `e2e/platform/people/people.fixtures.ts`
- Modify: `src/test/setup.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: current Supabase client mocks and Playwright installation.
- Produces: `makeTenant()`, `makeMember()`, `expectTenantScopedQuery()` fixtures and `test:p1:people` script.

- [ ] **Step 1: Add a failing tenant-scope contract test**

```ts
it('rejects records whose tenant_id differs from the active tenant', async () => {
  const activeTenant = makeTenant('tenant-a');
  const foreignMember = makeMember({ tenant_id: 'tenant-b' });
  expect(() => expectTenantScopedQuery(activeTenant.id, foreignMember)).toThrow(/tenant/i);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- src/test/p1/people/peopleContracts.test.ts`

Expected: FAIL because the People contract helpers do not exist.

- [ ] **Step 3: Implement the minimal fixtures and shared assertions**

```ts
export function expectTenantScopedQuery(activeTenantId: string, row: { tenant_id: string }) {
  if (row.tenant_id !== activeTenantId) throw new Error('tenant mismatch');
}
```

Add `"test:p1:people": "vitest run src/test/p1/people"` to `package.json`.

- [ ] **Step 4: Re-run the focused test**

Run: `npm run test:p1:people`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/test/setup.ts src/test/p1/people e2e/platform/people package.json
git commit -m "test: add P1 People contract harness"
```

### Task 2: Reconcile People schema and RLS

**Files:**
- Create via CLI: migration from `npx supabase migration new p1_people_schema_reconciliation`
- Modify: `src/lib/schema.ts`
- Test: `src/test/p1/people/peopleSchemaContracts.test.ts`

**Interfaces:**
- Consumes: existing `members`, `groups`, `group_members`, `house_fellowships`, `fellowship_members`, `families`, `family_members`, `visitors`, `follow_up_tasks`, `new_converts`.
- Produces: canonical `join_requests`, `fellowship_attendance`, `children`, `children_classes`, `children_checkins`, `children_qr_codes`, `children_ministry_settings` structures and tenant-safe policies.

- [ ] **Step 1: Create the migration file using the CLI**

Run: `npx supabase migration new p1_people_schema_reconciliation`

Expected: Supabase prints the exact migration path. Record that path and use it for the remaining steps in this task.

- [ ] **Step 2: Write schema contract tests that expect the missing People tables and tenant columns**

```ts
const required = [
  'join_requests', 'fellowship_attendance', 'children', 'children_classes',
  'children_checkins', 'children_qr_codes', 'children_ministry_settings'
];
expect(required).toEqual(expect.arrayContaining(required));
```

The database-side verification query must assert each table exists, has RLS enabled, and has no broad `anon` CRUD grant.

- [ ] **Step 3: Run the tests against the current schema and confirm missing-object failures**

Run: `npm run test:p1:people`

Expected: FAIL on currently absent production objects.

- [ ] **Step 4: Implement additive schema and policies in the generated migration**

Use `tenant_id` foreign keys consistently, add tenant/member indexes, and define only the policies required by the approved People contract. Keep children/member self-service ownership predicates explicit; do not use `TO authenticated` without ownership predicates.

- [ ] **Step 5: Update `src/lib/schema.ts` with the canonical table names**

```ts
CHILDREN: 'children',
CHILDREN_CLASSES: 'children_classes',
CHILDREN_CHECKINS: 'children_checkins',
CHILDREN_QR_CODES: 'children_qr_codes',
CHILDREN_MINISTRY_SETTINGS: 'children_ministry_settings',
JOIN_REQUESTS: 'join_requests',
FELLOWSHIP_ATTENDANCE: 'fellowship_attendance',
```

- [ ] **Step 6: Verify migration locally/staging and run advisors**

Run: `npx supabase migration list --local`

Then use the connected Supabase project to verify table existence, grants, RLS, and advisors before any production application.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations src/lib/schema.ts src/test/p1/people/peopleSchemaContracts.test.ts
git commit -m "feat: reconcile P1 People schema"
```

### Task 3: Canonicalize member registration and member session checks

**Files:**
- Modify: `src/pages/MemberRegistration.tsx`
- Modify: `src/components/layout/MemberAuthGuard.tsx`
- Modify: `src/contexts/MemberPortalContext.tsx`
- Modify: `supabase/functions/member-register/index.ts`
- Modify: `supabase/functions/member-login/index.ts`
- Test: `src/test/p1/people/memberRegistration.test.tsx`
- Test: `e2e/platform/people/member-registration.spec.ts`

**Interfaces:**
- Consumes: `member-register`, `member-login`, `member_session`.
- Produces: one pending-approval registration contract and tenant-checked active member sessions.

- [ ] **Step 1: Write failing registration tests**

```ts
it('routes legacy registration through member-register and never inserts members directly', async () => {
  expect(source).not.toContain('.from("members").insert');
  expect(source).toContain('member-register');
});
```

Add an E2E case proving a pending member cannot establish a member session.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm test -- src/test/p1/people/memberRegistration.test.tsx`

Expected: FAIL because the legacy page still owns a direct insert path.

- [ ] **Step 3: Replace the legacy direct insert with the canonical registration function**

The legacy route may preserve its form, but submission must invoke:

```ts
supabase.functions.invoke('member-register', {
  body: { churchCode, memberType: 'member', registrationSource: 'form', ...formValues }
});
```

The Edge Function remains the only place that establishes pending approval state.

- [ ] **Step 4: Add tenant/session revalidation to member portal loading**

The portal provider must verify the loaded member belongs to `session.tenantId` and remains eligible to log in. A mismatched or no-longer-approved session is cleared and redirected.

- [ ] **Step 5: Run unit and E2E registration tests**

Run: `npm run test:p1:people`

Run: `npx playwright test e2e/platform/people/member-registration.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/MemberRegistration.tsx src/components/layout/MemberAuthGuard.tsx src/contexts/MemberPortalContext.tsx supabase/functions/member-register supabase/functions/member-login src/test/p1/people/memberRegistration.test.tsx e2e/platform/people/member-registration.spec.ts
git commit -m "fix: unify member registration and session checks"
```

### Task 4: Members, Groups, and House Fellowships parity

**Files:**
- Modify: `src/pages/people/Members.tsx`
- Modify: `src/pages/people/MemberProfile.tsx`
- Modify: `src/pages/people/Groups.tsx`
- Modify: `src/pages/people/GroupDetail.tsx`
- Modify: `src/pages/member/MemberGroups.tsx`
- Modify: `src/pages/people/HouseFellowships.tsx`
- Modify: `src/pages/people/FellowshipDetail.tsx`
- Modify: `src/pages/member/MemberHouseFellowship.tsx`
- Test: `e2e/platform/people/members-groups-fellowships.spec.ts`

**Interfaces:**
- Consumes: schema from Task 2 and registration contract from Task 3.
- Produces: consistent group/join/fellowship state across Admin and Member surfaces.

- [ ] **Step 1: Add failing E2E workflows**

Cover: Admin creates group -> Member discovers -> Member requests join -> Admin approves -> Member sees membership; Admin assigns fellowship -> Member sees assignment -> Member RSVPs/attendance is visible to Admin.

- [ ] **Step 2: Run the workflow suite and capture exact failures**

Run: `npx playwright test e2e/platform/people/members-groups-fellowships.spec.ts`

Expected: FAIL only on identified state/permission gaps.

- [ ] **Step 3: Patch existing pages without redesigning them**

All mutations must include tenant ownership or rely on a tenant-safe RPC; Admin read-only mode blocks writes; Member actions mutate only the current member's join/RSVP rows.

- [ ] **Step 4: Re-run workflow and direct tenant-boundary assertions**

Run: `npm run test:p1:people && npx playwright test e2e/platform/people/members-groups-fellowships.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/people src/pages/member/MemberGroups.tsx src/pages/member/MemberHouseFellowship.tsx e2e/platform/people/members-groups-fellowships.spec.ts
git commit -m "feat: align members groups and fellowships"
```

### Task 5: Families, Visitors, Follow-Up, and New Converts parity

**Files:**
- Modify: `src/pages/people/Families.tsx`
- Modify: `src/pages/people/FamilyDetailPage.tsx`
- Modify: `src/pages/people/Visitors.tsx`
- Modify: `src/pages/people/FollowUpTasks.tsx`
- Modify: `src/pages/people/NewConverts.tsx`
- Test: `e2e/platform/people/families-visitors-followup-converts.spec.ts`

**Interfaces:**
- Consumes: canonical People tenant/RLS contract.
- Produces: safe family membership and visitor -> follow-up -> convert/member lifecycle.

- [ ] **Step 1: Write failing lifecycle tests**

Test family CRUD/read-only behavior, visitor creation, follow-up creation, conversion to new convert, conversion to member, and cross-tenant mutation rejection.

- [ ] **Step 2: Run the suite and isolate behavioral gaps**

Run: `npx playwright test e2e/platform/people/families-visitors-followup-converts.spec.ts`

Expected: FAIL on current gaps such as detail-page permission parity or inconsistent transition state.

- [ ] **Step 3: Apply minimal page/domain fixes**

Use atomic mutations where a conversion touches multiple tables. Do not mark a visitor integrated until the target record succeeds.

- [ ] **Step 4: Re-run tests**

Run: `npm run test:p1:people && npx playwright test e2e/platform/people/families-visitors-followup-converts.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/people/Families.tsx src/pages/people/FamilyDetailPage.tsx src/pages/people/Visitors.tsx src/pages/people/FollowUpTasks.tsx src/pages/people/NewConverts.tsx e2e/platform/people/families-visitors-followup-converts.spec.ts
git commit -m "feat: harden People lifecycle workflows"
```

### Task 6: Children's Ministry Admin/Member parity

**Files:**
- Modify: `src/pages/people/childrens-ministry/CMLayout.tsx`
- Modify: `src/pages/people/childrens-ministry/CMOverview.tsx`
- Modify: `src/pages/people/childrens-ministry/CMCheckin.tsx`
- Modify: `src/pages/people/childrens-ministry/CMClasses.tsx`
- Modify: `src/pages/people/childrens-ministry/CMChildren.tsx`
- Modify: `src/pages/people/childrens-ministry/CMReports.tsx`
- Modify: `src/pages/people/childrens-ministry/CMSettings.tsx`
- Modify: `src/pages/people/childrens-ministry/CMKiosk.tsx`
- Modify: `src/pages/member/MemberChildren.tsx`
- Test: `e2e/platform/people/childrens-ministry.spec.ts`

**Interfaces:**
- Consumes: children's schema and RLS from Task 2.
- Produces: parent-owned child view/QR/check-in status plus Admin ministry management.

- [ ] **Step 1: Add failing children's workflow tests**

Admin registers child -> parent sees own child -> QR resolves -> check-in/out updates -> parent sees status; another member cannot access that child; read-only Admin cannot mutate classes/settings.

- [ ] **Step 2: Run and confirm failures**

Run: `npx playwright test e2e/platform/people/childrens-ministry.spec.ts`

- [ ] **Step 3: Patch page-level permission gaps and tenant/member predicates**

Check-in/kiosk operations must resolve a child only inside the active tenant and permitted guardian relationship. Reports export requires `reports_analytics`.

- [ ] **Step 4: Re-run People suite**

Run: `npm run test:p1:people && npx playwright test e2e/platform/people`

Expected: PASS for all People P1 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/people/childrens-ministry src/pages/member/MemberChildren.tsx e2e/platform/people
git commit -m "feat: complete childrens ministry parity"
```

### Task 7: People closeout verification and docs

**Files:**
- Modify: `docs/known-issues.md`
- Create: `docs/p1/people-changes.md`

**Interfaces:**
- Consumes: all prior People tasks.
- Produces: verified People closeout evidence and corrected issue classification.

- [ ] **Step 1: Run the complete People verification**

Run: `npm run test:p1:people`

Run: `npx playwright test e2e/platform/people`

Run: `npm run build`

Expected: all P1 People tests pass; build succeeds.

- [ ] **Step 2: Verify live/staging schema and security**

Confirm required People tables, RLS, grants, and tenant-boundary queries using the connected Supabase project; run security/DDL advisors.

- [ ] **Step 3: Update documentation**

Document actual changes and reclassify the old legacy registration P0 note as resolved/replaced by the canonical registration path.

- [ ] **Step 4: Commit**

```bash
git add docs/known-issues.md docs/p1/people-changes.md
git commit -m "docs: close P1 People implementation"
```
