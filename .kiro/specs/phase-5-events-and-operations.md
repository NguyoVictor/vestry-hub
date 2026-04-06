> ⚠️ **SCHEMA CORRECTION NOTICE** — The table/column names written in this spec are the ORIGINAL spec names and DO NOT match the actual database. Always use `src/lib/schema.ts` TABLES/COLS constants. See `.kiro/specs/schema-correction-notice.md` for the full override list. Quick reference:
> - spec `churches` = actual **tenants** | spec `donations` = actual **giving_records** | spec `church_expenses` = actual **expenses**
> - spec `budget_lines` = actual **budget_categories** | spec `church_seo_settings` = actual **tenant_seo_settings**
> - spec `church_members` = actual **role_permissions** | spec `attendance` = actual **attendance_records**
> - spec `church_id` col = actual **tenant_id** | spec `logo_url` = actual **logo** | spec `donation_date` = actual **given_at**
> - spec `payment_reference` = actual **pesapal_transaction_id** | spec `rsvp_deadline` = actual **registration_deadline**
> - spec `start_datetime` = actual **event_date** | spec `events.status=published` = actual **events.is_published=true**
> - spec `events.capacity` = actual **capacity_limit** | spec `onboarding_complete` = actual **onboarding_completed**

Here is your **Phase 5 prompt** — Events & Operations:

---

## 🏗️ Lovable Prompt — Phase 5: Events & Operations

---

**CONTEXT — What already exists, do not rebuild:**

This is **Vestry**, a multi-tenant Church SaaS platform. The following phases are already complete:
- Phase 0: Supabase Auth, onboarding, church access code + QR code
- Phase 1: AppLayout (collapsible sidebar, top navbar, dark mode), AuthGuard, Dashboard Overview, all routes scaffolded
- Phase 2: Full Settings (Church Profile, Services & Modules, Roles & Permissions, Notifications, Billing, Security, Integrations, SEO & Public Page), public church page at `/church/:slug`
- Phase 3: Full People module (Members, Groups, House Fellowships, Families, Visitors, Follow-Up Tasks, New Converts) with all shared components (`<DataTable>`, `<MemberAvatar>`, `<StatusBadge>`, `<FilterSidebar>`)
- Phase 4: Full Finance module (Give Online, Giving Records, Pledge Campaigns, Church Expenses, Budget Management, Payroll, Fund Accounting, Accounts Payable, General Ledger, Payouts) with shared finance components (`<CurrencyDisplay>`, `<FinanceStatCard>`, `<TransactionBadge>`, `<PaymentMethodIcon>`)

**Do not touch any of the above. This phase replaces the placeholder pages for the Events & Operations section only:**
`/services`, `/events`, `/volunteering`, `/member-requests`, `/board-meetings`, `/facility-booking`

All other placeholder pages remain untouched.

---

**TECH STACK (same throughout all phases):**
- React + TypeScript + Vite
- Supabase (PostgreSQL, RLS, Edge Functions, Storage)
- Tailwind CSS + shadcn/ui
- React Router v6
- TanStack Query v5
- React Hook Form + Zod
- Lucide React
- `react-helmet-async`
- Sonner (toasts)
- `date-fns`
- Recharts (all charts)
- `papaparse` (CSV export)
- `@react-pdf/renderer` (PDF generation)
- `react-big-calendar` (calendar views — install if not already present)
- `@dnd-kit/core` + `@dnd-kit/sortable` (drag and drop — already installed from Phase 3)

---

### PART 1 — SHARED EVENTS & OPERATIONS COMPONENTS

Create these reusable components before building individual pages:

**`<EventCard>` component:**
- Props: `event: Event`, `onClick: () => void`, `variant?: 'compact' | 'full'`
- Compact variant: horizontal card — colored left border (based on event type), event name in `font-semibold`, date/time + location in `text-sm text-slate-500`, attendee count badge, status badge
- Full variant: vertical card with optional banner image (or indigo gradient if none), event name, date badge (calendar icon style: month label above, day number large), location, description excerpt, RSVP count, three-dot menu

**`<CalendarView>` component (wrapper around `react-big-calendar`):**
- Props: `events: CalendarEvent[]`, `onSelectEvent`, `onSelectSlot`, `defaultView?`
- Styled to match Vestry's design system (override `react-big-calendar` CSS variables with Tailwind colors)
- Views: Month / Week / Day / Agenda
- View switcher tabs above the calendar
- Today button + prev/next navigation arrows
- Event pills in the calendar use event type color coding
- Month view: clicking a day opens the "Create Event" sheet pre-filled with that date
- Event pill click: opens event detail sheet

**`<AttendanceChecklist>` component:**
- Props: `members: Member[]`, `attendance_records: AttendanceRecord[]`, `onToggle: (memberId, present) => void`
- Scrollable list of member rows: avatar + name + present/absent toggle (large checkbox)
- Search input to filter the list by name
- Stats bar at top: "X / Y present (Z%)"
- "Mark All Present" button + "Clear All" button
- Saves state locally, parent handles the batch submit

**`<TimeSlotPicker>` component:**
- Props: `value: {date, startTime, endTime}`, `onChange`
- Date picker + start time select + end time select
- Duration auto-calculated and displayed: "2 hours 30 minutes"
- Conflict detection prop: `existingBookings: Booking[]` — if the selected slot overlaps an existing booking, shows a red warning banner

---

### PART 2 — SERVICES PAGE (`/services`)

**Page title:** `Services — Vestry`
**PageHeader:** "Services" / "Schedule and manage your weekly church services"
**Header actions:** "Schedule Service" button + view toggle (List / Calendar)

---

**TOP STATS ROW (3 cards):**
- Services This Month (count)
- Average Attendance (average across all services this month)
- Next Service (name + date + countdown, e.g. "Sunday Service · in 3 days")

---

**LIST VIEW (default):**

Two sections:

*Upcoming Services (top):*
- Horizontal scrollable card row of next 5 upcoming services
- Each card: service type color band at top, service name, date formatted as "Sun 23 Mar", time, location, expected attendance_records (number input inline), check-in QR button

*All Services Table (below):*

`<DataTable>` with columns:

| Column | Content | Sortable |
|--------|---------|----------|
| Service | Service name + type badge | ✅ |
| Date & Time | Formatted date + time | ✅ |
| Location | Venue name | ✅ |
| Expected | Expected attendance_records number | ❌ |
| Actual | Actual attendance_records (or "—" if not recorded) | ✅ |
| Attendance % | `(actual/expected)*100` as mini progress bar | ❌ |
| Status | Upcoming / In Progress / Completed / Cancelled | ✅ |
| Actions | View, Record Attendance, Edit, Cancel, Delete | — |

**Filter sidebar:** service type, date range, status, location

---

**CALENDAR VIEW:**

Full `<CalendarView>` component showing all services. Services appear as colored pills. Clicking a service opens its detail sheet.

---

**SCHEDULE SERVICE — Sheet form:**

Fields:
- Service Name (required, e.g. "Sunday Morning Service", "Midweek Bible Study")
- Service Type (select: Sunday Service / Midweek Service / Prayer Meeting / Youth Service / Children's Service / Special Service / Other)
- Service Color (10 color preset picker — used for calendar pill color)
- Date (date picker, required)
- Start Time + End Time (`<TimeSlotPicker>`)
- Location / Venue (text input)
- Expected Attendance (number input)
- Service Leader (searchable select from `members`)
- Worship Leader (searchable select from `members`)
- Preacher / Speaker (searchable select from `members` or free text for guest speakers)
- Order of Service (rich textarea — or a dynamic list of order items: add/remove rows each with: time + activity name. e.g. "9:00 AM — Praise & Worship", "9:30 AM — Announcements")
- Notes (textarea)
- Is Recurring toggle — if on: show recurrence options:
  - Frequency (Weekly / Bi-weekly / Monthly)
  - Day of week (auto-filled from selected date, editable)
  - End date or "No end date" toggle
  - On save: creates multiple `services` rows up to the end date or 52 instances max

---

**SERVICE DETAIL PAGE (`/services/:serviceId`):**

**Layout:** Full-width page header with service info, then two-column content.

**Page header card:**
- Service name in `text-2xl font-bold`
- Date + time + location row
- Status badge
- Key staff: Service Leader, Worship Leader, Preacher (avatar chips)
- Action buttons: "Record Attendance", "Edit Service", "Generate Check-in QR", "Cancel Service"

**Left column (2/3):**

*Order of Service card:*
- Ordered list of service items with times
- "Edit Order" button opens inline editing

*Attendance card:*
- If not yet recorded: "Attendance not yet recorded" empty state + "Record Attendance" CTA button
- If recorded: attendance_records stats (present / absent / total, attendance %) + `<AttendanceChecklist>` in read-only mode showing who was present
- "Edit Attendance" button if already recorded

*Check-in QR Code card:*
- QR code generated using `qrcode.react` pointing to a public check-in URL: `vestry.app/checkin/{serviceId}`
- "Download QR Code" button + "Print" button
- Instructions: "Display this QR code at the entrance. Members scan it to self-check-in."
- The public check-in page (`/checkin/:serviceId`) is a standalone page (no auth): shows service name + date, a phone number input, submit button. On submit: looks up member by phone number, marks them present in `attendance_records` table, shows "✅ Checked in successfully, {name}!"

**Right column (1/3):**

*Service Notes card:*
- Notes textarea (editable inline, saves on blur)

*Volunteers for this service:*
- List of volunteers assigned to this service (from `volunteers` table)
- "Assign Volunteer" button → links to volunteering module

*Recent Attendance Trend (mini chart):*
- `LineChart` (Recharts) showing attendance_records for the last 6 occurrences of this service type
- X-axis: dates, Y-axis: count

---

**RECORD ATTENDANCE — Sheet:**

- Service info at top (name, date, expected count)
- `<AttendanceChecklist>` component with full member list
- "Save Attendance" button — batch UPSERT into `attendance_records` table
- Show `toast.success("Attendance recorded — X members present")`

---

### PART 3 — EVENTS PAGE (`/events`)

**Page title:** `Events — Vestry`
**PageHeader:** "Events" / "Create and manage church events"
**Header actions:** "Create Event" button + view toggle (Cards / Calendar / List)

---

**TOP STATS ROW (3 cards):**
- Upcoming Events (count in next 30 days)
- Total RSVPs This Month
- Events This Year (count)

---

**CARDS VIEW (default):**

Responsive grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` using `<EventCard variant="full">`.

Filter bar above: search input + event type filter chips (All / Conference / Outreach / Youth / Women / Men / Children / Prayer / Social / Other) + month selector + status filter

**CALENDAR VIEW:**
Full `<CalendarView>` showing all events as colored pills. Color coded by event type.

**LIST VIEW:**
`<DataTable>` with columns: Event Name, Type, Date & Time, Location, RSVP Count, Capacity, Status, Actions

---

**CREATE / EDIT EVENT — Sheet form:**

Fields:

*Basic Info:*
- Event Name (required, max 150 chars)
- Event Type (select: Conference / Outreach / Youth / Women's / Men's / Children's / Prayer / Social / Fundraiser / Other)
- Description (rich textarea, max 1000 chars)
- Event Banner Image (image upload → Supabase Storage `event-banners/{tenant_id}/{event_id}/`)

*Date & Time:*
- `<TimeSlotPicker>` for start + end datetime
- All Day toggle (hides time pickers, shows date range)
- Timezone (select, default to church's country timezone)

*Location:*
- Location Type (select: On-site / Off-site / Online / Hybrid)
- Venue Name (text input)
- Address (textarea, shown if On-site or Hybrid)
- Online Link (URL input, shown if Online or Hybrid — e.g. YouTube / Zoom link)
- Google Maps Link (URL input, optional)

*Attendance & RSVP:*
- Capacity (number input, 0 = unlimited)
- Allow RSVP (toggle, default on) — when on: members can RSVP from the Member Portal
- RSVP Deadline (date picker, optional)
- Require RSVP Approval (toggle) — if on, RSVPs need admin approval before being confirmed

*Organization:*
- Event Organizer (searchable select from `members`)
- Tags (tag input, e.g. "annual", "fundraiser", "family")
- Linked Group (optional — associate this event with a group)
- Budget (number input — estimated event cost, links to Budget module if enabled)

*Visibility:*
- Status (select: Draft / Published / Cancelled, default Published)
- Show on Public Church Page (toggle) — if on, event appears on `/church/:slug` public page

---

**EVENT DETAIL PAGE (`/events/:eventId`):**

**Page header:**
- Full-width event banner image (or indigo gradient fallback)
- Event name overlaid in `text-3xl font-bold text-white`
- Date + time + location chips (white pill badges)
- Status badge + RSVP count badge
- Action buttons: "Edit Event", "Manage RSVPs", "Cancel Event", "Share Event"

**Share Event button:**
Opens a Dialog with:
- Event URL: `vestry.app/event/{event-slug}` (public event page) — copy button
- QR code for the event URL
- Social share buttons (WhatsApp, Facebook, Twitter/X) — uses Web Share API or window.open with pre-filled share text

**Content layout (two columns below header):**

*Left (2/3):*

*About card:* event description (full)

*RSVPs table:*
- Columns: Member (avatar + name), RSVP Date, Status (Confirmed / Pending / Cancelled), Actions (Approve if pending, Remove)
- "Add RSVP" button → search member + add manually
- Bulk approve all pending RSVPs button
- Export RSVP list as CSV

*Volunteers card:*
- Volunteers assigned to this event (query from `volunteers` table where `event_id = :id`)
- "Manage Volunteers" button → links to `/volunteering?eventId={id}`

*Right (1/3):*

*Event Info card:*
- All event metadata: type, organizer, capacity, RSVP deadline, tags

*RSVP Summary card:*
- Circular donut chart: Confirmed / Pending / Cancelled
- Count numbers below
- Capacity utilization bar: `{confirmed} / {capacity}` (hidden if capacity = 0)

*Attendance card (shown after event date has passed):*
- "Record Attendance" button (if not recorded) or attendance summary (if recorded)
- Uses `<AttendanceChecklist>` filtered to RSVPd members

---

**PUBLIC EVENT PAGE (`/event/:slug`) — standalone, no auth:**
- Event banner, name, date/time, location, description
- RSVP form (name, phone, email) — for non-members / public RSVPs
- "Already a member? Sign in to RSVP with your profile"
- Event is only publicly accessible if `show_on_public_page = true`

---

### PART 4 — VOLUNTEERING PAGE (`/volunteering`)

**Page title:** `Volunteering — Vestry`
**PageHeader:** "Volunteering" / "Coordinate and track volunteer teams"
**Header actions:** "Create Volunteer Role" button + "Assign Volunteer" button

---

**TOP STATS ROW (3 cards):**
- Active Volunteers (unique members with at least 1 volunteer assignment)
- Volunteer Hours This Month (sum of `hours_served`)
- Upcoming Volunteer Slots (count of assignments where event/service date is in the future)

---

**TWO-TAB LAYOUT:**

*Roles tab (default):*

Volunteer roles are reusable role definitions (e.g. "Usher", "Sound Technician", "Greeter", "Children's Teacher").

Card grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`:

Each role card:
- Role name in `font-semibold`
- Department badge (e.g. "Hospitality", "Technical", "Children's Ministry")
- Description in `text-sm text-slate-500`
- Volunteer count: "X volunteers in this role"
- Skills required tags (small grey chips)
- Three-dot menu: Edit, View Volunteers, Delete

**Create / Edit Role — Dialog:**
Fields: Role Name, Department, Description, Required Skills (tag input), Min Volunteers, Max Volunteers (capacity)

---

*Assignments tab:*

`<DataTable>` of all volunteer assignments with columns:

| Column | Content | Sortable |
|--------|---------|----------|
| Volunteer | Avatar + name | ✅ |
| Role | Role name badge | ✅ |
| Assigned To | Event or Service name + date | ✅ |
| Type | Event / Service | ❌ |
| Status | Confirmed / Pending / Completed / No-show | ✅ |
| Hours | `hours_served` (editable inline after completion) | ✅ |
| Actions | Edit, Mark Complete, Remove | — |

Filter sidebar: role, volunteer (member search), event/service, date range, status

**Assign Volunteer — Sheet form:**
Fields:
- Volunteer (searchable select from `members`)
- Role (select from volunteer roles)
- Assign To Type (radio: Event / Service)
- Event or Service (searchable select based on type, filtered to upcoming)
- Notes (textarea)
- Notify Volunteer (toggle) — if on: sends in-app notification to the volunteer

---

**VOLUNTEER PROFILE VIEW (`/volunteering/:memberId`):**

Full-page or Sheet view showing a single member's volunteering history:
- Total hours served (all time)
- Roles held (badges)
- Assignment history table (event/service, role, date, hours, status)
- "Assign to New Role" button

---

### PART 5 — MEMBER REQUESTS PAGE (`/member-requests`)

**Page title:** `Member Requests — Vestry`
**PageHeader:** "Member Requests" / "Receive and respond to needs from your congregation"
**Header actions:** "Create Request" button (for staff to log a request on behalf of a member)

---

**TOP STATS ROW (4 cards):**
- New Requests (unread/unassigned today)
- Open Requests (total unresolved)
- Resolved This Month
- Average Resolution Time (in days)

---

**TWO-VIEW LAYOUT — Kanban (default) / Table:**

**KANBAN VIEW:**

Four columns using `@dnd-kit`:
- **New** (slate) — unassigned requests
- **In Progress** (blue) — assigned and being handled
- **Pending Response** (amber) — waiting on the member
- **Resolved** (emerald) — completed

Each request card:
- Request type icon (Prayer 🙏 / Counselling 💬 / Visitation 🏠 / Financial Aid 💰 / Medical 🏥 / General ❓)
- Member name (avatar + name)
- Request title in `font-medium`
- Short description excerpt (2 lines max, `line-clamp-2`)
- Priority badge (Low / Medium / High / Urgent)
- Assigned to: staff avatar (or "Unassigned" in amber)
- Submitted date + time ago
- Drag between columns to update status (fires mutation on drop)

**TABLE VIEW:**

`<DataTable>` with columns: Member, Request Type, Title, Priority, Assigned To, Status, Submitted Date, Last Updated, Actions

Filter sidebar: request type, priority, status, assigned to, date range

---

**LOG REQUEST — Sheet form:**

Fields:
- Request From (searchable select from `members`)
- Request Type (select: Prayer / Counselling / Visitation / Financial Aid / Medical Support / Bereavement / General)
- Title (required, max 100 chars)
- Description (textarea, required, max 1000 chars)
- Priority (select: Low / Medium / High / Urgent, default Medium)
- Assign To (select from staff members, optional — can be assigned later)
- Due / Follow-up Date (date picker, optional)
- Is Confidential (toggle) — if on: only the assigned staff + admins can see the full details. Others see only "Confidential Request" in the table.
- Attachments (file upload, optional — e.g. medical documents)

---

**REQUEST DETAIL — Sheet (opens on card/row click):**

- Request header: type icon + title + member name + submitted date
- Priority badge + status badge + confidential badge (if applicable)
- Full description
- Staff notes section: thread of internal notes (staff only, not visible to member):
  - Each note: staff avatar + name + note text + timestamp
  - "Add Note" form inline (textarea + submit)
- Assign To section: current assignee + "Reassign" button (select from staff)
- Status update buttons: "Mark In Progress", "Mark Pending Response", "Mark Resolved"
- On "Mark Resolved": opens a Dialog asking for resolution notes + confirmation
- Resolution notes saved to `member_requests.resolution_notes`
- Activity timeline at bottom: all status changes + note additions, ordered by time

---

### PART 6 — BOARD MEETINGS PAGE (`/board-meetings`)

**Page title:** `Board Meetings — Vestry`
**PageHeader:** "Board Meetings" / "Schedule meetings, build agendas and record minutes"
**Header actions:** "Schedule Meeting" button

---

**MEETINGS LIST:**

Two sections:

*Upcoming Meetings (top):*
- List of next 3 meetings (horizontal cards): Meeting name, Date + Time, Location, Attendee count, Status badge, "Join Meeting" button (external link if online)

*All Meetings Table (below):*

`<DataTable>` with columns: Meeting Name, Type, Date & Time, Location, Attendees, Status, Minutes, Actions

**Meeting Status values:**
- `scheduled` → blue
- `in_progress` → amber
- `completed` → emerald
- `cancelled` → red

---

**SCHEDULE MEETING — Sheet form:**

Fields:
- Meeting Name (required)
- Meeting Type (select: Board Meeting / Elders Meeting / Staff Meeting / Finance Committee / General Assembly / Special Meeting / Other)
- Date + Start Time + End Time (`<TimeSlotPicker>`)
- Location Type (On-site / Online / Hybrid)
- Venue / Link (text input based on location type)
- Attendees (multi-select from `members` — select all expected attendees)
- Agenda Items (dynamic list — add/remove rows):
  - Each row: Item number (auto) + Topic + Presenter (optional member select) + Time Allotted (minutes)
  - "Add Agenda Item" button
  - Drag to reorder using `@dnd-kit/sortable`
- Pre-meeting Notes (textarea)
- Send Invites to Attendees (toggle) — triggers in-app notifications

---

**MEETING DETAIL PAGE (`/board-meetings/:meetingId`):**

**Page header:** meeting name, type badge, date/time, location, status badge

**Content (two columns):**

*Left (2/3):*

*Agenda card:*
- Numbered list of agenda items with presenter + time allotted
- "Start Meeting" button (changes status to `in_progress`)
- During meeting: each agenda item has a "Mark Discussed" checkbox

*Minutes card (appears after meeting status = in_progress or completed):*
- Rich text editor (`textarea` with formatting via a simple toolbar: bold, italic, bullet list, numbered list — use `contenteditable` div with `execCommand` for simplicity, or just a styled `textarea`)
- Auto-saves every 30 seconds (debounced mutation to `board_meetings.minutes_content`)
- "Upload Minutes Document" button (PDF/Word upload as alternative to inline editor)
- Minutes document viewer if uploaded

*Attendees & Attendance card:*
- List of expected attendees (from `meeting_attendees` table)
- Present / Absent / Excused toggle for each
- "Record Attendance" CTA if not yet taken
- Attendance summary: "X of Y present"

*Right (1/3):*

*Meeting Info card:* all metadata

*Action Items card (from minutes):*
- List of action items extracted from the meeting (added manually):
  - Each: description + assigned to (member select) + due date + status (Open / Done)
  - "Add Action Item" button
- Action items are queryable across meetings (useful for follow-up)

*Documents card:*
- Upload and list meeting-related documents (agenda PDF, minutes PDF, reports)
- Each: filename + upload date + download button

---

### PART 7 — FACILITY & EVENT BOOKING PAGE (`/facility-booking`)

**Page title:** `Facility & Event Booking — Vestry`
**PageHeader:** "Facility & Event Booking" / "Manage church space bookings and requests"
**Header actions:** "Add Facility" button + "New Booking Request" button

---

**TWO-TAB LAYOUT:**

*Facilities tab (default):*

List of church facilities that can be booked.

Card grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`:

Each facility card:
- Facility photo (uploaded image, or grey placeholder with `Building2` icon)
- Facility name in `font-semibold`
- Type badge (Main Hall / Classroom / Conference Room / Outdoor / Kitchen / Other)
- Capacity: "Seats {capacity}"
- Availability status: Available (emerald) / Booked (red) / Maintenance (amber) — based on today's bookings
- Amenities chips: small grey badges (e.g. "Projector", "Sound System", "AC", "Parking")
- "View Calendar" button + "Book Now" button + three-dot menu (Edit, Delete)

**Add / Edit Facility — Dialog:**
Fields: Facility Name, Type, Capacity, Description, Amenities (tag input), Photo Upload, Is Active (toggle)

---

*Bookings tab:*

Two views: Calendar (default) / Table

**CALENDAR VIEW:**
`<CalendarView>` showing all bookings across all facilities. Each booking is a colored block showing: facility name + event name. Color coded by facility.

**TABLE VIEW:**

`<DataTable>` with columns: Booking Ref, Facility, Event / Purpose, Booked By, Date & Time, Duration, Status, Actions

**Booking Status:**
- `pending` → amber (awaiting approval)
- `approved` → emerald
- `rejected` → red
- `cancelled` → slate
- `completed` → blue

---

**NEW BOOKING REQUEST — Sheet form:**

Fields:
- Facility (select from active facilities)
- Purpose / Event Name (text input, required)
- `<TimeSlotPicker>` with conflict detection (passes existing bookings for selected facility — shows warning if overlap detected)
- Expected Attendees (number input)
- Setup Required (toggle) — if on: show "Setup Time Needed" (minutes input) and "Setup Notes" textarea
- Equipment Needed (tag input, e.g. "Projector", "Microphone", "Tables")
- Booked By (searchable select from `members` or defaults to current user)
- Booking Notes (textarea)
- Linked Event (optional — select from `events` table to link this booking to an event)
- Status (for admins: Approved / Pending — default Pending for non-admins, auto-Approved for admins)

**Conflict Detection:**
When a facility + date + time is selected, fire a query: `SELECT * FROM facility_bookings WHERE facility_id = :id AND status = 'approved' AND date_trunc('day', start_time) = :date AND (start_time, end_time) OVERLAPS (:startTime, :endTime)`
If conflict found: show a red banner "⚠️ This facility is already booked from {conflictStart} to {conflictEnd} for {conflictName}. Please choose a different time."

**Approve / Reject Booking:**
- Admins see "Approve" (emerald) and "Reject" (red) action buttons on pending bookings
- Reject opens a Dialog for rejection reason
- Approval: UPDATE `facility_bookings.status = 'approved'`, send in-app notification to the requester
- Rejection: UPDATE status + save reason, send notification

**Booking Detail — Sheet (on row/card click):**
- Full booking info
- Facility details card
- Conflict check result
- Approval history timeline
- "Edit Booking" button (if upcoming + approved)
- "Cancel Booking" button (with confirmation)

---

### PART 8 — DATABASE MIGRATIONS FOR PHASE 5

```sql
-- SERVICES TABLE
CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'sunday_service' CHECK (type IN (
    'sunday_service','midweek_service','prayer_meeting',
    'youth_service','children_service','special_service','other'
  )),
  color TEXT DEFAULT '#4F46E5',
  service_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location TEXT,
  expected_attendance INT DEFAULT 0,
  actual_attendance INT,
  service_leader_id UUID REFERENCES members(id) ON DELETE SET NULL,
  worship_leader_id UUID REFERENCES members(id) ON DELETE SET NULL,
  preacher TEXT,
  order_of_service JSONB DEFAULT '[]',
  notes TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','in_progress','completed','cancelled')),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_frequency TEXT CHECK (recurrence_frequency IN ('weekly','bi_weekly','monthly')),
  recurrence_end_date DATE,
  parent_service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage services"
  ON services FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));
CREATE INDEX idx_services_tenant_id ON services(tenant_id);
CREATE INDEX idx_services_date ON services(service_date);

-- ATTENDANCE TABLE (for both services and events)
CREATE TABLE attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('service','event')),
  reference_id UUID NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT,
  member_phone TEXT,
  is_present BOOLEAN DEFAULT true,
  check_in_method TEXT DEFAULT 'manual' CHECK (check_in_method IN ('manual','qr_scan','self_checkin')),
  checked_in_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reference_type, reference_id, member_id)
);
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage attendance_records"
  ON attendance_records FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));
CREATE INDEX idx_attendance_reference ON attendance_records(reference_type, reference_id);

-- EVENTS TABLE
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  type TEXT DEFAULT 'other' CHECK (type IN (
    'conference','outreach','youth','womens','mens',
    'childrens','prayer','social','fundraiser','other'
  )),
  description TEXT,
  banner_image_url TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  is_all_day BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'Africa/Nairobi',
  location_type TEXT DEFAULT 'on_site' CHECK (location_type IN ('on_site','off_site','online','hybrid')),
  venue_name TEXT,
  address TEXT,
  online_link TEXT,
  google_maps_link TEXT,
  capacity INT DEFAULT 0,
  allow_rsvp BOOLEAN DEFAULT true,
  registration_deadline TIMESTAMPTZ,
  require_rsvp_approval BOOLEAN DEFAULT false,
  organizer_id UUID REFERENCES members(id) ON DELETE SET NULL,
  tags TEXT[],
  linked_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  budget DECIMAL(12,2),
  status TEXT DEFAULT 'published' CHECK (status IN ('draft','published','cancelled')),
  show_on_public_page BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage events"
  ON events FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));
CREATE POLICY "Public can view published events"
  ON events FOR SELECT
  USING (status = 'published' AND show_on_public_page = true);
CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_events_start ON events(event_date);

-- EVENT RSVPs TABLE
CREATE TABLE event_rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  name TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','pending','cancelled')),
  rsvp_source TEXT DEFAULT 'admin' CHECK (rsvp_source IN ('admin','self','public_form')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, member_id)
);
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage RSVPs"
  ON event_rsvps FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- VOLUNTEER ROLES TABLE
CREATE TABLE volunteer_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  department TEXT,
  description TEXT,
  required_skills TEXT[],
  min_volunteers INT DEFAULT 1,
  max_volunteers INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE volunteer_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage volunteer roles"
  ON volunteer_roles FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- VOLUNTEERS TABLE (assignments)
CREATE TABLE volunteers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES volunteer_roles(id) ON DELETE SET NULL,
  reference_type TEXT CHECK (reference_type IN ('event','service')),
  reference_id UUID,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','pending','completed','no_show')),
  hours_served DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage volunteers"
  ON volunteers FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- MEMBER REQUESTS TABLE
CREATE TABLE member_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'prayer','counselling','visitation','financial_aid',
    'medical_support','bereavement','general'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new','in_progress','pending_response','resolved')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_confidential BOOLEAN DEFAULT false,
  attachment_url TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE member_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage member requests"
  ON member_requests FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- MEMBER REQUEST NOTES TABLE
CREATE TABLE member_request_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES member_requests(id) ON DELETE CASCADE NOT NULL,
  note TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE member_request_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage request notes"
  ON member_request_notes FOR ALL
  USING (request_id IN (
    SELECT id FROM member_requests
    WHERE tenant_id IN (
      SELECT tenant_id FROM role_permissions
      WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
    )
  ));

-- BOARD MEETINGS TABLE
CREATE TABLE board_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'board_meeting' CHECK (type IN (
    'board_meeting','elders_meeting','staff_meeting',
    'finance_committee','general_assembly','special_meeting','other'
  )),
  meeting_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location_type TEXT DEFAULT 'on_site' CHECK (location_type IN ('on_site','online','hybrid')),
  venue TEXT,
  online_link TEXT,
  agenda_items JSONB DEFAULT '[]',
  minutes_content TEXT,
  minutes_document_url TEXT,
  pre_meeting_notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE board_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage board meetings"
  ON board_meetings FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin')
  ));

-- MEETING ATTENDEES TABLE
CREATE TABLE meeting_attendees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES board_meetings(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  attendance_status TEXT DEFAULT 'expected' CHECK (attendance_status IN ('expected','present','absent','excused')),
  UNIQUE(meeting_id, member_id)
);
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage meeting attendees"
  ON meeting_attendees FOR ALL
  USING (meeting_id IN (
    SELECT id FROM board_meetings
    WHERE tenant_id IN (
      SELECT tenant_id FROM role_permissions
      WHERE user_id = auth.uid() AND role IN ('super_admin','admin')
    )
  ));

-- MEETING ACTION ITEMS TABLE
CREATE TABLE meeting_action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES board_meetings(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  assigned_to UUID REFERENCES members(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','done')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage action items"
  ON meeting_action_items FOR ALL
  USING (meeting_id IN (
    SELECT id FROM board_meetings
    WHERE tenant_id IN (
      SELECT tenant_id FROM role_permissions
      WHERE user_id = auth.uid() AND role IN ('super_admin','admin')
    )
  ));

-- FACILITIES TABLE
CREATE TABLE facilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'other' CHECK (type IN (
    'main_hall','classroom','conference_room','outdoor','kitchen','other'
  )),
  capacity INT,
  description TEXT,
  amenities TEXT[],
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage facilities"
  ON facilities FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- FACILITY BOOKINGS TABLE
CREATE TABLE facility_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE NOT NULL,
  booking_reference TEXT UNIQUE NOT NULL,
  purpose TEXT NOT NULL,
  booked_by_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  booked_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  expected_attendees INT,
  setup_required BOOLEAN DEFAULT false,
  setup_time_minutes INT DEFAULT 0,
  setup_notes TEXT,
  equipment_needed TEXT[],
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','completed')),
  rejection_reason TEXT,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  linked_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE facility_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage bookings"
  ON facility_bookings FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));
CREATE INDEX idx_facility_bookings_facility ON facility_bookings(facility_id);
CREATE INDEX idx_facility_bookings_time ON facility_bookings(start_time, end_time);

-- AUTO-GENERATE BOOKING REFERENCE
CREATE SEQUENCE booking_ref_seq START 1000;
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  NEW.booking_reference := 'BKG-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(nextval('booking_ref_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_booking_reference
  BEFORE INSERT ON facility_bookings
  FOR EACH ROW
  WHEN (NEW.booking_reference IS NULL)
  EXECUTE FUNCTION generate_booking_reference();
```

---

**Build exactly this. Replace the 6 Events & Operations placeholder pages from Phase 1 with fully functional, Supabase-connected pages as described above. Install `react-big-calendar` if not already installed. Do not modify the AppLayout, Dashboard, Settings, People, or Finance modules from Phases 1–4.**

