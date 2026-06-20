# VestryHub — Product Context & System Overview

> **Purpose of this document:** This is the ground-truth product description, written from the product owner's perspective. It explains *what the system is supposed to do* and *why it behaves the way it does*. Code-level documentation (exact files, functions, database tables) should be cross-referenced against this document — where code and this document disagree, that's a discrepancy worth flagging, not silently resolving in either direction.
>
> **Status legend used throughout:**
> - ✅ Confirmed working — described and verified in production use
> - ⚠️ Needs verification — described here, but should be checked against actual code/behavior
> - 🚧 Not yet documented — category exists in the product but detailed behavior notes haven't been written yet

---

## 1. What VestryHub Is

VestryHub is a **multi-tenant SaaS application for churches**. Each church that signs up becomes a **tenant** — an isolated instance of the app with its own data, members, and configuration.

The system has two distinct sides:

1. **Admin Portal** — used by church administrators and staff to manage the church
2. **Member Portal** — used by congregation members to interact with their church (giving, messaging, events, etc.)

A single church admin manages their church's instance through the Admin Portal. Members access their church's specific instance through the Member Portal using a unique church code generated when the tenant is created.

---

## 2. The Landing Page (Public, Pre-Login)

The landing page is the public-facing entry point, before any authentication.

**What it shows:**
- An overview of the church's available services on the platform
- A **tiers/pricing section** showing the different subscription tiers available on VestryHub

**Three entry points:**

| Button | Audience | Purpose |
|---|---|---|
| **Get Started for Free** | Admins only | Begins the onboarding flow to create a new church (tenant) |
| **Sign In** | Admins only | Existing admin login to an already-created church instance |
| **Member Portal** | Members | Entry point for congregation members to access their specific church |

⚠️ **Important rule:** The **first person to create a church is always assigned the role `church_admin`**. This is the root identity for that tenant — every other admin/staff role within that church is created or invited *after* this first admin exists.

---

## 3. Onboarding Flow (Church Creation)

When an admin clicks **Get Started for Free**, they go through an onboarding form that collects:
- The name of the church
- The services the church wants to use from the app

⚠️ **Known gap — no enforcement of selected services:**
The onboarding form *asks* what services a church wants (e.g., a church might say they only want **member management**, nothing else), but the app **does not currently enforce or restrict the admin side based on this selection**. In other words, even if a church opts out of certain services during onboarding, the app does not hide, lock, or limit access to those unselected categories on the admin side. This is a known product gap, not a bug — the onboarding form's answers are currently informational/non-binding rather than controlling feature access.

**After onboarding completes:**
- A **tenant_id** is created for the church
- A **unique church code** is generated — this is what members use to find and join their specific church through the Member Portal

---

## 4. Admin Portal — Structure

Once inside the Admin Portal, the system is organized into **categories**, each containing **subcategories** (individual pages/features). This is the primary navigational structure new developers should understand first, since almost every admin-side route maps to one of these categories.

### Category Map

| Category | Subcategories |
|---|---|
| **Overview** | Dashboard |
| **People** | Members, Groups, House Fellowships, Families, Children's Ministry, Visitors, Follow-up Tasks, New Converts |
| **Finance** | Give Online, Giving Records, Pledge Campaigns, Church Expenses, Budget Management, Payroll, Fund Accounting, Accounts Payable, General Ledger, Payouts |
| **Events & Operations** | Services, Events, Volunteering, Member Requests, Board Meetings, Facility & Event Booking |
| **Security** | Security Center, Incident Management |
| **Engagement** | Communications, Announcements, Member Messaging, Appointments, Testimonies, Surveys |
| **Media & Content** | Graphics Studio, AI Tools, Church Studio, Bible Explorer, Song Library, Church Media, Asset Management, Sermon Preparation, Sermons & Messages, Livestreaming |
| **Growth** | Discipleship Dashboard, Discipleship Resources, Outreach & Impact, Resources Store, Training |
| **Admin** | Reports & Analytics, Branches, Settings |

### Other Persistent UI Elements (present across the Admin Portal)

These aren't tied to one category — they're part of the overall admin shell/layout:

- **Side navigation panel** — displays:
  - The church's name
  - The name of the church admin/user (when a user is invited, they're shown starting with their first name and email until they complete their profile)
- **Breadcrumb navigation**
- **Search bar**
- **Notification bell icon**
- **Display mode toggle** (light/dark, presumably — ⚠️ confirm exact behavior in code)
- **Profile menu** (top right)

---

## 5. Category Deep-Dive: Overview

### 5.1 Dashboard

✅ **Stat cards — confirmed functional:**
- **Total Members**
- **Giving Today**
- **Events**
- **Groups**

⚠️ **Testing note from product owner:** These cards are functional, but should be actively tested for correctness — specifically, when a new member is added, verify that **Total Members** correctly increments and queries/displays the right count. This is flagged as "should always be double-checked," implying it has been a source of bugs or uncertainty before.

### 5.2 The "Giving Today" Stat Card — Detailed Flow

This is called out specifically as **a very unique feature** worth understanding in detail, since it spans multiple parts of the system (member-facing payment UI, real-time updates, and several admin-side displays).

**The end-to-end flow:**

1. A **member or admin** goes to the **Finance → Give Online** tab and chooses to contribute via **M-Pesa**.
2. The system triggers an **STK push** — this sends a prompt directly to the contributor's phone, asking them to enter their M-Pesa PIN to authorize the payment.
3. While this is happening, the **app UI shows a pop-up** that displays:
   - The name of the church receiving the contribution
   - The amount the contributor entered
   - A **countdown/timer** showing how long the M-Pesa prompt has before it expires
4. Once the contributor completes the payment (enters PIN, confirms on their phone), the contribution is **recorded**.
5. This recorded contribution then propagates to **multiple places simultaneously**:
   - The **"Today's Giving"** stat card (wherever it's shown — dashboard and finance side)
   - **Admin side → Give Online** (the same screen where it was initiated)
   - **Admin side → Giving Records**
   - **Dashboard page → Today's Giving stat card**
   - **Dashboard page → Giving overview graph/bar**
   - **Dashboard page → Today's Donation section**

⚠️ **For developers:** This describes what is almost certainly a **real-time/broadcast-driven update pattern** (the same contribution updating six+ different UI surfaces without a page refresh implies some kind of live subscription, not just a database write that waits for next page load). When documenting this technically, confirm:
- What triggers the STK push (which edge function — likely `process-stk-push` or `initiate-payment`)
- What mechanism pushes the update to all these UI locations (Supabase real-time broadcast channel, polling, or both — prior technical discussion suggests this project uses a **broadcast + polling fallback** pattern for payment confirmation)
- Whether the popup countdown timer is driven by a fixed client-side timer or reflects an actual STK push expiry window from Safaricom's Daraja API

### 5.3 Upcoming Events

🚧 Not yet detailed. Known to exist on the Dashboard as a section showing upcoming events. Further behavior (what counts as "upcoming," how far ahead it looks, whether it links to the Events subcategory) not yet documented.

---

## 6. Categories Not Yet Detailed

The following categories are confirmed to exist (per the category map in Section 4) but do not yet have detailed behavioral documentation written. These should be filled in following the same pattern as Section 5 (Overview) — i.e., for each subcategory: what it does, what data it touches, any non-obvious behaviors, and any known gaps or bugs.

- 🚧 **People** — Members, Groups, House Fellowships, Families, Children's Ministry, Visitors, Follow-up Tasks, New Converts
- 🚧 **Finance** (beyond Give Online's role in the giving flow above) — Giving Records, Pledge Campaigns, Church Expenses, Budget Management, Payroll, Fund Accounting, Accounts Payable, General Ledger, Payouts
- 🚧 **Events & Operations** — Services, Events, Volunteering, Member Requests, Board Meetings, Facility & Event Booking
- 🚧 **Security** — Security Center, Incident Management
- 🚧 **Engagement** — Communications, Announcements, Member Messaging, Appointments, Testimonies, Surveys
- 🚧 **Media & Content** — Graphics Studio, AI Tools, Church Studio, Bible Explorer, Song Library, Church Media, Asset Management, Sermon Preparation, Sermons & Messages, Livestreaming
- 🚧 **Growth** — Discipleship Dashboard, Discipleship Resources, Outreach & Impact, Resources Store, Training
- 🚧 **Admin** — Reports & Analytics, Branches, Settings

---

## 7. Open Questions / Known Gaps Worth Resolving

These are gaps or ambiguities surfaced directly from the product owner's notes — useful starting points for the next round of code verification:

1. **Onboarding service selection isn't enforced** (Section 3) — confirm whether this is intentional (a future feature) or simply unimplemented, and whether it should be scoped for a fix.
2. **STK push / Giving Today propagation mechanism** (Section 5.2) — confirm exact technical implementation (real-time channel vs. polling vs. both) and which edge functions are involved.
3. **Total Members count accuracy** (Section 5.1) — confirm the actual query logic behind this stat card and whether it has a known history of miscounting.
4. **Countdown timer source** (Section 5.2) — confirm whether the STK push popup timer reflects a real API-driven expiry or is a client-side approximation.

---

## 8. How to Extend This Document

This document is intentionally incremental. As more categories are detailed (by the product owner, by code verification, or both), follow this pattern per subcategory:

```
### X.Y [Subcategory Name]

[1-2 sentence description of what it does and who uses it]

**Key behaviors:**
- [behavior 1]
- [behavior 2]

**Data flow / where it touches other parts of the system:**
- [e.g., "writes to X table, which the Dashboard also reads from"]

**Known gaps or things to verify:**
- [anything uncertain, untested, or intentionally incomplete]
```

Once a category section is added here, it should be cross-checked against actual code (page components, edge functions, database tables/RLS policies) before being considered "confirmed" rather than "described."