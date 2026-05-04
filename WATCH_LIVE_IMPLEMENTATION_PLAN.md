# Watch Live Feature Implementation Plan

## ✅ Completed

### Database Schema
- ✅ Added columns to `livestream_schedules`:
  - stream_provider, stream_url, jitsi_room
  - pastor_name, series_name, scripture
  - thumbnail_url, recording_url, recording_duration
  - viewer_count, ended_at, chat_enabled
- ✅ Created `live_chat_messages` table with RLS policies
- ✅ Enabled Supabase Realtime on `live_chat_messages`

## 🚧 In Progress

### Section 1: Admin Livestreaming Page Enhancement
**File**: `src/pages/Livestreaming.tsx`

#### 1A. Page Header ✅
- Current header exists, needs enhancement:
  - Add pulsing "● LIVE" badge when currently live
  - Add "End Stream" button when live
  - Add "+ Go Live" button when not live
  - Update stats row with new metrics

#### 1B. Go Live Panel (NEW)
- Create prominent card at top for starting live stream
- 4-card visual selector for streaming provider
- Conditional stream URL/room input based on provider
- Collapsible service details section
- "Go Live Now" button with mutation

#### 1C. Scheduled Services Tab
- Already exists as "Upcoming Streams"
- Enhance schedule dialog with new fields

#### 1D. Recordings Tab
- Already exists as "Past Streams"
- Add recording URL management
- Add duration display

### Section 2: Member Watch Live Page
**File**: `src/pages/member/MemberWatchLive.tsx` (NEW)

#### 2A. STATE 1 — Currently Live
- Two-column layout (player + chat)
- Stream player with provider-specific rendering
- Live badge and viewer count overlay
- Service info below player
- Live chat panel with realtime messages
- Reaction buttons
- Message input with optimistic UI

#### 2B. STATE 2 — Not Currently Live
- Premium waiting screen with animated icon
- Next service card with countdown timer
- Recent recordings strip
- Set reminder button

#### 2C. Recording Card Component
**File**: `src/components/shared/RecordingCard.tsx` (NEW)
- Thumbnail with play overlay
- Duration chip
- Title and metadata
- Hover animations

#### 2D. Past Recordings Tab
- Full recordings library
- Filter/search functionality
- Video modal for playback

### Section 3: Realtime Sync
- Subscribe to `livestream_schedules` changes
- Transition between STATE 1 and STATE 2
- Toast notifications on status change

### Section 4: Notifications
- "We are live" notification to all members
- Service reminder 30 min before
- Use existing notification dispatch pattern

### Section 5: Route Wiring
- Add `/member/watch-live` route to App.tsx
- Update member home "Watch Live" tile link

## 📋 Implementation Order

1. ✅ Database migrations (DONE)
2. 🔄 Admin page Go Live panel
3. Member Watch Live page - STATE 1 (Live)
4. Member Watch Live page - STATE 2 (Not Live)
5. Recording card component
6. Realtime sync
7. Notifications
8. Route wiring
9. Testing

## 🎯 Key Technical Decisions

### Stream Provider Handling
- YouTube: iframe with autoplay
- Facebook: Facebook video plugin iframe
- Jitsi: Inline Jitsi iframe (reuse existing JitsiModal logic)
- Custom: Generic iframe

### Jitsi Room Naming
- Format: `vestryhub-live-{last6OfTenantId}`
- Auto-generated, read-only display

### Chat Realtime
- Subscribe to `live_chat_messages` INSERT events
- Filter by `stream_id` and `tenant_id`
- Optimistic UI for sent messages
- Auto-scroll to bottom on new messages

### Countdown Timer
- Calculate time remaining until `start_time`
- Update every second via `useEffect` + `setInterval`
- Flip-style animation on number change
- Show DAYS | HOURS | MINS | SECS

### State Management
- Query `livestream_schedules` WHERE `is_live = true`
- If result exists → STATE 1 (Live)
- If no result → STATE 2 (Not Live)
- Realtime subscription updates state automatically

## 🚨 Critical Rules

### DO NOT MODIFY
- src/index.css
- tailwind.config.ts
- src/components/ui/* (all shadcn components)
- src/components/layout/AppLayout.tsx

### CREATE NEW FILES IN
- src/components/shared/ (reusable components)
- src/pages/member/ (member pages)

### ALWAYS
- Use TABLES and COLS constants from schema.ts
- Filter by tenant_id from useChurch() or useMemberPortal()
- Use BlurFadeIn for page transitions
- Use motion/react for animations
- Include dark mode classes (dark:)
- Use staleTime: 300000 on all queries
- Use toast.success() / toast.error() on mutations

### NEVER
- Hardcode tenant_id or church_id
- Install new npm packages
- Use useEffect + useState for data fetching (use TanStack Query)
- Modify protected files

## 📦 Components to Create

1. `src/pages/member/MemberWatchLive.tsx` - Main member page
2. `src/components/shared/RecordingCard.tsx` - Recording card component
3. `src/components/shared/LiveChatPanel.tsx` - Chat panel component
4. `src/components/shared/StreamPlayer.tsx` - Stream player component
5. `src/components/shared/CountdownTimer.tsx` - Countdown timer component

## 🧪 Testing Checklist

- [ ] Admin can go live with each provider type
- [ ] Member sees live stream when admin goes live
- [ ] Chat messages appear in real time
- [ ] Reactions work correctly
- [ ] Countdown timer counts down accurately
- [ ] Recording cards open video modal
- [ ] State transitions work (live ↔ not live)
- [ ] Notifications sent correctly
- [ ] Dark mode works throughout
- [ ] Mobile responsive
- [ ] No hardcoded tenant_id anywhere

## 📝 Notes

- Existing admin page has good structure, enhance rather than rebuild
- Reuse existing JitsiModal component logic for inline Jitsi
- Follow existing notification pattern from facility booking
- Use existing BlurFadeIn and GradientText components
- Match existing design system (violet primary color)
- Spring transitions: stiffness 400, damping 25

