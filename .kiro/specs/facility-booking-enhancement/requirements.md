# Requirements Document

## Introduction

This feature enhances the existing Facility & Event Booking page in the Vestry church SaaS platform. The enhancements cover four areas: (1) adding Edit/Delete actions to facility cards, (2) adding a quotation field to facilities for external-party billing, (3) overhauling the booking form with booker identity capture and multi-channel confirmation dispatch, (4) adding Edit/Delete/Send actions to booking cards, and (5) introducing a new Responses tab that surfaces incoming booker replies with unread counts and navbar notifications.

All communication is handled exclusively via Africa's Talking (SMS) and Resend (email) through Supabase Edge Functions. All database queries use `TABLES` and `COLS` constants from `src/lib/schema.ts`. All IDs are VARCHAR. The tenant is identified by `tenant_id`.

---

## Glossary

- **Booking_System**: The Facility & Event Booking page and its supporting backend logic
- **Facility_Manager**: The admin user managing facilities and bookings within a tenant
- **Booker**: The individual or organisation representative who submits a booking request
- **Facility_Card**: The UI card component representing a single facility in the Facilities tab
- **Booking_Card**: The UI row/card representing a single booking in the Bookings tab
- **Booking_Form**: The sheet/dialog used to create or edit a booking request
- **Facility_Form**: The dialog used to create or edit a facility record
- **Confirmation_Dispatcher**: The Supabase Edge Function responsible for sending email or SMS confirmations
- **Response_Collector**: The mechanism (webhook/Edge Function) that receives and stores booker replies
- **Notification_Service**: The existing notifications system using the `notifications` table
- **AT_SMS**: Africa's Talking SMS API, accessed exclusively via a Supabase Edge Function
- **Resend_Email**: Resend email API, accessed exclusively via a Supabase Edge Function
- **pending_confirmation**: A booking status indicating the booking is saved but no confirmation has been sent to the booker yet

---

## Requirements

### Requirement 1: Facility Card Edit and Delete Actions

**User Story:** As a Facility_Manager, I want Edit and Delete options on each Facility_Card, so that I can update or remove facilities without navigating away from the Facilities tab.

#### Acceptance Criteria

1. THE Facility_Card SHALL display an actions menu containing "Edit" and "Delete" options for each facility record.
2. WHEN the Facility_Manager selects "Edit" on a Facility_Card, THE Booking_System SHALL open the Facility_Form pre-populated with the selected facility's current data.
3. WHEN the Facility_Manager submits the Edit form with valid data, THE Booking_System SHALL update the facility record in the `facilities` table and refresh the Facilities tab.
4. WHEN the Facility_Manager selects "Delete" on a Facility_Card, THE Booking_System SHALL display a confirmation dialog before deleting.
5. WHEN the Facility_Manager confirms deletion, THE Booking_System SHALL soft-delete or hard-delete the facility record and remove the card from the Facilities tab.
6. IF a delete operation fails, THEN THE Booking_System SHALL display an error toast and leave the facility record unchanged.

---

### Requirement 2: Facility Quotation Field

**User Story:** As a Facility_Manager, I want an optional quotation/pricing field on each facility, so that I can specify a charge for external parties who book the space.

#### Acceptance Criteria

1. THE Facility_Form SHALL include an optional numeric "Quotation" field representing the cost to charge external parties.
2. WHEN the Facility_Manager saves a facility with a quotation value, THE Booking_System SHALL persist the value in the `facilities` table under a `quotation` column.
3. WHEN the quotation value is null or zero, THE Facility_Card SHALL not display a price line.
4. WHEN the quotation value is greater than zero, THE Facility_Card SHALL display the formatted price using the tenant's currency.

---

### Requirement 3: Booking Card Edit and Delete Actions

**User Story:** As a Facility_Manager, I want Edit and Delete options on each Booking_Card, so that I can correct booking details or remove cancelled requests.

#### Acceptance Criteria

1. THE Booking_Card SHALL display an actions menu containing "Edit", "Delete", and "Send Request" options.
2. WHEN the Facility_Manager selects "Edit" on a Booking_Card, THE Booking_System SHALL open the Booking_Form pre-populated with the selected booking's current data.
3. WHEN the Facility_Manager submits the Edit form with valid data, THE Booking_System SHALL update the booking record in the `facility_bookings` table and refresh the Bookings tab.
4. WHEN the Facility_Manager selects "Delete" on a Booking_Card, THE Booking_System SHALL display a confirmation dialog before deleting.
5. WHEN the Facility_Manager confirms deletion, THE Booking_System SHALL delete the booking record and remove the card from the Bookings tab.
6. IF a delete operation fails, THEN THE Booking_System SHALL display an error toast and leave the booking record unchanged.

---

### Requirement 4: Booker Identity Capture in Booking Form

**User Story:** As a Facility_Manager, I want to capture the booker's identity (individual or organisation) when creating a booking, so that I know who to contact for confirmations and follow-ups.

#### Acceptance Criteria

1. THE Booking_Form SHALL include a "Booker Type" dropdown with options "Individual" and "Organisation".
2. WHEN the Facility_Manager selects "Individual", THE Booking_Form SHALL display fields for: name, phone, and email.
3. WHEN the Facility_Manager selects "Organisation", THE Booking_Form SHALL display fields for: organisation name, contact person name, phone, and email.
4. THE Booking_System SHALL persist booker identity fields in the `facility_bookings` table columns: `booker_type`, `booker_name`, `booker_org_name`, `booker_contact_person`, `booker_phone`, `booker_email`.
5. WHEN the Booking_Form is submitted, THE Booking_System SHALL require at minimum: booker type, name (or org name), and phone or email.
6. IF required booker identity fields are missing, THEN THE Booking_Form SHALL display inline validation errors and prevent submission.

---

### Requirement 5: Booking Submission Actions (Submit / Email Confirmation / SMS Confirmation)

**User Story:** As a Facility_Manager, I want three distinct submission actions on the Booking_Form, so that I can control whether and how a confirmation is sent to the booker at the time of creation.

#### Acceptance Criteria

1. THE Booking_Form SHALL display three action buttons: "Submit Booking", "Email Confirmation", and "SMS Confirmation".
2. WHEN the Facility_Manager clicks "Submit Booking", THE Booking_System SHALL save the booking with status `pending_confirmation` and send no external communication.
3. WHEN the Facility_Manager clicks "Email Confirmation", THE Booking_System SHALL save the booking with status `pending_confirmation` and invoke the Confirmation_Dispatcher Edge Function to send a confirmation email via Resend_Email to the booker's email address.
4. WHEN the Facility_Manager clicks "SMS Confirmation", THE Booking_System SHALL save the booking with status `pending_confirmation` and invoke the Confirmation_Dispatcher Edge Function to send a confirmation SMS via AT_SMS to the booker's phone number.
5. IF the booker email is missing and "Email Confirmation" is clicked, THEN THE Booking_Form SHALL display a validation error and prevent dispatch.
6. IF the booker phone is missing and "SMS Confirmation" is clicked, THEN THE Booking_Form SHALL display a validation error and prevent dispatch.
7. IF the Confirmation_Dispatcher Edge Function returns an error, THEN THE Booking_System SHALL display an error toast and retain the saved booking record.

---

### Requirement 6: Facility Card "Send Confirmation" Action

**User Story:** As a Facility_Manager, I want a "Send Confirmation" action on each Facility_Card, so that I can notify a booker about their facility booking via their preferred channel.

#### Acceptance Criteria

1. THE Facility_Card SHALL include a "Send Confirmation" option in its actions menu alongside "Edit" and "Delete".
2. WHEN the Facility_Manager selects "Send Confirmation", THE Booking_System SHALL display a channel selection prompt with options "Email" and "SMS".
3. WHEN the Facility_Manager selects "Email", THE Booking_System SHALL invoke the Confirmation_Dispatcher Edge Function to send a confirmation email via Resend_Email.
4. WHEN the Facility_Manager selects "SMS", THE Booking_System SHALL invoke the Confirmation_Dispatcher Edge Function to send a confirmation SMS via AT_SMS.
5. IF the dispatch succeeds, THEN THE Booking_System SHALL display a success toast confirming the channel used.
6. IF the dispatch fails, THEN THE Booking_System SHALL display an error toast with the failure reason.

---

### Requirement 7: Booking Card "Send Request" Action

**User Story:** As a Facility_Manager, I want a "Send Request" action on each Booking_Card, so that I can send or resend a booking request notification to the booker via email or SMS.

#### Acceptance Criteria

1. THE Booking_Card SHALL include a "Send Request" option in its actions menu alongside "Edit" and "Delete".
2. WHEN the Facility_Manager selects "Send Request", THE Booking_System SHALL display a channel selection prompt with options "Email" and "SMS".
3. WHEN the Facility_Manager selects "Email", THE Booking_System SHALL invoke the Confirmation_Dispatcher Edge Function to send a booking request email via Resend_Email to the booker's stored email address.
4. WHEN the Facility_Manager selects "SMS", THE Booking_System SHALL invoke the Confirmation_Dispatcher Edge Function to send a booking request SMS via AT_SMS to the booker's stored phone number.
5. IF the booker email is null and "Email" is selected, THEN THE Booking_System SHALL display an error toast and abort the dispatch.
6. IF the booker phone is null and "SMS" is selected, THEN THE Booking_System SHALL display an error toast and abort the dispatch.

---

### Requirement 8: Confirmation Dispatcher Edge Function

**User Story:** As a developer, I want a single Supabase Edge Function to handle all outbound booking communications, so that API keys are never exposed to the frontend and all sends are auditable.

#### Acceptance Criteria

1. THE Confirmation_Dispatcher SHALL be deployed as a Supabase Edge Function named `send-booking-confirmation`.
2. WHEN invoked with channel `email`, THE Confirmation_Dispatcher SHALL send the message via Resend_Email using the `RESEND_API_KEY` secret.
3. WHEN invoked with channel `sms`, THE Confirmation_Dispatcher SHALL send the message via AT_SMS using the `AT_API_KEY` and `AT_USERNAME` secrets.
4. THE Confirmation_Dispatcher SHALL accept a payload containing: `channel`, `to`, `subject` (email only), `body`, `booking_id`, and `tenant_id`.
5. WHEN a send succeeds, THE Confirmation_Dispatcher SHALL return HTTP 200 with a success payload.
6. IF a send fails, THEN THE Confirmation_Dispatcher SHALL return HTTP 500 with a structured error payload.
7. THE Confirmation_Dispatcher SHALL NOT reference any provider other than Resend_Email for email or AT_SMS for SMS.

---

### Requirement 9: Responses Tab

**User Story:** As a Facility_Manager, I want a Responses tab on the Facility & Event Booking page, so that I can view all incoming replies from bookers in one place.

#### Acceptance Criteria

1. THE Booking_System SHALL display a third tab labelled "Responses" on the Facility & Event Booking page alongside "Facilities" and "Bookings".
2. THE Responses tab SHALL display a list of incoming booker responses stored in a `facility_booking_responses` table, ordered by `created_at` descending.
3. EACH response entry SHALL display: booker name or identifier, channel (email/SMS), message content, associated booking reference, and received timestamp.
4. THE Responses tab label SHALL display an unread count badge WHEN there are unread responses with `is_read = false`.
5. WHEN the Facility_Manager opens the Responses tab, THE Booking_System SHALL mark all visible responses as read by setting `is_read = true`.
6. IF no responses exist, THEN THE Booking_System SHALL display an empty state with an icon and descriptive message.

---

### Requirement 10: Response Collector Edge Function

**User Story:** As a developer, I want a Supabase Edge Function to receive inbound SMS and email reply webhooks, so that booker responses are captured and stored automatically.

#### Acceptance Criteria

1. THE Response_Collector SHALL be deployed as a Supabase Edge Function named `receive-booking-response`.
2. WHEN an inbound SMS webhook is received from AT_SMS, THE Response_Collector SHALL parse the payload and insert a record into `facility_booking_responses` with `channel = 'sms'`.
3. WHEN an inbound email reply webhook is received from Resend_Email, THE Response_Collector SHALL parse the payload and insert a record into `facility_booking_responses` with `channel = 'email'`.
4. THE Response_Collector SHALL set `is_read = false` on all newly inserted response records.
5. AFTER inserting a response, THE Response_Collector SHALL insert a notification record into the `notifications` table with `type = 'facility_response'` for the relevant tenant's admin users.
6. IF the incoming webhook payload is malformed, THEN THE Response_Collector SHALL return HTTP 400 and not insert any records.

---

### Requirement 11: Navbar Notification for New Responses

**User Story:** As a Facility_Manager, I want the navbar bell icon to show a notification when a new booker response arrives, so that I am alerted without having to check the Responses tab manually.

#### Acceptance Criteria

1. WHEN a new `facility_response` notification is inserted into the `notifications` table, THE Notification_Service SHALL increment the unread notification count displayed on the navbar bell icon.
2. THE Notification_Service SHALL display the notification with type `facility_response` in the notifications dropdown with a descriptive label such as "New booking response received".
3. WHEN the Facility_Manager clicks the notification, THE Booking_System SHALL navigate to the Facility & Event Booking page and activate the Responses tab.
4. WHEN the Facility_Manager marks the notification as read, THE Notification_Service SHALL set `is_read = true` on the corresponding `notifications` record.

---

### Requirement 12: Database Schema Additions

**User Story:** As a developer, I want the necessary database columns and tables added via migration, so that all new booking and response data is persisted correctly.

#### Acceptance Criteria

1. THE Booking_System SHALL add the following columns to the `facilities` table via migration: `quotation` (NUMERIC, nullable).
2. THE Booking_System SHALL add the following columns to the `facility_bookings` table via migration: `booker_type` (VARCHAR), `booker_name` (VARCHAR), `booker_org_name` (VARCHAR, nullable), `booker_contact_person` (VARCHAR, nullable), `booker_phone` (VARCHAR, nullable), `booker_email` (VARCHAR, nullable).
3. THE Booking_System SHALL create a `facility_booking_responses` table with columns: `id` (VARCHAR PK), `tenant_id` (VARCHAR), `booking_id` (VARCHAR, FK to `facility_bookings`), `channel` (VARCHAR — 'email' or 'sms'), `from_address` (VARCHAR), `body` (TEXT), `is_read` (BOOLEAN DEFAULT false), `created_at` (TIMESTAMPTZ).
4. THE Booking_System SHALL add an index on `tenant_id` for the `facility_booking_responses` table.
5. ALL new tables and columns SHALL have RLS policies enabling tenant-scoped read and write access.
6. THE Booking_System SHALL update the `TABLES` constant in `src/lib/schema.ts` to include `FACILITY_BOOKING_RESPONSES: "facility_booking_responses"`.

---

### Requirement 13: Communications Provider Exclusivity

**User Story:** As a developer, I want all SMS and email communication to use only Africa's Talking and Resend respectively, so that the codebase has a single, consistent integration per channel.

#### Acceptance Criteria

1. THE Booking_System SHALL use AT_SMS as the sole SMS provider for all booking-related outbound messages.
2. THE Booking_System SHALL use Resend_Email as the sole email provider for all booking-related outbound messages.
3. THE Booking_System SHALL NOT reference any other SMS provider (e.g. Twilio, Vonage) in any Edge Function or frontend code related to facility bookings.
4. THE Booking_System SHALL NOT reference any other email provider (e.g. SendGrid, Mailgun) in any Edge Function or frontend code related to facility bookings.
5. WHERE WhatsApp Business API integration exists in the broader platform, THE Booking_System SHALL leave those references unchanged and not remove them.
