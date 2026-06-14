# Settings Files - Church Settings Permission Audit

## Files Completed ✅ (8 files)
1. ✅ MemberApp.tsx - All toggles disabled
2. ✅ Users.tsx - Add User button gated
3. ✅ Registration.tsx - Toggle disabled
4. ✅ PaymentsPage.tsx - Buttons gated
5. ✅ GivingSettings.tsx - Add Category gated
6. ✅ TaxSettings.tsx - Save + toggles gated
7. ✅ VisionMission.tsx - Save Changes gated
8. ✅ ContactSocial.tsx - Save Changes gated

## Previously Completed ✅ (5 files)
9. ✅ GeneralSettings.tsx
10. ✅ Branches.tsx (analytics folder)
11. ✅ RolesPermissions.tsx
12. ✅ Staff.tsx
13. ✅ Modules.tsx

## Files That Need Review (Based on Grep Results):

### High Priority - Has Switch or Save Buttons:

1. **ChurchProfile.tsx** - Has "Save Changes" button
2. **NotificationsSettings.tsx** - Has Switch toggles + "Save Settings" button
3. **LivestreamingSettings.tsx** - May have save buttons
4. **MediaCategories.tsx** - Has Switch toggles for status
5. **MemberAppFeatures.tsx** - Has Switch toggles for features
6. **PositionsTab.tsx** - Has Switch toggle for active status
7. **ServicesModules.tsx** - Has Switch toggles
8. **ServiceRequestTypes.tsx** - Has Switch toggles
9. **SeoPublicPage.tsx** - Has Switch toggle + likely save button
10. **TestimonyCategories.tsx** - Has Switch toggles
11. **CommunicationsSettings.tsx** - Likely has settings to save
12. **Integrations.tsx** - Likely has settings to save
13. **Privacy.tsx** - Likely has settings to save
14. **Security.tsx** - Likely has settings to save
15. **Preferences.tsx** - Likely has settings to save
16. **SmsSettings.tsx** - Likely has settings to save
17. **AnnouncementTypes.tsx** - Likely has type management
18. **AppointmentTypes.tsx** - Likely has type management
19. **GroupTypes.tsx** - Likely has type management
20. **FacilityTypesPage.tsx** - Likely has type management

### Medium Priority - May Not Need Gates:
- Backup.tsx - Export/backup functionality (may be read-only operation)
- Billing.tsx - Subscription management (different permission?)
- QRCodes.tsx - QR generation (may be read-only operation)
- WebsitePromo.tsx - Display page
- Legal.tsx - Display page
- Notifications.tsx - May be duplicate of NotificationsSettings

### Low Priority - Likely Doesn't Need Gates:
- AttendanceSettings.tsx - Has its own `attendance` permission
- FeaturePermissions.tsx - This IS the permissions page
- ManagePermissionsModal.tsx - Component, not page
- UserOverrides.tsx - May be admin-only
- LeaveTab.tsx - Staff leave (may be HR permission)
- TasksTab.tsx - Unknown scope
- BranchCredentials.tsx - May be branch-specific

## User's Original Request Context:

The user said: "In general if you see toggle buttons and Save Changes buttons on every page on the settings Page, they should be restricted"

This suggests I should check ALL settings pages for:
1. Switch toggle buttons
2. Save/Save Changes buttons
3. Action buttons (Add, Create, Update, Delete)

## Recommendation:

I need to systematically go through at minimum the **High Priority** list and add:
1. ReadOnlyBanner
2. PermissionButton for all Save buttons
3. disabled={readOnly} for all Switch toggles
4. if (readOnly) return; in all mutations
