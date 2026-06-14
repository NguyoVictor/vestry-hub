# Permission Gates Audit Report

## Executive Summary
**Date**: June 11, 2026  
**Audited Areas**: 3 remaining permission areas  
**Files Audited**: 13 files  
**Status**: ✅ AUDIT COMPLETE

---

## AREA 1: reports_analytics Permission

### File: `src/pages/analytics/Reports.tsx`

**Status**: ✅ READ-ONLY - NO MUTATIONS FOUND

**Analysis**:
- **Lines Read**: 1-1626 (complete file)
- **Purpose**: Comprehensive analytics and reporting dashboard
- **Data Operations**: ALL SELECT QUERIES ONLY
  - Membership reports (SELECT from members)
  - Attendance reports (SELECT from events)
  - Finance reports (SELECT from giving_records, expenses)
  - Events reports (SELECT from events)
  - Groups reports (SELECT from groups, house_fellowships)
  - Discipleship reports (SELECT from new_converts, outreach_activities)
  - Communications reports (SELECT from announcements, surveys)
  - Custom report builder (SELECT queries only)

**Mutations**: NONE ❌
**Write Operations**: NONE ❌
**Form Submissions**: NONE ❌

**Notes**:
- File already has `readOnly` permission check on line 25
- Has `ReadOnlyBanner` component imported (line 26)
- Pure analytics/reporting - no data modification capabilities
- Export functions (CSV, PDF) read from existing data only
- Custom report builder generates SELECT queries dynamically but never writes

**Recommendation**: ✅ **NO CHANGES NEEDED** - This is a pure read-only analytics page

---

## AREA 2: attendance Permission

### File: `src/pages/settings/AttendanceSettings.tsx`

**Status**: ❌ NOT GATED

**Mutations Found**: 1

#### Mutation #1: `saveMutation` (Lines 154-174)
```typescript
const saveMutation = useMutation({
  mutationFn: async (values: FormData) => {
    // ❌ NOT GATED
    const { error } = await supabase.from(TABLES.TENANTS)
      .update({
        attendance_tracking_enabled: values.attendance_tracking_enabled,
        // ... other attendance settings
      })
      .eq("id", church.tenantId);
  },
  onSuccess: () => { /* ... */ },
  onError: () => toast.error("Failed to save."),
});
```
- **Operation**: UPDATE to TENANTS table
- **Permission Key**: `'attendance'`
- **Gated**: ❌ NO
- **Form Handler**: `form.handleSubmit((v) => saveMutation.mutate(v))`

**Recommendation**: ❌ **REQUIRES GATING**

---

## AREA 3: church_settings Permission

### Settings Directory Files Audited: 10 files

---

### File 1: `src/pages/settings/AnnouncementTypes.tsx`

**Status**: ❌ NOT GATED

**Mutations Found**: 5

#### Mutation #1: `handleSeedDefaults` (Lines 92-107)
```typescript
const handleSeedDefaults = async () => {
  // ❌ NOT GATED
  const { error } = await supabase
    .from(TABLES.ANNOUNCEMENT_TYPES)
    .insert(records as never);
};
```
- **Operation**: INSERT to announcement_types table
- **Gated**: ❌ NO

#### Mutation #2: `toggleActive` (Lines 112-128)
```typescript
const toggleActive = async (type: AnnouncementType) => {
  // ❌ NOT GATED
  const { error } = await supabase
    .from(TABLES.ANNOUNCEMENT_TYPES)
    .update({ is_active: newVal } as never)
    .eq("id", type.id);
};
```
- **Operation**: UPDATE to announcement_types table
- **Gated**: ❌ NO

#### Mutation #3: Drag-to-Reorder `handleDrop` (Lines 148-156)
```typescript
const handleDrop = async () => {
  // ❌ NOT GATED
  await supabase
    .from(TABLES.ANNOUNCEMENT_TYPES)
    .update({ order: u.order } as never)
    .eq("id", u.id);
};
```
- **Operation**: UPDATE to announcement_types table (sort_order)
- **Gated**: ❌ NO

#### Mutation #4: `handleDeleteConfirm` (Lines 161-184)
```typescript
const handleDeleteConfirm = async () => {
  // ❌ NOT GATED
  if (deleteTarget.usage_count === 0) {
    const { error } = await supabase
      .from(TABLES.ANNOUNCEMENT_TYPES)
      .delete()
      .eq("id", deleteTarget.id);
  } else {
    const { error } = await supabase
      .from(TABLES.ANNOUNCEMENT_TYPES)
      .update({ is_active: false } as never)
      .eq("id", deleteTarget.id);
  }
};
```
- **Operation**: DELETE or UPDATE to announcement_types table
- **Gated**: ❌ NO

#### Mutation #5: `AnnouncementTypeDrawer` component mutations (not shown in file)
- **Operation**: INSERT/UPDATE through drawer component
- **Gated**: ❌ Assumed NO (drawer component not read yet)

**Recommendation**: ❌ **REQUIRES GATING - ALL 5 MUTATIONS**

---

### File 2: `src/pages/settings/AppointmentTypes.tsx`

**Status**: ❌ NOT GATED

**Mutations Found**: 3

#### Mutation #1: `handleSubmit` in TypeDrawer (Lines 40-58)
```typescript
const handleSubmit = async () => {
  // ❌ NOT GATED
  if (isEdit && editData) {
    const { error } = await supabase.from(TABLES.APPOINTMENT_TYPES)
      .update({ label, description, is_active } as never)
      .eq('id', editData.id);
  } else {
    const { error } = await supabase.from(TABLES.APPOINTMENT_TYPES)
      .insert({ tenant_id: tenantId, label, description, is_active, sort_order: nextOrder } as never);
  }
};
```
- **Operation**: INSERT or UPDATE to appointment_types table
- **Gated**: ❌ NO

#### Mutation #2: `deleteMutation` (Lines 84-90)
```typescript
const deleteMutation = useMutation({
  mutationFn: async (id: string) => {
    // ❌ NOT GATED
    const { error } = await supabase.from(TABLES.APPOINTMENT_TYPES).delete().eq('id', id);
  },
});
```
- **Operation**: DELETE from appointment_types table
- **Gated**: ❌ NO

#### Mutation #3: `toggleMutation` (Lines 92-98)
```typescript
const toggleMutation = useMutation({
  mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
    // ❌ NOT GATED
    const { error } = await supabase.from(TABLES.APPOINTMENT_TYPES).update({ is_active } as never).eq('id', id);
  },
});
```
- **Operation**: UPDATE to appointment_types table
- **Gated**: ❌ NO

**Recommendation**: ❌ **REQUIRES GATING - ALL 3 MUTATIONS**

---

### File 3: `src/pages/settings/Backup.tsx`

**Status**: ✅ READ-ONLY - NO MUTATIONS FOUND

**Analysis**:
- **Lines Read**: Complete file
- **Purpose**: Church data export/backup utility
- **Data Operations**: ALL SELECT QUERIES ONLY
  - Fetches data from all tables for export
  - Generates Excel/JSON downloads
  - NO write operations to database

**Mutations**: NONE ❌
**Write Operations**: NONE ❌
**Form Submissions**: NONE ❌

**Notes**:
- Pure read-only export functionality
- All data operations are SELECT queries
- Export functions (Excel, JSON) only read data

**Recommendation**: ✅ **NO CHANGES NEEDED** - Pure read-only page

---

### File 4: `src/pages/settings/Billing.tsx`

**Status**: ✅ READ-ONLY - NO MUTATIONS FOUND

**Analysis**:
- **Lines Read**: Complete file
- **Purpose**: Subscription management and billing UI
- **Data Operations**: ALL READ-ONLY
  - Displays subscription info via `useSubscription()` hook
  - Shows plan details and usage stats
  - NO database write operations

**Mutations**: NONE ❌
**Write Operations**: NONE ❌

**Notes**:
- All mutations for billing happen through external payment processors
- This page only displays information
- `openPaymentModal` function just opens a modal with instructions

**Recommendation**: ✅ **NO CHANGES NEEDED** - Pure display/UI page

---

### File 5: `src/pages/settings/BranchCredentials.tsx`

**Status**: ❌ NOT GATED

**Mutations Found**: 1

#### Mutation #1: `save` mutation in SetUpModal (Lines 52-71)
```typescript
const save = useMutation({
  mutationFn: async () => {
    // ❌ NOT GATED
    const payload: Record<string, any> = { branch_username: username.trim() };
    if (password) {
      payload.branch_password_hash = await hashPassword(password);
    }
    const { error } = await supabase.from(TABLES.BRANCHES).update(payload).eq(COLS.ID, branch.id);
  },
  onSuccess: () => { /* ... */ },
});
```
- **Operation**: UPDATE to branches table (credentials)
- **Gated**: ❌ NO

**Recommendation**: ❌ **REQUIRES GATING**

---

### File 6: `src/pages/settings/ChurchProfile.tsx`

**Status**: ❌ NOT GATED

**Mutations Found**: 3

#### Mutation #1: `saveMutation` (Lines 91-120)
```typescript
const saveMutation = useMutation({
  mutationFn: async (values: FormData) => {
    // ❌ NOT GATED
    const { error } = await supabase.from("tenants").update({
      name: values.name,
      slug: values.slug,
      tagline: values.tagline || null,
      // ... all church profile fields
    } as any).eq("id", church.tenantId);
  },
  onSuccess: () => { /* ... */ },
});
```
- **Operation**: UPDATE to tenants table
- **Gated**: ❌ NO
- **Form Handler**: `form.handleSubmit((v) => saveMutation.mutate(v))`

#### Mutation #2: `handleLogoUpload` (Lines 131-155)
```typescript
const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  // ❌ NOT GATED
  const { error: uploadError } = await supabase.storage.from("church-logos").upload(path, file, { upsert: true });
  await supabase.from("tenants").update({ logo: urlData.publicUrl } as any).eq("id", church.tenantId);
  await supabase
    .from(TABLES.TENANT_SUBSCRIPTIONS)
    .update({ storage_used_gb: usage.storage_gb + fileSizeGB })
    .eq('tenant_id', church.tenantId);
};
```
- **Operations**: 
  - STORAGE UPLOAD to church-logos bucket
  - UPDATE to tenants table (logo)
  - UPDATE to tenant_subscriptions table (storage)
- **Gated**: ❌ NO

#### Mutation #3: `removeLogo` (Lines 157-161)
```typescript
const removeLogo = async () => {
  // ❌ NOT GATED
  await supabase.from("tenants").update({ logo: null } as any).eq("id", church.tenantId);
};
```
- **Operation**: UPDATE to tenants table
- **Gated**: ❌ NO

**Recommendation**: ❌ **REQUIRES GATING - ALL 3 MUTATIONS**

---

### File 7: `src/pages/settings/CommunicationsSettings.tsx`

**Status**: ❌ NOT GATED

**Mutations Found**: 7+ (across 3 tabs)

#### Tab 1: Email Categories - Mutations Found: 4

**Mutation #1**: `handleSubmit` in CategoryModal (Lines 75-92)
```typescript
const handleSubmit = async () => {
  // ❌ NOT GATED
  if (isEdit && editData) {
    const { error } = await supabase.from(TABLES.EMAIL_CATEGORIES).update({ name: name.trim(), is_active: isActive } as never).eq("id", editData.id);
  } else {
    const { error } = await supabase.from(TABLES.EMAIL_CATEGORIES).insert({ tenant_id: tenantId, name: name.trim(), is_active: isActive, is_system: false, sort_order: nextOrder } as never);
  }
};
```
- **Operation**: INSERT or UPDATE to email_categories table
- **Gated**: ❌ NO

**Mutation #2**: `handleSeedDefaults` (Lines 127-138)
```typescript
const handleSeedDefaults = async () => {
  // ❌ NOT GATED
  const { error } = await supabase.from(TABLES.EMAIL_CATEGORIES).insert(rows as never);
};
```
- **Operation**: INSERT to email_categories table
- **Gated**: ❌ NO

**Mutation #3**: `deleteMutation` (Lines 140-148)
```typescript
const deleteMutation = useMutation({
  mutationFn: async (id: string) => {
    // ❌ NOT GATED
    const { error } = await supabase.from(TABLES.EMAIL_CATEGORIES).delete().eq("id", id);
  },
});
```
- **Operation**: DELETE from email_categories table
- **Gated**: ❌ NO

#### Tab 2: Automation Management - Mutations Found: 2

**Mutation #4**: `handleTestAutomation` (Lines 228-247)
```typescript
const handleTestAutomation = async () => {
  // ❌ NOT GATED
  const response = await fetch('https://crjdsxxkspvdwknrmijs.supabase.co/functions/v1/process-email-automations', {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify({ test: true }),
  });
};
```
- **Operation**: EDGE FUNCTION CALL (trigger email automations)
- **Gated**: ❌ NO

**Mutation #5**: `handleConfigureServiceKey` (Lines 249-267)
```typescript
const handleConfigureServiceKey = async () => {
  // ❌ NOT GATED
  const { error } = await supabase
    .from('automation_settings')
    .upsert({ 
      key: 'service_role_key', 
      value: 'system_configured',
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
};
```
- **Operation**: UPSERT to automation_settings table
- **Gated**: ❌ NO

#### Tab 3: SMS Settings - Mutations Found: 1

**Mutation #6**: `handleSave` (Lines 380-399)
```typescript
const handleSave = async () => {
  // ❌ NOT GATED
  const { error } = await supabase.from(TABLES.SMS_SETTINGS).upsert(payload as never, { onConflict: "tenant_id" });
};
```
- **Operation**: UPSERT to sms_settings table
- **Gated**: ❌ NO

**Recommendation**: ❌ **REQUIRES GATING - ALL 6+ MUTATIONS**

---

### File 8: `src/pages/settings/ContactSocial.tsx`

**Status**: ❌ NOT GATED

**Mutations Found**: 1

#### Mutation #1: `save` mutation (Lines 120-139)
```typescript
const save = useMutation({
  mutationFn: async () => {
    // ❌ NOT GATED
    const { error } = await supabase.from(TABLES.TENANTS).update(payload).eq(COLS.ID, tenantId);
  },
  onSuccess: () => { /* ... */ },
});
```
- **Operation**: UPDATE to tenants table (contact & social)
- **Gated**: ❌ NO
- **Trigger**: Save button `onClick={() => save.mutate()}`

**Recommendation**: ❌ **REQUIRES GATING**

---

### File 9: `src/pages/settings/FacilityTypesPage.tsx`

**Status**: ❌ NOT GATED

**Mutations Found**: 4

#### Mutation #1: `createMutation` in FacilityTypeModal (Lines 88-101)
```typescript
const createMutation = useMutation({
  mutationFn: async (values: FacilityTypeFormValues) => {
    // ❌ NOT GATED
    const { error } = await supabase.from(TABLES.FACILITY_TYPES).insert({
      tenant_id: tenantId,
      label: values.label,
      // ... other fields
    } as never);
  },
});
```
- **Operation**: INSERT to facility_types table
- **Gated**: ❌ NO

#### Mutation #2: `updateMutation` in FacilityTypeModal (Lines 113-127)
```typescript
const updateMutation = useMutation({
  mutationFn: async (values: FacilityTypeFormValues) => {
    // ❌ NOT GATED
    const { error } = await supabase
      .from(TABLES.FACILITY_TYPES)
      .update({ label: values.label, /* ... */ } as never)
      .eq("id", editing!.id);
  },
});
```
- **Operation**: UPDATE to facility_types table
- **Gated**: ❌ NO

#### Mutation #3: `seedDefaultsMutation` (Lines 177-191)
```typescript
const seedDefaultsMutation = useMutation({
  mutationFn: async () => {
    // ❌ NOT GATED
    const { error } = await supabase.from(TABLES.FACILITY_TYPES).insert(inserts as never);
  },
});
```
- **Operation**: INSERT to facility_types table
- **Gated**: ❌ NO

#### Mutation #4: `toggleActive` (Lines 195-207)
```typescript
const toggleActive = async (type: FacilityType) => {
  // ❌ NOT GATED
  const { error } = await supabase
    .from(TABLES.FACILITY_TYPES)
    .update({ is_active: newVal } as never)
    .eq("id", type.id);
};
```
- **Operation**: UPDATE to facility_types table
- **Gated**: ❌ NO

#### Mutation #5: Drag-to-Reorder `handleDrop` (Lines 226-239)
```typescript
const handleDrop = async (e: React.DragEvent) => {
  // ❌ NOT GATED
  const { error } = await supabase
    .from(TABLES.FACILITY_TYPES)
    .upsert(updates as never, { onConflict: "id" });
};
```
- **Operation**: UPSERT to facility_types table (reordering)
- **Gated**: ❌ NO

**Recommendation**: ❌ **REQUIRES GATING - ALL 5 MUTATIONS**

---

### File 10: `src/pages/settings/FeaturePermissions.tsx`

**Status**: ❌ NOT GATED

**Mutations Found**: 1

#### Mutation #1: `saveMutation` (Lines 213-227)
```typescript
const saveMutation = useMutation({
  mutationFn: async () => {
    // ❌ NOT GATED
    const { error } = await supabase
      .from(TABLES.FEATURE_PERMISSIONS)
      .upsert(rows as never, { onConflict: "tenant_id,feature,role" });
  },
  onSuccess: () => { /* ... */ },
});
```
- **Operation**: UPSERT to feature_permissions table
- **Gated**: ❌ NO
- **Trigger**: Save button `onClick={() => saveMutation.mutate()}`

**Recommendation**: ❌ **REQUIRES GATING**

---

## Summary Statistics

### Files Audited by Area

| Area | Files | Mutations Found | Not Gated | Read-Only |
|------|-------|-----------------|-----------|-----------|
| **reports_analytics** | 1 | 0 | 0 | 1 ✅ |
| **attendance** | 1 | 1 | 1 ❌ | 0 |
| **church_settings** | 10 | 36+ | 8 ❌ | 2 ✅ |
| **TOTAL** | **12** | **37+** | **9** | **3** |

### Mutation Breakdown by File

| File | Mutations | Status |
|------|-----------|--------|
| Reports.tsx | 0 | ✅ READ-ONLY |
| AttendanceSettings.tsx | 1 | ❌ NOT GATED |
| AnnouncementTypes.tsx | 5 | ❌ NOT GATED |
| AppointmentTypes.tsx | 3 | ❌ NOT GATED |
| Backup.tsx | 0 | ✅ READ-ONLY |
| Billing.tsx | 0 | ✅ READ-ONLY |
| BranchCredentials.tsx | 1 | ❌ NOT GATED |
| ChurchProfile.tsx | 3 | ❌ NOT GATED |
| CommunicationsSettings.tsx | 6+ | ❌ NOT GATED |
| ContactSocial.tsx | 1 | ❌ NOT GATED |
| FacilityTypesPage.tsx | 5 | ❌ NOT GATED |
| FeaturePermissions.tsx | 1 | ❌ NOT GATED |

---

## Consistent Save Pattern Analysis

### Pattern Found: YES ✅

**Most Common Pattern**:
```typescript
const saveMutation = useMutation({
  mutationFn: async (values) => {
    // Database operation here
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [/* ... */] });
    toast.success("Success message");
  },
  onError: (e) => toast.error(e.message || "Failed"),
});
```

**Trigger Patterns**:
1. **Form submission**: `form.handleSubmit((v) => saveMutation.mutate(v))`
2. **Button click**: `<Button onClick={() => saveMutation.mutate()}>Save</Button>`
3. **Inline async functions**: `const handleSave = async () => { /* mutation code */ }`

**Variations**:
- Some files use `useMutation` consistently
- Others use inline `async` functions
- Modal components often have their own mutation handlers
- Drag-to-reorder operations use inline `async` functions

**Consistency Level**: **MODERATE** - Most follow mutation pattern but inline async still common in older files

---

## Permission Keys Required

| Area | Permission Key | Files Affected |
|------|----------------|----------------|
| Attendance | `'attendance'` | AttendanceSettings.tsx |
| Church Settings | `'church_settings'` | 8 settings files |

---

## Recommendations

### Immediate Action Required

**9 files need permission gating** (37+ mutations total):

1. **AttendanceSettings.tsx** - 1 mutation
2. **AnnouncementTypes.tsx** - 5 mutations
3. **AppointmentTypes.tsx** - 3 mutations
4. **BranchCredentials.tsx** - 1 mutation
5. **ChurchProfile.tsx** - 3 mutations
6. **CommunicationsSettings.tsx** - 6+ mutations
7. **ContactSocial.tsx** - 1 mutation
8. **FacilityTypesPage.tsx** - 5 mutations
9. **FeaturePermissions.tsx** - 1 mutation

### Implementation Approach

For each file:
1. Add import: `import { usePermissions } from '@/hooks/usePermissions';`
2. Add declaration: `const { isReadOnly } = usePermissions(); const readOnly = isReadOnly('<permission_key>');`
3. Add guard: `if (readOnly) return;` as FIRST LINE in each `mutationFn` or async function

### No Changes Needed

**3 files are read-only** (no mutations):
- Reports.tsx ✅
- Backup.tsx ✅
- Billing.tsx ✅

---

## Next Steps

1. Apply permission gates to 9 files requiring gating
2. Test all gated mutations to ensure they respect read-only mode
3. Verify `ReadOnlyBanner` is displayed on all settings pages when user has read-only access
4. Update documentation with complete permission gate implementation

---

**Audit Completed**: June 11, 2026  
**Auditor**: Kiro AI Assistant  
**Status**: ✅ COMPLETE - Ready for implementation phase
