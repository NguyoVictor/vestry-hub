# VestryHub — Known Issues & Risk Register

> **Purpose:** This is an action-oriented punch list, separate from the reference documentation (`admin-side.md`, `member-flows.md`, etc.). Those docs describe *what the system does*; this document tracks *what's actually broken or risky and needs a decision*.
>
> **Source:** Compiled from the full documentation pass across Admin Portal (`docs/admin-side.md`) and Member Portal (`docs/member-side.md`), June 2026.
>
> **Priority legend:**
>
> - 🔴 **P0 — Verify/fix urgently.** Possible data integrity, security, or trust issue affecting real users/customers right now.
> - 🟠 **P1 — Real user-facing bug.** Doesn't lose data or bypass security, but actively misleads users or breaks a promised feature.
> - 🟡 **P2 — Reliability/consistency gap.** Works most of the time; edge cases or inconsistencies that should be cleaned up.
> - ⚪ **P3 — Cosmetic / minor.** Naming mismatches, dead UI, "coming soon" stubs.

---

## 🔴 P0 — Verify Urgently

### 1. Legacy member registration may bypass approval entirely

**Where:** `src/pages/MemberRegistration.tsx` (`/member-registration/:orgId`)

This form does a **direct** `INSERT` **into** `members` with `registration_source: "Self-Registration"`, `status: "Active"` — it does **not** call the `member-register` edge function, and does not appear to set `membership_status: "Pending Approval"` the way the QR/`JoinChurch.tsx` flow does.

**Why this matters:** If `membership_status` defaults to something other than `"Pending Approval"` on direct insert, anyone using this specific registration link could log in **immediately, with zero admin approval** — completely bypassing the gate that's central to your product design (and that you specifically called out as important in your original product notes).

**Action:** Check the actual `membership_status` value on a row created through this exact route. If it's not `"Pending Approval"`, this is an active security/business-logic bug, not just a documentation inconsistency. Either fix the insert to match `member-register`'s behavior, or retire this route if it's legacy and unused.

---

## 🟠 P1 — Real User-Facing Bugs

### 2. Onboarding service selection and tier restrictions are both unenforced

**Where:** `src/pages/Onboarding.tsx`, `tenants.tenant_metadata.priority_needs`, `tenants.enabled_modules`, subscription/tier system

This combines two related gaps already noted separately in the docs (`00-product-context.md` §3, `admin-side.md`, `settings.md`) into the actual product-impacting issue:

**a) Selected services don't restrict the admin side.** During onboarding, an admin picks which services their church wants (e.g., "just member management"). This selection is saved to `tenant_metadata.priority_needs` — but the admin sidebar (`AppLayout.tsx` → `navigationGroups`) is **not filtered by it**. Every category and subcategory shows up regardless of what was selected. A church that asked for a minimal setup sees the full, unrestricted admin interface.

**b) There is no tier/subscription enforcement at all.** Confirmed: **every church gets full access to every feature, regardless of subscription tier.** The landing page shows distinct pricing tiers implying different feature sets per tier, but nothing in the codebase currently checks `tenant_subscriptions` (or any tier identifier) before rendering admin nav or gating a feature. A church on the cheapest tier has identical access to one on the most expensive tier.

**Why this matters:**

- **Product/business impact:** If tiers are meant to be a real pricing lever (pay more → unlock more), this is currently not true. Every paying customer effectively gets the top tier's feature set regardless of what they paid for.
- **Onboarding promise mismatch:** The onboarding form asks admins what they want, implying the app will tailor itself accordingly — it doesn't.
- **These two gaps share one fix.** Both need the same underlying mechanism: a single source of truth for "what is this tenant actually entitled to see," consulted by the admin nav (and ideally by route guards, not just nav visibility — see related gap #6 on missing permission checks in Media & Content / Growth).

**Action — recommended approach:**

1. Decide whether tier entitlements and onboarding service-picks should be **the same mechanism** or two separate ones (e.g., tier defines the *ceiling* of what's available; onboarding picks customize *within* that ceiling, defaulting to "show everything the tier allows").
2. Pick one canonical column/table as the source of truth — right now there are already three competing, partially-overlapping candidates (`tenant_metadata.priority_needs`, `enabled_modules`, and no tier table consulted at all). Don't add a fourth without consolidating.
3. Filter `navigationGroups` in `AppLayout.tsx` based on that source of truth — this alone fixes the *visible* mismatch.
4. For a real enforcement layer (not just hiding nav items), add a route-level or `usePermissions()`-style check so a tenant can't reach a page via direct URL even if it's hidden from nav — same pattern needed for the broader permission gap in #6.
5. Decide what happens to *existing* churches once this ships — will their current full access be grandfathered, or will tier limits suddenly apply retroactively? This is a product decision, not just an engineering one.

**Related:** This connects directly to #7 below (no permission gating on most Media & Content / Growth pages) — a future tier-enforcement system and a future permission system will likely need to share the same architecture rather than being built as two unrelated features.

### 3. Notification settings don't save

**Where:** `src/pages/member/MemberSettings.tsx`

Notification preference toggles are **local React state only** — never written to the database. A member toggles a preference, sees it change visually, but it reverts on next load. Nothing was ever persisted.

**Action:** Wire toggles to an actual `UPDATE` on a notification-preferences table/column, or remove the toggles until they're implemented.

### 4. Email change likely broken for most members

**Where:** `src/pages/member/MemberSettings.tsx`

Calls `supabase.auth.updateUser()` to change email — but members authenticate via a **custom** `localStorage` **session**, not Supabase Auth. Most members never had a real Supabase Auth account created in the first place.

**Action:** Confirm whether this call fails silently or throws for typical members. If most members have no Auth account, this needs a different implementation (e.g., direct `UPDATE` on `members.email` + `users.email` if linked, similar to how `sync-member-profile` works elsewhere).

### 5. Module toggles ("disable this feature church-wide") don't actually restrict access

**Where:** `MemberHome.tsx` (tile filtering) vs. `MemberPortalLayout.tsx` sidebar/mobile nav

Disabling a feature in **Settings → Member App** only hides the **home screen tile**. It does **not**:

- Hide the sidebar link (`SIDEBAR_NAV` is static, ignores `enabled_modules`)
- Hide the mobile bottom nav (Home, Give, Events, Messages, Profile are always shown)
- Block direct URL navigation (`/member/give` works even if `give_online` is disabled)

**Why this matters:** Church admins are actively configuring these toggles believing they restrict what members can do — but a member who already knows the URL, or just taps the sidebar, can use the "disabled" feature anyway.

**Action:** Either enforce module gates at the route level (in `MemberAuthGuard` or per-page), or update the Settings UI copy to clarify these only affect what's *promoted* on the home screen, not what's *accessible*.

### 6. Resources Store: no e-commerce gating, but also no e-commerce

**Where:** `MemberStore.tsx` vs. admin `ResourcesStore.tsx`

Admin side has full commerce: products, orders, coupons, bundles. Member side is **catalog-only** — browsing shows a "Request Resource" toast with no actual cart, checkout, or order creation. The two sides aren't integrated.

**Action:** Decide if this is intentional (a "coming soon" state) or an incomplete feature. If intentional, the admin order-management tooling (`store_orders`, coupons) currently has no member-facing path that creates orders — worth confirming whether orders ever get created at all right now, or how.

### 7. Most Media & Content / Growth admin pages have zero permission gating

**Where:** Graphics Studio, AI Tools, Bible Explorer, Song Library, Church Media, Sermon Preparation, Sermons, Livestreaming, Discipleship, Discipleship Resources, Outreach, Resources Store, Training (admin side)

None of these call `usePermissions()`. Any authenticated staff member — regardless of assigned role or fine-grained permission level — has full access to create, edit, and delete in all of these areas. This spans roughly a third of the admin category map.

**Action:** This is the most consequential single finding from the whole documentation pass. Decide whether to:

- Add permission keys + `PermissionButton`/`ReadOnlyBanner` gating to these pages (likely needs new `PERMISSION_PATHS` entries), or
- Confirm this is intentional (e.g., "all staff should have full access to media/growth tools") and document it as such rather than as a gap.

---

## 🟡 P2 — Reliability / Consistency Gaps

### 8. Inconsistent payment confirmation mechanisms

**Where:** `MemberGive.tsx` vs. `MemberPledgeCampaigns.tsx`

- `MemberGive` (and admin `GiveOnline`): realtime `postgres_changes` **+ 2-second polling fallback**, 90s countdown.
- `MemberPledgeCampaigns`: **broadcast-only** channel (`payment_update`), **no polling fallback**, 150s countdown.

**Why this matters:** If a broadcast message is ever missed (background tab, brief network drop), a pledge payment could succeed on the backend while the UI never finds out — the user sees a timeout/failure for a payment that actually went through.

**Action:** Bring `MemberPledgeCampaigns` in line with the realtime+polling pattern used elsewhere, for consistency and reliability.

### 9. Dual signup bootstrap paths can race

**Where:** `handle_new_user()` DB trigger vs. `on-signup` edge function

Both can independently create a `tenants` + `users` row on new auth signup. If both are wired (DB trigger + Auth webhook simultaneously), there's a race condition risk on tenant/user creation.

**Action:** Check Supabase Dashboard → Auth → Hooks to confirm which path is actually active. If both are wired, disable one.

### 10. `enabled_modules` has multiple writers using different JSON shapes

**Where:** `ServicesModules.tsx` (array of strings), `ModulesSettings.tsx` (object map), `MemberApp.tsx` / `MemberAppFeatures.tsx` (`{ member_portal: {...} }`)

Four different settings pages write to the same `tenants.enabled_modules` column using inconsistent shapes. Risk of one save silently clobbering keys written by another.

**Action:** Consolidate to one canonical shape, or have each writer do a merge-read-write instead of an overwrite.

### 11. Receipts: server-side generation exists but is never used

**Where:** `generate-receipt` edge function vs. `MemberGivingHistory.tsx`

The edge function builds an HTML receipt, uploads it, and sets `giving_records.receipt_url` — but nothing in the member UI calls it. Members instead get a **client-side jsPDF receipt** generated in-browser.

**Action:** Decide whether server-side receipts (more durable, emailable, consistent formatting) should replace the client PDF approach, or whether the edge function is dead code to remove.

### 12. `check-attendance-risk` queries `users`, not `members`

**Where:** Cron function `check-attendance-risk`

Flags "attendance risk" based on the `users` table (staff/admin accounts), not `members` (congregation). If the intent is to flag at-risk *congregation members*, this is querying the wrong table.

**Action:** Confirm intent — if this is meant to track congregant attendance risk, fix the query target.

### 13. `run-payroll` deployed but never invoked

**Where:** Edge function exists; `Payroll.tsx` never calls it

Actual M-Pesa B2C payroll disbursement may not be wired up at all — the admin Payroll page may only be record-keeping with no real disbursement path.

**Action:** Confirm whether payroll runs currently happen through this function, a different path, or not at all.

---

## ⚪ P3 — Cosmetic / Minor

### 14. `/church-studio` routes to a placeholder

Real page exists at `src/pages/media/ChurchStudio.tsx`, but the route isn't wired — falls through to `PlaceholderPage`. Quick fix: add the explicit route.

### 15. Naming mismatches between product doc and code

- "Security Center" (doc) vs. `/security-centre` (code, British spelling)
- "Giving Today" (doc) vs. "Today's Giving" (UI label)
- "Events" stat (doc) vs. "Upcoming Events" — actually a 7-day window, not all events

### 16. Livestreaming analytics hardcoded to zero

`totalViews` / `avgAttendance` in `Livestreaming.tsx` are hardcoded `0` — comment notes "would come from platform APIs." Not real data; cosmetic until wired up.

### 17. Two overlapping livestream UIs on member side

`/member/livestreaming` and `/member/watch-live` show similar data; only `watch_live` is module-gated from the home screen.

### 18. `my_discipleship_journey` home tile is non-functional

Links to `#` — dead link on the member home grid.

### 19. Bible Explorer: admin and member use different storage strategies

Admin `BibleExplorer.tsx` leans on `localStorage` (notes/bookmarks not synced); member `MemberBible.tsx` syncs notes/favorites to Supabase. Inconsistent — admin's local notes are lost on browser clear/device switch.

### 20. `feature_permissions` is a dead feature

Already flagged in `permissions.md` — church admins can configure a role × feature access matrix in Settings → Roles & Permissions, and it saves to the database, but **nothing reads it at runtime**. Purely cosmetic UI right now. (Listed here too since it's a trust issue for paying customers configuring something that does nothing — worth deciding to wire it up or hide it.)

---

## Suggested order of attack

1. **Verify #1 today** — confirm whether the legacy registration route is actually a live security/approval bypass.
2. **Decide on #2 (tier/onboarding enforcement) and #7 (missing permission gating)** — these are the two biggest structural/architectural decisions in this list, and they likely share a solution. Worth scoping together rather than separately.
3. **Quick wins:** #14 (church-studio route), #3 (settings persistence) — both are likely small, contained fixes.
4. **Batch the rest** into a normal backlog, prioritized P1 → P2 → P3.

---

## Manual QA Checklist — Click-Through Verification

> **Purpose:** Documentation describes how the system is *supposed* to behave. This checklist is for actually confirming it does, flow by flow, in the live app. Go through each section top to bottom; check items off as you confirm them. Where an item is already a known suspect from the findings above, it's called out explicitly — don't skip it just because it's "probably fine."
>
> **How to use:** Use a real test church (or the FINAL DESTINATION tenant) and at least two accounts — one admin, one member — so you can cross-check both sides of every flow. Note the actual `membership_status` / `enabled_modules` values you observe where relevant, not just whether the UI looked right.

### A. Onboarding & Church Creation

- [ ] Create a brand-new church through "Get Started for Free" end to end
- [ ] Confirm the first user's role in the `users` table — is it `church_admin` or `super_admin`? (See finding: doc says one, code does another)
- [ ] On the onboarding form, select **only one or two services** (not everything) — then check the admin sidebar. Does it show only what was selected, or everything regardless? (Known gap — finding #2)
- [ ] Confirm a `church_code` was generated and is visible/copyable somewhere in the admin UI
- [ ] Try signing up twice in quick succession (or in two tabs) — check for duplicate tenant/user rows from the dual bootstrap paths (finding #9)

### B. Admin Auth

- [ ] Sign up as a new admin via email — confirm verification email arrives, and login is blocked until verified (if that's the intended behavior)
- [ ] Sign in with Google OAuth — confirm it lands on `/dashboard` (existing tenant) or `/onboarding` (new)
- [ ] Trigger 3+ failed logins within 10 minutes — confirm a brute-force security alert appears in Security Centre
- [ ] Let a session sit idle 28+ minutes — confirm the inactivity warning appears, then auto-logout at 30 minutes
- [ ] Use "Forgot Password" end to end — confirm reset email arrives and the new password actually works

### C. Staff Invitations

- [ ] Invite a new staff member by email (not picking an existing member) — confirm invite email arrives, accepting it lands them in `/auth/reset-password`, and a staff directory message thread is created for them
- [ ] Invite an existing member (promote to staff) with "send invite" toggled ON — confirm correct path is taken (new invite vs. already-registered)
- [ ] Deactivate a staff member, then reactivate — confirm their access is correctly restored and a staff thread exists
- [ ] Confirm a staff member with `read_only` fine permission on a category genuinely cannot perform write actions there (not just that buttons are hidden — try the action directly if possible)

### D. Member Registration & Approval — ⚠️ Priority area (finding #1)

- [ ] Register a member via the **QR code /** `/member/join` **flow** — confirm `membership_status` is set to `"Pending Approval"` and login is blocked with the correct message
- [ ] Register a member via the **legacy** `/member-registration/:orgId` **form** (if still reachable) — check `membership_status` on the resulting row. **Does it allow immediate login?** This is the suspected bypass — confirm directly.
- [ ] As admin, approve a pending member — confirm they can then log in successfully
- [ ] Confirm there is genuinely no way to bulk-approve from the Members list (only via individual profile)

### E. Member Login & Session

- [ ] Log in as an approved member — confirm session persists across a page refresh
- [ ] Manually expire/edit the session in localStorage — confirm the guard correctly redirects to login
- [ ] Log in, then have an admin set the member back to "Pending Approval" — does the already-logged-in member get kicked out, or do they keep full access until their session naturally expires? (Known gap — pending status isn't re-checked after initial login)

### F. Giving — Admin Side

- [ ] Make a real (small) M-Pesa contribution via admin **Give Online** — confirm the STK prompt arrives on the test phone
- [ ] Confirm the popup countdown and actual prompt expiry roughly match (known: UI timer is a fixed 90s, not Daraja-driven — see if this causes a mismatch in practice)
- [ ] After confirming payment, check that it appears, without manual refresh, in: Give Online recent list, Giving Records, Dashboard "Today's Giving" card, Dashboard giving graph
- [ ] Add a new member, then confirm "Total Members" on the dashboard increments correctly and promptly

### G. Giving — Member Side

- [ ] Make a contribution via **Member Give** — confirm same propagation as above
- [ ] Make a contribution via **Member Pledge Campaigns** — pay close attention here. Confirm whether the payment confirmation actually arrives reliably (known gap: broadcast-only, no polling fallback, 150s timer — finding #8). Try backgrounding the browser tab mid-payment and see if the confirmation still comes through.
- [ ] Check "Member Giving History" — confirm the client-generated PDF receipt looks correct

### H. Messaging

- [ ] As a new staff member added to the app, confirm a staff directory tile appears for them on the member side ("Message a leader")
- [ ] As a member, start a DM with a staff member — confirm the admin sees it in Member Messaging
- [ ] Send a message in both directions — confirm real-time delivery (no refresh needed) on both sides
- [ ] Send a bulk communication (email and/or SMS) from Communications — confirm it actually arrives

### I. Settings & Module Toggles

- [ ] In Settings → Member App, disable a feature (e.g., Giving) — then as a member, check: is the home tile gone? Is the sidebar link gone? **Does the direct URL still work?** (Known gap — finding #5)
- [ ] As a member, change a notification preference in Settings — refresh the page. Did it actually save? (Known gap — finding #3)
- [ ] As a member, attempt to change your email in Settings — confirm whether it actually works or silently fails (known gap — finding #4)
- [ ] In Settings → Roles & Permissions → Feature Permissions, change a role's access level — then confirm (as expected) that it has **no effect** anywhere else in the app (known dead feature — finding #20). This is about confirming the gap exists exactly as documented, not expecting it to work.

### J. Cross-Portal Consistency

- [ ] Compare Admin "Bible Explorer" notes vs. Member "Bible" notes for the same user where applicable — confirm they're genuinely on separate storage (admin = localStorage, member = Supabase) and don't sync
- [ ] Browse Member Store — confirm it's genuinely catalog-only with no real checkout (known — finding #6), and that nothing on the admin Resources Store order list gets created from member browsing
- [ ] Visit `/member/livestreaming` and `/member/watch-live` — confirm whether these feel redundant in practice or serve genuinely distinct purposes

### K. Permission Gaps — Spot Check

- [ ] Log in as a staff member with a **restricted** role (not super_admin/church_admin) — try accessing Graphics Studio, AI Tools, Song Library, Sermon Preparation, Discipleship, Resources Store, Training. Confirm whether they really do have full access despite a restricted role (known gap — finding #7)
- [ ] If possible, test whether a restricted-role staff member can directly navigate to a financially sensitive page (e.g., `/payroll`, `/general-ledger`) via URL even if it's not in their visible nav

### Recording results

For each section, note:

- ✅ Confirmed working as documented
- ❌ Confirmed broken / matches a known finding above — link the finding number
- 🆕 New issue found, not in the list above — add it to the appropriate priority section

---

*This document should be revisited and updated as items are resolved — move fixed items to a "Resolved" section at the bottom rather than deleting them, so there's a record of what was found and fixed.*