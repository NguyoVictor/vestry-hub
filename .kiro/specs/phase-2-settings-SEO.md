Here is your **Phase 2 prompt** — Settings + SEO, fully detailed for Lovable:

---

## 🏗️ Lovable Prompt — Phase 2: Settings + SEO

---

**CONTEXT — What already exists, do not rebuild:**

This is **Church Central Cloud**, a multi-tenant Church SaaS platform. The following phases are already complete and working:
- Phase 0: Supabase Auth (OAuth + email/password), onboarding flow, church access code + QR generation
- Phase 1: Full `AppLayout` (collapsible sidebar, top navbar, dark mode toggle), `AuthGuard`, Dashboard Overview page with KPI cards, charts, activity feed, upcoming events, recent donations table, and all placeholder routes scaffolded

**Do not touch any of the above. This phase builds only the `/settings` route and all its sub-routes, plus the public church SEO page at `/church/:slug`.**

---

**TECH STACK (same as Phase 1):**
- React + TypeScript + Vite
- Supabase (PostgreSQL, RLS, Edge Functions, Storage)
- Tailwind CSS + shadcn/ui
- React Router v6
- TanStack Query v5 (`useQuery`, `useMutation`, `queryClient.invalidateQueries`)
- React Hook Form + Zod
- Lucide React
- `react-helmet-async`
- Sonner (toasts)

---

### PART 1 — SETTINGS PAGE LAYOUT (`/settings`)

The Settings page has its own internal layout — a **left sub-navigation panel** and a **right content panel**. This layout sits inside the existing `AppLayout` (sidebar + top navbar still present).

**Settings Sub-Layout (`SettingsLayout.tsx`):**
- Two-column layout: left sub-nav `w-64 shrink-0`, right content `flex-1 min-w-0`
- On mobile (`< lg`): the left sub-nav collapses into a horizontal scrollable tab strip at the top of the page
- Left sub-nav background: `bg-slate-50 dark:bg-slate-900`, right border: `border-r border-slate-200 dark:border-slate-800`, full height, `p-4`
- Sub-nav header: "Settings" in `text-lg font-semibold` + subtitle "Manage your church account" in `text-sm text-slate-500`
- Each sub-nav item: icon (Lucide, 16px) + label, `rounded-md px-3 py-2`, active state: `bg-white dark:bg-slate-800 text-indigo-600 font-medium shadow-sm`, inactive: `text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800`
- Right content area: `p-6 overflow-y-auto`

**Sub-nav items (in order):**

| Label | Icon | Route |
|-------|------|-------|
| Church Profile | `Building2` | `/settings/profile` |
| Services & Modules | `LayoutGrid` | `/settings/services` |
| Roles & Permissions | `ShieldCheck` | `/settings/roles` |
| Notifications | `Bell` | `/settings/notifications` |
| Billing & Subscription | `CreditCard` | `/settings/billing` |
| Security | `Lock` | `/settings/security` |
| Integrations | `Plug` | `/settings/integrations` |
| SEO & Public Page | `Globe` | `/settings/seo` |

Navigating to `/settings` with no sub-route should automatically redirect to `/settings/profile`.

Each sub-section renders inside the right content panel with its own `PageHeader` (title + subtitle).

---

### PART 2 — SETTINGS SUB-SECTIONS

---

#### 2A. Church Profile (`/settings/profile`)

**PageHeader:** "Church Profile" / "Update your church's public information"

Build a form using React Hook Form + Zod. All fields read from and write to the `churches` table in Supabase, filtered by the current `church_id` from `useChurch()` context.

**Form fields:**

*Church Identity section:*
- **Church Logo** — image upload component: shows current logo in a `96px` circular preview (or indigo initials avatar if none). Below it: "Upload Logo" button that opens a file picker (accepts `.jpg`, `.png`, `.webp`, max 2MB). On select, upload to Supabase Storage bucket `church-logos` at path `{church_id}/logo.{ext}`, get public URL, update `churches.logo_url`. Show upload progress indicator. "Remove Logo" link appears if a logo exists.
- **Church Name** — text input, required, min 2 chars, max 100 chars
- **Church Slug** — text input, auto-generated from church name (lowercase, hyphens, alphanumeric only), editable, must be unique (validate against Supabase on blur with a debounced query), shows preview: `churchcentralcloud.com/church/{slug}` below the input in `text-xs text-slate-500`. Green checkmark if available, red X if taken.
- **Tagline / Mission Statement** — textarea, max 200 chars, optional

*Contact & Location section:*
- **Physical Address** — textarea, max 300 chars
- **City** — text input
- **Country** — select dropdown (full list of countries, default Kenya)
- **Phone Number** — text input with country code prefix selector
- **Email Address** — email input, validated
- **Website URL** — URL input, validated (must start with https://)

*Church Details section:*
- **Founded Year** — number input, min 1800, max current year
- **Denomination** — text input (free text, e.g. "Pentecostal", "Anglican", "Baptist")
- **Weekly Service Day** — multi-select checkboxes: Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday
- **Service Time** — time input (24hr format)
- **Average Attendance** — number input (approximate weekly attendance)
- **Currency** — select: KES (Kenyan Shilling), USD, GBP, EUR, UGX, TZS, ZAR, NGN — stored in `churches.currency`, used app-wide for formatting

*Social Links section:*
- Facebook URL, Instagram URL, YouTube URL, Twitter/X URL, WhatsApp number — all optional URL inputs

**Save button:** full-width at bottom, `variant="default"` (indigo), label "Save Changes". On submit: PATCH `churches` row via Supabase, invalidate `['church', churchId]` query key, show `toast.success("Church profile updated successfully")`. On error: `toast.error("Failed to save. Please try again.")`.

**Unsaved changes warning:** if the user navigates away from the form with unsaved changes, show a shadcn `AlertDialog` confirming they want to leave.

---

#### 2B. Services & Modules (`/settings/services`)

**PageHeader:** "Services & Modules" / "Enable or disable features for your church"

This screen controls which modules are visible in the sidebar navigation.

**Layout:** grouped list of toggles matching the sidebar nav sections. Each group has a section header. Each module row has:
- Module icon (Lucide, 20px, indigo)
- Module name in `font-medium`
- Short description in `text-sm text-slate-500` (e.g. for Members: "Manage your church membership database")
- shadcn `Switch` on the right (checked = enabled, unchecked = disabled)
- If a module is a core module (Dashboard, Settings), show a `Badge` variant="secondary" labeled "Core — Cannot disable" and disable the switch

**Module groups and descriptions:**

*People*
- Members — "Manage your full membership database"
- Groups — "Organize members into ministry groups"
- House Fellowships — "Track and manage home cell groups"
- Families — "Link members as family units"
- Visitors — "Log and follow up with church visitors"
- Follow-Up Tasks — "Assign and track member follow-ups"
- New Converts — "Manage discipleship for new believers"

*Finance*
- Give Online — "Accept digital offerings and tithes"
- Giving Records — "View and export donation history"
- Pledge Campaigns — "Run fundraising pledge drives"
- Church Expenses — "Log and approve church expenditure"
- Budget Management — "Plan and track annual budgets"
- Payroll — "Manage staff salaries and payslips"
- Fund Accounting — "Track restricted and unrestricted funds"
- Accounts Payable — "Manage vendor invoices and payments"
- General Ledger — "Full double-entry accounting ledger"
- Payouts — "View Stripe payout history"

*Events & Operations*
- Services — "Schedule and track weekly services"
- Events — "Create and manage church events"
- Volunteering — "Coordinate volunteer rosters"
- Member Requests — "Receive and respond to member needs"
- Board Meetings — "Schedule meetings and track minutes"
- Facility & Event Booking — "Manage facility booking requests"

*Security*
- Security Centre — "Monitor access logs and sessions"
- Incident Management — "Log and resolve security incidents"

*Communications*
- Communications — "Broadcast messages to members"
- Announcements — "Post church-wide announcements"
- Member Messaging — "Direct messaging between staff and members"
- Testimonies — "Collect and publish member testimonies"
- Surveys — "Create and distribute church surveys"

*Media & Content*
- Graphics Studio — "Upload and manage design assets"
- AI Tools — "AI-powered content generation"
- Church Studio — "Audio and video sermon library"
- Bible Explorer — "Searchable Bible with notes"
- Song Library — "Worship song and lyrics database"
- Church Media — "Photo and video gallery"
- Asset Management — "Track physical church assets"
- Sermon Preparation — "Draft and organize sermon outlines"
- Sermon & Messages — "Published sermon archive"
- Livestreaming — "Embed live stream links"

*Growth*
- Discipleship Dashboard — "Track spiritual growth journeys"
- Discipleship Resources — "Upload discipleship materials"
- Outreach & Impact — "Log and measure outreach activities"
- Resources Store — "Sell books and church resources"
- Training — "Staff training and course management"

*Admin*
- Reports & Analytics — "Church-wide data and insights"
- Branches — "Manage multiple church locations"

**Save behavior:** changes are saved immediately on toggle (no save button needed) — each toggle change fires a `useMutation` that PATCHes the `church_settings.enabled_modules` JSONB array in Supabase. Show a subtle `toast.success("Module updated")` on each change. The sidebar nav in `AppLayout` must reactively hide/show items based on this setting — use a `useEnabledModules()` hook that reads from `useQuery(['church_settings', churchId])` and re-renders the sidebar when the data changes.

---

#### 2C. Roles & Permissions (`/settings/roles`)

**PageHeader:** "Roles & Permissions" / "Manage who has access to your church dashboard"

**Invite Staff section (top):**
- Card with "Invite a Team Member" heading
- Form: Email input + Role select (Super Admin / Admin / Staff / Viewer) + "Send Invite" button
- On submit: call a Supabase Edge Function `invite-staff` that sends a Supabase auth invite email to the address, creating a pending `church_members` row with `status = 'invited'`
- Role descriptions shown as helper text below the role select:
  - Super Admin: Full access, can delete church account
  - Admin: Full access except billing and account deletion
  - Staff: Can manage people, events, communications. Cannot access finance or settings
  - Viewer: Read-only access to all modules

**Current Team Members table (below invite form):**
- shadcn `Table`
- Columns: Member (avatar + name + email), Role (editable badge/select), Status (Active / Invited — badge), Joined Date, Actions
- Role column: clicking the badge opens an inline shadcn `Select` to change the role — fires a mutation on change to PATCH `church_members.role`
- Actions column: "Remove" button (red, `variant="destructive"` outline) — opens a confirmation `AlertDialog` before deleting. Cannot remove yourself or the last Super Admin (show disabled state with tooltip explaining why)
- Pending invites show a "Resend Invite" action instead of "Remove" + show `status = 'Invited'` badge in amber
- Query: `SELECT * FROM church_members JOIN profiles ON church_members.user_id = profiles.id WHERE church_members.church_id = :churchId ORDER BY church_members.created_at ASC`

---

#### 2D. Notifications (`/settings/notifications`)

**PageHeader:** "Notification Preferences" / "Choose what updates you want to be notified about"

Two sections: **Email Notifications** and **In-App Notifications**

Each section is a card with a list of toggle rows. Each row: icon + label + description + `Switch` on right.

**Email Notifications:**
- New Member Joined — "Get notified when a new member joins your church"
- New Donation Received — "Get notified for every donation made"
- Weekly Giving Summary — "Receive a weekly summary of all giving"
- New Event Created — "Get notified when a new event is scheduled"
- Member Request Submitted — "Get notified when a member submits a request"
- New Visitor Logged — "Get notified when a visitor is recorded"
- Weekly Activity Digest — "A weekly email summary of church activity"
- Security Alert — "Get notified of suspicious login activity" (cannot be disabled — show locked toggle)

**In-App Notifications:**
- Same list as above (separate toggles)

**Save behavior:** single "Save Preferences" button at the bottom. On submit: PATCH `notification_preferences` table row for the current user + church. Show `toast.success("Preferences saved")`.

---

#### 2E. Billing & Subscription (`/settings/billing`)

**PageHeader:** "Billing & Subscription" / "Manage your plan and usage"

**Current Plan Card:**
- Shows plan name in large `text-2xl font-bold` (e.g. "Free Plan")
- Plan badge: `variant="secondary"` for Free, `variant="default"` (indigo) for paid plans
- Plan features list (checkmarks): show what the current plan includes
- "Upgrade Plan" button (indigo, prominent) — for now this opens a shadcn `Dialog` modal showing plan comparison table (Free / Starter / Pro / Enterprise) with a "Coming Soon — Payments launching soon" message and an email capture input "Notify me when billing goes live"

**Usage Meters section:**
- Three progress bars using shadcn `Progress` component:
  - Members: `{current} / {limit} members used` — query count from `church_members`, limit from plan config
  - Storage: `{usedGB} GB / {limitGB} GB used` — placeholder values for now (0.2 GB / 1 GB for free plan)
  - Staff Accounts: `{current} / {limit} staff accounts`
- Each bar: label on left, value on right, progress bar below, color changes to amber at 80% and red at 95%

**Billing History table:**
- shadcn `Table` with columns: Date, Description, Amount, Status, Invoice
- For now, show an empty state: "No billing history yet. Your invoices will appear here once you upgrade."

**Payment Method section:**
- Empty state card: "No payment method on file" + "Add Payment Method" button (disabled, shows "Coming Soon" tooltip)

---

#### 2F. Security (`/settings/security`)

**PageHeader:** "Security" / "Manage your account security settings"

**Change Password card:**
- Form fields: Current Password, New Password, Confirm New Password — all `type="password"` with show/hide toggle (eye icon)
- Zod validation: new password min 8 chars, must contain at least 1 uppercase, 1 number, 1 special character. Confirm must match new password.
- Password strength meter below "New Password" field: 4-segment bar (Weak / Fair / Strong / Very Strong) — calculated client-side based on entropy
- Submit: call `supabase.auth.updateUser({ password: newPassword })`. Show `toast.success("Password updated successfully")` on success.

**Two-Factor Authentication card:**
- Toggle switch for 2FA
- Currently shows "Coming Soon" badge next to the toggle — switch is disabled
- Description: "Add an extra layer of security to your account with TOTP-based 2FA"

**Active Sessions card:**
- Table of active sessions: Device (icon: desktop/mobile/tablet based on user agent), Browser, Location (country + city if available), Last Active, Status (Current Session badge in green for current)
- "Revoke" button on each non-current session — calls `supabase.auth.admin.signOut(userId, 'others')` via an Edge Function
- "Sign Out All Other Sessions" button at the bottom of the card

**Login History card:**
- Table showing last 10 login events: Date/Time, IP Address, Device, Location, Status (Success / Failed)
- Query from a `login_events` table (create this table: `id`, `user_id`, `ip_address`, `user_agent`, `location`, `status`, `created_at`)
- A Supabase Auth Hook (`auth.users` `on_sign_in`) should insert a row into `login_events` on every login — implement this as a Supabase Database Function + Auth Hook

---

#### 2G. Integrations (`/settings/integrations`)

**PageHeader:** "Integrations" / "Connect third-party services to extend your church platform"

**Layout:** responsive grid `grid-cols-1 md:grid-cols-2 gap-4`

Each integration is a card with:
- Service logo (SVG icon or placeholder colored square with initials)
- Service name in `font-semibold`
- Short description in `text-sm text-slate-500`
- Status badge: "Connected" (emerald) or "Not Connected" (slate)
- Action button: "Connect" (indigo outline) or "Disconnect" (red outline) + "Configure" (secondary) if connected
- Some show "Coming Soon" badge and disabled button

**Integrations to show:**

*Payments*
- **Stripe** — "Accept online donations and process payouts" — Status: Not Connected — Connect button opens a modal with Stripe API Key input (publishable key + secret key) — saves to `church_integrations` table encrypted
- **M-Pesa (Daraja API)** — "Accept mobile money payments via M-Pesa" — Status: Not Connected — Connect button opens modal with Consumer Key, Consumer Secret, Shortcode, Passkey inputs

*Communication*
- **Twilio** — "Send SMS notifications to members" — Coming Soon
- **SendGrid** — "Transactional email delivery" — Coming Soon
- **WhatsApp Business API** — "Send WhatsApp messages to members" — Coming Soon

*Media*
- **YouTube** — "Link your YouTube channel for livestreaming" — Not Connected — Connect button opens modal with YouTube Channel ID + API Key inputs
- **Zoom** — "Embed Zoom meetings and livestreams" — Coming Soon
- **Vimeo** — "Host and stream sermon videos" — Coming Soon

*Marketing*
- **Mailchimp** — "Sync members to Mailchimp email lists" — Coming Soon
- **Google Analytics** — "Track your public church page traffic" — Not Connected — Connect button opens modal with GA Measurement ID input

*Productivity*
- **Google Calendar** — "Sync church events to Google Calendar" — Coming Soon
- **Zapier** — "Automate workflows between Church Central Cloud and 5000+ apps" — Coming Soon

**`church_integrations` table (create via migration):**
- `id` UUID PK
- `church_id` UUID FK → `churches.id`
- `service_name` TEXT
- `status` TEXT (connected / disconnected)
- `config` JSONB (encrypted sensitive keys — use Supabase Vault or store as encrypted text)
- `connected_at` TIMESTAMPTZ
- `connected_by` UUID FK → `profiles.id`

---

#### 2H. SEO & Public Page (`/settings/seo`)

**PageHeader:** "SEO & Public Page" / "Control how your church appears in search engines and on social media"

This is the most complex settings sub-section. It is split into three panels:

**Left panel (form, `w-full lg:w-1/2`):**

*Basic SEO section:*
- **Page Title** — text input, max 60 chars. Character counter below input (e.g. "42 / 60"). Turns amber at 55+, red at 60. Helper text: "This is the title shown in Google search results."
- **Meta Description** — textarea, max 160 chars. Character counter. Helper text: "A brief summary shown below your title in search results."
- **Keywords** — tag input (type a keyword, press Enter or comma to add as a chip/badge, click chip to remove). Stored as `TEXT[]` array. Helper text: "Separate keywords with commas. Add up to 15."
- **Canonical URL** — auto-generated, read-only display: `https://churchcentralcloud.com/church/{slug}` — shown in a `bg-slate-100` code-style box

*Open Graph / Social Sharing section:*
- **OG Title** — text input (defaults to Page Title if empty), max 60 chars with counter
- **OG Description** — textarea (defaults to Meta Description if empty), max 160 chars with counter
- **OG Image** — image upload component. Recommended size shown: "1200 × 630px recommended". Upload to Supabase Storage bucket `church-og-images` at path `{church_id}/og.jpg`. Shows current image preview (16:9 ratio box, `object-cover`). "Upload Image" button + "Remove" link.
- **Twitter Card Type** — shadcn `Select`: Summary (`summary`) / Summary with Large Image (`summary_large_image`). Default: `summary_large_image`

*Analytics & Tracking section:*
- **Google Analytics Measurement ID** — text input (format: `G-XXXXXXXXXX`), with format validation in Zod (must match `/^G-[A-Z0-9]{10}$/` or be empty). Helper text: "Paste your GA4 Measurement ID to track public page visitors."
- **Facebook Pixel ID** — text input, optional, numeric. Helper text: "Track conversions from Facebook ads."
- **Google Search Console Verification** — text input for meta tag content value (the `content` attribute of the GSC verification meta tag)

*Structured Data section:*
- **Enable Schema.org Structured Data** — `Switch` toggle. When enabled, auto-generates a `LocalBusiness` + `Church` JSON-LD block from the church profile data. Show a read-only expandable code preview below the toggle (shadcn `Collapsible`) showing the JSON-LD that will be injected, e.g.:
```json
{
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "Church"],
  "name": "Grace Community Church",
  "url": "https://churchcentralcloud.com/church/grace-community",
  "logo": "https://...",
  "address": { "@type": "PostalAddress", "addressLocality": "Nairobi", "addressCountry": "KE" },
  "telephone": "+254...",
  "openingHours": "Su 09:00-12:00"
}
```

*Public Page Visibility section:*
- **Make Public Page Visible** — `Switch` toggle. When off, the `/church/:slug` page returns a 404 / "page not found" state for non-admins. When on, the page is publicly accessible. Default: on.
- **Show in Church Directory** — `Switch` toggle. Whether this church appears in a future Church Central Cloud directory listing. Default: on.

**Right panel (live preview, `w-full lg:w-1/2`, sticky top on desktop):**

*Google SERP Preview card:*
- Title: "Search Engine Preview"
- Mock Google search result UI (read-only, updates live as user types):
  - Favicon circle (16px) + domain `churchcentralcloud.com › church › {slug}` in `text-sm text-green-700`
  - Page title in `text-xl text-blue-700 hover:underline font-normal` — shows live value from Page Title input, truncated at 60 chars with `...`
  - Meta description in `text-sm text-slate-600` — shows live value, truncated at 160 chars
  - If title is empty: shows placeholder "Your Church Name — Church Central Cloud" in `text-slate-400`
  - If description is empty: shows placeholder "Add a meta description to tell people what your church is about." in `text-slate-400`

*Social Card Preview card (below SERP preview):*
- Title: "Social Media Preview"
- Mock social share card (Facebook/WhatsApp style):
  - OG Image preview (full width, 16:9 ratio, `bg-slate-200` with camera icon placeholder if no image uploaded)
  - Below image: `text-xs text-slate-400 uppercase` domain label
  - OG Title in `font-semibold text-sm`
  - OG Description in `text-sm text-slate-500`
- Tab switcher above the card: "Facebook / WhatsApp" | "Twitter / X" — switching shows slightly different preview dimensions

**Save behavior:** "Save SEO Settings" button (full width, indigo). On submit via React Hook Form + Zod: UPSERT to `church_seo_settings` table. Show `toast.success("SEO settings saved")`.

**`church_seo_settings` table (create via Supabase migration):**
```sql
CREATE TABLE church_seo_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE UNIQUE,
  page_title TEXT,
  meta_description TEXT,
  keywords TEXT[],
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  twitter_card_type TEXT DEFAULT 'summary_large_image',
  ga_measurement_id TEXT,
  facebook_pixel_id TEXT,
  gsc_verification TEXT,
  structured_data_enabled BOOLEAN DEFAULT true,
  public_page_visible BOOLEAN DEFAULT true,
  show_in_directory BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE church_seo_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Church admins can manage their SEO settings"
  ON church_seo_settings
  FOR ALL
  USING (
    church_id IN (
      SELECT church_id FROM church_members
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );
```

---

### PART 3 — PUBLIC CHURCH PAGE (`/church/:slug`)

This is a **fully public, unauthenticated page** accessible to anyone with the URL. It is the church's public profile on the internet and is the page that gets indexed by Google.

**Route:** `/church/:slug` — no `AuthGuard`, no `AppLayout`. Has its own standalone layout.

**Head tags (injected via `react-helmet-async` using data from `church_seo_settings` + `churches`):**
```html
<title>{seo.page_title || church.name + " — Church Central Cloud"}</title>
<meta name="description" content="{seo.meta_description}" />
<meta name="keywords" content="{seo.keywords.join(', ')}" />
<link rel="canonical" href="https://churchcentralcloud.com/church/{slug}" />
<meta name="robots" content="index, follow" />

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:title" content="{seo.og_title || church.name}" />
<meta property="og:description" content="{seo.og_description || seo.meta_description}" />
<meta property="og:image" content="{seo.og_image_url}" />
<meta property="og:url" content="https://churchcentralcloud.com/church/{slug}" />
<meta property="og:site_name" content="Church Central Cloud" />

<!-- Twitter -->
<meta name="twitter:card" content="{seo.twitter_card_type}" />
<meta name="twitter:title" content="{seo.og_title || church.name}" />
<meta name="twitter:description" content="{seo.og_description || seo.meta_description}" />
<meta name="twitter:image" content="{seo.og_image_url}" />

<!-- Google Analytics (if GA ID set) -->
{seo.ga_measurement_id && (
  <script async src="https://www.googletagmanager.com/gtag/js?id={seo.ga_measurement_id}" />
  <script>{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${seo.ga_measurement_id}');`}</script>
)}

<!-- Google Search Console verification -->
{seo.gsc_verification && (
  <meta name="google-site-verification" content="{seo.gsc_verification}" />
)}

<!-- Schema.org JSON-LD -->
{seo.structured_data_enabled && (
  <script type="application/ld+json">{JSON.stringify(structuredDataObject)}</script>
)}
```

**Page content sections:**

*Hero section:*
- Church logo (120px circular) centered
- Church name in `text-4xl font-bold text-center`
- Tagline/mission statement in `text-lg text-slate-500 text-center max-w-xl mx-auto`
- "Join Our Church" CTA button (links to a modal with the church access code display + QR code — for members to use)
- Background: white with a subtle indigo gradient at the top

*About section:*
- "About Us" heading
- Church description / mission statement (from `churches.about` field — add this field to the `churches` table if not present, `TEXT`)
- Grid of facts: Founded Year, Denomination, Average Attendance, Location — each as an icon + label + value card

*Service Times section:*
- "Join Us" heading
- Cards for each service day/time: day name + time + service name (e.g. "Sunday · 9:00 AM · Main Service")

*Contact section:*
- Address with Google Maps embed (iframe using the church's address as query)
- Phone, email, website as clickable links with icons
- Social media links row (Facebook, Instagram, YouTube, Twitter/X, WhatsApp)

*Footer:*
- "Powered by Church Central Cloud" with logo
- Link back to main landing page

**If `public_page_visible = false`:** render a simple 404-style page: church logo (blurred/greyscale), "This church's page is currently private." message, back button.

**If slug does not match any church in DB:** render a proper 404 page with a "Go to Church Central Cloud" CTA.

---

### PART 4 — APP-WIDE SEO INFRASTRUCTURE

**Dynamic page titles via `react-helmet-async`:**

Every route must set its own `<title>` tag. The pattern is `{Page Name} — Church Central Cloud`. Add this to every page component that was scaffolded in Phase 1 as a placeholder. Use a `useSEO(title, description)` custom hook that wraps `react-helmet-async`:

```typescript
// src/hooks/useSEO.ts
import { Helmet } from 'react-helmet-async';

export function useSEO(title: string, description?: string) {
  return (
    <Helmet>
      <title>{title} — Church Central Cloud</title>
      {description && <meta name="description" content={description} />}
    </Helmet>
  );
}
```

**`robots.txt` (add to `/public/robots.txt`):**
```
User-agent: *
Allow: /
Allow: /church/
Disallow: /dashboard
Disallow: /settings
Disallow: /members
Disallow: /finance
Disallow: /reports

Sitemap: https://churchcentralcloud.com/sitemap.xml
```

**`sitemap.xml` (Supabase Edge Function `generate-sitemap`):**
- Queries all churches where `public_page_visible = true`
- Returns an XML sitemap listing:
  - `https://churchcentralcloud.com/` (homepage)
  - `https://churchcentralcloud.com/church/{slug}` for each public church
- Set cache headers: `Cache-Control: public, max-age=86400`
- Expose at `/sitemap.xml` via a redirect rule in Vite config or via Supabase Edge Function URL

---

### PART 5 — DATABASE MIGRATIONS NEEDED IN THIS PHASE

Run these Supabase migrations:

1. **Add fields to `churches` table:**
```sql
ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS about TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'KE',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS founded_year INT,
  ADD COLUMN IF NOT EXISTS denomination TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS service_days TEXT[],
  ADD COLUMN IF NOT EXISTS service_time TEXT,
  ADD COLUMN IF NOT EXISTS average_attendance INT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
```

2. **Create `church_seo_settings` table** — as defined in Part 2H above

3. **Create `church_integrations` table** — as defined in Part 2G above

4. **Create `login_events` table:**
```sql
CREATE TABLE login_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  location TEXT,
  status TEXT CHECK (status IN ('success', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own login events"
  ON login_events FOR SELECT
  USING (user_id = auth.uid());
```

5. **Create `notification_preferences` table:**
```sql
CREATE TABLE notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  email_new_member BOOLEAN DEFAULT true,
  email_new_donation BOOLEAN DEFAULT true,
  email_weekly_summary BOOLEAN DEFAULT true,
  email_new_event BOOLEAN DEFAULT true,
  email_member_request BOOLEAN DEFAULT true,
  email_new_visitor BOOLEAN DEFAULT true,
  email_weekly_digest BOOLEAN DEFAULT true,
  inapp_new_member BOOLEAN DEFAULT true,
  inapp_new_donation BOOLEAN DEFAULT true,
  inapp_weekly_summary BOOLEAN DEFAULT false,
  inapp_new_event BOOLEAN DEFAULT true,
  inapp_member_request BOOLEAN DEFAULT true,
  inapp_new_visitor BOOLEAN DEFAULT true,
  inapp_weekly_digest BOOLEAN DEFAULT false,
  UNIQUE(user_id, church_id)
);
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid());
```

---

**Build exactly this. Do not modify the AppLayout, AuthGuard, Dashboard, or any Phase 1 code. Only add new routes, components, and database tables as defined above. Every settings sub-section must be fully functional and connected to Supabase — no mock data in Settings.**

