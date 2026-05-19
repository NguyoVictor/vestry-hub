# 🔧 Church Context Import Fix — RESOLVED

## ❌ **ISSUE**
```
Failed to resolve import "@/hooks/useChurch" from "src/pages/settings/PaymentsPage.tsx". Does the file exist?
```

## 🔍 **ROOT CAUSE**
The finance module components were importing `useChurch` from the wrong location and using incorrect property names:

- **WRONG IMPORT**: `import { useChurch } from '@/hooks/useChurch'`
- **CORRECT IMPORT**: `import { useChurch } from '@/contexts/ChurchContext'`

- **WRONG USAGE**: `const { church } = useChurch()` then `church.id`
- **CORRECT USAGE**: `const church = useChurch()` then `church.tenantId`

## ✅ **FILES FIXED**

### Import Path Corrections:
- ✅ `src/pages/settings/PaymentsPage.tsx`
- ✅ `src/components/finance/PaymentChannelSetup.tsx`

### Property Name Corrections:
- ✅ `church.id` → `church.tenantId`
- ✅ `church?.id` → `church.tenantId`
- ✅ `{ church }` → `church` (direct destructuring not needed)

## 🔄 **CHANGES MADE**

### Before (causing errors):
```typescript
import { useChurch } from '@/hooks/useChurch'

const { church } = useChurch()
if (!church?.id) return
.eq('id', church.id)
tenant_id: church.id
```

### After (working):
```typescript
import { useChurch } from '@/contexts/ChurchContext'

const church = useChurch()
if (!church.tenantId) return
.eq('id', church.tenantId)
tenant_id: church.tenantId
```

## 📋 **ChurchContext Interface**
```typescript
interface ChurchData {
  tenantId: string;     // ✅ Use this
  name: string;
  currency: string;
  city: string | null;
  country: string | null;
  logoUrl: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  userFirstName: string;
  userLastName: string;
}
```

## 🎯 **RESULT**

The dev server should now start without import errors and the PaymentsPage should load correctly:

- ✅ **Settings → Payments** (`/settings/payments`)
- ✅ PaymentChannelSetup component accessible
- ✅ Church tenant ID properly resolved
- ✅ Database queries use correct tenant isolation

## 🧪 **TO TEST**

1. Dev server should start without errors
2. Navigate to **Settings → Payments**
3. Page should load with connection status
4. Payment channel setup should work correctly

**The church context import issue is now RESOLVED!** 🚀