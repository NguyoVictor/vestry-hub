# Implementation Plan: Facility Booking Revamp

## Overview

Implement the complete Facility & Event Booking revamp across six areas: DB migrations, schema constants, FacilityTypes settings page, revamped admin booking page (stats + 3 tabs), member portal booking page, and public booking page. All code follows Vestry conventions: `TABLES`/`COLS` constants, TanStack Query with `staleTime: 300000`, React Hook Form + Zod, shadcn/ui components, and `tenant_id` scoping on every query.

## Tasks

- [-] 1. Database migrations and storage buckets
  - [x] 1.1 Create `facility_types` table migration
    - Write SQL migration: `CREATE TABLE facility_types` with columns `id VARCHAR PK DEFAULT nanoid()`, `tenant_id VARCHAR NOT NULL`, `label VARCHAR NOT NULL`, `description TEXT`, `is_active BOOLEAN DEFAULT true`, `sort_order INTEGER DEFAULT 0`, `is_default BOOLEAN DEFAULT false`, `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`
    - Add index: `CREATE INDEX idx_facility_types_tenant_id ON facility_types(tenant_id)`
    - Enable RLS: `ALTER TABLE facility_types ENABLE ROW LEVEL SECURITY`
    - Add tenant read policy: `CREATE POLICY "tenant_read" ON facility_types FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))`
    - Add tenant write policy: `CREATE POLICY "tenant_write" ON facility_types FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))`
    - Add public read policy: `CREATE POLICY "public_read" ON facility_types FOR SELECT USING (true)` (needed for public booking page)
    - _Requirements: 1.10, 11.1_

  - [x] 1.2 Create `facility_images` table migration
    - Write SQL migration: `CREATE TABLE facility_images` with columns `id VARCHAR PK DEFAULT nanoid()`, `facility_id VARCHAR NOT NULL REFERENCES facilities(id) ON DELETE CASCADE`, `tenant_id VARCHAR NOT NULL`, `image_path VARCHAR NOT NULL`, `sort_order INTEGER DEFAULT 0`, `created_at TIMESTAMPTZ DEFAULT now()`
    - Add indexes on `facility_id` and `tenant_id`
    - Enable RLS with tenant read/write policies (same pattern as facility_types)
    - Add public read policy (needed for public booking page)
    - _Requirements: 2.3, 11.2_

  - [x] 1.3 Add columns to `facility_bookings` migration
    - Write SQL migration using `ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS` for: `booking_number VARCHAR`, `source VARCHAR NOT NULL DEFAULT 'admin'`, `external_name VARCHAR`, `external_email VARCHAR`, `external_phone VARCHAR`, `external_org VARCHAR`, `cancelled_at TIMESTAMPTZ`, `confirmed_at TIMESTAMPTZ`, `confirmed_by VARCHAR`
    - Create sequence and trigger for `booking_number` generation: `'BK-' || LPAD(nextval('facility_booking_number_seq')::text, 4, '0')`
    - Add public insert policy on `facility_bookings`: `CREATE POLICY "public_insert" ON facility_bookings FOR INSERT WITH CHECK (source = 'external')`
    - _Requirements: 7.10, 11.3_

  - [x] 1.4 Create `facility_responses` table migration
    - Write SQL migration: `CREATE TABLE facility_responses` with columns `id VARCHAR PK DEFAULT nanoid()`, `tenant_id VARCHAR NOT NULL`, `facility_id VARCHAR REFERENCES facilities(id) ON DELETE SET NULL`, `respondent_name VARCHAR NOT NULL`, `respondent_email VARCHAR`, `respondent_phone VARCHAR`, `respondent_org VARCHAR`, `message TEXT NOT NULL`, `source VARCHAR NOT NULL CHECK (source IN ('in_app','external','email','sms','whatsapp'))`, `status VARCHAR NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','converted'))`, `raw_payload JSONB`, `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`
    - Add indexes on `tenant_id` and `facility_id`
    - Enable RLS with tenant read/write policies
    - _Requirements: 8.5, 11.4_

  - [x] 1.5 Create Supabase storage buckets
    - Create `facility-images` bucket: public access, 5 MB max file size
    - Create `facility-videos` bucket: private access (signed URLs), 50 MB max file size
    - Run migrations against the Supabase project
    - _Requirements: 2.1, 2.2, 11.7_

- [x] 2. Update `TABLES` constants in `src/lib/schema.ts`
  - Add `FACILITY_TYPES: "facility_types"` to the `TABLES` object under the Events & Operations section (after `FACILITY_BOOKING_RESPONSES`)
  - Add `FACILITY_IMAGES: "facility_images"` to the `TABLES` object
  - Add `FACILITY_RESPONSES: "facility_responses"` to the `TABLES` object
  - Verify all three constants are exported and TypeScript compiles without errors
  - _Requirements: 11.5, 12.1, 12.2, 12.3_

- [x] 3. FacilityTypesPage settings page (`src/pages/settings/FacilityTypesPage.tsx`)
  - [x] 3.1 Create the page component with query and empty state
    - Create `src/pages/settings/FacilityTypesPage.tsx`
    - Use `useChurch()` for `tenantId`; wrap in `<PageTransition>`
    - Add `<Helmet>` with title "Facility Types — Vestry"
    - Implement `useQuery({ queryKey: ["facility-types", tenantId], staleTime: 300000 })` fetching from `TABLES.FACILITY_TYPES` ordered by `sort_order`
    - Render empty state with `Building2` icon and "Add Default Types" button when no records exist
    - _Requirements: 1.1, 1.5_

  - [x] 3.2 Implement the facility types table with status toggle
    - Render a table with columns: Label, Description, Status toggle (shadcn `Switch`), Actions (edit icon button)
    - Implement `toggleActiveMutation` using `useMutation` with optimistic UI: immediately flip `is_active` in query cache, revert on error
    - _Requirements: 1.3, 1.9_

  - [x] 3.3 Implement drag-and-drop row reordering
    - Add HTML5 drag events (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) to table rows
    - On drop, compute new `sort_order` values and call `reorderMutation` which batch-updates all affected rows in `facility_types`
    - Invalidate `["facility-types", tenantId]` on success
    - _Requirements: 1.4_

  - [ ]* 3.4 Write property test for drag-drop sort_order persistence (Property 2)
    - **Property 2: Drag-drop reorder persists sort_order**
    - **Validates: Requirements 1.4**

  - [x] 3.5 Implement Add/Edit modal with React Hook Form + Zod
    - Add `facilityTypeSchema = z.object({ label: z.string().min(1), description: z.string().optional(), is_active: z.boolean().default(true) })`
    - Render a `Dialog` with fields: Label (required), Description (textarea), Active toggle
    - Wire `createMutation` (insert into `TABLES.FACILITY_TYPES` with `tenant_id`, `sort_order: existingCount`) and `updateMutation` (update by id)
    - Pre-populate form when editing; show inline `FormMessage` errors on submit
    - _Requirements: 1.6, 1.7, 1.8_

  - [ ]* 3.6 Write property test for edit modal pre-population (Property 3)
    - **Property 3: Edit modal pre-populates with record data**
    - **Validates: Requirements 1.7**

  - [ ]* 3.7 Write property test for save facility type round-trip (Property 4)
    - **Property 4: Save facility type round-trip**
    - **Validates: Requirements 1.8**

  - [ ]* 3.8 Write property test for status toggle round-trip (Property 5)
    - **Property 5: Status toggle round-trip**
    - **Validates: Requirements 1.9**

  - [x] 3.9 Implement "Add Default Types" seed mutation
    - On click, batch-insert the 8 default types (Main Hall, Chapel, Conference Room, Outdoor, Parking, Kitchen, Classroom, Other) with `is_default: true` and sequential `sort_order`
    - Invalidate query on success; show `toast.success("Default types added")`
    - _Requirements: 1.5_

- [x] 4. Settings navigation and routing
  - [x] 4.1 Add "Facility Types" to SettingsLayout nav
    - In `src/components/settings/SettingsLayout.tsx`, add to the FEATURES group: `{ label: "Facility Types", icon: Building2, path: "/settings/facility-types" }`
    - Import `Building2` from `lucide-react` (already imported elsewhere — verify it's in the import list)
    - _Requirements: 1.1, 13.1_

  - [x] 4.2 Add route and lazy import in `src/App.tsx`
    - Add lazy import: `const FacilityTypesPage = lazy(() => import("./pages/settings/FacilityTypesPage"))`
    - Add route inside the `/settings` `<Route>` block: `<Route path="facility-types" element={<Suspense fallback={<Fallback />}><FacilityTypesPage /></Suspense>} />`
    - _Requirements: 13.2, 13.3_

- [x] 5. Checkpoint — Verify settings foundation
  - Ensure all tests pass, ask the user if questions arise.
  - Confirm `/settings/facility-types` renders without crashing and the nav item appears in the FEATURES group.

- [x] 6. FacilityBooking.tsx complete revamp (`src/pages/operations/FacilityBooking.tsx`)
  - [x] 6.1 Replace page shell: header, stats row, tab state
    - Replace the existing file with a new implementation
    - Page header: title "Facility & Event Booking", subtitle "Manage church spaces and booking requests", two action buttons "+ Add Facility" (outline) and "+ New Booking" (primary)
    - Implement `useSearchParams` tab state (`?tab=facilities|bookings|responses`)
    - Add stats row with four `StatCard`-style cards: Total Facilities, Active Bookings, Pending Requests, External Requests — fetched via `supabase.rpc("get_facility_booking_stats", { p_tenant_id: tenantId })` with `queryKey: ["facility-booking-stats", tenantId]`
    - Add three `useQuery` hooks: facilities (`TABLES.FACILITIES` with `facility_images` join), bookings (`TABLES.FACILITY_BOOKINGS`), responses (`TABLES.FACILITY_RESPONSES`)
    - Derive `unreadCount` from `responses.filter(r => r.status === 'new').length`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.2 Write property test for stats cards data accuracy (Property 9)
    - **Property 9: Stats cards reflect actual data counts**
    - **Validates: Requirements 3.2**

  - [ ]* 6.3 Write property test for unread badge count (Property 10)
    - **Property 10: Unread badge count matches unread responses**
    - **Validates: Requirements 3.4**

  - [x] 6.4 Implement Facilities tab with search, filter, and FacilityCard grid
    - Render search input, Type filter dropdown (from `TABLES.FACILITY_TYPES` active records), Status filter dropdown (Active/Inactive/All)
    - Apply client-side filtering to the facilities query result
    - Render facilities as a responsive card grid (1 col mobile, 2 tablet, 3 desktop) using `FacilityCard` sub-component
    - `FacilityCard` displays: first `facility_images` record or gradient placeholder, type badge (from `facility_types` label), status badge, facility name, capacity, description (truncated `line-clamp-2`), price (if set), "Book Now" button, Share icon, kebab menu (View, Edit, Send Confirmation, Delete)
    - Share icon copies `/book/:tenantId/:facilityId` to clipboard via `navigator.clipboard.writeText` and shows `toast.success`
    - Empty state: `Building2` icon + CTA to add facility
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.8, 4.9, 4.10_

  - [ ]* 6.5 Write property test for facility cards rendering required fields (Property 11)
    - **Property 11: Facility cards render all required fields**
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 6.6 Write property test for empty state on no filter match (Property 12)
    - **Property 12: Empty state shown when no facilities match filter**
    - **Validates: Requirements 4.10**

  - [x] 6.7 Implement FacilityDetailModal
    - Create `FacilityDetailModal` component (can be co-located in the same file or a separate file under `src/pages/operations/`)
    - Props: `facility`, `images: FacilityImage[]`, `upcomingBookings`, `open`, `onClose`
    - Display: scrollable image gallery, video player/URL embed, name, type, capacity, description, price, list of upcoming bookings for that facility
    - Open when user clicks "View" from kebab menu or clicks the card body
    - _Requirements: 4.5_

  - [x] 6.8 Implement AddEditFacilityModal with image upload
    - Create `AddEditFacilityModal` using React Hook Form + Zod (`facilitySchema` from design)
    - Fields: Name (required), Type (Select from active `TABLES.FACILITY_TYPES`), Capacity, Description, Price/Quotation, Active toggle
    - Image upload section: up to 5 images, each max 5 MB, uploaded to `facility-images` bucket; show thumbnails with delete button; disable upload button at 5 images with tooltip
    - Video section: toggle between file upload (to `facility-videos` bucket, max 50 MB) and URL input
    - On save: insert/update `TABLES.FACILITIES` record, then insert `TABLES.FACILITY_IMAGES` records for new uploads; handle image deletions
    - Show inline `FormMessage` errors; `toast.error("Failed to upload image")` on upload failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 6.9 Write property test for image upload creates facility_images record (Property 6)
    - **Property 6: Image upload creates facility_images record**
    - **Validates: Requirements 2.4**

  - [ ]* 6.10 Write property test for image count limit enforced (Property 7)
    - **Property 7: Image count limit enforced**
    - **Validates: Requirements 2.5**

  - [ ]* 6.11 Write property test for image gallery renders all uploaded images (Property 8)
    - **Property 8: Image gallery renders all uploaded images**
    - **Validates: Requirements 2.6**

  - [ ]* 6.12 Write property test for save facility round-trip (Property 13)
    - **Property 13: Save facility round-trip**
    - **Validates: Requirements 5.4, 5.5**

  - [x] 6.13 Implement Bookings tab with table and filters
    - Render search input, Facility filter dropdown, Status filter dropdown, Date range pickers
    - Render bookings in a table with columns: Booking #, Facility, Booked By, Purpose, Date/Time, Duration, Attendees, Status badge (`StatusBadge`), Source badge, Actions (kebab: View, Edit, Send Confirmation, Delete)
    - Source badge: "In-App" indigo, "Member Portal" emerald, "External" amber — implement `getSourceBadgeProps(source)` pure function
    - Empty state: `Calendar` icon
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.8_

  - [ ]* 6.14 Write property test for bookings table renders required columns (Property 15)
    - **Property 15: Bookings table renders all required columns**
    - **Validates: Requirements 6.2**

  - [ ]* 6.15 Write property test for booking number format invariant (Property 16)
    - **Property 16: Booking number format invariant**
    - **Validates: Requirements 6.3**

  - [ ]* 6.16 Write property test for source badge mapping (Property 17)
    - **Property 17: Source badge maps correctly**
    - **Validates: Requirements 6.4**

  - [x] 6.17 Implement BookingDetailDrawer
    - Create `BookingDetailDrawer` component (Sheet-based)
    - Read-only view: full booking info, status timeline, action buttons (Approve, Reject, Cancel, Send Confirmation)
    - Status changes call `updateBookingStatus` mutation (`TABLES.FACILITY_BOOKINGS` update + `queryClient.invalidateQueries`)
    - Open when user clicks a booking row or "View" from kebab menu
    - _Requirements: 6.5_

  - [x] 6.18 Implement NewBookingDrawer with contact type selector and confirmation dispatch
    - Create `NewBookingDrawer` using React Hook Form + Zod (`bookingSchema` from design)
    - Fields: Facility (Select from active facilities), Purpose, Date, Start Time, End Time, Expected Attendees, Setup Required toggle, Notes
    - Contact Type selector: "Member" (member search/select), "External Individual" (name, email, phone), "External Organisation" (org name, contact person, email, phone) — conditional field rendering
    - Three submit buttons: "Save Booking", "Save & Email Confirmation", "Save & SMS Confirmation"
    - "Save & Email Confirmation": save booking then `supabase.functions.invoke("send-booking-confirmation", { body: { channel: 'email', to: email, ... } })`; on edge function error show `toast.error("Booking saved, but failed to send confirmation")`
    - "Save & SMS Confirmation": same pattern with `channel: 'sms'`
    - Show inline `FormMessage` errors; keep drawer open on insert failure
    - Pre-populate when opened from "Book Now" (facility pre-selected) or "Edit" (full pre-population)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [ ]* 6.19 Write property test for booking form validation blocks missing fields (Property 14)
    - **Property 14: Booking form validation blocks missing required fields**
    - **Validates: Requirements 5.6, 7.9**

  - [ ]* 6.20 Write property test for email confirmation triggers edge function (Property 18)
    - **Property 18: Email confirmation triggers edge function with correct channel**
    - **Validates: Requirements 7.7**

  - [ ]* 6.21 Write property test for SMS confirmation triggers edge function (Property 19)
    - **Property 19: SMS confirmation triggers edge function with correct channel**
    - **Validates: Requirements 7.8**

  - [x] 6.22 Implement Responses tab with filter pills and ResponseDetailModal
    - Render filter pills: All | In-App | External | Email | SMS | WhatsApp
    - Render responses in a table with columns: Respondent, Facility, Message preview (truncated), Source badge, Received At, Status, Actions
    - When Responses tab is activated: call `markResponsesReadMutation` which updates all `status = 'new'` records to `status = 'read'` in `TABLES.FACILITY_RESPONSES` and invalidates the query
    - `ResponseDetailModal`: full message, respondent details, source badge, "Create Booking from Response" button that opens `NewBookingDrawer` pre-populated with respondent's name, email, phone, org
    - Empty state: `MessageSquare` icon
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 8.7_

  - [ ]* 6.23 Write property test for responses table renders required columns (Property 20)
    - **Property 20: Responses table renders all required columns**
    - **Validates: Requirements 8.2**

  - [ ]* 6.24 Write property test for Create Booking from Response pre-populates drawer (Property 21)
    - **Property 21: Create Booking from Response pre-populates drawer**
    - **Validates: Requirements 8.4**

  - [ ]* 6.25 Write property test for opening Responses tab marks responses as read (Property 22)
    - **Property 22: Opening Responses tab marks new responses as read**
    - **Validates: Requirements 8.6**

- [x] 7. Checkpoint — Verify admin booking page
  - Ensure all tests pass, ask the user if questions arise.
  - Confirm `/facility-booking` renders all three tabs, stats row, and facility cards without crashing.

- [x] 8. MemberFacilityBooking.tsx member portal page (`src/pages/member/MemberFacilityBooking.tsx`)
  - [x] 8.1 Create the page with active facilities query and card grid
    - Create `src/pages/member/MemberFacilityBooking.tsx`
    - Use `useMemberPortal()` for `churchId` and `memberId`
    - `useQuery({ queryKey: ["member-facilities", churchId], staleTime: 300000 })` — fetch from `TABLES.FACILITIES` with `facility_images(image_path, sort_order)` join, filter `is_active = true`, order by `name`
    - Render facility cards (read-only variant): image or gradient placeholder, name, type, capacity, description, price, "Book Now" button
    - _Requirements: 9.1, 9.2_

  - [ ]* 8.2 Write property test for member facility cards show active only (Property 23)
    - **Property 23: Member facility cards render active facilities only**
    - **Validates: Requirements 9.2**

  - [x] 8.3 Implement MemberBookingModal with form submission
    - Create `MemberBookingModal` (Dialog-based) using React Hook Form + Zod
    - Fields: Purpose (required), Date (required), Start Time (required), End Time (required), Expected Attendees, Setup Required toggle, Notes
    - On submit: insert into `TABLES.FACILITY_BOOKINGS` with `source: 'member'`, `booked_by: member.userId`, `status: 'pending_confirmation'`, `tenant_id: churchId`
    - On success: `toast.success("Booking submitted")`, close modal, invalidate `["member-my-bookings", memberId]`
    - On error: `toast.error("Failed to submit booking")`, keep modal open
    - _Requirements: 9.3, 9.4, 9.6_

  - [ ]* 8.4 Write property test for member booking insert has correct source and booked_by (Property 24)
    - **Property 24: Member booking insert has correct source and booked_by**
    - **Validates: Requirements 9.4**

  - [x] 8.5 Implement "My Bookings" section
    - `useQuery({ queryKey: ["member-my-bookings", memberId], staleTime: 300000 })` — fetch from `TABLES.FACILITY_BOOKINGS` filtered by `tenant_id` and `booked_by = memberId`, ordered by `booking_date` descending
    - Render each booking as a list item with facility name, date/time, purpose, and `StatusBadge`
    - Empty state when no bookings exist
    - _Requirements: 9.5_

  - [ ]* 8.6 Write property test for My Bookings shows member's own bookings (Property 25)
    - **Property 25: My Bookings section shows member's own bookings**
    - **Validates: Requirements 9.5**

- [x] 9. PublicBookingPage.tsx public page (`src/pages/public/PublicBookingPage.tsx`)
  - [x] 9.1 Create the page with tenant branding and facility list
    - Create `src/pages/public/PublicBookingPage.tsx` — no auth guard, no `useChurch()`
    - Read `tenantId` and optional `facilityId` from `useParams()`
    - `useQuery({ queryKey: ["public-tenant", tenantId], staleTime: 300000 })` — fetch `name, logo, contact_email` from `TABLES.TENANTS` where `id = tenantId`; if no record found, render "Church not found" message with link to homepage
    - `useQuery({ queryKey: ["public-facilities", tenantId], staleTime: 300000 })` — fetch from `TABLES.FACILITIES` with `facility_images` join, filter `is_active = true`
    - If `facilityId` param present and no matching facility found, redirect to `/book/:tenantId`
    - Display church logo and name in page header
    - Display facility cards: name, type, capacity, description, price, images
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.8_

  - [ ]* 9.2 Write property test for public page renders correct tenant branding (Property 26)
    - **Property 26: Public booking page renders correct tenant branding**
    - **Validates: Requirements 10.3**

  - [ ]* 9.3 Write property test for public page renders facility details (Property 27)
    - **Property 27: Public booking page renders facility details**
    - **Validates: Requirements 10.4**

  - [x] 9.4 Implement public booking form with inline confirmation
    - Render booking form using React Hook Form + Zod with fields: Name (required), Email, Phone, Organisation, Purpose (required), Date (required), Start Time (required), End Time (required), Expected Attendees, Notes
    - On submit: insert into `TABLES.FACILITY_BOOKINGS` with `source: 'external'`, `status: 'pending_confirmation'`, `external_name`, `external_email`, `external_phone`, `external_org` from form values; select `booking_number` from the inserted record
    - On success: render inline confirmation message (not a toast) containing the `booking_number`
    - On error: render inline error message (not a toast)
    - _Requirements: 10.5, 10.6, 10.7_

  - [ ]* 9.5 Write property test for external booking insert has correct source and status (Property 28)
    - **Property 28: External booking insert has correct source and status**
    - **Validates: Requirements 10.6**

  - [ ]* 9.6 Write property test for public booking confirmation shows booking reference (Property 29)
    - **Property 29: Public booking confirmation shows booking reference**
    - **Validates: Requirements 10.7**

- [x] 10. MemberHome.tsx update and App.tsx routing additions
  - [x] 10.1 Update `facility_booking` module path in MemberHome
    - In `src/pages/member/MemberHome.tsx`, find the `ALL_MODULES` array entry with `key: "facility_booking"` and change `path: "#"` to `path: "/member/facility-booking"`
    - _Requirements: 9.7_

  - [x] 10.2 Add lazy imports and routes in App.tsx
    - Add lazy import: `const MemberFacilityBookingPage = lazy(() => import("./pages/member/MemberFacilityBooking"))`
    - Add lazy import: `const PublicBookingPage = lazy(() => import("./pages/public/PublicBookingPage"))`
    - Inside the member portal routes block, add: `<Route path="facility-booking" element={<Suspense fallback={<Fallback />}><MemberFacilityBookingPage /></Suspense>} />`
    - Outside the `AuthGuard` block (alongside other public routes), add: `<Route path="/book/:tenantId" element={<Suspense fallback={<Fallback />}><PublicBookingPage /></Suspense>} />` and `<Route path="/book/:tenantId/:facilityId" element={<Suspense fallback={<Fallback />}><PublicBookingPage /></Suspense>} />`
    - _Requirements: 10.1, 10.2, 9.1_

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Smoke-test all four routes: `/settings/facility-types`, `/facility-booking`, `/member/facility-booking`, `/book/:tenantId`.
  - Verify all `TABLES` constants (`FACILITY_TYPES`, `FACILITY_IMAGES`, `FACILITY_RESPONSES`) are present in `src/lib/schema.ts`.
  - Verify no component hardcodes a table name string — all queries use `TABLES.*` constants.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All Supabase queries must use `TABLES` and `COLS` constants from `src/lib/schema.ts` — never hardcode strings
- All `useQuery` hooks must include `staleTime: 300000`
- All forms use React Hook Form + Zod with inline `FormMessage` errors
- The public booking page (`/book/:tenantId`) has no auth guard and reads `tenantId` from URL params only
- Property tests use fast-check with a minimum of 100 iterations; tag format: `// Feature: facility-booking-revamp, Property N: <text>`
- The `send-booking-confirmation` Edge Function is pre-existing — invoke it, do not rebuild it
