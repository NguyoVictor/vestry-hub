> ⚠️ **SCHEMA CORRECTION NOTICE** — The table/column names written in this spec are the ORIGINAL spec names and DO NOT match the actual database. Always use `src/lib/schema.ts` TABLES/COLS constants. See `.kiro/specs/schema-correction-notice.md` for the full override list. Quick reference:
> - spec `churches` = actual **tenants** | spec `donations` = actual **giving_records** | spec `church_expenses` = actual **expenses**
> - spec `budget_lines` = actual **budget_categories** | spec `church_seo_settings` = actual **tenant_seo_settings**
> - spec `church_members` = actual **role_permissions** | spec `attendance` = actual **attendance_records**
> - spec `church_id` col = actual **tenant_id** | spec `logo_url` = actual **logo** | spec `donation_date` = actual **given_at**
> - spec `payment_reference` = actual **pesapal_transaction_id** | spec `rsvp_deadline` = actual **registration_deadline**
> - spec `start_datetime` = actual **event_date** | spec `events.status=published` = actual **events.is_published=true**
> - spec `events.capacity` = actual **capacity_limit** | spec `onboarding_complete` = actual **onboarding_completed**

Here is your **Phase 6 prompt** — Security & Communications:

---

## 🏗️ Lovable Prompt — Phase 6: Security & Communications

---

**CONTEXT — What already exists, do not rebuild:**

This is **Vestry**, a multi-tenant Church SaaS platform. The following phases are already complete:
- Phase 0: Supabase Auth, onboarding, church access code + QR code
- Phase 1: AppLayout (collapsible sidebar, top navbar, dark mode), AuthGuard, Dashboard Overview, all routes scaffolded
- Phase 2: Full Settings (all 8 sub-sections), public church page at `/church/:slug`
- Phase 3: Full People module (Members, Groups, House Fellowships, Families, Visitors, Follow-Up Tasks, New Converts)
- Phase 4: Full Finance module (Give Online, Giving Records, Pledge Campaigns, Church Expenses, Budget Management, Payroll, Fund Accounting, Accounts Payable, General Ledger, Payouts)
- Phase 5: Full Events & Operations module (Services, Events, Volunteering, Member Requests, Board Meetings, Facility & Event Booking)

**Do not touch any of the above. This phase replaces the placeholder pages for the Security and Communications sections only:**
`/security-centre`, `/incident-management`, `/communications`, `/announcements`, `/member-messaging`, `/testimonies`, `/surveys`

All other placeholder pages remain untouched.

---

**TECH STACK (same throughout all phases):**
- React + TypeScript + Vite
- Supabase (PostgreSQL, RLS, Edge Functions, Realtime, Storage)
- Tailwind CSS + shadcn/ui
- React Router v6
- TanStack Query v5
- React Hook Form + Zod
- Lucide React
- `react-helmet-async`
- Sonner (toasts)
- `date-fns`
- Recharts
- `papaparse`
- Supabase Realtime (for live messaging and notifications)

---

### PART 1 — SHARED SECURITY & COMMUNICATIONS COMPONENTS

**`<MessageBubble>` component:**
- Props: `message: Message`, `isOwn: boolean`
- Own messages: right-aligned, indigo background, white text, rounded `rounded-2xl rounded-br-sm`
- Other messages: left-aligned, `bg-slate-100 dark:bg-slate-700`, rounded `rounded-2xl rounded-bl-sm`
- Shows: message text, timestamp in `text-xs text-slate-400`, read receipt icon (single tick = sent, double tick = delivered, double blue tick = read)
- Supports text messages and image attachments (shows image thumbnail inline)

**`<AlertSeverityBadge>` component:**
- Props: `severity: 'low' | 'medium' | 'high' | 'critical'`
- low → slate, medium → amber, high → orange, critical → red with pulse animation (`animate-pulse`)

**`<BroadcastRecipientSelector>` component:**
- Props: `value: RecipientTarget`, `onChange`
- Radio group: All Members / Specific Groups / Specific Members / Custom Filter
- "All Members" → no extra UI, recipient count shown: "Will reach X members"
- "Specific Groups" → multi-select checkboxes of all groups (with member count per group shown)
- "Specific Members" → searchable multi-select of individual members (tag-style chips)
- "Custom Filter" → filter by: gender, age range, baptized (Y/N), join date range, group membership — same filter fields as Members page `<FilterSidebar>`
- Always shows live "Estimated recipients: X" count below the selector, updates as selection changes

---

### PART 2 — SECURITY CENTRE PAGE (`/security-centre`)

**Page title:** `Security Centre — Vestry`
**PageHeader:** "Security Centre" / "Monitor access, sessions and suspicious activity"
**Header actions:** "Export Logs" button

---

**TOP STATS ROW (4 cards):**
- Active Sessions (count of currently active user sessions across all staff for this church)
- Failed Login Attempts (last 24 hours — count from `login_events` where `status = 'failed'` and `created_at > now() - interval '24 hours'`)
- Staff Accounts (total active staff + admin accounts for this church)
- Last Security Alert (date/time of most recent flagged event, or "None" if clean)

---

**ALERT BANNER:**
If there are any unresolved `security_alerts` with severity = `high` or `critical`:
- Show a red banner at the top of the page (below PageHeader): "⚠️ {count} unresolved security alert(s) require your attention." with a "Review Now" anchor scrolling to the alerts section

---

**SECTION 1 — Access Log:**

Card with header "Recent Access Log" + "View All" toggle (shows last 20 by default, "Show All" loads more)

`<DataTable>` with columns:

| Column | Content | Sortable |
|--------|---------|----------|
| User | Avatar + name + email | ✅ |
| Event | Login Success / Login Failed / Password Changed / 2FA Enabled / Session Revoked / Role Changed | ✅ |
| IP Address | IP in `font-mono text-sm` | ❌ |
| Location | Country flag emoji + city + country | ❌ |
| Device | Device icon (desktop/mobile/tablet) + browser name | ❌ |
| Date & Time | Formatted full datetime | ✅ |
| Status | Success (emerald) / Failed (red) / Warning (amber) | ✅ |

Data source: `login_events` table (created in Phase 2) filtered by `user_id IN (SELECT user_id FROM role_permissions WHERE tenant_id = :churchId)`

Filter bar above table: user select, event type, status, date range

---

**SECTION 2 — Active Sessions:**

Card with header "Active Sessions"

List of all currently active sessions for church staff:
- Each row: staff avatar + name + role badge, device icon + browser, location (city, country), "Last active X minutes ago", "Current Session" badge (green) if it's the viewer's own session, "Revoke" button (red outline) for non-current sessions
- "Revoke All Other Sessions" button at card bottom (with confirmation dialog: "This will sign out all other staff sessions for your church. Continue?")
- Revoking calls a Supabase Edge Function `revoke-session` that calls `supabase.auth.admin.signOut(userId, 'others')`

Data source: query `auth.sessions` via a Supabase Edge Function `get-active-sessions` that returns sessions for all users in this church

---

**SECTION 3 — Security Alerts:**

Card with header "Security Alerts" + unread count badge

`<DataTable>` with columns:

| Column | Content | Sortable |
|--------|---------|----------|
| Severity | `<AlertSeverityBadge>` | ✅ |
| Alert Type | Failed Logins / Unusual Location / Brute Force / Account Locked / Suspicious Activity | ✅ |
| Description | Alert description text | ❌ |
| Affected User | Avatar + name | ❌ |
| Triggered At | Datetime | ✅ |
| Status | Open (red) / Investigating (amber) / Resolved (emerald) | ✅ |
| Actions | View Details, Mark Resolved, Dismiss | — |

**Auto-generated alerts logic (via Supabase Edge Function `detect-security-threats` — run on a schedule or triggered by `login_events` INSERT):**
- 5+ failed login attempts in 10 minutes from same IP → create `critical` "Brute Force Attempt" alert
- Login from a new country/city not previously seen for that user → create `medium` "Unusual Location" alert
- 3+ failed logins for same account in 5 minutes → create `high` "Multiple Failed Logins" alert

**Alert Detail — Sheet:**
- Alert metadata (severity, type, description, triggered at)
- Affected user info
- Raw event log entries that triggered this alert (table of related `login_events`)
- IP Geolocation details
- Status update: "Mark as Investigating" / "Mark as Resolved" buttons
- Resolution notes textarea (required when marking resolved)
- Activity timeline: status changes + notes

---

**SECTION 4 — Staff Permissions Overview:**

Card with header "Staff Access Overview"

Table of all staff + admin users for this church:
- Columns: Staff Member (avatar + name), Role badge, Last Login, Active Sessions count, MFA Status (Enabled/Disabled — UI only), Actions (View Activity, Change Role → links to Settings → Roles)
- "Manage Roles" button links to `/settings/roles`

---

### PART 3 — INCIDENT MANAGEMENT PAGE (`/incident-management`)

**Page title:** `Incident Management — Vestry`
**PageHeader:** "Incident Management" / "Log, track and resolve church security incidents"
**Header actions:** "Report Incident" button

---

**TOP STATS ROW (3 cards):**
- Open Incidents (count of unresolved)
- Incidents This Month
- Average Resolution Time (days from reported to resolved, for closed incidents this month)

---

**INCIDENTS TABLE:**

Two views: Kanban / Table (toggle in top right)

**KANBAN VIEW:**

Four columns (using `@dnd-kit`):
- **Reported** (slate) — newly logged
- **Under Investigation** (amber) — being looked into
- **Action Taken** (blue) — steps have been taken
- **Resolved** (emerald) — fully closed

Each incident card:
- Severity badge (`<AlertSeverityBadge>`)
- Incident title in `font-medium`
- Incident type icon + label
- Reported by: avatar + name
- Date reported (relative: "2 days ago")
- Assigned investigator avatar (or "Unassigned")
- Drag to change status

**TABLE VIEW:**

`<DataTable>` with columns: Incident Title, Type, Severity, Reported By, Date, Assigned To, Status, Actions

**Incident Types:**
Theft / Vandalism / Trespassing / Physical Altercation / Medical Emergency / Fire / Unauthorized Access / Suspicious Person / Child Safety / Data Breach / Other

---

**REPORT INCIDENT — Sheet form:**

Fields:
- Incident Title (required, max 150 chars)
- Incident Type (select from types above)
- Severity (select: Low / Medium / High / Critical)
- Date & Time of Incident (datetime picker, default now)
- Location (text input — where on church premises it occurred)
- Description (textarea, required, min 50 chars, max 2000 chars — full account of what happened)
- People Involved (multi-select from `members` + free text for non-members)
- Witnesses (textarea — names + contact info)
- Immediate Action Taken (textarea — what was done at the time)
- Assign Investigator (select from staff/admin)
- Evidence / Attachments (multi-file upload — photos, documents — to Supabase Storage `incident-files/{tenant_id}/{incident_id}/`)
- Notify Super Admin (toggle, default on for High/Critical)
- Is Confidential (toggle)

---

**INCIDENT DETAIL PAGE (`/incident-management/:incidentId`):**

**Page header:** incident title, severity badge, type badge, status badge, reported date

**Content (two columns):**

*Left (2/3):*

*Incident Details card:*
- Full description
- Location, date/time of incident
- People involved (linked member chips + non-member names)
- Witnesses
- Immediate action taken

*Investigation Log card:*
- Timeline of investigation updates (most recent first):
  - Each entry: investigator avatar + name, update text, datetime
- "Add Update" form: textarea + submit button → INSERT into `incident_updates`

*Evidence card:*
- Grid of uploaded files (images shown as thumbnails, documents as file cards with download button)
- "Upload More Evidence" button

*Right (1/3):*

*Incident Info card:* all metadata

*Assigned Investigator card:*
- Current assignee avatar + name + role
- "Reassign" button → select from staff

*Status card:*
- Current status with `<AlertSeverityBadge>`
- Status update buttons: "Start Investigation" / "Mark Action Taken" / "Resolve Incident"
- "Resolve" opens Dialog: resolution summary textarea (required) + resolution date → UPDATE `incidents.status = 'resolved'` + save summary

*Linked Alerts card:*
- Any `security_alerts` linked to this incident
- "Link Alert" button → select from open alerts

---

### PART 4 — COMMUNICATIONS PAGE (`/communications`)

**Page title:** `Communications — Vestry`
**PageHeader:** "Communications" / "Send broadcast messages to your congregation"
**Header actions:** "Compose Message" button

---

**TOP STATS ROW (3 cards):**
- Messages Sent This Month
- Total Recipients Reached This Month
- Open Rate (% of in-app messages that were read — from `message_reads` table)

---

**TWO-TAB LAYOUT:**

*Sent Messages tab (default):*

`<DataTable>` with columns:

| Column | Content | Sortable |
|--------|---------|----------|
| Subject | Message subject in `font-medium` + channel badges (Email / SMS / In-App) | ✅ |
| Recipients | Recipient summary (e.g. "All Members · 342 people") | ❌ |
| Sent By | Avatar + name | ❌ |
| Sent At | Datetime | ✅ |
| Delivered | Count + % | ❌ |
| Read | Count + % (in-app only) | ❌ |
| Status | Sent / Scheduled / Draft / Failed | ✅ |
| Actions | View, Duplicate, Delete | — |

Filter: channel, status, date range, sent by

*Drafts & Scheduled tab:*
- Same table but filtered to `status IN ('draft', 'scheduled')`
- Scheduled messages show countdown: "Sends in 2 hours"
- "Edit" + "Cancel Schedule" + "Send Now" actions

---

**COMPOSE MESSAGE — Full-page composer (opens as a new route `/communications/compose` or a large Sheet):**

**Layout:** Two-panel: left = composer form, right = live preview panel

*Left — Composer:*

- **Subject** (text input, required, max 150 chars)
- **Message Body** (rich textarea with basic formatting toolbar):
  - Bold, Italic, Underline, Bullet List, Numbered List
  - Insert variable button: `{first_name}`, `{last_name}`, `{church_name}`, `{event_name}` — inserts merge tag at cursor
  - Character count
- **Channels** (multi-select checkboxes):
  - ✅ In-App Notification (always available)
  - ☐ Email (requires SendGrid integration or Supabase email)
  - ☐ SMS (requires Twilio integration — shows "Connect Twilio in Settings" if not connected)
  - ☐ WhatsApp (requires WhatsApp Business API — shows "Coming Soon" badge)
- **Recipients** — `<BroadcastRecipientSelector>` component
- **Schedule** (toggle):
  - Off: "Send Immediately"
  - On: shows datetime picker for scheduled send time
- **Attachments** (file upload, optional — for email channel only, max 3 files, 5MB each)
- Bottom action bar: "Save as Draft" (secondary) + "Send Message" / "Schedule Message" (primary indigo)

*Right — Live Preview panel:*
- Tab switcher: "In-App" / "Email" / "SMS"
- In-App preview: mock notification card (bell icon + subject + body excerpt, styled like the app's notification dropdown)
- Email preview: mock email client layout (From: Vestry via vestry.app, To: {recipient name}, Subject line, email body with church logo header + message body + footer with unsubscribe link)
- SMS preview: mock phone screen with SMS bubble showing the message text (character count + SMS segment count shown below — SMS = 160 chars per segment)
- Merge tags rendered with example values (e.g. `{first_name}` → "James")

**Send confirmation Dialog:**
Before sending: "You are about to send this message to X members via {channels}. This cannot be undone. Confirm?"

**On send:**
- INSERT into `broadcasts` table
- INSERT into `broadcast_recipients` (one row per recipient)
- For in-app: INSERT into `notifications` table for each recipient
- For email/SMS: trigger Supabase Edge Function `send-broadcast` which handles actual delivery
- INSERT into `activity_log`
- Show `toast.success("Message sent to X members")`
- Redirect back to `/communications`

---

### PART 5 — ANNOUNCEMENTS PAGE (`/announcements`)

**Page title:** `Announcements — Vestry`
**PageHeader:** "Announcements" / "Post church-wide announcements visible to all members"
**Header actions:** "Post Announcement" button

---

**Announcements feed (card list, most recent first):**

Each announcement card:
- Pinned indicator (📌 icon + "Pinned" badge at top right if pinned)
- Category badge (General / Service / Event / Finance / Urgent)
- Announcement title in `font-semibold text-lg`
- Body text (truncated to 3 lines with "Read more" expand)
- Author avatar + name + "posted {relative time}"
- Visibility badge: All Members / Groups Only / Staff Only
- Attachments row (file chips if any attached)
- Action row: "Edit", "Pin/Unpin", "Archive", "Delete"
- View count in `text-xs text-slate-400`: "👁 {count} views"

**Filter/sort bar above feed:**
- Category filter chips (All / General / Service / Event / Finance / Urgent)
- Status filter: Active / Archived / Scheduled
- Sort: Newest / Oldest / Most Viewed / Pinned First

---

**POST ANNOUNCEMENT — Sheet form:**

Fields:
- Title (required, max 150 chars)
- Body (rich textarea with basic formatting, max 2000 chars)
- Category (select: General / Service / Event / Finance / Urgent)
- Visibility (select: All Members / Specific Groups / Staff Only)
  - If Specific Groups: multi-select groups
- Attachments (multi-file upload — PDFs, images — to Supabase Storage `announcements/{tenant_id}/{announcement_id}/`)
- Pin this announcement (toggle) — pinned announcements appear at top of feed always
- Schedule for later (toggle) — shows datetime picker if on
- Notify Members (toggle) — if on: sends an in-app notification to all targeted members when posted

**Edit Announcement:** same form pre-filled, PATCHes the row

**Archive:** soft-deletes by setting `status = 'archived'` — archived announcements don't show in the main feed but are accessible via the Archived filter

---

### PART 6 — MEMBER MESSAGING PAGE (`/member-messaging`)

**Page title:** `Member Messaging — Vestry`
**PageHeader:** "Member Messaging" / "Direct messages between staff and members"

This is a full real-time inbox/chat interface.

---

**LAYOUT:**

Three-panel layout:
- **Left panel (280px):** Conversations list
- **Middle panel (flex-1):** Chat window
- **Right panel (260px, collapsible):** Conversation info / member details

On mobile: full-screen list view → tap conversation → full-screen chat view → back button returns to list

---

**LEFT PANEL — Conversations List:**

- Search input at top ("Search conversations...")
- Filter tabs: All / Unread / Staff-to-Member / Group Chats
- Each conversation row:
  - Member avatar + name (or group icon + name for group chats)
  - Last message preview (truncated, 1 line) in `text-sm text-slate-500`
  - Timestamp (relative: "2m", "1h", "Yesterday", "Mon")
  - Unread count badge (indigo pill, shown if unread > 0)
  - Online indicator (green dot on avatar if member is currently online — via Supabase Presence)
- "New Message" button (floating bottom right of left panel) → opens member search to start a new conversation

---

**MIDDLE PANEL — Chat Window:**

**Header (sticky top):**
- Member avatar + name + online status indicator
- "Member Profile" button (opens right panel if closed)
- More options menu: Clear Chat, Block Member, Archive Conversation

**Messages area (scrollable, flex-col-reverse so newest at bottom):**
- Date separators between messages from different days (e.g. "Today", "Yesterday", "Mon 17 Mar")
- `<MessageBubble>` components for each message
- Typing indicator (animated dots) when the other party is typing — via Supabase Realtime presence
- "Jump to latest" FAB button appears when scrolled up (scroll to bottom on click)
- Virtualized list for performance (use `react-virtual` or `@tanstack/react-virtual` if message count is high)

**Input area (sticky bottom):**
- Attachment button (paperclip icon) → file/image picker → uploads to Supabase Storage `messages/{tenant_id}/{conversation_id}/` → sends as image message
- Text input (auto-expanding textarea, max 4 lines before scroll)
- Emoji button (opens a simple emoji picker — use `emoji-mart` library)
- Send button (indigo, arrow icon) — disabled when input is empty
- On enter key (without shift): send message
- On shift+enter: new line

**Real-time behavior:**
- Subscribe to `messages` table INSERT events via Supabase Realtime filtered to `conversation_id = :currentConversationId`
- New messages appear instantly without page refresh
- Mark messages as read when conversation is opened (UPDATE `messages.read_at` for all unread messages in conversation)
- Update conversation's `last_message_at` + `last_message_preview` on each new message
- Typing indicator: broadcast presence event `{typing: true, userId}` via Supabase Realtime channel when user is typing (debounced — stop broadcasting after 3 seconds of no typing)

---

**RIGHT PANEL — Conversation Info:**

- Member avatar (large, 64px) + name + role badge
- Contact info: phone (WhatsApp link), email (mailto)
- Member since date
- Groups they belong to (chips)
- "View Full Profile" link → `/members/:memberId`
- Shared media: grid of image thumbnails from this conversation
- Shared files: list of document attachments from this conversation

---

**NEW CONVERSATION:**

Triggered by "New Message" button:
- Search input: type member name → shows dropdown of matching members
- Select member → opens new empty chat window
- If conversation already exists with that member → opens existing conversation

**GROUP MESSAGING:**
- "New Group Message" option in the new message flow
- Select multiple members (multi-select)
- Set group name (text input)
- Creates a `conversations` row with `type = 'group'`
- Group chat shows all participants in the right panel with avatars

---

### PART 7 — TESTIMONIES PAGE (`/testimonies`)

**Page title:** `Testimonies — Vestry`
**PageHeader:** "Testimonies" / "Collect and share testimonies from your congregation"
**Header actions:** "Add Testimony" button

---

**TWO-TAB LAYOUT:**

*Published tab (default):*

Card grid `grid-cols-1 md:grid-cols-2 gap-4` of published testimonies:

Each card:
- Category badge (Healing / Financial / Salvation / Marriage / Career / Other)
- Testimony title in `font-semibold`
- Body text (truncated to 4 lines, "Read more" expand)
- Author: member avatar + name + "shared {relative date}"
- Is Anonymous badge (if member chose to share anonymously: shows "Anonymous Member" instead of name)
- Media thumbnail row (if photos attached)
- Published date
- Admin actions: "Edit", "Unpublish", "Delete"

*Pending Approval tab:*

Same card layout but for testimonies with `status = 'pending'`:
- Each card has: "Approve" (emerald) + "Reject" (red) action buttons
- Reject opens Dialog for rejection reason (optional, for admin notes only — not shown to member)
- Unread pending count shown as a badge on the tab label

---

**ADD TESTIMONY (admin on behalf of member) — Sheet form:**

Fields:
- Member (searchable select — who is sharing the testimony)
- Share Anonymously (toggle) — if on: member name is hidden on public display, shown only to admins
- Testimony Title (required, max 100 chars)
- Category (select: Healing / Financial Breakthrough / Salvation / Marriage / Career / Other)
- Testimony Body (rich textarea, min 50 chars, max 3000 chars)
- Date of Testimony (date picker, default today)
- Media Attachments (image upload, max 3 images — to Supabase Storage `testimonies/{tenant_id}/{testimony_id}/`)
- Status (select: Published / Pending — default Pending for self-submitted, Published for admin-added)
- Feature on Public Church Page (toggle) — if on: testimony appears on `/church/:slug` public page

**Member self-submission (for Member Portal — Phase 9):**
The `testimonies` table structure supports self-submission. Members can submit via the member portal. Staff review in the "Pending Approval" tab.

---

### PART 8 — SURVEYS PAGE (`/surveys`)

**Page title:** `Surveys — Vestry`
**PageHeader:** "Surveys" / "Create and distribute surveys to your congregation"
**Header actions:** "Create Survey" button

---

**SURVEYS LIST:**

Card grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`:

Each survey card:
- Survey title in `font-semibold`
- Status badge: Draft / Active / Closed / Archived
- Question count: "X questions"
- Response count: "X responses"
- Active period: "Open until {date}" or "Closed {date}"
- Completion rate: mini progress bar + "X% completion rate"
- Three-dot menu: View Results, Share, Edit, Duplicate, Archive, Delete

---

**CREATE / EDIT SURVEY — Full-page builder (route: `/surveys/new` or `/surveys/:id/edit`):**

**Layout:** Two-panel — left = question builder, right = live survey preview (updates as questions are added/edited)

*Left — Builder:*

**Survey Settings section (top):**
- Survey Title (required)
- Description (textarea, optional)
- Category (select: Feedback / Event Feedback / Sermon Feedback / Needs Assessment / Annual Review / Other)
- Open Date + Close Date (date pickers)
- Allow Anonymous Responses (toggle)
- One Response Per Member (toggle — prevents duplicate submissions)
- Show Progress Bar to Respondents (toggle)
- Thank You Message (textarea — shown after submission, default "Thank you for your response!")

**Questions section:**
- Dynamic list of questions (drag to reorder using `@dnd-kit/sortable`)
- "Add Question" button opens a question type selector panel:

Supported question types:
1. **Short Text** — single line text input
2. **Long Text** — multi-line textarea
3. **Multiple Choice (Single)** — radio buttons, add/remove options
4. **Multiple Choice (Multi)** — checkboxes, add/remove options
5. **Dropdown** — select dropdown, add/remove options
6. **Rating Scale** — 1–5 or 1–10 star/number rating (configurable)
7. **Linear Scale** — slider from min to max with custom labels (e.g. "Not Satisfied" to "Very Satisfied")
8. **Yes / No** — two-option radio
9. **Date** — date picker
10. **File Upload** — allows respondents to upload a file

Each question card in the builder:
- Question type icon + type label
- Question text input (required)
- Description/helper text input (optional)
- Required toggle
- Type-specific options editor (e.g. for MCQ: list of option inputs with add/remove buttons)
- Duplicate question button
- Delete question button
- Drag handle (left side)

*Right — Live Preview:*
- Mock survey form showing exactly how the survey will look to a respondent
- Updates live as questions are added/edited
- Mobile/Desktop view toggle (changes preview width)

**Save & Publish:**
- "Save Draft" (secondary) — saves without publishing
- "Publish Survey" (primary) — sets `status = 'active'`, generates a shareable link: `vestry.app/survey/{survey-slug}`

---

**SURVEY DETAIL / RESULTS PAGE (`/surveys/:surveyId/results`):**

**Page header:** survey title, status badge, response count, completion rate

**Share section (card):**
- Survey link: `vestry.app/survey/{slug}` + copy button
- QR code (`qrcode.react`) for the survey URL
- "Send to Members" button → opens `<BroadcastRecipientSelector>` + sends in-app notification with survey link

**Response Summary (per question):**

For each question, show a summary visualization:
- **Multiple Choice / Dropdown / Yes/No:** horizontal bar chart (Recharts `BarChart`) showing response distribution + option label + count + percentage
- **Rating Scale:** average score (large number) + distribution bar chart + star visualization
- **Linear Scale:** average score + distribution
- **Short/Long Text:** list of text responses (paginated, 10 per page) + word cloud (optional, basic frequency display)
- **Date:** list of dates + most common date
- **File Upload:** list of uploaded files with download links

**Individual Responses tab:**
- `<DataTable>` of all responses:
  - Columns: Respondent (avatar + name or "Anonymous"), Submitted At, Completion Status, Actions (View Full Response)
  - "View Full Response" opens a Sheet showing all their answers formatted nicely
- Export all responses as CSV button

**Public Survey Page (`/survey/:slug`) — standalone, no auth required:**
- Survey title + description
- Progress bar (if enabled)
- One question per page (wizard style) or all questions on one page (based on survey setting — add "One Page / Multi-Page" toggle to survey settings)
- Submit button → INSERT into `survey_responses` + `survey_answers` tables
- After submit: show thank you message
- If `one_response_per_member = true` and the respondent has already submitted: show "You have already submitted this survey" message
- Respondent identification: if the member is logged into the member portal, auto-fill their identity. Otherwise show optional name/email fields.

---

### PART 9 — DATABASE MIGRATIONS FOR PHASE 6

```sql
-- SECURITY ALERTS TABLE
CREATE TABLE security_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'failed_logins','unusual_location','brute_force',
    'account_locked','suspicious_activity','data_breach'
  )),
  description TEXT NOT NULL,
  affected_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  affected_user_name TEXT,
  ip_address TEXT,
  location TEXT,
  raw_data JSONB,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','resolved')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  linked_incident_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage security alerts"
  ON security_alerts FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin')
  ));

-- INCIDENTS TABLE
CREATE TABLE incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'theft','vandalism','trespassing','physical_altercation',
    'medical_emergency','fire','unauthorized_access',
    'suspicious_person','child_safety','data_breach','other'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  incident_datetime TIMESTAMPTZ NOT NULL,
  location TEXT,
  description TEXT NOT NULL,
  people_involved JSONB DEFAULT '[]',
  witnesses TEXT,
  immediate_action TEXT,
  assigned_investigator UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_confidential BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'reported' CHECK (status IN (
    'reported','under_investigation','action_taken','resolved'
  )),
  resolution_summary TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  linked_alert_id UUID REFERENCES security_alerts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage incidents"
  ON incidents FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin')
  ));

-- INCIDENT FILES TABLE
CREATE TABLE incident_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE incident_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage incident files"
  ON incident_files FOR ALL
  USING (incident_id IN (
    SELECT id FROM incidents WHERE tenant_id IN (
      SELECT tenant_id FROM role_permissions
      WHERE user_id = auth.uid() AND role IN ('super_admin','admin')
    )
  ));

-- INCIDENT UPDATES TABLE
CREATE TABLE incident_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE NOT NULL,
  update_text TEXT NOT NULL,
  status_at_time TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage incident updates"
  ON incident_updates FOR ALL
  USING (incident_id IN (
    SELECT id FROM incidents WHERE tenant_id IN (
      SELECT tenant_id FROM role_permissions
      WHERE user_id = auth.uid() AND role IN ('super_admin','admin')
    )
  ));

-- BROADCASTS TABLE
CREATE TABLE broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  channels TEXT[] NOT NULL DEFAULT '{in_app}',
  recipient_type TEXT NOT NULL CHECK (recipient_type IN (
    'all_members','specific_groups','specific_members','custom_filter'
  )),
  recipient_config JSONB DEFAULT '{}',
  recipient_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  read_count INT DEFAULT 0,
  attachments JSONB DEFAULT '[]',
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft','scheduled','sent','failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage broadcasts"
  ON broadcasts FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'broadcast','announcement','member_request','follow_up_task',
    'event_reminder','system','security_alert','booking_update',
    'payroll','survey','testimony'
  )),
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  broadcast_id UUID REFERENCES broadcasts(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Staff can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());
CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);

-- Enable Realtime on notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ANNOUNCEMENTS TABLE
CREATE TABLE announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN (
    'general','service','event','finance','urgent'
  )),
  visibility TEXT DEFAULT 'all_members' CHECK (visibility IN (
    'all_members','specific_groups','staff_only'
  )),
  target_groups UUID[],
  attachments JSONB DEFAULT '[]',
  is_pinned BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','archived','scheduled')),
  scheduled_at TIMESTAMPTZ,
  view_count INT DEFAULT 0,
  notify_members BOOLEAN DEFAULT true,
  posted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage announcements"
  ON announcements FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));
CREATE POLICY "Members can view active announcements"
  ON announcements FOR SELECT
  USING (
    status = 'active'
    AND tenant_id IN (
      SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid()
    )
  );

-- CONVERSATIONS TABLE
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct','group')),
  name TEXT,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- CONVERSATION PARTICIPANTS TABLE
CREATE TABLE conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  unread_count INT DEFAULT 0,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view their conversations"
  ON conversation_participants FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Participants can view conversations they're in"
  ON conversations FOR SELECT
  USING (id IN (
    SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
  ));

-- MESSAGES TABLE
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text','image','file','system')),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  USING (conversation_id IN (
    SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
  ));
CREATE POLICY "Participants can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- Enable Realtime on messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- TESTIMONIES TABLE
CREATE TABLE testimonies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT false,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'other' CHECK (category IN (
    'healing','financial','salvation','marriage','career','other'
  )),
  body TEXT NOT NULL,
  testimony_date DATE DEFAULT CURRENT_DATE,
  media_urls JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','published','rejected')),
  rejection_reason TEXT,
  show_on_public_page BOOLEAN DEFAULT false,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE testimonies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage testimonies"
  ON testimonies FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));
CREATE POLICY "Public can view published testimonies on public page"
  ON testimonies FOR SELECT
  USING (status = 'published' AND show_on_public_page = true);

-- SURVEYS TABLE
CREATE TABLE surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  category TEXT DEFAULT 'feedback' CHECK (category IN (
    'feedback','event_feedback','sermon_feedback',
    'needs_assessment','annual_review','other'
  )),
  questions JSONB NOT NULL DEFAULT '[]',
  open_date TIMESTAMPTZ,
  close_date TIMESTAMPTZ,
  allow_anonymous BOOLEAN DEFAULT true,
  one_response_per_member BOOLEAN DEFAULT true,
  show_progress_bar BOOLEAN DEFAULT true,
  is_multi_page BOOLEAN DEFAULT false,
  thank_you_message TEXT DEFAULT 'Thank you for your response!',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','closed','archived')),
  response_count INT DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage surveys"
  ON surveys FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));
CREATE POLICY "Public can view active surveys"
  ON surveys FOR SELECT
  USING (status = 'active');

-- SURVEY RESPONSES TABLE
CREATE TABLE survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  respondent_name TEXT,
  respondent_email TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  is_complete BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view survey responses"
  ON survey_responses FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));
CREATE POLICY "Anyone can insert survey responses"
  ON survey_responses FOR INSERT
  WITH CHECK (true);

-- SURVEY ANSWERS TABLE
CREATE TABLE survey_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID REFERENCES survey_responses(id) ON DELETE CASCADE NOT NULL,
  question_index INT NOT NULL,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_value JSONB,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE survey_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view survey answers"
  ON survey_answers FOR SELECT
  USING (response_id IN (
    SELECT id FROM survey_responses WHERE tenant_id IN (
      SELECT tenant_id FROM role_permissions
      WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
    )
  ));
CREATE POLICY "Anyone can insert survey answers"
  ON survey_answers FOR INSERT
  WITH CHECK (true);
```

---

**Build exactly this. Replace the 7 Security and Communications placeholder pages from Phase 1 with fully functional, Supabase-connected pages as described above. Install `emoji-mart` for the emoji picker in member messaging. Enable Supabase Realtime on the `messages` and `notifications` tables as specified. Do not modify the AppLayout, Dashboard, Settings, People, Finance, or Events & Operations modules from Phases 1–5.**

