# Admin Portal — Complete Reference

> **Scope:** Admin side only (`AuthGuard` + `AppLayout`), organized to match the sidebar in [`00-product-context.md`](./00-product-context.md) §4 and `src/config/navigation.ts`.  
> **Cross-ref:** [`auth.md`](./auth.md), [`permissions.md`](./permissions.md), [`payments.md`](./payments.md), [`messaging.md`](./messaging.md), [`settings.md`](./settings.md)

---

## How to use this doc

Each **subcategory** matches one sidebar item. For every page:

| Field | Meaning |
|---|---|
| **Route / file** | `App.tsx` route → primary component |
| **Permission** | `usePermissions()` key (`PermissionButton` / `ReadOnlyBanner`) — see [`permissions.md`](./permissions.md) |
| **Structure** | Tree scan of main UI flow (when non-trivial) |
| **Data** | Supabase tables touched |
| **Backend** | Edge functions / RPCs invoked from the page |
| **Product doc** | Gaps vs `00-product-context.md` |

**Global shell (all admin pages):** `AuthGuard` → `AppLayout` (side nav from `navigationGroups`, breadcrumbs, search, notifications, light/dark toggle, profile menu). Nav is **not** filtered by onboarding picks, `enabled_modules`, or `feature_permissions`.

**Placeholder routing:** `App.tsx` maps any nav path not in explicit route lists to `PlaceholderPage` (“Coming Soon”). Notably **`/church-studio`** is in nav but **not** wired — real component exists at `src/pages/media/ChurchStudio.tsx`.

---

## Overview

### Dashboard

| | |
|---|---|
| **Route** | `/dashboard` |
| **File** | `src/pages/Dashboard.tsx` |
| **Permission** | No route-level gate; quick-action links use `member_management`, `financial_records`, `event_management`, `communication_tools` |

```
Dashboard.tsx
├─ Context: useChurch() → tenantId, currency, church name
├─ Stat cards (React Query "dashboard-stats"):
│   ├─ Total Members — COUNT members (no status/membership filter)
│   ├─ Month giving — SUM confirmed giving_records since 1st of month (badge: "This month")
│   ├─ Upcoming Events — COUNT events in next 7 days
│   └─ Active Groups — COUNT groups where is_active=true
├─ Today's Giving card (separate query "todays-total"):
│   ├─ SELECT all confirmed giving_records
│   └─ Client filter: given_at local date === today
├─ Charts: 30-day giving trend, group size distribution
├─ Upcoming events list (7-day window)
├─ Activity feed: useActivityLog() → activity_log
└─ Quick actions: /members, /give-online, /events, /communications (PermissionButton gated)
```

**Data:** `members`, `giving_records`, `events`, `groups`, `group_members`, `activity_log`

**Backend:** None (direct queries; migration `20260407111706_update_dashboard_stats_rpc.sql` defines an RPC but **Dashboard does not call it** — comment says “replace RPC temporarily”).

**Key behaviors:**
- Animated count-up stat cards; refetch on window focus (60s stale).
- Dev-only debug logging on today’s giving filter.
- Empty tenant: can insert a **sample member** from dashboard (debug/onboarding aid).

**Product doc discrepancies (§5.1–5.2):**
- Card label **“Today's Giving”** vs product **“Giving Today”**.
- **“Events”** stat is **Upcoming Events** (7-day window), not all events.
- **Total Members** may over-count pending/inactive — no `status` or `membership_status` filter.
- Giving propagation to dashboard is **React Query refetch**, not the same realtime channel as Give Online (see [`payments.md`](./payments.md)).

---

## People

**Category permission:** Most pages use `member_management`; Groups/House Fellowships also accept `groups_ministries`.

### Members

| | |
|---|---|
| **Route** | `/members`, `/members/:memberId` |
| **Files** | `Members.tsx`, `MemberProfile.tsx` |
| **Permission** | `member_management`; CSV import/export also checks `reports_analytics` |

```
Members.tsx
├─ Query: members (+ branches for filter)
├─ Filters: search, branch, status, MemberFilters (incl. "Pending Approval")
├─ Actions (PermissionButton):
│   ├─ Add member → INSERT members
│   ├─ Deactivate → UPDATE status inactive
│   ├─ Import CSV / Export CSV
│   └─ Send welcome → invoke send-member-welcome (email | sms)
└─ Row click → /members/:memberId

MemberProfile.tsx
├─ Tabs: Overview, Groups, Giving, Attendance
├─ Edit dialog → UPDATE members
├─ Pending Approval banner + "✓ Approve Member" → membership_status Member, status active
└─ invoke sync-member-profile (name sync to users)
```

**Data:** `members`, `branches`, `users`, `group_members`, `groups`

**Backend:** `send-member-welcome`, `sync-member-profile`

**Gaps:** No **bulk approve** on list — approval only on profile. Product doc does not document pending-approval workflow (implemented for QR/member-register path).

### Groups

| | |
|---|---|
| **Route** | `/groups`, `/groups/:groupId` |
| **Files** | `Groups.tsx`, `GroupDetail.tsx` |
| **Permission** | `member_management` **or** `groups_ministries` |

**Data:** `groups`, `group_types`, `group_members`, `members`, `join_requests`

**Backend:** None

**Key behaviors:** Card grid with member counts; detail page roster, leader assignment, join-request approve/decline.

### House Fellowships

| | |
|---|---|
| **Route** | `/house-fellowships`, `/house-fellowships/:fellowshipId` |
| **Files** | `HouseFellowships.tsx`, `FellowshipDetail.tsx` |
| **Permission** | `member_management` **or** `groups_ministries` |

**Data:** `house_fellowships`, `fellowship_members`, `fellowship_attendance`, `members`

**Backend:** None

**Key behaviors:** CRUD cells; detail page attendance marking per session.

### Families

| | |
|---|---|
| **Route** | `/families`, `/families/:id` |
| **Files** | `Families.tsx`, `FamilyDetailPage.tsx` |
| **Permission** | `member_management` on list; detail page has **no** `usePermissions` hook (route is under `member_management` paths only) |

**Data:** `families`, `family_members`, `members`

**Backend:** None

**Gaps:** Family detail lacks read-only banner / explicit permission checks in component.

### Children's Ministry

| | |
|---|---|
| **Route** | `/childrens-ministry/*` (nested), `/childrens-ministry/kiosk` (fullscreen, no sidebar) |
| **Layout** | `CMLayout.tsx` — sub-nav + `member_management` ReadOnlyBanner |

| Sub-route | File | Purpose | Tables |
|---|---|---|---|
| `/childrens-ministry` | `CMOverview.tsx` | Dashboard counts, today’s check-ins | `children`, `children_classes`, `children_checkins`, `services` |
| `…/checkin` | `CMCheckin.tsx` | Manual + QR check-in/out | `children`, `children_checkins`, `children_qr_codes`, `services` |
| `…/classes` | `CMClasses.tsx` | Age/class CRUD; auto-seeds defaults | `children_classes`, `children`, `members` |
| `…/children` | `CMChildren.tsx` | Registered children + register modal | `children`, `children_classes`, `children_checkins` |
| `…/reports` | `CMReports.tsx` | Check-in reports by date/class | `children_checkins`, `children`, `children_classes` |
| `…/settings` | `CMSettings.tsx` | Kiosk PIN, labels, options | `children_ministry_settings` |
| `/childrens-ministry/kiosk` | `CMKiosk.tsx` | Parent-facing kiosk (PIN exit) | same as check-in |

**Permission:** `member_management` on most tabs; **CMReports** uses `reports_analytics` for export.

**Backend:** None (QR generation may use `generate-child-qr-codes` elsewhere — not invoked from CM pages grep).

**Gaps:** Check-in/kiosk pages lack page-level permission hooks (rely on layout or auth only).

### Visitors

| | |
|---|---|
| **Route** | `/visitors` |
| **File** | `Visitors.tsx` |
| **Permission** | `member_management` |

```
Visitors.tsx
├─ CRUD visitors
├─ Create follow_up_tasks
├─ Convert flows:
│   ├─ → new_converts (INSERT) + mark visitor integrated
│   └─ → members (INSERT) + mark visitor integrated
├─ INSERT broadcasts (notification on convert)
└─ Bulk actions / pipeline statuses
```

**Data:** `visitors`, `follow_up_tasks`, `new_converts`, `members`, `tenants`, `users`, `broadcasts`

**Backend:** None

### Follow-Up Tasks

| | |
|---|---|
| **Route** | `/follow-up-tasks` |
| **File** | `FollowUpTasks.tsx` |
| **Permission** | `member_management` |

**Data:** `follow_up_tasks`, `visitors`, `new_converts`

**Backend:** None (cron `notify-task-deadlines` notifies admins — see edge functions doc).

### New Converts

| | |
|---|---|
| **Route** | `/new-converts` |
| **File** | `NewConverts.tsx` |
| **Permission** | `member_management` |

**Data:** `new_converts`, `visitors`, `follow_up_tasks`

**Key behaviors:** Discipleship stage tracking, baptism dates, graduation markers.

---

## Finance

**Category permission:** `financial_records` (exports often also gate on `reports_analytics`).

### Give Online

| | |
|---|---|
| **Route** | `/give-online` |
| **File** | `src/pages/finance/GiveOnline.tsx` |
| **Permission** | `financial_records` |

```
GiveOnline.tsx
├─ Stats: today / month / year confirmed giving totals
├─ Form: amount, category, member (optional), phone, dedication
├─ M-Pesa path:
│   ├─ invoke process-stk-push
│   ├─ Modal: church name, amount, 90s countdown
│   ├─ Confirm: postgres_changes on giving_records.id
│   └─ Fallback poll every 2s until terminal status
├─ Manual/cash path: INSERT giving_records (confirmed)
└─ Recent donations list (last 10 confirmed)
```

**Data:** `giving_records`, `members`, `tenants`

**Backend:** `process-stk-push` (Daraja STK — active rail)

**Product doc (§5.2):** Matches STK popup + multi-surface propagation concept; **countdown is fixed 90s client timer**, not Safaricom API expiry. Uses **`process-stk-push`**, not legacy `initiate-payment`.

### Giving Records

| | |
|---|---|
| **Route** | `/giving-records` |
| **File** | `GivingRecords.tsx` |
| **Permission** | `financial_records`; export `reports_analytics` |

**Data:** `giving_records`, `members`

**Backend:** None

**Key behaviors:** Ledger CRUD, filters, void/edit confirmed records (gated).

### Pledge Campaigns

| | |
|---|---|
| **Route** | `/pledge-campaigns` |
| **File** | `PledgeCampaigns.tsx` |
| **Permission** | `financial_records` |

**Data:** `pledge_campaigns`, `pledges`

**Backend:** None (cron `check-pledge-overdue` flags overdue pledges server-side).

### Church Expenses

| | |
|---|---|
| **Route** | `/church-expenses` |
| **File** | `ChurchExpenses.tsx` |
| **Permission** | `financial_records` |

**Data:** `expenses`

**Key behaviors:** Approval workflow states on expense rows.

### Budget Management

| | |
|---|---|
| **Route** | `/budget-management` |
| **File** | `BudgetManagement.tsx` |
| **Permission** | `financial_records` |

**Data:** `budgets`, `budget_categories`, `expenses`

**Key behaviors:** Budget vs actual wizard by category/period.

### Payroll

| | |
|---|---|
| **Route** | `/payroll` |
| **File** | `Payroll.tsx` |
| **Permission** | `financial_records` |

**Data:** `payroll_staff`, `members`

**Backend:** **`run-payroll` edge function exists but is NOT invoked from this page** — pay runs appear DB/UI-only.

**Gaps:** Disbursement via PayHero B2C not wired from admin UI despite deployed function.

### Fund Accounting

| | |
|---|---|
| **Route** | `/fund-accounting` |
| **File** | `FundAccounting.tsx` |
| **Permission** | `financial_records` |

**Data:** `funds`

**Key behaviors:** Restricted fund definitions; limited ledger linkage in UI.

### Accounts Payable

| | |
|---|---|
| **Route** | `/accounts-payable` |
| **File** | `AccountsPayable.tsx` |
| **Permission** | `financial_records` |

**Data:** `accounts_payable`

### General Ledger

| | |
|---|---|
| **Route** | `/general-ledger` |
| **File** | `GeneralLedger.tsx` |
| **Permission** | `financial_records` |

**Data:** `ledger_entries`, `chart_of_accounts`

**Backend:** RPC **`seed_chart_of_accounts`** (bootstrap COA for new tenants)

### Payouts

| | |
|---|---|
| **Route** | `/payouts` |
| **File** | `Payouts.tsx` |
| **Permission** | `financial_records` |

**Data:** `payouts`

---

## Events & Operations

**Category permission:** `event_management`

### Services

| | |
|---|---|
| **Route** | `/services` |
| **File** | `src/pages/operations/Services.tsx` |
| **Permission** | `event_management` |

**Data:** `services`, `service_attendance` (and links to attendance sessions used by cron `check-attendance-risk`)

**Key behaviors:** Service schedule CRUD; record attendance per service instance.

### Events

| | |
|---|---|
| **Route** | `/events` |
| **File** | `src/pages/operations/Events.tsx` |
| **Permission** | `event_management` |

**Data:** `events`, `event_rsvps`

### Volunteering

| | |
|---|---|
| **Route** | `/volunteering` |
| **File** | `Volunteering.tsx` |
| **Permission** | `event_management`; reports tab uses `reports_analytics` |

**Data:** `volunteer_roles`, `volunteers`, `volunteer_hours`, `members`

### Member Requests

| | |
|---|---|
| **Route** | `/member-requests` |
| **File** | `MemberRequests.tsx` |
| **Permission** | `event_management` |

```
MemberRequests.tsx
├─ List/filter member_requests by type & status
├─ CRUD requests (admin-created or member-submitted)
├─ Reply flow:
│   ├─ Find/create conversations + conversation_participants
│   ├─ INSERT messages
│   └─ rpc increment_unread_count
└─ Links to service_request_types config
```

**Data:** `member_requests`, `service_request_types`, `members`, `users`, `conversations`, `conversation_participants`, `messages`

**Backend:** RPC `increment_unread_count`

### Board Meetings

| | |
|---|---|
| **Route** | `/board-meetings`, `/board-meetings/:id/minutes` |
| **Files** | `BoardMeetings.tsx`, `MeetingMinutes.tsx` |
| **Permission** | `event_management`; minutes export `reports_analytics` |

**Data:** `board_meetings`, `meeting_attendees`, `meeting_minutes`, `meeting_decisions`, `meeting_action_items`, `members`, `users`

**Backend:** None (cron `notify-meeting-deadlines` for reminders)

### Facility & Event Booking

| | |
|---|---|
| **Route** | `/facility-booking` |
| **File** | `FacilityBooking.tsx` |
| **Permission** | `event_management` |

**Data:** `facilities`, `facility_images`, `facility_bookings`, `facility_types`, `facility_booking_responses`, `notifications`, `tenant_subscriptions` + storage buckets

**Backend:** `send-booking-confirmation`

**Key behaviors:** Large multi-tab admin; member booking responses; storage quota checks.

---

## Security

**Note:** Product doc says **“Security Center”**; UI route is **`/security-centre`** (British spelling).

Both pages gate on **`reports_analytics`** — there is **no dedicated security permission key** in `PERMISSION_PATHS`.

### Security Centre

| | |
|---|---|
| **Route** | `/security-centre` |
| **File** | `SecurityCentre.tsx` |
| **Permission** | `reports_analytics` |

```
SecurityCentre.tsx
├─ Login events table (login_events)
├─ Security alerts (security_alerts) — acknowledge/resolve
├─ Active sessions tab → invoke get-active-sessions
└─ Failed login / brute-force alerts (also written from SignIn.tsx client-side)
```

**Data:** `login_events`, `security_alerts`, `users`

**Backend:** `get-active-sessions`

### Incident Management

| | |
|---|---|
| **Route** | `/incident-management` |
| **File** | `IncidentManagement.tsx` |
| **Permission** | `reports_analytics` |

**Data:** `incidents`, `incident_status_logs` + `incident-attachments` storage

**Key behaviors:** Status timeline, file attachments, assignment.

---

## Engagement

**Category permission:** `communication_tools`

### Communications

| | |
|---|---|
| **Route** | `/communications`, `/communications/compose` |
| **Files** | `Communications.tsx`, `ComposeEmail.tsx` |
| **Permission** | `communication_tools` |

```
Communications.tsx
├─ Tabs: Broadcasts | Email | SMS | WhatsApp (sub-components)
├─ Broadcasts: INSERT broadcasts; optional send-communication
├─ Email stats from communications table (channel=email)
└─ Sub-tabs delegate to SmsTab, EmailTemplates, WhatsAppCloud, etc.

ComposeEmail.tsx
├─ invoke generate-ai-email (draft assist)
├─ invoke send-communication (email)
└─ invoke africastalking-sms (SMS from compose)
```

**Data:** `broadcasts`, `communications`, `members`, plus tab-specific (`sms_history`, `email_templates`, WhatsApp tables)

**Backend:** `send-communication`, `africastalking-sms`, `send-whatsapp-message`, `send-push-notification` (from AdminBroadcast sub-flow)

### Announcements

| | |
|---|---|
| **Route** | `/announcements` |
| **File** | `Announcements.tsx` |
| **Permission** | `communication_tools` |

**Data:** `announcements`, `announcement_types`, `groups` (via `AnnouncementFeedAdmin` component)

### Member Messaging

| | |
|---|---|
| **Route** | `/member-messaging` |
| **File** | `MemberMessaging.tsx` |
| **Permission** | `communication_tools` |

**Data:** `conversations`, `messages`, `conversation_participants`, `message_reactions`, `notifications`, `users`, `members` + `message-attachments` storage

**Backend:** RPC `batch_increment_unread_count`

See [`messaging.md`](./messaging.md) for staff-directory vs DM model.

### Appointments

| | |
|---|---|
| **Route** | `/appointments` |
| **File** | `src/pages/engagement/Appointments.tsx` |
| **Permission** | Path mapped to `communication_tools` in `PERMISSION_PATHS` — **page does not call `usePermissions`** |

**Data:** `appointments`, `users`, `notifications`

**Key behaviors:** Calendar/list; confirm, decline, reschedule; inserts notifications to member/counselor.

**Gaps:** No read-only banner or PermissionButton gating in page file.

### Testimonies

| | |
|---|---|
| **Route** | `/testimonies` |
| **File** | `Testimonies.tsx` |
| **Permission** | `communication_tools` |

**Data:** `testimonies`, `testimony_categories`

### Surveys

| | |
|---|---|
| **Route** | `/surveys`, `/surveys/:surveyId/responses` |
| **Files** | `Surveys.tsx`, `SurveyResponses.tsx` |
| **Permission** | `communication_tools`; export `reports_analytics` |

**Data:** `surveys`, `survey_responses`, `groups`

---

## Media & Content

**Permission note:** Most media pages have **no** `usePermissions` hook — any authenticated admin can access.

### Graphics Studio

| | |
|---|---|
| **Route** | `/graphics-studio` |
| **File** | `GraphicsStudio.tsx` |
| **Permission** | — |

**Data:** `canva_tokens`

**Backend:** `canva-oauth`, `canva-refresh-token` (+ `/auth/canva/callback` route)

### AI Tools

| | |
|---|---|
| **Route** | `/ai-tools` |
| **File** | `AITools.tsx` |
| **Permission** | — |

**Data:** Context reads from `events`, `announcements`, `sermons`, `pledge_campaigns`, `songs`

**Backend:** `transcribe-audio`, `generate-ai-content`

**Gaps:** Some generator buttons show “coming soon” toast.

### Church Studio

| | |
|---|---|
| **Route** | `/church-studio` (nav item) |
| **File** | `ChurchStudio.tsx` exists — **routed to `PlaceholderPage`** |
| **Permission** | — |

**Gaps:** ⚠️ **Mis-wired** — component implements `studio_media` / `sermon_series` uploads but route falls through to placeholder loop in `App.tsx` (`MEDIA_PATHS` excludes `/church-studio`).

### Bible Explorer

| | |
|---|---|
| **Route** | `/bible-explorer` |
| **File** | `BibleExplorer.tsx` |
| **Permission** | — |

**Data:** Mostly **localStorage** (`bible_notes`, `bible_bookmarks`, reading plans); optional `groups` insert for study groups

**Backend:** `send-bible-reminder` (manual trigger)

**Gaps:** Notes/bookmarks **not synced** to Supabase per user.

### Song Library

| | |
|---|---|
| **Route** | `/song-library` |
| **File** | `src/pages/media/SongLibrary/index.tsx` |
| **Permission** | — |

**Data:** `songs`, `set_lists`, `set_list_songs`, `song_usage_analytics`, `user_song_preferences` + `song-cover-art` storage

**Backend:** RPCs `get_usage_reports`, `update_trending_songs`, `get_song_recommendations`

**Key behaviors:** Large sub-component tree (setlists, chord transposition, analytics); export noted “coming soon” in places.

### Church Media

| | |
|---|---|
| **Route** | `/church-media` |
| **File** | `ChurchMedia.tsx` |
| **Permission** | — |

**Data:** `church_media_items`, `media_albums`, `media_categories`, `church_storage`, `storage_plans`, `tenant_subscriptions` + media storage buckets

**Backend:** RPC `get_storage_stats`

### Asset Management

| | |
|---|---|
| **Route** | `/asset-management` |
| **File** | `AssetManagement.tsx` |
| **Permission** | `reports_analytics` |

**Data:** `church_assets`, `asset_maintenance`, `asset_release_requests` + `asset-images` storage

### Sermon Preparation

| | |
|---|---|
| **Route** | `/sermon-preparation` |
| **File** | `SermonPreparation.tsx` |
| **Permission** | — |

**Data:** `sermons`, `sermon_archives` + `sermon-archives` storage

**Backend:** `generate-sermon`, `process-sermon-archive`

### Sermons & Messages

| | |
|---|---|
| **Route** | `/sermons` |
| **File** | `SermonsRevamped.tsx` (routed); legacy `Sermons.tsx` not mounted |
| **Permission** | — |

**Data:** `sermons`, `sermon_reactions`

**Key behaviors:** Admin catalog for published sermons; public routes `/sermons/:tenantId` separate.

### Livestreaming

| | |
|---|---|
| **Route** | `/livestreaming` |
| **File** | `Livestreaming.tsx` |
| **Permission** | — |

**Data:** `livestream_configs`, `livestream_schedules`, `livestream_history`, `livestream_prayer_requests`

**Gaps:** **`totalViews` / `avgAttendance` hardcoded to 0** — comment says “would come from platform APIs”. Settings at `/settings/livestreaming`.

---

## Growth

**Permission note:** No category-wide permission key; pages generally open to all admins.

### Discipleship Dashboard

| | |
|---|---|
| **Route** | `/discipleship`, `/discipleship/graduates` |
| **File** | `Discipleship.tsx` |
| **Permission** | — |

**Data:** `visitors`, `new_converts`, `follow_up_tasks`

**Gaps:** UI section **“Structured discipleship pathway coming soon”**.

### Discipleship Resources

| | |
|---|---|
| **Route** | `/discipleship-resources` |
| **File** | `DiscipleshipResources.tsx` |
| **Permission** | — |

**Data:** `discipleship_resources`, `resource_categories` + storage buckets

### Outreach & Impact

| | |
|---|---|
| **Route** | `/outreach`, `/outreach/:activityId` |
| **Files** | `Outreach.tsx`, `OutreachDetail.tsx` |
| **Permission** | — |

**Data:** `outreach_activities`, `members`, `follow_up_tasks` + `outreach-photos` storage

### Resources Store

| | |
|---|---|
| **Route** | `/resources-store` |
| **File** | `ResourcesStore.tsx` |
| **Permission** | — |

**Data:** `store_products`, `store_orders`, `store_categories`, `store_coupons`, `store_bundles`, `tenants`, `tenant_subscriptions` + store storage

**Key behaviors:** Full e-commerce admin (products, orders, coupons, bundles); public `/store/:tenantId`.

### Training

| | |
|---|---|
| **Route** | `/training`, `/training/new`, `/training/:courseId/edit`, `/training/host/:sessionId` |
| **Files** | `Training.tsx`, `TrainingCourseBuilder.tsx`, `QuizHostView.tsx` |
| **Permission** | — |

**Data:** `training_courses`, `course_enrollments`, `quiz_sessions`

**Key behaviors:** Course builder, live quiz host; public join at `/join/:joinCode`.

---

## Admin

### Reports & Analytics

| | |
|---|---|
| **Route** | `/reports` |
| **File** | `src/pages/analytics/Reports.tsx` |
| **Permission** | `reports_analytics` |

```
Reports.tsx
├─ Tabs: Overview | Members | Giving | Events | Groups | Outreach | Engagement | Custom
├─ Date range + branch filter on overview
├─ Each tab: charts + tables from tenant-scoped queries
├─ Custom report builder → saved_reports CRUD
└─ Export CSV/PDF on many sections (ReadOnlyBanner when read_only)
```

**Data:** `members`, `giving_records`, `expenses`, `events`, `groups`, `house_fellowships`, `new_converts`, `outreach_activities`, `announcements`, `surveys`, `volunteers`, `attendance_records`, `saved_reports`, `branches`

**Backend:** None

### Branches

| | |
|---|---|
| **Route** | `/branches`, `/branches/:branchId` |
| **Files** | `Branches.tsx`, `BranchDetail.tsx` |
| **Permission** | `church_settings` |

**Data:** `branches`, `members`, `giving_records`, `services`, `groups`, `activity_log`

**Note:** Settings also has `/settings/branches` (`BranchCredentials.tsx`) for branch **credentials** — different from analytics branch overview.

### Settings

| | |
|---|---|
| **Route** | `/settings/*` |
| **Layout** | `SettingsLayout.tsx` — grouped sidebar, `church_settings` ReadOnlyBanner |
| **Permission** | Layout-level `church_settings` read-only mode |

Settings index redirects to `/settings/general`. Sub-routes are **not** in main sidebar `navigationGroups` — only the top-level **Settings** item.

#### Settings structure (matches SettingsLayout sidebar)

```
SettingsLayout
├─ CHURCH SETUP
│   ├─ /settings/general — GeneralSettings (tenants, logo)
│   ├─ /settings/vision — VisionMission
│   ├─ /settings/branding — ⚠️ "coming soon" empty state
│   ├─ /settings/contact — ContactSocial
│   ├─ /settings/branches — BranchCredentials
│   ├─ /settings/modules — ServicesModules (enabled_modules array shape)
│   └─ /settings/member-app — MemberAppFeatures (member_portal toggles)
├─ PEOPLE & ACCESS
│   ├─ /settings/users — Users (invites, user_fine_permissions)
│   ├─ /settings/staff — Staff (payroll_staff)
│   ├─ /settings/registration — RegistrationSettings
│   └─ /settings/access-control — RolesPermissions (feature_permissions UI — dead feature)
├─ FINANCE
│   ├─ /settings/billing — Billing (tenant_subscriptions)
│   ├─ /settings/payments — PaymentsPage (Daraja: register-credentials, register-c2b-urls)
│   ├─ /settings/giving — GivingSettings
│   └─ /settings/tax — TaxSettings
├─ FEATURES
│   ├─ /settings/preferences — PreferencesSettings
│   ├─ /settings/attendance — AttendanceSettings
│   ├─ /settings/notifications — NotificationsSettings (invoke at-sms check_balance)
│   ├─ /settings/communications-settings — CommunicationsSettings
│   ├─ /settings/livestreaming — LivestreamingSettings
│   ├─ /settings/service-requests — ServiceRequestTypes
│   ├─ /settings/facility-types — FacilityTypesPage
│   ├─ /settings/announcement-types — AnnouncementTypes
│   ├─ /settings/testimony-categories — TestimonyCategories
│   ├─ /settings/media-categories — MediaCategories
│   ├─ /settings/appointment-types — AppointmentTypes
│   ├─ /settings/group-types — GroupTypes
│   └─ /settings/website — WebsitePromo (invoke website-consultation)
├─ SECURITY & DATA
│   ├─ /settings/security — Security
│   ├─ /settings/privacy — Privacy (invoke data-download-request)
│   ├─ /settings/legal — Legal (invoke legal-signature-notify)
│   ├─ /settings/backup — Backup (multi-table export)
│   └─ /settings/verification — ⚠️ "coming soon" empty state
└─ Quick link: /settings/qr-codes — QRCodesPage (member join QR)
```

**Key settings backend calls:**

| Page | Edge functions |
|---|---|
| `Users.tsx` | `send-invitation`, `update-user-role`, `create-staff-thread` |
| `RolesPermissions.tsx` | `generate-church-code` |
| `PaymentsPage.tsx` | `register-credentials`, `register-c2b-urls` |
| `NotificationsSettings.tsx` | `at-sms` |
| `WebsitePromo.tsx` | `website-consultation` |
| `Privacy.tsx` | `data-download-request` |
| `Legal.tsx` | `legal-signature-notify` |

**Gaps vs product doc:**
- **`feature_permissions`** saved in Access Control tab but **not enforced** at runtime ([`permissions.md`](./permissions.md)).
- **`enabled_modules`** written in multiple JSON shapes from different settings pages — risk of clobbering keys.
- Onboarding **`priority_needs`** stored separately — does **not** drive admin nav or settings modules.

---

## Cross-cutting discrepancies (Admin vs product doc)

| Topic | Product doc | Code reality |
|---|---|---|
| First admin role | `church_admin` | `super_admin` in DB triggers / onboarding fallback |
| Onboarding service picks | Should inform app | Stored only in `tenant_metadata.priority_needs`; **no admin nav filtering** |
| Dashboard giving card | “Giving Today” | Label **“Today's Giving”**; separate query from month stat |
| Dashboard events | “Events” | **Upcoming Events**, 7-day window |
| Security naming | Security Center | **Security Centre** route |
| Church Studio | Listed in nav | **PlaceholderPage** — real page unmounted |
| STK countdown | Verify API-driven | **Fixed 90s** client timer |
| Permissions | Implied role matrix | Runtime gates = **`user_fine_permissions`** only; `feature_permissions` is dead UI |

---

## Quick reference — permission keys by category

| Category | Primary `usePermissions` key |
|---|---|
| Overview | (none on dashboard itself) |
| People | `member_management`, `groups_ministries` |
| Finance | `financial_records` |
| Events & Operations | `event_management` |
| Security | `reports_analytics` (quirk) |
| Engagement | `communication_tools` |
| Media & Content | mostly none |
| Growth | mostly none |
| Admin → Reports | `reports_analytics` |
| Admin → Branches | `church_settings` |
| Admin → Settings | `church_settings` (layout) |

Admins with role `super_admin` or `church_admin` **bypass** all fine-permission reads (full access).
