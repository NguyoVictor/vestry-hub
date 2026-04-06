You're right, my bad! The first prompt I gave you already included the Dashboard, but let me rewrite **Phase 1** as its own clean, standalone, ultra-detailed Lovable prompt — properly focused on just the **App Shell + Dashboard Overview** as the first thing to build after OAuth/Onboarding. Here it is:

---

## 🏗️ Lovable Prompt — Phase 1: App Shell + Dashboard Overview

---

**CONTEXT — What already exists, do not rebuild:**

This is a Church SaaS platform called **Church Central Cloud**. The following is already built and working:
- Supabase Auth (OAuth via Google + email/password + magic link)
- Email OTP verification flow
- Onboarding flow: admin inputs church name, selects desired modules/services, receives a unique church access code and a QR code
- A post-onboarding demo video modal
- A `churches` table, `profiles` table, and `church_members` table already exist in Supabase with RLS policies applied
- A `church_settings` table with a JSONB `enabled_modules` column exists

**Do not touch any of the above. Pick up from where the user lands after completing onboarding — which redirects to `/dashboard`.**

---

**TECH STACK:**
- React + TypeScript + Vite
- Supabase (PostgreSQL, RLS, Edge Functions, Realtime, Storage)
- Tailwind CSS + shadcn/ui component library
- React Router v6 (file-based routing structure)
- TanStack Query v5 (all data fetching + mutations)
- React Hook Form + Zod (all forms + validation)
- Lucide React (all icons)
- Recharts (all charts)
- `react-helmet-async` (dynamic `<head>` meta tags per route)
- Sonner (toast notifications)

---

### PART 1 — AUTHENTICATED APP SHELL

Create a persistent layout component `AppLayout.tsx` that wraps every authenticated route. It renders a **Left Sidebar**, a **Top Navbar**, and a **Main Content Area**. All three must be present on every protected page.

---

**LEFT SIDEBAR**

- Fixed position, full viewport height, `z-index: 40`
- Expanded width: `240px`. Collapsed (icon-only) width: `64px`
- Collapse state persisted to `localStorage` key `sidebar_collapsed`
- Smooth CSS transition on expand/collapse (`transition-all duration-300`)
- Background: `bg-white dark:bg-slate-900`, right border: `border-r border-slate-200 dark:border-slate-800`

**Top of sidebar:**
- Church logo (circular avatar, 36px, pulled from Supabase Storage URL stored in `churches.logo_url`)
- Church name in `font-semibold text-sm` next to the logo (hidden when collapsed)
- If no logo uploaded, show initials avatar (first 2 letters of church name, indigo background)

**Navigation items** — grouped with section headers. Section headers are `text-xs font-semibold uppercase tracking-wider text-slate-400` and hidden when sidebar is collapsed. Each nav item has: a Lucide icon (24px), a text label (hidden when collapsed), an active state (background `bg-indigo-50 dark:bg-indigo-950`, left border `border-l-2 border-indigo-600`, text `text-indigo-600`), and a hover state (`hover:bg-slate-100 dark:hover:bg-slate-800`). Nav items use `NavLink` from React Router for automatic active detection.

Group the nav items exactly as follows:

**Overview**
- Dashboard → `/dashboard` → icon: `LayoutDashboard`

**People**
- Members → `/members` → icon: `Users`
- Groups → `/groups` → icon: `UsersRound`
- House Fellowships → `/house-fellowships` → icon: `Home`
- Families → `/families` → icon: `HeartHandshake`
- Visitors → `/visitors` → icon: `UserPlus`
- Follow-Up Tasks → `/follow-up-tasks` → icon: `ClipboardList`
- New Converts → `/new-converts` → icon: `Sparkles`

**Finance**
- Give Online → `/give-online` → icon: `CreditCard`
- Giving Records → `/giving-records` → icon: `Receipt`
- Pledge Campaigns → `/pledge-campaigns` → icon: `Target`
- Church Expenses → `/church-expenses` → icon: `Wallet`
- Budget Management → `/budget-management` → icon: `PieChart`
- Payroll → `/payroll` → icon: `Banknote`
- Fund Accounting → `/fund-accounting` → icon: `BookOpen`
- Accounts Payable → `/accounts-payable` → icon: `FileText`
- General Ledger → `/general-ledger` → icon: `BookMarked`
- Payouts → `/payouts` → icon: `ArrowUpRight`

**Events & Operations**
- Services → `/services` → icon: `Church`
- Events → `/events` → icon: `CalendarDays`
- Volunteering → `/volunteering` → icon: `HandHeart`
- Member Requests → `/member-requests` → icon: `MessageSquare`
- Board Meetings → `/board-meetings` → icon: `Video`
- Facility & Event Booking → `/facility-booking` → icon: `Building2`

**Security**
- Security Centre → `/security-centre` → icon: `ShieldCheck`
- Incident Management → `/incident-management` → icon: `AlertTriangle`

**Communications**
- Communications → `/communications` → icon: `Send`
- Announcements → `/announcements` → icon: `Megaphone`
- Member Messaging → `/member-messaging` → icon: `MessageCircle`
- Testimonies → `/testimonies` → icon: `Quote`
- Surveys → `/surveys` → icon: `BarChart2`

**Media & Content**
- Graphics Studio → `/graphics-studio` → icon: `Palette`
- AI Tools → `/ai-tools` → icon: `Bot`
- Church Studio → `/church-studio` → icon: `Mic2`
- Bible Explorer → `/bible-explorer` → icon: `BookOpenText`
- Song Library → `/song-library` → icon: `Music`
- Church Media → `/church-media` → icon: `Image`
- Asset Management → `/asset-management` → icon: `Package`
- Sermon Preparation → `/sermon-preparation` → icon: `PenLine`
- Sermon & Messages → `/sermons` → icon: `PlayCircle`
- Livestreaming → `/livestreaming` → icon: `Radio`

**Growth**
- Discipleship Dashboard → `/discipleship` → icon: `TrendingUp`
- Discipleship Resources → `/discipleship-resources` → icon: `GraduationCap`
- Outreach & Impact → `/outreach` → icon: `Globe`
- Resources Store → `/resources-store` → icon: `ShoppingBag`
- Training → `/training` → icon: `BookCheck`

**Admin**
- Reports & Analytics → `/reports` → icon: `BarChart3`
- Branches → `/branches` → icon: `GitBranch`
- Settings → `/settings` → icon: `Settings`

**Bottom of sidebar (always visible):**
- Collapse/expand toggle button (icon: `ChevronLeft` when expanded, `ChevronRight` when collapsed)
- User avatar (32px circular) + name + email in `text-xs` (hidden when collapsed)
- Logout button (icon: `LogOut`, calls `supabase.auth.signOut()` then redirects to `/login`)

**Mobile behavior:**
- On screens below `lg` breakpoint, sidebar is hidden by default
- Triggered by hamburger icon in top navbar
- Opens as a full-height drawer from the left using a shadcn `Sheet` component
- Overlay backdrop closes the drawer when tapped

---

**TOP NAVBAR**

- Sticky top, full width, height `64px`, `z-index: 30`
- Background: `bg-white dark:bg-slate-900`, bottom border: `border-b border-slate-200 dark:border-slate-800`
- Left side: hamburger icon button (mobile only, `lg:hidden`) + current page title (dynamic — reads from a `usePageTitle` hook that maps the current pathname to a human-readable label, `font-semibold text-lg`)
- Right side (flex row, gap-2, items-center):
  - **Global Search button** (icon: `Search`) — opens a `CommandDialog` (shadcn Command) with placeholder "Search members, events, transactions..." — for now the search is UI-only with no results, just the modal
  - **Notification Bell** (icon: `Bell`) — with a red badge showing unread count (query from a `notifications` table in Supabase, count of rows where `read = false` and `user_id = currentUser.id`). Clicking opens a dropdown panel (max-height 400px, scrollable) showing the 10 most recent notifications with mark-as-read functionality
  - **Dark mode toggle** (icon: `Sun` / `Moon`) — toggles `dark` class on `<html>`, persists to `localStorage`
  - **User avatar dropdown** (shadcn `DropdownMenu`):
    - Trigger: circular avatar (36px) with user's profile photo or initials fallback
    - Menu items: Profile (`/settings/profile`), Settings (`/settings`), Switch Church (if user belongs to multiple churches — show submenu), Logout
    - Shows user name + email at the top of the dropdown in a non-clickable header section

---

**MAIN CONTENT AREA**

- Takes remaining width after sidebar
- Full viewport height, `overflow-y-auto`
- Inner padding: `p-6`
- Each page starts with a `PageHeader` component:
  - Props: `title: string`, `subtitle?: string`, `action?: ReactNode`
  - Renders: `<h1>` with `text-2xl font-semibold` + optional subtitle in `text-sm text-slate-500` + optional right-aligned action button slot (e.g. "Add Member" or "Export")
  - Below the header, a subtle `<hr>` divider, then the page content

---

**ROUTE GUARD**

Create an `AuthGuard.tsx` component that:
- Subscribes to `supabase.auth.onAuthStateChange`
- If no session, redirects to `/login`
- If session exists but `onboarding_complete` is `false` on the user's `profiles` row, redirects to `/onboarding`
- Otherwise, renders the `AppLayout` with children
- Shows a full-screen centered spinner while the session check is resolving

---

### PART 2 — DASHBOARD OVERVIEW PAGE (`/dashboard`)

This is the first page a user sees after login. It must be data-rich, visually impressive, and fully connected to Supabase via TanStack Query.

Set the page `<title>` to `Dashboard — Church Central Cloud` via `react-helmet-async`.

---

**SECTION 1 — KPI Stats Row**

A responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`

Four stat cards:

1. **Total Members** — query `SELECT COUNT(*) FROM church_members WHERE church_id = :churchId AND status = 'active'`. Compare to last month's count for trend. Icon: `Users`. Color accent: indigo.

2. **Total Giving This Month** — query `SELECT SUM(amount) FROM donations WHERE church_id = :churchId AND created_at >= date_trunc('month', now())`. Format as currency (use church's currency setting, default KES). Icon: `TrendingUp`. Color accent: emerald.

3. **Upcoming Events** — query `SELECT COUNT(*) FROM events WHERE church_id = :churchId AND event_date >= now() AND event_date <= now() + interval '7 days'`. Icon: `CalendarDays`. Color accent: violet.

4. **Active Groups** — query `SELECT COUNT(DISTINCT group_id) FROM group_members WHERE church_id = :churchId`. Icon: `UsersRound`. Color accent: amber.

Each card structure:
- `bg-white dark:bg-slate-800` rounded-lg, border, shadow-sm, p-5
- Top row: icon in a `40px` rounded square with 10% opacity background of its accent color, icon in full accent color
- Middle: metric value in `text-3xl font-bold text-slate-900 dark:text-white`
- Bottom row: label in `text-sm text-slate-500` + trend badge on the right (green arrow up if positive, red arrow down if negative, grey dash if no change) showing `+X%` vs last month
- Skeleton loader (`animate-pulse`) while data is fetching

---

**SECTION 2 — Two-column layout (below the KPI row)**

`grid grid-cols-1 lg:grid-cols-3 gap-6`

**Left column (spans 2 of 3 cols):**

*Giving Trend Chart*
- Card with header "Giving Overview" + a month-range selector (last 3 months / 6 months / 12 months, default 6)
- `AreaChart` from Recharts, height 280px
- X-axis: abbreviated month names (Jan, Feb, etc.)
- Y-axis: currency amounts, formatted with `K` suffix for thousands
- Area fill: indigo gradient (top `#6366F1`, bottom transparent)
- Tooltip: custom styled showing month + total amount
- Data: query `SELECT date_trunc('month', created_at) as month, SUM(amount) as total FROM donations WHERE church_id = :churchId GROUP BY month ORDER BY month ASC LIMIT 6`
- Skeleton loader while fetching

*Attendance Trend Chart* (below giving chart)
- `BarChart` from Recharts, height 220px
- Shows attendance count per service for the last 8 services
- Bar color: emerald `#10B981`
- Data: query `SELECT service_name, service_date, attendance_count FROM services WHERE church_id = :churchId ORDER BY service_date DESC LIMIT 8`

**Right column (spans 1 of 3 cols):**

*Members by Group (Donut Chart)*
- Card with header "Group Distribution"
- `PieChart` with `innerRadius={60}` from Recharts, height 220px
- Shows top 5 groups by member count, rest grouped as "Others"
- Custom legend below chart: color dot + group name + count
- Colors: use a fixed palette of 6 distinct colors
- Center of donut: total member count in `font-bold text-xl`

*Quick Actions* (below donut chart)
- Card with header "Quick Actions"
- 2x2 grid of action buttons, each: icon + label, `variant="outline"`, rounded-lg, hover fills with indigo
- Actions: Add Member (`/members?action=add`), Record Giving (`/give-online`), Create Event (`/events?action=create`), Send Announcement (`/announcements?action=compose`)

---

**SECTION 3 — Two-column layout (below section 2)**

`grid grid-cols-1 lg:grid-cols-2 gap-6`

**Recent Activity Feed**
- Card with header "Recent Activity" + "View All" link
- List of 10 most recent entries from `activity_log` table:
  - Columns needed: `id`, `action_type`, `description`, `actor_name`, `actor_avatar_url`, `created_at`, `metadata` (JSONB)
  - Each row: left avatar (32px circular, initials fallback), center description text in `text-sm` + actor name in `font-medium`, right relative timestamp in `text-xs text-slate-400` (e.g. "3 hours ago" using `date-fns formatDistanceToNow`)
  - Activity type icon badge (color coded): new member = indigo user icon, donation = emerald coin icon, event = violet calendar icon, announcement = amber megaphone icon
- Realtime: subscribe to `activity_log` INSERT events via Supabase Realtime — new entries appear at the top with a subtle fade-in animation
- Skeleton list (5 rows) while loading

**Upcoming Events**
- Card with header "Upcoming Events" + "View All" link to `/events`
- List of next 5 events from `events` table ordered by `event_date ASC`
- Each row: colored left border (based on event type), event name in `font-medium`, date/time formatted as "Sun, 23 Mar · 10:00 AM", location in `text-xs text-slate-500`, attendee RSVP count pill on the right
- Empty state: illustration (simple SVG of a calendar) + "No upcoming events. Create your first event." with a button linking to `/events?action=create`
- Skeleton while loading

---

**SECTION 4 — Full width bottom row**

*Recent Donations Table*
- Card with header "Recent Donations" + "View All" link to `/giving-records`
- shadcn `Table` component
- Columns: Donor Name (with avatar), Amount (formatted currency, `font-semibold text-emerald-600`), Category (badge: Tithe / Offering / Building Fund / etc.), Payment Method (icon: card/bank/cash), Date
- Shows last 8 donations from `donations` table joined with `profiles`
- Row hover: `hover:bg-slate-50 dark:hover:bg-slate-800/50`
- Skeleton table (8 rows) while loading
- Empty state if no donations yet

---

### PART 3 — SCAFFOLD ALL OTHER ROUTES

For every route listed below, create a placeholder page component that:
- Renders the correct `PageHeader` with title and relevant icon
- Shows a centered empty state card with:
  - A relevant Lucide icon (64px, `text-slate-300`)
  - Heading: `"[Page Name] — Coming Soon"`
  - Subtext: `"This module is currently being built. Check back soon."`
  - A secondary button: `"Go to Dashboard"` linking to `/dashboard`
- Sets the correct `<title>` tag via `react-helmet-async`
- Is connected to the sidebar nav link so clicking it navigates correctly

Scaffold ALL of these routes as placeholder pages:
`/members`, `/groups`, `/house-fellowships`, `/families`, `/visitors`, `/follow-up-tasks`, `/new-converts`, `/give-online`, `/giving-records`, `/pledge-campaigns`, `/church-expenses`, `/budget-management`, `/payroll`, `/fund-accounting`, `/accounts-payable`, `/general-ledger`, `/payouts`, `/services`, `/events`, `/volunteering`, `/member-requests`, `/board-meetings`, `/facility-booking`, `/security-centre`, `/incident-management`, `/communications`, `/announcements`, `/member-messaging`, `/testimonies`, `/surveys`, `/graphics-studio`, `/ai-tools`, `/church-studio`, `/bible-explorer`, `/song-library`, `/church-media`, `/asset-management`, `/sermon-preparation`, `/sermons`, `/livestreaming`, `/discipleship`, `/discipleship-resources`, `/outreach`, `/resources-store`, `/training`, `/reports`, `/branches`, `/settings`

No route should return a 404. Every single route must render its placeholder page.

---

### PART 4 — DESIGN SYSTEM RULES

- **Primary color:** Indigo — `#4F46E5` (indigo-600). Use for active states, primary buttons, chart fills, links.
- **Success/positive:** Emerald `#10B981`
- **Warning:** Amber `#F59E0B`
- **Danger/destructive:** Red `#EF4444`
- **Neutral scale:** Slate (slate-50 through slate-900)
- **Font:** Inter — load via Google Fonts. Weights: 400, 500, 600, 700.
- **Border radius:** `rounded-lg` (cards), `rounded-md` (inputs, buttons), `rounded-full` (avatars, badges)
- **Card style:** `bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-5`
- **Dark mode:** Implemented via Tailwind `darkMode: 'class'`. A `ThemeProvider` context wraps the entire app. Toggle in top navbar. Preference persisted to `localStorage` key `theme`. Default: `light`.
- **Responsive:** Mobile-first. All grids stack to 1 column at `sm`, expand at `md` and `lg`.
- **Loading states:** Always use shadcn `Skeleton` — never leave blank white space while data loads.
- **Empty states:** Every list and table must have a designed empty state with icon + message + CTA.
- **Toasts:** Use Sonner (`<Toaster />` in root layout). Call `toast.success()` / `toast.error()` on all mutations.
- **Animations:** Use `tailwindcss-animate` (already included with shadcn). Page transitions: `fade-in` on route change. Card hover: subtle `translateY(-1px)` on `hover`.

---

### PART 5 — SUPABASE INTEGRATION NOTES

- Use the typed Supabase client generated via `supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts`
- All queries go through TanStack Query `useQuery` hooks — never raw `useEffect` + `useState` for data fetching
- All mutations use `useMutation` with `onSuccess` calling `queryClient.invalidateQueries`
- The current church ID is stored in a `useChurch()` context hook (reads from the user's active church in `church_members` table)
- All Supabase queries must filter by `church_id` — never fetch data across churches
- Enable Supabase Realtime on the `activity_log` table and subscribe to it inside the dashboard's activity feed component

---

**Build exactly this. Start with the AppLayout, then the AuthGuard, then the Dashboard page section by section, then scaffold all placeholder routes. Do not build Settings yet — that is Phase 2.**

