# Member Portal Flows

> Cross-ref: [`00-product-context.md`](./00-product-context.md), [`auth.md`](./auth.md), [`permissions.md`](./permissions.md), [`messaging.md`](./messaging.md), [`payments.md`](./payments.md)

Member portal uses **custom session** (`localStorage.member_session`), not Supabase Auth. Guard: `MemberAuthGuard` (`src/components/layout/MemberAuthGuard.tsx`).

---

## Entry & onboarding

| Route | File | Auth |
|---|---|---|
| `/member/login` | `MemberLogin.tsx` | Public |
| `/member/join` | `JoinChurch.tsx` | Public — church code + registration |
| `/member-registration/:orgId` | `MemberRegistration.tsx` | Public |
| `/member/profile-setup` | `ProfileSetup.tsx` | After login |
| `/member/welcome` | `MemberWelcome.tsx` | Authed |

### Join / register flow

1. Member enters **church code** (from QR, invite, or manual entry).
2. **`member-register`** edge function creates `members` row.
3. Sets **`membership_status: "Pending Approval"`**.
4. Member sees success message; **full portal access requires admin approval**.

**Admin approval:** [`admin-flows.md`](./admin-flows.md) — `MemberProfile.tsx` → “✓ Approve Member”.

Until approved, member may be blocked from login or limited depending on `member-login` checks — verify `member-login/index.ts` for `membership_status` gate.

### Login

**Edge function:** `member-login`  
**UI:** `MemberLogin.tsx` — email + church code → session in localStorage.

---

## Authenticated routes

All under `MemberPortalLayout` (`src/components/layout/MemberPortalLayout.tsx`):

| Route | File |
|---|---|
| `/member` | `MemberHome.tsx` |
| `/member/give` | `MemberGive.tsx` |
| `/member/giving-history` | `MemberGivingHistory.tsx` |
| `/member/pledge-campaigns` | `MemberPledgeCampaigns.tsx` |
| `/member/events`, `/member/events/:eventId` | `MemberEventsPage.tsx`, `MemberEventDetailPage.tsx` |
| `/member/announcements` | `MemberAnnouncements.tsx` |
| `/member/groups`, `/member/groups/:groupId` | `MemberGroupsPage.tsx`, `MemberGroupDetailPage.tsx` |
| `/member/house-fellowships` | `MemberHouseFellowship.tsx` |
| `/member/requests` | `MemberRequests.tsx` |
| `/member/appointments` | `MemberAppointments.tsx` |
| `/member/testimonies` | `MemberTestimonies.tsx` |
| `/member/church-media`, `…/albums/:albumId` | `MemberChurchMedia.tsx`, `MemberAlbumDetail.tsx` |
| `/member/profile` | `MemberProfilePage.tsx` |
| `/member/settings` | `MemberSettingsPage.tsx` |
| `/member/messages` | `MemberMessages.tsx` |
| `/member/sermons`, `/member/sermons/:sermonId` | Member sermon pages |
| `/member/bible` | `MemberBiblePage.tsx` |
| `/member/volunteer` | `MemberVolunteerPage.tsx` |
| `/member/children` | `MemberChildrenPage.tsx` |
| `/member/surveys` | `MemberSurveysPage.tsx` |
| `/member/facility-booking` | `MemberFacilityBookingPage.tsx` |
| `/member/livestreaming`, `/member/watch-live` | Livestream pages |
| `/member/outreach` | `MemberOutreachPage.tsx` |
| `/member/whatsapp` | `MemberWhatsAppPage.tsx` |
| `/member/store` | `MemberStore.tsx` |
| `/member/training/*` | Training course/lesson/certificate pages |

---

## Module visibility (feature toggles)

**Source:** `tenants.enabled_modules.member_portal`  
**Loaded in:** `MemberPortalContext.tsx`  
**Applied in:** `MemberHome.tsx` — filters service tiles.

Configured from admin: **Settings → Member App** (`MemberApp.tsx`, `MemberAppFeatures.tsx`).

⚠️ **GAP:** Toggle shape in `MemberAppFeatures.tsx` must match read shape in `MemberPortalContext` — historical bug risk if shapes diverge.

**Separate from:** `feature_permissions` (admin dead feature) and `member_permission_overrides` (per-member overrides UI).

---

## Messaging (member side)

**Route:** `/member/messages` — `MemberMessages.tsx`

1. **Staff directory section** — “Message a leader”; lists `conversations` where `is_staff_directory=true`.
2. **Tap staff tile** → `joinStaffThread()` creates/finds private DM (`is_staff_directory=false`, 2 participants).
3. Labels from denormalized `conversations.name` + `src/lib/messaging.ts`.

See [`messaging.md`](./messaging.md).

---

## Giving (member side)

**Route:** `/member/give` — STK via **`process-stk-push`** (same as admin Give Online).

Confirmation: realtime + polling on `giving_records` (same pattern as `GiveOnline.tsx`).

See [`payments.md`](./payments.md).

---

## Public member-adjacent routes (no member session)

| Route | Purpose |
|---|---|
| `/church/:slug` | Public church page |
| `/survey/:surveyId` | Public survey |
| `/book/:tenantId` | Public facility booking |
| `/sermons/:tenantId` | Public sermons |
| `/store/:tenantId` | Public store |

---

## RLS note

Member portal often uses **anon** Supabase client with policies allowing read/insert scoped by tenant/member identity. Key migrations:

- `20260407091336_member_portal_rls_policies.sql`
- `20260407091627_member_portal_open_read_policies.sql`
- `20260422000001_member_portal_events_rls.sql`

---

## Product context alignment

| Product intent | Code status |
|---|---|
| Members find church via **church code** | ✅ `tenants.church_code`, join/login flows |
| Separate Member Portal entry on landing | ✅ `/member/login` |
| Member Portal not detailed in product doc | Extension documented here |

⚠️ **DISCREPANCY:** Product doc focuses on admin onboarding; member self-registration → **Pending Approval** workflow is implemented in code but not yet in product context §6.
