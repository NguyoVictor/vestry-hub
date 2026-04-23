# Design Document — Facility Booking Revamp

## Overview

This document describes the technical design for the complete revamp of the Facility & Event Booking system in Vestry. The revamp touches six areas: a new Facility Types settings page, a premium admin booking page, a functional member portal booking page, and a fully public booking page — all backed by three new database tables and several new columns on the existing `facility_bookings` table.

The design follows all Vestry conventions: `tenant_id` scoping on every query, `TABLES`/`COLS` constants from `src/lib/schema.ts`, TanStack Query with `staleTime: 300000`, VARCHAR IDs, and RLS on every new table.

---

## Architecture

The feature is split into four surface areas, each with its own component tree:

```
Admin (authenticated)
  /settings/facility-types     → FacilityTypesPage (settings)
  /facility-booking            → FacilityBookingPage (revamped)
    ├── FacilitiesTab
    │   ├── FacilityCard
    │   ├── FacilityDetailModal
    │   └── AddEditFacilityModal
    ├── BookingsTab
    │   ├── BookingRow
    │   ├── BookingDetailDrawer
    │   └── NewBookingDrawer
    └── ResponsesTab
        ├── ResponseRow
        └── ResponseDetailModal

Member Portal (member-authenticated)
  /member/facility-booking     → MemberFacilityBookingPage
    ├── FacilityCard (read-only variant)
    ├── MemberBookingModal
    └── MyBookingsSection

Public (no auth)
  /book/:tenantId              → PublicBookingPage
  /book/:tenantId/:facilityId  → PublicBookingPage (facility pre-selected)
```

### Data Flow

All data fetching uses TanStack Query. No `useEffect + useState` for data. Mutations use `useMutation` with `onSuccess: () => queryClient.invalidateQueries(...)`. The `useChurch()` context provides `tenantId` and `userId` for all authenticated pages. The public page reads `tenantId` from the URL param and fetches without auth.

```
Component
  └── useQuery(queryKey, queryFn, { staleTime: 300000 })
        └── supabase.from(TABLES.X).select(...).eq(COLS.TENANT_ID, tenantId)

Component
  └── useMutation(mutationFn)
        onSuccess → queryClient.invalidateQueries({ queryKey: [...] })
```

---

## Components and Interfaces

### FacilityTypesPage (`src/pages/settings/FacilityTypesPage.tsx`)

Mirrors `ServiceRequestTypesPage` exactly in structure. Lazy-loaded via `React.lazy()`.

**Props:** none (reads `tenantId` from `useChurch()`)

**Queries:**
```typescript
useQuery({
  queryKey: ["facility-types", tenantId],
  queryFn: () => supabase.from(TABLES.FACILITY_TYPES).select("*")
    .eq(COLS.TENANT_ID, tenantId).order("sort_order"),
  staleTime: 300000,
})
```

**Mutations:** create, update, toggleActive (optimistic), reorder (drag-drop), seedDefaults

**Key behaviours:**
- Drag-to-reorder rows using HTML5 drag events, persisting `sort_order` on drop
- Optimistic toggle of `is_active` with revert on error
- "Add Default Types" seeds: Main Hall, Chapel, Conference Room, Outdoor, Parking, Kitchen, Classroom, Other

---

### FacilityBookingPage (`src/pages/operations/FacilityBooking.tsx`) — full replacement

**Queries (all with `staleTime: 300000`):**
```typescript
// Stats — single RPC to avoid 4+ waterfall queries
useQuery({ queryKey: ["facility-booking-stats", tenantId], queryFn: () =>
  supabase.rpc("get_facility_booking_stats", { p_tenant_id: tenantId }) })

useQuery({ queryKey: ["facilities", tenantId], ... })
useQuery({ queryKey: ["facility-types", tenantId], ... })  // for Type filter
useQuery({ queryKey: ["facility-bookings", tenantId], ... })
useQuery({ queryKey: ["facility-responses", tenantId], ... })
```

**Tab state:** managed via `useSearchParams` (`?tab=facilities|bookings|responses`)

**Unread badge:** derived from `responses.filter(r => r.status === 'new').length`

---

### FacilityCard

```typescript
interface FacilityCardProps {
  facility: Facility;
  firstImage: string | null;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onBookNow: () => void;
  onShare: () => void;
  onSendConfirmation: () => void;
}
```

Displays: gradient placeholder or first `facility_images` record, type badge (from `facility_types` label), status badge, kebab menu, name, capacity, description (truncated), price, "Book Now" button, Share icon.

Share copies `/book/:tenantId/:facilityId` to clipboard via `navigator.clipboard.writeText`.

---

### FacilityDetailModal

Shows full facility info: image gallery (scrollable, from `facility_images`), video player or URL embed, name, type, capacity, description, price, and a list of upcoming bookings for that facility.

```typescript
interface FacilityDetailModalProps {
  facility: Facility | null;
  images: FacilityImage[];
  upcomingBookings: FacilityBooking[];
  open: boolean;
  onClose: () => void;
}
```

---

### AddEditFacilityModal

Uses React Hook Form + Zod for validation.

```typescript
const facilitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  facility_type_id: z.string().optional(),
  capacity: z.number().optional(),
  description: z.string().optional(),
  quotation: z.number().optional(),
  is_active: z.boolean().default(true),
  video_url: z.string().url().optional().or(z.literal("")),
})
```

Image upload section: up to 5 images, each max 5 MB, uploaded to `facility-images` bucket. Thumbnails shown with delete button. Upload button disabled when count reaches 5 (tooltip: "Maximum 5 images per facility").

Video section: toggle between file upload (to `facility-videos` bucket, max 50 MB) and URL input.

---

### NewBookingDrawer

Uses React Hook Form + Zod. Contact type selector drives conditional field rendering:

```typescript
type ContactType = "member" | "external_individual" | "external_org"

const bookingSchema = z.object({
  facility_id: z.string().min(1, "Facility is required"),
  purpose: z.string().min(1, "Purpose is required"),
  booking_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  expected_attendees: z.number().optional(),
  setup_required: z.boolean().default(false),
  notes: z.string().optional(),
  contact_type: z.enum(["member", "external_individual", "external_org"]),
  // member
  member_id: z.string().optional(),
  // external individual
  external_name: z.string().optional(),
  external_email: z.string().email().optional().or(z.literal("")),
  external_phone: z.string().optional(),
  // external org
  external_org: z.string().optional(),
  external_contact_person: z.string().optional(),
})
```

Three submit buttons: "Save Booking", "Save & Email Confirmation", "Save & SMS Confirmation". The latter two call `supabase.functions.invoke("send-booking-confirmation", { body: { channel, ... } })` after saving.

---

### BookingDetailDrawer

Read-only view of a booking with status timeline and action buttons (Approve, Reject, Cancel, Send Confirmation). Status changes call `updateBookingStatus` mutation.

---

### ResponseDetailModal

Shows full response message, respondent details, source badge. "Create Booking from Response" button opens `NewBookingDrawer` pre-populated with respondent's name, email, phone, org.

---

### MemberFacilityBookingPage (`src/pages/member/MemberFacilityBooking.tsx`)

```typescript
// Queries
useQuery({ queryKey: ["member-facilities", churchId], queryFn: () =>
  supabase.from(TABLES.FACILITIES).select("*, facility_images(image_path, sort_order)")
    .eq(COLS.TENANT_ID, churchId).eq("is_active", true).order("name"),
  staleTime: 300000 })

useQuery({ queryKey: ["member-my-bookings", memberId], queryFn: () =>
  supabase.from(TABLES.FACILITY_BOOKINGS).select("*")
    .eq(COLS.TENANT_ID, churchId).eq("booked_by", memberId)
    .order("booking_date", { ascending: false }),
  staleTime: 300000 })
```

On submit: inserts with `source: 'member'`, `booked_by: member.userId`, `status: 'pending_confirmation'`.

---

### PublicBookingPage (`src/pages/public/PublicBookingPage.tsx`)

No auth guard. Reads `tenantId` and optional `facilityId` from URL params.

```typescript
// Queries — no tenant_id from context, use URL param
useQuery({ queryKey: ["public-tenant", tenantId], queryFn: () =>
  supabase.from(TABLES.TENANTS).select("name, logo, contact_email")
    .eq(COLS.ID, tenantId).single(), staleTime: 300000 })

useQuery({ queryKey: ["public-facilities", tenantId], queryFn: () =>
  supabase.from(TABLES.FACILITIES)
    .select("*, facility_images(image_path, sort_order)")
    .eq(COLS.TENANT_ID, tenantId).eq("is_active", true), staleTime: 300000 })
```

On submit: inserts into `facility_bookings` with `source: 'external'`, `status: 'pending_confirmation'`. On success, shows inline confirmation with `booking_number` (no toast — page-level message).

---

## Data Models

### New Table: `facility_types`

```sql
CREATE TABLE facility_types (
  id           VARCHAR PRIMARY KEY DEFAULT nanoid(),
  tenant_id    VARCHAR NOT NULL,
  label        VARCHAR NOT NULL,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_facility_types_tenant_id ON facility_types(tenant_id);
ALTER TABLE facility_types ENABLE ROW LEVEL SECURITY;
```

### New Table: `facility_images`

```sql
CREATE TABLE facility_images (
  id           VARCHAR PRIMARY KEY DEFAULT nanoid(),
  facility_id  VARCHAR NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  tenant_id    VARCHAR NOT NULL,
  image_path   VARCHAR NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_facility_images_facility_id ON facility_images(facility_id);
CREATE INDEX idx_facility_images_tenant_id ON facility_images(tenant_id);
ALTER TABLE facility_images ENABLE ROW LEVEL SECURITY;
```

### New Table: `facility_responses`

```sql
CREATE TABLE facility_responses (
  id                 VARCHAR PRIMARY KEY DEFAULT nanoid(),
  tenant_id          VARCHAR NOT NULL,
  facility_id        VARCHAR REFERENCES facilities(id) ON DELETE SET NULL,
  respondent_name    VARCHAR NOT NULL,
  respondent_email   VARCHAR,
  respondent_phone   VARCHAR,
  respondent_org     VARCHAR,
  message            TEXT NOT NULL,
  source             VARCHAR NOT NULL CHECK (source IN ('in_app','external','email','sms','whatsapp')),
  status             VARCHAR NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','converted')),
  raw_payload        JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_facility_responses_tenant_id ON facility_responses(tenant_id);
CREATE INDEX idx_facility_responses_facility_id ON facility_responses(facility_id);
ALTER TABLE facility_responses ENABLE ROW LEVEL SECURITY;
```

### Additions to `facility_bookings`

```sql
ALTER TABLE facility_bookings
  ADD COLUMN IF NOT EXISTS booking_number  VARCHAR,
  ADD COLUMN IF NOT EXISTS source          VARCHAR NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS external_name   VARCHAR,
  ADD COLUMN IF NOT EXISTS external_email  VARCHAR,
  ADD COLUMN IF NOT EXISTS external_phone  VARCHAR,
  ADD COLUMN IF NOT EXISTS external_org    VARCHAR,
  ADD COLUMN IF NOT EXISTS cancelled_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by    VARCHAR;
```

`booking_number` is generated on insert via a DB trigger or application logic using the pattern `'BK-' || LPAD(nextval('facility_booking_number_seq')::text, 4, '0')`.

### Storage Buckets

| Bucket | Access | Max file size | Purpose |
|--------|--------|---------------|---------|
| `facility-images` | Public | 5 MB | Facility photos |
| `facility-videos` | Private (signed URLs) | 50 MB | Facility videos |

### TABLES Constants to Add (`src/lib/schema.ts`)

```typescript
FACILITY_TYPES: "facility_types",
FACILITY_IMAGES: "facility_images",
FACILITY_RESPONSES: "facility_responses",
```

The existing `FACILITY_BOOKING_RESPONSES` constant maps to the old table name. The new constant `FACILITY_RESPONSES` maps to `facility_responses` (the new table defined in this revamp).

### RLS Policies (pattern for all new tables)

```sql
-- Read: authenticated users can read their tenant's records
CREATE POLICY "tenant_read" ON facility_types
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Write: authenticated users can insert/update/delete their tenant's records
CREATE POLICY "tenant_write" ON facility_types
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
```

Same pattern applied to `facility_images` and `facility_responses`.

Public read policy for `facility_types`, `facilities`, and `facility_images` (needed for the public booking page):

```sql
CREATE POLICY "public_read" ON facilities FOR SELECT USING (true);
CREATE POLICY "public_read" ON facility_types FOR SELECT USING (true);
CREATE POLICY "public_read" ON facility_images FOR SELECT USING (true);
```

Public insert policy for `facility_bookings` (external bookers):

```sql
CREATE POLICY "public_insert" ON facility_bookings FOR INSERT WITH CHECK (source = 'external');
```

### Routing Additions (`src/App.tsx`)

```typescript
// Lazy imports
const FacilityTypesPage = lazy(() => import("./pages/settings/FacilityTypesPage"));
const MemberFacilityBookingPage = lazy(() => import("./pages/member/MemberFacilityBooking"));
const PublicBookingPage = lazy(() => import("./pages/public/PublicBookingPage"));

// Inside settings routes
<Route path="facility-types" element={<Suspense fallback={<Fallback />}><FacilityTypesPage /></Suspense>} />

// Inside member portal routes
<Route path="facility-booking" element={<Suspense fallback={<Fallback />}><MemberFacilityBookingPage /></Suspense>} />

// Public routes (outside AuthGuard)
<Route path="/book/:tenantId" element={<Suspense fallback={<Fallback />}><PublicBookingPage /></Suspense>} />
<Route path="/book/:tenantId/:facilityId" element={<Suspense fallback={<Fallback />}><PublicBookingPage /></Suspense>} />
```

### SettingsLayout Navigation Addition

In `src/components/settings/SettingsLayout.tsx`, add to the FEATURES group:

```typescript
{ label: "Facility Types", icon: Building2, path: "/settings/facility-types" },
```

### MemberHome Module Update

In `src/pages/member/MemberHome.tsx`, update the `facility_booking` module entry:

```typescript
{ key: "facility_booking", ..., path: "/member/facility-booking" },
// change from path: "#"
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Facility type table renders all required columns

*For any* list of facility type records, the rendered table should contain a row for each record displaying the Label, Description, Status toggle, and Actions (edit) column.

**Validates: Requirements 1.3**

---

### Property 2: Drag-drop reorder persists sort_order

*For any* permutation of facility types applied via drag-and-drop reorder, querying `facility_types` ordered by `sort_order` should return the records in the same order as the new arrangement.

**Validates: Requirements 1.4**

---

### Property 3: Edit modal pre-populates with record data

*For any* facility type record, opening the edit modal should pre-populate the Label, Description, and Active fields with the exact values stored in that record.

**Validates: Requirements 1.7**

---

### Property 4: Save facility type round-trip

*For any* valid facility type form submission (label non-empty), the saved record should be retrievable from `facility_types` with matching label, description, and is_active values.

**Validates: Requirements 1.8**

---

### Property 5: Status toggle round-trip

*For any* facility type, toggling `is_active` should result in the DB record reflecting the new boolean value, and toggling again should restore the original value.

**Validates: Requirements 1.9**

---

### Property 6: Image upload creates facility_images record

*For any* valid image file uploaded for a facility, a record should be inserted into `facility_images` with the correct `facility_id`, `tenant_id`, and a non-empty `image_path`.

**Validates: Requirements 2.4**

---

### Property 7: Image count limit enforced

*For any* facility that already has 5 images, the upload control should be disabled and no additional images should be insertable.

**Validates: Requirements 2.5**

---

### Property 8: Image gallery renders all uploaded images

*For any* facility with N uploaded images, the facility detail modal gallery should render exactly N image elements.

**Validates: Requirements 2.6**

---

### Property 9: Stats cards reflect actual data counts

*For any* database state, the four stat cards (Total Facilities, Active Bookings, Pending Requests, External Requests) should display counts that exactly match the corresponding query results for that tenant.

**Validates: Requirements 3.2**

---

### Property 10: Unread badge count matches unread responses

*For any* number of responses with `status = 'new'`, the badge on the Responses tab should display that exact count.

**Validates: Requirements 3.4**

---

### Property 11: Facility cards render all required fields

*For any* facility record, the rendered FacilityCard should display: an image or gradient placeholder, a type badge, a status badge, the facility name, capacity (if set), description (truncated), price (if set), a "Book Now" button, and a Share icon.

**Validates: Requirements 4.2, 4.3**

---

### Property 12: Empty state shown when no facilities match filter

*For any* combination of search text and filter values that produces zero matching facilities, the Facilities tab should render the empty state component (not a card grid).

**Validates: Requirements 4.10**

---

### Property 13: Save facility round-trip

*For any* valid facility form submission, the saved record should be retrievable from `facilities` with matching name, type, capacity, description, quotation, and is_active values.

**Validates: Requirements 5.4, 5.5**

---

### Property 14: Booking form validation blocks missing required fields

*For any* booking form state where one or more required fields (facility, purpose, date, start time, end time, contact type) are empty, attempting to submit should display inline validation errors and not insert a record.

**Validates: Requirements 5.6, 7.9**

---

### Property 15: Bookings table renders all required columns

*For any* list of booking records, the rendered table should contain a row for each record with columns: Booking #, Facility, Booked By, Purpose, Date/Time, Duration, Attendees, Status badge, Source badge, Actions.

**Validates: Requirements 6.2**

---

### Property 16: Booking number format invariant

*For any* booking record, the `booking_number` field should match the pattern `BK-` followed by at least four digits (e.g. `BK-0001`).

**Validates: Requirements 6.3**

---

### Property 17: Source badge maps correctly

*For any* booking with a `source` value of `'admin'`, `'member'`, or `'external'`, the rendered Source badge should display the correct label ("In-App", "Member Portal", "External") and the correct colour class (indigo, emerald, amber respectively).

**Validates: Requirements 6.4**

---

### Property 18: Email confirmation triggers edge function with correct channel

*For any* booking form with a valid email address, clicking "Save & Email Confirmation" should result in `supabase.functions.invoke("send-booking-confirmation")` being called with `channel: 'email'` and the correct `to` address.

**Validates: Requirements 7.7**

---

### Property 19: SMS confirmation triggers edge function with correct channel

*For any* booking form with a valid phone number, clicking "Save & SMS Confirmation" should result in `supabase.functions.invoke("send-booking-confirmation")` being called with `channel: 'sms'` and the correct `to` number.

**Validates: Requirements 7.8**

---

### Property 20: Responses table renders all required columns

*For any* list of response records, the rendered table should contain a row for each record with columns: Respondent, Facility, Message preview, Source badge, Received At, Status, Actions.

**Validates: Requirements 8.2**

---

### Property 21: Create Booking from Response pre-populates drawer

*For any* response record, clicking "Create Booking from Response" should open the New Booking drawer with the respondent's name, email, phone, and organisation pre-filled in the corresponding contact fields.

**Validates: Requirements 8.4**

---

### Property 22: Opening Responses tab marks new responses as read

*For any* set of responses with `status = 'new'`, navigating to the Responses tab should result in all of them being updated to `status = 'read'` in the database.

**Validates: Requirements 8.6**

---

### Property 23: Member facility cards render active facilities only

*For any* tenant, the member portal facility list should render only facilities where `is_active = true`, and the count should match the number of active facilities for that tenant.

**Validates: Requirements 9.2**

---

### Property 24: Member booking insert has correct source and booked_by

*For any* valid member booking form submission, the inserted `facility_bookings` record should have `source = 'member'` and `booked_by` equal to the authenticated member's user ID.

**Validates: Requirements 9.4**

---

### Property 25: My Bookings section shows member's own bookings

*For any* member with N bookings, the "My Bookings" section should display exactly N booking items belonging to that member.

**Validates: Requirements 9.5**

---

### Property 26: Public booking page renders correct tenant branding

*For any* valid `tenantId` URL parameter, the public booking page should display the church name and logo matching the record in the `tenants` table for that ID.

**Validates: Requirements 10.3**

---

### Property 27: Public booking page renders facility details

*For any* facility record, the public booking page should render the facility's name, type, capacity, description, price, and all associated images.

**Validates: Requirements 10.4**

---

### Property 28: External booking insert has correct source and status

*For any* valid public booking form submission, the inserted `facility_bookings` record should have `source = 'external'` and `status = 'pending_confirmation'`.

**Validates: Requirements 10.6**

---

### Property 29: Public booking confirmation shows booking reference

*For any* successful public booking submission, the inline confirmation message rendered on the page should contain the `booking_number` of the newly created booking.

**Validates: Requirements 10.7**

---

## Error Handling

### Upload Errors
- If image upload to `facility-images` bucket fails, show `toast.error("Failed to upload image")` and do not insert a `facility_images` record.
- If video upload to `facility-videos` bucket fails, show `toast.error("Failed to upload video")`.
- If the 5-image limit is reached client-side, disable the upload button with a tooltip. Do not rely solely on server-side enforcement.

### Booking Submission Errors
- If the Supabase insert fails, show `toast.error("Failed to save booking")` and keep the drawer open so the user can retry.
- If the Edge Function call fails after a successful insert, show `toast.error("Booking saved, but failed to send confirmation")` — do not roll back the booking.
- On the public page, show an inline error message (not a toast) if submission fails, since the user may not see toasts.

### Public Page Errors
- If `tenantId` does not match any tenant, show a "Church not found" message with a link back to the Vestry homepage.
- If `facilityId` does not match any facility for that tenant, redirect to `/book/:tenantId` (facility list).

### Validation Errors
- All forms use React Hook Form + Zod. Errors are displayed inline below each field using the standard shadcn `FormMessage` component.
- Required field errors are shown on submit attempt, not on blur, to avoid premature error display.

### Query Errors
- All `useQuery` hooks rely on the global `retry: 1` setting in `QueryClient`.
- On error, show the shadcn `EmptyState` component with a "Try again" button that calls `refetch()`.

---

## Testing Strategy

### Unit Tests

Focus on pure logic functions:
- `generateBookingNumber(seq: number): string` — verifies `BK-0001` format
- `getSourceBadgeProps(source: string): { label, colorClass }` — verifies correct label/color mapping
- `validateFacilityForm(data): ValidationResult` — verifies required field detection
- `validateBookingForm(data): ValidationResult` — verifies contact type conditional validation
- Image count limit check: `isImageLimitReached(images: FacilityImage[]): boolean`

### Property-Based Tests

Use **fast-check** (already compatible with Vitest). Each property test runs a minimum of **100 iterations**.

Tag format: `// Feature: facility-booking-revamp, Property N: <property_text>`

Properties to implement as PBT:

- **Property 4** (save facility type round-trip): generate random `{ label, description, is_active }` objects, save, query, assert equality
- **Property 5** (status toggle round-trip): generate random `is_active` boolean, toggle twice, assert original value restored
- **Property 6** (image upload creates record): generate random `facility_id` + mock file path, assert record inserted with correct fields
- **Property 7** (image count limit): generate facilities with exactly 5 images, assert upload control disabled
- **Property 14** (booking form validation): generate random form states with missing required fields, assert submission blocked
- **Property 16** (booking number format): generate random sequence numbers, assert output matches `/^BK-\d{4,}$/`
- **Property 17** (source badge mapping): generate random source values from the enum, assert correct label and color
- **Property 24** (member booking source): generate random member booking submissions, assert `source = 'member'`
- **Property 28** (external booking source): generate random external booking submissions, assert `source = 'external'`

### Integration Tests

- Verify `facility-images` bucket exists and is public
- Verify `facility-videos` bucket exists and is private
- Verify `facility_types`, `facility_images`, `facility_responses` tables exist with correct columns
- Verify RLS policies are enabled on all new tables
- Verify `send-booking-confirmation` Edge Function accepts `channel: 'email'` and `channel: 'sms'` payloads

### Smoke Tests

- `/settings/facility-types` route renders without crashing
- `/facility-booking` route renders without crashing
- `/member/facility-booking` route renders without crashing
- `/book/:tenantId` route renders without auth
- All new `TABLES` constants are present in `src/lib/schema.ts`
