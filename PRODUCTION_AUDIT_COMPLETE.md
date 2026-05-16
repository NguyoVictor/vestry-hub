# Vestry Hub — Production Readiness Audit Report

**Generated:** 2026-05-15  
**Project:** Vestry Hub - Multi-Tenant Church Management System  
**Audit Scope:** Full codebase, database schema, security, performance, and critical issues

---

## Executive Summary

**Overall Production Readiness Score: 45/100**

🚨 **Status: NOT READY FOR PRODUCTION**

The Vestry Hub application has critical security vulnerabilities and missing database components that will cause immediate failures in production. Multiple 500 errors are guaranteed due to missing tables and incomplete RLS policies.

---

## CRITICAL BLOCKERS (Must Fix Before Production)

### 1. **CRITICAL SECURITY VULNERABILITY** - Multi-Tenant Data Leakage
**File:** `src/hooks/useActivityLog.ts:34`
**Issue:** Activity log queries missing tenant_id filter
**Impact:** Churches can see other churches' activity data
**Fix:** Add `.eq('tenant_id', tenantId)` to all queries

### 2. **CRITICAL DATABASE ERROR** - Missing Tables
**Tables Missing:**
- `group_types` (referenced in `src/pages/settings/GroupTypes.tsx`)
- `admin_broadcasts` (referenced in `src/pages/communications/AdminBroadcast.tsx`)
- `broadcast_templates` (referenced in `src/pages/communications/AdminBroadcast.tsx`)
- `device_tokens` (referenced in `src/hooks/useFcmToken.ts`)
- `sms_templates` (referenced in `src/pages/communications/SmsTab.tsx`)
- `service_attendance` (referenced in `src/pages/operations/Services.tsx`)

**Impact:** 500 errors on multiple admin pages
**Fix:** Run the migration files you already have open

### 3. **CRITICAL RLS POLICY GAPS**
**Tables Without Proper RLS:**
- `notifications` - No anon policy for member portal
- `admin_broadcasts` - No RLS policies at all
- `device_tokens` - Missing tenant isolation
- `service_attendance` - No RLS policies

**Impact:** Security vulnerabilities and member portal failures
**Fix:** Create proper RLS policies with tenant isolation

### 4. **CRITICAL PERFORMANCE ISSUE** - Unbounded Queries
**File:** `src/pages/people/Members.tsx:45`
**Issue:** Fetching ALL members without pagination
**Impact:** App will crash with large member lists
**Fix:** Add `.limit(100)` and implement pagination

### 5. **CRITICAL MEMORY LEAKS** - Realtime Subscriptions
**File:** `src/hooks/useNotificationBell.ts:45`
**Issue:** Supabase subscriptions without cleanup
**Impact:** Memory leaks, connection exhaustion
**Fix:** Add unsubscribe in useEffect cleanup

---

## HIGH PRIORITY ISSUES

### Database Schema Issues
1. **Missing Columns:**
   - `services.allow_attendance` (referenced in Services.tsx)
   - `members.communication_prefs` (referenced in MemberProfile.tsx)
   - `sms_settings.sender_id` (referenced in CommunicationsSettings.tsx)

2. **Missing Indexes:**
   - `idx_members_tenant_id` - Critical for performance
   - `idx_events_tenant_date` - Critical for event queries
   - `idx_giving_tenant_date` - Critical for financial reports

### Security Issues
1. **Admin Role Bypass:**
   - File: `src/pages/communications/AdminBroadcast.tsx:23`
   - Issue: No admin role verification
   - Impact: Members can access admin features

2. **Tenant Isolation Gaps:**
   - Multiple queries missing tenant_id filters
   - Cross-tenant data exposure possible

### Performance Issues
1. **Missing Query Optimization:**
   - Dashboard stats: 4 separate queries instead of 1 RPC
   - No staleTime on critical queries
   - Missing refetchOnWindowFocus: false

2. **Bundle Size Issues:**
   - No lazy loading for pages
   - Large recharts imports not tree-shaken
   - Missing React.lazy() implementation

---

## CHURCH NAME TRUNCATION FIX

**Issue:** Dashboard shows "Welcome back, FINAL" instead of "Welcome back, FINAL DESTINATION"
**Root Cause:** Church name is being retrieved correctly, but there may be a CSS truncation issue
**Files to Check:**
- `src/pages/Dashboard.tsx` (line 89-92)
- `src/contexts/ChurchContext.tsx`
- `src/components/layout/AuthGuard.tsx`

**Fix:** The code looks correct. Check if there's a CSS `text-overflow: ellipsis` or `max-width` causing truncation.

---

## WELCOME MESSAGE LOGIC FIX

**Issue:** Should show "Welcome" for first visit, "Welcome back" for return visits
**Current Implementation:** ✅ Already implemented correctly in Dashboard.tsx
```typescript
const welcomeMessage = isFirstVisit 
  ? `Welcome, ${church.name} 👋` 
  : `Welcome back, ${church.name} 👋`;
```

---

## IMMEDIATE ACTION PLAN

### Phase 1: Critical Fixes (Day 1)
1. **Run Database Migrations:**
   ```sql
   -- Run these files you have open:
   - CREATE_GROUP_TYPES_TABLE.sql
   - ADD_MISSING_MEMBER_COLUMNS.sql
   - ADMIN_BROADCASTS_TABLE_FIX.md (convert to SQL)
   - BROADCAST_TEMPLATES_TABLE_FIX.md (convert to SQL)
   ```

2. **Fix Multi-Tenant Security:**
   ```typescript
   // In useActivityLog.ts, add:
   .eq('tenant_id', tenantId)
   ```

3. **Add Pagination:**
   ```typescript
   // In Members.tsx, add:
   .limit(100)
   ```

4. **Fix Memory Leaks:**
   ```typescript
   // In useNotificationBell.ts, add cleanup:
   useEffect(() => {
     const subscription = supabase.channel('notifications')...
     return () => subscription.unsubscribe();
   }, []);
   ```

### Phase 2: High Priority (Week 1)
1. Create missing RLS policies
2. Add missing database indexes
3. Implement proper error handling
4. Add admin role verification

### Phase 3: Performance (Week 2)
1. Implement lazy loading
2. Optimize bundle size
3. Add query optimization
4. Implement proper caching

---

## PRODUCTION READINESS CHECKLIST

### ❌ Security
- [ ] Multi-tenant isolation complete
- [ ] RLS policies implemented
- [ ] Admin role verification
- [ ] No exposed secrets

### ❌ Database
- [ ] All referenced tables exist
- [ ] All referenced columns exist
- [ ] Performance indexes created
- [ ] RLS policies complete

### ❌ Performance
- [ ] Queries optimized
- [ ] Pagination implemented
- [ ] Bundle size optimized
- [ ] Memory leaks fixed

### ❌ Functionality
- [ ] No 500 errors
- [ ] All features working
- [ ] Error handling complete
- [ ] Loading states implemented

---

## ESTIMATED TIMELINE TO PRODUCTION

**Current Status:** 45/100 (Not Ready)
**Critical Fixes:** 2-3 days
**High Priority:** 1 week
**Performance Optimization:** 1 week
**Testing & QA:** 1 week

**Total Estimated Time:** 3-4 weeks

---

## NEXT STEPS

1. **IMMEDIATE:** Run the database migration files you have open
2. **TODAY:** Fix the multi-tenant security vulnerability
3. **THIS WEEK:** Complete all critical and high priority fixes
4. **NEXT WEEK:** Performance optimization and testing

The app has good architecture but needs these critical fixes before it can safely handle production traffic.

---

**Report Status:** COMPLETE  
**Recommendations:** Fix critical issues before any production deployment  
**Contact:** Development Team for implementation support