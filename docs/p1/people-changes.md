# P1 People — Implementation Closeout

**Date:** 2026-09-23  
**Branch:** `p1-p2-product-hardening`  
**Status:** Implementation complete; broader P1/P2 program still in progress

## Scope completed

P1 People now covers the approved sequence:

1. Members
2. Groups
3. House Fellowships
4. Families
5. Visitors
6. Follow-Up
7. New Converts
8. Children's Ministry

The implementation uses the same contract throughout: tenant-aware database/RLS rules are authoritative, Admin writes respect `member_management` read-only state, and Member Portal actions are limited to the current member/guardian and current tenant.

## Database and RLS reconciliation

The interrupted earlier execution had already applied several People migrations to production. Their SQL was recovered from `supabase_migrations.schema_migrations`, mirrored into source, and hash-checked instead of replayed.

Recovered migrations include:

- `20260923085731_p1_people_schema_reconciliation.sql`
- `20260923085835_p1_people_fk_index_hardening.sql`
- `20260923090855_p1_people_member_session_policies.sql`
- `20260923091126_p1_people_member_directory_edge_cutover.sql`
- `20260923091326_p1_people_admin_only_privileges.sql`
- `20260923100304_p1_people_permission_parity.sql`
- `20260923101137_p1_permission_policy_cleanup.sql`

A new lifecycle migration was added and applied during this continuation:

- `20260923122111_p1_people_lifecycle_atomic_rpcs.sql`

It:

- adds the missing `updated_at` columns used by the Visitors/New Converts UI;
- corrects `visitors.converted_to_member_id` so it references `members`, not `users`;
- adds tenant-consistent Visitor ↔ Member and New Convert ↔ Visitor foreign keys;
- prevents duplicate New Convert rows for the same tenant/visitor;
- adds transactional `SECURITY INVOKER` RPCs for Visitor → Member and Visitor → New Convert transitions;
- limits RPC execution to `authenticated` and `service_role`.

The migration was applied only after production data checks confirmed there were no existing converted-member references, cross-tenant Visitor/New Convert links, or duplicate Visitor/New Convert links that would conflict with the corrected constraints.

## Members and registration

- `/member-registration/:orgId` no longer performs a direct browser insert into `members`.
- The legacy route now uses the canonical registration path and pending-approval workflow.
- Member login/session validation is tenant scoped and approval aware.
- Member Portal database requests carry the member-session header required by the P1 RLS contract.
- Member module configuration is returned through the trusted login/session flow rather than reopening protected tenant columns to anonymous reads.
- Public form registration records `registration_source = 'form'`.
- Admin member profile/deactivation writes explicitly retain tenant scope.

## Groups and House Fellowships

- Join requests include explicit tenant ownership.
- Admin group membership, leadership, and join-request mutations are tenant scoped.
- Join approval creates membership before marking the request approved, avoiding an approved-without-membership state.
- Member group/fellowship reads and RSVP actions retain tenant ownership.
- Fellowship attendance/RSVP tables and policies are present live.
- Read-only Admins cannot mutate House Fellowship state.

## Families, Visitors, Follow-Up, and New Converts

- Family mutations and family pastoral-note writes are tenant scoped.
- Family detail notes obey `member_management` read-only mode.
- Follow-Up task edit/status/delete writes retain tenant predicates.
- New Convert edit/milestone/delete writes retain tenant predicates.
- Visitor conversion is now transactional at the database boundary instead of a two-request browser sequence.
- Visitor deletion cleanup writes are explicitly tenant scoped.

## Children's Ministry

The live project now has the required P1 Children's Ministry tables with RLS enabled:

- `children`
- `children_classes`
- `children_checkins`
- `children_qr_codes`
- `children_ministry_settings`

Behavior changes include:

- check-in/check-out writes obey Admin read-only mode;
- checkout and child/class mutations are explicitly tenant scoped;
- class default seeding no longer writes when the Admin is read-only;
- child registration receives and enforces read-only state;
- kiosk check-in actions honor `member_management` read-only mode;
- Member Portal child access remains guardian-only and tenant scoped;
- guardian QR/check-in queries explicitly retain the member tenant;
- Children's reports/export remain controlled by `reports_analytics`.

## Verification evidence

At People closeout:

- `npm run test:p1:people` → **24/24 passing**.
- Source/parity Playwright contracts → **8 passing**.
- Two browser-navigation registration tests cannot run in this ChatGPT runtime because managed Chromium enforces `URLBlocklist: ["*"]`; they remain in source for normal CI/local browser execution.
- Full historical Vitest suite → **62 pre-existing failures / 142 passes**. The failure count is unchanged from baseline; P1 People only added passing coverage.
- Production build → **PASS**, most recent People build 32.57s.
- All required People tables checked live with RLS enabled and policies present.
- Staff-only Visitors, Follow-Up and New Converts have no anonymous table grants.
- Guardian/member tables expose only the deliberately required anonymous operations, with row access controlled by member-session RLS.
- Supabase security advisor shows no new People lifecycle finding.

## Accepted environment limitation

True Playwright browser navigation cannot execute inside the current managed container because Chromium blocks every URL, including localhost, with `ERR_BLOCKED_BY_ADMINISTRATOR`. This is an execution-environment restriction, not an application result. Browser E2E specs are retained and must be run in normal local/CI Chromium before merge/release.

## Remaining work outside People

P1 Operations and P1 Engagement/Analytics are still in progress, followed by P2 Infrastructure and platform-wide QA. Existing unrelated historical Song Library test failures remain outside the P1 People scope and will be reported separately at final closeout.
