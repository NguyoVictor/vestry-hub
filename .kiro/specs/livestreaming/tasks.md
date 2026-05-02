# Implementation Plan: Livestreaming Feature

## Overview

Build a complete livestreaming management system for VestryHub that allows churches to configure multiple streaming platforms, schedule streams, go live with multi-platform support, collect prayer requests, and archive past streams. Implementation proceeds in seven phases: database → utility → settings integration → admin page → member page → navigation integration → realtime features.

**CRITICAL CONSTRAINT:** Only modify livestreaming-specific files. Minimal changes to Settings.tsx and AppLayout.tsx only.

## Tasks

- [x] 1. Database migration — livestreaming tables
  - [x] 1.1 Create Supabase migration file `supabase/migrations/YYYYMMDD000000_add_livestreaming_tables.sql`
    - Create `livestream_configs` table with columns: `id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text`, `tenant_id TEXT NOT NULL`, `name TEXT NOT NULL`, `platform_type TEXT NOT NULL`, `platform_url TEXT NOT NULL`, `embed_url TEXT NOT NULL`, `subscribe_url TEXT`, `subscribe_label TEXT`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
    - Add index: `CREATE INDEX ON livestream_configs (tenant_id)`
    - Enable RLS: `ALTER TABLE livestream_configs ENABLE ROW LEVEL SECURITY`
    - Create RLS policies using EXACT pattern from existing tables:
      - `CREATE POLICY "livestream_configs_select" ON livestream_configs FOR SELECT TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))`
      - `CREATE POLICY "livestream_configs_insert" ON livestream_configs FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))`
      - `CREATE POLICY "livestream_configs_update" ON livestream_configs FOR UPDATE TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))`
      - `CREATE POLICY "livestream_configs_delete" ON livestream_configs FOR DELETE TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))`
    - Create `livestream_schedules` table with columns: `id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text`, `tenant_id TEXT NOT NULL`, `title TEXT NOT NULL`, `description TEXT`, `start_time TIMESTAMPTZ NOT NULL`, `recurrence_pattern TEXT`, `recurrence_day INTEGER`, `is_recurring BOOLEAN DEFAULT false`, `is_live BOOLEAN DEFAULT false`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
    - Add index: `CREATE INDEX ON livestream_schedules (tenant_id, is_live)`
    - Add index: `CREATE INDEX ON livestream_schedules (tenant_id, start_time)`
    - Enable RLS: `ALTER TABLE livestream_schedules ENABLE ROW LEVEL SECURITY`
    - Create RLS policies using EXACT pattern:
      - `CREATE POLICY "livestream_schedules_select" ON livestream_schedules FOR SELECT TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1) OR tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1))`
      - `CREATE POLICY "livestream_schedules_insert" ON livestream_schedules FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))`
      - `CREATE POLICY "livestream_schedules_update" ON livestream_schedules FOR UPDATE TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))`
      - `CREATE POLICY "livestream_schedules_delete" ON livestream_schedules FOR DELETE TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))`
    - Create `livestream_history` table with columns: `id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text`, `tenant_id TEXT NOT NULL`, `title TEXT NOT NULL`, `stream_date DATE NOT NULL`, `thumbnail_url TEXT`, `embed_url TEXT NOT NULL`, `youtube_video_id TEXT`, `source TEXT DEFAULT 'manual'`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
    - Add index: `CREATE INDEX ON livestream_history (tenant_id, stream_date DESC)`
    - Add index: `CREATE INDEX ON livestream_history (tenant_id, youtube_video_id)` for duplicate detection
    - Enable RLS: `ALTER TABLE livestream_history ENABLE ROW LEVEL SECURITY`
    - Create RLS policies using EXACT pattern:
      - `CREATE POLICY "livestream_history_select" ON livestream_history FOR SELECT TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1) OR tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1))`
      - `CREATE POLICY "livestream_history_insert" ON livestream_history FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))`
      - `CREATE POLICY "livestream_history_update" ON livestream_history FOR UPDATE TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))`
      - `CREATE POLICY "livestream_history_delete" ON livestream_history FOR DELETE TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))`
    - Create `livestream_prayer_requests` table with columns: `id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text`, `tenant_id TEXT NOT NULL`, `member_id TEXT`, `prayer_text TEXT NOT NULL`, `is_anonymous BOOLEAN DEFAULT false`, `is_prayed_for BOOLEAN DEFAULT false`, `prayed_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ DEFAULT NOW()`
    - Add index: `CREATE INDEX ON livestream_prayer_requests (tenant_id, created_at DESC)`
    - Add index: `CREATE INDEX ON livestream_prayer_requests (tenant_id, is_prayed_for)`
    - Enable RLS: `ALTER TABLE livestream_prayer_requests ENABLE ROW LEVEL SECURITY`
    - Create RLS policies using EXACT pattern (members can insert their own, admins can view all):
      - `CREATE POLICY "livestream_prayer_requests_member_select" ON livestream_prayer_requests FOR SELECT TO authenticated USING (member_id = auth.uid()::text OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))`
      - `CREATE POLICY "livestream_prayer_requests_member_insert" ON livestream_prayer_requests FOR INSERT TO authenticated WITH CHECK (member_id = auth.uid()::text OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))`
      - `CREATE POLICY "livestream_prayer_requests_admin_update" ON livestream_prayer_requests FOR UPDATE TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))`
    - Create `livestream_reminders` table with columns: `id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text`, `tenant_id TEXT NOT NULL`, `member_id TEXT NOT NULL`, `schedule_id TEXT NOT NULL REFERENCES livestream_schedules(id) ON DELETE CASCADE`, `created_at TIMESTAMPTZ DEFAULT NOW()`, UNIQUE constraint on `(tenant_id, member_id, schedule_id)`
    - Add index: `CREATE INDEX ON livestream_reminders (tenant_id, member_id)`
    - Enable RLS: `ALTER TABLE livestream_reminders ENABLE ROW LEVEL SECURITY`
    - Create RLS policies using EXACT pattern (members can only manage their own reminders):
      - `CREATE POLICY "livestream_reminders_member_select" ON livestream_reminders FOR SELECT TO authenticated USING (member_id = auth.uid()::text)`
      - `CREATE POLICY "livestream_reminders_member_insert" ON livestream_reminders FOR INSERT TO authenticated WITH CHECK (member_id = auth.uid()::text)`
      - `CREATE POLICY "livestream_reminders_member_delete" ON livestream_reminders FOR DELETE TO authenticated USING (member_id = auth.uid()::text)`
    - _Requirements: 1, 2, 3, 5, 7, 8, 24_

  - [x] 1.2 Add livestreaming constants to `src/lib/schema.ts`
    - Add to `TABLES`: `LIVESTREAM_CONFIGS: "livestream_configs"`, `LIVESTREAM_SCHEDULES: "livestream_schedules"`, `LIVESTREAM_HISTORY: "livestream_history"`, `LIVESTREAM_PRAYER_REQUESTS: "livestream_prayer_requests"`, `LIVESTREAM_REMINDERS: "livestream_reminders"`
    - Add to `COLS`: `PLATFORM_TYPE: "platform_type"`, `PLATFORM_URL: "platform_url"`, `EMBED_URL: "embed_url"`, `SUBSCRIBE_URL: "subscribe_url"`, `SUBSCRIBE_LABEL: "subscribe_label"`, `START_TIME: "start_time"`, `RECURRENCE_PATTERN: "recurrence_pattern"`, `RECURRENCE_DAY: "recurrence_day"`, `IS_RECURRING: "is_recurring"`, `IS_LIVE: "is_live"`, `STREAM_DATE: "stream_date"`, `THUMBNAIL_URL: "thumbnail_url"`, `YOUTUBE_VIDEO_ID: "youtube_video_id"`, `SOURCE: "source"`, `PRAYER_TEXT: "prayer_text"`, `IS_ANONYMOUS: "is_anonymous"`, `IS_PRAYED_FOR: "is_prayed_for"`, `PRAYED_AT: "prayed_at"`, `SCHEDULE_ID: "schedule_id"`
    - _Requirements: 24_

- [x] 2. Platform detection utility
  - [x] 2.1 Create `src/utils/streamPlatform.ts`
    - Export `detectPlatform(url: string)` function that returns `{ type: 'youtube' | 'facebook' | 'vimeo' | 'custom', color: string, icon: string, subscribeLabel: string }`
    - YouTube detection: check if URL contains `youtube.com` or `youtu.be` → return `{ type: 'youtube', color: '#FF0000', icon: 'Youtube', subscribeLabel: 'Subscribe on YouTube' }`
    - Facebook detection: check if URL contains `facebook.com` or `fb.com` → return `{ type: 'facebook', color: '#1877F2', icon: 'Facebook', subscribeLabel: 'Follow on Facebook' }`
    - Vimeo detection: check if URL contains `vimeo.com` → return `{ type: 'vimeo', color: '#1AB7EA', icon: 'Video', subscribeLabel: 'Follow on Vimeo' }`
    - Default (custom): return `{ type: 'custom', color: '#7c3aed', icon: 'Video', subscribeLabel: 'Subscribe' }`
    - Export `extractYouTubeChannelId(url: string): string | null` function using regex to extract channel ID from YouTube URLs
    - _Requirements: 1_

- [x] 3. Settings page integration
  - [x] 3.1 Add Livestreaming section to `src/pages/settings/Settings.tsx` (MINIMAL CHANGE ONLY)
    - Import `Video` icon from lucide-react
    - Add new section after existing sections with heading "Livestreaming" and `Video` icon
    - Display list of configured platforms from `livestream_configs` table using `useQuery` with `staleTime: 300000`
    - Show platform name, type badge (with platform color), and edit/delete buttons
    - Add "Add Platform" button that opens a dialog
    - Dialog form fields: Platform Name (required), Platform URL (required), Embed URL (required), Subscribe URL (optional), Subscribe Label (optional)
    - Use React Hook Form + Zod for validation (URL format validation)
    - On save: `useMutation` to INSERT into `livestream_configs`, auto-detect platform type using `detectPlatform()`
    - On edit: `useMutation` to UPDATE `livestream_configs`
    - On delete: `useMutation` to DELETE from `livestream_configs`
    - Show success/error toasts using Sonner
    - All queries filtered by `tenant_id` from `useChurch()`
    - _Requirements: 1, 15, 18, 21_

- [x] 4. Admin livestreaming page
  - [x] 4.1 Create `src/pages/Livestreaming.tsx` (admin page)
    - Import necessary components: `Helmet`, `BlurFadeIn`, `motion` from framer-motion, icons from lucide-react
    - Use `useChurch()` to get `tenantId`
    - Fetch data using `useQuery` hooks with `staleTime: 300000`:
      - `livestream_configs` (all platforms)
      - `livestream_schedules` (all schedules)
      - `livestream_history` (past streams)
      - `livestream_prayer_requests` (all prayers)
    - Calculate analytics: total views (placeholder), prayer count, reminder count, average attendance
    - _Requirements: 2, 10, 22_

  - [x] 4.2 Admin page header section
    - Page title: "Livestreaming" with `Video` icon
    - Subtitle: "Manage your church's live broadcasts"
    - Wrap in `BlurFadeIn` with `delay={0}`
    - _Requirements: 2_

  - [x] 4.3 Live banner section (when is_live=true)
    - Query `livestream_schedules` for any record with `is_live=true` for current tenant
    - If live session exists:
      - Display `motion.div` with red gradient background `from-red-950/20 to-black/40` and `border-red-500/30`
      - Animated "LIVE" badge with pulsing red dot using `motion.div` with `animate={{ scale: [1, 1.05, 1] }}` and `transition={{ repeat: Infinity, duration: 1.5 }}`
      - Show schedule title and description
      - Display all active platforms as side-by-side iframes using `embed_url` from `livestream_configs`
      - Show subscribe buttons for each platform (if `subscribe_url` exists) with platform-specific colors
      - "Go Offline" button: `useMutation` to UPDATE `is_live=false` on the schedule
    - Wrap in `BlurFadeIn` with `delay={0.1}`
    - _Requirements: 2_

  - [x] 4.4 Analytics dashboard section
    - Display 4 stat cards in a grid:
      - Total Views (icon: Eye, color: violet)
      - Prayer Requests (icon: Heart, color: pink, count from `livestream_prayer_requests`)
      - Reminders Set (icon: Bell, color: blue, count from `livestream_reminders`)
      - Avg Attendance (icon: Users, color: emerald, calculated value)
    - Use animated number counters with Framer Motion
    - Wrap in `BlurFadeIn` with `delay={0.2}`
    - _Requirements: 10_

  - [x] 4.5 Prayer wall section (admin only)
    - Display heading "Prayer Requests" with filter tabs: All / Pending / Prayed For
    - Fetch prayers using `useQuery` from `livestream_prayer_requests` filtered by `tenant_id`
    - Subscribe to Supabase Realtime channel `prayer_requests:{tenant_id}` for new prayer inserts
    - Display prayers in reverse chronological order with:
      - Prayer text
      - Member name (or "Anonymous" if `is_anonymous=true`)
      - Timestamp
      - "Mark as Prayed For" button (if not already prayed for)
    - `useMutation` to UPDATE `is_prayed_for=true` and `prayed_at=NOW()` when marked
    - New prayers slide in with `motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}`
    - Show empty state if no prayers: icon + "No prayer requests yet" message
    - Wrap in `BlurFadeIn` with `delay={0.3}`
    - _Requirements: 6, 12_

  - [x] 4.6 Schedule management section
    - Display heading "Upcoming Streams" with "Schedule Stream" button
    - List all schedules from `livestream_schedules` ordered by `start_time`
    - Each schedule card shows:
      - Title and description
      - Start time (formatted with date-fns)
      - Recurrence pattern (if `is_recurring=true`): "Every Sunday at 10:00 AM"
      - Platform badges
      - "Go Live" toggle button (updates `is_live` field)
      - Edit and Delete buttons
    - "Schedule Stream" dialog with form:
      - Title (required)
      - Description (optional)
      - Start Date & Time (required)
      - Recurring toggle
      - If recurring: Recurrence Pattern (daily/weekly/monthly) and Day selection
      - Platform selection (multi-select from `livestream_configs`)
    - Use React Hook Form + Zod for validation
    - `useMutation` for INSERT/UPDATE/DELETE on `livestream_schedules`
    - Show success/error toasts
    - Wrap in `BlurFadeIn` with `delay={0.4}`
    - _Requirements: 3_

  - [x] 4.7 Past streams archive section (admin)
    - Display heading "Past Streams" with "Add Past Stream" and "Sync from YouTube" buttons
    - Grid display of past streams from `livestream_history` ordered by `stream_date DESC`
    - Each card shows:
      - Thumbnail image (from `thumbnail_url`)
      - Title
      - Date (formatted)
      - Platform badge
      - Edit and Delete buttons
    - "Add Past Stream" dialog with form:
      - Title (required)
      - Date (required)
      - Thumbnail URL (optional)
      - Embed URL (required)
    - "Sync from YouTube" button:
      - Check if any platform has `platform_type='youtube'`
      - Extract channel ID using `extractYouTubeChannelId()`
      - Call YouTube Data API v3: `GET https://www.googleapis.com/youtube/v3/search?part=snippet&channelId={channelId}&type=video&eventType=completed&order=date&maxResults=20&key={VITE_YOUTUBE_API_KEY}`
      - For each video: check if `youtube_video_id` exists in `livestream_history` (avoid duplicates)
      - If not exists: INSERT with `source='youtube_api'`, construct `embed_url` as `https://www.youtube.com/embed/{videoId}`
      - Show success toast: "Synced {count} past streams from YouTube"
      - If API fails: show error toast with graceful message
      - If no YouTube platform: show toast "No YouTube channel configured"
    - `useMutation` for INSERT/UPDATE/DELETE on `livestream_history`
    - Show empty state if no past streams
    - Wrap in `BlurFadeIn` with `delay={0.5}`
    - _Requirements: 8, 13_

- [x] 5. Member livestreaming page
  - [x] 5.1 Create `src/pages/member/Livestreaming.tsx` (member page)
    - Import necessary components: `Helmet`, `BlurFadeIn`, `motion`, `AnimatePresence` from framer-motion
    - Use `useMemberPortal()` hook to get `member` object with `member.churchId` (tenant_id) and `member.memberId`
    - Fetch data using `useQuery` hooks with `staleTime: 300000`:
      - `livestream_configs` (all platforms)
      - `livestream_schedules` (all schedules)
      - `livestream_history` (past streams)
      - `livestream_reminders` (member's reminders filtered by `member.memberId`)
    - Check if any schedule has `is_live=true` to determine live state
    - _Requirements: 2, 3, 7, 9_

  - [x] 5.2 Member page hero section — Live state
    - If `is_live=true`:
      - Display `motion.div` with red gradient background and animated "We're Live Right Now" badge
      - Show active schedule title and description
      - Display subscribe buttons for each platform with platform colors
      - Wrap in `motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`
    - _Requirements: 2_

  - [x] 5.3 Member page hero section — Countdown timer
    - If NOT live:
      - Calculate time remaining to next scheduled stream (find earliest `start_time` where `start_time > NOW()`)
      - Display countdown in 4 cards: Days | Hours | Mins | Secs
      - Each card: `motion.div` with `whileHover={{ scale: 1.05 }}`
      - Number flip animation using `AnimatePresence mode="wait"` with `motion.div key={value} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}`
      - Update every 1000ms using `setInterval`
      - Show schedule title below countdown
    - If no upcoming streams: show message "No upcoming streams scheduled"
    - Wrap in `BlurFadeIn` with `delay={0.1}`
    - _Requirements: 4_

  - [x] 5.4 Stream players section (member view)
    - Display active platforms as tabs (one tab per platform)
    - Tab bar: platform color dot + platform name
    - Active tab indicator slides with Framer Motion `layoutId="activeTab"`
    - Selected tab shows iframe with `embed_url` in `aspect-video rounded-2xl overflow-hidden`
    - Below player: Subscribe button (if `subscribe_url` exists) and platform name badge
    - Skeleton loader while iframe loads, fade in on `onLoad` event
    - Wrap in `BlurFadeIn` with `delay={0.2}`
    - _Requirements: 2_

  - [x] 5.5 Prayer request submission section (live only)
    - Only visible when `is_live=true`
    - Display card with heading "🙏 Submit a Prayer Request"
    - Textarea for prayer text (required, min 10 characters)
    - Checkbox: "Submit anonymously"
    - "Send Prayer 🙏" button with `motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}`
    - On submit: `useMutation` to INSERT into `livestream_prayer_requests` with `member_id: member.memberId` (or null if anonymous), `tenant_id: member.churchId`
    - Success: show check icon with spring animation `{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }` and toast "Your prayer has been received ✓"
    - Error: gentle shake animation and error toast
    - Clear form after successful submission
    - Wrap in `BlurFadeIn` with `delay={0.3}`
    - _Requirements: 5_

  - [x] 5.6 Upcoming streams section (member view)
    - Display heading "Upcoming Streams"
    - List all future schedules from `livestream_schedules` where `start_time > NOW()`
    - Each card shows:
      - Platform badge
      - Title
      - Date and time (formatted)
      - Recurring label if applicable: "Every Sunday at 10:00 AM"
      - "Remind Me" button with Bell icon
    - "Remind Me" button:
      - Check if reminder exists in `livestream_reminders` for this `(member.memberId, schedule_id)`
      - If exists: show "Reminder Set ✓" with check icon, on click DELETE reminder WHERE `member_id = member.memberId`
      - If not exists: show "Remind Me", on click INSERT reminder with `member_id: member.memberId`, `tenant_id: member.churchId`, `schedule_id`
      - Toggle animation with check icon scaling in
      - Show success toast on toggle
    - `useMutation` for INSERT/DELETE on `livestream_reminders`
    - Show empty state if no upcoming streams
    - Wrap in `BlurFadeIn` with `delay={0.4}`
    - _Requirements: 7_

  - [x] 5.7 Past streams archive section (member view)
    - Display heading "Past Streams"
    - Grid display of past streams from `livestream_history` ordered by `stream_date DESC`
    - Each card shows:
      - Thumbnail image with play button overlay (opacity 0 → 1 on hover)
      - Title
      - Date
      - Platform badge
    - Card hover animation: `whileHover={{ y: -4 }}` and thumbnail `scale: 1.05`
    - On click: open modal with iframe player (keeps member in app, not new tab)
    - Modal:
      - `max-w-4xl` centered
      - `aspect-video` iframe at top
      - Title + date + platform below
      - Close button (X) top-right
      - Framer Motion scale-in entrance: `initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}`
    - Show empty state if no past streams
    - Wrap in `BlurFadeIn` with `delay={0.5}`
    - _Requirements: 9_

- [x] 6. Navigation integration
  - [x] 6.1 Add live indicator to sidebar navigation in `src/components/layout/AppLayout.tsx` (MINIMAL CHANGE ONLY)
    - Subscribe to Supabase Realtime channel `livestream_status:{tenant_id}` on component mount
    - Listen for changes to `livestream_schedules` table where `is_live=true`
    - Set local state `isLiveNow` to true if any schedule is live
    - Find existing "Livestreaming" nav item in sidebar
    - Add conditional red pulsing dot badge when `isLiveNow=true`:
      - `<span className="w-2 h-2 rounded-full bg-red-500 animate-pulse absolute -top-1 -right-1" />`
    - Cleanup: unsubscribe from Realtime channel on unmount
    - _Requirements: 16, 12_

- [x] 7. Realtime features
  - [x] 7.1 Implement realtime prayer request updates (admin)
    - In admin `Livestreaming.tsx`, subscribe to Supabase Realtime channel `prayer_requests:{tenant_id}`
    - Listen for INSERT events on `livestream_prayer_requests` table
    - On new prayer: invalidate `livestream_prayer_requests` query to trigger refetch
    - New prayer appears with slide-in animation
    - Cleanup: unsubscribe on unmount
    - _Requirements: 12_

  - [x] 7.2 Implement realtime live status updates (member)
    - In member `Livestreaming.tsx`, subscribe to Supabase Realtime channel `livestream_status:{tenant_id}`
    - Listen for UPDATE events on `livestream_schedules` table where `is_live` changes
    - On status change: invalidate `livestream_schedules` query to trigger refetch
    - UI automatically switches between countdown and live banner
    - Cleanup: unsubscribe on unmount
    - _Requirements: 12_

- [x] 8. Testing and verification
  - [x] 8.1 Manual testing checklist
    - Admin can add YouTube + Facebook platforms simultaneously
    - Both iframes render side-by-side when live
    - Platform auto-detected from URL correctly (YouTube red, Facebook blue)
    - Subscribe button uses admin's `subscribe_url`
    - Go Live toggle updates sidebar dot in realtime
    - Member prayer request appears in admin wall instantly
    - Countdown timer counts down to next schedule
    - Past streams grid renders correctly
    - YouTube API sync works (or fails gracefully)
    - Member nav Livestreaming button navigates correctly
    - All queries are `tenant_id` scoped
    - Dark mode works on all new components
    - Mobile layout correct on all sections
    - _Requirements: All_

  - [x] 8.2 Accessibility verification
    - All images have alt text
    - All icon-only buttons have aria-labels
    - Keyboard navigation works for all interactive elements
    - Focus indicators visible
    - Color contrast meets WCAG AA
    - Screen reader announcements for dynamic content
    - _Requirements: 23_

  - [x] 8.3 Performance verification
    - All queries use `staleTime: 300000`
    - Livestreaming page lazy loaded
    - Database indexes exist on all `tenant_id` columns
    - `refetchOnWindowFocus: false` on all queries
    - Realtime subscriptions cleaned up on unmount
    - _Requirements: 22_

## Notes

### File Modification Constraints

**ALLOWED MODIFICATIONS:**
- `src/pages/Livestreaming.tsx` (create new)
- `src/pages/member/Livestreaming.tsx` (create new)
- `src/components/livestreaming/*` (create new directory and components)
- `src/utils/streamPlatform.ts` (create new)
- `src/pages/settings/Settings.tsx` (add Livestreaming section ONLY)
- `src/components/layout/AppLayout.tsx` (add live dot to nav item ONLY)

**STRICTLY PROHIBITED:**
- Do NOT modify `src/index.css`
- Do NOT modify `tailwind.config.ts`
- Do NOT modify any shadcn/ui components
- Do NOT modify any other existing pages or components
- Do NOT create components in `src/components/shared/` for this feature

### YouTube API Integration

- API key should be stored in `.env` as `VITE_YOUTUBE_API_KEY`
- If key is missing, show disabled state with tooltip "YouTube API key required"
- Graceful fallback to manual add if API fails
- Rate limit: 10,000 units/day (each search = 100 units)

### Recurrence Pattern Calculation

- Daily: Next day at specified time
- Weekly: Next occurrence of specified day of week (0=Sunday, 6=Saturday)
- Monthly: Next occurrence of specified day of month (1-31)
- Calculate dynamically, do not create individual schedule entries

### Platform Colors

- YouTube: `#FF0000` (red)
- Facebook: `#1877F2` (blue)
- Vimeo: `#1AB7EA` (teal)
- Custom: `#7c3aed` (violet)

### Realtime Channels

- `livestream_status:{tenant_id}` - Broadcasts live session status changes
- `prayer_requests:{tenant_id}` - Broadcasts new prayer submissions

### Design System Compliance

- Primary color: Violet `#7c3aed`
- Platform-specific accent colors for streaming platforms
- Plus Jakarta Sans font (via `font-jakarta` class)
- All components support dark mode with `dark:` variants
- Use `BlurFadeIn` for page entrance animations
- Use `motion` from framer-motion for all animations
- Spring transitions: `{ type: 'spring', stiffness: 400, damping: 25 }`
