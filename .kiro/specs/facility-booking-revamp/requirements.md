# Requirements Document

## Introduction

This feature is a complete revamp of the Facility & Event Booking system in Vestry, a multi-tenant Church SaaS platform. The revamp covers six areas:

1. **Settings — Facility Types**: A new settings subcategory under Settings → Features for managing facility type definitions, mirroring the existing Member Request Types page.
2. **Facility & Event Booking Page — Premium UI**: A full redesign of the admin booking page with premium Vercel/Stripe-style cards, stats row, three tabs (Facilities, Bookings, Responses), image/video media support, and a public share link.
3. **Bookings Tab**: A premium table with booking number, source badge, drawer-based detail view, and a new booking drawer with contact type selection.
4. **Responses Tab**: Filterable response inbox with source pills, response detail modal, and "Create Booking from Response" action.
5. **Member Portal — Facility Booking**: Making the currently static `/member/facility-booking` route fully functional with a booking form and "My Bookings" section.
6. **Public Booking Page**: A fully public, no-login-required booking page at `/book/:tenantId` and `/book/:tenantId/:facilityId`.

All queries use `TABLES` and `COLS` constants from `src/lib/schema.ts`. All IDs are VARCHAR. The tenant is identified by `tenant_id`. TanStack Query is used for all data fetching with `staleTime: 300000`.

---

## Glossary

- **Booking_System**: The complete Facility & Event Booking feature including admin page, member portal, and public page
- **Facility_Manager**: The admin user managing facilities and bookings within a tenant
- **Facility_Type**: A configurable category label for facilities (e.g. Main Hall, Chapel, Conference Room)
- **Facility**: A physical space owned by the church that can be booked
- **Booking**: A reservation of a Facility for a specific date, time, and purpose
- **Booker**: The individual or organisation representative who submits a booking request
- **Member_Booker**: A logged-in member submitting a booking via the member portal
- **External_Booker**: A person submitting a booking via the public booking page without logging in
- **Facility_Card**: The premium UI card representing a single facility in the Facilities tab
- **Booking_Drawer**: The slide-in panel used to create or view a booking
- **Facility_Detail_Modal**: The modal showing full facility details including image gallery and upcoming bookings
- **Response**: An inbound message from a booker received via in-app, email, SMS, or WhatsApp
- **Source_Badge**: A coloured pill indicating the origin channel of a booking or response (In-App, External, Email, SMS, WhatsApp)
- **Booking_Number**: A human-readable sequential reference number for each booking (e.g. BK-0001)
- **facility_types**: The database table storing configurable facility type definitions per tenant
- **facility_images**: The database table storing uploaded images for facilities
- **facility_bookings**: The existing database table for booking records, extended with new columns
- **facility_responses**: The database table storing inbound responses from bookers
- **facility_external_requests**: The database table for external facility requests (church requesting external venues)
- **Confirmation_Dispatcher**: The existing `send-booking-confirmation` Supabase Edge Function
- **AT_SMS**: Africa's Talking SMS API, accessed exclusively via a Supabase Edge Function
- **Resend_Email**: Resend email API, accessed exclusively via a Supabase Edge Function

---

## Requirements

### Requirement 1: Facility Types Settings Page

**User Story:** As a Facility_Manager, I want to manage a list of facility types under Settings → Features, so that I can define the categories of spaces my church offers and use them when creating facilities.

#### Acceptance Criteria

1. THE Booking_System SHALL add a "Facility Types" entry under the Settings → Features navigation group, with title "Facility Types" and subtitle "Manage the types of facilities your church offers".
2. THE Facility_Types_Page SHALL display an orange "+ Add Type" button in the page header.
3. THE Facility_Types_Page SHALL display a table with columns: Label, Description, Status toggle, and Actions (edit).
4. THE Facility_Types_Page SHALL support drag-and-drop reordering of rows, persisting the new `sort_order` to the `facility_types` table.
5. WHEN the tenant has no facility types, THE Facility_Types_Page SHALL display an empty state with an "Add Default Types" button that seeds the following defaults: Main Hall, Chapel, Conference Room, Outdoor, Parking, Kitchen, Classroom, Other.
6. WHEN the Facility_Manager clicks "+ Add Type", THE Booking_System SHALL open an Add/Edit modal with fields: Label (required), Description (optional), Active toggle (default true).
7. WHEN the Facility_Manager clicks the edit icon on a row, THE Booking_System SHALL open the same modal pre-populated with the selected type's data.
8. WHEN the Facility_Manager saves a new or edited type, THE Booking_System SHALL persist the record to the `facility_types` table and refresh the list.
9. THE Status toggle on each row SHALL immediately update `is_active` on the `facility_types` record when toggled, with optimistic UI update.
10. THE `facility_types` table SHALL have columns: `id` (VARCHAR PK), `tenant_id` (VARCHAR), `label` (VARCHAR), `description` (TEXT nullable), `is_active` (BOOLEAN DEFAULT true), `sort_order` (INTEGER), `is_default` (BOOLEAN), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).

---

### Requirement 2: Facility Images Storage and Table

**User Story:** As a Facility_Manager, I want to upload images for each facility, so that members and external visitors can see what the space looks like before booking.

#### Acceptance Criteria

1. THE Booking_System SHALL use a Supabase storage bucket named `facility-images` configured as public with a maximum file size of 5 MB per image.
2. THE Booking_System SHALL use a Supabase storage bucket named `facility-videos` configured as private with a maximum file size of 50 MB, accessed via signed URLs.
3. THE `facility_images` table SHALL have columns: `id` (VARCHAR PK), `facility_id` (VARCHAR FK → facilities), `tenant_id` (VARCHAR), `image_path` (VARCHAR), `sort_order` (INTEGER), `created_at` (TIMESTAMPTZ).
4. WHEN a Facility_Manager uploads an image for a facility, THE Booking_System SHALL upload the file to the `facility-images` bucket and insert a record into `facility_images` with the resulting path.
5. THE Booking_System SHALL allow a maximum of 5 images per facility; IF the limit is reached, THEN the upload button SHALL be disabled with a tooltip explaining the limit.
6. THE Booking_System SHALL display uploaded images in the facility detail modal as a scrollable image gallery.

---

### Requirement 3: Facility & Event Booking Page — Premium UI

**User Story:** As a Facility_Manager, I want a premium, modern booking page with stats, search, filters, and rich facility cards, so that I can manage all bookings efficiently from a single view.

#### Acceptance Criteria

1. THE Booking_System SHALL display a page header with title "Facility & Event Booking", subtitle "Manage church spaces and booking requests", and two action buttons: "+ Add Facility" (outline) and "+ New Booking" (primary indigo).
2. THE Booking_System SHALL display a stats row with four stat cards: Total Facilities, Active Bookings, Pending Requests, External Requests — each showing a live count from the database.
3. THE Booking_System SHALL display three tabs: Facilities, Bookings, and Responses.
4. WHEN the Responses tab has unread responses, THE Booking_System SHALL display an unread count badge on the Responses tab label.
5. THE Booking_System SHALL use white cards with 1px border, subtle shadow, and generous spacing consistent with the Vestry design system (indigo-600 primary).

---

### Requirement 4: Facilities Tab

**User Story:** As a Facility_Manager, I want to browse, search, and filter facilities using premium cards, so that I can quickly find and manage any space.

#### Acceptance Criteria

1. THE Facilities_Tab SHALL display a search input, a Type filter dropdown (populated from active `facility_types` for the tenant), and a Status filter dropdown (Active / Inactive / All).
2. THE Facilities_Tab SHALL display facilities as premium cards in a responsive grid (1 column mobile, 2 tablet, 3 desktop).
3. EACH Facility_Card SHALL display: an image (first uploaded image) or a gradient placeholder, a type badge, a status badge (Active/Inactive), a kebab menu (⋮), the facility name, type label, capacity, description (truncated), price (if set), a "Book Now" button, and a Share icon.
4. THE kebab menu on each Facility_Card SHALL contain options: View, Edit, Send Confirmation, Delete.
5. WHEN the Facility_Manager clicks "View" or clicks the card body, THE Booking_System SHALL open the Facility_Detail_Modal showing: image gallery, video (if uploaded or URL provided), full name, type, capacity, description, price, and a list of upcoming bookings for that facility.
6. WHEN the Facility_Manager clicks "Edit", THE Booking_System SHALL open the Add/Edit Facility modal pre-populated with the facility's current data.
7. WHEN the Facility_Manager clicks "Delete", THE Booking_System SHALL show a confirmation dialog before deleting the facility record.
8. WHEN the Facility_Manager clicks "Book Now" on a card, THE Booking_System SHALL open the New Booking drawer with the facility pre-selected.
9. WHEN the Facility_Manager clicks the Share icon, THE Booking_System SHALL copy the public booking URL (`/book/:tenantId/:facilityId`) to the clipboard and show a success toast.
10. IF no facilities match the current search/filter, THE Facilities_Tab SHALL display an empty state with a Building2 icon and a CTA to add a facility.

---

### Requirement 5: Add/Edit Facility Modal

**User Story:** As a Facility_Manager, I want a comprehensive modal for creating and editing facilities, so that I can capture all relevant details including media.

#### Acceptance Criteria

1. THE Add/Edit_Facility_Modal SHALL include fields: Name (required), Type (Select from active `facility_types`), Capacity (numeric, optional), Description (textarea, optional), Price/Quotation (numeric, optional), Active toggle (default true).
2. THE Add/Edit_Facility_Modal SHALL include a media section with an image upload area supporting up to 5 images (max 5 MB each), displaying thumbnails of uploaded images with a delete button on each.
3. THE Add/Edit_Facility_Modal SHALL include a video section with an option to upload a video file (max 50 MB, stored in `facility-videos` bucket) or enter a video URL.
4. WHEN the Facility_Manager saves a new facility, THE Booking_System SHALL insert a record into the `facilities` table and associate any uploaded images via `facility_images` records.
5. WHEN the Facility_Manager saves an edited facility, THE Booking_System SHALL update the `facilities` record and handle image additions/removals.
6. IF required fields are missing, THE Add/Edit_Facility_Modal SHALL display inline validation errors and prevent submission.

---

### Requirement 6: Bookings Tab

**User Story:** As a Facility_Manager, I want a premium bookings table with rich metadata, so that I can see all bookings at a glance and take action on them.

#### Acceptance Criteria

1. THE Bookings_Tab SHALL display a search input and filters for: Facility (dropdown), Status (dropdown), and Date range (date pickers).
2. THE Bookings_Tab SHALL display bookings in a table with columns: Booking #, Facility, Booked By, Purpose, Date/Time, Duration, Attendees, Status badge, Source badge, Actions.
3. THE Booking_Number column SHALL display a human-readable reference (e.g. BK-0001) stored in the `booking_number` column of `facility_bookings`.
4. THE Source_Badge SHALL display the booking origin: "In-App" (indigo), "External" (amber), "Member Portal" (emerald), with appropriate colours.
5. WHEN the Facility_Manager clicks a booking row or the view action, THE Booking_System SHALL open a Booking_Detail_Drawer showing: full booking info, a timeline of status changes, and action buttons (Approve, Reject, Cancel, Send Confirmation).
6. THE Actions column SHALL contain a kebab menu with options: View, Edit, Send Confirmation, Delete.
7. WHEN the Facility_Manager clicks "Edit" on a booking, THE Booking_System SHALL open the New Booking drawer pre-populated with the booking's data.
8. IF no bookings match the current filters, THE Bookings_Tab SHALL display an empty state with a Calendar icon.

---

### Requirement 7: New Booking Drawer

**User Story:** As a Facility_Manager, I want a comprehensive booking creation drawer, so that I can record all details of a new booking request including the contact type.

#### Acceptance Criteria

1. THE New_Booking_Drawer SHALL include fields: Facility (Select from active facilities), Purpose (text), Date (date picker), Start Time, End Time, Expected Attendees (numeric), Setup Required (toggle), Notes (textarea).
2. THE New_Booking_Drawer SHALL include a Contact Type selector with options: Member (select from members list), External Individual (name, email, phone fields), External Organisation (org name, contact person, email, phone fields).
3. WHEN the Facility_Manager selects "Member" as contact type, THE Booking_System SHALL display a member search/select field.
4. WHEN the Facility_Manager selects "External Individual", THE Booking_System SHALL display fields for: name, email, phone.
5. WHEN the Facility_Manager selects "External Organisation", THE Booking_System SHALL display fields for: organisation name, contact person, email, phone.
6. THE New_Booking_Drawer SHALL display three submission buttons: "Save Booking", "Save & Email Confirmation", "Save & SMS Confirmation".
7. WHEN "Save & Email Confirmation" is clicked and booker email is present, THE Booking_System SHALL save the booking and invoke the Confirmation_Dispatcher Edge Function with `channel: 'email'`.
8. WHEN "Save & SMS Confirmation" is clicked and booker phone is present, THE Booking_System SHALL save the booking and invoke the Confirmation_Dispatcher Edge Function with `channel: 'sms'`.
9. IF required fields are missing, THE New_Booking_Drawer SHALL display inline validation errors and prevent submission.
10. THE `facility_bookings` table SHALL include columns: `booking_number` (VARCHAR), `source` (VARCHAR — 'admin', 'member', 'external'), `external_name` (VARCHAR nullable), `external_email` (VARCHAR nullable), `external_phone` (VARCHAR nullable), `external_org` (VARCHAR nullable), `status` (VARCHAR), `cancelled_at` (TIMESTAMPTZ nullable), `confirmed_at` (TIMESTAMPTZ nullable), `confirmed_by` (VARCHAR nullable).

---

### Requirement 8: Responses Tab

**User Story:** As a Facility_Manager, I want a Responses tab that shows all inbound messages from bookers across all channels, so that I can manage enquiries and convert them to bookings.

#### Acceptance Criteria

1. THE Responses_Tab SHALL display filter pills: All | In-App | External | Email | SMS | WhatsApp.
2. THE Responses_Tab SHALL display responses in a table with columns: Respondent, Facility, Message preview (truncated), Source badge, Received At, Status, Actions.
3. WHEN the Facility_Manager clicks a response row or the view action, THE Booking_System SHALL open a Response_Detail_Modal showing the full message, respondent details, and a "Create Booking from Response" button.
4. WHEN the Facility_Manager clicks "Create Booking from Response", THE Booking_System SHALL open the New Booking drawer pre-populated with the respondent's details.
5. THE `facility_responses` table SHALL have columns: `id` (VARCHAR PK), `tenant_id` (VARCHAR), `facility_id` (VARCHAR nullable FK → facilities), `respondent_name` (VARCHAR), `respondent_email` (VARCHAR nullable), `respondent_phone` (VARCHAR nullable), `respondent_org` (VARCHAR nullable), `message` (TEXT), `source` (VARCHAR — 'in_app', 'external', 'email', 'sms', 'whatsapp'), `status` (VARCHAR — 'new', 'read', 'converted'), `raw_payload` (JSONB nullable), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
6. WHEN the Facility_Manager opens the Responses tab, THE Booking_System SHALL mark all visible 'new' responses as 'read' and invalidate the responses query.
7. IF no responses exist, THE Responses_Tab SHALL display an empty state with a MessageSquare icon and descriptive text.

---

### Requirement 9: Member Portal — Facility Booking

**User Story:** As a Member_Booker, I want to browse available facilities and submit a booking request from the member portal, so that I can reserve a church space for personal events.

#### Acceptance Criteria

1. THE Member_Portal SHALL provide a functional `/member/facility-booking` route (replacing the current static placeholder).
2. THE Member_Facility_Booking_Page SHALL display all active facilities for the tenant as cards showing: image or gradient placeholder, name, type, capacity, description, price, and a "Book Now" button.
3. WHEN the Member_Booker clicks "Book Now", THE Booking_System SHALL open a booking form modal with fields: Purpose, Date, Start Time, End Time, Expected Attendees, Setup Required toggle, Notes.
4. WHEN the Member_Booker submits the booking form, THE Booking_System SHALL insert a record into `facility_bookings` with `source = 'member'`, `booked_by` set to the member's user ID, and `status = 'pending_confirmation'`.
5. THE Member_Facility_Booking_Page SHALL display a "My Bookings" section below the facilities list, showing the member's own bookings with status badges.
6. WHEN a member booking is submitted successfully, THE Booking_System SHALL display a success toast and refresh the "My Bookings" list.
7. THE Member_Portal module key `facility_booking` SHALL link to `/member/facility-booking` (replacing the current `#` placeholder in MemberHome).

---

### Requirement 10: Public Booking Page

**User Story:** As an External_Booker, I want to submit a facility booking request without logging in, so that I can enquire about renting a church space from a public link.

#### Acceptance Criteria

1. THE Booking_System SHALL provide a public route `/book/:tenantId` that displays all active facilities for the specified tenant without requiring authentication.
2. THE Booking_System SHALL provide a public route `/book/:tenantId/:facilityId` that displays the details of a specific facility and a booking form.
3. THE Public_Booking_Page SHALL display the church logo and name, fetched from the `tenants` table using `tenantId`.
4. THE Public_Booking_Page SHALL display facility details: name, type, capacity, description, price, and images.
5. THE Public_Booking_Page SHALL display a booking form with fields: Name (required), Email, Phone, Organisation (optional), Purpose (required), Date (required), Start Time (required), End Time (required), Expected Attendees, Notes.
6. WHEN the External_Booker submits the public booking form, THE Booking_System SHALL insert a record into `facility_bookings` with `source = 'external'` and `status = 'pending_confirmation'`.
7. WHEN the public booking is submitted successfully, THE Booking_System SHALL display a confirmation message on the page (not a toast) with the booking reference number.
8. THE Public_Booking_Page SHALL be fully responsive and accessible without any Vestry authentication.

---

### Requirement 11: Database Schema Additions

**User Story:** As a developer, I want all new tables and columns added via Supabase migrations, so that the schema is version-controlled and consistent across environments.

#### Acceptance Criteria

1. THE Booking_System SHALL create the `facility_types` table via migration with columns defined in Requirement 1.10, including an index on `tenant_id` and RLS policies for tenant-scoped access.
2. THE Booking_System SHALL create the `facility_images` table via migration with columns defined in Requirement 2.3, including an index on `facility_id` and `tenant_id`, and RLS policies for tenant-scoped access.
3. THE Booking_System SHALL add the following columns to `facility_bookings` via migration: `booking_number` (VARCHAR), `source` (VARCHAR DEFAULT 'admin'), `external_name` (VARCHAR nullable), `external_email` (VARCHAR nullable), `external_phone` (VARCHAR nullable), `external_org` (VARCHAR nullable), `cancelled_at` (TIMESTAMPTZ nullable), `confirmed_at` (TIMESTAMPTZ nullable), `confirmed_by` (VARCHAR nullable).
4. THE Booking_System SHALL create the `facility_responses` table via migration with columns defined in Requirement 8.5, including indexes on `tenant_id` and `facility_id`, and RLS policies for tenant-scoped access.
5. THE Booking_System SHALL update the `TABLES` constant in `src/lib/schema.ts` to include: `FACILITY_TYPES: "facility_types"`, `FACILITY_IMAGES: "facility_images"`, `FACILITY_RESPONSES: "facility_responses"`.
6. ALL new tables SHALL have RLS enabled with policies allowing authenticated users to read/write only records matching their `tenant_id`.
7. THE Booking_System SHALL create Supabase storage buckets `facility-images` (public, 5 MB limit) and `facility-videos` (private, 50 MB limit) if they do not already exist.

---

### Requirement 12: Schema Constants Update

**User Story:** As a developer, I want all new table names registered in `src/lib/schema.ts`, so that no component ever hardcodes a table name string.

#### Acceptance Criteria

1. THE `TABLES` constant in `src/lib/schema.ts` SHALL include `FACILITY_TYPES: "facility_types"`.
2. THE `TABLES` constant in `src/lib/schema.ts` SHALL include `FACILITY_IMAGES: "facility_images"`.
3. THE `TABLES` constant in `src/lib/schema.ts` SHALL include `FACILITY_RESPONSES: "facility_responses"`.
4. EVERY Supabase query in the revamped feature SHALL reference table names exclusively via `TABLES` constants — never as hardcoded strings.

---

### Requirement 13: Settings Navigation Update

**User Story:** As a developer, I want the Settings sidebar to include the new Facility Types entry, so that admins can navigate to it from the standard settings layout.

#### Acceptance Criteria

1. THE `SettingsLayout` component SHALL add a "Facility Types" nav item with a `Building2` icon under the FEATURES group, linking to `/settings/facility-types`.
2. THE `App.tsx` router SHALL include a route for `/settings/facility-types` rendering the new `FacilityTypesPage` component inside the `SettingsLayout`.
3. THE `FacilityTypesPage` SHALL be lazy-loaded via `React.lazy()` consistent with all other settings pages.
