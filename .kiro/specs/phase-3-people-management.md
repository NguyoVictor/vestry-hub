Noted — the app is **Vestry** from here on. All previous prompts should mentally replace "Church Central Cloud" with **Vestry** and the domain with `vestry.app` (or whatever your actual domain is).

Here is your **Phase 3 prompt** — People Management:

---

## 🏗️ Lovable Prompt — Phase 3: People Management

---

**CONTEXT — What already exists, do not rebuild:**

This is **Vestry**, a multi-tenant Church SaaS platform. The following phases are already complete:
- Phase 0: Supabase Auth (OAuth + email/password), onboarding, church access code + QR code generation
- Phase 1: Full `AppLayout` (collapsible sidebar, top navbar, dark mode), `AuthGuard`, Dashboard Overview (KPI cards, charts, activity feed, events widget, donations table), all routes scaffolded as placeholders
- Phase 2: Full Settings page with all 8 sub-sections (Church Profile, Services & Modules, Roles & Permissions, Notifications, Billing, Security, Integrations, SEO & Public Page), public church page at `/church/:slug`, all SEO infrastructure, all database migrations from Phases 1–2

**Do not touch any of the above. This phase replaces the placeholder pages for the People section only:**
`/members`, `/groups`, `/house-fellowships`, `/families`, `/visitors`, `/follow-up-tasks`, `/new-converts`

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
- `date-fns` (date formatting)
- `papaparse` (CSV import/export)

---

### PART 1 — SHARED COMPONENTS FOR PEOPLE MODULE

Before building individual pages, create these reusable components that will be used across all People pages:

**`<DataTable>` component (`src/components/shared/DataTable.tsx`):**
A fully reusable table component built on top of shadcn `Table` that supports:
- Column definitions passed as props (header label, accessor key, optional custom cell renderer)
- Built-in search input (filters rows client-side across all string columns)
- Column-level sorting (click header to sort asc/desc, toggle, show sort icon)
- Pagination (10 / 25 / 50 / 100 rows per page selector + prev/next buttons + "Showing X–Y of Z results")
- Row selection via checkboxes (select individual rows or select all on current page)
- Bulk action bar that appears above the table when rows are selected (slot for bulk action buttons passed as prop)
- Filter chips row below the search bar (passed as prop, rendered as dismissible badges)
- Loading state: show skeleton rows (same column structure, animated pulse)
- Empty state: centered icon + message + optional CTA button (all passed as props)
- Export selected / export all button (triggers CSV download via `papaparse`)
- Responsive: on mobile, show a card-based list view instead of a table (each row becomes a card with key fields visible)

**`<MemberAvatar>` component:**
- Props: `name: string`, `avatarUrl?: string`, `size?: 'sm' | 'md' | 'lg'` (default md = 36px)
- If `avatarUrl` provided: show circular image
- If not: show initials (first letter of first name + first letter of last name) on an indigo background, white text
- Sizes: sm=24px, md=36px, lg=64px

**`<StatusBadge>` component:**
- Props: `status: string`
- Maps status strings to colored badges:
  - `active` → emerald
  - `inactive` → slate
  - `invited` → amber
  - `pending` → yellow
  - `completed` → emerald
  - `in_progress` → blue
  - `overdue` → red
  - `visitor` → violet
  - `convert` → indigo

**`<PageHeader>` component (update if needed):**
- Already exists from Phase 1 — ensure it accepts: `title`, `subtitle`, `actions` (ReactNode slot for buttons on the right), `breadcrumb` (optional array of `{label, href}`)

**`<FilterSidebar>` component:**
- A right-side drawer (shadcn `Sheet`) for advanced filtering
- Props: filter field definitions (label, type: select/date-range/checkbox-group/number-range, options)
- Renders the appropriate input for each filter field
- "Apply Filters" + "Clear All" buttons
- Number of active filters shown as a badge on the "Filters" trigger button

---

### PART 2 — MEMBERS PAGE (`/members`)

This is the most important page in the People module. It is a full membership management system.

---

**Page title (react-helmet-async):** `Members — Vestry`

**PageHeader:** "Members" / "Manage your church membership database"
**Header actions:** "Import Members" button (secondary) + "Add Member" button (primary, indigo)

---

**MEMBERS TABLE VIEW (default view):**

Use the `<DataTable>` component with the following columns:

| Column | Content | Sortable |
|--------|---------|----------|
| Checkbox | Row selection | — |
| Member | `<MemberAvatar>` + full name (bold) + email below in `text-xs text-slate-500` | ✅ (by name) |
| Phone | Phone number | ❌ |
| Group | Badge showing primary group name (or "—" if none) | ✅ |
| Status | `<StatusBadge status={member.status}>` | ✅ |
| Join Date | Formatted as "12 Mar 2024" using `date-fns format` | ✅ |
| Actions | Three-dot `DropdownMenu`: View Profile, Edit, Send Message, Remove from Church | — |

**Above the table — toolbar row:**
- Search input (placeholder: "Search by name, email or phone...") — filters client-side
- "Filters" button with active filter count badge — opens `<FilterSidebar>`
- View toggle: Table view icon / Card view icon (toggle between table and card grid)
- Export button: exports current filtered + selected members as CSV

**Filter sidebar fields for Members:**
- Status: checkbox group (Active, Inactive, Pending)
- Group: multi-select dropdown (all groups for this church)
- Gender: checkbox group (Male, Female, Other, Prefer not to say)
- Join Date: date range picker (from / to)
- Age Range: number range slider (min 0, max 100)
- Has Family: Yes / No toggle
- Baptized: Yes / No toggle

**Card grid view (alternate view):**
- `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`
- Each card: `<MemberAvatar size="lg">` centered at top, name in `font-semibold text-center`, role/group badge centered, status badge, phone + email in `text-xs text-slate-500 text-center`, three-dot menu in top-right corner

---

**ADD MEMBER — Modal/Drawer:**

Triggered by "Add Member" button. Opens a shadcn `Sheet` from the right (not a modal — use a sheet for forms this size). Width: `max-w-lg`.

**Form sections:**

*Personal Information:*
- Profile Photo — upload component (circular preview, upload to Supabase Storage `member-avatars/{church_id}/{member_id}`)
- First Name (required), Last Name (required)
- Date of Birth (date picker) — auto-calculates age display
- Gender (select: Male / Female / Other / Prefer not to say)
- Marital Status (select: Single / Married / Divorced / Widowed)
- Nationality (text input)
- ID / Passport Number (text input, optional)

*Contact Information:*
- Phone Number (with country code selector, required)
- Secondary Phone (optional)
- Email Address (email input, optional)
- Physical Address (textarea)
- City, Country (text inputs)

*Church Information:*
- Member Status (select: Active / Inactive / Pending) — default Active
- Join Date (date picker, default today)
- Baptized (Yes/No toggle)
- Baptism Date (date picker, shown only if Baptized = Yes)
- Primary Group (select from existing groups for this church)
- Secondary Groups (multi-select)
- Department/Ministry (text input)
- Skills / Gifts (tag input)
- Notes (textarea, for internal staff notes)

**Form validation (Zod schema):**
- First name: required, min 2 chars
- Last name: required, min 2 chars
- Phone: required, valid phone format
- Email: valid email format if provided
- Date of birth: must be in the past, person must be at least 0 years old

**Submit behavior:**
- INSERT into `members` table
- If group selected: INSERT into `group_members` table
- INSERT into `activity_log`: `{action_type: 'new_member', description: '{name} was added as a member', actor_name: currentUser.name}`
- Invalidate `['members', churchId]` query
- Show `toast.success("{name} added to Vestry")`
- Close the sheet
- The new member row appears at the top of the table

---

**MEMBER PROFILE PAGE (`/members/:memberId`):**

Clicking "View Profile" from the members table navigates to this full page (not a modal).

**Layout:** Two-column: left sidebar profile card (1/3 width) + right tabbed content area (2/3 width)

**Left profile card:**
- Large avatar (96px) with "Change Photo" overlay on hover
- Full name in `text-2xl font-bold`
- Status badge + Member since date
- Quick stats row: Age, Group count, Attendance %
- Contact info block: phone (with WhatsApp icon link), email (mailto link), address
- "Edit Member" button (full width, outline)
- "Send Message" button (full width, indigo)
- Danger zone at bottom: "Deactivate Member" (amber) / "Remove from Church" (red destructive)

**Right tabbed content (`Tabs` from shadcn):**

*Overview tab:*
- Activity timeline (last 10 activity log entries for this member): icon + description + date, most recent first
- Upcoming events they've RSVPd to (if events module enabled)
- Notes section (staff notes, with add note form inline)

*Groups tab:*
- List of groups this member belongs to with join date + role (Member / Leader)
- "Add to Group" button → select group dropdown + submit
- Remove from group button on each row (with confirmation)

*Giving tab (shown only if Finance module enabled):*
- Total given (all time) in large `font-bold text-2xl text-emerald-600`
- This year total, this month total
- Giving history table: Date, Amount, Category, Payment Method
- Area chart of monthly giving for last 12 months (Recharts)

*Attendance tab:*
- Attendance percentage (circular progress indicator)
- Attendance history: list of services with present/absent badges
- "Mark Attendance" button (opens service selector)

*Family tab:*
- Shows linked family members with relationship labels (Spouse, Child, Parent, Sibling)
- "Link Family Member" button → search existing members + select relationship

*Documents tab:*
- Upload and store member documents (ID copy, baptism certificate, membership form)
- Each document: filename, upload date, download button, delete button
- Upload to Supabase Storage `member-documents/{church_id}/{member_id}/`

---

**EDIT MEMBER:**
Same form as Add Member but pre-filled. Opens as a Sheet. Submit PATCHes the `members` row.

---

**IMPORT MEMBERS (CSV):**

Triggered by "Import Members" button. Opens a `Dialog` modal.

Steps (wizard-style, 3 steps):

*Step 1 — Upload:*
- Drag and drop zone + "Browse files" button
- Accepts `.csv` files only
- Download CSV template button (generates a sample CSV with correct column headers)
- Template headers: `first_name, last_name, email, phone, date_of_birth, gender, status, join_date, group_name, baptized`

*Step 2 — Preview & Map:*
- Parse the CSV using `papaparse`
- Show a preview table of the first 5 rows
- Column mapping UI: for each CSV column detected, a select dropdown to map it to a Vestry member field (or "Skip this column")
- Show validation errors inline (e.g. "Row 3: invalid email format", "Row 7: missing required first_name")
- Show counts: X rows valid, Y rows with errors (errors will be skipped)

*Step 3 — Import:*
- "Import X Members" button
- Progress bar as rows are inserted (batch insert 50 at a time via Supabase)
- On complete: show summary "Successfully imported X members. Y rows skipped due to errors."
- Download error report button (CSV of skipped rows + reason)
- "Done" closes modal and refreshes members table

---

### PART 3 — GROUPS PAGE (`/groups`)

**Page title:** `Groups — Vestry`
**PageHeader:** "Groups" / "Organize your members into ministry groups"
**Header actions:** "Create Group" button (primary)

**Groups list view:**
- Card grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Each group card:
  - Group color indicator (left border, color chosen when creating group)
  - Group name in `font-semibold text-lg`
  - Group type badge (e.g. Ministry / Cell Group / Department / Choir / Youth / Children)
  - Group leader avatar + name ("Led by {name}" or "No leader assigned")
  - Member count: `{count} members` with a small avatars stack (up to 4 overlapping `<MemberAvatar size="sm">` + "+X more" if over 4)
  - Meeting schedule: e.g. "Wednesdays · 6:00 PM"
  - Three-dot menu: View Group, Edit, Delete (with confirmation)
  - "View Group" button at the bottom of the card

**Create / Edit Group — Sheet form:**

Fields:
- Group Name (required, max 100 chars)
- Group Type (select: Ministry / Cell Group / Department / Choir / Youth / Children / Other)
- Description (textarea, max 300 chars)
- Group Color (color picker — 10 preset colors: indigo, emerald, amber, red, violet, pink, cyan, orange, teal, slate — shown as clickable color dots)
- Group Leader (searchable select from `members` table — type to search by name)
- Meeting Day (select: days of week, or "No fixed meeting day")
- Meeting Time (time input)
- Meeting Location (text input)
- Is Active (toggle, default on)

**Group Detail Page (`/groups/:groupId`):**

**Layout:** PageHeader with group name + group type badge + member count. Below: two tabs.

*Members tab:*
- `<DataTable>` of group members with columns: Member (avatar + name), Role (Member / Leader — inline editable select), Join Date, Actions (Remove from group)
- "Add Member to Group" button → searchable select of all church members not already in this group → on select: INSERT into `group_members`
- "Promote to Leader" / "Demote to Member" in row actions

*Details tab:*
- Group info card (description, meeting schedule, location)
- "Edit Group" button
- Attendance history for group meetings (if Services module enabled)
- Recent activity for this group (from `activity_log` filtered by `group_id`)

---

### PART 4 — HOUSE FELLOWSHIPS PAGE (`/house-fellowships`)

**Page title:** `House Fellowships — Vestry`
**PageHeader:** "House Fellowships" / "Track and manage home cell groups"
**Header actions:** "Add Fellowship" button

Very similar structure to Groups but with location-specific fields.

**House Fellowships list — table view:**

`<DataTable>` with columns: Fellowship Name, Zone/Area, Host Name, Host Address, Leader, Members Count, Meeting Day/Time, Status, Actions

**Create / Edit Fellowship — Sheet form:**

Fields:
- Fellowship Name (required)
- Zone / Area (text input — e.g. "Westlands Zone", "Karen Zone")
- Host Name (text input — the person hosting in their home)
- Host Address (textarea — physical address of the meeting location)
- Fellowship Leader (searchable select from `members`)
- Meeting Day + Time
- Maximum Capacity (number input)
- Is Active (toggle)
- Notes (textarea)

**Fellowship Detail Page (`/house-fellowships/:fellowshipId`):**

- Members list with add/remove functionality (same as Group Detail)
- Attendance tracking per meeting: table of meeting dates with attendance count, "Record Attendance" button that opens a checklist of all fellowship members to mark present/absent
- Map embed (Google Maps iframe using host address)
- Edit + Delete actions

---

### PART 5 — FAMILIES PAGE (`/families`)

**Page title:** `Families — Vestry`
**PageHeader:** "Families" / "Link members together as family units"
**Header actions:** "Create Family" button

**Families list — table view:**

`<DataTable>` with columns: Family Name, Family Head (avatar + name), Members (overlapping avatars + count), Last Updated, Actions

**Create Family — Sheet form:**

Fields:
- Family Name (required — e.g. "The Kamau Family")
- Family Head (searchable select from `members`)
- Add Family Members (multi-select search — type member name, add multiple)
- For each added member: select their relationship to the Family Head (Spouse / Child / Parent / Sibling / Other)

**Family Detail Page (`/families/:familyId`):**

- Family tree style display: Family Head at center, connected to other members with relationship labels
- Simple visual: not a complex D3 tree — just a clean CSS flex layout showing:
  - Family Head card (large, centered at top)
  - Below: row of linked member cards with relationship label badge below each
- "Add Member to Family" button
- "Remove Member" on each member card (with confirmation)
- Edit family name inline (click to edit)

---

### PART 6 — VISITORS PAGE (`/visitors`)

**Page title:** `Visitors — Vestry`
**PageHeader:** "Visitors" / "Log and follow up with people who have visited your church"
**Header actions:** "Log Visitor" button

**Visitors table:**

`<DataTable>` with columns: Visitor (avatar + name), Phone, Email, Visit Date, Visit Source (how they heard: Friend / Social Media / Walk-in / Event / Online), Follow-up Status (`<StatusBadge>`), Assigned To (staff member), Actions

**Follow-up Status values:**
- `not_contacted` → slate ("Not Contacted")
- `contacted` → blue ("Contacted")
- `follow_up_scheduled` → amber ("Follow-up Scheduled")
- `converted` → emerald ("Converted to Member")
- `not_interested` → red ("Not Interested")

**Log Visitor — Sheet form:**

Fields:
- First Name, Last Name (required)
- Phone (required), Email (optional)
- Visit Date (date picker, default today)
- Visit Source (select: Friend Referral / Social Media / Walk-in / Church Event / Online Search / Other)
- Service Attended (select from recent services if Services module enabled, otherwise text input)
- Notes (textarea — first impressions, prayer requests, etc.)
- Assign Follow-up To (select from church staff members — from `church_members` where role = admin or staff)
- Follow-up Due Date (date picker)

**"Convert to Member" action:**
- Available on each visitor row via three-dot menu
- Opens a confirmation dialog: "Convert {name} to a full member?"
- On confirm: INSERT into `members` table pre-filled with visitor's data, UPDATE visitor `status = 'converted'`, INSERT into `activity_log`
- Show `toast.success("{name} has been converted to a member")`
- The visitor row shows "Converted" badge and the "Convert" action becomes disabled

**Visitor Detail — side panel (Sheet):**
Opens on row click. Shows:
- Visitor info (all fields)
- Follow-up history timeline: each time someone updated the status or added a note, shown as a timeline entry
- Add follow-up note inline form (textarea + submit)
- "Convert to Member" button at the bottom

---

### PART 7 — FOLLOW-UP TASKS PAGE (`/follow-up-tasks`)

**Page title:** `Follow-Up Tasks — Vestry`
**PageHeader:** "Follow-Up Tasks" / "Assign and track member and visitor follow-ups"
**Header actions:** View toggle (Kanban / Table) + "Create Task" button

---

**KANBAN VIEW (default):**

Four columns in a horizontal scrollable layout:
- **To Do** (slate header)
- **In Progress** (blue header)
- **Completed** (emerald header)
- **Overdue** (red header — tasks whose due date has passed and are not completed, auto-populated)

Each column:
- Header: column name + task count badge
- Scrollable card list
- "Add Task" button at the bottom of each column

Each task card:
- Task title in `font-medium`
- Linked person (visitor or member): `<MemberAvatar size="sm">` + name
- Due date: formatted, turns red if overdue
- Assigned to: staff avatar + name
- Priority badge (Low / Medium / High / Urgent) — color coded: slate / amber / orange / red
- Tags (small grey chips)
- Drag handle icon on the left

**Drag and drop:** implement using `@dnd-kit/core` + `@dnd-kit/sortable`. Dragging a card between columns updates `follow_up_tasks.status` in Supabase via a mutation.

---

**TABLE VIEW:**

`<DataTable>` with columns: Task Title, Linked Person, Assigned To, Priority (`<StatusBadge>`), Due Date (red if overdue), Status, Created Date, Actions

**Filter sidebar fields:**
- Status: checkbox group
- Priority: checkbox group
- Assigned To: select from staff members
- Due Date: date range
- Overdue only: toggle

---

**CREATE / EDIT TASK — Sheet form:**

Fields:
- Task Title (required, max 200 chars)
- Description (textarea, optional)
- Link to Person: radio — Member or Visitor, then searchable select
- Task Type (select: Phone Call / Home Visit / Prayer / Email / Meeting / Other)
- Priority (select: Low / Medium / High / Urgent)
- Assigned To (select from staff members)
- Due Date (date picker, required)
- Tags (tag input)

**Overdue detection:** a Supabase Edge Function `check-overdue-tasks` runs on a cron schedule (daily at 6:00 AM) — queries all tasks where `status != 'completed'` and `due_date < now()`, sends an in-app notification to the assigned staff member. Implement the Edge Function shell and note in a comment that the cron needs to be registered in Supabase Dashboard.

---

### PART 8 — NEW CONVERTS PAGE (`/new-converts`)

**Page title:** `New Converts — Vestry`
**PageHeader:** "New Converts" / "Manage spiritual growth journeys for new believers"
**Header actions:** "Add Convert" button

**Converts table:**

`<DataTable>` with columns: Convert (avatar + name), Conversion Date, Discipleship Stage (progress indicator), Mentor (avatar + name), Baptism Status, Last Check-in, Actions

**Discipleship Stages (4 stages):**
1. **Foundation** — Basic salvation and church orientation
2. **Growth** — Bible study, prayer life, community integration
3. **Maturity** — Serving, giving, leading small groups
4. **Leadership** — Ready to mentor other converts

Each stage shown as a horizontal step progress bar (1 → 2 → 3 → 4) with the current stage highlighted in indigo.

**Add Convert — Sheet form:**

Fields:
- Link to existing member (searchable select — most converts will already be in the members table) OR add new person (shows first name, last name, phone fields inline)
- Conversion Date (date picker, required)
- Conversion Story / Notes (textarea)
- Assign Mentor (searchable select from members — ideally a mature member)
- Starting Discipleship Stage (select: Foundation / Growth / Maturity / Leadership, default Foundation)
- Baptism Status (select: Not Baptized / Scheduled / Completed)
- Baptism Date (date picker, shown if status = Scheduled or Completed)

**Convert Detail Page (`/new-converts/:convertId`):**

**Layout:** Same two-column layout as Member Profile.

*Left card:*
- Avatar + name
- Discipleship stage progress bar (large, prominent)
- Mentor info with "Change Mentor" button
- Baptism status badge
- Conversion date + "X days in discipleship"
- Quick action: "Advance to Next Stage" button (indigo) + "Mark as Graduated" (emerald, shown when on stage 4)

*Right tabs:*

*Progress tab:*
- Stage history timeline: when they moved from stage to stage, who advanced them, any notes
- "Advance Stage" form (select next stage + add notes + date)
- Current stage description and checklist of recommended actions for this stage

*Check-ins tab:*
- Log of mentor check-ins: date, notes, who conducted it
- "Log Check-in" button → textarea for notes + date picker → INSERT into `convert_checkins` table

*Resources tab:*
- List of discipleship resources assigned to this convert (from Discipleship Resources module)
- Completion status per resource (Not Started / In Progress / Completed)
- "Assign Resource" button

*Notes tab:*
- Shared staff notes (same as Member Profile notes tab)

---

### PART 9 — DATABASE MIGRATIONS FOR PHASE 3

Run these Supabase migrations:

```sql
-- MEMBERS TABLE
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  secondary_phone TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
  nationality TEXT,
  id_number TEXT,
  physical_address TEXT,
  city TEXT,
  country TEXT DEFAULT 'KE',
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  join_date DATE DEFAULT CURRENT_DATE,
  baptized BOOLEAN DEFAULT false,
  baptism_date DATE,
  department TEXT,
  skills TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Church members can view their church's members"
  ON members FOR SELECT
  USING (church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins and staff can manage members"
  ON members FOR ALL
  USING (church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'staff')));
CREATE INDEX idx_members_church_id ON members(church_id);
CREATE INDEX idx_members_status ON members(status);

-- GROUPS TABLE
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'other' CHECK (type IN ('ministry', 'cell_group', 'department', 'choir', 'youth', 'children', 'other')),
  description TEXT,
  color TEXT DEFAULT '#4F46E5',
  leader_id UUID REFERENCES members(id) ON DELETE SET NULL,
  meeting_day TEXT,
  meeting_time TEXT,
  meeting_location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Church members can view groups"
  ON groups FOR SELECT
  USING (church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins and staff can manage groups"
  ON groups FOR ALL
  USING (church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'staff')));

-- GROUP MEMBERS TABLE
CREATE TABLE group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'leader')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, member_id)
);
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Church members can view group members"
  ON group_members FOR SELECT
  USING (church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid()));

-- HOUSE FELLOWSHIPS TABLE
CREATE TABLE house_fellowships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  zone TEXT,
  host_name TEXT,
  host_address TEXT,
  leader_id UUID REFERENCES members(id) ON DELETE SET NULL,
  meeting_day TEXT,
  meeting_time TEXT,
  max_capacity INT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE house_fellowships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Church members can view fellowships"
  ON house_fellowships FOR SELECT
  USING (church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid()));

-- FELLOWSHIP MEMBERS TABLE
CREATE TABLE fellowship_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fellowship_id UUID REFERENCES house_fellowships(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fellowship_id, member_id)
);
ALTER TABLE fellowship_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Church members can view fellowship members"
  ON fellowship_members FOR SELECT
  USING (church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid()));

-- FAMILIES TABLE
CREATE TABLE families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  head_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Church members can view families"
  ON families FOR SELECT
  USING (church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid()));

-- FAMILY MEMBERS TABLE
CREATE TABLE family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('spouse', 'child', 'parent', 'sibling', 'other')),
  UNIQUE(family_id, member_id)
);
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Church members can view family members"
  ON family_members FOR SELECT
  USING (family_id IN (SELECT id FROM families WHERE church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid())));

-- VISITORS TABLE
CREATE TABLE visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  visit_date DATE DEFAULT CURRENT_DATE,
  visit_source TEXT CHECK (visit_source IN ('friend_referral', 'social_media', 'walk_in', 'church_event', 'online_search', 'other')),
  service_attended TEXT,
  notes TEXT,
  follow_up_status TEXT DEFAULT 'not_contacted' CHECK (follow_up_status IN ('not_contacted', 'contacted', 'follow_up_scheduled', 'converted', 'not_interested')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  follow_up_due_date DATE,
  converted_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and staff can manage visitors"
  ON visitors FOR ALL
  USING (church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'staff')));

-- VISITOR FOLLOW-UP NOTES
CREATE TABLE visitor_followup_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE NOT NULL,
  note TEXT NOT NULL,
  status_at_time TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE visitor_followup_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage follow-up notes"
  ON visitor_followup_notes FOR ALL
  USING (visitor_id IN (SELECT id FROM visitors WHERE church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'staff'))));

-- FOLLOW-UP TASKS TABLE
CREATE TABLE follow_up_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  linked_type TEXT CHECK (linked_type IN ('member', 'visitor')),
  linked_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  linked_visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
  task_type TEXT CHECK (task_type IN ('phone_call', 'home_visit', 'prayer', 'email', 'meeting', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'overdue')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  tags TEXT[],
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage follow-up tasks"
  ON follow_up_tasks FOR ALL
  USING (church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'staff')));

-- NEW CONVERTS TABLE
CREATE TABLE new_converts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  conversion_date DATE NOT NULL,
  conversion_notes TEXT,
  mentor_id UUID REFERENCES members(id) ON DELETE SET NULL,
  discipleship_stage INT DEFAULT 1 CHECK (discipleship_stage BETWEEN 1 AND 4),
  baptism_status TEXT DEFAULT 'not_baptized' CHECK (baptism_status IN ('not_baptized', 'scheduled', 'completed')),
  baptism_date DATE,
  graduated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE new_converts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage new converts"
  ON new_converts FOR ALL
  USING (church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'staff')));

-- CONVERT CHECK-INS TABLE
CREATE TABLE convert_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  convert_id UUID REFERENCES new_converts(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  conducted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  checkin_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE convert_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage check-ins"
  ON convert_checkins FOR ALL
  USING (convert_id IN (SELECT id FROM new_converts WHERE church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'staff'))));

-- CONVERT STAGE HISTORY
CREATE TABLE convert_stage_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  convert_id UUID REFERENCES new_converts(id) ON DELETE CASCADE NOT NULL,
  from_stage INT,
  to_stage INT NOT NULL,
  notes TEXT,
  advanced_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  advanced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE convert_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view stage history"
  ON convert_stage_history FOR SELECT
  USING (convert_id IN (SELECT id FROM new_converts WHERE church_id IN (SELECT church_id FROM church_members WHERE user_id = auth.uid())));
```

---

**Build exactly this. Replace the 7 placeholder pages from Phase 1 with fully functional, Supabase-connected pages as described above. Do not modify the AppLayout, Dashboard, or any Settings code from Phases 1 and 2. Install `@dnd-kit/core` and `@dnd-kit/sortable` for the Kanban board, and `papaparse` for CSV import/export if not already installed.**

