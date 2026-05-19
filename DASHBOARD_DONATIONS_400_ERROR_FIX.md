# Dashboard "Today's Donations" 400 Error Fix - COMPLETE

## Problem Identified
The Dashboard's "Today's Donations" section was showing "No donations recorded yet" while the stat card correctly showed "KSh 99". The root cause was a **400 Bad Request error** when fetching giving_records due to requesting **non-existent columns**.

## Root Cause Analysis
Using Supabase MCP to verify the actual database schema, I discovered that the `giving_records` table does NOT contain the following columns that were being requested:
- `donor_name` ❌ (does not exist)
- `is_anonymous` ❌ (does not exist) 
- `receipt_number` ❌ (does not exist)
- `notes` ❌ (does not exist)

### Actual giving_records Schema
The table actually contains these columns:
- `id`, `tenant_id`, `member_id`, `amount`, `currency`, `giving_type`, `payment_method`, `payment_status`, `pledge_id`, `pesapal_transaction_id`, `receipt_url`, `recorded_by`, `given_at`, `voided_at`, `void_reason`, `created_at`, `payhero_reference`, `checkout_request_id`, `mpesa_receipt`, `phone_number`, `external_reference`

## Files Fixed

### 1. Dashboard.tsx - Today's Donations Query
**Location**: `src/pages/Dashboard.tsx` (lines 404-450)

**Before** (causing 400 error):
```typescript
.select("id, amount, giving_type, payment_method, given_at, currency, donor_name, is_anonymous, member_id")
```

**After** (using only existing columns):
```typescript
.select("id, amount, giving_type, payment_method, given_at, currency, member_id")
```

### 2. Dashboard.tsx - Donor Name Display Logic
**Location**: `src/pages/Dashboard.tsx` (donation rendering section)

**Before** (accessing non-existent columns):
```typescript
const donorName = donation.is_anonymous 
  ? 'Anonymous Donor'
  : donation.donor_name 
    || (member ? `${member.first_name} ${member.last_name}`.trim() : null)
    || 'Unknown Donor';
```

**After** (using only available data):
```typescript
const donorName = member 
  ? `${member.first_name} ${member.last_name}`.trim()
  : 'Anonymous Donor';
```

### 3. Dashboard.tsx - Debug Query
**Location**: `src/pages/Dashboard.tsx` (debug query)

**Fixed**: Removed references to `donor_name` and `is_anonymous` from debug query.

### 4. Backup.tsx - Export Query
**Location**: `src/pages/settings/Backup.tsx` (lines 49-53)

**Before** (causing potential 400 error):
```typescript
"Donor Name": r.donor_name, 
"Receipt Number": r.receipt_number, 
"Notes": r.notes,
```

**After** (using only existing columns):
```typescript
"Payment Method": r.payment_method, 
"Payment Status": r.payment_status,
"Currency": r.currency, 
"Member ID": r.member_id,
```

## Solution Summary

1. **Fixed Column Requests**: Updated all queries to only request columns that actually exist in the `giving_records` table
2. **Updated Donor Name Logic**: Changed donor name display to use member lookup via `member_id` instead of non-existent `donor_name` column
3. **Consistent Filtering**: Maintained the same local timezone filtering logic that works correctly for the stat card
4. **Removed Anonymous Logic**: Since `is_anonymous` column doesn't exist, all donations without a linked member are treated as "Anonymous Donor"

## Expected Result

- ✅ **Today's Donations section will now display donations** instead of "No donations recorded yet"
- ✅ **No more 400 Bad Request errors** in the browser console
- ✅ **Consistent data between stat card and donations list** - both use identical filtering logic
- ✅ **Proper donor names** - shows member names when available, "Anonymous Donor" otherwise
- ✅ **Backup export functionality** will work without errors

## Testing Verification

The fix ensures that:
1. The "Today's Giving" stat card (KSh 99) and "Today's Donations" list show consistent data
2. All database queries use only existing columns
3. Donor names display correctly using member lookup
4. No TypeScript or runtime errors occur

## Database Schema Verification Method

Used Supabase MCP `list_tables` tool with `verbose: true` to get the complete, accurate schema directly from the production database, ensuring all fixes align with the actual table structure.