# Reports & Analytics Permission Gates - TODO List

**Permission:** `reports_analytics`  
**Description:** Controls report generation and analytics exports

---

## 📋 FILES TO FIX

### 1. src/pages/analytics/Reports.tsx
- [x] Add ReadOnlyBanner ✅
- [x] Export button (top-right ExportMenu) - needs tooltip ✅
- [x] Multiple CSV export buttons throughout tabs ✅

### 2. src/pages/media/AssetManagement.tsx
- [x] Add ReadOnlyBanner ✅
- [x] Export button - needs tooltip ✅

### 3. src/pages/security/IncidentManagement.tsx  
- [x] Add ReadOnlyBanner ✅
- [x] Export PDF button - needs tooltip ✅

### 4. src/pages/security/SecurityCentre.tsx
- [x] Add ReadOnlyBanner ✅
- [x] Export Logs button - needs tooltip ✅

### 5. src/pages/people/Members.tsx
- [x] Add ReadOnlyBanner ✅
- [x] Export button - needs tooltip ✅
- [x] Import Members button - needs tooltip ✅

### 6. src/pages/people/Families.tsx
- [x] Add ReadOnlyBanner ✅
- [x] Export button - needs tooltip ✅

### 7. src/pages/people/childrens-ministry/CMReports.tsx
- [x] Add ReadOnlyBanner ✅
- [x] Export CSV button - needs tooltip ✅

---

## 🔍 ADDITIONAL SEARCH NEEDED

Need to search entire project for other Export/Import buttons that might exist in:
- Finance pages (giving reports, expense reports)
- Growth/Training pages
- Other analytics pages
- Any other pages with data export capabilities

---

## ✅ IMPLEMENTATION PATTERN

For each file:
1. Add `usePermissions` hook if not present
2. Add `readOnly` variable: `const readOnly = isReadOnly('reports_analytics');`
3. Add `<ReadOnlyBanner permission="reports_analytics" />` at top of content
4. Change Export/Import buttons from `Button` to `PermissionButton` with `readOnly={readOnly}` prop
5. Test that tooltip shows when button is disabled

---

## 📝 NOTES

- All Export/Import actions should be disabled when `reports_analytics` permission is restricted
- Tooltip should say: "You don't have permission to export/import data"
- ReadOnlyBanner should say: "You have read-only access to Reports & Analytics"
- Users can still view all data, just cannot export or import it


---

## 🔍 ADDITIONAL FILES FOUND & FIXED

### 8. src/pages/operations/Volunteering.tsx
- [x] Export CSV button in Reports tab - needs tooltip ✅
- [x] Add ReadOnlyBanner ✅

### 9. src/pages/operations/MeetingMinutes.tsx
- [x] Export PDF button - needs tooltip ✅
- [x] Add ReadOnlyBanner ✅

### 10. src/pages/member/MemberGivingHistory.tsx
- [x] Export CSV button - NO ACTION NEEDED (member portal - permissions don't apply) ✅

### 11. src/pages/communications/SurveyResponses.tsx
- [x] Export CSV button - needs tooltip ✅
- [x] Add ReadOnlyBanner ✅

### 12. src/pages/communications/whatsapp/WaReportTab.tsx
- [x] Export CSV button - needs tooltip ✅
- [x] Add ReadOnlyBanner ✅

---

## ✅ IMPLEMENTATION STATUS

**COMPLETED: 11/11 files** (excluding member portal)
**ALL ADMIN-SIDE EXPORT BUTTONS PROTECTED**

---

## 📝 NOTES

- MemberGivingHistory is in member portal - permissions don't apply there (members export their own data)
- All other export/import actions should be disabled when `reports_analytics` permission is restricted
- Tooltip should say: "You don't have permission to export/import data"
- ReadOnlyBanner should say: "You have read-only access to Reports & Analytics"
