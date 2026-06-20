# VestryHub - Known Issues & Technical Debt

This document catalogsexisting limitations, incomplete features, and areas needing improvement.

## Critical Issues

### 1. Database Schema Mismatch with Specs
**Issue**: Phase spec files use different table/column names than actual database

**Impact**: 
- Confusion for new developers
- Must use `schema.ts` constants religiously

**Examples**:
- Spec says `donations` → Actual: `giving_records`
- Spec says `church_id` → Actual: `tenant_id`
- Spec says `church_expenses` → Actual: `expenses`

**Resolution**: 
- ✅ Created `schema.ts` constants as source of truth
- ✅ All queries use constants
- ⚠️ Phase spec docs still reference wrong names

**Action Needed**: Update or archive phase spec files

---

### 2. Incomplete Member Permission System
**Issue**: `role_permissions` table exists but not fully implemented for staff roles

**Impact**:
- Staff users get admin-level access or nothing
- No granular module-level permissions

**Current State**:
- `usePermissions` checks role (admin/pastor/staff/member)
- Pastor role has hardcoded whitelist
- Staff role should check `role_permissions` table but doesn't always

**Action Needed**:
- Implement full role_permissions checks in `usePermissions`
- Add UI for managing custom roles
- Test all permission gates with staff role

---

### 3. Inconsistent Error Handling
**Issue**: Some mutations don't have proper error handling

**Examples**:
- Some mutations show generic "Error occurred" toast
- Some don't catch errors at all
- No consistent error logging to Sentry

**Impact**:
- Poor user experience
- Hard to debug production issues

**Action Needed**:
- Standardize error handling pattern
- Add Sentry error tracking to all mutations
- Show user-friendly error messages

---

## Performance Issues

### 4. Dashboard Stat Queries Not Optimized
**Issue**: Dashboard makes 10+ separate queries on load

**Impact**:
- Slow dashboard load (2-3 seconds)
- High database load

**Current Mitigation**:
- `useOptimizedDashboard` batches some queries
- Not all stats use the optimized hook

**Action Needed**:
- Create compound RPC function for all dashboard stats
- Cache aggressively (staleTime: 5 minutes)

---

### 5. Member List Not Virtualized
**Issue**: Large member lists (500+) load all rows at once

**Impact**:
- Slow rendering with 1000+ members
- High memory usage

**Current State**:
- Uses simple `.map()` to render all rows
- No pagination or virtual scrolling

**Action Needed**:
- Implement virtual scrolling (react-window)
- Or add server-side pagination
- Consider infinite scroll pattern

---

### 6. Real-time Subscription Memory Leaks
**Issue**: Some components don't clean up Realtime subscriptions

**Impact**:
- Memory leaks on long sessions
- Multiple subscriptions to same channel

**Action Needed**:
- Audit all `useEffect` with Realtime subscriptions
- Ensure `removeChannel` in cleanup
- Consider subscription manager service

---

## Incomplete Features

### 7. Offline Support Missing
**Issue**: App requires internet connection

**Impact**:
- Can't use during outages
- Poor experience in low-connectivity areas

**Desired State**:
- PWA with offline cache
- Queue mutations when offline
- Sync when back online

**Action Needed**:
- Implement service worker
- Add offline detection
- Queue failed mutations for retry

---

### 8. Mobile Responsiveness Issues
**Issue**: Some pages not fully mobile-optimized

**Problem Pages**:
- Song Library (complex UI doesn't adapt)
- Set List Builder (drag-and-drop breaks on mobile)
- Calendar views (too cramped)

**Action Needed**:
- Audit all pages on mobile devices
- Simplify complex layouts for mobile
- Test touch interactions

---

### 9. Email Template Editor Limited
**Issue**: Basic textarea for email templates, no WYSIWYG

**Impact**:
- Hard to create rich HTML emails
- Non-technical users struggle

**Desired State**:
- Visual drag-and-drop email builder
- Template library
- Preview before send

**Action Needed**:
- Integrate email builder library
- Or use React Email for template creation

---

### 10. No Automated Testing
**Issue**: Very limited test coverage

**Current State**:
- Few unit tests
- No integration tests
- Some E2E tests for Song Library only

**Impact**:
- Regressions go unnoticed
- Fear of refactoring
- Manual testing required

**Action Needed**:
- Add unit tests for utilities and hooks
- Add integration tests for critical flows
- Expand E2E test coverage

---

## Security Concerns

### 11. Rate Limiting Missing
**Issue**: No rate limiting on sensitive endpoints

**Risk**:
- SMS/email spam
- Brute force login attempts
- API abuse

**Action Needed**:
- Implement rate limiting in edge functions
- Add captcha for public forms
- Monitor usage patterns

---

### 12. Audit Log Incomplete
**Issue**: Not all actions logged to activity_log

**Current State**:
- Login events tracked
- Some CRUD operations logged
- Many actions not logged

**Action Needed**:
- Audit all write operations
- Add logging to all mutations
- Create audit report UI

---

## UI/UX Issues

### 13. Toast Notification Overflow
**Issue**: Multiple simultaneous toasts overlap

**Impact**:
- Hard to read messages
- Looks unprofessional

**Action Needed**:
- Limit simultaneous toasts (max 3)
- Queue additional toasts
- Improve toast positioning

---

### 14. Loading States Inconsistent
**Issue**: Some pages show blank screen while loading

**Impact**:
- Looks broken
- Poor perceived performance

**Current State**:
- Some pages use Skeleton loaders
- Some show nothing during load
- No consistent pattern

**Action Needed**:
- Standardize loading states
- Use Skeleton for all data loading
- Add loading indicators for mutations

---

### 15. Empty States Generic
**Issue**: Many empty states just say "No data"

**Impact**:
- Users don't know what to do
- Missed onboarding opportunity

**Action Needed**:
- Add helpful empty states with CTAs
- Include graphics/icons
- Provide next action guidance

---

## Data Integrity Issues

### 16. Orphaned Records Possible
**Issue**: Deleting parent doesn't cascade delete children

**Examples**:
- Delete group doesn't remove group_members
- Delete conversation leaves orphan messages
- Delete member leaves orphan giving records

**Risk**:
- Database bloat
- Referential integrity violations

**Action Needed**:
- Add CASCADE DELETE foreign keys
- Or implement soft deletes
- Add cleanup jobs for orphaned data

---

### 17. No Data Validation Layer
**Issue**: Validation only in frontend (React Hook Form + Zod)

**Risk**:
- Direct database access bypasses validation
- Edge functions may insert invalid data

**Action Needed**:
- Add database CHECK constraints
- Add validation in RLS policies
- Validate in edge functions

---

## Scalability Concerns

### 18. File Storage Growing Unbounded
**Issue**: No automatic cleanup of unused files

**Impact**:
- Storage costs grow indefinitely
- Deleted media not removed from storage

**Action Needed**:
- Implement storage cleanup job
- Remove files when records deleted
- Add storage limit enforcement

---

### 19. Database Indexes Missing
**Issue**: Not all foreign keys have indexes

**Impact**:
- Slow queries on large tables
- High database CPU

**Action Needed**:
- Audit all foreign keys
- Add indexes where missing
- Monitor query performance

---

## Documentation Gaps

### 20. API Documentation Missing
**Issue**: No formal API docs for edge functions

**Impact**:
- Hard to integrate
- Unclear request/response formats

**Action Needed**:
- Document all edge functions
- Add OpenAPI/Swagger specs
- Include example requests

---

### 21. Onboarding Documentation Sparse
**Issue**: No user guide for church admins

**Impact**:
- Support burden
- Feature underutilization

**Action Needed**:
- Create admin user guide
- Add in-app tooltips
- Record video tutorials

---

## Technical Debt

### 22. Large Components Need Refactoring
**Issue**: Some components exceed 1000 lines

**Problem Files**:
- `MemberMessaging.tsx` (~1600 lines)
- `MemberMessages.tsx` (~1400 lines)
- `SongLibrary.tsx` (~1200 lines)

**Impact**:
- Hard to maintain
- Difficult to test
- Slow developer velocity

**Action Needed**:
- Extract sub-components
- Split into feature files
- Use composition patterns

---

### 23. Duplicate Code Across Admin/Member
**Issue**: Similar logic duplicated between admin and member portal

**Examples**:
- Messaging components
- Profile forms
- Event RSVP logic

**Action Needed**:
- Extract shared logic to hooks
- Create shared components
- Use composition for variants

---

### 24. TypeScript `any` Usage
**Issue**: Too many `any` types, especially in Supabase queries

**Impact**:
- Lost type safety
- Runtime errors

**Action Needed**:
- Generate types from database schema
- Replace `any` with proper types
- Add strict TypeScript config

---

### 25. Environment Variables Inconsistent
**Issue**: Some configs hardcoded, some in env vars

**Impact**:
- Hard to configure per environment
- Secrets mixed with configs

**Action Needed**:
- Move all configs to env vars
- Document all required variables
- Validate env on startup

---

## Future Enhancements Needed

### 26. Multi-Language Support
**Current**: English only  
**Need**: i18n for local churches

---

### 27. Mobile Apps
**Current**: Web only  
**Need**: iOS and Android native apps

---

### 28. Advanced Reporting
**Current**: Basic reports  
**Need**: Custom report builder with SQL

---

### 29. Workflow Automation
**Current**: Manual processes  
**Need**: Zapier-like automation builder

---

### 30. AI-Powered Features
**Current**: Basic AI (sermon summaries)  
**Need**: Smart insights, predictions, recommendations

---

## Priority Matrix

| Issue | Severity | Effort | Priority |
|-------|----------|--------|----------|
| Rate Limiting | High | Medium | 🔴 Critical |
| Permission System | High | High | 🔴 Critical |
| Error Handling | High | Low | 🟡 High |
| Component Refactoring | Medium | High | 🟡 High |
| Testing Coverage | High | High | 🟡 High |
| Performance Optimization | Medium | Medium | 🟢 Medium |
| Mobile Responsiveness | Medium | Medium | 🟢 Medium |
| Documentation | Low | Low | 🟢 Medium |
| Offline Support | Low | High | ⚪ Low |
| Multi-Language | Low | High | ⚪ Low |

---

## How to Report New Issues

1. Check this document first
2. Search GitHub issues
3. Create new issue with:
   - **Title**: Clear, specific
   - **Description**: Steps to reproduce
   - **Expected**: What should happen
   - **Actual**: What actually happens
   - **Impact**: User/business impact
   - **Files**: Affected components/pages

---

## Maintenance Checklist

- [ ] Review and update this document monthly
- [ ] Prioritize top 3 issues each sprint
- [ ] Track resolved issues in changelog
- [ ] Monitor production errors via Sentry
- [ ] Regular performance audits
- [ ] User feedback review sessions

---

**Congratulations!** You've completed the VestryHub documentation. You should now have a comprehensive understanding of the entire system architecture, codebase structure, and development practices.
