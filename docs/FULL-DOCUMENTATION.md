# VestryHub — Full Documentation

> Combined from `/docs` — generated 2026-06-15. Individual files remain in `/docs` for focused edits.

## Table of Contents

- [1. Index](#readme)
- [2. Product Context](#product-context)
- [3. Authentication & Identity](#auth)
- [4. Permissions & Access Control](#permissions)
- [5. Messaging](#messaging)
- [6. Payments & Giving](#payments)
- [7. Settings](#settings)
- [8. Admin Portal Flows](#admin-flows)
- [9. Member Portal Flows](#member-flows)
- [10. Edge Functions Inventory](#edge-functions-gap)

---

<a id="readme"></a>

## 1. Index

> Ground-truth product intent: [`00-product-context.md`](#product-context)  
> Structural index (routes, migrations, RLS overview): produced 2026-06-15 from code audit.

### Area guides

| Doc | Scope |
|---|---|
| [`auth.md`](#auth) | Admin signup/signin, onboarding, invites, member login, guards |
| [`permissions.md`](#permissions) | `usePermissions`, override tables, **known gaps** (`feature_permissions`) |
| [`messaging.md`](#messaging) | Staff directory, DMs, bulk comms, `at-sms` vs `africastalking-sms` |
| [`payments.md`](#payments) | Daraja STK (active), legacy Pesapal/IntaSend webhooks, cron jobs |
| [`settings.md`](#settings) | `/settings/*` routes, module toggles, integrations |
| [`admin-flows.md`](#admin-flows) | Admin portal routes, staff invites, member approval |
| [`member-flows.md`](#member-flows) | Member portal routes, registration, approval gate |
| [`edge-functions-gap.md`](#edge-functions-gap) | Edge function inventory — **64 local, 65 deployed, 0 missing** |

### Doc vs code discrepancies (quick reference)

See inline **⚠️ DISCREPANCY** / **🚧 GAP** callouts in each area doc. Summary:

- First church creator: product doc says `church_admin`; code uses **`super_admin`** (`handle_new_user` trigger + `on-signup` webhook)
- Dual signup bootstrap: DB trigger **`handle_new_user`** and edge **`on-signup`** can both create tenant/user — verify Auth hook wiring
- Onboarding service picks → `tenant_metadata.priority_needs` only; **not** `enabled_modules`; admin nav **not filtered**
- `feature_permissions` table: **saved in UI, never enforced at runtime** (dead feature)
- `/church-studio`: real page exists but route hits **PlaceholderPage**
- Dashboard: labels and query semantics differ from product doc (see [admin-flows.md](#admin-flows))
- Giving: **Daraja** active in UI; **Pesapal/IntaSend** webhooks legacy (no frontend invoke)
- Staff invites: UI uses **`send-invitation`**; **`invite-user`** is legacy/unused

### Edge functions — invoke summary

| Category | Examples |
|---|---|
| **Frontend invoke** | `process-stk-push`, `send-invitation`, `member-login`, `send-communication`, `at-sms`, … (~40) |
| **Webhook / provider callback** | `payment-webhook`, `c2b-webhook`, `pesapal-webhook`, `intasend-webhook`, `whatsapp-webhook`, `africastalking-delivery-webhook` |
| **Auth hook** | `on-signup` |
| **Cron (no UI)** | `check-pledge-overdue`, `check-attendance-risk`, `notify-task-deadlines`, `notify-meeting-deadlines`, `reset-email-quota`, `reset-monthly-credits`, `process-email-automations` |
| **Legacy / utility (not invoked from `src/`)** | `invite-user`, `initiate-payment`, `generate-receipt`, `run-payroll`, `generate-quiz`, `generate-child-qr-codes` |

Full list: [`edge-functions-gap.md`](#edge-functions-gap).

---

<a id="product-context"></a>

## 2. Product Context

> **Purpose of this document:** This is the ground-truth product description, written from the product owner's perspective. It explains *what the system is supposed to do* and *why it behaves the way it does*. Code-level documentation (exact files, functions, database tables) should be cross-referenced against this document — where code and this document disagree, that's a discrepancy worth flagging, not silently resolving in either direction.
>
> **Status legend used throughout:**
> - ✅ Confirmed working — described and verified in production use
> - ⚠️ Needs verification — described here, but should be checked against actual code/behavior
> - 🚧 Not yet documented — category exists in the product but detailed behavior notes haven't been written yet

---

### 1. What VestryHub Is

VestryHub is a **multi-tenant SaaS application for churches**. Each church that signs up becomes a **tenant** — an isolated instance of the app with its own data, members, and configuration.

The system has two distinct sides:

1. **Admin Portal** — used by church administrators and staff to manage the church
2. **Member Portal** — used by congregation members to interact with their church (giving, messaging, events, etc.)

A single church admin manages their church's instance through the Admin Portal. Members access their church's specific instance through the Member Portal using a unique church code generated when the tenant is created.

---

### 2. The Landing Page (Public, Pre-Login)

The landing page is the public-facing entry point, before any authentication.

**What it shows:**
- An overview of the church's available services on the platform
- A **tiers/pricing section** showing the different subscription tiers available on VestryHub

**Three entry points:**

| Button | Audience | Purpose |
|---|---|---|
| **Get Started for Free** | Admins only | Begins the onboarding flow to create a new church (tenant) |
| **Sign In** | Admins only | Existing admin login to an already-created church instance |
| **Member Portal** | Members | Entry point for congregation members to access their specific church |

⚠️ **Important rule:** The **first person to create a church is always assigned the role `church_admin`**. This is the root identity for that tenant — every other admin/staff role within that church is created or invited *after* this first admin exists.

---

### 3. Onboarding Flow (Church Creation)

When an admin clicks **Get Started for Free**, they go through an onboarding form that collects:
- The name of the church
- The services the church wants to use from the app

⚠️ **Known gap — no enforcement of selected services:**
The onboarding form *asks* what services a church wants (e.g., a church might say they only want **member management**, nothing else), but the app **does not currently enforce or restrict the admin side based on this selection**. In other words, even if a church opts out of certain services during onboarding, the app does not hide, lock, or limit access to those unselected categories on the admin side. This is a known product gap, not a bug — the onboarding form's answers are currently informational/non-binding rather than controlling feature access.

**After onboarding completes:**
- A **tenant_id** is created for the church
- A **unique church code** is generated — this is what members use to find and join their specific church through the Member Portal

---

### 4. Admin Portal — Structure

Once inside the Admin Portal, the system is organized into **categories**, each containing **subcategories** (individual pages/features). This is the primary navigational structure new developers should understand first, since almost every admin-side route maps to one of these categories.

#### Category Map

| Category | Subcategories |
|---|---|
| **Overview** | Dashboard |
| **People** | Members, Groups, House Fellowships, Families, Children's Ministry, Visitors, Follow-up Tasks, New Converts |
| **Finance** | Give Online, Giving Records, Pledge Campaigns, Church Expenses, Budget Management, Payroll, Fund Accounting, Accounts Payable, General Ledger, Payouts |
| **Events & Operations** | Services, Events, Volunteering, Member Requests, Board Meetings, Facility & Event Booking |
| **Security** | Security Center, Incident Management |
| **Engagement** | Communications, Announcements, Member Messaging, Appointments, Testimonies, Surveys |
| **Media & Content** | Graphics Studio, AI Tools, Church Studio, Bible Explorer, Song Library, Church Media, Asset Management, Sermon Preparation, Sermons & Messages, Livestreaming |
| **Growth** | Discipleship Dashboard, Discipleship Resources, Outreach & Impact, Resources Store, Training |
| **Admin** | Reports & Analytics, Branches, Settings |

#### Other Persistent UI Elements (present across the Admin Portal)

These aren't tied to one category — they're part of the overall admin shell/layout:

- **Side navigation panel** — displays:
  - The church's name
  - The name of the church admin/user (when a user is invited, they're shown starting with their first name and email until they complete their profile)
- **Breadcrumb navigation**
- **Search bar**
- **Notification bell icon**
- **Display mode toggle** (light/dark, presumably — ⚠️ confirm exact behavior in code)
- **Profile menu** (top right)

---

### 5. Category Deep-Dive: Overview

#### 5.1 Dashboard

✅ **Stat cards — confirmed functional:**
- **Total Members**
- **Giving Today**
- **Events**
- **Groups**

⚠️ **Testing note from product owner:** These cards are functional, but should be actively tested for correctness — specifically, when a new member is added, verify that **Total Members** correctly increments and queries/displays the right count. This is flagged as "should always be double-checked," implying it has been a source of bugs or uncertainty before.

#### 5.2 The "Giving Today" Stat Card — Detailed Flow

This is called out specifically as **a very unique feature** worth understanding in detail, since it spans multiple parts of the system (member-facing payment UI, real-time updates, and several admin-side displays).

**The end-to-end flow:**

1. A **member or admin** goes to the **Finance → Give Online** tab and chooses to contribute via **M-Pesa**.
2. The system triggers an **STK push** — this sends a prompt directly to the contributor's phone, asking them to enter their M-Pesa PIN to authorize the payment.
3. While this is happening, the **app UI shows a pop-up** that displays:
   - The name of the church receiving the contribution
   - The amount the contributor entered
   - A **countdown/timer** showing how long the M-Pesa prompt has before it expires
4. Once the contributor completes the payment (enters PIN, confirms on their phone), the contribution is **recorded**.
5. This recorded contribution then propagates to **multiple places simultaneously**:
   - The **"Today's Giving"** stat card (wherever it's shown — dashboard and finance side)
   - **Admin side → Give Online** (the same screen where it was initiated)
   - **Admin side → Giving Records**
   - **Dashboard page → Today's Giving stat card**
   - **Dashboard page → Giving overview graph/bar**
   - **Dashboard page → Today's Donation section**

⚠️ **For developers:** This describes what is almost certainly a **real-time/broadcast-driven update pattern** (the same contribution updating six+ different UI surfaces without a page refresh implies some kind of live subscription, not just a database write that waits for next page load). When documenting this technically, confirm:
- What triggers the STK push (which edge function — likely `process-stk-push` or `initiate-payment`)
- What mechanism pushes the update to all these UI locations (Supabase real-time broadcast channel, polling, or both — prior technical discussion suggests this project uses a **broadcast + polling fallback** pattern for payment confirmation)
- Whether the popup countdown timer is driven by a fixed client-side timer or reflects an actual STK push expiry window from Safaricom's Daraja API

#### 5.3 Upcoming Events

🚧 Not yet detailed. Known to exist on the Dashboard as a section showing upcoming events. Further behavior (what counts as "upcoming," how far ahead it looks, whether it links to the Events subcategory) not yet documented.

---

### 6. Categories Not Yet Detailed

The following categories are confirmed to exist (per the category map in Section 4) but do not yet have detailed behavioral documentation written. These should be filled in following the same pattern as Section 5 (Overview) — i.e., for each subcategory: what it does, what data it touches, any non-obvious behaviors, and any known gaps or bugs.

- 🚧 **People** — Members, Groups, House Fellowships, Families, Children's Ministry, Visitors, Follow-up Tasks, New Converts
- 🚧 **Finance** (beyond Give Online's role in the giving flow above) — Giving Records, Pledge Campaigns, Church Expenses, Budget Management, Payroll, Fund Accounting, Accounts Payable, General Ledger, Payouts
- 🚧 **Events & Operations** — Services, Events, Volunteering, Member Requests, Board Meetings, Facility & Event Booking
- 🚧 **Security** — Security Center, Incident Management
- 🚧 **Engagement** — Communications, Announcements, Member Messaging, Appointments, Testimonies, Surveys
- 🚧 **Media & Content** — Graphics Studio, AI Tools, Church Studio, Bible Explorer, Song Library, Church Media, Asset Management, Sermon Preparation, Sermons & Messages, Livestreaming
- 🚧 **Growth** — Discipleship Dashboard, Discipleship Resources, Outreach & Impact, Resources Store, Training
- 🚧 **Admin** — Reports & Analytics, Branches, Settings

---

### 7. Open Questions / Known Gaps Worth Resolving

These are gaps or ambiguities surfaced directly from the product owner's notes — useful starting points for the next round of code verification:

1. **Onboarding service selection isn't enforced** (Section 3) — confirm whether this is intentional (a future feature) or simply unimplemented, and whether it should be scoped for a fix.
2. **STK push / Giving Today propagation mechanism** (Section 5.2) — confirm exact technical implementation (real-time channel vs. polling vs. both) and which edge functions are involved.
3. **Total Members count accuracy** (Section 5.1) — confirm the actual query logic behind this stat card and whether it has a known history of miscounting.
4. **Countdown timer source** (Section 5.2) — confirm whether the STK push popup timer reflects a real API-driven expiry or is a client-side approximation.

---

### 8. How to Extend This Document

This document is intentionally incremental. As more categories are detailed (by the product owner, by code verification, or both), follow this pattern per subcategory:

```
#### X.Y [Subcategory Name]

[1-2 sentence description of what it does and who uses it]

**Key behaviors:**
- [behavior 1]
- [behavior 2]

**Data flow / where it touches other parts of the system:**
- [e.g., "writes to X table, which the Dashboard also reads from"]

**Known gaps or things to verify:**
- [anything uncertain, untested, or intentionally incomplete]
```

Once a category section is added here, it should be cross-checked against actual code (page components, edge functions, database tables/RLS policies) before being considered "confirmed" rather than "described."

---

<a id="auth"></a>

## 3. Authentication & Identity

> Cross-ref: [`00-product-context.md`](#product-context) §2–3, [`permissions.md`](#permissions), [`admin-flows.md`](#admin-flows), [`member-flows.md`](#member-flows), [`edge-functions-gap.md`](#edge-functions-gap)

VestryHub has **two separate auth systems**: Supabase Auth for the **admin portal**, and a custom **member session** (`localStorage` + `member_sessions` table) for the **member portal**.

---

### Admin portal auth

#### Entry routes

| Route | File | Purpose |
|---|---|---|
| `/` | `src/pages/Index.tsx` | Landing — Get Started, Sign In, Member Portal links |
| `/auth/signup` | `src/pages/auth/SignUp.tsx` | New church admin registration |
| `/auth/signin` | `src/pages/auth/SignIn.tsx` | Existing admin login (email + Google OAuth) |
| `/auth/forgot-password` | `src/pages/auth/ForgotPassword.tsx` | Password reset request |
| `/auth/reset-password` | `src/pages/auth/ResetPassword.tsx` | Set new password after reset/invite |
| `/auth/callback` | `src/pages/auth/AuthCallback.tsx` | OAuth callback |
| `/auth/invite` | `src/pages/auth/InviteCallback.tsx` | Post-invite account setup |
| `/onboarding` | `src/pages/Onboarding.tsx` | Church profile + priority needs form |

#### Page structure (scan trees)

Use these trees for at-a-glance structure; prose sections below explain *why* each step exists.

##### `SignUp.tsx` — `/auth/signup`

```
SignUp.tsx
├─ Fields: fullName, email, password, agreed (terms checkbox)
├─ Validation: isPasswordStrong() — ≥8 chars, upper, lower, digit, special (!@#$%^&*)
├─ Supabase Auth: supabase.auth.signUp({ email, password, options: { data: { full_name }, emailRedirectTo: /auth/callback } })
├─ Alt path: handleGoogleSignUp() → signInWithOAuth('google') → redirect /auth/callback
└─ Redirect: toast success → /auth/signin (email verification flow; does not auto-login)
```

New auth users may also trigger **`handle_new_user`** (DB) and/or **`on-signup`** (Auth webhook) before the user reaches onboarding.

##### `SignIn.tsx` — `/auth/signin`

```
SignIn.tsx
├─ Fields: email, password
├─ Supabase Auth: supabase.auth.signInWithPassword({ email, password })
├─ Side effects (success or fail):
│   ├─ INSERT login_events (status: success | failed)
│   ├─ On fail: security_alerts (failed_login; brute_force_attempt if 3+ in 10 min)
│   └─ On success: UPDATE users.last_login_at; captureEvent('login_success')
├─ Route decision: SELECT users.tenant_id → tenants.onboarding_completed
│   ├─ onboarding_completed → /dashboard
│   ├─ incomplete → /onboarding
│   └─ no tenant_id → /onboarding
├─ Alt path: handleGoogleSignIn() → OAuth → /auth/callback
└─ Links: /auth/forgot-password, /auth/signup, /member/login
```

##### `AuthCallback.tsx` — `/auth/callback`

```
AuthCallback.tsx
├─ URL params: redirect_to, tenant_id (optional member-portal handoff)
├─ Session: supabase.auth.getSession() (PKCE code exchange automatic)
├─ Side effects: INSERT login_events; UPDATE users.last_login_at
├─ Branch A — member handoff: redirect_to=/member/welcome + tenant_id
│   └─ localStorage.setItem('member_tenant_id') → navigate /member/welcome
└─ Branch B — admin:
    ├─ SELECT users.tenant_id → tenants.onboarding_completed
    ├─ completed → /dashboard
    └─ incomplete → /onboarding
```

##### `InviteCallback.tsx` — `/auth/invite`

```
InviteCallback.tsx
├─ Session: supabase.auth.getSession() — no session → /auth/signin
├─ Read metadata: user_metadata.tenant_id, .role, .first_name, .last_name
├─ Fallback names: SELECT members by email + tenant_id if metadata empty
├─ UPSERT users (id, tenant_id, role, status: active, invitation_sent: true)
├─ UPSERT members (registration_source: admin_invite)
├─ If invitedRole !== 'member': invoke create-staff-thread
└─ Redirect: /auth/reset-password (set password after invite accept)
```

##### `Onboarding.tsx` — `/onboarding`

```
Onboarding.tsx
├─ Guard (useEffect): no session → /auth/signin; onboarding_completed → /dashboard
├─ Fields: churchName, city, selectedCountry, phoneCountry, phoneNumber, selectedNeeds[]
├─ Submit paths:
│   ├─ tenant exists → UPDATE tenants (name, city, country, phone, currency, onboarding_completed: true, tenant_metadata.priority_needs)
│   └─ no tenant → INSERT tenants + INSERT/UPDATE users (role: super_admin) — manual fallback if trigger failed
├─ Verify loop: poll tenants.onboarding_completed up to 5× (400 ms)
└─ Redirect: /dashboard
```

Priority needs are stored in **`tenant_metadata.priority_needs`** only — not `enabled_modules`.

##### `ForgotPassword.tsx` — `/auth/forgot-password`

```
ForgotPassword.tsx
├─ Fields: email
├─ Supabase Auth: resetPasswordForEmail(email, { redirectTo: /auth/reset-password })
└─ UI: success state (check inbox) — no auto-redirect
```

##### `ResetPassword.tsx` — `/auth/reset-password`

```
ResetPassword.tsx
├─ Guard: getSession() — no session → toast + /auth/forgot-password
├─ Fields: password, confirmPassword
├─ Validation: isPasswordStrong(); password === confirmPassword
├─ Supabase Auth: supabase.auth.updateUser({ password })
└─ UI: resetComplete success screen → link /auth/signin
```

Also reached from **`InviteCallback`** after staff invite accept.

##### `AuthGuard.tsx` — wraps all admin routes

```
AuthGuard.tsx
├─ Check: supabase.auth.getSession()
├─ Load: users (tenant_id, role, name) + tenants (onboarding_completed)
├─ States:
│   ├─ unauthenticated → /auth/signin
│   ├─ needs-onboarding (no tenant_id OR onboarding_completed=false) → /onboarding
│   └─ ready → ChurchProvider + <Outlet />
├─ Inactivity: warning @ 28 min; signOut @ 30 min
└─ Realtime: postgres_changes on users (name sync for sidebar)
```

#### Guard: `AuthGuard` (prose)

**File:** `src/components/layout/AuthGuard.tsx`

1. Requires Supabase session.
2. Loads `users` → `tenant_id`, `role`, name.
3. No `tenant_id` → `/onboarding`.
4. `tenants.onboarding_completed === false` → `/onboarding`.
5. Wraps `ChurchProvider`.
6. **30-minute inactivity logout** (warning at 28 min).
7. Realtime `users` UPDATE subscription for sidebar name sync.

---

### First user / tenant creation (two paths)

⚠️ **Both exist in production** — understand which runs for a given signup (trees in Path A/B below).

#### Path A — DB trigger `handle_new_user()`

**Migrations:** `20260318150856_on_auth_user_created_trigger.sql`, `20260521094558_ensure_handle_new_user_security_definer.sql`

```
handle_new_user()  [on auth.users INSERT]
├─ INSERT tenants (name/church_code from user metadata)
├─ INSERT users (role: super_admin, status: active)
└─ Trigger: create_member_for_user → linked members row
```

Also triggers `create_member_for_user` for linked `members` row.

#### Path B — Edge function `on-signup`

**File:** `supabase/functions/on-signup/index.ts`  
**Trigger:** Supabase Auth hook / webhook on `auth.users` INSERT (payload `{ type, record }`)

```
on-signup  [Auth webhook: type=INSERT on auth.users]
├─ Skip if users row already exists
├─ INSERT tenants (random church_code, placeholder name, onboarding_completed: false)
└─ INSERT users (role: super_admin, status: active)
```

If no existing `users` row — creates tenant + user as above. Skips if row exists.

⚠️ **Risk:** Path A and Path B can race on signup if both are wired — verify Auth hook config in Supabase dashboard. Onboarding form (`Onboarding.tsx`) also has manual tenant-create fallback if trigger failed.

⚠️ **DISCREPANCY:** Product context says first creator gets **`church_admin`**; both paths use **`super_admin`**.

#### Onboarding form

**File:** `src/pages/Onboarding.tsx`

- Updates existing tenant OR creates tenant+user if missing.
- Saves **`tenants.tenant_metadata.priority_needs`** — not `enabled_modules`.
- Sets `onboarding_completed: true`.

(See tree under [Page structure](#page-structure-scan-trees) above.)

---

### Staff invitation (current UI path)

**Edge function:** `supabase/functions/send-invitation/index.ts`  
**Invoked from:** `src/pages/settings/Users.tsx` only (not `invite-user`)

1. `inviteUserByEmail` → redirect `/auth/invite`.
2. Already registered (422) → direct `users` upsert + optional staff thread when `alreadyRegistered`.
3. Uses `_shared/branded-email.ts` for Resend (when configured).

**Invite callback:** `src/pages/auth/InviteCallback.tsx`

- Upserts `users` + `members`.
- `create-staff-thread` **only if** `invitedRole !== 'member'`.

#### Legacy: `invite-user`

**File:** `supabase/functions/invite-user/index.ts`

- Creates auth user with temp password OR finds existing; upserts `users`.
- Maps church roles → `staff_leader` / `member` (different enum set than `send-invitation`).
- Optional Resend email via recovery link (`/auth/callback`), not `/auth/invite`.
- Uses `_shared/buildBrandedEmail.ts`.

**Status:** **Not invoked from any file under `src/`**. Superseded by `send-invitation` + `InviteCallback`. Kept deployed for backward compatibility.

---

### Role changes / deactivation

**Edge function:** `update-user-role/index.ts`  
**Invoked from:** `Users.tsx` — deactivate, reactivate, role change.

Reactivate path creates staff directory thread inline (duplicates `create-staff-thread` logic).

---

### Member portal auth

#### Guard: `MemberAuthGuard`

**File:** `src/components/layout/MemberAuthGuard.tsx`

```
MemberAuthGuard.tsx
├─ Read: localStorage.member_session (JSON)
├─ Validate: expiresAt > now — else remove + no-session
├─ no-session → /member/login
└─ authed → MemberPortalProvider + <Outlet />
```

- Reads `localStorage.member_session` (JSON with `expiresAt`, token, member/tenant ids).
- **Not** Supabase Auth JWT.

#### Member login

**Edge function:** `member-login/index.ts`  
**UI:** `MemberLogin.tsx`

```
MemberLogin.tsx  — /member/login
├─ Fields: email, churchCode (auto-fill from ?code= URL param)
├─ Lookup: SELECT tenants (name, logo) by church_code when code length ≥ 9
├─ Edge: invoke member-login { email, churchCode }
├─ Error mapping:
│   ├─ invalid_code → toast
│   ├─ member_not_found → toast
│   └─ pending_approval → toast (6s) — membership_status gate
├─ Success: localStorage.member_session = { memberId, tenantId, memberName, sessionToken, expiresAt }
└─ Redirect: /member
```

Server-side gate in **`member-login/index.ts`**:

1. Resolve tenant by `church_code` OR `invite_code`.
2. Find active `members` row by email + tenant.
3. **Block** if `membership_status === "Pending Approval"` → HTTP 403 `{ error: "pending_approval" }`.
4. Insert `member_sessions` row; return 30-day session token.

#### Member registration

**Edge function:** `member-register/index.ts`  
**UI:** `JoinChurch.tsx`, `MemberRegistration.tsx`

```
JoinChurch.tsx  — /member/join
├─ URL params: ?code= (church code), ?type=member|visitor
├─ Step 1: memberType — "member" | "visitor"
├─ Fields (shared): firstName, lastName, phone, email
├─ Fields (member): gender, dateOfBirth, address, city, occupation, maritalStatus
├─ Fields (visitor): howHeard, ageGroup, preferredContact, prayerRequest
├─ Edge: invoke member-register { churchCode, memberType, registrationSource: qr_scan|form, … }
├─ Success UI: shows church name/code; member path → pending approval message
└─ No redirect to /member — login blocked until admin approves
```

- Sets `membership_status: "Pending Approval"` for members.
- Login blocked until admin approves (see [`member-flows.md`](#member-flows)).

---

### Platform super-admin

| Route | Guard |
|---|---|
| `/superadmin`, `/superadmin/churches`, `/superadmin/storage-requests` | `SuperAdminGuard` |

Not in product context doc.

---

### Key tables

| Table | Role |
|---|---|
| `auth.users` | Admin Supabase Auth |
| `users` | Admin/staff profile; `tenant_id`, `role`, `status` |
| `tenants` | `church_code`, `onboarding_completed`, `enabled_modules` |
| `members` | Congregation; `membership_status`, `user_id` link |
| `member_sessions` | Server-side member portal sessions |

---

### Edge function reference (auth-related)

| Function | Frontend invoke? | Purpose |
|---|---|---|
| `send-invitation` | Yes — `Users.tsx` | Current staff invite |
| `invite-user` | **No** | Legacy invite |
| `on-signup` | Webhook only | Alternate tenant bootstrap |
| `update-user-role` | Yes — `Users.tsx` | Role/status |
| `member-login` | Yes — `MemberLogin.tsx` | Member session |
| `member-register` | Yes — `JoinChurch.tsx` | Self-registration |
| `create-staff-thread` | Yes — `InviteCallback`, `Users.tsx` | Staff directory tile |
| `get-active-sessions` | Yes — `SecurityCentre.tsx` | Admin session list |
| `sync-member-profile` | Yes — `MemberProfile.tsx` | Name sync to `users` |
| `check-auth-format` | No | PayHero secret diagnostic |

---

<a id="permissions"></a>

## 4. Permissions & Access Control

> Cross-ref: [`00-product-context.md`](#product-context), [`auth.md`](#auth), [`settings.md`](#settings)

VestryHub has **multiple permission mechanisms** that are **not unified**. Only one is enforced on admin page actions today.

---

### Runtime enforcement: `usePermissions()`

**File:** `src/hooks/usePermissions.ts`  
**Consumers:** `PermissionButton`, `ReadOnlyBanner`, ~90 admin pages

#### Data source

```typescript
supabase.from('user_fine_permissions')
  .select('permission_key, level')
  .eq('user_id', userId)
  .eq('tenant_id', tenantId)
```

**Table:** `user_fine_permissions`  
**Migration:** `supabase/migrations/20260419115950_create_user_fine_permissions_table.sql`  
**RLS policy:** `ufp_tenant`

#### Levels

| Level | Behavior |
|---|---|
| `default` | Treated as **full access** (same as explicit full) |
| `read_only` | `isReadOnly()` true — write actions hidden/disabled |
| `full_access` | Full write access |

#### Admin bypass

```typescript
const isAdmin = userRole === 'super_admin' || userRole === 'church_admin';
// Admins skip DB read; always full_access
```

⚠️ **DISCREPANCY:** Product doc refers to founding role as `church_admin`; founding users are often `super_admin` in DB — both bypass fine permissions.

#### Permission keys → routes

Defined in `PERMISSION_PATHS`:

| Key | Routes (prefix match) |
|---|---|
| `member_management` | `/members`, `/families`, `/childrens-ministry`, `/visitors`, `/follow-up-tasks`, `/new-converts` |
| `financial_records` | `/give-online`, `/giving-records`, … all finance paths |
| `event_management` | `/services`, `/events`, `/volunteering`, `/member-requests`, `/board-meetings`, `/facility-booking` |
| `communication_tools` | `/communications`, `/announcements`, `/member-messaging`, `/appointments`, `/testimonies`, `/surveys` |
| `reports_analytics` | `/reports` |
| `attendance` | `/settings/attendance` |
| `groups_ministries` | `/groups`, `/house-fellowships` |
| `church_settings` | `/settings`, `/branches` |

**Managed from:** `src/pages/settings/Users.tsx` (fine permissions on staff users)

---

### 🚧 DEAD FEATURE: `feature_permissions`

> **This must not be documented as working access control.**

#### What exists

| Item | Location |
|---|---|
| Table | `feature_permissions` (`tenant_id`, `feature`, `role`, `access_level`) |
| Migration | `supabase/migrations/20260418052843_create_feature_permissions_table.sql` |
| RLS | `fp_tenant` |
| Admin UI | `src/pages/settings/FeaturePermissions.tsx` — tab inside `RolesPermissions.tsx` |
| Save path | Upserts rows to `feature_permissions` on Save |

#### What does NOT exist

- **No reads** of `feature_permissions` anywhere in `src/` except `FeaturePermissions.tsx` itself.
- **`usePermissions()` does not consult this table.**
- **Admin navigation** (`src/components/layout/AppLayout.tsx`) does not filter by `feature_permissions`.
- **No route guard** checks `feature_permissions`.

#### User-visible illusion

Church admins can configure a role × feature matrix (full / read / none) in **Settings → Roles & Permissions → Feature Permissions**. Changes **persist to the database** but **have zero effect** on who can access or edit pages.

#### Intended vs actual

| System | Stored in | Enforced |
|---|---|---|
| Fine-grained staff gates | `user_fine_permissions` | **Yes** (`usePermissions`) |
| Role × feature matrix | `feature_permissions` | **No — dead feature** |
| Module toggles | `tenants.enabled_modules` | **Member portal only** |
| Onboarding picks | `tenants.tenant_metadata.priority_needs` | **No** |

**Remediation options (future):** Wire `feature_permissions` into `usePermissions` or nav; or remove/hide the UI to avoid false confidence.

---

### Other override tables

#### `user_role_overrides`

**Migration:** `20260418054231_create_user_role_overrides_table.sql`  
**UI:** `src/pages/settings/UserOverrides.tsx` (Roles & Permissions tab)  
**RLS:** `uro_tenant`  
**Purpose:** Assign alternate roles to members for permission inheritance UI — **not** the same as `user_fine_permissions` runtime gates.

#### `member_permission_overrides`

**Migration:** `20260418055451_create_member_permission_overrides_table.sql`  
**UI:** `UserOverrides.tsx`, `ManagePermissionsModal.tsx`  
**RLS:** `mpo_tenant`  
**Purpose:** Per-member portal feature overrides — separate from admin `usePermissions`.

---

### Member portal module gates

**Source:** `tenants.enabled_modules.member_portal` (JSON)  
**Read in:** `src/contexts/MemberPortalContext.tsx`, `src/pages/member/MemberHome.tsx`  
**Written from:** `src/pages/settings/MemberApp.tsx`, `MemberAppFeatures.tsx`

Member home tiles filter on enabled modules. **Admin sidebar does not use this.**

---

### Subscription / staff limits

**Table:** `tenant_subscriptions` (`staff_limit`, credits)  
**Enforced in:** `send-invitation` edge function, `Users.tsx` client checks (`canAddStaff`)

Separate from permission keys above.

---

### Summary checklist for developers

- [ ] Use `usePermissions()` + `PermissionButton` for admin write gates
- [ ] Do **not** assume `feature_permissions` does anything at runtime
- [ ] Do **not** assume onboarding or `ServicesModules` hides admin nav
- [ ] Member portal: check `enabled_modules.member_portal`
- [ ] Pending members: `membership_status`, not `users.role`

---

<a id="messaging"></a>

## 5. Messaging

> Cross-ref: [`auth.md`](#auth), [`admin-flows.md`](#admin-flows), [`member-flows.md`](#member-flows)

Two conversation types in **`conversations`** + **`conversation_participants`** + **`messages`**.

---

### 1. Staff directory (discovery tiles)

| Field | Value |
|---|---|
| `is_staff_directory` | `true` |
| `staff_user_id` | Staff `users.id` |
| `name` | Denormalized display name |
| `type` | `direct` |

**Member UI:** `MemberMessages.tsx` — section “Message a leader”.

**Created by:**

| Event | Code path |
|---|---|
| Staff invite accepted | `InviteCallback.tsx` → `create-staff-thread` if `invitedRole !== 'member'` |
| Staff add Path C | `Users.tsx` → `create-staff-thread` |
| Staff add (no invite) | `Users.tsx` → `create-staff-thread` |
| Already-registered invite | `send-invitation/index.ts` inline when `alreadyRegistered` |
| Staff reactivate | `update-user-role/index.ts` inline |

**Edge function:** `create-staff-thread/index.ts` — welcome message in `messages`, participant row, idempotent if thread exists.

---

### 2. Private member ↔ staff DMs

| Field | Value |
|---|---|
| `is_staff_directory` | `false` |
| Participants | Member + one staff (2 rows in `conversation_participants`) |

**Member:** `joinStaffThread()` in `MemberMessages.tsx` — creates private conv with `staff_user_id`, `name`.

**Admin:** `MemberMessaging.tsx`

- Query: `["conversations-dm", tenantId, userId]`
- Filters: `type=direct`, `is_staff_directory=false`, current user in participants.

**Helpers:** `src/lib/messaging.ts` — `staffDisplayName()`, `formatStaffRole()`.

---

### Routes

| Side | Path | File |
|---|---|---|
| Admin | `/member-messaging` | `MemberMessaging.tsx` |
| Admin | `/communications`, `/communications/compose` | Bulk email/SMS |
| Member | `/member/messages` | `MemberMessages.tsx` |

---

### Bulk communications (separate from DMs)

| Channel | Edge function | Invoke sites |
|---|---|---|
| Email | `send-communication` | `Communications.tsx`, `ComposeEmail.tsx`, `EmailTemplates.tsx`, `AdminBroadcast.tsx` |
| SMS (bulk) | `africastalking-sms` | `SmsTab.tsx`, `SmsSettings.tsx`, `ComposeEmail.tsx` |
| SMS (settings test) | **`at-sms`** | `NotificationsSettings.tsx` — `action: "check_balance"`; uses `tenants.at_*` columns |
| WhatsApp | `send-whatsapp-message` | `WhatsAppCloud.tsx` |
| Push | `send-push-notification` | `AdminBroadcast.tsx` |

**Note:** `at-sms` and `africastalking-sms` are **different implementations** — settings notifications uses `at-sms` (tenant credentials on `tenants` table); comms module uses `africastalking-sms` (subscription credits / `sms_settings`).

**Branded email shared code:**

- `_shared/branded-email.ts` — used by `send-invitation`, `send-communication`
- `_shared/buildBrandedEmail.ts` — used by `website-consultation`, `invite-user`, `build-branded-email` HTTP function

---

### Scheduled notifications (messaging-adjacent)

| Function | Target |
|---|---|
| `notify-task-deadlines` | `follow_up_tasks` due 7d/1d → `notifications` for `super_admin` / `staff_leader` |
| `notify-meeting-deadlines` | `board_meetings` 24h/1h → same admin roles |
| `send-bible-reminder` | Invoked from `BibleExplorer.tsx` — manual trigger, not cron |

---

### Database & RLS

**Tables:** `conversations`, `conversation_participants`, `messages`, `notifications`

**Key migrations:**

- `20260423003927_member_portal_messaging_rls.sql`
- `20260423025407_fix_member_portal_messages_rls.sql`
- `20260423030918_fix_messages_rls_anon_conflict.sql`

**Backfill (local):** `20260615120000_staff_directory_display_names.sql`

---

### Known gaps

1. `InviteCallback` does not check `create-staff-thread` errors before navigating away.
2. Founding admin may lack staff tile if never through invite/add paths.
3. `invite-user` legacy function does **not** create staff threads and is unused by UI.

---

<a id="payments"></a>

## 6. Payments & Giving

> Cross-ref: [`00-product-context.md`](#product-context) §5.2, [`admin-flows.md`](#admin-flows), [`member-flows.md`](#member-flows), [`edge-functions-gap.md`](#edge-functions-gap)

**Active M-Pesa rail:** Safaricom **Daraja** STK push — **`process-stk-push`** (initiate) + **`payment-webhook`** (callback). C2B uses **`c2b-webhook`** + **`register-c2b-urls`**.

Legacy/alternate gateways (Pesapal, IntaSend, PayHero-initiate) remain deployed with source in repo but are **not** used by current giving UI.

---

### Active flow: Daraja STK push

#### Initiation (frontend)

| UI | File | Edge function |
|---|---|---|
| Admin Give Online | `src/pages/finance/GiveOnline.tsx` | `process-stk-push` |
| Member Give | `src/pages/member/MemberGive.tsx` | `process-stk-push` |
| Member pledges | `src/pages/member/MemberPledgeCampaigns.tsx` | `process-stk-push` |

**`process-stk-push`** (`supabase/functions/process-stk-push/index.ts`):

- Reads Daraja credentials from **`tenants`** (`daraja_consumer_key`, `daraja_consumer_secret`, `daraja_passkey`, `daraja_transaction_type`, `payhero_channel_number`).
- Requires `payhero_connected` and Daraja fields configured (Settings → Payments).
- Creates/updates **`giving_records`**, calls Safaricom STK API (`DARAJA_ENV` controls sandbox vs production).

#### Callback (server — no frontend invoke)

**`payment-webhook`** — Daraja STK `stkCallback`:

- Matches row by `external_reference` = `CheckoutRequestID`.
- Maps `ResultCode`: `0` → `confirmed` (+ `mpesa_receipt`); `1032`/`1037` → `cancelled`; else → `failed`.

#### User experience (Give Online)

**File:** `src/pages/finance/GiveOnline.tsx`

1. User enters amount + M-Pesa phone → invokes `process-stk-push`.
2. Modal shows church name, amount, **90-second countdown**.
3. User completes PIN on phone.

⚠️ **DISCREPANCY:** Product context asks whether countdown reflects Safaricom expiry. **Code uses fixed 90s client timer** (`countdown: 90`), not API-driven expiry.

#### Confirmation propagation (UI)

After `giving_records.payment_status` → `confirmed`:

| Mechanism | Detail |
|---|---|
| **Realtime** | `postgres_changes` on `giving_records` filter `id=eq.{givingRecordId}` |
| **Polling fallback** | Every **2s** SELECT until terminal state |

⚠️ **DISCREPANCY:** Dashboard card labeled **“Today's Giving”**; product doc says **“Giving Today”**.

---

### Legacy / inactive payment endpoints (kept deployed)

These functions exist locally and on Supabase. **No `supabase.functions.invoke()` call** for them exists under `src/`. Daraja is the live path for new giving.

#### `pesapal-webhook`

**File:** `supabase/functions/pesapal-webhook/index.ts`

- Expects Pesapal IPN JSON (`OrderTrackingId`, `OrderNotificationType`, …).
- Updates `giving_records.payment_status` where `pesapal_transaction_id` = `OrderTrackingId`.
- **Status:** Legacy webhook receiver. Schema still has `giving_records.pesapal_transaction_id` and `integration_provider_enum` includes `'pesapal'`. Legal copy in `Legal.tsx` mentions PesaPal. **Not wired to current Give Online / Member Give UI.**

#### `intasend-webhook`

**File:** `supabase/functions/intasend-webhook/index.ts`

- Expects IntaSend invoice payload; maps `state` → `payment_status`.
- Also matches on **`pesapal_transaction_id`** column (shared legacy reference field).
- **Status:** Legacy webhook receiver. Same schema/legal references as Pesapal. **Not wired to current giving UI.**

#### `initiate-payment`

**File:** `supabase/functions/initiate-payment/index.ts`

- PayHero STK push using global `PAYHERO_BASIC_AUTH` secret + `channel_id`.
- Creates pending `giving_records` row.
- **Status:** Alternate integration path; used only in test components could invoke it but **no production page invoke found**. Superseded for churches by Daraja via `process-stk-push`.

#### `generate-receipt`

**File:** `supabase/functions/generate-receipt/index.ts`

- Input: `{ giving_record_id }`.
- Generates HTML receipt → `giving-receipts` storage bucket → signed URL on `giving_records.receipt_url`.
- **Status:** Server-side utility; **not invoked from frontend**. Could be called post-payment via future hook/cron.

---

### Other payment-related functions (active)

| Function | Trigger | Purpose |
|---|---|---|
| `register-credentials` | `PaymentsPage.tsx` | Save/validate Daraja credentials on `tenants` |
| `register-c2b-urls` | `PaymentsPage.tsx` | Register Safaricom C2B URLs |
| `c2b-webhook` | Safaricom C2B POST | Record paybill payments |
| `register-payment-channel` | PayHero test/setup components | PayHero channel registration |
| `run-payroll` | **Not invoked from `src/`** | B2C payroll disbursement via PayHero (edge function exists; Payroll UI may use direct API/DB) |
| `get-payhero-banks` / `get-supported-banks` | Payment setup tests | Bank lists |
| `test-payhero-api` / `test-payhero-stk` | Diagnostic components | PayHero connectivity |
| `check-auth-format` | Manual/diagnostic | Inspects PayHero auth secret format |

---

### Scheduled (cron — no frontend)

| Function | Schedule (per source comments) | Action |
|---|---|---|
| `check-pledge-overdue` | Daily | `pledges.status` → `overdue` when campaign `end_date` &lt; 7 days ago |
| `check-attendance-risk` | Weekly | Inserts `notifications` (`type: attendance_risk`) for **`users`** absent from last 3 sessions per service type |
| `notify-task-deadlines` | Cron | `follow_up_tasks` due 7d/1d → admin notifications |
| `notify-meeting-deadlines` | Cron | `board_meetings` 24h/1h reminders |
| `reset-email-quota` | 1st of month | Reset `email_quotas.monthly_sent` |
| `reset-monthly-credits` | Billing period | Subscription credits (`tenant_subscriptions`) |
| `process-email-automations` | Cron | Automated email sends |

---

### Configuration UI

| Route | File |
|---|---|
| `/settings/payments` | `src/pages/settings/PaymentsPage.tsx` — Daraja + C2B |
| `/settings/giving` | `src/pages/settings/GivingSettings.tsx` |
| `/give-online` | `src/pages/finance/GiveOnline.tsx` |

---

### Key tables & columns

| Table / column | Notes |
|---|---|
| `giving_records` | `payment_status`, `mpesa_receipt`, `checkout_request_id`, `external_reference`, `given_at` |
| `giving_records.pesapal_transaction_id` | **Legacy shared ref** — used by Pesapal/IntaSend webhooks, not Daraja STK |
| `tenants.daraja_*` | Active Daraja credentials |
| `tenants.payhero_connected` | Gate for `process-stk-push` |
| `pledges` | Updated by `check-pledge-overdue` |

**RLS:** `20260517174709_add_payhero_finance_tables.sql`; `20260524120000_fix_member_payhero_access.sql`.

---

### Payment status values

`confirmed`, `failed`, `cancelled`, `pending`, `voided` (Pesapal REVERSED maps to `voided`).

Give Online / Member Give: `confirmed` = success; `cancelled` / `failed` = terminal modal states.

---

<a id="settings"></a>

## 7. Settings

> Cross-ref: [`00-product-context.md`](#product-context) §4 Admin, [`permissions.md`](#permissions), [`auth.md`](#auth)

Settings live under **`/settings/*`** inside `SettingsLayout` (`src/components/settings/SettingsLayout.tsx`).

Index redirect: `/settings` → `/settings/general`

---

### Settings routes (implemented)

| Path | File | Notes |
|---|---|---|
| `/settings/general` | `GeneralSettings.tsx` | Church basics |
| `/settings/vision` | `VisionMission.tsx` | |
| `/settings/contact` | `ContactSocial.tsx` | |
| `/settings/qr-codes` | `QRCodesPage.tsx` | Member join QR |
| `/settings/profile` | `ChurchProfile.tsx` | |
| `/settings/services` | `ServicesModules.tsx` | **Also mounted at `/settings/modules`** |
| `/settings/modules` | `ModulesSettings.tsx` | Duplicate path — two components |
| `/settings/roles` | `RolesPermissions.tsx` | Also `/settings/access-control` |
| `/settings/billing` | `Billing.tsx` | |
| `/settings/security` | `Security.tsx` | |
| `/settings/integrations` | `Integrations.tsx` | |
| `/settings/seo` | `WebsitePromoPage.tsx` | |
| `/settings/member-app` | `MemberAppFeatures.tsx` | Member portal toggles |
| `/settings/branches` | `BranchCredentials.tsx` | |
| `/settings/users` | `Users.tsx` | Staff invites, fine permissions |
| `/settings/staff` | `Staff.tsx` | |
| `/settings/registration` | `RegistrationSettings.tsx` | |
| `/settings/preferences` | `PreferencesSettings.tsx` | |
| `/settings/attendance` | `AttendanceSettings.tsx` | |
| `/settings/notifications` | `NotificationsSettings.tsx` | Invokes **`at-sms`** (`action: "check_balance"`) — tenant `at_username` / `at_api_key` |
| `/settings/service-requests` | `ServiceRequestTypes.tsx` | |
| `/settings/facility-types` | `FacilityTypesPage.tsx` | |
| `/settings/website` | `WebsitePromoPage.tsx` | Invokes `website-consultation` |
| `/settings/privacy` | `PrivacyPage.tsx` | `data-download-request` |
| `/settings/backup` | `BackupPage.tsx` | |
| `/settings/legal` | `LegalSettings.tsx` | `legal-signature-notify` |
| `/settings/giving` | `GivingSettings.tsx` | |
| `/settings/tax` | `TaxSettings.tsx` | |
| `/settings/payments` | `PaymentsPage.tsx` | Daraja / C2B setup |
| `/settings/communications-settings` | `CommunicationsSettings.tsx` | |
| `/settings/livestreaming` | `LivestreamingSettings.tsx` | |
| `/settings/announcement-types` | `AnnouncementTypes.tsx` | |
| `/settings/testimony-categories` | `TestimonyCategories.tsx` | |
| `/settings/media-categories` | `MediaCategories.tsx` | |
| `/settings/appointment-types` | `AppointmentTypes.tsx` | |
| `/settings/group-types` | `GroupTypes.tsx` | |

#### Placeholder settings (coming soon)

`/settings/branding`, `/settings/whatsapp`, `/settings/verification` — empty state in `App.tsx`.

---

### Module & feature toggles

#### `tenants.enabled_modules`

**Written by:**

| File | Shape |
|---|---|
| `ServicesModules.tsx` | Array of module slug strings |
| `ModulesSettings.tsx` | Object map `{ moduleKey: boolean }` |
| `MemberApp.tsx` | `{ member_portal: { featureKey: boolean } }` |
| `MemberAppFeatures.tsx` | Same member_portal shape |

⚠️ **GAP:** Multiple writers use **inconsistent JSON shapes** for the same column. Risk of clobbering keys when saving from different settings pages.

**Read by:**

- **Member portal only:** `MemberPortalContext.tsx`, `MemberHome.tsx` filters tiles by `enabled_modules.member_portal`.

**NOT read by:** Admin sidebar (`AppLayout.tsx` → `navigationGroups` from `src/config/navigation.ts`).

⚠️ **DISCREPANCY:** Product context §3 — onboarding service selection does not restrict admin UI. **`enabled_modules` also does not restrict admin nav** (only member portal).

#### Onboarding priority needs

**Stored in:** `tenants.tenant_metadata.priority_needs` (array of string IDs from `Onboarding.tsx`)  
**Not wired** to `enabled_modules` or navigation.

---

### Roles & permissions settings

**File:** `src/pages/settings/RolesPermissions.tsx`

Tabs include:

1. **Feature Permissions** → `FeaturePermissions.tsx` → writes **`feature_permissions`**
2. **User Overrides** → `UserOverrides.tsx` → `user_role_overrides`, `member_permission_overrides`

🚧 **See [`permissions.md`](#permissions):** `feature_permissions` is **saved but not enforced at runtime** — dead feature in UI.

**Staff fine permissions:** Managed per-user in `Users.tsx` → **`user_fine_permissions`** (enforced via `usePermissions()`).

---

### Church code generation

**Edge function:** `generate-church-code`  
**Invoked from:** `RolesPermissions.tsx`  
**Stored in:** `tenants.church_code`

---

### Key settings-related tables

| Table | Purpose |
|---|---|
| `tenants` | `enabled_modules`, `tenant_metadata`, branding, onboarding flags |
| `feature_permissions` | Role×feature matrix (**not enforced**) |
| `user_fine_permissions` | Per-user admin gates (**enforced**) |
| `user_role_overrides` | Alternate role assignments |
| `member_permission_overrides` | Member portal overrides |
| `tenant_subscriptions` | Plan limits, credits |
| `integration_settings` | Third-party credentials |
| `sms_settings`, `email_templates`, etc. | Comms config |

---

### Admin shell (cross-settings UI)

From product context §4 — confirmed in code:

| Element | File |
|---|---|
| Side nav (church name, user first name) | `AppLayout.tsx` |
| Breadcrumbs | `Breadcrumb.tsx` |
| Search | `TopNavbar.tsx` |
| Notifications bell | `TopNavbar.tsx` |
| Light/dark toggle | `TopNavbar.tsx` — `next-themes` |
| Profile menu | `TopNavbar.tsx` |

⚠️ **DISCREPANCY:** Product doc says “display mode toggle (light/dark, presumably)” — **confirmed: light/dark via Sun/Moon button**.

---

<a id="admin-flows"></a>

## 8. Admin Portal Flows

> Cross-ref: [`00-product-context.md`](#product-context), [`auth.md`](#auth), [`permissions.md`](#permissions), [`payments.md`](#payments), [`messaging.md`](#messaging)

All routes below require **`AuthGuard`** + **`AppLayout`** unless noted. Source: `src/App.tsx`, `src/config/navigation.ts`.

---

### Navigation categories (sidebar)

Matches product context §4 with these naming notes:

| Category | ⚠️ Notes |
|---|---|
| Security | Route **`/security-centre`** (British spelling; doc says “Security Center”) |
| Media | **Church Studio** nav item → **`/church-studio` → PlaceholderPage** (real page at `src/pages/media/ChurchStudio.tsx` not wired) |
| Engagement | `/appointments` has real route (not placeholder) |

Full route list: see structural index in [`README.md`](#readme).

---

### Dashboard (`/dashboard`)

**File:** `src/pages/Dashboard.tsx`

```
Dashboard.tsx
├─ Context: useChurch() → tenantId, currency, name
├─ Permission: usePermissions() (read-only gates on quick actions)
├─ Stat cards (useQuery "dashboard-stats"):
│   ├─ Total Members — COUNT members (no status filter)
│   ├─ Month giving — SUM giving_records confirmed, given_at ≥ 1st of month (badge: "This month")
│   ├─ Upcoming Events — COUNT events in next 7 days
│   └─ Active Groups — COUNT groups where is_active=true
├─ Today's Giving card (separate query "todays-total"):
│   ├─ SELECT all confirmed giving_records for tenant
│   └─ Client filter: given_at local date === today (badge: "Today")
├─ Charts: giving trend (30d), group distribution, upcoming events list
├─ Activity feed: useActivityLog() — recent tenant actions
└─ Quick actions: links to /members, /give-online, /events, /communications (PermissionButton gated)
```

#### Stat cards

| Card label (UI) | Product doc name | Query |
|---|---|---|
| Total Members | Total Members | Count all `members` for tenant (**no status filter**) |
| Today's Giving | Giving Today | Sum `giving_records` where `payment_status=confirmed` and `given_at` is today (local date) |
| Upcoming Events | Events | Count `events` in **next 7 days** |
| Active Groups | Groups | Count `groups` where `is_active=true` |

⚠️ **DISCREPANCIES:**

- Card labels differ from product doc.
- “Events” in doc vs “Upcoming Events” in UI — **7-day window**, not all events.
- Total Members may **over-count** inactive/pending if included in `members` table (no filter).
- Comment in code says “Direct queries for debugging - replace RPC temporarily” — RPC exists in migrations (`20260407111706_update_dashboard_stats_rpc.sql`) but not used.

#### Giving propagation

See [`payments.md`](#payments) — realtime + polling on Give Online; dashboard uses separate React Query fetches.

---

### People module

| Route | File | Permission key |
|---|---|---|
| `/members` | `Members.tsx` | `member_management` |
| `/members/:memberId` | `MemberProfile.tsx` | `member_management` |
| `/groups`, `/groups/:groupId` | `Groups.tsx`, `GroupDetail.tsx` | `groups_ministries` |
| `/house-fellowships` | `HouseFellowships.tsx` | `groups_ministries` |
| `/families` | `Families.tsx` | `member_management` |
| `/visitors` | `Visitors.tsx` | `member_management` |
| `/follow-up-tasks` | `FollowUpTasks.tsx` | `member_management` |
| `/new-converts` | `NewConverts.tsx` | `member_management` |
| `/childrens-ministry/*` | `CMLayout.tsx` + subpages | `member_management` |
| `/childrens-ministry/kiosk` | `CMKiosk.tsx` | Fullscreen, outside sidebar |

#### Member approval (admin action)

**Primary UI:** `MemberProfile.tsx` — button **“✓ Approve Member”** when `membership_status === "Pending Approval"`.

```
MemberProfile.tsx  — /members/:memberId
├─ Permission: usePermissions('member_management') → readOnly
├─ Load: member row + groups, giving, attendance tabs
├─ Pending banner: membership_status === "Pending Approval"
├─ Approve button (PermissionButton):
│   ├─ UPDATE members SET membership_status='Member', status='active'
│   ├─ invalidateQueries ["member", memberId]
│   └─ toast.success("Member approved")
├─ Edit dialog: full profile fields incl. membership_status dropdown
└─ Edge (on save): sync-member-profile — sync name to users table
```

- Updates `members.membership_status` → `"Member"`, `status` → `"active"`.
- Gated by `PermissionButton permission="member_management"`.

**List filter only:** `MemberFilters.tsx` includes “Pending Approval”; **`Members.tsx` has no bulk approve**.

**Registration source:** `member-register` edge function sets pending status; QR join flow documented in [`member-flows.md`](#member-flows).

---

### Staff / user management

**Route:** `/settings/users` — `Users.tsx`

```
Users.tsx  — AddUserModal.handleSubmit()
├─ Mode A — inviteByEmail (external email, no member pick):
│   ├─ Fields: inviteFirstName, inviteLastName, inviteEmail, role
│   └─ invoke send-invitation → InviteCallback creates staff thread later
├─ Mode B — pick existing member + sendInvite ON:
│   ├─ Check active same-role → block
│   ├─ inactive → invoke update-user-role (reactivate) — thread inline in edge fn
│   └─ else → invoke send-invitation
├─ Mode C — pick member + sendInvite OFF (direct insert):
│   ├─ INSERT users (new UUID if active user different role)
│   └─ invoke create-staff-thread (if role !== member)
└─ Staff limit: canAddStaff check (tenant_subscriptions) for non-member roles
```

#### Add user paths (`AddUserModal`)

| Path | `create-staff-thread`? |
|---|---|
| Invite by email (`inviteByEmail`) | No — relies on `InviteCallback` after accept |
| Send invite ON → email sent | No — `InviteCallback` |
| Send invite ON → already registered | `send-invitation` inline thread |
| Send invite ON → Path C (active user, new role row) | **Yes** — invoke |
| Send invite OFF → new user insert | **Yes** — invoke |
| Reactivate inactive | `update-user-role` inline thread |

**Edge functions:** `send-invitation`, `update-user-role`, `create-staff-thread`

---

### Finance module

Routes under `/give-online`, `/giving-records`, etc.  
Permission: `financial_records`

See [`payments.md`](#payments).

---

### Communications module

Routes: `/communications`, `/announcements`, `/member-messaging`, `/appointments`, `/testimonies`, `/surveys`  
Permission: `communication_tools`

See [`messaging.md`](#messaging).

---

### Background jobs (cron — no UI)

| Function | Source behavior |
|---|---|
| `check-pledge-overdue` | Daily — flags `pledges` overdue when campaign ended &gt;7 days ago |
| `check-attendance-risk` | Weekly — `notifications` for active **`users`** missing last 3 sessions per service type |
| `notify-task-deadlines` | `follow_up_tasks` due in 7d/1d |
| `notify-meeting-deadlines` | `board_meetings` 24h/1h reminders |
| `reset-email-quota` | Monthly email quota reset |
| `reset-monthly-credits` | Subscription credit reset |
| `process-email-automations` | Scheduled email automation runs |

See [`edge-functions-gap.md`](#edge-functions-gap) for full inventory.

---

### Platform super-admin (not in product doc)

| Route | Purpose |
|---|---|
| `/superadmin` | Platform dashboard |
| `/superadmin/churches` | All tenants |
| `/superadmin/storage-requests` | Approve storage upgrades |

---

### Children's ministry kiosk

`/childrens-ministry/kiosk` — authenticated, no admin sidebar; check-in kiosk mode.

---

### Permission gates on pages

Most write actions use:

```tsx
<PermissionButton permission="member_management" readOnly={readOnly} … />
```

`readOnly` from `usePermissions().isReadOnly(key)`.

**Not gated by:** `feature_permissions` (dead — see [`permissions.md`](#permissions)).

---

### Placeholder routes

`App.tsx` maps any `navigationGroups` path not in explicit route lists to **`PlaceholderPage`**.

**Notable mis-wire:** `/church-studio` → placeholder while `ChurchStudio.tsx` exists.

---

<a id="member-flows"></a>

## 9. Member Portal Flows

> Cross-ref: [`auth.md`](#auth), [`payments.md`](#payments), [`messaging.md`](#messaging), [`admin-flows.md`](#admin-flows)

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

### Entry & registration

| Route | File | Auth |
|---|---|---|
| `/member/login` | `MemberLogin.tsx` | Public |
| `/member/join` | `JoinChurch.tsx` | Public — QR/code registration |
| `/member-registration/:orgId` | `MemberRegistration.tsx` | Public |
| `/member/profile-setup` | `ProfileSetup.tsx` | Post-login |
| `/member/welcome` | `MemberWelcome.tsx` | Authed |

#### Page structure (scan trees)

##### `MemberLogin.tsx` — `/member/login`

```
MemberLogin.tsx
├─ Fields: email, churchCode (?code= auto-fill + tenant branding lookup)
├─ Edge: invoke member-login { email, churchCode }
├─ Errors: invalid_code | member_not_found | pending_approval (toast 6s)
├─ Success: localStorage.member_session → navigate /member
└─ See auth.md for server-side pending gate
```

##### `JoinChurch.tsx` — `/member/join`

```
JoinChurch.tsx
├─ URL: ?code=, ?type=member|visitor
├─ memberType picker → member | visitor form branches
├─ Edge: invoke member-register (registrationSource: qr_scan | form)
├─ Success screen: church name + code copy; member → pending approval copy
└─ Does not set member_session — must wait for admin approve + login
```

##### `MemberHome.tsx` — `/member`

```
MemberHome.tsx
├─ Context: useMemberPortal() — memberId, churchId, enabledModules, profileComplete
├─ Filter: ALL_MODULES.filter(m => enabledModules[m.key] !== false)
├─ Queries: latest sermon, volunteer roles
├─ UI: profile completion banner → /member/profile
└─ Grid: service tiles (give, events, messages, …) per enabled_modules.member_portal
```

##### `MemberGive.tsx` — `/member/give`

```
MemberGive.tsx
├─ Fields: amount, category (tithe/offering/…), phoneNumber (prefill from profile), dedication
├─ invoke process-stk-push { amount, phone, category, memberId, tenantId, … }
├─ STK modal: 90s countdown; terminal states cancelled | failed | expired
├─ Confirm: postgres_changes on giving_records.id + 2s polling fallback
└─ Success: receipt summary; optional jsPDF download client-side
```

##### `MemberMessages.tsx` — `/member/messages`

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

#### Registration → pending approval

1. **`member-register`** creates `members` with **`membership_status: "Pending Approval"`** (also used for QR join in `JoinChurch.tsx`).
2. Member sees success UI; **cannot log in yet**.

#### Login gate (verified in source)

**`member-login/index.ts` lines 54–58:**

```typescript
if (member.membership_status === "Pending Approval") {
  return new Response(JSON.stringify({ error: "pending_approval" }), { status: 403, ... });
}
```

**`MemberLogin.tsx`** shows a toast: *“Your membership is pending approval…”* when `error === "pending_approval"`.

#### Admin approval (required for portal access)

**File:** `src/pages/people/MemberProfile.tsx`

- Button **“✓ Approve Member”** when `membership_status === "Pending Approval"`.
- Updates `members.membership_status` → `"Member"`, `status` → `"active"`.
- Gated by `PermissionButton permission="member_management"`.

No bulk approve on `Members.tsx` — filter only via `MemberFilters.tsx`.

---

### Session details

- Token: UUID + timestamp string stored client-side.
- Server record: `member_sessions` (`member_id`, `tenant_id`, `session_token`, `expires_at`).
- Expiry: **30 days** from login.
- Church code lookup: `tenants.church_code` **or** `tenants.invite_code`.

---

### Authenticated routes

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

### Module visibility

**Read:** `tenants.enabled_modules.member_portal` via `MemberPortalContext.tsx`  
**Filter:** `MemberHome.tsx` service tiles  
**Write:** Settings → Member App (`MemberApp.tsx`, `MemberAppFeatures.tsx`)

⚠️ **GAP:** Multiple writers use different JSON shapes for `enabled_modules` — see [`settings.md`](#settings).

Admin sidebar is **not** filtered by these toggles.

---

### Messaging

**Route:** `/member/messages` — staff directory tiles + private DMs. See [`messaging.md`](#messaging).

Member client is **anon** Supabase — staff names denormalized on `conversations.name`.

---

### Giving

**Route:** `/member/give` — Daraja STK via `process-stk-push`; same realtime+polling confirmation as admin Give Online. See [`payments.md`](#payments).

Legacy Pesapal/IntaSend webhooks do **not** participate in member give UI.

---

### Public routes (no member session)

`/church/:slug`, `/survey/:surveyId`, `/book/:tenantId`, `/sermons/:tenantId`, `/store/:tenantId`, `/visitor-registration/:churchId`

---

### RLS

Member portal policies: `20260407091336_member_portal_rls_policies.sql`, `20260407091627_member_portal_open_read_policies.sql`, event/messaging migrations — see structural index.

---

### Product context gaps

- Member portal routes not listed in `00-product-context.md` §4.
- **Pending approval workflow** implemented in code; admin approval on `MemberProfile.tsx` only.

---

<a id="edge-functions-gap"></a>

## 10. Edge Functions Inventory

> **Verified:** 2026-06-15 after full download/commit of previously missing functions.

| | Count |
|---|---|
| Local function directories (`supabase/functions/*/index.ts`, excl. `_shared`) | **64** |
| Deployed on Supabase (`churchapp` / `crjdsxxkspvdwknrmijs`) | **65** |
| Missing from local repo | **0** (real functions) |
| Deploy-only artifact (not a repo folder) | **1** — `_shared-buildBrandedEmail` |

### Previously missing — now local (16 functions)

These were pulled down and are present under `supabase/functions/`:

| Function | Purpose (from source) |
|---|---|
| `generate-receipt` | Builds HTML receipt, uploads to `giving-receipts` bucket, sets `giving_records.receipt_url` |
| `on-signup` | Auth webhook handler: on `auth.users` INSERT, creates `tenants` + `users` (`super_admin`, `onboarding_completed: false`) |
| `pesapal-webhook` | Pesapal IPN → updates `giving_records` by `pesapal_transaction_id` |
| `intasend-webhook` | IntaSend webhook → same column, maps invoice state to `payment_status` |
| `check-pledge-overdue` | Daily cron: flags `pledges` as `overdue` when campaign past 7 days |
| `check-attendance-risk` | Weekly cron: inserts `notifications` for **`users`** (not `members`) absent 3 consecutive sessions per service type |
| `reset-email-quota` | Monthly cron: resets `email_quotas.monthly_sent` for non-free plans |
| `notify-task-deadlines` | Cron: `follow_up_tasks` due in 7d/1d → admin notifications |
| `notify-meeting-deadlines` | Cron: `board_meetings` 24h/1h reminders → admin notifications |
| `at-sms` | Tenant-scoped AT SMS (`tenants.at_username/at_api_key`); `check_balance` / `send_sms` actions |
| `website-consultation` | Inserts `website_consultation_requests`, emails platform admin via Resend |
| `invite-user` | Legacy staff invite: `createUser` + optional recovery email (not used by current UI) |
| `build-branded-email` | HTTP wrapper around shared branded email builder |
| `test-env` | Diagnostic |
| `test-resend` | Diagnostic |
| `check-auth-format` | Inspects `PAYHERO_BASIC_AUTH` secret format (diagnostic) |

### Shared modules (not deployable functions)

| Path | Used by |
|---|---|
| `supabase/functions/_shared/buildBrandedEmail.ts` | `invite-user`, `website-consultation`, `build-branded-email` |
| `supabase/functions/_shared/branded-email.ts` | `send-invitation`, `send-communication`, etc. |
| `supabase/functions/_shared/placeholder-replacer.ts` | Email templating |

### Deploy-only ghost function

Supabase still lists **`_shared-buildBrandedEmail`** as a deployed edge function (accidental deploy of shared code). It has **no** local `index.ts` folder and should not be redeployed from this repo. Safe to ignore or undeploy from dashboard.

### Full local inventory (64)

`africastalking-balance`, `africastalking-delivery-webhook`, `africastalking-sms`, `at-sms`, `build-branded-email`, `c2b-webhook`, `canva-callback`, `canva-oauth`, `canva-refresh-token`, `check-attendance-risk`, `check-auth-format`, `check-pledge-overdue`, `create-admin-broadcasts-table`, `create-staff-thread`, `data-download-request`, `fetch-og-metadata`, `fetch-sentry-issues`, `generate-ai-content`, `generate-ai-email`, `generate-child-qr-codes`, `generate-church-code`, `generate-quiz`, `generate-receipt`, `generate-sermon`, `get-active-sessions`, `get-payhero-banks`, `get-supported-banks`, `initiate-payment`, `intasend-webhook`, `invite-user`, `legal-signature-notify`, `member-login`, `member-register`, `notify-meeting-deadlines`, `notify-task-deadlines`, `on-signup`, `payment-webhook`, `pesapal-webhook`, `process-email-automations`, `process-sermon-archive`, `process-stk-push`, `receive-booking-response`, `register-c2b-urls`, `register-credentials`, `register-payment-channel`, `reset-email-quota`, `reset-monthly-credits`, `run-payroll`, `send-bible-reminder`, `send-booking-confirmation`, `send-communication`, `send-invitation`, `send-member-welcome`, `send-push-notification`, `send-whatsapp-message`, `sync-member-profile`, `test-env`, `test-payhero-api`, `test-payhero-stk`, `test-resend`, `transcribe-audio`, `update-user-role`, `website-consultation`, `whatsapp-webhook`

### Frontend invoke vs cron/webhook-only

| Invoked from `src/` | Cron / webhook / unused |
|---|---|
| See each area doc | `on-signup`, `payment-webhook`, `c2b-webhook`, `pesapal-webhook`, `intasend-webhook`, `africastalking-delivery-webhook`, `whatsapp-webhook`, `receive-booking-response`, cron jobs above, `generate-receipt`, `invite-user`, `initiate-payment`, diagnostics |

---
