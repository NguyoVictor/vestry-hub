# Messaging

> Cross-ref: [`auth.md`](./auth.md), [`admin-flows.md`](./admin-flows.md), [`member-flows.md`](./member-flows.md)

Two conversation types in **`conversations`** + **`conversation_participants`** + **`messages`**.

---

## 1. Staff directory (discovery tiles)

| Field | Value |
|---|---|
| `is_staff_directory` | `true` |
| `staff_user_id` | Staff `users.id` |
| `name` | Denormalized display name |
| `type` | `direct` |

**Member UI:** `MemberMessages.tsx` — section “Message a leader”.

**Created by:**

| Event | Code path |
|---|---|
| Staff invite accepted | `InviteCallback.tsx` → `create-staff-thread` if `invitedRole !== 'member'` |
| Staff add Path C | `Users.tsx` → `create-staff-thread` |
| Staff add (no invite) | `Users.tsx` → `create-staff-thread` |
| Already-registered invite | `send-invitation/index.ts` inline when `alreadyRegistered` |
| Staff reactivate | `update-user-role/index.ts` inline |

**Edge function:** `create-staff-thread/index.ts` — welcome message in `messages`, participant row, idempotent if thread exists.

---

## 2. Private member ↔ staff DMs

| Field | Value |
|---|---|
| `is_staff_directory` | `false` |
| Participants | Member + one staff (2 rows in `conversation_participants`) |

**Member:** `joinStaffThread()` in `MemberMessages.tsx` — creates private conv with `staff_user_id`, `name`.

**Admin:** `MemberMessaging.tsx`

- Query: `["conversations-dm", tenantId, userId]`
- Filters: `type=direct`, `is_staff_directory=false`, current user in participants.

**Helpers:** `src/lib/messaging.ts` — `staffDisplayName()`, `formatStaffRole()`.

---

## Routes

| Side | Path | File |
|---|---|---|
| Admin | `/member-messaging` | `MemberMessaging.tsx` |
| Admin | `/communications`, `/communications/compose` | Bulk email/SMS |
| Member | `/member/messages` | `MemberMessages.tsx` |

---

## Bulk communications (separate from DMs)

| Channel | Edge function | Invoke sites |
|---|---|---|
| Email | `send-communication` | `Communications.tsx`, `ComposeEmail.tsx`, `EmailTemplates.tsx`, `AdminBroadcast.tsx` |
| SMS (bulk) | `africastalking-sms` | `SmsTab.tsx`, `SmsSettings.tsx`, `ComposeEmail.tsx` |
| SMS (settings test) | **`at-sms`** | `NotificationsSettings.tsx` — `action: "check_balance"`; uses `tenants.at_*` columns |
| WhatsApp | `send-whatsapp-message` | `WhatsAppCloud.tsx` |
| Push | `send-push-notification` | `AdminBroadcast.tsx` |

**Note:** `at-sms` and `africastalking-sms` are **different implementations** — settings notifications uses `at-sms` (tenant credentials on `tenants` table); comms module uses `africastalking-sms` (subscription credits / `sms_settings`).

**Branded email shared code:**

- `_shared/branded-email.ts` — used by `send-invitation`, `send-communication`
- `_shared/buildBrandedEmail.ts` — used by `website-consultation`, `invite-user`, `build-branded-email` HTTP function

---

## Scheduled notifications (messaging-adjacent)

| Function | Target |
|---|---|
| `notify-task-deadlines` | `follow_up_tasks` due 7d/1d → `notifications` for `super_admin` / `staff_leader` |
| `notify-meeting-deadlines` | `board_meetings` 24h/1h → same admin roles |
| `send-bible-reminder` | Invoked from `BibleExplorer.tsx` — manual trigger, not cron |

---

## Database & RLS

**Tables:** `conversations`, `conversation_participants`, `messages`, `notifications`

**Key migrations:**

- `20260423003927_member_portal_messaging_rls.sql`
- `20260423025407_fix_member_portal_messages_rls.sql`
- `20260423030918_fix_messages_rls_anon_conflict.sql`

**Backfill (local):** `20260615120000_staff_directory_display_names.sql`

---

## Known gaps

1. `InviteCallback` does not check `create-staff-thread` errors before navigating away.
2. Founding admin may lack staff tile if never through invite/add paths.
3. `invite-user` legacy function does **not** create staff threads and is unused by UI.
