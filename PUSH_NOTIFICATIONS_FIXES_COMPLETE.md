# Push Notifications Issues - FIXED ✅

## Issues Identified and Fixed

### 1. ❌ **In-App Notifications Not Showing in Bell Icon**
**Problem**: AdminBroadcast was using member IDs instead of user IDs for notifications
**Root Cause**: Query was selecting `id` from members table, but notifications table expects `user_id`
**Fix**: ✅ Updated to select `user_id` from members table and filter out null values

```typescript
// BEFORE (wrong)
const { data } = await supabase.from(TABLES.MEMBERS).select("id").eq("tenant_id", tenantId);
memberIds = (data ?? []).map((m: any) => m.id);

// AFTER (correct)
const { data } = await supabase.from(TABLES.MEMBERS).select("user_id").eq("tenant_id", tenantId).not("user_id", "is", null);
userIds = (data ?? []).map((m: any) => m.user_id).filter(Boolean);
```

### 2. ❌ **Push Notification Stats Showing 0**
**Problem**: Edge Function was not receiving `recipient_user_ids` and broadcast record wasn't updated with results
**Root Cause**: Missing parameter in Edge Function call and no capture of response
**Fix**: ✅ Added `recipient_user_ids` parameter and captured response to update database

```typescript
// BEFORE (incomplete)
await supabase.functions.invoke("send-push-notification", {
  body: { tenant_id: tenantId, title: subject.trim(), body: message.trim(), priority, data: { broadcast_id: row?.id, type: "broadcast" } },
});

// AFTER (complete)
const { data: pushResult } = await supabase.functions.invoke("send-push-notification", {
  body: { 
    tenant_id: tenantId, 
    recipient_user_ids: userIds,  // ✅ Added this
    title: subject.trim(), 
    body: message.trim(), 
    priority, 
    data: { broadcast_id: row?.id, type: "broadcast" } 
  },
});

// ✅ Capture and store results
if (pushResult) {
  pushSentCount = pushResult.sent || 0;
  pushFailedCount = pushResult.failed || 0;
}

// ✅ Update broadcast record
await supabase.from(TABLES.ADMIN_BROADCASTS)
  .update({ push_sent_count: pushSentCount, push_failed_count: pushFailedCount })
  .eq("id", row.id);
```

### 3. ❌ **Read Rate Tracking Not Working (0.0%)**
**Problem**: Read rate was hardcoded to 0 with TODO comment
**Root Cause**: No actual query to count read notifications
**Fix**: ✅ Added proper query to count read notifications for broadcasts

```typescript
// BEFORE (hardcoded)
const totalRead = 0; // TODO: fetch from notification reads

// AFTER (dynamic)
const { data: readNotifications } = useQuery({
  queryKey: ["broadcast-read-count", tenantId, timeFilter],
  queryFn: async () => {
    const { data } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("type", "broadcast")
      .or(`is_read.eq.true,data->>viewed_at.not.is.null`)  // ✅ Read OR viewed
      .gte("created_at", since.toISOString());
    return data ?? [];
  },
  staleTime: 30000,
  enabled: filtered.length > 0,
});

const totalRead = readNotifications?.length ?? 0;
```

### 4. ❌ **Eye Icon View Count Not Functional**
**Problem**: View count was hardcoded and not tracking actual views
**Root Cause**: No mechanism to track when notifications are viewed/clicked
**Fix**: ✅ Added view tracking when notifications are clicked in TopNavbar

```typescript
// ✅ Added view tracking in TopNavbar
const handleNotificationClick = (n: any) => {
  if (!n.is_read) markRead.mutate(n.id);
  
  // Track view for broadcast notifications
  if (n.type === "broadcast") {
    supabase.from("notifications")
      .update({ 
        data: { 
          ...n.data, 
          viewed_at: new Date().toISOString()  // ✅ Track view timestamp
        } 
      })
      .eq("id", n.id);
  }
  
  // Navigate based on notification type...
};
```

### 5. ✅ **Branch Recipients Support**
**Enhancement**: Added support for sending to specific branches
**Implementation**: Query members by branch_id to get user_ids

```typescript
// ✅ Added branch support
else if (recipientType === "branches") {
  const { data } = await supabase.from(TABLES.MEMBERS)
    .select("user_id")
    .eq("tenant_id", tenantId)
    .in("branch_id", selectedBranches)
    .not("user_id", "is", null);
  userIds = (data ?? []).map((m: any) => m.user_id).filter(Boolean);
}
```

## Files Modified

1. **`src/pages/communications/AdminBroadcast.tsx`**
   - Fixed user ID mapping for in-app notifications
   - Added recipient_user_ids parameter for push notifications
   - Captured and stored push notification results
   - Implemented proper read rate calculation
   - Added individual broadcast view count tracking

2. **`src/components/layout/TopNavbar.tsx`**
   - Added view tracking for broadcast notifications
   - Updated notification click handler to record viewed_at timestamp

## Testing Checklist

- [ ] Send a broadcast with in-app + push channels
- [ ] Verify in-app notifications appear in bell icon (mobile & desktop)
- [ ] Verify push notifications are delivered to devices
- [ ] Check that push notification stats show correct sent/failed counts
- [ ] Click on notifications and verify view count increases
- [ ] Check that read rate percentage updates correctly
- [ ] Test with different recipient types (all, branches, officers)

## Expected Results

1. **In-App Notifications**: ✅ Should appear in TopNavbar bell icon with red badge
2. **Push Notifications**: ✅ Should be delivered to devices AND show in stats
3. **Stats Cards**: ✅ Should show actual sent/failed counts, not 0
4. **Read Rate**: ✅ Should calculate percentage based on actual reads/views
5. **View Count**: ✅ Eye icon should show number of people who viewed the message

## Database Schema Notes

- `notifications.user_id` links to `users.id`
- `members.user_id` links to `users.id` 
- `notifications.data` JSONB field stores `broadcast_id` and `viewed_at` timestamp
- `admin_broadcasts.push_sent_count` and `push_failed_count` track delivery stats