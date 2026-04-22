# Services & Events Alignment + Children QR Integration

## Status: Requirements

## Overview
Align the Services admin page with the Events admin page structure, and integrate Children's Ministry QR code generation when services are created.

## Requirements

### 1. Services Page Rebuild
The Services page (`src/pages/operations/Services.tsx`) must match the Events page structure:

**Stats Row (4 cards):**
- Total Services
- Upcoming
- Attendance Tracking (count of members who confirmed attendance)
- Completed

**View Modes (3 icons):**
- Cards view (grid)
- Calendar view
- List view (table)

**Progress Pipeline:**
Each service has a status: Draft → Published → Completed
- Show pipeline below each card (compact mode)
- Show pipeline in table row (full mode)
- Click to advance or jump to status
- 3-dot menu: Edit | Delete

**Table Columns:**
- Service | Date | Location | Attendance | Progress | Actions (3-dot)

### 2. Member Portal Events & Services Page
Already done — shows combined feed with tabs (All / Services / Events).

### 3. Children QR Code Generation

**Trigger:** When a member confirms attendance for a service (RSVP)

**Logic:**
1. Check if member has children in `children` table where `guardian_primary_id = member_id` OR `guardian_secondary_id = member_id`
2. For each child found:
   - Generate unique QR code: `VSTRY-{tenant_id}-{child_id}-{service_id}-{random_8_chars}`
   - Insert into `children_qr_codes` table:
     - `qr_data`: the generated string
     - `child_id`: the child's ID
     - `service_id`: the service ID
     - `expires_at`: end of service day (service_date + 23:59:59)
     - `sent_at`: now
   - Send in-app notification to guardian:
     - Title: "📱 {Child Name}'s Check-in QR Code Ready"
     - Body: "Your child's QR code for {Service Name} on {Date} is ready. View it in the Children section."
     - Link: `/member/children` (new page)

**Member Portal — Children Section:**
New page: `/member/children`
Shows all children linked to this member as guardian.
For each child:
- Child card with avatar, name, age, class
- If QR code exists for upcoming service:
  - Show QR code image (200x200px)
  - Service name + date
  - "Download QR Code" button
  - "Share" button
  - Expiry: "Valid until end of service"
- Attendance history (last 10 services)

### 4. Database Changes
No new tables needed — all tables already exist from Children's Ministry migration.

### 5. Edge Function
Create `generate-child-qr-codes` edge function:
- Input: `{ serviceId, memberId }`
- Finds children for that member
- Generates QR codes
- Sends notifications
- Returns: `{ qrCodes: [...], childrenCount: number }`

Called when member confirms service attendance.

## Tasks
- [ ] Rebuild Services page to match Events structure
- [ ] Add Attendance Tracking stat (count RSVPs)
- [ ] Add progress pipeline to services
- [ ] Add 3-dot menu (Edit/Delete) to services
- [ ] Create `generate-child-qr-codes` edge function
- [ ] Hook into service RSVP flow to trigger QR generation
- [ ] Build `/member/children` page showing QR codes
- [ ] Add "Children" nav item to member portal sidebar
- [ ] Test full flow: create service → member RSVPs → QR generated → notification sent → member views QR → kiosk scans QR → child checked in
