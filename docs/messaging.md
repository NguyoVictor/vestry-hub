# Messaging

> Cross-ref: [`00-product-context.md`](./00-product-context.md) §4 Engagement, [`auth.md`](./auth.md), [`admin-flows.md`](./admin-flows.md), [`member-flows.md`](./member-flows.md)

Member ↔ staff messaging uses **two conversation types** in the `conversations` table.

---

## Architecture

### 1. Staff directory tiles (discovery)

| Column | Value |
|---|---|
| `is_staff_directory` | `true` |
| `staff_user_id` | Admin/staff `users.id` |
| `name` | Denormalized display name (member portal uses anon client) |
| `type` | `direct` |

**Purpose:** Shown on member portal as “Message a leader” tiles — one per staff member.

**Created by:**

| Trigger | Mechanism |
|---|---|
| Staff accepts email invite | `InviteCallback.tsx` → `create-staff-thread` (if `role !== 'member'`) |
| Direct staff add (Path C) | `Users.tsx` → `create-staff-thread` |
| Direct staff add (no invite) | `Users.tsx` → `create-staff-thread` |
| Already-registered invite | `send-invitation/index.ts` inline thread creation |
| Staff reactivate | `update-user-role/index.ts` inline (duplicates thread logic) |

**Edge function:** `supabase/functions/create-staff-thread/index.ts`

### 2. Private member ↔ staff DMs

| Column | Value |
|---|---|
| `is_staff_directory` | `false` |
| Participants | Exactly 2: member + one staff (`conversation_participants`) |
| `staff_user_id` | Set on create for labeling |
| `name` | Staff display name denormalized |

**Member side:** `src/pages/member/MemberMessages.tsx` — `joinStaffThread()` finds or creates private 2-person conversation.

**Admin side:** `src/pages/communications/MemberMessaging.tsx`

- Query key: `["conversations-dm", tenantId, userId]` — **must include userId** (cache isolation).
- Filters: `type: direct`, `is_staff_directory: false`, current admin in participants.

⚠️ **Product intent:** Private 1-on-1 — only the targeted admin sees the thread in their inbox.

---

## Routes

| Side | Route | File |
|---|---|---|
| Admin | `/member-messaging` | `src/pages/communications/MemberMessaging.tsx` |
| Member | `/member/messages` | `src/pages/member/MemberMessages.tsx` |

**Shared helpers:** `src/lib/messaging.ts` — `staffDisplayName()`, `formatStaffRole()`

---

## Database tables

| Table | Purpose |
|---|---|
| `conversations` | Thread metadata, staff directory flag, preview |
| `conversation_participants` | Membership, `unread_count` |
| `messages` | `body`, `sender_id`, `status` |

**RLS (key migrations):**

- `20260423003927_member_portal_messaging_rls.sql`
- `20260423025407_fix_member_portal_messages_rls.sql`
- `20260423030918_fix_messages_rls_anon_conflict.sql` — `messages_tenant_rls`, `conversations_tenant_rls`, `conv_participants_rls`

**Backfill migration (local, may not be applied):** `20260615120000_staff_directory_display_names.sql` — sets `conversations.name` from `users.first_name`.

---

## Other communication channels (not DMs)

| Feature | Route | Primary mechanism |
|---|---|---|
| Email bulk | `/communications`, `/communications/compose` | `send-communication` edge function |
| SMS | `/communications` (Sms tab) | `africastalking-sms` |
| WhatsApp | `/communications` (WhatsApp) | `send-whatsapp-message`, `whatsapp-webhook` |
| Announcements | `/announcements` | Direct DB + member read policies |
| Admin broadcasts | `AdminBroadcast.tsx` | `send-communication`, `send-push-notification` |

⚠️ **DISCREPANCY:** `NotificationsSettings.tsx` invokes deployed function **`at-sms`** (not in local repo). Local equivalent: `africastalking-sms`. See [`edge-functions-gap.md`](./edge-functions-gap.md).

---

## Edge functions (messaging-related)

| Function | Local? | Purpose |
|---|---|---|
| `create-staff-thread` | Yes | Staff directory conversation + welcome message |
| `send-communication` | Yes | Branded bulk email |
| `send-push-notification` | Yes | FCM push |
| `africastalking-sms` | Yes | Bulk SMS |
| `send-whatsapp-message` | Yes | WhatsApp templates |
| `whatsapp-webhook` | Yes | Delivery status |
| `africastalking-delivery-webhook` | Yes | SMS delivery reports |
| `at-sms` | **No — deployed only** | Legacy alias still invoked from settings |

---

## Known gaps

1. **Invite email path (`sendInvite` ON):** Relies on `InviteCallback` for `create-staff-thread`; silent failure if metadata missing.
2. **Path C / already_registered:** Recently patched to create threads; verify deployed versions match local.
3. **Founding admin:** May lack staff directory tile if never passed through invite callback.
4. **Member invites:** `create-staff-thread` correctly skipped when `invitedRole === 'member'`.
