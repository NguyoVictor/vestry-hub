> ⚠️ **SCHEMA CORRECTION NOTICE** — The table/column names written in this spec are the ORIGINAL spec names and DO NOT match the actual database. Always use `src/lib/schema.ts` TABLES/COLS constants. See `.kiro/specs/schema-correction-notice.md` for the full override list. Quick reference:
> - spec `churches` = actual **tenants** | spec `donations` = actual **giving_records** | spec `church_expenses` = actual **expenses**
> - spec `budget_lines` = actual **budget_categories** | spec `church_seo_settings` = actual **tenant_seo_settings**
> - spec `church_members` = actual **role_permissions** | spec `attendance` = actual **attendance_records**
> - spec `church_id` col = actual **tenant_id** | spec `logo_url` = actual **logo** | spec `donation_date` = actual **given_at**
> - spec `payment_reference` = actual **pesapal_transaction_id** | spec `rsvp_deadline` = actual **registration_deadline**
> - spec `start_datetime` = actual **event_date** | spec `events.status=published` = actual **events.is_published=true**
> - spec `events.capacity` = actual **capacity_limit** | spec `onboarding_complete` = actual **onboarding_completed**

Here is your **Phase 4 prompt** — Finance Module:

---

## 🏗️ Lovable Prompt — Phase 4: Finance Module

---

**CONTEXT — What already exists, do not rebuild:**

This is **Vestry**, a multi-tenant Church SaaS platform. The following phases are already complete:
- Phase 0: Supabase Auth, onboarding, church access code + QR code
- Phase 1: AppLayout (collapsible sidebar, top navbar, dark mode), AuthGuard, Dashboard Overview, all routes scaffolded
- Phase 2: Full Settings (Church Profile, Services & Modules, Roles & Permissions, Notifications, Billing, Security, Integrations, SEO & Public Page), public church page at `/church/:slug`
- Phase 3: Full People module (Members, Groups, House Fellowships, Families, Visitors, Follow-Up Tasks, New Converts) with all shared components (`<DataTable>`, `<MemberAvatar>`, `<StatusBadge>`, `<FilterSidebar>`)

**Do not touch any of the above. This phase replaces the placeholder pages for the Finance section only:**
`/give-online`, `/giving-records`, `/pledge-campaigns`, `/church-expenses`, `/budget-management`, `/payroll`, `/fund-accounting`, `/accounts-payable`, `/general-ledger`, `/payouts`

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
- `@react-pdf/renderer` (PDF generation for payslips, reports, receipts)

---

### PART 1 — SHARED FINANCE COMPONENTS

Before building individual pages, create these reusable components used across all Finance pages:

**`<CurrencyDisplay>` component:**
- Props: `amount: number`, `currency?: string` (defaults to church's currency from `useChurch()` context), `size?: 'sm' | 'md' | 'lg'`
- Formats the number as currency using `Intl.NumberFormat` with the correct locale and currency symbol
- KES → `KSh 12,500`, USD → `$12,500`, GBP → `£12,500` etc.
- Positive amounts: default text color. Negative amounts (expenses): `text-red-600`. Large positive amounts (income): `text-emerald-600`

**`<FinanceStatCard>` component:**
- Same structure as the KPI cards on the Dashboard but finance-specific
- Props: `title`, `amount: number`, `currency`, `icon`, `color`, `trend?: {value: number, label: string}`, `subtitle?: string`
- Shows currency formatted amount prominently, trend badge, subtitle below

**`<TransactionBadge>` component:**
- Maps transaction types to colored badges:
  - `tithe` → indigo
  - `offering` → emerald
  - `building_fund` → amber
  - `welfare` → violet
  - `missions` → cyan
  - `special` → pink
  - `expense` → red
  - `payroll` → orange
  - `other` → slate

**`<PaymentMethodIcon>` component:**
- Props: `method: string`
- Maps payment methods to icons:
  - `cash` → `Banknote` icon (green)
  - `mpesa` → custom M-Pesa green circle with "M" text
  - `bank_transfer` → `Building2` icon (blue)
  - `card` → `CreditCard` icon (indigo)
  - `cheque` → `FileText` icon (slate)
  - `other` → `Circle` icon (slate)

---

### PART 2 — GIVE ONLINE PAGE (`/give-online`)

**Page title:** `Give Online — Vestry`
**PageHeader:** "Give Online" / "Accept digital offerings and tithes from your congregation"

This page has two views depending on who is accessing it — **Admin View** (the default for staff) and a **Giving Form** (what members see / what admins use to record manual giving).

---

**ADMIN VIEW — Default:**

**Top stats row (4 cards using `<FinanceStatCard>`):**
- Total Giving Today
- Total Giving This Month
- Total Giving This Year
- Average Gift Amount (this month)

All queried from `giving_records` ~~(spec said `giving_records`)~~ table filtered by `tenant_id` and relevant date ranges.

**Quick Record Giving panel (card, right side on desktop):**
A compact form for admins to record a manual/offline donation immediately:
- Donor: searchable select from `members` table (type name to search) OR "Anonymous" toggle
- Amount (number input with currency symbol prefix)
- Giving Category (select: Tithe / Offering / Building Fund / Welfare / Missions / Special / Other)
- Payment Method (select: Cash / M-Pesa / Bank Transfer / Card / Cheque / Other)
- M-Pesa Reference (text input, shown only if method = M-Pesa)
- Date (date picker, default today)
- Notes (text input, optional)
- "Record Giving" button (indigo, full width)
- On submit: INSERT into `giving_records` ~~(spec said `giving_records`)~~ table, INSERT into `activity_log`, invalidate giving queries, show `toast.success("Giving recorded successfully")`

**Recent Donations table (below stats, left side on desktop):**
- Last 10 giving_records for this church
- Columns: Donor (avatar + name or "Anonymous"), Amount (`<CurrencyDisplay>`), Category (`<TransactionBadge>`), Method (`<PaymentMethodIcon>` + label), Date, Actions (View Receipt, Edit, Delete with confirmation)
- "View All Donations" link → `/giving-records`

**Giving Link & QR Code card:**
- Shows the church's public giving URL: `vestry.app/give/{church-slug}`
- Copy URL button
- QR code (generated using `qrcode.react` library) for the giving URL — members can scan to give
- "Download QR Code" button (downloads as PNG)
- Note: the public giving form at `/give/:slug` is a standalone public page (no auth required) — scaffold it as a simple form page in this phase with fields: Amount, Category, Payment Method, Donor Name (optional), Email (optional), Message (optional). For now it is UI-only with a "Coming Soon — Online payments integration launching soon" notice. Stripe integration will be wired in Phase 9.

---

### PART 3 — GIVING RECORDS PAGE (`/giving-records`)

**Page title:** `Giving Records — Vestry`
**PageHeader:** "Giving Records" / "View, search and export your complete donation history"
**Header actions:** "Export CSV" button + "Export PDF" button + "Record Giving" button

---

**Top filter bar (above table, horizontal):**
- Date range picker (From / To) — default: current month
- Category multi-select filter
- Payment method multi-select filter
- Donor search input
- "Clear Filters" link

**Summary bar (between filter bar and table):**
A slim `bg-slate-50 dark:bg-slate-800 rounded-lg p-3` bar showing:
- Total records matching current filter: "Showing 142 giving_records"
- Total amount for filtered results: `Total: KSh 2,450,000`
- Average gift: `Avg: KSh 17,253`

**Giving Records Table:**

`<DataTable>` with columns:

| Column | Content | Sortable |
|--------|---------|----------|
| Checkbox | Row selection | — |
| Donor | Avatar + name (or "Anonymous") | ✅ |
| Amount | `<CurrencyDisplay>` in `font-semibold text-emerald-600` | ✅ |
| Category | `<TransactionBadge>` | ✅ |
| Payment Method | `<PaymentMethodIcon>` + label | ❌ |
| Reference | M-Pesa code or bank ref (or "—") | ❌ |
| Date | Formatted date | ✅ |
| Recorded By | Staff avatar + name | ❌ |
| Actions | View Receipt, Edit, Delete | — |

**Bulk actions (when rows selected):**
- Export selected as CSV
- Export selected as PDF
- Delete selected (with confirmation dialog showing count)

**View Receipt — Dialog:**
Opens a styled receipt preview when "View Receipt" is clicked:
- Vestry / church logo at top
- "DONATION RECEIPT" heading
- Receipt number (auto-generated: `RCP-{year}-{sequential number}`)
- Donor name, date, amount, category, payment method, reference
- "Thank you for your generosity" message
- Church name + address + contact
- "Download PDF" button — generates PDF using `@react-pdf/renderer`
- "Print" button — triggers `window.print()` on the receipt content

**Edit Donation — Sheet:**
Same fields as Record Giving form, pre-filled. PATCHes the `giving_records` ~~(spec said `giving_records`)~~ row on submit.

**Export CSV:**
Exports all filtered giving_records (not just current page) as CSV using `papaparse`. Filename: `vestry-giving-records-{date}.csv`

**Export PDF:**
Generates a formatted PDF report using `@react-pdf/renderer`:
- Header: church logo + name + "Giving Report" + date range
- Summary table: total by category
- Full giving_records table
- Footer: generated date + "Powered by Vestry"

---

### PART 4 — PLEDGE CAMPAIGNS PAGE (`/pledge-campaigns`)

**Page title:** `Pledge Campaigns — Vestry`
**PageHeader:** "Pledge Campaigns" / "Run fundraising pledge drives for your church projects"
**Header actions:** "Create Campaign" button

---

**Campaigns list view:**

Card grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

Each campaign card:
- Campaign name in `font-semibold text-lg`
- Campaign category badge (Building Fund / Missions / Equipment / Welfare / Other)
- Status badge: Active (emerald) / Completed (blue) / Cancelled (red) / Draft (slate)
- Target amount: `Target: KSh 5,000,000` in `text-sm text-slate-500`
- Progress bar (shadcn `Progress`): filled based on `(total_pledged / target_amount) * 100`, color: indigo below 50%, amber at 50–80%, emerald at 80%+
- Amount pledged vs target: `KSh 3,200,000 / KSh 5,000,000` below the progress bar
- Pledge count: `47 pledges`
- Campaign dates: `12 Jan 2025 — 30 Jun 2025`
- Three-dot menu: View Campaign, Edit, Duplicate, Archive, Delete

**Create / Edit Campaign — Sheet form:**

Fields:
- Campaign Name (required, max 100 chars)
- Description (textarea, max 500 chars)
- Category (select: Building Fund / Missions / Equipment / Welfare / Community / Other)
- Target Amount (number input with currency prefix)
- Start Date (date picker, required)
- End Date (date picker, required, must be after start date)
- Status (select: Draft / Active / Completed / Cancelled, default Draft)
- Allow Anonymous Pledges (toggle)
- Campaign Image (image upload, optional — shows as card header image)

**Campaign Detail Page (`/pledge-campaigns/:campaignId`):**

**Layout:** Full-width page with campaign header (image if set, or indigo gradient banner), then two-column content below.

**Campaign header:**
- Campaign name in `text-3xl font-bold text-white` (overlaid on banner)
- Status badge + category badge
- Progress ring (large circular progress, 120px) showing percentage
- Key stats inline: Target / Pledged / Fulfilled / Remaining

**Left column (2/3 width):**

*Pledges table:*
- Columns: Pledger (avatar + name or "Anonymous"), Pledge Amount, Amount Paid, Balance Due, Pledge Date, Fulfillment Status (Pending / Partial / Fulfilled), Actions
- "Record Pledge" button above table

*Payments against this campaign:*
- List of giving_records linked to this campaign (from `giving_records` ~~(spec said `giving_records`)~~ where `campaign_id = :id`)

**Right column (1/3 width):**

*Progress card:*
- Large progress bar
- Pledged vs Target amounts
- % funded
- Days remaining (or "Campaign ended X days ago")

*Fulfillment chart (Recharts `PieChart`):*
- Slices: Fulfilled / Partial / Pending pledges
- Legend below

*Top Pledgers list:*
- Top 5 pledgers by amount, with avatar + name + amount

**Record Pledge — Dialog:**
Fields:
- Pledger: searchable member select or Anonymous toggle
- Pledge Amount (number input)
- Initial Payment Amount (number input, optional — can be 0 if just recording a pledge with no payment yet)
- Payment Method (select)
- Pledge Date (date picker, default today)
- Notes (text input)
- On submit: INSERT into `pledges` table + if initial payment > 0, INSERT into `pledge_payments` table + INSERT into `giving_records` ~~(spec said `giving_records`)~~ table linked to campaign

---

### PART 5 — CHURCH EXPENSES PAGE (`/church-expenses`)

**Page title:** `Church Expenses — Vestry`
**PageHeader:** "Church Expenses" / "Log, categorize and approve church expenditure"
**Header actions:** "Add Expense" button + "Export" button

---

**Top stats row (3 cards):**
- Total Expenses This Month
- Total Expenses This Year
- Pending Approval (count + total amount)

**Expenses Table:**

`<DataTable>` with columns:

| Column | Content | Sortable |
|--------|---------|----------|
| Checkbox | Row selection | — |
| Description | Expense title in `font-medium` + category badge below | ✅ |
| Amount | `<CurrencyDisplay>` in `text-red-600` | ✅ |
| Category | `<TransactionBadge>` | ✅ |
| Payment Method | `<PaymentMethodIcon>` + label | ❌ |
| Vendor | Vendor name (or "—") | ✅ |
| Date | Formatted date | ✅ |
| Approval Status | Badge: Pending (amber) / Approved (emerald) / Rejected (red) | ✅ |
| Receipt | Paperclip icon if receipt uploaded, else "—" | ❌ |
| Actions | View, Edit, Approve, Reject, Delete | — |

**Approval workflow:**
- Only Super Admin and Admin can approve/reject
- Staff can add expenses (status defaults to Pending)
- "Approve" button turns status to Approved, records `approved_by` + `approved_at`
- "Reject" button opens a dialog for rejection reason, turns status to Rejected
- Bulk approve: select multiple pending expenses → "Approve Selected" bulk action

**Add / Edit Expense — Sheet form:**

Fields:
- Expense Title / Description (required, max 200 chars)
- Amount (number input with currency prefix, required)
- Expense Category (select: Salaries / Utilities / Rent / Equipment / Maintenance / Events / Outreach / Supplies / Transport / Other)
- Payment Method (select: Cash / M-Pesa / Bank Transfer / Card / Cheque)
- Payment Reference (text input, optional)
- Vendor / Payee Name (text input, optional)
- Vendor Phone / Email (text inputs, optional)
- Expense Date (date picker, default today)
- Budget Line (select from active budget categories if Budget module enabled)
- Receipt Upload (file upload — accepts PDF, JPG, PNG — uploads to Supabase Storage `expense-receipts/{tenant_id}/{expense_id}/`)
- Notes (textarea, optional)
- Recurring expense toggle — if on: show frequency select (Weekly / Monthly / Quarterly / Annually) + end date

**Receipt Viewer:**
If a receipt is uploaded, clicking the paperclip icon opens a Dialog showing:
- If PDF: embedded PDF viewer (`<iframe>`)
- If image: `<img>` with zoom capability
- "Download" button

---

### PART 6 — BUDGET MANAGEMENT PAGE (`/budget-management`)

**Page title:** `Budget Management — Vestry`
**PageHeader:** "Budget Management" / "Plan and track your annual church budget"
**Header actions:** "Create Budget" button + year selector (select dropdown defaulting to current year)

---

**Budget Overview cards (top):**
- Total Annual Budget (sum of all budget line allocations)
- Total Spent YTD (sum of all approved expenses linked to budget lines)
- Remaining Budget
- Budget Utilization % (large circular progress, 80px)

**Budget vs Actual Chart:**

`BarChart` from Recharts, grouped bars, height 320px:
- X-axis: budget categories
- Two bars per category: Budgeted (indigo) vs Actual Spent (emerald)
- If actual > budgeted: actual bar turns red (over budget)
- Tooltip: shows both values + variance amount

**Budget Lines Table (below chart):**

`<DataTable>` with columns:

| Column | Content |
|--------|---------|
| Category | Category name + icon |
| Annual Budget | Allocated amount |
| Spent YTD | Total approved expenses in this category |
| Remaining | Budget − Spent (red if negative) |
| Utilization | Mini progress bar showing % used |
| Actions | Edit allocation, View transactions |

**Create Budget — Dialog:**

Fields:
- Budget Year (number, default current year)
- Budget Name (e.g. "2025 Annual Budget")
- Budget Lines (dynamic list — add/remove rows):
  - Each row: Category (select from expense categories) + Allocated Amount
  - "Add Line" button at bottom of list
- Total at bottom of dialog: sum of all allocated amounts
- "Save Budget" — INSERTs a `budgets` row + multiple `budget_categories` ~~(spec said `budget_categories`)~~ rows

**Edit Budget Line — inline editing:**
Click the amount in the Budget Lines table to edit it inline (contenteditable-style input that saves on blur/enter).

**Over-Budget Alert:**
If any budget line has spent > 90% of allocation: show an amber warning banner at the top of the page listing the affected categories.

---

### PART 7 — PAYROLL PAGE (`/payroll`)

**Page title:** `Payroll — Vestry`
**PageHeader:** "Payroll" / "Manage staff salaries and generate payslips"
**Header actions:** "Add Staff Member" button + "Run Payroll" button

---

**Top stats (3 cards):**
- Total Monthly Payroll (sum of all active staff gross salaries)
- Staff Count (active payroll staff)
- Last Payroll Run (date of last payroll processing)

**Staff Payroll Table:**

`<DataTable>` with columns:

| Column | Content | Sortable |
|--------|---------|----------|
| Staff Member | Avatar + name + role/title | ✅ |
| Gross Salary | `<CurrencyDisplay>` | ✅ |
| Deductions | Total deductions (PAYE, NHIF, NSSF, other) | ❌ |
| Net Salary | Gross − Deductions in `font-semibold text-emerald-600` | ✅ |
| Payment Method | `<PaymentMethodIcon>` + label | ❌ |
| Bank / M-Pesa | Account number (masked: `****1234`) | ❌ |
| Status | Active / On Leave / Terminated | ✅ |
| Actions | Edit, View Payslips, Deactivate | — |

**Add / Edit Staff Payroll — Sheet form:**

Fields:
- Link to Member (searchable select from `members`) — auto-fills name
- Job Title / Role (text input)
- Employment Type (select: Full-time / Part-time / Contract / Volunteer Stipend)
- Gross Salary (number input)
- Deductions section (dynamic — add/remove):
  - Each deduction: Name (text, e.g. "PAYE", "NHIF", "NSSF", "Loan Repayment") + Type (Fixed Amount / Percentage) + Value
  - Common Kenya deductions pre-populated as suggestions: PAYE (variable %), NHIF (KSh 1,700 fixed), NSSF (KSh 2,160 fixed)
- Net Salary (auto-calculated, read-only display, updates live as deductions change)
- Payment Method (select: Bank Transfer / M-Pesa / Cash / Cheque)
- Bank Name (text input, shown if Bank Transfer)
- Account Number (text input, shown if Bank Transfer)
- M-Pesa Number (phone input, shown if M-Pesa)
- Pay Frequency (select: Monthly / Bi-weekly / Weekly)
- Start Date (date picker)
- Notes (textarea)

**Run Payroll — Dialog (triggered by "Run Payroll" button):**

Step 1 — Review:
- Table showing all active staff with their net pay amounts
- Total payroll amount prominently displayed
- Payroll period selector (Month + Year)
- Any staff missing payment details shown with a warning icon
- "Proceed to Confirm" button

Step 2 — Confirm:
- Summary: "You are about to process payroll for X staff members totaling {amount} for {period}"
- Checklist confirmation: "I confirm the amounts are correct" (checkbox, required)
- "Process Payroll" button (indigo)
- On confirm: INSERT into `payroll_runs` table + INSERT into `payroll_payments` (one per staff) + INSERT into `giving_records` ~~(spec said `giving_records`)~~ (expense type) for each payment + INSERT into `activity_log`
- Show `toast.success("Payroll processed successfully for {period}")`

Step 3 — Complete:
- Success state with summary
- "Download Payroll Summary PDF" button
- "Send Payslips" button — triggers Edge Function to email each staff member their payslip

**Payslip View (`/payroll/:staffId/payslips`):**
- List of all payroll runs for this staff member
- Each row: period, gross, deductions breakdown, net, status, "Download Payslip" button
- Payslip PDF (generated with `@react-pdf/renderer`):
  - Church logo + name header
  - "PAYSLIP" title + period
  - Employee details table: Name, Job Title, Employee ID, Pay Period
  - Earnings table: Basic Salary + any additions
  - Deductions table: each deduction line itemized
  - Net Pay (large, bold)
  - Payment method + reference
  - Church stamp/signature area placeholder
  - Footer: "This is a computer-generated payslip"

---

### PART 8 — FUND ACCOUNTING PAGE (`/fund-accounting`)

**Page title:** `Fund Accounting — Vestry`
**PageHeader:** "Fund Accounting" / "Track restricted and unrestricted church funds"
**Header actions:** "Create Fund" button

---

**Funds overview grid:**

Card grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

Each fund card:
- Fund name in `font-semibold`
- Fund type badge: Restricted (amber) / Unrestricted (emerald) / Temporarily Restricted (blue)
- Current balance in `text-2xl font-bold` (`<CurrencyDisplay>`)
- Mini sparkline chart (last 6 months balance trend using Recharts `LineChart` with no axes, just the line)
- Total received vs total disbursed in `text-sm text-slate-500`
- "View Transactions" button

**Create / Edit Fund — Dialog:**
Fields:
- Fund Name (required)
- Fund Type (select: Restricted / Unrestricted / Temporarily Restricted)
- Description (textarea)
- Opening Balance (number input, default 0)
- Purpose / Restrictions (textarea, shown if Restricted or Temporarily Restricted)
- Target Amount (optional, for restricted funds with a goal)

**Fund Detail Page (`/fund-accounting/:fundId`):**
- Fund header card (balance, type, description)
- Transactions table (all giving_records and expenses linked to this fund):
  - Columns: Date, Description, Type (Credit/Debit), Amount, Running Balance, Reference
  - Credits (incoming) in emerald, Debits (outgoing) in red
- "Transfer Funds" button — opens Dialog to transfer an amount to another fund:
  - From Fund (pre-filled, read-only), To Fund (select), Amount, Date, Notes
  - INSERTs two `fund_transactions` rows (debit from source, credit to destination)
- Balance over time chart (Recharts `AreaChart`, monthly)

---

### PART 9 — ACCOUNTS PAYABLE PAGE (`/accounts-payable`)

**Page title:** `Accounts Payable — Vestry`
**PageHeader:** "Accounts Payable" / "Manage vendor invoices and upcoming payments"
**Header actions:** "Add Invoice" button

---

**Top stats (3 cards):**
- Total Outstanding (sum of unpaid invoices)
- Due This Week
- Overdue (sum of invoices past due date, shown in red)

**Invoices Table:**

`<DataTable>` with columns:

| Column | Content | Sortable |
|--------|---------|----------|
| Invoice # | `INV-{year}-{number}` in `font-mono text-sm` | ❌ |
| Vendor | Vendor name | ✅ |
| Description | Invoice description | ❌ |
| Amount | `<CurrencyDisplay>` | ✅ |
| Issue Date | Formatted date | ✅ |
| Due Date | Formatted date — red if overdue | ✅ |
| Status | Pending / Paid / Overdue / Partially Paid / Cancelled (`<StatusBadge>`) | ✅ |
| Actions | View, Mark as Paid, Edit, Delete | — |

**Add / Edit Invoice — Sheet form:**
Fields:
- Vendor Name (required)
- Vendor Email, Phone (optional)
- Invoice Number (auto-generated or manual override)
- Invoice Description (textarea)
- Line Items (dynamic list — add/remove rows):
  - Each row: Description + Quantity + Unit Price + Total (auto-calculated)
  - Subtotal, Tax % (optional), Total at bottom
- Issue Date (date picker, default today)
- Due Date (date picker, required)
- Payment Terms (select: Due on Receipt / Net 7 / Net 14 / Net 30 / Net 60)
- Attach Invoice Document (file upload — PDF/image)
- Notes (textarea)

**Mark as Paid — Dialog:**
Fields: Payment Date (date picker, default today), Payment Method, Reference, Notes. On confirm: UPDATE `invoices.status = 'paid'`, INSERT into `expenses` ~~(spec said `expenses`)~~ table linked to this invoice.

**Invoice PDF (view/download):**
Formatted invoice document using `@react-pdf/renderer` — church letterhead, line items table, totals, payment instructions.

---

### PART 10 — GENERAL LEDGER PAGE (`/general-ledger`)

**Page title:** `General Ledger — Vestry`
**PageHeader:** "General Ledger" / "Complete double-entry accounting records"
**Header actions:** "Add Journal Entry" button + "Export" button

---

**Account Balances summary (top):**
- Two-column layout: Assets & Income (left, emerald) vs Liabilities & Expenses (right, red)
- Each side lists account names + current balances
- Net position (Assets+Income − Liabilities−Expenses) displayed prominently at top right

**Ledger Entries Table:**

`<DataTable>` with columns:

| Column | Content | Sortable |
|--------|---------|----------|
| Date | Formatted date | ✅ |
| Journal # | `JNL-{year}-{number}` in `font-mono` | ❌ |
| Description | Entry description | ❌ |
| Account | Account name | ✅ |
| Debit | Amount if debit entry, else "—" (in `text-red-600`) | ✅ |
| Credit | Amount if credit entry, else "—" (in `text-emerald-600`) | ✅ |
| Balance | Running balance for account | ❌ |
| Reference | Source document reference | ❌ |

**Filter bar above table:**
- Account selector (select from chart of accounts)
- Date range picker
- Entry type (All / Debit / Credit)

**Add Journal Entry — Dialog:**

Fields:
- Journal Entry Date (date picker)
- Description (text input, required)
- Reference (text input, optional)
- Journal Lines (minimum 2 rows, add/remove rows):
  - Each row: Account (select from chart of accounts) + Debit Amount + Credit Amount + Notes
- Validation: Total Debits must equal Total Credits before allowing submit (show running totals + red error if unbalanced)
- "Post Entry" button — INSERTs into `journal_entries` + `journal_lines` tables

**Chart of Accounts** (pre-populated defaults for a church):

Assets: Cash on Hand, Bank Account (General), Bank Account (Savings), Accounts Receivable, Prepaid Expenses, Property & Equipment
Liabilities: Accounts Payable, Accrued Expenses, Deferred Revenue
Income: Tithes, Offerings, Building Fund, Donations, Event Income, Other Income
Expenses: Salaries & Wages, Utilities, Rent, Equipment, Maintenance, Events, Outreach, Supplies, Transport, Other Expenses
Equity: Retained Surplus, Opening Balance Equity

These are seeded into a `chart_of_accounts` table per church on church creation.

---

### PART 11 — PAYOUTS PAGE (`/payouts`)

**Page title:** `Payouts — Vestry`
**PageHeader:** "Payouts" / "View and manage outgoing church payments and transfers"
**Header actions:** "Record Payout" button

---

**Top stats (3 cards):**
- Total Payouts This Month
- Total Payouts This Year
- Pending Payouts (scheduled but not yet processed)

**Payouts Table:**

`<DataTable>` with columns:

| Column | Content | Sortable |
|--------|---------|----------|
| Recipient | Name + account info | ✅ |
| Amount | `<CurrencyDisplay>` in `text-red-600` | ✅ |
| Type | Salary / Vendor / Refund / Transfer / Other | ✅ |
| Method | `<PaymentMethodIcon>` + account/number | ❌ |
| Reference | Transaction reference | ❌ |
| Date | Formatted date | ✅ |
| Status | Processed / Pending / Failed / Cancelled | ✅ |
| Actions | View, Edit (if pending), Cancel (if pending) | — |

**Record Payout — Sheet form:**
Fields:
- Recipient Type (select: Staff Member / Vendor / Member Refund / External)
- Recipient (searchable select based on type, or free-text for external)
- Payout Type (select: Salary / Vendor Payment / Refund / Fund Transfer / Other)
- Amount (number input)
- Payment Method (select: Bank Transfer / M-Pesa / Cash / Cheque)
- Account / Phone Number (text input)
- Bank Name (text input, if Bank Transfer)
- Transaction Reference (text input)
- Payout Date (date picker)
- Linked To (optional: select from invoices if vendor, payroll run if salary)
- Notes (textarea)
- Status (select: Processed / Pending, default Processed)

---

### PART 12 — DATABASE MIGRATIONS FOR PHASE 4

```sql
-- DONATIONS TABLE
CREATE TABLE giving_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  donor_name TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'KES',
  category TEXT DEFAULT 'offering' CHECK (category IN ('tithe','offering','building_fund','welfare','missions','special','other')),
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash','mpesa','bank_transfer','card','cheque','other')),
  pesapal_transaction_id TEXT,
  campaign_id UUID REFERENCES pledge_campaigns(id) ON DELETE SET NULL,
  fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
  notes TEXT,
  given_at DATE DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  receipt_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE giving_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage giving_records"
  ON giving_records FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')));
CREATE INDEX idx_donations_tenant_id ON giving_records(tenant_id);
CREATE INDEX idx_donations_date ON giving_records(given_at);

-- AUTO-INCREMENT RECEIPT NUMBERS via Supabase Function
CREATE SEQUENCE receipt_number_seq START 1000;
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.receipt_number := 'RCP-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(nextval('receipt_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_receipt_number
  BEFORE INSERT ON giving_records
  FOR EACH ROW
  WHEN (NEW.receipt_number IS NULL)
  EXECUTE FUNCTION generate_receipt_number();

-- PLEDGE CAMPAIGNS TABLE
CREATE TABLE pledge_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'other' CHECK (category IN ('building_fund','missions','equipment','welfare','community','other')),
  target_amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','completed','cancelled')),
  allow_anonymous BOOLEAN DEFAULT true,
  image_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE pledge_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage campaigns"
  ON pledge_campaigns FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')));

-- PLEDGES TABLE
CREATE TABLE pledges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES pledge_campaigns(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  pledger_name TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  pledge_amount DECIMAL(12,2) NOT NULL,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  fulfillment_status TEXT DEFAULT 'pending' CHECK (fulfillment_status IN ('pending','partial','fulfilled')),
  pledge_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage pledges"
  ON pledges FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')));

-- CHURCH EXPENSES TABLE
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  category TEXT NOT NULL CHECK (category IN ('salaries','utilities','rent','equipment','maintenance','events','outreach','supplies','transport','other')),
  payment_method TEXT CHECK (payment_method IN ('cash','mpesa','bank_transfer','card','cheque')),
  pesapal_transaction_id TEXT,
  vendor_name TEXT,
  vendor_phone TEXT,
  vendor_email TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  budget_line_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
  receipt_url TEXT,
  notes TEXT,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_frequency TEXT CHECK (recurrence_frequency IN ('weekly','monthly','quarterly','annually')),
  recurrence_end_date DATE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage expenses"
  ON expenses FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')));

-- BUDGETS TABLE
CREATE TABLE budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  year INT NOT NULL,
  total_amount DECIMAL(12,2) DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, year)
);
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage budgets"
  ON budgets FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')));

-- BUDGET LINES TABLE
CREATE TABLE budget_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage budget lines"
  ON budget_categories FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')));

-- PAYROLL STAFF TABLE
CREATE TABLE payroll_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  job_title TEXT,
  employment_type TEXT CHECK (employment_type IN ('full_time','part_time','contract','volunteer_stipend')),
  gross_salary DECIMAL(12,2) NOT NULL,
  deductions JSONB DEFAULT '[]',
  net_salary DECIMAL(12,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('bank_transfer','mpesa','cash','cheque')),
  bank_name TEXT,
  account_number TEXT,
  mpesa_number TEXT,
  pay_frequency TEXT DEFAULT 'monthly' CHECK (pay_frequency IN ('monthly','bi_weekly','weekly')),
  start_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','on_leave','terminated')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE payroll_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payroll"
  ON payroll_staff FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin')));

-- PAYROLL RUNS TABLE
CREATE TABLE payroll_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  total_gross DECIMAL(12,2) NOT NULL,
  total_deductions DECIMAL(12,2) NOT NULL,
  total_net DECIMAL(12,2) NOT NULL,
  staff_count INT NOT NULL,
  processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, period_month, period_year)
);
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view payroll runs"
  ON payroll_runs FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin')));

-- PAYROLL PAYMENTS TABLE
CREATE TABLE payroll_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE NOT NULL,
  payroll_staff_id UUID REFERENCES payroll_staff(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  gross_amount DECIMAL(12,2) NOT NULL,
  deductions_breakdown JSONB NOT NULL,
  net_amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT,
  pesapal_transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE payroll_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view payroll payments"
  ON payroll_payments FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin')));

-- FUNDS TABLE
CREATE TABLE funds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'unrestricted' CHECK (type IN ('restricted','unrestricted','temporarily_restricted')),
  description TEXT,
  purpose TEXT,
  target_amount DECIMAL(12,2),
  opening_balance DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage funds"
  ON funds FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')));

-- FUND TRANSACTIONS TABLE
CREATE TABLE fund_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_id UUID REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit','debit','transfer_in','transfer_out')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  running_balance DECIMAL(12,2),
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE fund_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view fund transactions"
  ON fund_transactions FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')));

-- INVOICES TABLE
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_email TEXT,
  vendor_phone TEXT,
  description TEXT,
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(12,2) NOT NULL,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  payment_terms TEXT DEFAULT 'net_30',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','partially_paid','cancelled')),
  document_url TEXT,
  notes TEXT,
  paid_at DATE,
  payment_method TEXT,
  pesapal_transaction_id TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage invoices"
  ON invoices FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin')));

-- AUTO-INCREMENT INVOICE NUMBERS
CREATE SEQUENCE invoice_number_seq START 1000;
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_number := 'INV-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- CHART OF ACCOUNTS TABLE
CREATE TABLE chart_of_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','income','expense','equity')),
  account_code TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view chart of accounts"
  ON chart_of_accounts FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')));

-- JOURNAL ENTRIES TABLE
CREATE TABLE journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  journal_number TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,
  entry_date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage journal entries"
  ON journal_entries FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin')));

-- JOURNAL LINES TABLE
CREATE TABLE journal_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT NOT NULL,
  debit_amount DECIMAL(12,2) DEFAULT 0,
  credit_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
);
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage journal lines"
  ON journal_lines FOR ALL
  USING (journal_entry_id IN (SELECT id FROM journal_entries WHERE tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin'))));

-- PAYOUTS TABLE
CREATE TABLE payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  recipient_type TEXT CHECK (recipient_type IN ('staff','vendor','member','external')),
  recipient_name TEXT NOT NULL,
  recipient_id UUID,
  payout_type TEXT CHECK (payout_type IN ('salary','vendor_payment','refund','fund_transfer','other')),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  payment_method TEXT CHECK (payment_method IN ('bank_transfer','mpesa','cash','cheque')),
  account_number TEXT,
  bank_name TEXT,
  transaction_reference TEXT,
  payout_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'processed' CHECK (status IN ('processed','pending','failed','cancelled')),
  linked_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  linked_payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payouts"
  ON payouts FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM role_permissions WHERE user_id = auth.uid() AND role IN ('super_admin','admin')));

-- Seed default chart of accounts for new tenants via a Supabase Function
-- Call this function after a new church is created in the onboarding flow
CREATE OR REPLACE FUNCTION seed_chart_of_accounts(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO chart_of_accounts (tenant_id, account_name, account_type, account_code, is_default) VALUES
    (p_tenant_id, 'Cash on Hand', 'asset', '1001', true),
    (p_tenant_id, 'Bank Account (General)', 'asset', '1002', true),
    (p_tenant_id, 'Bank Account (Savings)', 'asset', '1003', true),
    (p_tenant_id, 'Accounts Receivable', 'asset', '1100', true),
    (p_tenant_id, 'Prepaid Expenses', 'asset', '1200', true),
    (p_tenant_id, 'Property & Equipment', 'asset', '1500', true),
    (p_tenant_id, 'Accounts Payable', 'liability', '2001', true),
    (p_tenant_id, 'Accrued Expenses', 'liability', '2100', true),
    (p_tenant_id, 'Deferred Revenue', 'liability', '2200', true),
    (p_tenant_id, 'Tithes', 'income', '4001', true),
    (p_tenant_id, 'Offerings', 'income', '4002', true),
    (p_tenant_id, 'Building Fund', 'income', '4003', true),
    (p_tenant_id, 'Donations', 'income', '4004', true),
    (p_tenant_id, 'Event Income', 'income', '4005', true),
    (p_tenant_id, 'Other Income', 'income', '4999', true),
    (p_tenant_id, 'Salaries & Wages', 'expense', '5001', true),
    (p_tenant_id, 'Utilities', 'expense', '5002', true),
    (p_tenant_id, 'Rent', 'expense', '5003', true),
    (p_tenant_id, 'Equipment', 'expense', '5004', true),
    (p_tenant_id, 'Maintenance', 'expense', '5005', true),
    (p_tenant_id, 'Events', 'expense', '5006', true),
    (p_tenant_id, 'Outreach', 'expense', '5007', true),
    (p_tenant_id, 'Supplies', 'expense', '5008', true),
    (p_tenant_id, 'Transport', 'expense', '5009', true),
    (p_tenant_id, 'Other Expenses', 'expense', '5999', true),
    (p_tenant_id, 'Retained Surplus', 'equity', '3001', true),
    (p_tenant_id, 'Opening Balance Equity', 'equity', '3002', true);
END;
$$ LANGUAGE plpgsql;
```

---

**Build exactly this. Replace the 10 Finance placeholder pages from Phase 1 with fully functional, Supabase-connected pages as described above. Install `@react-pdf/renderer` and `qrcode.react` if not already installed. Do not modify the AppLayout, Dashboard, Settings, or People module from Phases 1–3.**

