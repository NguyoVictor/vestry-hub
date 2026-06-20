# Member Portal Flows

> Cross-ref: [`auth.md`](./auth.md), [`payments.md`](./payments.md), [`messaging.md`](./messaging.md), [`admin-flows.md`](./admin-flows.md)

Member portal: **custom session** via `localStorage.member_session` + `member_sessions` table.

```
MemberAuthGuard.tsx
├─ Read: localStorage.member_session
├─ Validate expiresAt > now
├─ no-session → /member/login
└─ authed → MemberPortalProvider + MemberPortalLayout routes
```

Guard: `MemberAuthGuard` (`src/components/layout/MemberAuthGuard.tsx`).

---

## Entry & registration

| Route | File | Auth |
|---|---|---|
| `/member/login` | `MemberLogin.tsx` | Public |
| `/member/join` | `JoinChurch.tsx` | Public — QR/code registration |
| `/member-registration/:orgId` | `MemberRegistration.tsx` | Public |
| `/member/profile-setup` | `ProfileSetup.tsx` | Post-login |
| `/member/welcome` | `MemberWelcome.tsx` | Authed |

### Page structure (scan trees)

#### `MemberLogin.tsx` — `/member/login`

```
MemberLogin.tsx
├─ Fields: email, churchCode (?code= auto-fill + tenant branding lookup)
├─ Edge: invoke member-login { email, churchCode }
├─ Errors: invalid_code | member_not_found | pending_approval (toast 6s)
├─ Success: localStorage.member_session → navigate /member
└─ See auth.md for server-side pending gate
```

#### `JoinChurch.tsx` — `/member/join`

```
JoinChurch.tsx
├─ URL: ?code=, ?type=member|visitor
├─ memberType picker → member | visitor form branches
├─ Edge: invoke member-register (registrationSource: qr_scan | form)
├─ Success screen: church name + code copy; member → pending approval copy
└─ Does not set member_session — must wait for admin approve + login
```

#### `MemberHome.tsx` — `/member`

```
MemberHome.tsx
├─ Context: useMemberPortal() — memberId, churchId, enabledModules, profileComplete
├─ Filter: ALL_MODULES.filter(m => enabledModules[m.key] !== false)
├─ Queries: latest sermon, volunteer roles
├─ UI: profile completion banner → /member/profile
└─ Grid: service tiles (give, events, messages, …) per enabled_modules.member_portal
```

#### `MemberGive.tsx` — `/member/give`

```
MemberGive.tsx
├─ Fields: amount, category (tithe/offering/…), phoneNumber (prefill from profile), dedication
├─ invoke process-stk-push { amount, phone, category, memberId, tenantId, … }
├─ STK modal: 90s countdown; terminal states cancelled | failed | expired
├─ Confirm: postgres_changes on giving_records.id + 2s polling fallback
└─ Success: receipt summary; optional jsPDF download client-side
```

#### `MemberMessages.tsx` — `/member/messages`

```
MemberMessages.tsx
├─ Section A — Staff directory (is_staff_directory=true):
│   ├─ SELECT conversations WHERE is_staff_directory=true
│   └─ joinStaffThread(staffUserId) → create private DM (is_staff_directory=false)
├─ Section B — My conversations (is_staff_directory=false, type=direct):
│   ├─ Realtime: postgres_changes on messages
│   └─ INSERT messages as anon client (member session, not Supabase Auth)
└─ UI: thread list → chat view with send, attachments, reply, delete
```

### Registration → pending approval

1. **`member-register`** creates `members` with **`membership_status: "Pending Approval"`** (also used for QR join in `JoinChurch.tsx`).
2. Member sees success UI; **cannot log in yet**.

### Login gate (verified in source)

**`member-login/index.ts` lines 54–58:**

```typescript
if (member.membership_status === "Pending Approval") {
  return new Response(JSON.stringify({ error: "pending_approval" }), { status: 403, ... });
}
```

**`MemberLogin.tsx`** shows a toast: *“Your membership is pending approval…”* when `error === "pending_approval"`.

### Admin approval (required for portal access)

**File:** `src/pages/people/MemberProfile.tsx`

- Button **“✓ Approve Member”** when `membership_status === "Pending Approval"`.
- Updates `members.membership_status` → `"Member"`, `status` → `"active"`.
- Gated by `PermissionButton permission="member_management"`.

No bulk approve on `Members.tsx` — filter only via `MemberFilters.tsx`.

---

## Session details

- Token: UUID + timestamp string stored client-side.
- Server record: `member_sessions` (`member_id`, `tenant_id`, `session_token`, `expires_at`).
- Expiry: **30 days** from login.
- Church code lookup: `tenants.church_code` **or** `tenants.invite_code`.

---

## Authenticated routes

Under `MemberPortalLayout`:

| Route | File |
|---|---|
| `/member` | `MemberHome.tsx` |
| `/member/give` | `MemberGive.tsx` → `process-stk-push` |
| `/member/giving-history` | `MemberGivingHistory.tsx` |
| `/member/pledge-campaigns` | `MemberPledgeCampaigns.tsx` → `process-stk-push` |
| `/member/events`, `…/:eventId` | Events pages |
| `/member/announcements` | `MemberAnnouncements.tsx` |
| `/member/groups`, `…/:groupId` | Groups pages |
| `/member/house-fellowships` | `MemberHouseFellowship.tsx` |
| `/member/requests` | `MemberRequests.tsx` |
| `/member/appointments` | `MemberAppointments.tsx` |
| `/member/testimonies` | `MemberTestimonies.tsx` |
| `/member/church-media`, `…/albums/:albumId` | Media pages |
| `/member/profile` | `MemberProfilePage.tsx` |
| `/member/settings` | `MemberSettingsPage.tsx` |
| `/member/messages` | `MemberMessages.tsx` |
| `/member/sermons`, `…/:sermonId` | Sermon pages |
| `/member/bible` | `MemberBiblePage.tsx` |
| `/member/volunteer` | `MemberVolunteerPage.tsx` |
| `/member/children` | `MemberChildrenPage.tsx` |
| `/member/surveys` | `MemberSurveysPage.tsx` |
| `/member/facility-booking` | `MemberFacilityBookingPage.tsx` |
| `/member/livestreaming`, `/member/watch-live` | Livestream pages |
| `/member/outreach` | `MemberOutreachPage.tsx` |
| `/member/whatsapp` | `MemberWhatsAppPage.tsx` |
| `/member/store` | `MemberStore.tsx` |
| `/member/training/*` | Training pages |

---

## Module visibility

**Read:** `tenants.enabled_modules.member_portal` via `MemberPortalContext.tsx`  
**Filter:** `MemberHome.tsx` service tiles  
**Write:** Settings → Member App (`MemberApp.tsx`, `MemberAppFeatures.tsx`)

⚠️ **GAP:** Multiple writers use different JSON shapes for `enabled_modules` — see [`settings.md`](./settings.md).

Admin sidebar is **not** filtered by these toggles.

---

## Messaging

**Route:** `/member/messages` — staff directory tiles + private DMs. See [`messaging.md`](./messaging.md).

Member client is **anon** Supabase — staff names denormalized on `conversations.name`.

---

## Giving

**Route:** `/member/give` — Daraja STK via `process-stk-push`; same realtime+polling confirmation as admin Give Online. See [`payments.md`](./payments.md).

Legacy Pesapal/IntaSend webhooks do **not** participate in member give UI.

---

## Public routes (no member session)

`/church/:slug`, `/survey/:surveyId`, `/book/:tenantId`, `/sermons/:tenantId`, `/store/:tenantId`, `/visitor-registration/:churchId`

---

## RLS

Member portal policies: `20260407091336_member_portal_rls_policies.sql`, `20260407091627_member_portal_open_read_policies.sql`, event/messaging migrations — see structural index.

---

## Product context gaps

- Member portal routes not listed in `00-product-context.md` §4.
- **Pending approval workflow** implemented in code; admin approval on `MemberProfile.tsx` only.
