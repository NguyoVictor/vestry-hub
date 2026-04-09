# Implementation Plan: Facility Booking Enhancement

## Overview

Enhance the existing `FacilityBooking.tsx` page with edit/delete actions on facility and booking cards, a quotation field, booker identity capture, multi-channel confirmation dispatch via Edge Functions, a Responses tab, and navbar notifications for incoming replies.

## Tasks

- [x] 1. Database migration — schema additions
  - Create a new migration file under `supabase/migrations/` with a timestamp prefix
  - Add `quotation NUMERIC` (nullable) column to `facilities` table
  - Add `booker_type VARCHAR`, `booker_name VARCHAR`, `booker_org_name VARCHAR`, `booker_contact_person VARCHAR`, `booker_phone VARCHAR`, `booker_email VARCHAR` columns to `facility_bookings` table
  - Create `facility_booking_responses` table with columns: `id VARCHAR PK`, `tenant_id VARCHAR`, `booking_id VARCHAR FK → facility_bookings`, `channel VARCHAR`, `from_address VARCHAR`, `body TEXT`, `is_read BOOLEAN DEFAULT false`, `created_at TIMESTAMPTZ DEFAULT now()`
  - Add index on `tenant_id` for `facility_booking_responses`
  - Add RLS policies for tenant-scoped read/write on `facility_booking_responses`
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 2. Update schema constants
  - [x] 2.1 Add `FACILITY_BOOKING_RESPONSES: "facility_booking_responses"` to the `TABLES` constant in `src/lib/schema.ts`
  - _Requirements: 12.6_

- [x] 3. Facility card edit and delete actions
  - [x] 3.1 Add edit state to `FacilityBooking.tsx`: `editingFacility` state holding the selected facility record, and `facilityDialogMode` state (`'create' | 'edit'`)
  - [x] 3.2 Add a `DropdownMenu` actions menu to each facility `Card` with "Edit", "Delete", and "Send Confirmation" options using Lucide `MoreVertical` icon
  - [x] 3.3 Pre-populate the existing `facilityForm` state and open the dialog when "Edit" is selected; update dialog title to reflect create vs edit mode
  - [x] 3.4 Add `updateFacilityMutation` using `useMutation` that calls `supabase.from(TABLES.FACILITIES).update(...).eq('id', editingFacility.id)` and invalidates `["facilities", tenantId]` on success
  - [x] 3.5 Add `deleteFacilityMutation` using `useMutation` that calls `supabase.from(TABLES.FACILITIES).delete().eq('id', id)` and invalidates on success; show `toast.error` on failure
  - [x] 3.6 Add an `AlertDialog` confirmation before executing delete, triggered from the "Delete" menu item
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 4. Facility quotation field
  - [x] 4.1 Add `quotation` (number, optional) field to `facilityForm` state and render a numeric `Input` labelled "Quotation (optional)" in the facility dialog
  - [x] 4.2 Include `quotation` in both `createFacilityMutation` and `updateFacilityMutation` payloads
  - [x] 4.3 In the facility `Card`, conditionally render a price line using `formatCurrency` (from `src/lib/format.ts` or inline with tenant currency) when `f.quotation > 0`
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Booking card edit and delete actions
  - [x] 5.1 Add `editingBooking` state to hold the selected booking record and `bookingSheetMode` state (`'create' | 'edit'`)
  - [x] 5.2 Replace the inline Approve/Reject buttons in the bookings table row with a `DropdownMenu` containing "Edit", "Delete", and "Send Request" options
  - [x] 5.3 Pre-populate `bookingForm` state (including new booker fields) and open the sheet when "Edit" is selected
  - [x] 5.4 Add `updateBookingMutation` using `useMutation` that calls `supabase.from(TABLES.FACILITY_BOOKINGS).update(...).eq('id', editingBooking.id)` and invalidates `["facility_bookings", tenantId]`
  - [x] 5.5 Add `deleteBookingMutation` using `useMutation` that calls `supabase.from(TABLES.FACILITY_BOOKINGS).delete().eq('id', id)` and invalidates on success; show `toast.error` on failure
  - [x] 5.6 Add an `AlertDialog` confirmation before executing booking delete
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 6. Checkpoint — Ensure facility and booking CRUD works end-to-end
  - Ensure all mutations fire correctly, toasts appear, and lists refresh. Ask the user if questions arise.

- [x] 7. Booker identity capture in booking form
  - [x] 7.1 Extend `bookingForm` state with: `booker_type`, `booker_name`, `booker_org_name`, `booker_contact_person`, `booker_phone`, `booker_email`
  - [x] 7.2 Add a "Booker Type" `Select` (options: "Individual", "Organisation") to the booking `Sheet`
  - [x] 7.3 Conditionally render Individual fields (name, phone, email) or Organisation fields (org name, contact person, phone, email) based on `booker_type` selection
  - [x] 7.4 Add inline validation: require booker_type + (booker_name or booker_org_name) + (booker_phone or booker_email) before allowing submission; display error messages under the relevant fields
  - [x] 7.5 Include all booker fields in `createBookingMutation` and `updateBookingMutation` insert/update payloads
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 8. `send-booking-confirmation` Edge Function
  - [x] 8.1 Create `supabase/functions/send-booking-confirmation/index.ts`
  - [x] 8.2 Accept JSON payload: `{ channel, to, subject?, body, booking_id, tenant_id }`
  - [x] 8.3 When `channel === 'email'`, POST to Resend API (`https://api.resend.com/emails`) using `RESEND_API_KEY` secret; return HTTP 200 on success, HTTP 500 with structured error on failure
  - [x] 8.4 When `channel === 'sms'`, POST to Africa's Talking messaging API using `AT_API_KEY` and `AT_USERNAME` secrets; return HTTP 200 on success, HTTP 500 on failure
  - [x] 8.5 Return HTTP 400 for missing required fields; include CORS headers matching the pattern in existing edge functions
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 13.1, 13.2, 13.3, 13.4_

- [x] 9. Booking form submission actions
  - [x] 9.1 Replace the single "Submit Booking" button in the booking sheet with three buttons: "Submit Booking", "Email Confirmation", "SMS Confirmation"
  - [x] 9.2 "Submit Booking" saves with `status: 'pending_confirmation'` and no Edge Function call
  - [x] 9.3 "Email Confirmation" validates `booker_email` is present, saves the booking, then calls `supabase.functions.invoke('send-booking-confirmation', { body: { channel: 'email', ... } })`; show `toast.error` if the function returns an error but keep the saved record
  - [x] 9.4 "SMS Confirmation" validates `booker_phone` is present, saves the booking, then calls `supabase.functions.invoke('send-booking-confirmation', { body: { channel: 'sms', ... } })`; show `toast.error` on function error
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 10. "Send Confirmation" action on Facility Card and "Send Request" on Booking Card
  - [x] 10.1 Wire the "Send Confirmation" menu item on the facility card: open a small `Dialog` or `AlertDialog` with two buttons "Email" and "SMS"; on selection invoke `send-booking-confirmation` with the appropriate channel and the facility's latest booking data
  - [x] 10.2 Wire the "Send Request" menu item on the booking card: open the same channel-selection prompt; validate that the required contact field exists before invoking; show `toast.success` on success and `toast.error` on failure or missing contact
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 11. Checkpoint — Ensure confirmation dispatch works for all paths
  - Verify email and SMS paths in the Edge Function, all three booking form buttons, and both card-level send actions. Ask the user if questions arise.

- [x] 12. `receive-booking-response` Edge Function
  - [x] 12.1 Create `supabase/functions/receive-booking-response/index.ts`
  - [x] 12.2 Handle inbound AT SMS webhook: parse `from`, `text`, `linkId` fields; insert into `facility_booking_responses` with `channel = 'sms'`, `is_read = false`
  - [x] 12.3 Handle inbound Resend email reply webhook: parse sender and body; insert into `facility_booking_responses` with `channel = 'email'`, `is_read = false`
  - [x] 12.4 After inserting a response, insert a notification into `notifications` table with `type = 'facility_response'` for the relevant tenant's admin users
  - [x] 12.5 Return HTTP 400 for malformed payloads without inserting any records
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 13. Responses tab UI
  - [x] 13.1 Add a third `TabsTrigger` labelled "Responses" to the existing `Tabs` component in `FacilityBooking.tsx`
  - [x] 13.2 Add a `useQuery` hook keyed `["facility_booking_responses", tenantId]` that fetches from `TABLES.FACILITY_BOOKING_RESPONSES` filtered by `tenant_id`, ordered by `created_at` descending, with `staleTime: 300000`
  - [x] 13.3 Render each response as a card/row showing: booker name or `from_address`, channel badge, message body, booking reference, and formatted `created_at` timestamp
  - [x] 13.4 Show an unread count badge on the "Responses" tab label when any response has `is_read = false`
  - [x] 13.5 On tab activation (`onValueChange`), fire a mutation that sets `is_read = true` on all unread responses for the tenant and invalidates the responses query
  - [x] 13.6 Render an empty state with a `MessageSquare` icon and descriptive text when no responses exist
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 14. Navbar notification for new responses
  - [x] 14.1 Locate the existing navbar notifications component/hook and ensure it already queries the `notifications` table; confirm `type = 'facility_response'` records will appear in the dropdown
  - [x] 14.2 Add a display label "New booking response received" for notifications where `type = 'facility_response'` in the notifications dropdown render logic
  - [x] 14.3 Add a click handler for `facility_response` notifications that navigates to `/operations/facility-booking` and sets the active tab to "responses" (use URL search param or React Router state)
  - [x] 14.4 Ensure marking the notification as read sets `is_read = true` on the `notifications` record via the existing notification read mutation
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 15. Final checkpoint — Ensure all tests pass
  - Verify the full flow: create facility with quotation → create booking with booker identity → send confirmation → receive response (simulate webhook) → Responses tab shows entry with unread badge → navbar bell shows notification → click navigates to Responses tab. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All Supabase queries must use `TABLES` and `COLS` constants from `src/lib/schema.ts` — never hardcode strings
- All IDs are VARCHAR; never use `gen_random_uuid()`
- Use `staleTime: 300000` on all new `useQuery` hooks
- Edge Functions follow the pattern in `supabase/functions/send-member-welcome/index.ts`
- Run the migration via `supabase db push` after creating the migration file
