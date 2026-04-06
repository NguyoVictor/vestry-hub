> ⚠️ **SCHEMA CORRECTION NOTICE** — The table/column names written in this spec are the ORIGINAL spec names and DO NOT match the actual database. Always use `src/lib/schema.ts` TABLES/COLS constants. See `.kiro/specs/schema-correction-notice.md` for the full override list. Quick reference:
> - spec `churches` = actual **tenants** | spec `donations` = actual **giving_records** | spec `church_expenses` = actual **expenses**
> - spec `budget_lines` = actual **budget_categories** | spec `church_seo_settings` = actual **tenant_seo_settings**
> - spec `church_members` = actual **role_permissions** | spec `attendance` = actual **attendance_records**
> - spec `church_id` col = actual **tenant_id** | spec `logo_url` = actual **logo** | spec `donation_date` = actual **given_at**
> - spec `payment_reference` = actual **pesapal_transaction_id** | spec `rsvp_deadline` = actual **registration_deadline**
> - spec `start_datetime` = actual **event_date** | spec `events.status=published` = actual **events.is_published=true**
> - spec `events.capacity` = actual **capacity_limit** | spec `onboarding_complete` = actual **onboarding_completed**

# Phase 9: Analytics, Branches & Member Portal

## CONTEXT — What already exists, do not rebuild:

This is **Vestry**, a multi-tenant Church SaaS platform. The following phases are already complete:
- Phase 0: Supabase Auth, onboarding, church access code + QR code
- Phase 1: AppLayout (collapsible sidebar, top navbar, dark mode), AuthGuard, Dashboard Overview, all routes scaffolded
- Phase 2: Full Settings (all 8 sub-sections), public church page at `/church/:slug`
- Phase 3: Full People module (Members, Groups, House Fellowships, Families, Visitors, Follow-Up Tasks, New Converts)
- Phase 4: Full Finance module (Give Online, Giving Records, Pledge Campaigns, Church Expenses, Budget Management, Payroll, Fund Accounting, Accounts Payable, General Ledger, Payouts)
- Phase 5: Full Events & Operations module (Services, Events, Volunteering, Member Requests, Board Meetings, Facility & Event Booking)
- Phase 6: Full Security & Communications module (Security Centre, Incident Management, Communications, Announcements, Member Messaging, Testimonies, Surveys)
- Phase 7: Full Media & Content module (Graphics Studio, AI Tools, Church Studio, Bible Explorer, Song Library, Church Media, Asset Management, Sermon Preparation, Sermons & Messages, Livestreaming)
- Phase 8: Full Growth & Discipleship module (Discipleship Dashboard, Discipleship Resources, Outreach & Impact, Resources Store, Training)

**Do not touch any of the above. This phase builds three things:**
1. Replaces the `/reports` placeholder page with a full Reports & Analytics module
2. Replaces the `/branches` placeholder page with a full Branches module
3. Builds the complete Member Portal — a separate authenticated experience for church members at `/member/*`

---

## TECH STACK (same throughout all phases):
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
- Recharts (all charts)
- `papaparse`
- `@react-pdf/renderer`
- `qrcode.react`
- Additional libraries to install: `jspdf` + `html2canvas` (for exporting dashboard analytics as PDF)

---

## PART 1 — SHARED ANALYTICS COMPONENTS

**`<AnalyticsCard>` component:**
- Props: `title: string`, `value: string | number`, `subtitle?: string`, `trend?: {value: number, direction: 'up' | 'down' | 'neutral', label: string}`, `icon: LucideIcon`, `color: 'indigo' | 'emerald' | 'amber' | 'violet' | 'red' | 'cyan'`, `chart?: ReactNode`
- Same structure as KPI cards on the Dashboard but with an optional mini chart slot at the bottom
- Trend badge: green arrow up + percentage if direction = up, red arrow down if down, grey dash if neutral
- Mini chart slot: renders a small sparkline (40px height Recharts LineChart with no axes) if `chart` prop is provided

**`<DateRangePicker>` component:**
- Props: `value: {from: Date, to: Date}`, `onChange: (range) => void`, `presets?: boolean`
- Two date inputs (From / To) side by side
- If `presets = true`: show preset buttons above: "This Week" / "This Month" / "Last Month" / "Last 3 Months" / "Last 6 Months" / "This Year" / "Last Year" / "All Time"
- Clicking a preset auto-fills the from/to dates
- Used consistently across all analytics sections

**`<ExportMenu>` component:**
- Props: `onExportCSV: () => void`, `onExportPDF: () => void`, `onExportExcel?: () => void`
- Dropdown button (icon: `Download`) with options: Export as CSV, Export as PDF, Export as Excel (if prop provided)
- CSV: uses `papaparse` to generate and trigger browser download
- PDF: uses `@react-pdf/renderer` or `html2canvas` + `jspdf` to capture the current section and download

**`<ChartCard>` component:**
- Props: `title: string`, `subtitle?: string`, `actions?: ReactNode`, `children: ReactNode`, `loading?: boolean`, `height?: number`
- Wrapper card for all charts: header (title + subtitle + actions slot) + chart content area
- Loading state: shows a pulsing skeleton rectangle at the chart height
- Empty state (if no data): centered empty state icon + "No data for the selected period"

---

## PART 2 — REPORTS & ANALYTICS PAGE (`/reports`)

**Page title:** `Reports & Analytics — Vestry`
**PageHeader:** "Reports & Analytics" / "Church-wide data, insights and performance metrics"
**Header actions:** `<DateRangePicker presets>` (global date range that filters ALL sections on this page) + `<ExportMenu>` (exports the full page as a PDF report)

---

### 2A. Overview Summary Row (top, always visible)

Six `<AnalyticsCard>` components in a `grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4`:

1. **Total Members** — count from `members` where `status = 'active'` — color: indigo — trend vs same period last year
2. **New Members** — count added in selected date range — color: emerald — trend vs previous period
3. **Total Giving** — sum of `giving_records.amount` in date range — color: violet — trend vs previous period
4. **Total Expenses** — sum of `expenses.amount` where `approval_status = 'approved'` in date range — color: red — trend vs previous period
5. **Net Surplus** — Total Giving − Total Expenses — color: cyan — positive = emerald text, negative = red text
6. **Events Held** — count of `events` where `status = 'published'` and `event_date` in date range — color: amber — trend vs previous period

---

### 2B. Tabbed Analytics Sections

Eight tabs below the summary row. Each tab is a full section of charts and tables.

---

**Tab 1 — Membership**

`<ChartCard title="Membership Growth">` — `AreaChart` (Recharts):
- X-axis: months in selected date range
- Single area line: cumulative active member count at end of each month
- Gradient fill: indigo top → transparent bottom
- Tooltip: month + member count + new joins that month

`<ChartCard title="New Members by Month">` — `BarChart`:
- X-axis: months, Y-axis: count of new members added
- Bar color: emerald
- Tooltip: month + new members count

Two-column layout below charts:

*Left — Member Status Breakdown (donut chart):*
- Active / Inactive / Pending slices
- Center: total members count
- Legend with counts + percentages

*Right — Member Demographics table:*
- Gender breakdown: Male / Female / Other (count + %)
- Age groups: Under 18 / 18–25 / 26–35 / 36–45 / 46–60 / Over 60 (count + %)
- Marital status: Single / Married / Divorced / Widowed (count + %)
- Each row: label + count + percentage bar (mini inline progress bar)

*Bottom — Member Retention table:*
- Columns: Month, New Members, Inactive/Lost Members, Net Change, Total Active
- Last 12 months, most recent first
- Net Change: green if positive, red if negative
- Export as CSV button

---

**Tab 2 — Attendance**

`<ChartCard title="Service Attendance Trend">` — `LineChart` (Recharts):
- X-axis: service dates in selected range
- Multiple lines (one per service type): Sunday Service (indigo), Midweek (emerald), Youth (violet), Prayer (amber)
- Toggle checkboxes above chart to show/hide each service type line
- Tooltip: date + attendance_records per service type

`<ChartCard title="Average Attendance by Service Type">` — horizontal `BarChart`:
- Y-axis: service type names
- X-axis: average attendance count
- Bar color: indigo
- Shows average + min + max as text next to each bar

*Attendance Summary table (bottom):*
- Columns: Service Name, Total Services Held, Average Attendance, Highest Attendance, Lowest Attendance, Attendance Rate (actual/expected %)
- Sort by any column
- Export as CSV

---

**Tab 3 — Finance**

Layout: three sub-sections stacked.

*Income vs Expense Overview:*
`<ChartCard title="Income vs Expenses">` — grouped `BarChart`:
- X-axis: months in selected range
- Two bars per month: Total Income (emerald) + Total Expenses (red)
- Surplus/deficit line overlaid (secondary Y-axis, violet line)
- Tooltip: month + income + expenses + net

*Giving Breakdown:*
Two charts side by side:

Left — `<ChartCard title="Giving by Category">` — donut chart:
- Slices: Tithe / Offering / Building Fund / Welfare / Missions / Special / Other
- Legend with amounts + percentages
- Center: total giving amount

Right — `<ChartCard title="Giving by Payment Method">` — donut chart:
- Slices: Cash / M-Pesa / Bank Transfer / Card / Cheque / Other

*Top Donors table (shown only to Super Admin and Admin roles):*
- Columns: Rank, Member (avatar + name), Total Given, Number of Donations, Average Gift, Last Donation Date
- Top 20 donors in selected period
- Export as CSV button
- Note: "This data is confidential and visible to admins only" — amber info banner above table

*Expense Breakdown:*
`<ChartCard title="Expenses by Category">` — horizontal BarChart showing total per expense category in selected range

Expense Summary table:
- Columns: Category, Total Amount, Transaction Count, % of Total Expenses
- Sort by amount descending by default

---

**Tab 4 — Events**

`<ChartCard title="Events Over Time">` — `BarChart`:
- X-axis: months, Y-axis: event count
- Stacked bars by event type (Conference / Outreach / Youth / etc.)
- Each stack segment: different color per type

`<ChartCard title="RSVP vs Attendance">` — grouped BarChart:
- X-axis: last 10 events (by name)
- Two bars: RSVPs (indigo) vs Actual Attendance (emerald)
- Shows attendance rate as a percentage label above each pair

*Events Summary table (bottom):*
- Columns: Event Name, Type, Date, RSVPs, Attended, Attendance Rate, Revenue (if applicable)
- Filterable by event type
- Export as CSV

---

**Tab 5 — Groups & Fellowships**

`<ChartCard title="Group Membership Distribution">` — horizontal BarChart:
- Y-axis: group names (top 10 by member count)
- X-axis: member count
- Bar color per group type (Ministry = indigo, Cell Group = emerald, etc.)

`<ChartCard title="Group Growth Over Time">` — LineChart:
- X-axis: months
- Y-axis: total group member count
- One line per group type

*Groups Summary table:*
- Columns: Group Name, Type, Leader, Members, Growth (vs last period), Last Meeting, Status
- Sort by member count descending

*House Fellowships table:*
- Columns: Fellowship Name, Zone, Host, Leader, Members, Capacity, Utilization %

---

**Tab 6 — Discipleship & Outreach**

`<ChartCard title="Discipleship Pipeline">` — same chart as on Discipleship Dashboard but with date range filter applied

`<ChartCard title="Conversion Funnel">` — horizontal funnel chart (built with Recharts `BarChart` styled as funnel):
- Steps: Visitors → Follow-up Completed → Converted to Member → In Discipleship → Graduated
- Each step: count + conversion rate from previous step
- Color gradient from slate (top) to indigo (bottom)

`<ChartCard title="Outreach Impact Over Time">` — AreaChart:
- Two area lines: People Reached (indigo) + Salvations (emerald)
- X-axis: months in range

*Outreach Summary table:*
- Columns: Activity Name, Type, Date, Volunteers, People Reached, Salvations, Impact Score
- Export as CSV

---

**Tab 7 — Communications**

`<ChartCard title="Messages Sent Over Time">` — BarChart:
- X-axis: months
- Stacked bars: In-App (indigo) + Email (emerald) + SMS (amber)

*Broadcast Performance table:*
- Columns: Subject, Date Sent, Channel, Recipients, Delivered, Read, Read Rate %, Sent By
- Sort by date descending
- Export as CSV

`<ChartCard title="Survey Response Rates">` — horizontal BarChart:
- Y-axis: survey names
- X-axis: response rate %
- Shows response count as label inside bar

*Announcements Performance table:*
- Columns: Title, Category, Date, Views, Pinned, Status

---

**Tab 8 — Custom Report Builder**

A powerful custom report builder that lets admins create ad-hoc reports.

**Layout:** Left config panel (320px) + Right preview panel (flex-1)

*Left — Report Config:*

- **Report Name** (text input)
- **Data Source** (select): Members / Donations / Events / Expenses / Groups / Attendance / Outreach / Volunteers / Surveys
- **Date Range** (`<DateRangePicker>`)
- **Filters** (dynamic — based on selected data source):
  - Members: Status, Gender, Group, Join Date
  - Donations: Category, Payment Method, Amount Range
  - Events: Type, Status
  - Expenses: Category, Approval Status, Amount Range
  - (etc. — show relevant filters per source)
- **Columns** (multi-select checkboxes of available columns for the selected data source — user picks which columns to include)
- **Group By** (select: None / Month / Quarter / Year / Category / Type / Status)
- **Sort By** (select from chosen columns) + Sort Direction (Asc / Desc)
- **Limit** (number input — max rows, default 100)
- "Run Report" button (indigo, full width)
- "Save Report" button (secondary — saves config to `saved_reports` table with a name)

*Right — Preview Panel:*

- Shows "Run a report to see results" empty state initially
- After "Run Report": shows `<DataTable>` with the query results
- Above the table: "Showing X results" + `<ExportMenu>`
- If `Group By` is set: also shows a chart above the table (auto-selected chart type based on data: BarChart for categorical, LineChart for time-based)

**Saved Reports section (below the builder):**
- List of previously saved report configs
- Each: report name + data source + last run date + "Run" button + "Edit" button + "Delete" button

---

## PART 3 — BRANCHES PAGE (`/branches`)

**Page title:** `Branches — Vestry`
**PageHeader:** "Branches" / "Manage multiple church locations from one account"
**Header actions:** "Add Branch" button

---

### 3A. Branches Overview

**Top stats row (3 cards):**
- Total Branches (count of all branches for this church)
- Total Members Across All Branches (sum of member counts per branch)
- Combined Monthly Giving (sum of giving_records across all branches this month)

**Branch Cards Grid:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

Each branch card:
- Branch banner image (uploaded, or indigo gradient with branch name initial)
- Branch name in `font-semibold text-lg`
- Location: city + country (with flag emoji)
- Branch Admin: avatar + name (or "No admin assigned" in amber)
- Member count badge: `{count} members`
- Status badge: Active (emerald) / Inactive (slate) / New (blue)
- Key stats row: Monthly Giving / Services This Month / Active Groups
- "Manage Branch" button (indigo outline) → navigates to `/branches/:branchId`
- Three-dot menu: Edit, Switch to Branch, Deactivate, Delete

**"Switch to Branch" behavior:**
When an admin clicks "Switch to Branch", store the selected `branch_id` in the `useChurch()` context. All data in the app then filters to that branch's `tenant_id`. A prominent banner appears at the top of the AppLayout: "Viewing: {Branch Name}" with a gold background + "Back to Main Church" button to restore the original context. This allows the super admin to manage any branch from a single login.

---

### 3B. Add / Edit Branch — Sheet form

Fields:
- Branch Name (required, max 100 chars)
- Branch Code (auto-generated short code, e.g. "NBI-01" — editable, must be unique within the church group)
- Branch Logo (image upload → Supabase Storage `branch-logos/{parent_tenant_id}/{branch_id}/`)
- Branch Banner Image (image upload)
- Physical Address (textarea)
- City (text input)
- Country (select, default Kenya)
- Phone Number (text input with country code)
- Email Address (email input)
- Website URL (URL input, optional)
- Branch Admin (searchable select from `members` or `profiles` — the person who will manage this branch)
- Currency (select — default inherits from parent church)
- Status (select: Active / Inactive, default Active)
- Parent Church (read-only display — always the current church)
- Notes (textarea)

**On create:**
- INSERT into `tenants` ~~(spec said `tenants`)~~ table with `parent_tenant_id = currentChurchId` (branches are just child church records)
- INSERT into `role_permissions` ~~(spec said `role_permissions`)~~ table for the assigned branch admin with `role = 'super_admin'` for that branch's tenant_id
- INSERT into `activity_log`
- Show `toast.success("{Branch Name} branch created successfully")`
- The new branch admin receives an in-app notification that they have been assigned as branch admin

---

### 3C. Branch Detail Page (`/branches/:branchId`)

**Page header:** branch name + location + status badge + "Switch to Branch" button + "Edit Branch" button

**Content (two columns):**

*Left (2/3):*

*Branch Overview card:*
- Four mini KPI cards in a `grid-cols-2 gap-3`:
  - Members, Giving This Month, Services This Month, Groups

*Members table (last 10 members, "View All" link):*
- Same columns as the main Members `<DataTable>` but filtered to this branch's tenant_id
- "Add Member to Branch" button

*Recent Activity feed:*
- Last 10 `activity_log` entries for this branch's tenant_id

*Right (1/3):*

*Branch Info card:*
- All metadata: address, phone, email, website, currency, branch code

*Branch Admin card:*
- Admin avatar (64px) + name + role badge
- "Change Admin" button → select new admin from members
- "Send Message to Admin" button → opens member messaging with admin pre-selected

*Comparative Stats card:*
- Compares this branch vs the parent church and other branches:
  - Members: this branch count vs average across all branches (mini horizontal bar)
  - Giving per Member: this branch vs average (mini horizontal bar)
  - Attendance Rate: this branch vs average (mini horizontal bar)

*Branch Settings card:*
- Toggle: "Show in Church Directory" (toggle)
- Toggle: "Allow Branch Self-Registration" (members can join this branch via the branch's unique access code)
- Branch Access Code (read-only display + copy button + "Regenerate" button)
- Branch QR Code (`qrcode.react` pointing to `vestry.app/join/{branch-access-code}`)

---

### 3D. Consolidated Reporting across Branches

Add a "Consolidated View" toggle at the top of the `/reports` page (only visible if the church has at least one branch):
- When OFF (default): reports show data only for the current church
- When ON: reports aggregate data across the current church + all its branches
- When ON: show a branch filter multi-select (All Branches / select specific branches) so admins can compare branch-by-branch

---

## PART 4 — MEMBER PORTAL

The Member Portal is a completely separate authenticated experience for church members. It is NOT the admin dashboard. Members access it at `/member` after logging in with their own credentials.

**Key distinction:**
- Admin dashboard (`/dashboard`, `/members`, etc.) = for church staff and admins
- Member Portal (`/member/*`) = for regular congregation members

---

### 4A. Member Portal Auth Flow

**Member Sign-In Page (`/member/login`):**
- Standalone page (no AppLayout — completely separate layout)
- Church logo (pulled from church slug if known, or Vestry logo)
- "Welcome to {Church Name}" heading
- Sign in options: Email + Password / Google OAuth / Phone OTP
- "Join a Church" link → `/member/join`
- "Forgot Password" link

**Join a Church (`/member/join`):**
- Standalone page
- "Enter your church access code" heading
- Large input field for the church access code (the one generated during onboarding)
- OR "Scan QR Code" button (opens camera — on mobile devices — to scan the church QR code)
- On valid code: shows church name + logo + "Join {Church Name}" confirmation button
- On confirm: INSERT into `role_permissions` ~~(spec said `role_permissions`)~~ table with `role = 'member'` + INSERT into `members` table (basic profile) + INSERT into `activity_log` type `new_member`
- Redirects to `/member/profile-setup` to complete their profile

**Profile Setup (`/member/profile-setup`):**
- One-time setup after joining
- Fields: Profile Photo (upload), First Name, Last Name, Date of Birth, Gender, Phone, Address
- "Complete Setup" button → UPDATE `members` row + UPDATE `profiles` row → redirect to `/member`

---

### 4B. Member Portal Layout

Create a completely separate layout component `MemberPortalLayout.tsx` that wraps all `/member/*` routes.

**Bottom navigation bar (mobile-first — fixed bottom, full width):**
- 5 nav items: Home / Give / Events / Messages / Profile
- Each: icon (Lucide, 24px) + label below in `text-xs`
- Active item: indigo icon + indigo label + subtle top border accent

**Top bar (mobile, sticky):**
- Church logo (left) + church name (center) + notification bell with unread count badge (right)
- Height: 56px, `bg-white dark:bg-slate-900`, bottom border

**Desktop sidebar (shown on `lg+` breakpoint, 220px):**
- Church logo + name at top
- Full nav list (vertical):
  - Home, Give Online, Events, Sermons, Bible, Announcements, Messages, My Groups, My Giving, My Requests, Testimonies, Settings
- User avatar + name + "Sign Out" at bottom

**Main content area:**
- `overflow-y-auto`, `pb-20` (padding for bottom nav on mobile), `p-4`

---

### 4C. Member Portal Pages

---

**Home (`/member`) — Member Dashboard:**

**Page title:** `Home — Vestry`

*Welcome section:*
- "Good morning, {firstName} 👋" greeting (time-based: morning/afternoon/evening)
- Church name + "Member since {date}" in `text-sm text-slate-500`
- Profile completion bar (if profile is < 100% complete): "Complete your profile — X% done" → links to profile settings

*Verse of the Day card:*
- Random Bible verse (pulled from a curated list of 365 verses in a constants file, selected by day of year)
- Verse text in `text-base italic`
- Reference in `text-sm text-indigo-600 font-medium`
- Share button (copies verse text to clipboard)

*Announcements carousel:*
- Horizontal scroll row of the latest 5 active announcements for this church
- Each card: category badge + title + posted date + "Read" button
- Pinned announcements shown first

*Upcoming Events section:*
- List of next 3 upcoming events for this church where `show_on_public_page = true`
- Each: event banner thumbnail + name + date/time + location + "RSVP" button
- "View All Events" link

*Quick Actions row:*
- Four large icon buttons in a `grid-cols-4 gap-3`:
  - Give (indigo, `Heart` icon)
  - Pray (violet, `HandHeart` icon) → opens prayer request form
  - Events (amber, `CalendarDays` icon)
  - Messages (emerald, `MessageCircle` icon)

*Latest Sermon card:*
- Most recently published sermon from `studio_media` for this church
- Thumbnail + title + speaker + duration
- "Play" button → opens `<MediaLightbox>` with the audio/video player

*My Groups section (if member belongs to groups):*
- Horizontal scroll row of group cards: group name + type + next meeting date
- "View All" link to `/member/groups`

---

**Give Online (`/member/give`):**

**Page title:** `Give Online — Vestry`

Full-width giving form (no sidebars — centered, max-w-md, card style):

- Church logo + "Give to {Church Name}" heading
- **Amount** — large number input with currency symbol prefix. Quick amount buttons above: suggested amounts (e.g. KSh 500 / KSh 1,000 / KSh 2,500 / KSh 5,000 / Custom)
- **Giving Category** (select: Tithe / Offering / Building Fund / Welfare / Missions / Other)
- **Giving Frequency** (radio: One-Time / Weekly / Monthly)
- **Payment Method** (select based on what's connected in church integrations):
  - M-Pesa: shows phone number input (pre-filled from member profile) — on submit triggers M-Pesa STK push via Edge Function
  - Card: shows Stripe Elements card input
  - Cash: shows "Record cash giving — bring your envelope on Sunday" note
- **Dedication / Note** (text input, optional — e.g. "In memory of John")
- **"Give {amount}" button** (indigo, full width, large)

**On successful giving:**
- INSERT into `giving_records` ~~(spec said `giving_records`)~~ table with `member_id` of the current member
- Show a full-screen success state:
  - Green checkmark animation (CSS keyframe)
  - "Thank you for your generosity! 🙏"
  - Amount + category + date
  - "Download Receipt" button
  - "Give Again" button

**My Giving History (below the form):**
- Last 5 giving_records table: Date / Category / Amount / Payment Method / Receipt icon
- "View All Giving History" link → `/member/giving-history`

**Giving History Page (`/member/giving-history`):**
- Full `<DataTable>` of member's own giving_records:
  - Columns: Date, Category, Amount, Payment Method, Receipt
  - Filter: date range, category
- Annual Giving Summary: total given per year (last 3 years) in stat cards
- "Download Annual Giving Statement" button → generates PDF receipt showing all giving_records for the year

---

**Events (`/member/events`):**

**Page title:** `Events — Vestry`

Filter chips: All / Upcoming / Past + event type filter chips

`grid-cols-1 md:grid-cols-2 gap-4` of event cards:

Each event card (member-facing style — cleaner than admin):
- Banner image (or indigo gradient)
- Date badge (top-left overlay): month abbreviation + day number
- Event name in `font-semibold`
- Time + location (with map pin icon)
- RSVP count: "X attending"
- RSVP button:
  - If not RSVPd: "RSVP" button (indigo)
  - If RSVPd: "✓ Going" button (emerald, click to cancel RSVP)
  - If capacity full: "Event Full" (disabled, slate)

**RSVP action:**
- On "RSVP": INSERT into `event_rsvps` table with `member_id` + `status = 'confirmed'` (or `pending` if approval required) + INSERT into `activity_log`
- On cancel: UPDATE `event_rsvps.status = 'cancelled'`
- Show `toast.success("You're going to {event name}!")`

**Event Detail (`/member/events/:eventId`):**
- Full event info: banner, name, description, date/time, location (Google Maps embed), organizer
- RSVP button (prominent)
- Share button (Web Share API → shares event URL)
- Attendees count + "X of your group members are going" (if the member is in groups)

---

**Sermons (`/member/sermons`):**

**Page title:** `Sermons — Vestry`

Identical to the admin `/sermons` page but read-only (no upload/manage actions). Members can browse and play sermons. Same filter bar, same card grid, same series section.

Series browsing: horizontal scroll row of series cards. Click → filters to that series.

Sermon Detail (`/member/sermons/:sermonId`): same as admin version but without edit/delete actions.

---

**Bible (`/member/bible`):**

Identical to the admin `/bible-explorer` page. All features available (read, search, highlight, notes, favorites). No admin-specific actions needed. All data (notes, highlights, favorites) is per-user so members see only their own.

---

**Announcements (`/member/announcements`):**

**Page title:** `Announcements — Vestry`

List of active announcements for this church that are visible to `all_members` or to groups this member belongs to:

- Filter chips: All / General / Service / Event / Finance / Urgent
- Pinned announcements at top (with 📌 indicator)
- Each announcement card (read-only member view):
  - Category badge + title + body (full, not truncated) + author + date
  - Attachments (download links)
  - View count increment: when a member opens an announcement, UPDATE `announcements.view_count + 1`

---

**Messages (`/member/messages`):**

Identical in layout to the admin Member Messaging page (`/member-messaging`) but from the member's perspective. Members can:
- View conversations with staff members
- Send messages to staff
- Cannot initiate conversations with other members (only staff can initiate)
- Real-time via Supabase Realtime (same `messages` table, same `conversations` table)

The left panel shows all conversations the member is a participant in. The middle panel shows the chat. The right panel shows info about the staff member they're chatting with.

---

**My Groups (`/member/groups`):**

List of groups this member belongs to:

`grid-cols-1 md:grid-cols-2 gap-4`

Each group card:
- Group name + type badge + color accent
- "Led by {leader name}" + leader avatar
- Next meeting: day + time + location
- Member count
- "View Group" button

Group Detail (`/member/groups/:groupId`):
- Group info (name, description, meeting schedule, location)
- Members list (avatars + names of fellow group members)
- Recent group activity (from `activity_log` filtered to `group_id`)
- Note: members cannot manage the group (no add/remove members — admin only)

---

**My Profile (`/member/profile`):**

**Page title:** `My Profile — Vestry`

Two-section layout:

*Profile section:*
- Large avatar (96px) with "Change Photo" overlay on hover → opens file picker → uploads to Supabase Storage `member-avatars/{tenant_id}/{member_id}/`
- Name in `text-2xl font-bold`
- Member since date + Church name + access code display
- QR code of member's unique member ID (for check-in at services)

*Editable profile form (below):*
- All personal fields (same as admin's member form but self-service): First Name, Last Name, Date of Birth, Gender, Marital Status, Phone, Secondary Phone, Email, Physical Address, City
- "Save Changes" button → PATCH `members` row + `profiles` row
- Show `toast.success("Profile updated successfully")`

*My Church section:*
- Church name + logo + access code (read-only)
- "Leave Church" button (red outline, bottom of section) → confirmation dialog "Are you sure you want to leave {church name}? You will lose access to all church content." → on confirm: UPDATE `role_permissions.status = 'inactive'` + redirect to `/member/join`

---

**Member Requests (`/member/requests`):**

**Page title:** `My Requests — Vestry`
**Header actions:** "Submit a Request" button

Member's own requests (filtered by `member_id = currentMember.id`):

List of request cards (not a table — card style for member-facing):
- Each card: request type icon + title + status badge + submitted date + assigned staff (if any) + last updated
- Clicking a card opens the request detail (read-only for the member — they can see status updates but not internal staff notes)

**Submit Request form (Sheet):**
Fields:
- Request Type (select: Prayer / Counselling / Visitation / Financial Aid / Medical Support / Bereavement / General)
- Title (text input, required, max 100 chars)
- Description (textarea, required, min 20 chars)
- Priority (select: Low / Medium / High / Urgent)
- Is Confidential (toggle)
- Attachments (file upload, optional)

On submit: INSERT into `member_requests` table with `member_id = currentMember.id` + `tenant_id = currentChurchId` + INSERT into `activity_log` + send in-app notification to all staff admins

---

**Testimonies (`/member/testimonies`):**

Two tabs:

*Published tab:*
- Feed of all published testimonies for this church (same card style as admin testimonies page but read-only)
- Filter by category

*My Testimonies tab:*
- List of testimonies submitted by this member (pending / published / rejected)
- "Share a Testimony" button → opens Sheet form:
  - Title (required)
  - Category (select)
  - Body (rich textarea)
  - Share Anonymously (toggle)
  - Date (date picker)
  - Media uploads (up to 3 images)
  - Submit → INSERT into `testimonies` with `status = 'pending'` + INSERT into `activity_log`
  - Show `toast.success("Thank you! Your testimony has been submitted for review.")`

---

**Settings (`/member/settings`):**

Simple settings page with two sections:

*Account section:*
- Change Password (current password + new password + confirm — calls `supabase.auth.updateUser`)
- Change Email (new email input — calls `supabase.auth.updateUser`)
- Connected accounts (Google OAuth status)
- Delete Account button (red, destructive — with multi-step confirmation dialog)

*Notifications section:*
- Toggle: Announcements (in-app)
- Toggle: Event Reminders (in-app)
- Toggle: Message Notifications (in-app)
- Toggle: Giving Receipts (email)
- Toggle: Weekly Digest (email)
- Saves to `notification_preferences` table (same table as admin notification prefs, just different columns)

*Church section:*
- Current church display
- "Switch Church" button (if member belongs to multiple tenants) → shows list of all their tenants + "Make Active" button per church
- "Join Another Church" button → links to `/member/join`

---

## PART 5 — DATABASE MIGRATIONS FOR PHASE 9
```sql
-- BRANCHES TABLE (branches are child tenants)
-- No new table needed — branches use the existing `tenants` ~~(spec said `tenants`)~~ table
-- Add parent_tenant_id column to tenants table:
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_code TEXT,
  ADD COLUMN IF NOT EXISTS branch_banner_url TEXT,
  ADD COLUMN IF NOT EXISTS is_branch BOOLEAN DEFAULT false;

CREATE INDEX idx_churches_parent ON tenants(parent_tenant_id);

-- SAVED REPORTS TABLE
CREATE TABLE saved_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  data_source TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage saved reports"
  ON saved_reports FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin')
  ));

-- MEMBER PORTAL SESSIONS TABLE
-- Track which church a member is actively viewing
-- (handled client-side via context + localStorage, no new table needed)

-- PRAYER REQUESTS TABLE (for the quick "Pray" action on member portal home)
CREATE TABLE prayer_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  request TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  is_answered BOOLEAN DEFAULT false,
  answered_notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','answered','archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage their own prayer requests"
  ON prayer_requests FOR ALL
  USING (member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  ));
CREATE POLICY "Staff can view all prayer requests"
  ON prayer_requests FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- MEMBER NOTIFICATION PREFERENCES (extend existing table)
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS inapp_announcements BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_event_reminders BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_messages BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_giving_receipts BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_weekly_digest_member BOOLEAN DEFAULT false;

-- ANNUAL GIVING STATEMENTS VIEW
CREATE OR REPLACE VIEW member_annual_giving AS
  SELECT
    d.member_id,
    d.tenant_id,
    EXTRACT(YEAR FROM d.given_at) AS year,
    SUM(d.amount) AS total_given,
    COUNT(*) AS donation_count,
    MIN(d.given_at) AS first_donation,
    MAX(d.given_at) AS last_donation
  FROM giving_records d
  WHERE d.member_id IS NOT NULL
  GROUP BY d.member_id, d.tenant_id, EXTRACT(YEAR FROM d.given_at);

-- BRANCH COMPARATIVE STATS VIEW
CREATE OR REPLACE VIEW branch_stats AS
  SELECT
    c.id AS tenant_id,
    c.name AS church_name,
    c.parent_tenant_id,
    c.is_branch,
    c.branch_code,
    (SELECT COUNT(*) FROM members m WHERE m.tenant_id = c.id AND m.status = 'active') AS active_members,
    (SELECT COALESCE(SUM(d.amount), 0) FROM giving_records d
     WHERE d.tenant_id = c.id
     AND date_trunc('month', d.given_at) = date_trunc('month', now())) AS giving_this_month,
    (SELECT COUNT(*) FROM services s
     WHERE s.tenant_id = c.id
     AND date_trunc('month', s.service_date::TIMESTAMPTZ) = date_trunc('month', now())) AS services_this_month,
    (SELECT COUNT(*) FROM groups g WHERE g.tenant_id = c.id AND g.is_active = true) AS active_groups
  FROM tenants c;

-- MEMBER RSVP HELPER FUNCTION
CREATE OR REPLACE FUNCTION toggle_event_rsvp(
  p_event_id UUID,
  p_member_id UUID,
  p_tenant_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  existing_rsvp event_rsvps%ROWTYPE;
  result JSONB;
BEGIN
  SELECT * INTO existing_rsvp
  FROM event_rsvps
  WHERE event_id = p_event_id AND member_id = p_member_id;

  IF existing_rsvp.id IS NULL THEN
    INSERT INTO event_rsvps (event_id, tenant_id, member_id, status, rsvp_source)
    VALUES (p_event_id, p_tenant_id, p_member_id, 'confirmed', 'self')
    RETURNING to_jsonb(event_rsvps.*) INTO result;
    RETURN jsonb_build_object('action', 'rsvped', 'rsvp', result);
  ELSE
    UPDATE event_rsvps
    SET status = CASE WHEN status = 'confirmed' THEN 'cancelled' ELSE 'confirmed' END
    WHERE id = existing_rsvp.id
    RETURNING to_jsonb(event_rsvps.*) INTO result;
    RETURN jsonb_build_object('action', 'toggled', 'rsvp', result);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- MEMBER SELF-CHECKIN FUNCTION (for QR code self-check-in at services)
CREATE OR REPLACE FUNCTION self_checkin(
  p_service_id UUID,
  p_phone TEXT
) RETURNS JSONB AS $$
DECLARE
  found_member members%ROWTYPE;
  found_service services%ROWTYPE;
BEGIN
  SELECT * INTO found_service FROM services WHERE id = p_service_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Service not found');
  END IF;

  SELECT * INTO found_member
  FROM members
  WHERE phone = p_phone AND tenant_id = found_service.tenant_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No member found with this phone number');
  END IF;

  INSERT INTO attendance_records (tenant_id, reference_type, reference_id, member_id, member_name, member_phone, is_present, check_in_method)
  VALUES (found_service.tenant_id, 'service', p_service_id, found_member.id, found_member.first_name || ' ' || found_member.last_name, p_phone, true, 'self_checkin')
  ON CONFLICT (reference_type, reference_id, member_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Checked in successfully',
    'member_name', found_member.first_name || ' ' || found_member.last_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## PART 6 — ROUTING ADDITIONS FOR PHASE 9

Add these routes to the React Router v6 configuration. Member Portal routes use `MemberPortalLayout` instead of `AppLayout`. They are protected by a `MemberAuthGuard` that checks for a valid session AND that the user has at least one `role_permissions` ~~(spec said `role_permissions`)~~ row (i.e. they have joined a church).