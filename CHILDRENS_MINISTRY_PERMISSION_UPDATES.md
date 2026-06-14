# Children's Ministry Permission Gates Implementation

## Summary
Add `member_management` permission gating to all Children's Ministry components as it falls under the fine-tune permission description: "Controls member profiles, families, visitors, children's ministry and follow-up records. Also applies to Groups & Ministries."

## Completed
✅ CMLayout.tsx - Added ReadOnlyBanner that appears on all tabs

## Files to Update

### 1. CMOverview.tsx
- [ ] Top right "Register Child" button → Change to PermissionButton
- [ ] Quick Actions "Register Child" card → Needs permission gate (wrapper or disabled state)

### 2. CMClasses.tsx  
- [ ] Top right "Add Class" button → Change to PermissionButton
- [ ] Center empty state "Add Class" button → Change to PermissionButton

### 3. CMChildren.tsx
- [ ] Top right "Register Child" button → Change to PermissionButton  
- [ ] Center empty state "Register Child" button → Change to PermissionButton

### 4. CMSettings.tsx
- [ ] All toggle switches → Wrap in permission check or disable when readOnly
- [ ] All input fields → Disable when readOnly
- [ ] Save buttons → Change to PermissionButton

## Pattern to Follow
```typescript
// Import
import { PermissionButton } from '@/components/shared/PermissionButton';

// For buttons
<PermissionButton 
  permission="member_management"
  ...otherProps
>
  Button Content
</PermissionButton>

// For Quick Action cards (needs custom wrapper)
<div className={cn("cursor-pointer", readOnly && "opacity-50 cursor-not-allowed")}>
  <button onClick={readOnly ? undefined : action} disabled={readOnly}>
```
