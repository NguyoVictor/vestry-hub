# Authentication & Identity

> Cross-ref: [`00-product-context.md`](./00-product-context.md) §2–3, [`permissions.md`](./permissions.md), [`admin-flows.md`](./admin-flows.md), [`member-flows.md`](./member-flows.md)

VestryHub has **two separate auth systems**: Supabase Auth for the **admin portal**, and a custom **member session** (localStorage) for the **member portal**.

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

### Guard: `AuthGuard`

**File:** `src/components/layout/AuthGuard.tsx`

Flow:

1. Requires Supabase session (`supabase.auth.getSession()`).
2. Loads `users` row → `tenant_id`, `role`, name.
3. If no `tenant_id` → redirect `/onboarding`.
4. Loads `tenants` → if `onboarding_completed` is false → redirect `/onboarding`.
5. Wraps app in `ChurchProvider` with tenant + user context.
6. **30-minute inactivity logout** (warning at 28 min).

### First user / church creation

**DB trigger:** `handle_new_user()` (migrations under `supabase/migrations/20260318150856_*`, `20260521094558_*`)

On `auth.users` insert:

- Creates `tenants` row (church name from metadata, `church_code`, etc.)
- Creates `users` row with role **`super_admin`**

⚠️ **DISCREPANCY:** Product context (§2) states the first creator gets role **`church_admin`**. Code and onboarding fallback both use **`super_admin`**.

**Onboarding form** (`src/pages/Onboarding.tsx`):

- Collects church name, city, country, phone, **priority needs** (multi-select).
- Saves to `tenants.tenant_metadata.priority_needs` — **not** `enabled_modules`.
- Sets `onboarding_completed: true`, generates `church_code` if creating tenant manually.

⚠️ **DISCREPANCY:** Product context (§3) describes onboarding service selection as non-binding for admin access. Confirmed: no nav filtering on these answers (see [`settings.md`](./settings.md)).

### Staff invitation flow

**Edge function:** `supabase/functions/send-invitation/index.ts`  
**Invoked from:** `src/pages/settings/Users.tsx` (`AddUserModal`, resend invite)

1. `supabase.auth.admin.inviteUserByEmail` with `redirectTo: …/auth/invite`.
2. On success → user receives email, lands on `/auth/invite`.
3. On **already registered** (422) → upserts `users` directly; may create staff directory thread inline when `alreadyRegistered`.

**Invite callback:** `src/pages/auth/InviteCallback.tsx`

- Upserts `users` + `members` from invite metadata.
- Calls `create-staff-thread` **only if** `invitedRole !== 'member'`.

**Also deployed (not in local repo):** `invite-user`, `on-signup` — see [`edge-functions-gap.md`](./edge-functions-gap.md).

### Role changes / deactivation

**Edge function:** `supabase/functions/update-user-role/index.ts`  
**Invoked from:** `src/pages/settings/Users.tsx`

Actions: `deactivate`, `reactivate`, role update. Reactivate path can create staff directory thread inline.

---

## Member portal auth

### Entry routes

| Route | File |
|---|---|
| `/member/login` | `src/pages/member/MemberLogin.tsx` |
| `/member/join` | `src/pages/member/JoinChurch.tsx` |
| `/member-registration/:orgId` | `src/pages/MemberRegistration.tsx` |
| `/visitor-registration/:churchId` | `src/pages/VisitorRegistration.tsx` |

### Guard: `MemberAuthGuard`

**File:** `src/components/layout/MemberAuthGuard.tsx`

- Reads **`localStorage.member_session`** (not Supabase Auth).
- Validates `expiresAt`; redirects to `/member/login` if missing/expired.
- Wraps in `MemberPortalProvider`.

### Member login

**Edge function:** `supabase/functions/member-login/index.ts`  
**Invoked from:** `src/pages/member/MemberLogin.tsx`

- Authenticates with **email + church code**.
- Returns session payload stored in `localStorage`.

### Member registration

**Edge function:** `supabase/functions/member-register/index.ts`  
**Invoked from:** `src/pages/member/JoinChurch.tsx`, `MemberRegistration.tsx`

- Creates `members` row with **`membership_status: "Pending Approval"`**.
- Does **not** grant portal access until admin approves (see [`member-flows.md`](./member-flows.md)).

---

## Platform super-admin

Separate from church admin auth:

| Route | Guard |
|---|---|
| `/superadmin` | `SuperAdminGuard` |
| `/superadmin/churches` | |
| `/superadmin/storage-requests` | |

Not described in product context — code extension for platform operator.

---

## Key tables

| Table | Role in auth |
|---|---|
| `auth.users` | Supabase Auth identities (admin side) |
| `users` | Admin/staff profiles; `tenant_id`, `role`, `status` |
| `tenants` | Church instance; `church_code`, `onboarding_completed`, `enabled_modules` |
| `members` | Congregation records; linked via `user_id` when applicable |

---

## Related edge functions (local)

| Function | Auth use |
|---|---|
| `send-invitation` | Staff email invites |
| `update-user-role` | Role/status changes |
| `member-login` | Member portal login |
| `member-register` | Self-registration |
| `create-staff-thread` | Post-invite staff directory tile |
| `get-active-sessions` | `src/pages/security/SecurityCentre.tsx` |
| `sync-member-profile` | Name sync admin ↔ users |

**Missing locally:** `on-signup`, `invite-user`, `check-auth-format` — [`edge-functions-gap.md`](./edge-functions-gap.md)
