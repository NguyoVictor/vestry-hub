# Permissions & Access Control

> Cross-ref: [`00-product-context.md`](./00-product-context.md), [`auth.md`](./auth.md), [`settings.md`](./settings.md)

VestryHub has **multiple permission mechanisms** that are **not unified**. Only one is enforced on admin page actions today.

---

## Runtime enforcement: `usePermissions()`

**File:** `src/hooks/usePermissions.ts`  
**Consumers:** `PermissionButton`, `ReadOnlyBanner`, ~90 admin pages

### Data source

```typescript
supabase.from('user_fine_permissions')
  .select('permission_key, level')
  .eq('user_id', userId)
  .eq('tenant_id', tenantId)
```

**Table:** `user_fine_permissions`  
**Migration:** `supabase/migrations/20260419115950_create_user_fine_permissions_table.sql`  
**RLS policy:** `ufp_tenant`

### Levels

| Level | Behavior |
|---|---|
| `default` | Treated as **full access** (same as explicit full) |
| `read_only` | `isReadOnly()` true — write actions hidden/disabled |
| `full_access` | Full write access |

### Admin bypass

```typescript
const isAdmin = userRole === 'super_admin' || userRole === 'church_admin';
// Admins skip DB read; always full_access
```

⚠️ **DISCREPANCY:** Product doc refers to founding role as `church_admin`; founding users are often `super_admin` in DB — both bypass fine permissions.

### Permission keys → routes

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

## 🚧 DEAD FEATURE: `feature_permissions`

> **This must not be documented as working access control.**

### What exists

| Item | Location |
|---|---|
| Table | `feature_permissions` (`tenant_id`, `feature`, `role`, `access_level`) |
| Migration | `supabase/migrations/20260418052843_create_feature_permissions_table.sql` |
| RLS | `fp_tenant` |
| Admin UI | `src/pages/settings/FeaturePermissions.tsx` — tab inside `RolesPermissions.tsx` |
| Save path | Upserts rows to `feature_permissions` on Save |

### What does NOT exist

- **No reads** of `feature_permissions` anywhere in `src/` except `FeaturePermissions.tsx` itself.
- **`usePermissions()` does not consult this table.**
- **Admin navigation** (`src/components/layout/AppLayout.tsx`) does not filter by `feature_permissions`.
- **No route guard** checks `feature_permissions`.

### User-visible illusion

Church admins can configure a role × feature matrix (full / read / none) in **Settings → Roles & Permissions → Feature Permissions**. Changes **persist to the database** but **have zero effect** on who can access or edit pages.

### Intended vs actual

| System | Stored in | Enforced |
|---|---|---|
| Fine-grained staff gates | `user_fine_permissions` | **Yes** (`usePermissions`) |
| Role × feature matrix | `feature_permissions` | **No — dead feature** |
| Module toggles | `tenants.enabled_modules` | **Member portal only** |
| Onboarding picks | `tenants.tenant_metadata.priority_needs` | **No** |

**Remediation options (future):** Wire `feature_permissions` into `usePermissions` or nav; or remove/hide the UI to avoid false confidence.

---

## Other override tables

### `user_role_overrides`

**Migration:** `20260418054231_create_user_role_overrides_table.sql`  
**UI:** `src/pages/settings/UserOverrides.tsx` (Roles & Permissions tab)  
**RLS:** `uro_tenant`  
**Purpose:** Assign alternate roles to members for permission inheritance UI — **not** the same as `user_fine_permissions` runtime gates.

### `member_permission_overrides`

**Migration:** `20260418055451_create_member_permission_overrides_table.sql`  
**UI:** `UserOverrides.tsx`, `ManagePermissionsModal.tsx`  
**RLS:** `mpo_tenant`  
**Purpose:** Per-member portal feature overrides — separate from admin `usePermissions`.

---

## Member portal module gates

**Source:** `tenants.enabled_modules.member_portal` (JSON)  
**Read in:** `src/contexts/MemberPortalContext.tsx`, `src/pages/member/MemberHome.tsx`  
**Written from:** `src/pages/settings/MemberApp.tsx`, `MemberAppFeatures.tsx`

Member home tiles filter on enabled modules. **Admin sidebar does not use this.**

---

## Subscription / staff limits

**Table:** `tenant_subscriptions` (`staff_limit`, credits)  
**Enforced in:** `send-invitation` edge function, `Users.tsx` client checks (`canAddStaff`)

Separate from permission keys above.

---

## Summary checklist for developers

- [ ] Use `usePermissions()` + `PermissionButton` for admin write gates
- [ ] Do **not** assume `feature_permissions` does anything at runtime
- [ ] Do **not** assume onboarding or `ServicesModules` hides admin nav
- [ ] Member portal: check `enabled_modules.member_portal`
- [ ] Pending members: `membership_status`, not `users.role`
