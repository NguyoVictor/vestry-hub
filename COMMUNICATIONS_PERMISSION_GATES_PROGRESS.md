# Communications Permission Gates - Progress Report

**Date:** June 12, 2026  
**Permission:** `communication_tools`  
**Status:** 2 of 9 files complete (22%)

---

## ✅ COMPLETED FILES (2/9)

### 1. EmailBranding.tsx ✅
**Actions Fixed:**
- Save Branding Settings button → PermissionButton
- Church Logo "Choose File" input → disabled={readOnly}
- Church Logo "Remove Logo" button → disabled={readOnly}
- Sender Photo "Choose File" input → disabled={readOnly}
- Sender Photo "Remove Photo" button → disabled={readOnly}
**Total:** 5 actions enforced | ✅ Zero errors

### 2. WhatsAppDirectory.tsx ✅
**Actions Fixed:**
- Individuals Tab: "Add Individual" button (top) → PermissionButton
- Individuals Tab: "Add First Contact" button (center) → PermissionButton
- Groups Tab: "Add Group" button (top) → PermissionButton
- Groups Tab: "Add First Group" button (center) → PermissionButton
**Total:** 4 actions enforced | ✅ Zero errors

---

## 📋 REMAINING FILES (7/9)

### 3. Communications.tsx / Broadcasts
**Actions Needed:**
- [ ] Three-dot dropdown menu on drafts/scheduled messages
  - Send via Email
  - Send via SMS
  - Edit Draft
  - Delete

### 4. ComposeEmail.tsx or Communications.tsx - Email
**Actions Needed:**
- [ ] "Send Test Email" button
- [ ] "+ Compose Message" button

### 5. EmailTemplates.tsx
**Actions Needed:**
- [ ] "+ Create Template" button (top)
- [ ] My Templates Tab: "Send", "Edit", "Duplicate", "Delete" buttons
- [ ] Template Library Tab: "Duplicate" buttons

### 6. EmailAutomation.tsx
**Actions Needed:**
- [ ] "Create Custom Email" button
- [ ] "Save Changes" button

### 7. SmsTab.tsx
**Actions Needed:**
- [ ] "Send Test SMS" button
- [ ] "+ Compose Message" button

### 8. SmsTemplates.tsx
**Actions Needed:**
- [ ] "+ Create Template" button (top)
- [ ] My Templates Tab: "Send", "Edit", "Delete" buttons
- [ ] Template Library Tab: "Duplicate" buttons

### 9. AdminBroadcast.tsx
**Actions Needed:**
- [ ] Broadcasts Tab: Three-dot menu, "+ New Broadcast"
- [ ] Templates Tab: "+ New Template", Three-dot menu

---

## Summary

**Completed:** 9 actions across 2 files  
**Remaining:** ~25 actions across 7 files  
**Next Priority:** AdminBroadcast, Email/SMS Templates, Email/SMS Compose

**All mutations already have** `if (readOnly) return;` **checks.**  
**Only UI buttons/dropdowns need PermissionButton enforcement.**
