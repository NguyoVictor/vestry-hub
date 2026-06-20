# Settings

> Cross-ref: [`00-product-context.md`](./00-product-context.md) §4 Admin, [`permissions.md`](./permissions.md), [`auth.md`](./auth.md)

Settings live under **`/settings/*`** inside `SettingsLayout` (`src/components/settings/SettingsLayout.tsx`).

Index redirect: `/settings` → `/settings/general`

---

## Settings routes (implemented)

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
| `/settings/notifications` | `NotificationsSettings.tsx` | Invokes **`at-sms`** (deployed only) |
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

### Placeholder settings (coming soon)

`/settings/branding`, `/settings/whatsapp`, `/settings/verification` — empty state in `App.tsx`.

---

## Module & feature toggles

### `tenants.enabled_modules`

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

### Onboarding priority needs

**Stored in:** `tenants.tenant_metadata.priority_needs` (array of string IDs from `Onboarding.tsx`)  
**Not wired** to `enabled_modules` or navigation.

---

## Roles & permissions settings

**File:** `src/pages/settings/RolesPermissions.tsx`

Tabs include:

1. **Feature Permissions** → `FeaturePermissions.tsx` → writes **`feature_permissions`**
2. **User Overrides** → `UserOverrides.tsx` → `user_role_overrides`, `member_permission_overrides`

🚧 **See [`permissions.md`](./permissions.md):** `feature_permissions` is **saved but not enforced at runtime** — dead feature in UI.

**Staff fine permissions:** Managed per-user in `Users.tsx` → **`user_fine_permissions`** (enforced via `usePermissions()`).

---

## Church code generation

**Edge function:** `generate-church-code`  
**Invoked from:** `RolesPermissions.tsx`  
**Stored in:** `tenants.church_code`

---

## Key settings-related tables

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

## Admin shell (cross-settings UI)

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
