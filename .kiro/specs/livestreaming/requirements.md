# Requirements Document: Livestreaming Feature

## Introduction

The Livestreaming feature enables churches to manage and broadcast live worship services, events, and special programs to their congregation through multiple streaming platforms. This system provides comprehensive tools for scheduling streams, managing multi-platform broadcasts, collecting prayer requests during live sessions, archiving past content, and engaging members with reminders and analytics.

The feature integrates seamlessly with VestryHub's existing church management platform, maintaining multi-tenant architecture and following established design patterns.

## Glossary

- **Livestream_System**: The complete livestreaming management module within VestryHub
- **Platform_Config**: A configured streaming destination (YouTube, Facebook, Vimeo, or custom RTMP)
- **Stream_Schedule**: A scheduled livestream event (one-time or recurring)
- **Live_Session**: An active livestream currently broadcasting
- **Prayer_Request**: A prayer submission from a member during a live stream
- **Stream_Archive**: A recorded past livestream available for replay
- **Member**: A church member with access to view streams and submit prayers
- **Admin**: A church administrator with full livestreaming management permissions
- **Tenant**: A church organization in the multi-tenant system (identified by tenant_id)
- **Live_Indicator**: A visual element showing that a stream is currently active
- **Countdown_Timer**: A display showing time remaining until the next scheduled stream
- **Reminder**: A notification preference set by a member for an upcoming stream
- **YouTube_API**: YouTube Data API v3 used for auto-syncing past streams
- **Realtime_Channel**: Supabase Realtime subscription for live updates
- **Platform_Type**: The streaming service category (youtube, facebook, vimeo, custom)
- **Embed_URL**: The URL used to display the stream player in an iframe
- **Subscribe_URL**: The URL directing users to subscribe/follow the platform channel
- **Stream_Status**: The current state of a stream (scheduled, live, ended)
- **Recurrence_Pattern**: The repeating schedule for recurring streams (daily, weekly, monthly)

## Requirements

### Requirement 1: Multi-Platform Configuration Management

**User Story:** As an Admin, I want to configure multiple streaming platforms, so that I can broadcast to all our church's social media channels simultaneously.

#### Acceptance Criteria

1. THE Livestream_System SHALL allow Admins to create unlimited Platform_Configs
2. WHEN creating a Platform_Config, THE Livestream_System SHALL require platform name, platform URL, and embed URL
3. THE Livestream_System SHALL accept optional subscribe URL and subscribe label for each Platform_Config
4. WHEN a Platform_Config is saved, THE Livestream_System SHALL auto-detect Platform_Type from the platform URL
5. THE Livestream_System SHALL assign platform-specific branding colors based on Platform_Type (YouTube red #FF0000, Facebook blue #1877F2, Vimeo teal #1AB7EA, custom violet #7C3AED)
6. THE Livestream_System SHALL assign platform-specific icons based on Platform_Type
7. THE Livestream_System SHALL filter all Platform_Config queries by tenant_id
8. WHEN an Admin updates a Platform_Config, THE Livestream_System SHALL validate all URLs are properly formatted
9. THE Livestream_System SHALL allow Admins to delete Platform_Configs that are not currently in use
10. THE Livestream_System SHALL display all configured platforms in a list with edit and delete actions

### Requirement 2: Live Streaming Session Management

**User Story:** As an Admin, I want to toggle streams live and offline, so that I can control when members see the live broadcast.

#### Acceptance Criteria

1. WHEN an Admin toggles a Stream_Schedule to live, THE Livestream_System SHALL create a Live_Session
2. WHEN a Live_Session is active, THE Livestream_System SHALL display a Live_Indicator in the application sidebar
3. THE Live_Indicator SHALL be a red pulsing dot with "LIVE" text
4. THE Livestream_System SHALL broadcast Live_Session status changes via Realtime_Channel
5. WHEN a Live_Session is active, THE Livestream_System SHALL display all configured Platform_Configs as side-by-side iframes
6. THE Livestream_System SHALL display a live banner with subscribe buttons for each active Platform_Config
7. WHEN an Admin toggles a Live_Session offline, THE Livestream_System SHALL update the Stream_Status to ended
8. THE Livestream_System SHALL allow only one Live_Session per Tenant at a time
9. WHEN a Live_Session ends, THE Livestream_System SHALL hide the Live_Indicator from the sidebar
10. THE Livestream_System SHALL filter all Live_Session queries by tenant_id

### Requirement 3: Stream Scheduling System

**User Story:** As an Admin, I want to schedule recurring and one-time streams, so that members know when to expect live broadcasts.

#### Acceptance Criteria

1. THE Livestream_System SHALL allow Admins to create Stream_Schedules with title, description, and start time
2. THE Livestream_System SHALL support one-time Stream_Schedules with a specific date and time
3. THE Livestream_System SHALL support recurring Stream_Schedules with Recurrence_Pattern (daily, weekly, monthly)
4. WHEN creating a recurring Stream_Schedule, THE Livestream_System SHALL require day of week for weekly patterns
5. WHEN creating a recurring Stream_Schedule, THE Livestream_System SHALL require day of month for monthly patterns
6. THE Livestream_System SHALL display recurring schedules in human-readable format (e.g., "Every Sunday at 10:00 AM")
7. THE Livestream_System SHALL calculate the next occurrence for recurring Stream_Schedules
8. THE Livestream_System SHALL allow Admins to edit Stream_Schedules
9. THE Livestream_System SHALL allow Admins to delete Stream_Schedules
10. THE Livestream_System SHALL filter all Stream_Schedule queries by tenant_id
11. WHEN a Stream_Schedule is created, THE Livestream_System SHALL associate it with selected Platform_Configs

### Requirement 4: Countdown Timer Display

**User Story:** As a Member, I want to see a countdown to the next stream, so that I know exactly when to return for the live broadcast.

#### Acceptance Criteria

1. WHEN no Live_Session is active, THE Livestream_System SHALL display a Countdown_Timer to the next Stream_Schedule
2. THE Countdown_Timer SHALL display days, hours, minutes, and seconds remaining
3. THE Countdown_Timer SHALL update every second
4. THE Countdown_Timer SHALL use flip animation for number transitions
5. WHEN no Stream_Schedule exists, THE Livestream_System SHALL display a message indicating no upcoming streams
6. THE Countdown_Timer SHALL calculate time remaining based on the next occurrence of recurring Stream_Schedules
7. WHEN the Countdown_Timer reaches zero, THE Livestream_System SHALL check for Live_Session activation
8. THE Countdown_Timer SHALL be visible to all Members
9. THE Countdown_Timer SHALL display the title of the upcoming Stream_Schedule
10. THE Countdown_Timer SHALL be responsive on mobile devices

### Requirement 5: Prayer Request Submission System

**User Story:** As a Member, I want to submit prayer requests during live streams, so that the church can pray for my needs.

#### Acceptance Criteria

1. WHEN a Live_Session is active, THE Livestream_System SHALL display a prayer request submission form
2. THE prayer request form SHALL require prayer text content
3. THE prayer request form SHALL allow optional anonymous submission
4. WHEN a Member submits a Prayer_Request, THE Livestream_System SHALL record the member_id, prayer text, and timestamp
5. WHEN a Member submits an anonymous Prayer_Request, THE Livestream_System SHALL record the prayer without member identification
6. THE Livestream_System SHALL broadcast new Prayer_Requests via Realtime_Channel
7. THE Livestream_System SHALL validate prayer text is not empty before submission
8. THE Livestream_System SHALL display a success message after Prayer_Request submission
9. THE Livestream_System SHALL filter all Prayer_Request queries by tenant_id
10. WHEN no Live_Session is active, THE Livestream_System SHALL hide the prayer request form

### Requirement 6: Admin Prayer Management Wall

**User Story:** As an Admin, I want to view and manage prayer requests in real-time, so that I can pray for members during the live stream.

#### Acceptance Criteria

1. THE Livestream_System SHALL display all Prayer_Requests in a prayer wall interface for Admins
2. THE prayer wall SHALL update in real-time via Realtime_Channel when new Prayer_Requests arrive
3. THE prayer wall SHALL display prayer text, submission timestamp, and member name (or "Anonymous")
4. THE Livestream_System SHALL allow Admins to mark Prayer_Requests as "Prayed For"
5. WHEN an Admin marks a Prayer_Request as prayed for, THE Livestream_System SHALL record the timestamp
6. THE prayer wall SHALL provide filters: All, Pending, Prayed For
7. THE prayer wall SHALL display Prayer_Requests in reverse chronological order (newest first)
8. THE Livestream_System SHALL filter all Prayer_Request queries by tenant_id
9. THE prayer wall SHALL be accessible only to Admins
10. THE prayer wall SHALL display a count of pending Prayer_Requests

### Requirement 7: Member Reminder System

**User Story:** As a Member, I want to set reminders for upcoming streams, so that I don't miss important broadcasts.

#### Acceptance Criteria

1. THE Livestream_System SHALL display a bell icon toggle for setting Reminders
2. WHEN a Member clicks the bell icon, THE Livestream_System SHALL create a Reminder for the next Stream_Schedule
3. WHEN a Reminder is active, THE bell icon SHALL display in a filled state
4. WHEN a Member clicks an active Reminder bell, THE Livestream_System SHALL remove the Reminder
5. THE Livestream_System SHALL associate each Reminder with a member_id and Stream_Schedule
6. THE Livestream_System SHALL filter all Reminder queries by tenant_id
7. THE Livestream_System SHALL display the count of Members who have set Reminders for each Stream_Schedule
8. THE Livestream_System SHALL allow Members to set Reminders for recurring Stream_Schedules
9. WHEN a Stream_Schedule is deleted, THE Livestream_System SHALL remove all associated Reminders
10. THE Livestream_System SHALL display a success message when a Reminder is set or removed

### Requirement 8: Past Streams Archive Management

**User Story:** As an Admin, I want to manage an archive of past streams, so that members can watch previous services they missed.

#### Acceptance Criteria

1. THE Livestream_System SHALL allow Admins to manually upload Stream_Archives with title, date, thumbnail URL, and embed URL
2. THE Livestream_System SHALL support YouTube API auto-sync to fetch the last 20 completed streams
3. WHEN YouTube API auto-sync is triggered, THE Livestream_System SHALL fetch stream metadata including title, published date, thumbnail, and video ID
4. WHEN YouTube API auto-sync fails, THE Livestream_System SHALL display an error message and continue functioning
5. THE Livestream_System SHALL construct embed URLs from YouTube video IDs
6. THE Livestream_System SHALL allow Admins to edit Stream_Archive metadata
7. THE Livestream_System SHALL allow Admins to delete Stream_Archives
8. THE Livestream_System SHALL filter all Stream_Archive queries by tenant_id
9. THE Livestream_System SHALL display Stream_Archives in reverse chronological order (newest first)
10. THE Livestream_System SHALL validate all embed URLs are properly formatted before saving

### Requirement 9: Member Archive Viewing Experience

**User Story:** As a Member, I want to browse and watch past streams, so that I can catch up on services I missed.

#### Acceptance Criteria

1. THE Livestream_System SHALL display Stream_Archives in a grid layout with thumbnails
2. WHEN a Member clicks a Stream_Archive thumbnail, THE Livestream_System SHALL open a modal player
3. THE modal player SHALL display the stream in an iframe using the Embed_URL
4. THE modal player SHALL display the stream title and date
5. THE modal player SHALL include a close button
6. THE Livestream_System SHALL display Stream_Archives in reverse chronological order
7. THE Livestream_System SHALL be responsive on mobile devices with a single-column grid
8. THE Livestream_System SHALL display a message when no Stream_Archives exist
9. THE Livestream_System SHALL filter all Stream_Archive queries by tenant_id
10. THE modal player SHALL keep Members within the VestryHub application

### Requirement 10: Analytics Dashboard

**User Story:** As an Admin, I want to view livestreaming analytics, so that I can understand engagement and improve our broadcasts.

#### Acceptance Criteria

1. THE Livestream_System SHALL display total view count across all Platform_Configs
2. THE Livestream_System SHALL display total Prayer_Request count
3. THE Livestream_System SHALL display total Reminder count
4. THE Livestream_System SHALL calculate average attendance per stream
5. THE Livestream_System SHALL display analytics in stat cards with icons
6. THE Livestream_System SHALL filter all analytics queries by tenant_id
7. THE Livestream_System SHALL update analytics in real-time when Live_Sessions are active
8. THE Livestream_System SHALL display analytics only to Admins
9. THE Livestream_System SHALL use animated number counters for stat displays
10. THE Livestream_System SHALL display analytics on the main livestreaming dashboard

### Requirement 11: Multi-Tenant Data Isolation

**User Story:** As a System Administrator, I want all livestreaming data isolated by tenant, so that churches cannot access each other's content.

#### Acceptance Criteria

1. THE Livestream_System SHALL filter all Platform_Config queries by tenant_id
2. THE Livestream_System SHALL filter all Stream_Schedule queries by tenant_id
3. THE Livestream_System SHALL filter all Live_Session queries by tenant_id
4. THE Livestream_System SHALL filter all Prayer_Request queries by tenant_id
5. THE Livestream_System SHALL filter all Reminder queries by tenant_id
6. THE Livestream_System SHALL filter all Stream_Archive queries by tenant_id
7. THE Livestream_System SHALL automatically set tenant_id from the authenticated user's church context
8. THE Livestream_System SHALL prevent cross-tenant data access through Row Level Security policies
9. THE Livestream_System SHALL validate tenant_id on all insert and update operations
10. THE Livestream_System SHALL use the useChurch() hook to retrieve tenant_id in all components

### Requirement 12: Realtime Updates System

**User Story:** As a Member, I want to see live updates when streams go live and when prayer requests are submitted, so that I have the most current information.

#### Acceptance Criteria

1. THE Livestream_System SHALL establish a Realtime_Channel for Live_Session status changes
2. THE Livestream_System SHALL establish a Realtime_Channel for Prayer_Request submissions
3. WHEN a Live_Session status changes, THE Livestream_System SHALL broadcast the update to all connected clients
4. WHEN a new Prayer_Request is submitted, THE Livestream_System SHALL broadcast it to all Admin clients
5. THE Livestream_System SHALL subscribe to Realtime_Channels on component mount
6. THE Livestream_System SHALL unsubscribe from Realtime_Channels on component unmount
7. THE Livestream_System SHALL filter Realtime_Channel subscriptions by tenant_id
8. WHEN a Realtime_Channel update is received, THE Livestream_System SHALL invalidate relevant TanStack Query cache
9. THE Livestream_System SHALL handle Realtime_Channel connection errors gracefully
10. THE Livestream_System SHALL display connection status indicators when Realtime_Channel is disconnected

### Requirement 13: YouTube API Integration

**User Story:** As an Admin, I want to automatically sync past streams from YouTube, so that I don't have to manually enter each video.

#### Acceptance Criteria

1. THE Livestream_System SHALL provide a "Sync from YouTube" button in the admin interface
2. WHEN the sync button is clicked, THE Livestream_System SHALL call YouTube Data API v3 to fetch the last 20 videos
3. THE Livestream_System SHALL require a YouTube channel ID for API requests
4. THE Livestream_System SHALL extract video title, published date, thumbnail URL, and video ID from API responses
5. THE Livestream_System SHALL construct embed URLs in the format: `https://www.youtube.com/embed/{videoId}`
6. WHEN YouTube API returns an error, THE Livestream_System SHALL display a user-friendly error message
7. WHEN YouTube API is unavailable, THE Livestream_System SHALL allow manual Stream_Archive entry as fallback
8. THE Livestream_System SHALL prevent duplicate Stream_Archives by checking video IDs
9. THE Livestream_System SHALL display a success message showing the count of synced videos
10. THE Livestream_System SHALL filter synced Stream_Archives by tenant_id

### Requirement 14: Responsive Mobile Experience

**User Story:** As a Member, I want to access livestreams on my mobile device, so that I can watch from anywhere.

#### Acceptance Criteria

1. THE Livestream_System SHALL display a single-column layout on mobile devices (width < 768px)
2. THE Countdown_Timer SHALL be responsive with stacked number displays on mobile
3. THE multi-platform player SHALL stack iframes vertically on mobile devices
4. THE prayer request form SHALL be full-width on mobile devices
5. THE Stream_Archive grid SHALL display one column on mobile devices
6. THE navigation sidebar SHALL include the Live_Indicator on mobile devices
7. THE modal player SHALL be full-screen on mobile devices
8. THE Livestream_System SHALL use touch-friendly button sizes (minimum 44px height)
9. THE Livestream_System SHALL optimize iframe loading for mobile bandwidth
10. THE Livestream_System SHALL maintain all functionality on mobile devices

### Requirement 15: Settings Integration

**User Story:** As an Admin, I want to access livestreaming configuration from the settings page, so that I can manage all church settings in one place.

#### Acceptance Criteria

1. THE Livestream_System SHALL add a "Livestreaming" section to the settings page
2. THE settings section SHALL display all configured Platform_Configs
3. THE settings section SHALL provide add, edit, and delete actions for Platform_Configs
4. THE settings section SHALL display YouTube API configuration options
5. THE settings section SHALL allow Admins to enter a YouTube channel ID
6. THE settings section SHALL validate YouTube channel ID format
7. THE settings section SHALL be accessible only to Admins
8. THE settings section SHALL follow VestryHub design system styling
9. THE settings section SHALL display success and error messages using toast notifications
10. THE settings section SHALL filter all queries by tenant_id

### Requirement 16: Navigation Integration

**User Story:** As a Member, I want to access livestreaming from the main navigation, so that I can easily find the feature.

#### Acceptance Criteria

1. THE Livestream_System SHALL add a "Livestreaming" item to the sidebar navigation
2. THE navigation item SHALL use a Video icon from Lucide React
3. WHEN a Live_Session is active, THE navigation item SHALL display a red pulsing Live_Indicator dot
4. THE navigation item SHALL route to `/livestreaming`
5. THE navigation item SHALL be visible to all Members and Admins
6. THE Live_Indicator SHALL be positioned as a badge on the navigation icon
7. THE Live_Indicator SHALL animate with a pulse effect
8. THE navigation item SHALL highlight when the livestreaming page is active
9. THE navigation item SHALL follow VestryHub navigation styling
10. THE Live_Indicator SHALL update in real-time via Realtime_Channel

### Requirement 17: Dark Mode Support

**User Story:** As a Member, I want livestreaming to support dark mode, so that it matches my system preferences.

#### Acceptance Criteria

1. THE Livestream_System SHALL apply dark mode styles using Tailwind's `dark:` variant
2. THE Livestream_System SHALL use `bg-slate-800` for card backgrounds in dark mode
3. THE Livestream_System SHALL use `border-slate-700` for borders in dark mode
4. THE Livestream_System SHALL use `text-slate-100` for primary text in dark mode
5. THE Livestream_System SHALL use `text-slate-400` for secondary text in dark mode
6. THE Live_Indicator SHALL maintain red color (#EF4444) in dark mode
7. THE Countdown_Timer SHALL be readable in dark mode
8. THE prayer request form SHALL have appropriate contrast in dark mode
9. THE Stream_Archive grid SHALL display properly in dark mode
10. THE Livestream_System SHALL follow VestryHub dark mode conventions

### Requirement 18: Form Validation and Error Handling

**User Story:** As an Admin, I want clear validation messages when configuring platforms, so that I can correct errors quickly.

#### Acceptance Criteria

1. WHEN an Admin submits a Platform_Config form with missing required fields, THE Livestream_System SHALL display field-specific error messages
2. THE Livestream_System SHALL validate URL format for platform URL, embed URL, and subscribe URL
3. WHEN a URL is invalid, THE Livestream_System SHALL display "Please enter a valid URL" message
4. THE Livestream_System SHALL validate platform name is not empty
5. THE Livestream_System SHALL validate embed URL is not empty
6. WHEN a Stream_Schedule form is submitted with missing fields, THE Livestream_System SHALL display field-specific error messages
7. THE Livestream_System SHALL validate start time is in the future for one-time schedules
8. THE Livestream_System SHALL use React Hook Form with Zod for all form validation
9. THE Livestream_System SHALL display validation errors inline below form fields
10. THE Livestream_System SHALL prevent form submission when validation errors exist

### Requirement 19: Loading States and Skeletons

**User Story:** As a Member, I want to see loading indicators while content loads, so that I know the system is working.

#### Acceptance Criteria

1. THE Livestream_System SHALL display skeleton loaders while fetching Stream_Schedules
2. THE Livestream_System SHALL display skeleton loaders while fetching Stream_Archives
3. THE Livestream_System SHALL display skeleton loaders while fetching Platform_Configs
4. THE Livestream_System SHALL display skeleton loaders while fetching Prayer_Requests
5. THE Livestream_System SHALL use shadcn Skeleton component for all loading states
6. THE Livestream_System SHALL never display blank white space during loading
7. THE Livestream_System SHALL display loading spinners on form submission buttons
8. THE Livestream_System SHALL disable form submission buttons during loading
9. THE Livestream_System SHALL display loading states for YouTube API sync operations
10. THE Livestream_System SHALL maintain layout stability during loading transitions

### Requirement 20: Empty States

**User Story:** As an Admin, I want helpful empty states when no content exists, so that I know what actions to take.

#### Acceptance Criteria

1. WHEN no Platform_Configs exist, THE Livestream_System SHALL display an empty state with a Video icon and "Add your first streaming platform" message
2. WHEN no Stream_Schedules exist, THE Livestream_System SHALL display an empty state with a Calendar icon and "Schedule your first stream" message
3. WHEN no Stream_Archives exist, THE Livestream_System SHALL display an empty state with a Film icon and "No past streams yet" message
4. WHEN no Prayer_Requests exist, THE Livestream_System SHALL display an empty state with a Heart icon and "No prayer requests yet" message
5. THE Livestream_System SHALL include a call-to-action button in each empty state
6. THE empty states SHALL use icons from Lucide React
7. THE empty states SHALL follow VestryHub design system styling
8. THE empty states SHALL be centered vertically and horizontally
9. THE empty states SHALL include descriptive text explaining the feature
10. THE empty states SHALL be responsive on mobile devices

### Requirement 21: Success and Error Notifications

**User Story:** As an Admin, I want clear feedback when actions succeed or fail, so that I know the result of my actions.

#### Acceptance Criteria

1. WHEN a Platform_Config is created successfully, THE Livestream_System SHALL display a success toast notification
2. WHEN a Platform_Config creation fails, THE Livestream_System SHALL display an error toast notification with the error message
3. WHEN a Stream_Schedule is created successfully, THE Livestream_System SHALL display a success toast notification
4. WHEN a Prayer_Request is submitted successfully, THE Livestream_System SHALL display a success toast notification
5. WHEN a Reminder is set successfully, THE Livestream_System SHALL display a success toast notification
6. WHEN YouTube API sync completes successfully, THE Livestream_System SHALL display a success toast with the count of synced videos
7. WHEN YouTube API sync fails, THE Livestream_System SHALL display an error toast with a user-friendly message
8. THE Livestream_System SHALL use Sonner toast library for all notifications
9. THE Livestream_System SHALL display success toasts with green checkmark icons
10. THE Livestream_System SHALL display error toasts with red X icons

### Requirement 22: Performance Optimization

**User Story:** As a Member, I want the livestreaming feature to load quickly, so that I can access content without delays.

#### Acceptance Criteria

1. THE Livestream_System SHALL set `staleTime: 300000` (5 minutes) on all TanStack Query hooks
2. THE Livestream_System SHALL lazy load the livestreaming page component
3. THE Livestream_System SHALL lazy load the Recharts library if used for analytics
4. THE Livestream_System SHALL add database indexes on tenant_id for all livestreaming tables
5. THE Livestream_System SHALL set `refetchOnWindowFocus: false` on all queries
6. THE Livestream_System SHALL use TanStack Query for all data fetching (never useEffect + useState)
7. THE Livestream_System SHALL invalidate query cache on successful mutations
8. THE Livestream_System SHALL batch multiple stat queries into a single RPC function if more than 4 stats exist
9. THE Livestream_System SHALL optimize iframe loading with lazy loading attributes
10. THE Livestream_System SHALL minimize Realtime_Channel subscriptions to only necessary channels

### Requirement 23: Accessibility Compliance

**User Story:** As a Member with disabilities, I want the livestreaming feature to be accessible, so that I can use it with assistive technologies.

#### Acceptance Criteria

1. THE Livestream_System SHALL provide alt text for all images and icons
2. THE Livestream_System SHALL use semantic HTML elements (header, main, section, article)
3. THE Livestream_System SHALL provide ARIA labels for icon-only buttons
4. THE Livestream_System SHALL maintain keyboard navigation for all interactive elements
5. THE Livestream_System SHALL provide focus indicators for all focusable elements
6. THE Livestream_System SHALL use sufficient color contrast ratios (WCAG AA minimum)
7. THE Livestream_System SHALL provide text alternatives for video content
8. THE Livestream_System SHALL use proper heading hierarchy (h1, h2, h3)
9. THE Livestream_System SHALL announce dynamic content changes to screen readers
10. THE Livestream_System SHALL support keyboard shortcuts for common actions

### Database Schema Requirements

**User Story:** As a System Administrator, I want a well-structured database schema, so that livestreaming data is organized and performant.

#### Acceptance Criteria

1. THE Livestream_System SHALL create a `livestream_configs` table with columns: id, tenant_id, name, platform_type, platform_url, embed_url, subscribe_url, subscribe_label, created_at, updated_at
2. THE Livestream_System SHALL create a `livestream_schedules` table with columns: id, tenant_id, title, description, start_time, recurrence_pattern, recurrence_day, is_recurring, created_at, updated_at
3. THE Livestream_System SHALL create a `livestream_history` table with columns: id, tenant_id, title, stream_date, thumbnail_url, embed_url, youtube_video_id, created_at, updated_at
4. THE Livestream_System SHALL create a `livestream_prayer_requests` table with columns: id, tenant_id, member_id, prayer_text, is_anonymous, is_prayed_for, prayed_at, created_at
5. THE Livestream_System SHALL create a `livestream_reminders` table with columns: id, tenant_id, member_id, schedule_id, created_at
6. THE Livestream_System SHALL add indexes on tenant_id for all tables
7. THE Livestream_System SHALL add indexes on created_at for tables with chronological queries
8. THE Livestream_System SHALL enable Row Level Security on all tables
9. THE Livestream_System SHALL create RLS policies using the EXACT same pattern as existing tables (e.g., members, sermons, testimonies): `tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1)` for admin access and `tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1)` for member access
10. THE Livestream_System SHALL use VARCHAR for all ID columns following VestryHub conventions
11. THE Livestream_System SHALL use separate SELECT/INSERT/UPDATE/DELETE policies following existing patterns (not combined FOR ALL policies)
12. THE Livestream_System SHALL allow members to insert their own prayer requests using `member_id = auth.uid()::text` pattern
13. THE Livestream_System SHALL allow members to manage only their own reminders using `member_id = auth.uid()::text` pattern

### Requirement 25: Role-Based Access Control

**User Story:** As a System Administrator, I want proper access control for livestreaming features, so that only authorized users can perform administrative actions.

#### Acceptance Criteria

1. THE Livestream_System SHALL allow only Admins to create Platform_Configs
2. THE Livestream_System SHALL allow only Admins to edit Platform_Configs
3. THE Livestream_System SHALL allow only Admins to delete Platform_Configs
4. THE Livestream_System SHALL allow only Admins to create Stream_Schedules
5. THE Livestream_System SHALL allow only Admins to toggle Live_Sessions
6. THE Livestream_System SHALL allow only Admins to view the prayer management wall
7. THE Livestream_System SHALL allow only Admins to mark Prayer_Requests as prayed for
8. THE Livestream_System SHALL allow only Admins to manage Stream_Archives
9. THE Livestream_System SHALL allow only Admins to trigger YouTube API sync
10. THE Livestream_System SHALL allow all Members to view streams, submit prayers, set reminders, and browse archives
11. THE Livestream_System SHALL check user roles using the existing VestryHub authentication system
12. THE Livestream_System SHALL display admin-only UI elements only to Admins

---

## Notes

### Parser and Serializer Requirements

This feature does not include custom parsers or serializers. All data serialization is handled by Supabase's built-in JSON serialization and standard HTTP request/response handling.

### YouTube API Integration Details

The YouTube Data API v3 integration requires:
- API key stored securely (not exposed to frontend)
- Channel ID configuration per tenant
- Graceful fallback when API is unavailable
- Rate limit handling (quota: 10,000 units/day)
- Error handling for invalid channel IDs

### Realtime Architecture

The Realtime system uses Supabase Realtime with two primary channels:
1. `livestream_status:{tenant_id}` - Broadcasts Live_Session status changes
2. `prayer_requests:{tenant_id}` - Broadcasts new Prayer_Request submissions

### Multi-Platform Streaming Architecture

The system does not handle actual video encoding or RTMP streaming. It manages the configuration and display of streams that are broadcast through external platforms (YouTube Live, Facebook Live, etc.). Admins must configure their streaming software (OBS, vMix, etc.) to broadcast to their platforms independently.

### Recurrence Pattern Implementation

Recurring schedules calculate the next occurrence based on:
- Daily: Next day at specified time
- Weekly: Next occurrence of specified day of week
- Monthly: Next occurrence of specified day of month

The system does not create individual schedule entries for each occurrence; it calculates the next occurrence dynamically.

### Analytics Calculation

Analytics are calculated as follows:
- Total views: Sum of view counts from all Platform_Configs (if available via API)
- Prayer requests: Count of all Prayer_Requests for the tenant
- Reminders: Count of all active Reminders for the tenant
- Average attendance: Total views divided by count of completed Live_Sessions

### RLS Policy Patterns (CRITICAL)

**MUST use the EXACT same RLS policy pattern as existing tables:**

Admin-only tables (configs, schedules, history):
```sql
CREATE POLICY "table_select" ON table_name FOR SELECT TO authenticated 
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "table_insert" ON table_name FOR INSERT TO authenticated 
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "table_update" ON table_name FOR UPDATE TO authenticated 
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "table_delete" ON table_name FOR DELETE TO authenticated 
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
```

Member-accessible tables (schedules, history - read only):
```sql
CREATE POLICY "table_select" ON table_name FOR SELECT TO authenticated 
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1) 
      OR tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1));
```

Member-owned tables (prayer_requests, reminders):
```sql
CREATE POLICY "table_member_select" ON table_name FOR SELECT TO authenticated 
  USING (member_id = auth.uid()::text OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "table_member_insert" ON table_name FOR INSERT TO authenticated 
  WITH CHECK (member_id = auth.uid()::text);
CREATE POLICY "table_member_delete" ON table_name FOR DELETE TO authenticated 
  USING (member_id = auth.uid()::text);
```

**DO NOT invent new RLS patterns. Study existing migrations and use the exact same pattern.**

### Member ID Pattern (CRITICAL)

**In member pages, ALWAYS use `useMemberPortal()` hook to get member information:**

```typescript
import { useMemberPortal } from '@/contexts/MemberPortalContext';

const member = useMemberPortal();
// member.memberId - the authenticated member's ID
// member.churchId - the tenant_id
// member.tenantId - also the tenant_id (alias)
```

**DO NOT use `useAuth()` or other patterns. Study `src/pages/member/*` for the correct pattern.**

### Design System Compliance

All components must follow VestryHub design system:
- Primary color: Violet (#7C3AED)
- Platform-specific accent colors for streaming platforms
- Plus Jakarta Sans font
- Framer Motion animations
- shadcn/ui components
- Dark mode support
- Mobile responsive design

### Protected Files and Modification Scope

**CRITICAL CONSTRAINT:** This feature must NOT globally change the UI of the project. Only modify files specific to the livestreaming feature.

**ALLOWED FILE MODIFICATIONS:**
- `src/pages/Livestreaming.tsx` (admin page)
- `src/pages/member/Livestreaming.tsx` (create new - member page)
- `src/components/livestreaming/*` (create new - all livestreaming components)
- `src/utils/streamPlatform.ts` (create new - platform detection utility)
- `src/pages/settings/Settings.tsx` (add Livestreaming section ONLY)
- `src/components/layout/AppLayout.tsx` (add LIVE dot to existing nav item ONLY - minimal change)

**STRICTLY PROHIBITED - DO NOT MODIFY:**
- src/index.css
- tailwind.config.ts
- All shadcn/ui component files (src/components/ui/*)
- Any other existing pages or components
- Any global styles or theme files
- Any other layout files

**Implementation Rules:**
1. Create ALL livestreaming-specific components in `src/components/livestreaming/`
2. Do NOT create components in `src/components/shared/` for this feature
3. Keep all livestreaming logic isolated to the allowed files above
4. For Settings.tsx: ONLY add a new section, do not modify existing sections
5. For AppLayout.tsx: ONLY add the live indicator dot to the existing "Livestreaming" nav item, do not modify any other navigation items or layout structure
