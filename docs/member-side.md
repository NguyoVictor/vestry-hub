# Member Portal — Complete Reference

> **Scope:** Member side only — routes from `src/App.tsx` under `MemberAuthGuard` / `MemberPortalLayout`, plus public entry pages.  
> **Cross-ref:** [`auth.md`](./auth.md), [`member-flows.md`](./member-flows.md), [`payments.md`](./payments.md), [`messaging.md`](./messaging.md), [`admin-side.md`](./admin-side.md)

---

## How to use this doc

Each page entry includes:

| Field | Meaning |
|---|---|
| **Route / file** | Path → component |
| **Auth** | Public, `MemberAuthGuard`, or layout-wrapped |
| **Module gate** | `enabled_modules.member_portal` key from `MemberHome.tsx` — see [Module gating](#module-gating-enabled_modulesmember_portal) |
| **Structure** | Tree scan of main flow |
| **Data** | Supabase tables |
| **Backend** | Edge functions / RPCs |
| **vs Admin** | Comparison to admin equivalent where one exists |
| **Gaps** | Bugs, missing gates, product-doc mismatches |

**Auth model:** Custom session in `localStorage.member_session` — **not** Supabase Auth JWT for most API calls. Client uses **anon** Supabase key; RLS policies scope member access. Server validates login via **`member-login`** → `member_sessions` table.

**Guards:**

```
MemberAuthGuard.tsx
├─ Read localStorage.member_session
├─ Validate expiresAt > now
├─ no-session → /member/login
└─ authed → MemberPortalProvider (+ Outlet)

MemberPortalProvider
├─ Load members + tenants (enabled_modules.member_portal)
├─ Missing row → clear session → /member/login
└─ Expose useMemberPortal()
```

⚠️ **Pending approval** is enforced only at **`member-login`** (403 `pending_approval`), not on every navigation. Once session exists, guard does not re-check `membership_status`.

---

## Module gating (`enabled_modules.member_portal`)

**Read:** `MemberPortalContext.tsx` → `tenants.enabled_modules.member_portal` (object map)  
**Written:** Settings → Member App (`MemberAppFeatures.tsx`, `MemberApp.tsx`)

### Where gating applies

| Surface | Filters by module? |
|---|---|
| **`MemberHome.tsx` service tile grid** | **Yes** — `ALL_MODULES.filter(m => enabledModules[m.key] !== false)` |
| **`MemberPortalLayout` sidebar (`SIDEBAR_NAV`)** | **No** — static link list |
| **`MemberPortalLayout` mobile bottom nav** | **No** — Home, Give, Events, Messages, Profile always shown |
| **Direct URL navigation** | **No** — any `/member/*` route loads if authed |
| **`member_permission_overrides` table** | **Not read** anywhere in member pages |

Default when key missing: **visible** (`!== false`).

### Module key → route mapping

| Module key | Route | In sidebar? |
|---|---|---|
| `give_online` | `/member/give` | Yes (Give) |
| `pledge_campaigns` | `/member/pledge-campaigns` | Yes |
| `my_giving_history` | `/member/giving-history` | Yes |
| `announcements` | `/member/announcements` | Yes |
| `messages` | `/member/messages` | Yes (mobile nav) |
| `chat_on_whatsapp` | `/member/whatsapp` | **No** — home tile only |
| `testimonies` | `/member/testimonies` | Yes |
| `member_request` | `/member/requests` | Yes |
| `my_appointments` | `/member/appointments` | Yes |
| `upcoming_events` | `/member/events` | Yes (Events) |
| `watch_live` | `/member/watch-live` | **No** |
| `sermons` | `/member/sermons` | Yes |
| `church_media` | `/member/church-media` | **No** |
| `outreach_impact` | `/member/outreach` | **No** |
| `volunteer` | `/member/volunteer` | **No** |
| `house_fellowships` | `/member/house-fellowships` | Yes |
| `my_groups` | `/member/groups` | Yes |
| `surveys` | `/member/surveys` | **No** |
| `bible_explorer` | `/member/bible` | Yes |
| `training_courses` | `/member/training` | **No** |
| `my_discipleship_journey` | `#` (broken tile) | **No** |
| `facility_booking` | `/member/facility-booking` | **No** |
| `resource_store` | `/member/store` | **No** |

**Extra routes with no module key:** `/member/livestreaming` (companion to watch-live), `/member/profile`, `/member/settings`, `/member/children`, `/member/welcome`.

### Gating gaps (mirror admin-side “no permission check”)

1. **Route-level:** Disabling a module hides the home tile only — **sidebar and direct URLs still work**.
2. **Layout nav** ignores `enabledModules` entirely.
3. **Bottom nav** always exposes Give and Events even if `give_online` / `upcoming_events` disabled.
4. **`member_permission_overrides`** UI exists in admin settings but is **never applied** on member pages.
5. No per-member-type gates (`member.memberType`) on routes.

---

## Entry & registration (public)

### Member Login

| | |
|---|---|
| **Route** | `/member/login` (alias redirect from `/member-login`) |
| **File** | `src/pages/member/MemberLogin.tsx` |
| **Auth** | Public |
| **Module gate** | — |

```
MemberLogin.tsx
├─ Fields: email, churchCode (?code= URL auto-fill)
├─ Lookup: SELECT tenants (name, logo) by church_code
├─ invoke member-login { email, churchCode }
├─ Errors: invalid_code | member_not_found | pending_approval (toast 6s)
├─ Success: localStorage.member_session = { memberId, tenantId, memberName, sessionToken, expiresAt, memberType }
└─ Redirect: /member
```

**Data:** `tenants` (read), `members`, `member_sessions` (edge function)

**Backend:** `member-login`

**Gaps:** Does not use Supabase Auth; session token stored client-side only (RLS relies on anon policies + member id in queries).

---

### Join Church (QR / code registration)

| | |
|---|---|
| **Route** | `/member/join` |
| **File** | `JoinChurch.tsx` |
| **Auth** | Public |
| **Module gate** | — |

```
JoinChurch.tsx
├─ URL: ?code=, ?type=member|visitor
├─ memberType picker → separate forms
├─ invoke member-register { churchCode, memberType, registrationSource: qr_scan|form, … }
├─ Success UI: church name + code; member → pending approval messaging
└─ Does NOT create member_session
```

**Data:** `tenants` (lookup); edge creates `members`, optional `visitors`, activity/notifications

**Backend:** `member-register` — sets **`membership_status: "Pending Approval"`** for members

**vs Admin:** Admin approves on `MemberProfile.tsx` (`member_management`).

---

### Member Registration (legacy public form)

| | |
|---|---|
| **Route** | `/member-registration/:orgId` |
| **File** | `src/pages/MemberRegistration.tsx` |
| **Auth** | Public (not under `MemberAuthGuard`) |
| **Module gate** | — |

```
MemberRegistration.tsx
├─ Load tenant by orgId; check registration_enabled
├─ Form: name, gender, DOB, phone, email, address, occupation, marital_status
├─ Direct INSERT members (registration_source: Self-Registration, status: Active)
└─ Success screen — no login redirect
```

**Data:** `tenants`, `members`

**Backend:** None (direct insert, **not** `member-register`)

**Gaps:** ⚠️ **Does not set `membership_status: "Pending Approval"`** and bypasses `member-register` — inconsistent with QR join flow; may allow immediate login if `membership_status` defaults to non-pending.

---

## Authenticated — pre-layout

### Profile Setup

| | |
|---|---|
| **Route** | `/member/profile-setup` |
| **File** | `ProfileSetup.tsx` |
| **Auth** | `MemberAuthGuard` (no `MemberPortalLayout`) |
| **Module gate** | — |

**Data:** `members` UPDATE (first_name, last_name, DOB, gender, phone, address)

**Key behaviors:** Skip button → `/member`; uses `useMemberPortal()` (provider wraps all authed routes).

---

## Member shell (`MemberPortalLayout`)

**File:** `src/components/layout/MemberPortalLayout.tsx`

```
MemberPortalLayout
├─ useFcmToken(memberId, tenantId) — push registration
├─ useNotificationBell() + realtime INSERT on notifications
├─ Desktop: SIDEBAR_NAV (static links — no module filter)
├─ Mobile: bottom nav (Home, Give, Events, Messages, Profile)
├─ Notification click → /member/announcements?highlight=
└─ Sign out → clear member_session → /member/login
```

**Data:** `notifications` (realtime)

**Backend:** None

---

### Member Welcome

| | |
|---|---|
| **Route** | `/member/welcome` |
| **File** | `MemberWelcome.tsx` |
| **Module gate** | — |

Animated welcome screen; **auto-redirect to `/member` after 2.5s**. Also used from admin OAuth handoff (`AuthCallback` with `redirect_to=/member/welcome`).

---

### Member Home

| | |
|---|---|
| **Route** | `/member` |
| **File** | `MemberHome.tsx` |
| **Module gate** | **Controls tile visibility only** |

```
MemberHome.tsx
├─ Filter ALL_MODULES by enabledModules[key] !== false
├─ Profile completion banner if profileComplete < 100 → /member/profile
├─ Service tile grid → Link to each /member/* path
├─ Queries: latest studio_media sermon, volunteer roles
└─ Verse of day (client-side rotation)
```

**Data:** `studio_media`, `volunteers`, `volunteer_roles`, `tenants.enabled_modules`

**Gaps:** Tile `my_discipleship_journey` links to **`#`** (non-functional). Tiles hidden but routes remain reachable via sidebar/URL.

---

## Giving

### Member Give

| | |
|---|---|
| **Route** | `/member/give` |
| **File** | `MemberGive.tsx` |
| **Module gate** | `give_online` |
| **vs Admin** | `GiveOnline.tsx` |

```
MemberGive.tsx
├─ Fields: amount, category, phone (prefill), dedication, paymentMethod
├─ M-Pesa: invoke process-stk-push { amount, phone, memberId, tenantId, … }
├─ STK modal: 90s countdown
├─ Confirm: postgres_changes on giving_records.id
├─ Fallback: poll giving_records every 2s
├─ Alt: manual INSERT giving_records (non-STK path in file)
└─ Success: summary + client jsPDF receipt option
```

**Data:** `giving_records`, `tenants`, `members`

**Backend:** `process-stk-push`

**vs Admin Give Online:** Same edge function, same **90s** countdown, same **postgres_changes + 2s polling** pattern. Admin adds donor picker for other members and giving stats header; member pre-fills own phone and ties `member_id` automatically.

---

### Member Giving History

| | |
|---|---|
| **Route** | `/member/giving-history` |
| **File** | `MemberGivingHistory.tsx` |
| **Module gate** | `my_giving_history` |
| **vs Admin** | `GivingRecords.tsx` |

**Data:** `giving_records` (filtered to current member)

**Backend:** None

**Key behaviors:** List/filter own gifts; **annual statement jsPDF** generated client-side (admin has full-tenant ledger CRUD).

**Gaps:** `generate-receipt` edge function **not invoked** — receipts are client PDF only; `receipt_url` column unused from member UI.

---

### Member Pledge Campaigns

| | |
|---|---|
| **Route** | `/member/pledge-campaigns` |
| **File** | `MemberPledgeCampaigns.tsx` |
| **Module gate** | `pledge_campaigns` |
| **vs Admin** | `PledgeCampaigns.tsx` |

```
MemberPledgeCampaigns.tsx
├─ List active pledge_campaigns + member pledges
├─ Create pledge commitment → INSERT pledges
├─ Pay via M-Pesa: invoke process-stk-push
├─ STK modal: 150s countdown (not 90s)
├─ Confirm: supabase.channel broadcast payment_update (NOT postgres_changes)
└─ No 2s polling fallback
```

**Data:** `pledge_campaigns`, `pledges`, `giving_records`

**Backend:** `process-stk-push`

**Gaps:** ⚠️ **Different payment confirmation mechanism** than Member Give / Admin Give Online (broadcast vs postgres_changes+polling). **150s vs 90s** countdown. Broadcast listener may miss updates if backend only writes DB.

---

## Events & community

### Member Events (+ detail)

| | |
|---|---|
| **Route** | `/member/events`, `/member/events/:eventId` |
| **File** | `MemberEvents.tsx`, detail in same file / routed component |
| **Module gate** | `upcoming_events` |
| **vs Admin** | `Events.tsx`, `Services.tsx` |

**Data:** `events`, `event_rsvps`, `services`, `service_attendance`

**Key behaviors:** RSVP confirm/cancel; mark service attendance intent.

**Backend:** None

---

### Member Announcements

| | |
|---|---|
| **Route** | `/member/announcements` |
| **File** | `MemberAnnouncements.tsx` |
| **Module gate** | `announcements` |
| **vs Admin** | `Announcements.tsx` |

**Data:** `announcements`, `announcement_types`, `announcement_reactions`, `announcement_comments`, `group_members` (audience filter)

**Key behaviors:** Reactions, comments, group-scoped visibility; `?highlight=` from notification bell.

---

### Member Groups (+ detail)

| | |
|---|---|
| **Route** | `/member/groups`, `/member/groups/:groupId` |
| **File** | `MemberGroups.tsx` (+ inline detail) |
| **Module gate** | `my_groups` |
| **vs Admin** | `Groups.tsx`, `GroupDetail.tsx` |

**Data:** `groups`, `group_members`, `join_requests`, `members`

**Key behaviors:** My groups, discover groups, submit join requests (admin approves on admin side).

---

### Member House Fellowship

| | |
|---|---|
| **Route** | `/member/house-fellowships` |
| **File** | `MemberHouseFellowship.tsx` |
| **Module gate** | `house_fellowships` |
| **vs Admin** | `HouseFellowships.tsx` |

**Data:** `fellowship_members`, `house_fellowships`, `fellowship_rsvp`, `fellowship_attendance`, `members`

**Key behaviors:** View cell assignment, RSVP, attendance history (read).

---

## Engagement & pastoral

### Member Requests

| | |
|---|---|
| **Route** | `/member/requests` |
| **File** | `MemberRequests.tsx` |
| **Module gate** | `member_request` |
| **vs Admin** | `MemberRequests.tsx` (operations) |

**Data:** `member_requests`, `service_request_types`

**Key behaviors:** Member CRUD own requests; admin triages on admin page (may spawn conversation thread).

**Backend:** None on member side

---

### Member Appointments

| | |
|---|---|
| **Route** | `/member/appointments` |
| **File** | `MemberAppointments.tsx` |
| **Module gate** | `my_appointments` |
| **vs Admin** | `Appointments.tsx` |

```
MemberAppointments.tsx
├─ List member's appointments
├─ Book: INSERT appointments + INSERT notifications for admins
└─ Uses appointment_types config
```

**Data:** `appointments`, `appointment_types`, `users`, `notifications`

**Backend:** None

**Gaps:** Admin appointments page also lacks `usePermissions`; member booking does not check counselor availability rules beyond form validation.

---

### Member Testimonies

| | |
|---|---|
| **Route** | `/member/testimonies` |
| **File** | `MemberTestimonies.tsx` |
| **Module gate** | `testimonies` |
| **vs Admin** | `Testimonies.tsx` |

**Data:** `testimonies`, `testimony_categories`, `testimony_reactions`

**Key behaviors:** Submit/edit own testimonies (may require admin moderation depending on status field); reactions on published items.

---

### Member Messages

| | |
|---|---|
| **Route** | `/member/messages` |
| **File** | `MemberMessages.tsx` |
| **Module gate** | `messages` |
| **vs Admin** | `MemberMessaging.tsx` |

```
MemberMessages.tsx
├─ Staff directory (is_staff_directory=true) → joinStaffThread → private DM
├─ My threads (is_staff_directory=false)
├─ Realtime: postgres_changes on messages
├─ Send/reply/attach/delete own messages (anon client)
├─ rpc batch_increment_unread_count
└─ Storage: message-attachments bucket
```

**Data:** `conversations`, `conversation_participants`, `messages`, `message_reactions`, `users`, `members`

**Backend:** RPC `batch_increment_unread_count`

See [`messaging.md`](./messaging.md).

---

## Media & content

### Member Sermons (+ detail)

| | |
|---|---|
| **Route** | `/member/sermons`, `/member/sermons/:sermonId` |
| **File** | `MemberSermonsRevamped.tsx`, `MemberSermonDetailRevamped.tsx` |
| **Module gate** | `sermons` |
| **vs Admin** | `SermonsRevamped.tsx` |

**Data:** `sermons`, `sermon_bookmarks`, `sermon_reactions`

**Key behaviors:** Browse/filter series; bookmark; reactions. Public pages at `/sermons/:tenantId` separate.

---

### Member Bible

| | |
|---|---|
| **Route** | `/member/bible` |
| **File** | `MemberBible.tsx` |
| **Module gate** | `bible_explorer` |
| **vs Admin** | `BibleExplorer.tsx` |

**Data:** `bible_notes`, `bible_favorites` (Supabase — **synced**, unlike admin Bible Explorer which leans on localStorage)

**Backend:** None

**Gaps:** Admin and member Bible implementations are **different codepaths** with different storage strategies.

---

### Member Church Media (+ album detail)

| | |
|---|---|
| **Route** | `/member/church-media`, `…/albums/:albumId` |
| **Files** | `MemberChurchMedia.tsx`, `MemberAlbumDetail.tsx` |
| **Module gate** | `church_media` |
| **vs Admin** | `ChurchMedia.tsx` |

**Data:** `church_media_items`, `media_albums`, `media_categories` (visibility `members`)

**Key behaviors:** Browse photos/video/audio; album view read-only.

---

### Member Livestreaming

| | |
|---|---|
| **Route** | `/member/livestreaming` |
| **File** | `MemberLivestreaming.tsx` |
| **Module gate** | None (not in `ALL_MODULES`; related key `watch_live` → `/member/watch-live`) |
| **vs Admin** | `Livestreaming.tsx` |

**Data:** `livestream_configs`, `livestream_schedules`, `livestream_history`, `livestream_reminders`, `livestream_prayer_requests`

**Key behaviors:** Schedule list, prayer wall submit, reminder toggles, embed player via `detectPlatform()`.

---

### Member Watch Live

| | |
|---|---|
| **Route** | `/member/watch-live` |
| **File** | `MemberWatchLive.tsx` |
| **Module gate** | `watch_live` |

**Data:** `livestream_schedules` (+ realtime subscription on schedule changes)

**Key behaviors:** Focused “what’s live now” viewer; filters by series/pastor.

**Gaps:** Two livestream UIs (`/member/livestreaming` vs `/member/watch-live`) with overlapping data — only `watch_live` is module-gated on home.

---

## Growth & extras

### Member Volunteer

| | |
|---|---|
| **Route** | `/member/volunteer` |
| **File** | `MemberVolunteer.tsx` |
| **Module gate** | `volunteer` |
| **vs Admin** | `Volunteering.tsx` |

**Data:** `volunteer_roles`, `volunteers`, `members`

**Key behaviors:** Browse open roles; sign up (INSERT volunteers); view my assignments.

---

### Member Outreach

| | |
|---|---|
| **Route** | `/member/outreach` |
| **File** | `MemberOutreach.tsx` |
| **Module gate** | `outreach_impact` |
| **vs Admin** | `Outreach.tsx` |

**Data:** `outreach_activities` (read-only stats/activities for members)

**Key behaviors:** Impact charts and activity list — member-facing read view, not admin CRUD.

---

### Member Surveys

| | |
|---|---|
| **Route** | `/member/surveys` |
| **File** | `MemberSurveys.tsx` |
| **Module gate** | `surveys` |
| **vs Admin** | `Surveys.tsx` |

**Data:** `surveys`, `survey_responses`

**Key behaviors:** Lists surveys member can take; links to public `/survey/:surveyId` for anonymous take flow.

---

### Member Store (Resource Store)

| | |
|---|---|
| **Route** | `/member/store` |
| **File** | `MemberStore.tsx` |
| **Module gate** | `resource_store` |
| **vs Admin** | `ResourcesStore.tsx` |

**Data:** `store_products` (read)

**Key behaviors:** Browse products; **“Request Resource” toast only** — no cart/checkout/orders.

**Gaps:** ⚠️ Admin store has full commerce (`store_orders`, coupons, bundles); **member store is catalog-only**, not integrated with admin order flow.

---

### Member Facility Booking

| | |
|---|---|
| **Route** | `/member/facility-booking` |
| **File** | `MemberFacilityBooking.tsx` |
| **Module gate** | `facility_booking` |
| **vs Admin** | `FacilityBooking.tsx` |

**Data:** `facilities`, `facility_bookings`, `facility_booking_responses` + facility storage buckets

**Key behaviors:** Browse facilities, submit booking requests, view responses. Public `/book/:tenantId` also exists without auth.

**Backend:** None (admin side uses `send-booking-confirmation`)

---

### Member WhatsApp

| | |
|---|---|
| **Route** | `/member/whatsapp` |
| **File** | `MemberWhatsApp.tsx` |
| **Module gate** | `chat_on_whatsapp` |

**Data:** `whatsapp_contacts`, `whatsapp_groups`

**Key behaviors:** Read-only directory of WhatsApp contacts/groups with external `wa.me` / invite links — not Cloud API messaging.

**vs Admin:** `WhatsAppCloud.tsx` is full API integration; member page is directory only.

---

## Family & profile

### Member Children

| | |
|---|---|
| **Route** | `/member/children` |
| **File** | `MemberChildren.tsx` |
| **Module gate** | None (always in sidebar) |
| **vs Admin** | Children's Ministry admin |

**Data:** `children`, `children_qr_codes`, `children_checkins`

**Key behaviors:** Parent view of registered children, QR codes, recent check-in status.

---

### Member Profile

| | |
|---|---|
| **Route** | `/member/profile` |
| **File** | `MemberProfile.tsx` |
| **Module gate** | None (bottom nav Profile) |

**Data:** `members` UPDATE; soft-delete via `status: inactive`

**Key behaviors:** Edit contact/demographic fields; profile photo; deactivate account.

**Gaps:** Does not invoke `sync-member-profile` (admin MemberProfile does for linked `users` row).

---

### Member Settings

| | |
|---|---|
| **Route** | `/member/settings` |
| **File** | `MemberSettings.tsx` |
| **Module gate** | None (sidebar) |

```
MemberSettings.tsx
├─ Notification toggles (local state only — NOT persisted)
├─ Change email → supabase.auth.updateUser (⚠️ member uses custom session, not Auth login)
├─ UPDATE members + optional users email
├─ Sign out
└─ Delete account → members.status inactive
```

**Gaps:**
- ⚠️ **Notification preferences are UI-only** — toggles do not write to DB.
- ⚠️ **`supabase.auth.updateUser`** likely fails or is no-op for typical members who never created Auth users — email change path assumes linked Auth account.

---

## Training (sub-routes)

### Member Training (catalog)

| | |
|---|---|
| **Route** | `/member/training` |
| **File** | `MemberTraining.tsx` |
| **Module gate** | `training_courses` |

**Data:** `training_courses`, enrollments display

**vs Admin:** `Training.tsx` + course builder

---

### Member Course Detail

| | |
|---|---|
| **Route** | `/member/training/course/:courseId` |
| **File** | `MemberCourseDetail.tsx` |

**Data:** `training_courses`, `course_lessons`, `course_enrollments`, `lesson_completions`

**Key behaviors:** Enroll, lesson list, progress tracking.

---

### Member Lesson Player

| | |
|---|---|
| **Route** | `/member/training/lesson/:lessonId` |
| **File** | `MemberLessonPlayer.tsx` |

**Data:** `course_lessons`, `lesson_completions`

**Key behaviors:** Video/content player; mark complete.

---

### Certificate View

| | |
|---|---|
| **Route** | `/member/training/certificate/:courseId` |
| **File** | `CertificateView.tsx` |

**Key behaviors:** Display/print completion certificate when course finished.

**Related public quiz routes (outside member layout):** `/join/:joinCode`, `/quiz/play/...` for live quizzes hosted from admin Training.

---

## Related public routes (not in member layout)

| Route | File | Notes |
|---|---|---|
| `/survey/:surveyId` | `SurveyTake.tsx` | Anonymous survey submit |
| `/book/:tenantId` | `PublicBookingPage.tsx` | Public facility booking |
| `/sermons/:tenantId` | Public sermon pages | Unauthenticated catalog |

---

## Cross-cutting discrepancies

| Topic | Product / admin expectation | Member code reality |
|---|---|---|
| Module toggles | Disable features church-wide | **Home tiles only**; sidebar/URL ignore gates |
| Registration paths | Single pending-approval flow | **JoinChurch** pending vs **MemberRegistration** direct insert |
| Giving STK confirm | Realtime everywhere | **Give:** postgres+polling; **Pledges:** broadcast only, 150s timer |
| Receipts | Server receipts | **`generate-receipt` unused**; client jsPDF only |
| Store | E-commerce | **Catalog + contact CTA** only |
| Settings notifications | Saved prefs | **Local React state only** |
| Email change | Member email update | Calls **Supabase Auth** API despite custom session auth |
| Bible | One product | **Member** DB notes vs **admin** localStorage-heavy explorer |
| Auth session | Secure server session | **localStorage** + anon Supabase; no route-level re-validation of pending status |
| Product doc §4 | Admin categories listed | **Member portal routes not documented** in `00-product-context.md` |

---

## Quick reference — edge functions & RPCs (member UI)

| Function / RPC | Pages |
|---|---|
| `member-login` | MemberLogin |
| `member-register` | JoinChurch |
| `process-stk-push` | MemberGive, MemberPledgeCampaigns |
| `batch_increment_unread_count` | MemberMessages |

No other edge functions invoked from `src/pages/member/*`.

---

## Quick reference — layout nav vs module keys

**Always visible in mobile bottom nav (ungated):** Home, Give, Events, Messages, Profile.

**Sidebar links with no `enabled_modules` check:** all 16 `SIDEBAR_NAV` items.

**Home-only gated features (direct URL still works):** WhatsApp, Watch Live, Church Media, Outreach, Volunteer, Surveys, Training, Facility Booking, Store, Livestreaming hub.
