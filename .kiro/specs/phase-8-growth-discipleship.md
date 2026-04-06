> ⚠️ **SCHEMA CORRECTION NOTICE** — The table/column names written in this spec are the ORIGINAL spec names and DO NOT match the actual database. Always use `src/lib/schema.ts` TABLES/COLS constants. See `.kiro/specs/schema-correction-notice.md` for the full override list. Quick reference:
> - spec `churches` = actual **tenants** | spec `donations` = actual **giving_records** | spec `church_expenses` = actual **expenses**
> - spec `budget_lines` = actual **budget_categories** | spec `church_seo_settings` = actual **tenant_seo_settings**
> - spec `church_members` = actual **role_permissions** | spec `attendance` = actual **attendance_records**
> - spec `church_id` col = actual **tenant_id** | spec `logo_url` = actual **logo** | spec `donation_date` = actual **given_at**
> - spec `payment_reference` = actual **pesapal_transaction_id** | spec `rsvp_deadline` = actual **registration_deadline**
> - spec `start_datetime` = actual **event_date** | spec `events.status=published` = actual **events.is_published=true**
> - spec `events.capacity` = actual **capacity_limit** | spec `onboarding_complete` = actual **onboarding_completed**

# Phase 8: Growth & Discipleship

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

**Do not touch any of the above. This phase replaces the placeholder pages for the Growth & Discipleship section only:**
`/discipleship`, `/discipleship-resources`, `/outreach`, `/resources-store`, `/training`

All other placeholder pages remain untouched.

---

## TECH STACK (same throughout all phases):
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
- Recharts
- `papaparse`
- `@react-pdf/renderer`
- `react-player`
- `@tiptap/react` + `@tiptap/starter-kit` (already installed from Phase 7)
- Additional libraries to install: `@stripe/stripe-js` + `@stripe/react-stripe-js` (for Resources Store checkout)

---

## PART 1 — SHARED GROWTH & DISCIPLESHIP COMPONENTS

**`<StageProgressBar>` component:**
- Props: `currentStage: number` (1–4), `stages: {label: string, description: string}[]`, `size?: 'sm' | 'md' | 'lg'`
- Horizontal step indicator with 4 numbered circles connected by lines
- Completed stages: filled indigo circle + indigo connecting line
- Current stage: indigo circle with pulse ring animation (`ring-2 ring-indigo-300 ring-offset-2`)
- Future stages: grey circle + grey connecting line
- Below each circle: stage label in `text-xs font-medium` (hidden in `sm` size)
- Size sm: circles 24px, md: 32px, lg: 40px

**`<CourseProgressCard>` component:**
- Props: `course: Course`, `enrollment?: Enrollment`, `onClick: () => void`
- Card showing: course thumbnail, title, category badge, lesson count, completion percentage (progress bar + "X of Y lessons"), instructor avatar + name, difficulty badge (Beginner / Intermediate / Advanced)
- If enrolled: show progress bar + "Continue" button
- If not enrolled: show "Enroll" button
- Duration estimate: "~X hours"

**`<ResourceCard>` component:**
- Props: `resource: DiscipleshipResource`, `onAssign?: () => void`, `onDownload?: () => void`
- Card with: resource type icon (PDF / Video / Audio / Document / Link), title, description excerpt, category badge, file size or duration, assigned count ("Assigned to X converts")
- Action buttons: "View" + "Assign" (if `onAssign` provided) + "Download" (if downloadable)

**`<ProductCard>` component (Resources Store):**
- Props: `product: Product`, `onAddToCart: () => void`
- Card with: product image (square, `object-cover`), product name, category badge, price (`<CurrencyDisplay>`), stock badge (In Stock / Low Stock / Out of Stock), "Add to Cart" button (disabled if out of stock), short description

---

## PART 2 — DISCIPLESHIP DASHBOARD PAGE (`/discipleship`)

**Page title:** `Discipleship Dashboard — Vestry`
**PageHeader:** "Discipleship Dashboard" / "Track spiritual growth journeys for your congregation"
**Header actions:** "Add Convert" button (links to `/new-converts?action=add`) + "View All Converts" button (links to `/new-converts`)

---

**TOP STATS ROW (4 cards):**
- Active Disciples (count of `new_converts` where `graduated_at IS NULL` and linked member is active)
- Graduated This Year (count where `graduated_at >= date_trunc('year', now())`)
- Pending Baptisms (count where `baptism_status = 'scheduled'`)
- Average Days to Graduate (average of `graduated_at - conversion_date` for all graduated converts, formatted as "X days")

All queried from `new_converts` table filtered by `tenant_id`.

---

**SECTION 1 — Stage Overview (full width):**

Card with header "Disciples by Stage"

Four stage columns in a `grid-cols-4 gap-4` layout (stacked to `grid-cols-2` on mobile):

Each stage column:
- Stage number circle (large, 48px, indigo filled for stages with disciples, grey if empty)
- Stage name in `font-semibold` (Foundation / Growth / Maturity / Leadership)
- Stage description in `text-xs text-slate-500`
- Disciple count in `text-3xl font-bold`
- Percentage of total disciples in `text-sm text-slate-400`
- Progress to next stage: "X disciples ready to advance" (count of disciples in this stage who have been here > 30 days and have no check-in in last 14 days — flag for follow-up)
- Mini avatar stack (up to 4 overlapping `<MemberAvatar size="sm">` + "+X more")

Flow arrows between columns (right-pointing `ChevronRight` icon between each stage column, `text-slate-300`)

---

**SECTION 2 — Two-column layout:**

*Left (2/3) — Disciples Requiring Attention:*

Card with header "Needs Attention" + count badge (amber)

Criteria for flagging a disciple:
- No mentor check-in in last 21 days
- Baptism scheduled but date is past
- Stuck in same stage for more than 60 days
- No discipleship resource assigned

`<DataTable>` with columns: Disciple (avatar + name), Stage (`<StageProgressBar size="sm">`), Last Check-in (relative date, red if > 21 days), Mentor (avatar + name or "Unassigned"), Flag Reason (why they're flagged — amber badge), Actions (View Profile / Log Check-in / Advance Stage)

*Right (1/3) — Upcoming Baptisms:*

Card with header "Upcoming Baptisms"

List of converts with `baptism_status = 'scheduled'` ordered by `baptism_date ASC`:
- Each row: convert avatar + name, baptism date (formatted, with countdown: "in 5 days"), assigned mentor avatar
- "Mark as Completed" button on each row → UPDATE `baptism_status = 'completed'` + `baptism_date = today` + INSERT into `activity_log`
- Empty state: "No baptisms scheduled. Add a convert and schedule their baptism." + CTA

---

**SECTION 3 — Full-width Discipleship Pipeline Chart:**

Card with header "Discipleship Pipeline" + "Last 12 months" period selector

`BarChart` from Recharts, height 280px:
- X-axis: months (last 12)
- Grouped bars per month: New Converts (indigo) / Graduated (emerald) / Baptized (violet)
- Tooltip showing exact counts per category
- Legend below chart
- Data queried from `new_converts` table grouped by month

---

**SECTION 4 — Recent Activity Feed (full width):**

Card with header "Recent Discipleship Activity"

List of last 15 entries from `activity_log` filtered to discipleship-related action types:
- `new_convert` — "X was added as a new convert"
- `stage_advanced` — "X advanced to Stage Y (Z)"
- `convert_graduated` — "X has graduated from discipleship"
- `baptism_completed` — "X was baptized"
- `checkin_logged` — "X had a check-in with mentor Y"

Each row: icon (colored by type) + description + timestamp + linked convert avatar + name

---

**FULL DISCIPLESHIP MANAGEMENT (sub-routes):**

The dashboard links to `/new-converts` (Phase 3) for full convert management. The Discipleship Dashboard is purely the overview/analytics layer — it does not duplicate the convert management UI.

However, add two quick-action dialogs accessible from this page:

**Quick Log Check-in Dialog:**
- Triggered from "Log Check-in" action on the Needs Attention table
- Pre-filled: convert name
- Fields: check-in date (date picker, default today), notes (textarea), next check-in date (date picker)
- Submit → INSERT into `convert_checkins` + UPDATE `new_converts.updated_at` + INSERT into `activity_log`

**Quick Advance Stage Dialog:**
- Triggered from "Advance Stage" action
- Shows current stage + next stage with `<StageProgressBar>`
- Fields: advancement notes (textarea), new baptism status if advancing to stage 2+ (select)
- Submit → UPDATE `new_converts.discipleship_stage` + INSERT into `convert_stage_history` + INSERT into `activity_log` with type `stage_advanced`

---

## PART 3 — DISCIPLESHIP RESOURCES PAGE (`/discipleship-resources`)

**Page title:** `Discipleship Resources — Vestry`
**PageHeader:** "Discipleship Resources" / "Upload and manage materials for new believers"
**Header actions:** "Upload Resource" button + "Create Collection" button

---

**TOP STATS ROW (3 cards):**
- Total Resources (count)
- Total Assignments (count of times resources have been assigned to converts)
- Most Used Resource (name of resource with highest assignment count)

---

**TWO-TAB LAYOUT:**

*Resources tab (default):*

Filter bar: search input + type filter (All / PDF / Video / Audio / Document / External Link) + stage filter (All / Stage 1 / Stage 2 / Stage 3 / Stage 4) + category filter

`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` using `<ResourceCard>` components

**Upload Resource — Sheet form:**

Fields:
- Resource Title (required, max 150 chars)
- Resource Type (select: PDF / Video / Audio / Document / External Link)
- File Upload (`<MediaUploadZone>`) — shown for PDF / Video / Audio / Document types:
  - PDF/Document: accepts PDF, DOCX, PPTX — max 50MB
  - Video: accepts MP4, MOV — max 500MB
  - Audio: accepts MP3, WAV — max 100MB
  - Upload to Supabase Storage `discipleship-resources/{tenant_id}/{resource_id}/`
- External URL (URL input) — shown if type = External Link
- Thumbnail Image (image upload, optional)
- Category (select: Bible Study / Prayer / Salvation / Christian Living / Giving / Service / Leadership / Evangelism / Other)
- Recommended for Stage (multi-select: Stage 1 / Stage 2 / Stage 3 / Stage 4)
- Description (textarea, max 500 chars)
- Duration (text input — e.g. "45 mins", "2 hours", "15 pages")
- Tags (tag input)
- Is Downloadable (toggle) — if on, converts can download the file
- Author / Source (text input)

**Resource Detail — Sheet:**
- Resource preview:
  - PDF: embedded PDF viewer (`<iframe>` with Supabase Storage URL)
  - Video: `<ReactPlayer>`
  - Audio: `<AudioPlayer>`
  - Document: download link + file info
  - External Link: clickable URL + preview (Open Graph preview if available)
- All metadata
- Assignment history: `<DataTable>` of all converts assigned this resource (convert name + stage + assigned date + completion status)
- "Assign to Convert" button → searchable convert select → INSERT into `resource_assignments`
- "Assign to All Stage X Converts" button → batch assign to all converts in a given stage

*Collections tab:*

Collections are curated bundles of resources (e.g. "Stage 1 Starter Pack", "New Believer's Bible Study Series").

Card grid of collections:
- Collection name + description
- Resource count
- Stage badge (which stage it's for)
- "View Collection" button

**Create Collection — Dialog:**
- Collection Name (required)
- Description (textarea)
- Recommended Stage (select)
- Resources (multi-select from existing resources — searchable, add as ordered list)
- Cover Image (upload)
- Submit → INSERT into `resource_collections` + `collection_resources`

**Collection Detail — Sheet:**
- Ordered list of resources (drag to reorder using `@dnd-kit/sortable`)
- "Assign Collection to Convert" button → searchable convert select → batch INSERT into `resource_assignments` for all resources in collection
- "Assign to All Stage X Converts" button

---

## PART 4 — OUTREACH & IMPACT PAGE (`/outreach`)

**Page title:** `Outreach & Impact — Vestry`
**PageHeader:** "Outreach & Impact" / "Plan, execute and measure your church's outreach activities"
**Header actions:** "Log Outreach Activity" button

---

**TOP STATS ROW (4 cards):**
- Total Outreach Activities (count all time)
- People Reached This Year (sum of `people_reached` for all activities this year)
- Volunteers Deployed This Year (sum of volunteer count across activities)
- Total Outreach Hours (sum of `duration_hours * volunteer_count` for all activities)

---

**TWO-TAB LAYOUT:**

*Activities tab (default):*

`<DataTable>` with columns:

| Column | Content | Sortable |
|--------|---------|----------|
| Activity | Name + type badge | ✅ |
| Date | Formatted date | ✅ |
| Location | Location name | ✅ |
| Volunteers | Count | ✅ |
| People Reached | Number with `Users` icon | ✅ |
| Impact Score | Auto-calculated: `people_reached * 1 + volunteers * 2 + duration_hours * 0.5` — shown as colored badge (Bronze / Silver / Gold) | ✅ |
| Status | Planned / Completed / Cancelled | ✅ |
| Actions | View, Edit, Delete | — |

Filter sidebar: activity type, date range, location, status, volunteer count range

---

**LOG OUTREACH ACTIVITY — Sheet form:**

Fields:
- Activity Name (required)
- Activity Type (select: Street Evangelism / Prison Ministry / Hospital Visitation / School Outreach / Community Service / Feeding Programme / Medical Camp / Sports Outreach / Door-to-Door / Other)
- Date (date picker, required)
- Start Time + End Time
- Location (text input)
- Description (textarea)
- Target Community (text input — e.g. "Mathare Slums", "Kamiti Prison")
- Volunteers (multi-select from `members` — who participated)
- Team Leader (searchable select from `members`)
- People Reached (number input — estimated number of people impacted)
- Salvations (number input — number of people who gave their lives to Christ)
- First-time Visitors Captured (number input — how many visitor cards were collected)
- Materials Distributed (textarea — e.g. "200 tracts, 50 Bibles")
- Photos (multi-image upload → Supabase Storage `outreach-photos/{tenant_id}/{activity_id}/`)
- Status (select: Planned / Completed / Cancelled, default Completed)
- Report / Notes (textarea — full outreach report)
- Follow-up Required (toggle) — if on: show "Number requiring follow-up" (number input) + "Assign Follow-up To" (staff select) → auto-creates follow-up tasks in `follow_up_tasks` table

---

**ACTIVITY DETAIL PAGE (`/outreach/:activityId`):**

**Page header:** activity name, type badge, date, location, status badge

**Content (two columns):**

*Left (2/3):*

*Activity Summary card:*
- All details: type, date/time, location, target community
- Report / notes (full text)
- Materials distributed

*Impact Metrics card:*
- Large number displays: People Reached / Salvations / Visitors Captured / Volunteers
- Impact breakdown bar chart (Recharts `BarChart`):
  - Bars: People Reached vs Salvations vs Visitors
  - Conversion rate: `salvations / people_reached * 100`% in emerald

*Photos Gallery card:*
- Grid of uploaded photos using masonry layout
- Click → `<MediaLightbox>`

*Right (1/3):*

*Team card:*
- Team leader: avatar + name (prominent)
- Volunteers list: avatar stack + "X volunteers" + expandable full list

*Follow-up Status card:*
- Number requiring follow-up
- Assigned staff member
- Link to follow-up tasks filtered to this activity

*Impact Score card:*
- Large badge (Bronze / Silver / Gold / Platinum) with icon
- Score breakdown explanation

---

**Impact tab (on main Outreach page):**

Analytics overview of all outreach activity:

**Impact Over Time chart (full width):**
- `AreaChart` (Recharts), last 12 months
- X-axis: months
- Two area lines: People Reached (indigo) / Salvations (emerald)
- Period selector: 3 months / 6 months / 12 months / All Time

**Activity Type Breakdown (donut chart):**
- Distribution of activities by type (last 12 months)
- Legend with count per type

**Top Locations card:**
- Table: location name + activity count + people reached + most recent date

**Year-over-Year Comparison:**
- Two-bar grouped chart: This Year vs Last Year for People Reached and Salvations

---

## PART 5 — RESOURCES STORE PAGE (`/resources-store`)

**Page title:** `Resources Store — Vestry`
**PageHeader:** "Resources Store" / "Sell books, media and resources to your congregation"
**Header actions:** "Add Product" button + "View Orders" button

---

**TWO-TAB LAYOUT:**

*Store tab (default — the storefront view):*

**Store header:**
- Search input (full width, prominent)
- Category filter chips (All / Books / Audio / Video / Study Materials / Merchandise / Digital Downloads / Other)
- Sort by: Newest / Price: Low to High / Price: High to Low / Best Selling

**Products grid:** `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4` using `<ProductCard>`

**Cart sidebar (right, 320px, shown when cart has items):**
- Slides in from the right when "Add to Cart" is clicked
- Cart header: "Your Cart (X items)"
- Cart items list: product image thumbnail + name + price + quantity selector (+ / -) + remove button
- Subtotal
- "Checkout" button (indigo, full width)
- "Continue Shopping" link

**Checkout flow (Dialog, multi-step):**

*Step 1 — Review Order:*
- Order summary (items, quantities, subtotal)
- Discount code input (optional)
- "Proceed to Payment" button

*Step 2 — Customer Info:*
- Pre-filled from current user's profile: Name, Email, Phone
- Delivery method: Digital Download (for digital products) / Pick-up at Church / Delivery (shows address field)
- "Proceed to Payment" button

*Step 3 — Payment:*
- If Stripe connected (from Settings → Integrations): show Stripe Elements card input (`@stripe/react-stripe-js`)
- If M-Pesa connected: show M-Pesa phone number input + "Pay with M-Pesa" button
- If neither connected: show "Cash payment — bring payment on collection day" option
- Payment summary: items + subtotal + delivery fee (if delivery) + total
- "Place Order" button → INSERT into `store_orders` + `order_items` tables + trigger payment processing Edge Function if Stripe/M-Pesa
- On success: show order confirmation with order number + `toast.success("Order placed successfully!")`

---

*Admin tab (for staff/admin only):*

**Products management sub-tab:**

`<DataTable>` with columns: Product (thumbnail + name), Category, Price, Stock, Sales Count, Status, Actions

**Add / Edit Product — Sheet form:**

Fields:
- Product Name (required, max 150 chars)
- Category (select: Books / Audio / Video / Study Materials / Merchandise / Digital Download / Other)
- Description (rich textarea using `<RichTextEditor>`)
- Product Images (multi-image upload, up to 5 images — first is the main image — to Supabase Storage `store-products/{tenant_id}/{product_id}/`)
- Product Type (radio: Physical / Digital)
  - Physical: show Stock Quantity (number input) + Weight (optional, for delivery calculation)
  - Digital: show File Upload (`<MediaUploadZone>` — the downloadable file — to Supabase Storage `store-downloads/{tenant_id}/{product_id}/`) + "Delivery method: automatic download after purchase"
- Price (number input with currency prefix, required)
- Compare at Price (number input — the original/crossed-out price for showing a sale, optional)
- SKU (text input, optional)
- Status (select: Active / Draft / Out of Stock, default Active)
- Tags (tag input)

**Orders sub-tab:**

`<DataTable>` with columns: Order # / Customer (avatar + name) / Items / Total / Payment Method / Payment Status / Order Status / Date / Actions

Order Status values: Pending / Processing / Fulfilled / Picked Up / Delivered / Cancelled / Refunded

**Order Detail — Sheet:**
- Customer info
- Items ordered (with quantities and prices)
- Order totals breakdown
- Payment info (method + reference + status)
- Delivery info
- "Update Order Status" select (inline, fires mutation on change)
- "Send Receipt" button → triggers Edge Function to email the receipt PDF to the customer
- "Refund Order" button (red, admin only) → confirmation dialog + refund via Stripe if applicable

**Sales Analytics sub-tab:**

- Total Revenue This Month + This Year (KPI cards)
- Revenue Over Time chart (Recharts `AreaChart`, monthly)
- Top Selling Products table: product name + units sold + revenue
- Sales by Category (donut chart)
- Order Status breakdown (bar chart)

---

## PART 6 — TRAINING PAGE (`/training`)

**Page title:** `Training — Vestry`
**PageHeader:** "Training" / "Staff development courses and learning management"
**Header actions:** "Create Course" button

---

**TWO-TAB LAYOUT:**

*My Learning tab (default — shown to all users):*

**Continue Learning section (top):**
- Horizontal scroll row of courses the current user is enrolled in but not yet completed
- Each: `<CourseProgressCard>` with "Continue" button + progress %

**Recommended for You section:**
- 3 course cards recommended based on the user's role (e.g. Staff → recommend "Church Administration", "Conflict Resolution"; Worship Leader → "Worship Ministry Fundamentals")

**Completed Courses section:**
- Grid of completed courses with "View Certificate" button + completion date

*Course Library tab:*

Filter bar: search + category + difficulty + duration range

`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` of `<CourseProgressCard>` components

Category filter chips: Leadership / Pastoral Care / Administration / Worship Ministry / Children's Ministry / Youth Ministry / Finance / Communications / Technology / Personal Development / Other

---

**CREATE / EDIT COURSE — Full-page builder (route: `/training/new` or `/training/:id/edit`):**

**Layout:** Two-panel — left = course structure builder, right = course info sidebar

*Left — Course Builder:*

**Modules list (top level):**
- Dynamic list of modules (drag to reorder using `@dnd-kit/sortable`)
- Each module: module number (auto) + module title (editable text input) + lesson count + expand/collapse toggle + "Add Lesson" button inside + delete module button

**Inside each module — Lessons:**
- Dynamic list of lessons (drag to reorder within module)
- Each lesson: lesson number (auto) + lesson title (editable) + lesson type icon + duration + delete

**Lesson types:**
- 📹 Video — upload video file or paste YouTube/Vimeo URL
- 📄 Text — rich text content
- 🎵 Audio — upload audio file
- 📎 Document — upload PDF/DOCX
- ✅ Quiz — multiple choice questions
- 🔗 External Link — URL to external resource

Clicking a lesson opens the **Lesson Editor** in the right panel (replaces course info sidebar):

*Lesson Editor (right panel):*
- Lesson Title (text input)
- Lesson Type (select — changes the content section below)
- Content section (based on type):
  - Video: `<MediaUploadZone>` for video file OR YouTube/Vimeo URL input + video preview
  - Text: `<RichTextEditor>`
  - Audio: `<MediaUploadZone>` for audio + `<AudioPlayer>` preview
  - Document: `<MediaUploadZone>` for PDF/DOCX
  - Quiz: dynamic question builder:
    - Add questions (MCQ style)
    - Each question: question text + 4 answer options + correct answer selector + explanation (shown after submit)
    - "Add Question" button
    - Pass mark (%) input
  - External Link: URL input + description
- Duration (number input — minutes, auto-calculated from video if possible)
- Is Preview (toggle) — if on: this lesson is visible without enrollment
- Notes for instructor (textarea)

*Course Info Sidebar (default right panel when no lesson selected):*

- Course Title (text input, required)
- Category (select)
- Difficulty (select: Beginner / Intermediate / Advanced)
- Description (rich textarea)
- Cover Image (image upload)
- Duration (auto-calculated from sum of lesson durations, shown read-only: "Total: X hours Y mins")
- Target Audience (text input)
- Prerequisites (multi-select from other courses)
- Certificate on Completion (toggle) — if on: generates a certificate PDF on course completion
- Certificate Title text (text input, e.g. "Certificate of Completion")
- Status (select: Draft / Published, default Draft)
- Instructor (searchable member select, default current user)

**Save & Publish:**
- "Save Draft" (secondary)
- "Publish Course" (primary indigo) — sets status to Published, makes it available in Course Library

---

**COURSE DETAIL PAGE (`/training/:courseId`):**

**Page header:**
- Course cover image (full-width banner, 300px height, `object-cover`)
- Course title in `text-3xl font-bold` overlaid on banner
- Category badge + difficulty badge + duration
- Instructor avatar + name
- Enrollment status: "X staff enrolled" or "You are enrolled (X% complete)"
- "Enroll" button (if not enrolled) or "Continue Learning" button (if enrolled + incomplete) or "View Certificate" button (if completed)

**Content layout (two columns):**

*Left (2/3):*

*Course Content accordion:*
- Each module as an `<Accordion>` item (shadcn Accordion)
- Module title + lesson count + total duration in header
- Expanded: list of lessons with type icon + title + duration + lock icon (if not enrolled) or checkmark (if completed) or play button (if available)
- Clicking an available lesson opens the **Lesson Viewer**

*Lesson Viewer (below the accordion, full width):*
- Shows the selected lesson content:
  - Video: `<ReactPlayer>` (full width, 16:9)
  - Text: rendered HTML content (from TipTap)
  - Audio: `<AudioPlayer>`
  - Document: PDF embed or download link
  - Quiz: interactive quiz UI (show questions one at a time, submit for scoring, show results with explanations)
  - External Link: preview card + "Open Link" button
- Lesson navigation: "Previous Lesson" / "Next Lesson" buttons
- "Mark as Complete" button (bottom right, indigo) — marks lesson as completed in `lesson_completions` table + checks if all lessons are now completed → if yes, trigger course completion:
  - UPDATE `enrollments.completed_at`
  - INSERT into `activity_log`
  - Show `toast.success("🎉 Course completed! Your certificate is ready.")`
  - If certificate enabled: generate certificate PDF and show download modal

*Right (1/3):*

*Your Progress card:*
- Overall course progress bar (`Progress` component from shadcn)
- "X of Y lessons completed"
- Estimated time remaining

*Course Info card:*
- Category, difficulty, duration, instructor
- Prerequisites list (if any)

*Discussion card (basic):*
- Simple comment thread for this course (from `course_comments` table)
- Each comment: avatar + name + comment text + timestamp
- "Add Comment" form (textarea + submit)

---

**CERTIFICATE PDF (generated with `@react-pdf/renderer`):**

Layout of the certificate:
- Church logo + name at top
- "Certificate of Completion" in large decorative heading
- "This certifies that" text
- Recipient name in large `font-bold` (from member profile)
- "has successfully completed" text
- Course title in large italicized text
- Completion date
- Instructor name + signature line
- Church seal/stamp placeholder
- Vestry logo watermark (bottom right, subtle)

---

## PART 7 — DATABASE MIGRATIONS FOR PHASE 8
```sql
-- DISCIPLESHIP RESOURCES TABLE
CREATE TABLE discipleship_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'pdf','video','audio','document','external_link'
  )),
  file_url TEXT,
  external_url TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'other' CHECK (category IN (
    'bible_study','prayer','salvation','christian_living',
    'giving','service','leadership','evangelism','other'
  )),
  recommended_stages INT[] DEFAULT '{1}',
  description TEXT,
  duration_label TEXT,
  tags TEXT[],
  is_downloadable BOOLEAN DEFAULT true,
  author TEXT,
  assignment_count INT DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE discipleship_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage discipleship resources"
  ON discipleship_resources FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- RESOURCE ASSIGNMENTS TABLE
CREATE TABLE resource_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID REFERENCES discipleship_resources(id) ON DELETE CASCADE NOT NULL,
  convert_id UUID REFERENCES new_converts(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completion_status TEXT DEFAULT 'not_started' CHECK (completion_status IN (
    'not_started','in_progress','completed'
  )),
  completed_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resource_id, convert_id)
);
ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage resource assignments"
  ON resource_assignments FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- RESOURCE COLLECTIONS TABLE
CREATE TABLE resource_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  recommended_stage INT CHECK (recommended_stage BETWEEN 1 AND 4),
  cover_image_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE resource_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage collections"
  ON resource_collections FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- COLLECTION RESOURCES TABLE
CREATE TABLE collection_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES resource_collections(id) ON DELETE CASCADE NOT NULL,
  resource_id UUID REFERENCES discipleship_resources(id) ON DELETE CASCADE NOT NULL,
  position INT NOT NULL DEFAULT 0,
  UNIQUE(collection_id, resource_id)
);
ALTER TABLE collection_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage collection resources"
  ON collection_resources FOR ALL
  USING (collection_id IN (
    SELECT id FROM resource_collections WHERE tenant_id IN (
      SELECT tenant_id FROM role_permissions
      WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
    )
  ));

-- OUTREACH ACTIVITIES TABLE
CREATE TABLE outreach_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'street_evangelism','prison_ministry','hospital_visitation',
    'school_outreach','community_service','feeding_programme',
    'medical_camp','sports_outreach','door_to_door','other'
  )),
  activity_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  description TEXT,
  target_community TEXT,
  volunteer_ids UUID[] DEFAULT '{}',
  team_leader_id UUID REFERENCES members(id) ON DELETE SET NULL,
  people_reached INT DEFAULT 0,
  salvations INT DEFAULT 0,
  visitors_captured INT DEFAULT 0,
  materials_distributed TEXT,
  photo_urls JSONB DEFAULT '[]',
  status TEXT DEFAULT 'completed' CHECK (status IN ('planned','completed','cancelled')),
  report TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_count INT DEFAULT 0,
  follow_up_assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  impact_score DECIMAL(10,2) GENERATED ALWAYS AS (
    people_reached * 1.0 + (array_length(volunteer_ids, 1) * 2.0)
  ) STORED,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE outreach_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage outreach activities"
  ON outreach_activities FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));
CREATE INDEX idx_outreach_church ON outreach_activities(tenant_id);
CREATE INDEX idx_outreach_date ON outreach_activities(activity_date);

-- STORE PRODUCTS TABLE
CREATE TABLE store_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'other' CHECK (category IN (
    'books','audio','video','study_materials',
    'merchandise','digital_download','other'
  )),
  description TEXT,
  image_urls JSONB DEFAULT '[]',
  product_type TEXT DEFAULT 'physical' CHECK (product_type IN ('physical','digital')),
  price DECIMAL(12,2) NOT NULL,
  compare_at_price DECIMAL(12,2),
  currency TEXT DEFAULT 'KES',
  sku TEXT,
  stock_quantity INT DEFAULT 0,
  weight_kg DECIMAL(5,2),
  digital_file_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','draft','out_of_stock')),
  sales_count INT DEFAULT 0,
  tags TEXT[],
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage products"
  ON store_products FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));
CREATE POLICY "Members can view active products"
  ON store_products FOR SELECT
  USING (status = 'active' AND tenant_id IN (
    SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid()
  ));

-- STORE ORDERS TABLE
CREATE TABLE store_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  customer_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  delivery_method TEXT DEFAULT 'pickup' CHECK (delivery_method IN (
    'digital_download','pickup','delivery'
  )),
  delivery_address TEXT,
  subtotal DECIMAL(12,2) NOT NULL,
  delivery_fee DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  payment_method TEXT CHECK (payment_method IN ('stripe','mpesa','cash','other')),
  pesapal_transaction_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
    'pending','paid','failed','refunded'
  )),
  order_status TEXT DEFAULT 'pending' CHECK (order_status IN (
    'pending','processing','fulfilled','picked_up','delivered','cancelled','refunded'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage orders"
  ON store_orders FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));
CREATE POLICY "Customers can view their own orders"
  ON store_orders FOR SELECT
  USING (customer_member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  ));

-- AUTO-INCREMENT ORDER NUMBER
CREATE SEQUENCE order_number_seq START 1000;
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(nextval('order_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON store_orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- ORDER ITEMS TABLE
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES store_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES store_products(id) ON DELETE SET NULL NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  digital_file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage order items"
  ON order_items FOR ALL
  USING (order_id IN (
    SELECT id FROM store_orders WHERE tenant_id IN (
      SELECT tenant_id FROM role_permissions
      WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
    )
  ));

-- TRAINING COURSES TABLE
CREATE TABLE training_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'other' CHECK (category IN (
    'leadership','pastoral_care','administration','worship_ministry',
    'childrens_ministry','youth_ministry','finance',
    'communications','technology','personal_development','other'
  )),
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced')),
  description TEXT,
  cover_image_url TEXT,
  target_audience TEXT,
  prerequisite_course_ids UUID[] DEFAULT '{}',
  has_certificate BOOLEAN DEFAULT false,
  certificate_title TEXT DEFAULT 'Certificate of Completion',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published')),
  instructor_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  modules JSONB DEFAULT '[]',
  total_duration_minutes INT DEFAULT 0,
  enrollment_count INT DEFAULT 0,
  completion_count INT DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage courses"
  ON training_courses FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));
CREATE POLICY "All church members can view published courses"
  ON training_courses FOR SELECT
  USING (status = 'published' AND tenant_id IN (
    SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid()
  ));

-- COURSE ENROLLMENTS TABLE
CREATE TABLE course_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  certificate_url TEXT,
  UNIQUE(course_id, user_id)
);
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own enrollments"
  ON course_enrollments FOR ALL
  USING (user_id = auth.uid());
CREATE POLICY "Admins can view all enrollments"
  ON course_enrollments FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM role_permissions
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- LESSON COMPLETIONS TABLE
CREATE TABLE lesson_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  module_index INT NOT NULL,
  lesson_index INT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(enrollment_id, module_index, lesson_index)
);
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own lesson completions"
  ON lesson_completions FOR ALL
  USING (enrollment_id IN (
    SELECT id FROM course_enrollments WHERE user_id = auth.uid()
  ));

-- COURSE COMMENTS TABLE
CREATE TABLE course_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE course_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enrolled users can view and add comments"
  ON course_comments FOR ALL
  USING (course_id IN (
    SELECT course_id FROM course_enrollments WHERE user_id = auth.uid()
  ));
```

---

**Build exactly this. Replace the 5 Growth & Discipleship placeholder pages from Phase 1 with fully functional, Supabase-connected pages as described. Install `@stripe/stripe-js` and `@stripe/react-stripe-js` for the Resources Store checkout. The Stripe payment processing must go through a Supabase Edge Function `process-payment` — never expose the Stripe secret key to the frontend. Do not modify any code from Phases 1–7.**