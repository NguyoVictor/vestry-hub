# Paywall Implementation - Quick Reference Guide

## 🚀 Quick Start

### Adding Paywall to a New Feature

#### 1. Import Required Dependencies
```typescript
import { useSubscription } from '@/hooks/useSubscription';
import { showPaywallToast } from '@/components/PaywallToast';
```

#### 2. Get Subscription Data
```typescript
const { limits, usage, canAddMember, canAddStaff, hasMpesaGiving, hasSermonAi } = useSubscription();
```

#### 3. Check Limit Before Action
```typescript
// For count-based limits (members, staff, branches)
if (currentCount >= limits.members) {
  showPaywallToast('members', 'Members');
  return;
}

// For credit-based limits (SMS, email, AI)
if (!canSendSms) {
  showPaywallToast('SMS credits', 'SMS');
  return;
}

// For feature gates (M-Pesa, Sermon AI)
if (!hasMpesaGiving) {
  showPaywallToast('M-Pesa giving', 'M-Pesa giving');
  return;
}
```

---

## 📋 Available Checkers

### Boolean Checkers
```typescript
const {
  canAddMember,    // true if members < limit
  canAddStaff,     // true if staff < limit
  canSendSms,      // true if SMS credits available
  canSendEmail,    // true if email credits available
  canUseAi,        // true if AI credits available
  hasMpesaGiving,  // true if plan includes M-Pesa
  hasSermonAi,     // true if plan includes Sermon AI
} = useSubscription();
```

### Limits Object
```typescript
const { limits } = useSubscription();
// limits.members
// limits.staff
// limits.branches
// limits.storage_gb
// limits.sms
// limits.email
// limits.ai
```

### Usage Object
```typescript
const { usage } = useSubscription();
// usage.members
// usage.staff
// usage.storage_gb
// usage.sms
// usage.email
// usage.ai
```

---

## 🎯 Common Patterns

### Pattern 1: Button with Limit Check
```typescript
<Button 
  onClick={() => {
    if (!canAddMember) {
      showPaywallToast('members', 'Members');
      return;
    }
    // Proceed with action
    openAddMemberDialog();
  }}
>
  Add Member
</Button>
```

### Pattern 2: Conditional Rendering
```typescript
{hasMpesaGiving && (
  <div>
    {/* M-Pesa payment option */}
  </div>
)}
```

### Pattern 3: Mutation with Limit Check
```typescript
const createMutation = useMutation({
  mutationFn: async () => {
    // Check limit before mutation
    if (currentCount >= limits.branches) {
      showPaywallToast('branches', 'branches');
      throw new Error('Branch limit reached');
    }
    
    // Proceed with mutation
    await supabase.from('branches').insert(data);
  },
  onError: (error) => {
    if (error.message !== 'Branch limit reached') {
      toast.error('Failed to create branch');
    }
  },
});
```

### Pattern 4: Edge Function Credit Check
```typescript
// In Supabase Edge Function
const { data: subscription } = await supabaseAdmin
  .from('tenant_subscriptions')
  .select('*')
  .eq('tenant_id', tenantId)
  .single();

const smsLimit = (subscription.sms_credits || 0) + (subscription.sms_addons || 0);
const smsUsed = subscription.sms_used || 0;

if (smsUsed >= smsLimit) {
  return new Response(
    JSON.stringify({ error: 'SMS credit limit reached' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
}

// Send SMS...

// Increment usage
await supabaseAdmin
  .from('tenant_subscriptions')
  .update({ sms_used: smsUsed + 1 })
  .eq('tenant_id', tenantId);
```

---

## 🎨 Toast Messages

### showPaywallToast(resource, addOnLabel?)

**Parameters:**
- `resource`: Display name of the limited resource (e.g., "members", "SMS credits")
- `addOnLabel`: (Optional) Name of the add-on that can be purchased

**Examples:**
```typescript
// With add-on suggestion
showPaywallToast('members', 'Members');
// Shows: "You've reached your members limit. Buy extra Members or upgrade your plan to continue."

// Without add-on (feature gate)
showPaywallToast('Sermon AI');
// Shows: "You've reached your Sermon AI limit. Upgrade your plan to continue."
```

---

## 📊 Plan Features

### Free Plan
```typescript
{
  member_limit: 100,
  staff_limit: 3,
  branch_limit: 1,
  storage_limit_gb: 2,
  sms_credits: 0,
  email_credits: 100,
  ai_credits: 0,
  mpesa_giving: false,
  sermon_ai: false,
}
```

### Basic Plan (KSh 2,499/mo)
```typescript
{
  member_limit: 200,
  staff_limit: 7,
  branch_limit: 3,
  storage_limit_gb: 10,
  sms_credits: 100,
  email_credits: 500,
  ai_credits: 0,
  mpesa_giving: true,
  sermon_ai: false,
}
```

### Growth Plan (KSh 8,999/mo) - Most Popular
```typescript
{
  member_limit: 500,
  staff_limit: 15,
  branch_limit: 10,
  storage_limit_gb: 20,
  sms_credits: 500,
  email_credits: 2000,
  ai_credits: 50,
  mpesa_giving: true,
  sermon_ai: true,
}
```

### Pro Plan (KSh 12,499/mo)
```typescript
{
  member_limit: 2000,
  staff_limit: 30,
  branch_limit: 20,
  storage_limit_gb: 50,
  sms_credits: 2000,
  email_credits: 8000,
  ai_credits: 200,
  mpesa_giving: true,
  sermon_ai: true,
}
```

---

## 🔄 Monthly Reset Logic

### What Resets
- `sms_used` → 0
- `email_used` → 0
- `ai_used` → 0

### What Persists
- `member_addons`
- `sms_addons`
- `email_addons`
- `ai_addons`
- `storage_addons_gb`
- Real-time counts (members, staff, storage)

### Reset Schedule
- **When:** 1st of every month at midnight UTC
- **Function:** `supabase/functions/reset-monthly-credits/index.ts`
- **Cron:** `0 0 1 * *`

---

## 🛠️ Database Queries

### Get Subscription
```typescript
const { data: subscription } = await supabase
  .from('tenant_subscriptions')
  .select('*')
  .eq('tenant_id', tenantId)
  .single();
```

### Update Usage
```typescript
// Increment SMS usage
await supabase
  .from('tenant_subscriptions')
  .update({ sms_used: subscription.sms_used + 1 })
  .eq('tenant_id', tenantId);

// Increment Email usage
await supabase
  .from('tenant_subscriptions')
  .update({ email_used: subscription.email_used + 1 })
  .eq('tenant_id', tenantId);

// Increment AI usage
await supabase
  .from('tenant_subscriptions')
  .update({ ai_used: subscription.ai_used + 1 })
  .eq('tenant_id', tenantId);
```

### Add Add-on
```typescript
await supabase
  .from('tenant_subscriptions')
  .update({ 
    sms_addons: subscription.sms_addons + 100 
  })
  .eq('tenant_id', tenantId);
```

### Upgrade Plan
```typescript
await supabase
  .from('tenant_subscriptions')
  .update({ 
    plan: 'growth',
    member_limit: 500,
    staff_limit: 15,
    branch_limit: 10,
    storage_limit_gb: 20,
    sms_credits: 500,
    email_credits: 2000,
    ai_credits: 50,
  })
  .eq('tenant_id', tenantId);
```

---

## 🧪 Testing

### Test Paywall Enforcement
```typescript
// 1. Set subscription to Free plan
// 2. Try to add 101st member → should show paywall toast
// 3. Try to add 4th staff → should show paywall toast
// 4. Try to add 2nd branch → should show paywall toast
// 5. Try to send SMS with 0 credits → should show error
// 6. Try to use Sermon AI on Basic plan → should show paywall toast
```

### Test Usage Tracking
```typescript
// 1. Send SMS → check sms_used incremented
// 2. Send email → check email_used incremented
// 3. Generate AI content → check ai_used incremented
```

### Test Monthly Reset
```typescript
// 1. Set usage counters to non-zero values
// 2. Run reset function manually
// 3. Verify sms_used, email_used, ai_used reset to 0
// 4. Verify add-on balances preserved
```

---

## 🚨 Common Mistakes

### ❌ Don't Do This
```typescript
// Hardcoding limits
if (memberCount >= 100) {
  showPaywallToast('members');
}

// Not checking before action
const handleAddMember = () => {
  // Missing limit check!
  openAddMemberDialog();
};

// Forgetting to increment usage
await sendSMS(phone, message);
// Missing: increment sms_used
```

### ✅ Do This Instead
```typescript
// Use dynamic limits from subscription
if (memberCount >= limits.members) {
  showPaywallToast('members', 'Members');
  return;
}

// Always check before action
const handleAddMember = () => {
  if (!canAddMember) {
    showPaywallToast('members', 'Members');
    return;
  }
  openAddMemberDialog();
};

// Always increment usage
await sendSMS(phone, message);
await supabase
  .from('tenant_subscriptions')
  .update({ sms_used: subscription.sms_used + 1 })
  .eq('tenant_id', tenantId);
```

---

## 📞 Support

### Questions?
- Check `SUBSCRIPTION_PAYWALL_IMPLEMENTATION_COMPLETE.md` for detailed implementation guide
- Check `SUBSCRIPTION_SYSTEM_FINAL_SUMMARY.md` for overall system overview
- Review existing implementations in:
  - `src/pages/people/Members.tsx` (member limit)
  - `src/pages/settings/Users.tsx` (staff limit)
  - `src/pages/analytics/Branches.tsx` (branch limit)
  - `src/pages/media/SermonPreparation.tsx` (feature gate)

### Need to Add New Limit?
1. Add to `PLANS` in `src/config/plans.ts`
2. Add to database schema in `tenant_subscriptions` table
3. Add to `limits` calculation in `useSubscription.ts`
4. Add checker function if needed
5. Implement enforcement in relevant components
6. Update documentation

---

## 🎯 Checklist for New Feature

- [ ] Import `useSubscription` and `showPaywallToast`
- [ ] Get relevant limit/checker from subscription hook
- [ ] Add limit check before action
- [ ] Show paywall toast when limit reached
- [ ] Test with different plans (Free, Basic, Growth, Pro)
- [ ] Test with add-ons
- [ ] Update documentation if needed

---

**Last Updated:** June 1, 2026  
**Version:** 1.0  
**Status:** Production Ready
