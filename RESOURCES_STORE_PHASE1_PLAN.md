# Resources Store Phase 1 - Implementation Plan

**Status:** Study Phase Complete - Ready for Implementation  
**Date:** May 3, 2026  
**Scope:** Admin fixes + Public/Member store browsing (NO payment processing)

---

## Study Phase - Key Findings

### 1. Current ResourcesStore.tsx Structure
- **File Size:** 1,851 lines
- **Current State:** Admin interface only, file uploads broken
- **Components Found:**
  - `StoreQRModal` - Generates QR codes (working but points to non-existent route)
  - `AddResourceForm` - Full-page overlay form (file uploads broken)
  - `ResourcesTab` - Product list table
  - `OrdersTab` - Orders list
  - `RefundsTab` - Refunds list
  - Multiple settings tabs

### 2. Routing Structure (App.tsx)
- **Admin Route:** `/resources-store` ✅ EXISTS
- **Public Route:** `/store/:tenantId` ❌ DOES NOT EXIST
- **Member Route:** `/member/store` ❌ DOES NOT EXIST
- **Pattern:** Uses lazy loading with Suspense fallback

### 3. Member Portal Patterns (from MemberHome.tsx & MemberEvents.tsx)
- Uses `useMemberPortal()` hook for context
- Provides: `member.churchId`, `member.memberId`, `member.churchName`, `member.enabledModules`
- Church data is ALWAYS dynamic from context - never hardcoded
- Mobile-first design with 2-column grids
- Uses framer-motion for animations
- Helmet for page titles with church name

### 4. Database Schema (from audit)
**store_products table (20 columns):**
- `id`, `tenant_id`, `name`, `category`, `description`
- `image_urls` (JSONB array) - currently never populated
- `product_type` ('physical' | 'digital')
- `price`, `compare_at_price`, `currency`
- `sku`, `stock_quantity`, `weight_kg`
- `digital_file_url` - currently never set
- `status` ('active' | 'draft' | 'out_of_stock')
- `sales_count`, `tags` (TEXT[])
- `created_by`, `created_at`, `updated_at`

**store_orders table (21 columns):**
- Order management structure exists
- `delivery_method` ('digital_download' | 'pickup' | 'delivery')
- Payment fields exist but unused

### 5. Supabase Storage Pattern
Need to check existing upload patterns in codebase for:
- Church media uploads
- Sermon audio uploads
- How to use Supabase Storage client

### 6. Tenants Table
Need to verify columns for:
- `name` (church name)
- `logo_url` or `logo`
- `description`
- `church_code` or `slug`

---

## Implementation Order

### ✅ PHASE 0: Pre-Implementation Setup
**Status:** READY TO START

**Tasks:**
1. Read tenants table schema to confirm column names
2. Check existing Supabase Storage upload patterns
3. Verify RLS policies on store_products for anon access
4. Create storage bucket migration file

---

### 📦 TASK 1: Fix File Uploads (Admin Side)
**Estimated Time:** 3-4 hours  
**Priority:** CRITICAL

#### Step A: Create Storage Buckets Migration
**File:** `supabase/migrations/[timestamp]_store_storage_buckets.sql`

```sql
-- Product cover images (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('store-covers', 'store-covers', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Product gallery images (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('store-gallery', 'store-gallery', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Digital files (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('store-digital-files', 'store-digital-files', false, 104857600,
  ARRAY['application/pdf','audio/mpeg','audio/mp4','video/mp4',
        'application/zip','application/epub+zip'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for each bucket
-- (Full policies as specified in requirements)
```

**Action:** Run `npx supabase db push` after creating migration

#### Step B-E: Implement Upload Logic
**Files to Modify:**
- `src/pages/growth/ResourcesStore.tsx` (AddResourceForm component)

**Changes:**
1. Replace broken file inputs with upload zones
2. Add upload progress indicators
3. Implement actual Supabase Storage upload
4. Save URLs to database after upload
5. Handle upload errors gracefully

**Key Functions to Add:**
- `uploadCoverImage(file, tenantId, productId)`
- `uploadGalleryImages(files, tenantId, productId)`
- `uploadDigitalFile(file, tenantId, productId)`

---

### 🎨 TASK 2: Admin Design Upgrade
**Estimated Time:** 4-5 hours  
**Priority:** HIGH

#### Components to Upgrade:
1. **Dashboard Tab** - Animated stat cards with count-up
2. **Resources Tab** - Grid/List view toggle, premium cards
3. **Add/Edit Form** - Enhanced styling (keep structure)
4. **QR Modal** - Better design
5. **Copy Link Button** - Visual upgrade

**Accent Color:** Amber (#d97706, #f59e0b, #b45309)

**Key Additions:**
- Grid view with product cards (aspect-[3/4] covers)
- List view with mini thumbnails
- Gradient backgrounds for products without images
- Hover animations with framer-motion
- BlurFadeIn on page load

---

### 🌐 TASK 3: Public Store Page
**Estimated Time:** 5-6 hours  
**Priority:** CRITICAL

#### New File: `src/pages/store/PublicStore.tsx`

**Route:** `/store/:tenantId` (NO AUTH REQUIRED)

**Data Queries:**
1. Fetch tenant info (name, logo, description)
2. Fetch active products for tenant
3. Fetch unique categories

**RLS Requirements:**
- Add anon policy for store_products (status = 'active')
- Add anon policy for tenants (read-only)

**Page Structure:**
1. Hero section with church branding (dynamic)
2. Search + filter toolbar (sticky)
3. Product grid (2-5 columns responsive)
4. Product detail modal (layoutId expansion)
5. Footer with church info

**Key Features:**
- Category filter pills
- Search functionality
- Sort options (newest, price, popular)
- Free badge on free products
- Type badges (digital/physical)
- Share buttons (copy link, WhatsApp)

---

### 👤 TASK 4: Member Store Page
**Estimated Time:** 4-5 hours  
**Priority:** HIGH

#### New File: `src/pages/member/MemberStore.tsx`

**Route:** `/member/store` (AUTH REQUIRED)

**Differences from Public Store:**
- Uses `useMemberPortal()` for context
- Shows member-specific features:
  - Member discount pricing
  - "You own this" badges (future)
  - Featured/sale section
  - Free resources section
- More compact mobile-first design
- 2-column grid always

**Update Required:**
- `src/pages/member/MemberHome.tsx` - Change Resource Store card path from `#` to `/member/store`

---

### 🚚 TASK 5: Shipping Tab
**Estimated Time:** 2-3 hours  
**Priority:** MEDIUM

**Approach:** Store configuration in tenants table

**Check if exists:** `store_settings` JSONB column on tenants  
**If not:** Add via migration

**UI Structure:**
1. Pickup from Church toggle + config
2. Local Delivery toggle + config
3. Save button

**Data Structure:**
```json
{
  "shipping": {
    "pickup": {
      "enabled": true,
      "location": "Church office",
      "instructions": "Mon-Fri 9am-5pm",
      "fee": 0
    },
    "delivery": {
      "enabled": true,
      "fee": 500,
      "radius": "Within Nairobi CBD",
      "estimatedTime": "2-3 business days",
      "instructions": ""
    }
  }
}
```

---

### ✨ TASK 6: Global Animations
**Estimated Time:** 2-3 hours  
**Priority:** MEDIUM

**Apply Throughout:**
- Page load sequences (BlurFadeIn)
- Card hover effects (whileHover)
- Product detail expansion (layoutId)
- Filter pill selection (sliding indicator)
- Number counters (admin dashboard)
- Button interactions (whileTap)

**Pattern:**
```tsx
import { motion, AnimatePresence } from "framer-motion";

// Card hover
<motion.div
  whileHover={{ y: -6, scale: 1.02 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
>

// Page entrance
<BlurFadeIn delay={0}>
```

---

## Verification Checklist

### Admin Side
- [ ] Cover image uploads to store-covers bucket
- [ ] Gallery images upload correctly
- [ ] Digital file uploads to store-digital-files bucket
- [ ] Product saved with image URLs in database
- [ ] Stat cards animate on load
- [ ] Grid view shows product cards with covers
- [ ] List view shows product table
- [ ] QR modal opens with working QR code
- [ ] Copy Store Link copies correct tenant URL
- [ ] Shipping tab saves configuration
- [ ] Dark mode on all admin elements

### Public Store
- [ ] /store/{tenantId} loads without login
- [ ] Church name comes from tenants table (not hardcoded)
- [ ] Church logo displays if set
- [ ] Products filter by category correctly
- [ ] Product detail expands via layoutId
- [ ] Free badge shows on free products
- [ ] Share buttons work (copy + WhatsApp)
- [ ] Empty state shows if no products
- [ ] Dark mode works

### Member Store
- [ ] Resource Store card on member home navigates to /member/store
- [ ] Member store loads correctly
- [ ] Featured section shows (if sale products exist)
- [ ] Free resources section shows (if free products)
- [ ] Category filter works
- [ ] Product detail shows member discount if applicable
- [ ] "You own this" logic works (for future purchases)
- [ ] Loading skeletons appear while fetching
- [ ] Dark mode works
- [ ] Mobile layout correct (2-column grid)

### Both Public + Member
- [ ] All church data is dynamic — no hardcoding
- [ ] No new npm packages installed
- [ ] No hardcoded tenant_id anywhere
- [ ] All existing admin store functionality untouched

---

## Critical Rules Compliance

✅ **NO new npm packages** - Using only installed packages  
✅ **NO new environment variables** - Using existing BASE_URL  
✅ **NO hardcoded church data** - All from tenants table/context  
✅ **NO payment processing** - Phase 2 only  
✅ **Reuse existing components** - BlurFadeIn, shadcn/ui, framer-motion  
✅ **Follow Supabase patterns** - Match existing query structure  
✅ **Amber accent color** - #d97706 throughout store surfaces  

---

## Next Steps

1. ✅ Study phase complete
2. ⏭️ Read tenants table schema
3. ⏭️ Check Supabase Storage upload patterns
4. ⏭️ Create storage bucket migration
5. ⏭️ Begin Task 1: File uploads implementation

**Ready to proceed with implementation.**
