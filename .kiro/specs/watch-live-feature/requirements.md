# Watch Live Feature — Requirements

## Overview

The Watch Live feature enables churches to broadcast live services to their members through multiple streaming platforms (YouTube, Facebook, Jitsi, or custom URLs). Members can watch live streams, participate in real-time chat, send reactions, and access past service recordings.

This is a **platform-wide feature** — every church on VestryHub gets this automatically. No hardcoded tenant_id or church_id in components.

---

## User Stories

### Admin Users

**As a church administrator, I want to:**

1. **Start a live stream** with a single click, choosing from multiple streaming platforms
2. **See a prominent "Go Live" panel** that makes it easy to broadcast services
3. **Auto-generate Jitsi room names** so I don't have to configure complex streaming setups
4. **Add service details** (pastor name, series, scripture) to provide context
5. **Enable/disable live chat** to control member interaction during streams
6. **See live viewer count** to understand engagement in real-time
7. **End streams** with a single click and automatically archive them
8. **Schedule future services** with recurring options (weekly, monthly)
9. **Manage past recordings** by adding YouTube/Vimeo URLs or uploading videos
10. **View analytics** including total streams, recordings, and viewer counts

### Member Users

**As a church member, I want to:**

1. **See when my church is live** immediately upon opening the member portal
2. **Watch live streams** in a cinematic, distraction-free player
3. **Participate in live chat** to connect with other members during services
4. **Send quick reactions** (🙏 Amen, ❤️ Love, 🔥 Fire, 🙌 Praise) during the stream
5. **See how many people are watching** to feel connected to the community
6. **Know when the next service is** with a countdown timer
7. **Set reminders** for upcoming services
8. **Browse past recordings** to catch up on missed services
9. **Watch recordings** in a full-screen video modal
10. **Receive notifications** when the church goes live

---

## Functional Requirements

### FR1: Database Schema

#### FR1.1: Livestream Schedules Table Enhancement
- Add `stream_provider` column (enum: youtube, facebook, jitsi, custom)
- Add `stream_url` for YouTube/Facebook/custom URLs
- Add `jitsi_room` for auto-generated Jitsi room names
- Add `pastor_name`, `series_name`, `scripture` for service metadata
- Add `thumbnail_url` for recording thumbnails
- Add `recording_url` for archived stream videos
- Add `recording_duration` (integer, seconds)
- Add `viewer_count` (integer, default 0)
- Add `ended_at` (timestamptz) to track when stream ended
- Add `chat_enabled` (boolean, default true)

#### FR1.2: Live Chat Messages Table
- Create `live_chat_messages` table with:
  - `id` (text, primary key)
  - `tenant_id` (text, foreign key to tenants)
  - `stream_id` (text, foreign key to livestream_schedules)
  - `member_id` (text, foreign key to members, nullable)
  - `member_name` (text, required)
  - `member_avatar` (text, nullable)
  - `message` (text, required)
  - `reaction` (text, nullable) — emoji for quick reactions
  - `is_pinned` (boolean, default false)
  - `is_admin` (boolean, default false)
  - `created_at` (timestamptz)
- Create index on `(tenant_id, stream_id, created_at DESC)`
- Enable RLS with policies:
  - Admins: ALL operations for their tenant
  - Members: SELECT and INSERT for their tenant
- Enable Supabase Realtime on this table

### FR2: Admin Livestreaming Page Enhancement

#### FR2.1: Page Header
- Show pulsing red "● LIVE" badge when `is_live = true`
- Show "End Stream" button (destructive) when live
- Show "+ Go Live" button (primary) when not live
- Display stats: Total Streams | Live Now | Total Recordings | Total Viewers

#### FR2.2: Go Live Panel
- Prominent card at top of page (only visible when not live)
- **Service Title** input (required)
- **Streaming Provider** selector with 4 visual cards:
  - 📺 YouTube Live
  - 👥 Facebook Live
  - 🎥 Jitsi (built-in)
  - 🔗 Custom URL
- **Stream URL/Room** (conditional):
  - YouTube: input for YouTube Live URL
  - Facebook: input for Facebook Live URL
  - Jitsi: auto-generated room name (read-only): `vestryhub-live-{last6OfTenantId}`
  - Custom: input for any iframe-embeddable URL
- **Service Details** (collapsible):
  - Pastor Name
  - Series Name
  - Scripture Reference
- **Enable live chat** toggle (default: on)
- **"Go Live Now"** button:
  - Sets `is_live = true`
  - Saves provider, URL/room, and metadata
  - Shows toast: "You are now live!"
  - Triggers notification to all members

#### FR2.3: Scheduled Services Tab
- Table of upcoming scheduled services
- "+ Schedule Service" button opens drawer with:
  - Title, Date, Time
  - Recurring toggle with day-of-week selector
  - Provider and stream URL
  - Pastor, Series, Scripture
- Edit and delete actions per row

#### FR2.4: Recordings Tab
- Table of past streams (where `ended_at` is set)
- Columns: Title | Date | Duration | Provider | Views | Recording | Actions
- Actions:
  - Add recording URL (link to YouTube/Vimeo video)
  - Edit details
  - Delete
- Empty state: "No recordings yet"

### FR3: Member Watch Live Page

#### FR3.1: Page States
The page has **2 states** based on live data:
- **STATE 1 (Live)**: When `is_live = true` for any schedule
- **STATE 2 (Not Live)**: When no live streams exist

#### FR3.2: STATE 1 — Currently Live

**Layout:**
- Two-column on desktop (player left, chat right)
- Single column on mobile (player, info, chat stacked)

**Stream Player:**
- Aspect-video container with rounded corners
- Provider-specific rendering:
  - **YouTube**: iframe with autoplay
  - **Facebook**: Facebook video plugin iframe
  - **Jitsi**: inline Jitsi iframe (reuse JitsiModal logic)
  - **Custom**: generic iframe
- Overlays:
  - Top-left: Pulsing red "● LIVE" badge
  - Top-right: Viewer count chip (Eye icon + "X watching")

**Service Info (below player):**
- Church name (small, muted)
- Service title (large, bold)
- Info row: Pastor | Series | Scripture (with icons)

**Live Chat Panel:**
- Header: "Live Chat" + online count
- Messages area:
  - Avatar (24px circle) + name + message
  - Admin messages have "Host" badge
  - Pinned messages stay at top with amber border
  - New messages animate in
  - Auto-scroll to bottom
- Reactions bar: 🙏 Amen | ❤️ Love | 🔥 Fire | 🙌 Praise
- Input area: text input + send button
- Realtime subscription to new messages

#### FR3.3: STATE 2 — Not Currently Live

**Hero Section:**
- Animated TV icon with pulsing rings
- Heading: "No Live Service Right Now"
- Subtext: "Join us when we go live..."

**Next Service Card (if scheduled):**
- Service title and date/time
- **Countdown Timer**:
  - 4 units: DAYS | HOURS | MINS | SECS
  - Large flip-style numbers
  - Updates every second
  - Subtle scale animation on change
- "Notify Me" button (saves reminder preference)

**Recent Recordings Strip:**
- Horizontal scrollable row
- Last 3 recordings
- Recording cards with thumbnail, title, date, duration
- "See all →" link to Recordings tab

#### FR3.4: Past Recordings Tab
- Filter/search row: search input, series filter, pastor filter, sort
- Grid of recording cards (3 columns on desktop)
- Click opens video modal:
  - Full-screen backdrop
  - Video player (iframe or HTML5 video)
  - Title, date, pastor, series below player
  - Increment view count on open
- Empty state: "No recordings yet"

### FR4: Realtime Sync

#### FR4.1: Live Status Subscription
- Subscribe to `livestream_schedules` table changes
- Filter by `tenant_id`
- Listen for UPDATE events on `is_live` column
- When `is_live` changes to `true`:
  - Transition from STATE 2 → STATE 1
  - Show toast: "🔴 We are now live! Tap to watch"
- When `is_live` changes to `false`:
  - Transition from STATE 1 → STATE 2
  - Show toast: "The live service has ended"

#### FR4.2: Chat Messages Subscription
- Subscribe to `live_chat_messages` INSERT events
- Filter by `stream_id` and `tenant_id`
- New messages appear instantly for all viewers
- Optimistic UI for sent messages

### FR5: Notifications

#### FR5.1: "We Are Live" Notification
- **Trigger**: Admin clicks "Go Live Now"
- **Target**: ALL active members of the church
- **Title**: "🔴 We Are Live Now!"
- **Body**: "[Church Name] has started a live service. Join now: [service title]"
- **Deep link**: `/member/watch-live`

#### FR5.2: Service Reminder Notification
- **Trigger**: 30 minutes before scheduled service
- **Target**: Members who clicked "Notify Me"
- **Title**: "⏰ Service Starting Soon"
- **Body**: "[Service title] starts in 30 minutes. Get ready to join!"
- **Deep link**: `/member/watch-live`
- **Implementation**: Scheduled check every 5 minutes or Edge Function cron

---

## Non-Functional Requirements

### NFR1: Performance
- Page load time < 2 seconds
- Chat messages appear within 500ms of sending
- Countdown timer updates smoothly without jank
- Video player loads within 3 seconds

### NFR2: Scalability
- Support up to 1000 concurrent viewers per stream
- Chat handles 100+ messages per minute
- Realtime subscriptions don't degrade performance

### NFR3: Accessibility
- All interactive elements keyboard accessible
- ARIA labels on all icons and buttons
- Video player has captions support
- High contrast mode support

### NFR4: Mobile Responsiveness
- Full functionality on mobile devices
- Touch-friendly chat interface
- Responsive video player
- Optimized layout for small screens

### NFR5: Security
- RLS policies prevent cross-tenant data access
- Chat messages filtered by tenant_id
- No sensitive data exposed in client code
- Stream URLs validated before embedding

---

## Technical Constraints

### TC1: No New Dependencies
- Use existing packages only
- No new npm installs
- Reuse existing components where possible

### TC2: Protected Files
**NEVER modify:**
- `src/index.css`
- `tailwind.config.ts`
- `src/components/ui/*` (all shadcn components)
- `src/components/layout/AppLayout.tsx`

### TC3: Design System Compliance
- Use `motion/react` for all animations
- Reuse `BlurFadeIn` and `GradientText` components
- Spring transitions: stiffness 400, damping 25
- All colors need `dark:` variants
- Use existing Tailwind classes only

### TC4: Data Fetching
- Use TanStack Query for all data fetching
- Set `staleTime: 300000` on all queries
- Never use `useEffect + useState` for data
- Use `useMutation` for all mutations

### TC5: Multi-Tenancy
- Filter ALL queries by `tenant_id`
- Use `useChurch()` for admin pages
- Use `useMemberPortal()` for member pages
- Never hardcode tenant_id or church_id

---

## Success Criteria

### SC1: Admin Experience
- ✅ Admin can go live in < 30 seconds
- ✅ All 4 streaming providers work correctly
- ✅ Jitsi room auto-generates without configuration
- ✅ Service details save and display correctly
- ✅ Recordings can be added and managed

### SC2: Member Experience
- ✅ Members see live stream within 5 seconds of admin going live
- ✅ Chat messages appear in real-time
- ✅ Reactions work smoothly
- ✅ Countdown timer is accurate
- ✅ Recording playback works on all devices

### SC3: Realtime Performance
- ✅ State transitions happen within 2 seconds
- ✅ Chat messages have < 500ms latency
- ✅ No memory leaks from subscriptions
- ✅ Notifications delivered within 10 seconds

### SC4: Quality Assurance
- ✅ No console errors
- ✅ Dark mode works throughout
- ✅ Mobile responsive on all screen sizes
- ✅ No hardcoded tenant_id anywhere
- ✅ Protected files untouched

---

## Out of Scope

- Video recording/storage (use external platforms)
- Advanced chat moderation (ban, mute, etc.)
- Multi-camera switching
- Screen sharing controls
- Viewer analytics dashboard
- Chat message search/history
- Private messages between members
- Polls/surveys during stream
- Donation/giving during stream
- Automatic YouTube API sync (manual only)

---

## Dependencies

### Existing Features
- Authentication system (users and members)
- Church/tenant context
- Notification dispatch system
- Supabase Realtime
- Existing JitsiModal component

### External Services
- YouTube Live (admin provides URL)
- Facebook Live (admin provides URL)
- Jitsi Meet (public instance)
- Supabase Realtime (for chat and status)

---

## Risks & Mitigations

### Risk 1: Realtime Subscription Limits
**Mitigation**: Use single subscription per page, filter client-side if needed

### Risk 2: Chat Spam
**Mitigation**: Rate limiting on INSERT (future enhancement)

### Risk 3: Video Player Compatibility
**Mitigation**: Test on multiple browsers, provide fallback messages

### Risk 4: Notification Delivery
**Mitigation**: Use existing proven notification system, log failures

### Risk 5: Countdown Timer Drift
**Mitigation**: Recalculate from server time, not just decrement

---

## Future Enhancements

1. **Chat Moderation**: Ban, mute, delete messages
2. **Advanced Analytics**: Viewer retention, engagement metrics
3. **Automatic Recording**: Save streams to Supabase Storage
4. **Multi-Language Captions**: Real-time translation
5. **Polls & Surveys**: Interactive elements during stream
6. **Giving Integration**: Donate during live service
7. **YouTube API Sync**: Auto-import past streams
8. **Custom Branding**: Church logo overlay on player
9. **Breakout Rooms**: Small group discussions after service
10. **Replay Chat**: Show chat messages synced with recording playback
