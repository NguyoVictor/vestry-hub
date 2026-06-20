# Admin Portal Flows

> Cross-ref: [`00-product-context.md`](./00-product-context.md), [`auth.md`](./auth.md), [`permissions.md`](./permissions.md), [`payments.md`](./payments.md), [`messaging.md`](./messaging.md)

All routes below require **`AuthGuard`** + **`AppLayout`** unless noted. Source: `src/App.tsx`, `src/config/navigation.ts`.

---

## Navigation categories (sidebar)

Matches product context §4 with these naming notes:

| Category | ⚠️ Notes |
|---|---|
| Security | Route **`/security-centre`** (British spelling; doc says “Security Center”) |
| Media | **Church Studio** nav item → **`/church-studio` → PlaceholderPage** (real page at `src/pages/media/ChurchStudio.tsx` not wired) |
| Engagement | `/appointments` has real route (not placeholder) |

Full route list: see structural index in [`README.md`](./README.md).

---

## Dashboard (`/dashboard`)

**File:** `src/pages/Dashboard.tsx`

```
Dashboard.tsx
├─ Context: useChurch() → tenantId, currency, name
├─ Permission: usePermissions() (read-only gates on quick actions)
├─ Stat cards (useQuery "dashboard-stats"):
│   ├─ Total Members — COUNT members (no status filter)
│   ├─ Month giving — SUM giving_records confirmed, given_at ≥ 1st of month (badge: "This month")
│   ├─ Upcoming Events — COUNT events in next 7 days
│   └─ Active Groups — COUNT groups where is_active=true
├─ Today's Giving card (separate query "todays-total"):
│   ├─ SELECT all confirmed giving_records for tenant
│   └─ Client filter: given_at local date === today (badge: "Today")
├─ Charts: giving trend (30d), group distribution, upcoming events list
├─ Activity feed: useActivityLog() — recent tenant actions
└─ Quick actions: links to /members, /give-online, /events, /communications (PermissionButton gated)
```

### Stat cards

| Card label (UI) | Product doc name | Query |
|---|---|---|
| Total Members | Total Members | Count all `members` for tenant (**no status filter**) |
| Today's Giving | Giving Today | Sum `giving_records` where `payment_status=confirmed` and `given_at` is today (local date) |
| Upcoming Events | Events | Count `events` in **next 7 days** |
| Active Groups | Groups | Count `groups` where `is_active=true` |

⚠️ **DISCREPANCIES:**

- Card labels differ from product doc.
- “Events” in doc vs “Upcoming Events” in UI — **7-day window**, not all events.
- Total Members may **over-count** inactive/pending if included in `members` table (no filter).
- Comment in code says “Direct queries for debugging - replace RPC temporarily” — RPC exists in migrations (`20260407111706_update_dashboard_stats_rpc.sql`) but not used.

### Giving propagation

See [`payments.md`](./payments.md) — realtime + polling on Give Online; dashboard uses separate React Query fetches.

---

## People module

| Route | File | Permission key |
|---|---|---|
| `/members` | `Members.tsx` | `member_management` |
| `/members/:memberId` | `MemberProfile.tsx` | `member_management` |
| `/groups`, `/groups/:groupId` | `Groups.tsx`, `GroupDetail.tsx` | `groups_ministries` |
| `/house-fellowships` | `HouseFellowships.tsx` | `groups_ministries` |
| `/families` | `Families.tsx` | `member_management` |
| `/visitors` | `Visitors.tsx` | `member_management` |
| `/follow-up-tasks` | `FollowUpTasks.tsx` | `member_management` |
| `/new-converts` | `NewConverts.tsx` | `member_management` |
| `/childrens-ministry/*` | `CMLayout.tsx` + subpages | `member_management` |
| `/childrens-ministry/kiosk` | `CMKiosk.tsx` | Fullscreen, outside sidebar |

### Member approval (admin action)

**Primary UI:** `MemberProfile.tsx` — button **“✓ Approve Member”** when `membership_status === "Pending Approval"`.

```
MemberProfile.tsx  — /members/:memberId
├─ Permission: usePermissions('member_management') → readOnly
├─ Load: member row + groups, giving, attendance tabs
├─ Pending banner: membership_status === "Pending Approval"
├─ Approve button (PermissionButton):
│   ├─ UPDATE members SET membership_status='Member', status='active'
│   ├─ invalidateQueries ["member", memberId]
│   └─ toast.success("Member approved")
├─ Edit dialog: full profile fields incl. membership_status dropdown
└─ Edge (on save): sync-member-profile — sync name to users table
```

- Updates `members.membership_status` → `"Member"`, `status` → `"active"`.
- Gated by `PermissionButton permission="member_management"`.

**List filter only:** `MemberFilters.tsx` includes “Pending Approval”; **`Members.tsx` has no bulk approve**.

**Registration source:** `member-register` edge function sets pending status; QR join flow documented in [`member-flows.md`](./member-flows.md).

---

## Staff / user management

**Route:** `/settings/users` — `Users.tsx`

```
Users.tsx  — AddUserModal.handleSubmit()
├─ Mode A — inviteByEmail (external email, no member pick):
│   ├─ Fields: inviteFirstName, inviteLastName, inviteEmail, role
│   └─ invoke send-invitation → InviteCallback creates staff thread later
├─ Mode B — pick existing member + sendInvite ON:
│   ├─ Check active same-role → block
│   ├─ inactive → invoke update-user-role (reactivate) — thread inline in edge fn
│   └─ else → invoke send-invitation
├─ Mode C — pick member + sendInvite OFF (direct insert):
│   ├─ INSERT users (new UUID if active user different role)
│   └─ invoke create-staff-thread (if role !== member)
└─ Staff limit: canAddStaff check (tenant_subscriptions) for non-member roles
```

### Add user paths (`AddUserModal`)

| Path | `create-staff-thread`? |
|---|---|
| Invite by email (`inviteByEmail`) | No — relies on `InviteCallback` after accept |
| Send invite ON → email sent | No — `InviteCallback` |
| Send invite ON → already registered | `send-invitation` inline thread |
| Send invite ON → Path C (active user, new role row) | **Yes** — invoke |
| Send invite OFF → new user insert | **Yes** — invoke |
| Reactivate inactive | `update-user-role` inline thread |

**Edge functions:** `send-invitation`, `update-user-role`, `create-staff-thread`

---

## Finance module

Routes under `/give-online`, `/giving-records`, etc.  
Permission: `financial_records`

See [`payments.md`](./payments.md).

---

## Communications module

Routes: `/communications`, `/announcements`, `/member-messaging`, `/appointments`, `/testimonies`, `/surveys`  
Permission: `communication_tools`

See [`messaging.md`](./messaging.md).

---

## Background jobs (cron — no UI)

| Function | Source behavior |
|---|---|
| `check-pledge-overdue` | Daily — flags `pledges` overdue when campaign ended &gt;7 days ago |
| `check-attendance-risk` | Weekly — `notifications` for active **`users`** missing last 3 sessions per service type |
| `notify-task-deadlines` | `follow_up_tasks` due in 7d/1d |
| `notify-meeting-deadlines` | `board_meetings` 24h/1h reminders |
| `reset-email-quota` | Monthly email quota reset |
| `reset-monthly-credits` | Subscription credit reset |
| `process-email-automations` | Scheduled email automation runs |

See [`edge-functions-gap.md`](./edge-functions-gap.md) for full inventory.

---

## Platform super-admin (not in product doc)

| Route | Purpose |
|---|---|
| `/superadmin` | Platform dashboard |
| `/superadmin/churches` | All tenants |
| `/superadmin/storage-requests` | Approve storage upgrades |

---

## Children's ministry kiosk

`/childrens-ministry/kiosk` — authenticated, no admin sidebar; check-in kiosk mode.

---

## Permission gates on pages

Most write actions use:

```tsx
<PermissionButton permission="member_management" readOnly={readOnly} … />
```

`readOnly` from `usePermissions().isReadOnly(key)`.

**Not gated by:** `feature_permissions` (dead — see [`permissions.md`](./permissions.md)).

---

## Placeholder routes

`App.tsx` maps any `navigationGroups` path not in explicit route lists to **`PlaceholderPage`**.

**Notable mis-wire:** `/church-studio` → placeholder while `ChurchStudio.tsx` exists.
