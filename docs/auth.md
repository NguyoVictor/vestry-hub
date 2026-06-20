# Authentication & Identity

> Cross-ref: [`00-product-context.md`](./00-product-context.md) §2–3, [`permissions.md`](./permissions.md), [`admin-flows.md`](./admin-flows.md), [`member-flows.md`](./member-flows.md), [`edge-functions-gap.md`](./edge-functions-gap.md)

VestryHub has **two separate auth systems**: Supabase Auth for the **admin portal**, and a custom **member session** (`localStorage` + `member_sessions` table) for the **member portal**.

---

## Admin portal auth

### Entry routes

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

### Page structure (scan trees)

Use these trees for at-a-glance structure; prose sections below explain *why* each step exists.

#### `SignUp.tsx` — `/auth/signup`

```
SignUp.tsx
├─ Fields: fullName, email, password, agreed (terms checkbox)
├─ Validation: isPasswordStrong() — ≥8 chars, upper, lower, digit, special (!@#$%^&*)
├─ Supabase Auth: supabase.auth.signUp({ email, password, options: { data: { full_name }, emailRedirectTo: /auth/callback } })
├─ Alt path: handleGoogleSignUp() → signInWithOAuth('google') → redirect /auth/callback
└─ Redirect: toast success → /auth/signin (email verification flow; does not auto-login)
```

New auth users may also trigger **`handle_new_user`** (DB) and/or **`on-signup`** (Auth webhook) before the user reaches onboarding.

#### `SignIn.tsx` — `/auth/signin`

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

#### `AuthCallback.tsx` — `/auth/callback`

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

#### `InviteCallback.tsx` — `/auth/invite`

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

#### `Onboarding.tsx` — `/onboarding`

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

#### `ForgotPassword.tsx` — `/auth/forgot-password`

```
ForgotPassword.tsx
├─ Fields: email
├─ Supabase Auth: resetPasswordForEmail(email, { redirectTo: /auth/reset-password })
└─ UI: success state (check inbox) — no auto-redirect
```

#### `ResetPassword.tsx` — `/auth/reset-password`

```
ResetPassword.tsx
├─ Guard: getSession() — no session → toast + /auth/forgot-password
├─ Fields: password, confirmPassword
├─ Validation: isPasswordStrong(); password === confirmPassword
├─ Supabase Auth: supabase.auth.updateUser({ password })
└─ UI: resetComplete success screen → link /auth/signin
```

Also reached from **`InviteCallback`** after staff invite accept.

#### `AuthGuard.tsx` — wraps all admin routes

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

### Guard: `AuthGuard` (prose)

**File:** `src/components/layout/AuthGuard.tsx`

1. Requires Supabase session.
2. Loads `users` → `tenant_id`, `role`, name.
3. No `tenant_id` → `/onboarding`.
4. `tenants.onboarding_completed === false` → `/onboarding`.
5. Wraps `ChurchProvider`.
6. **30-minute inactivity logout** (warning at 28 min).
7. Realtime `users` UPDATE subscription for sidebar name sync.

---

## First user / tenant creation (two paths)

⚠️ **Both exist in production** — understand which runs for a given signup (trees in Path A/B below).

### Path A — DB trigger `handle_new_user()`

**Migrations:** `20260318150856_on_auth_user_created_trigger.sql`, `20260521094558_ensure_handle_new_user_security_definer.sql`

```
handle_new_user()  [on auth.users INSERT]
├─ INSERT tenants (name/church_code from user metadata)
├─ INSERT users (role: super_admin, status: active)
└─ Trigger: create_member_for_user → linked members row
```

Also triggers `create_member_for_user` for linked `members` row.

### Path B — Edge function `on-signup`

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

### Onboarding form

**File:** `src/pages/Onboarding.tsx`

- Updates existing tenant OR creates tenant+user if missing.
- Saves **`tenants.tenant_metadata.priority_needs`** — not `enabled_modules`.
- Sets `onboarding_completed: true`.

(See tree under [Page structure](#page-structure-scan-trees) above.)

---

## Staff invitation (current UI path)

**Edge function:** `supabase/functions/send-invitation/index.ts`  
**Invoked from:** `src/pages/settings/Users.tsx` only (not `invite-user`)

1. `inviteUserByEmail` → redirect `/auth/invite`.
2. Already registered (422) → direct `users` upsert + optional staff thread when `alreadyRegistered`.
3. Uses `_shared/branded-email.ts` for Resend (when configured).

**Invite callback:** `src/pages/auth/InviteCallback.tsx`

- Upserts `users` + `members`.
- `create-staff-thread` **only if** `invitedRole !== 'member'`.

### Legacy: `invite-user`

**File:** `supabase/functions/invite-user/index.ts`

- Creates auth user with temp password OR finds existing; upserts `users`.
- Maps church roles → `staff_leader` / `member` (different enum set than `send-invitation`).
- Optional Resend email via recovery link (`/auth/callback`), not `/auth/invite`.
- Uses `_shared/buildBrandedEmail.ts`.

**Status:** **Not invoked from any file under `src/`**. Superseded by `send-invitation` + `InviteCallback`. Kept deployed for backward compatibility.

---

## Role changes / deactivation

**Edge function:** `update-user-role/index.ts`  
**Invoked from:** `Users.tsx` — deactivate, reactivate, role change.

Reactivate path creates staff directory thread inline (duplicates `create-staff-thread` logic).

---

## Member portal auth

### Guard: `MemberAuthGuard`

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

### Member login

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

### Member registration

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
- Login blocked until admin approves (see [`member-flows.md`](./member-flows.md)).

---

## Platform super-admin

| Route | Guard |
|---|---|
| `/superadmin`, `/superadmin/churches`, `/superadmin/storage-requests` | `SuperAdminGuard` |

Not in product context doc.

---

## Key tables

| Table | Role |
|---|---|
| `auth.users` | Admin Supabase Auth |
| `users` | Admin/staff profile; `tenant_id`, `role`, `status` |
| `tenants` | `church_code`, `onboarding_completed`, `enabled_modules` |
| `members` | Congregation; `membership_status`, `user_id` link |
| `member_sessions` | Server-side member portal sessions |

---

## Edge function reference (auth-related)

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
