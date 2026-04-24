# Tasks — Announcements Module Enhancement

## Task 1: Database Migration

- [x] 1.1 Create migration file `supabase/migrations/<timestamp>_announcements_enhancement.sql`
  - Create `announcement_types` table with all columns, indexes, and RLS policies
  - Create `announcement_attachments` table with all columns, indexes, and RLS policies
  - Create `announcement_reactions` table with unique constraint on `(announcement_id, member_id, emoji)`, indexes, and RLS policies
  - Create `announcement_comments` table with self-referencing `parent_id`, indexes, and RLS policies
  - Create `announcement_read_receipts` table with unique constraint on `(announcement_id, member_id)`, indexes, and RLS policies
  - `ALTER TABLE announcements` to add: `category_id`, `audience`, `group_id`, `is_pinned`, `scheduled_at`, `expires_at`, `comments_enabled`, `reactions_enabled`, `rich_body`, `view_count`
  - Drop and recreate `announcements_status_check` constraint to include `'scheduled'` and `'archived'`
  - Apply the four-policy RLS pattern (select/insert/update/delete) to all five new tables
  - **Run the migration** via `supabase db push` or the Supabase CLI

- [x] 1.2 Create Supabase Storage bucket `announcements-media`
  - Public read for images; private for videos and PDFs
  - 50 MB max file size policy

- [x] 1.3 Create RPC function `increment_announcement_type_usage(p_type_id VARCHAR)`
  - `UPDATE announcement_types SET usage_count = usage_count + 1 WHERE id = p_type_id`

- [x] 1.4 Create Edge Function `fetch-og-metadata`
  - Accepts `{ url: string }` in request body
  - Fetches the URL server-side, parses `<meta og:*>` tags
  - Returns `{ title, description, imageUrl }` or `null` on failure

---

## Task 2: Schema Constants and TypeScript Types

- [x] 2.1 Update `src/lib/schema.ts`
  - Add to `TABLES`: `ANNOUNCEMENT_TYPES`, `ANNOUNCEMENT_ATTACHMENTS`, `ANNOUNCEMENT_REACTIONS`, `ANNOUNCEMENT_COMMENTS`, `ANNOUNCEMENT_READ_RECEIPTS`

- [x] 2.2 Create `src/types/announcements.ts`
  - Export interfaces: `AnnouncementType`, `Announcement` (extended), `AnnouncementAttachment`, `AnnouncementReaction`, `AnnouncementComment`, `ReadReceipt`
  - Export union types: `AnnouncementAudience`, `AnnouncementStatus`, `AnnouncementAttachmentType`, `ReactionEmoji`

---

## Task 3: Reusable UI Components

- [x] 3.1 Create `src/components/ui/info-card.tsx`
  - Props: `children`, `className?`, `accentColor?` (hex string)
  - Renders standard card shell with optional 4px left border in `accentColor`
  - Supports dark mode via `dark:` Tailwind variants

- [x] 3.2 Create `src/components/ui/reaction-chip.tsx`
  - Props: `emoji`, `count`, `isActive`, `onClick`
  - Active state: `border-orange-400 bg-orange-50 text-orange-600`
  - Inactive state: `border-slate-200 bg-white text-slate-600 hover:border-slate-300`
  - Uses `motion.button` with `whileTap={{ scale: 0.95 }}`
  - Hides count number when `count === 0`

- [x] 3.3 Create `src/components/ui/reddit-nested-thread-reply.tsx` (`CommentThread`)
  - Props: `comments` (nested `CommentNode[]`), `currentMemberId`, `onAddComment`
  - Renders top-level comments at base indentation; replies indented `pl-6` per level
  - Each comment: `MemberAvatar`, author name, body, relative timestamp, "Reply" button
  - Deleted comments show `[deleted]` placeholder
  - Text input at bottom for new top-level comment

- [x] 3.4 Create `src/components/ui/empty.tsx` (`Empty`)
  - Props: `icon` (Lucide component), `title`, `description?`, `action?`
  - Centered flex column, icon at `h-12 w-12 text-slate-300`
  - Title: `text-base font-semibold text-slate-600 dark:text-slate-300`
  - Description: `text-sm text-slate-400 max-w-sm`

- [x] 3.5 Create `src/components/ui/notifications-1.tsx` (`NotificationBell`)
  - Props: `notifications`, `onMarkAllRead`, `onNotificationClick`
  - Bell icon button with unread badge count (hidden when 0)
  - Dropdown list of notification items with colored left dot from `metadata.categoryColor`
  - "Mark all as read" button at top of dropdown
  - Uses `font-jakarta` on root element

---

## Task 4: Hooks

- [x] 4.1 Create `src/hooks/useReadReceipt.ts`
  - Accepts `announcementId: string` and `cardRef: React.RefObject<HTMLElement>`
  - Uses `IntersectionObserver` with `threshold: 0.5`
  - 2-second dwell timer before upserting to `TABLES.ANNOUNCEMENT_READ_RECEIPTS`
  - Uses `onConflict: "announcement_id,member_id", ignoreDuplicates: true`
  - Skips upsert if `hasRead` state is already true
  - Silent — no toast on success or failure
  - Reads `memberId` and `tenantId` from `useMemberPortal()`

- [x] 4.2 Create `src/hooks/useAnnouncementNotifications.ts`
  - Exports `useAnnouncementNotifications()` returning `{ notify }`
  - `notify(announcementId, announcement, categoryColor, categoryLabel)` fans out notification records
  - Fetches target member IDs based on `audience` (`all` / `specific_group` / `leaders_only`)
  - Strips HTML tags from `rich_body` / `body`, truncates to 120 characters for notification `body`
  - Inserts all records into `TABLES.NOTIFICATIONS` in a single batch insert
  - On failure: `console.error` only — no user-facing toast

---

## Task 5: Announcement Types Settings Page

- [x] 5.1 Create `src/pages/settings/AnnouncementTypes.tsx`
  - Lazy-loaded via `React.lazy()`
  - Reads `tenantId` from `useChurch()`
  - `useQuery` with `queryKey: ["announcement-types", tenantId]`, `staleTime: 300_000`
  - On load with zero records: seeds 5 default types (General, Service, Event, Finance, Urgent)
  - Table columns: drag handle, color swatch + label, description, active toggle, edit button
  - Drag-to-reorder using HTML5 drag events; persists updated `order` values on drop
  - Optimistic `is_active` toggle with revert on error
  - "Add Type" button opens `AnnouncementTypeDrawer`
  - Delete: `ConfirmDialog` → permanent delete if `usage_count === 0`; archive (`is_active: false`) if `usage_count > 0`
  - Default types (`is_default: true`): delete disabled; only toggle + edit allowed
  - Wraps content in `<PageTransition>`, uses `font-jakarta`

- [x] 5.2 Create `src/components/announcements/AnnouncementTypeDrawer.tsx`
  - shadcn `Sheet` opening from the right
  - React Hook Form + Zod schema: `label` (required), `description`, `color` (hex regex), `icon` (required), `is_active`
  - Color field: `<input type="color">` with hex text input
  - Icon field: searchable combobox of common Lucide icon names
  - On submit: insert (new) or update (edit) `announcement_types` record
  - `toast.success("Announcement type saved")` on success
  - Invalidates `["announcement-types", tenantId]` on success

---

## Task 6: Post Announcement Drawer

- [x] 6.1 Install TipTap dependencies
  - `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`

- [x] 6.2 Create `src/components/announcements/TipTapEditor.tsx`
  - Extensions: `StarterKit` (Bold, Italic, BulletList, OrderedList, Heading level 2), `Link`, `Placeholder`
  - Exports `TipTapEditor` as default export (for `React.lazy()`)
  - Toolbar: Bold, Italic, BulletList, OrderedList, H2, Link buttons
  - Applies `prose prose-sm max-w-none` to editor content area

- [x] 6.3 Create `src/components/announcements/AttachmentDropzone.tsx`
  - Props: `tenantId`, `announcementId`, `attachments`, `onChange`
  - Accepts drag-and-drop and click-to-browse for images, videos, PDFs, generic files
  - URL input for link attachments; on entry calls `fetch-og-metadata` Edge Function
  - Image preview: inline `<img>` thumbnail at 80×80px via `URL.createObjectURL`
  - Video preview: filename chip with `<Video>` icon
  - PDF preview: filename chip with `<FileText>` icon
  - Link preview: OG card (title, description, image) or plain link chip on OG failure
  - Enforces 50 MB max per file; `toast.error("File exceeds 50 MB limit")` if exceeded
  - Upload path: `announcements/{tenantId}/{announcementId}/{filename}`

- [x] 6.4 Create `src/components/announcements/PostAnnouncementDrawer.tsx`
  - shadcn `Sheet` opening from the right
  - Props: `open`, `onClose`, `tenantId`, `userId`, `editData?`
  - React Hook Form + Zod schema matching `announcementSchema` from design doc
  - `TipTapEditor` loaded via `React.lazy()` wrapped in `<Suspense fallback={<Skeleton className="h-48 w-full" />}>`
  - Category dropdown: active `AnnouncementType` records with colored dot + label
  - Audience selector: three radio-style buttons; group picker appears when "Specific Group" selected
  - Toggle switches: Pin, Enable Comments, Enable Reactions
  - Schedule toggle: "Post Now" button when off; date-time picker + "Schedule Announcement" when on
  - Optional Expiry date picker
  - On submit: insert announcement → upload attachments → increment type usage → fan-out notifications → invalidate queries → toast
  - On close: reset form and clear attachment previews
  - Inline validation errors via shadcn `FormMessage`

---

## Task 7: Admin Announcement Feed

- [x] 7.1 Create `src/components/announcements/AnnouncementReadReceiptsModal.tsx`
  - Props: `open`, `onClose`, `announcementId`, `tenantId`, `totalAudienceCount`
  - `useQuery` with `queryKey: ["read-receipts", announcementId]`, `staleTime: 60_000`, `enabled: open`
  - "Seen by X of Y members" header
  - Shows all avatars if < 5 readers; first 5 + "+N more" chip if ≥ 5
  - Each avatar: member name + `format(read_at, "dd MMM, h:mm a")`

- [x] 7.2 Create `src/components/announcements/AnnouncementCardAdmin.tsx`
  - Props per design doc interface
  - 4px left border in type color via inline `style`
  - Pinned: `bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800`
  - Urgent type: pulsing red dot `animate-pulse bg-red-500 rounded-full h-2 w-2`
  - Category badge: `bg-[color]/10 text-[color]` arbitrary Tailwind values
  - Audience badge, body `line-clamp-3`, author `MemberAvatar` + name + `formatDistanceToNow`
  - Attachment thumbnails: max 3 at 80×80px; "+N more" chip if > 3
  - ⋮ dropdown: Edit, Pin/Unpin, Duplicate, Archive, View Read Receipts, Delete (with `ConfirmDialog`)
  - Hover: `shadow-md transition-all duration-200 ease-out`

- [x] 7.3 Create `src/components/announcements/AnnouncementFeedAdmin.tsx`
  - Props: `tenantId`, `announcementTypes`, `onPostNew`
  - `useQuery` with `queryKey: ["announcements", tenantId]`, `staleTime: 300_000`
  - Selects `*, announcement_types(label, color, icon), announcement_attachments(*)`
  - Filters `neq("status", "archived")`, orders by `is_pinned` desc then `created_at` desc
  - Dynamic category filter tabs with Framer Motion `layoutId="announcementActiveTab"` sliding underline
  - Stagger animation: `staggerChildren: 0.05`, items `{ opacity: 0, y: 10 }` → `{ opacity: 1, y: 0 }`
  - Loading: 3 card skeletons
  - Empty: `Empty` component with `Megaphone` icon and "Post Announcement" CTA
  - Mutation handlers: edit (open drawer), duplicate, archive, delete, toggle pin, view receipts

- [x] 7.4 Refactor `src/pages/Announcements.tsx`
  - Replace inline form with `PostAnnouncementDrawer`
  - Replace existing card list with `AnnouncementFeedAdmin`
  - Wire up all drawer open/close state and mutation callbacks
  - Wrap page in `<PageTransition>`, use `font-jakarta`

---

## Task 8: Member Announcement Feed

- [x] 8.1 Create `src/components/announcements/AnnouncementCardMember.tsx`
  - Props per design doc interface
  - 4px left border in type color, type label badge, title, rich body / plain body fallback
  - Rich body: `<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} className="prose prose-sm max-w-none" />` (sanitize with DOMPurify)
  - "Read more / Read less" toggle with Framer Motion `AnimatePresence` height animation
  - `ReactionChip` row for 🔥 ❤️ 🙏 🎉 when `reactions_enabled`; optimistic count update on click
  - "Comments (N)" toggle button; expands `CommentThread` when `comments_enabled`
  - Card root element has `ref` passed to `useReadReceipt`
  - Attachment rendering: inline images, `<video controls>` for video, download chip for PDF, OG card or link chip for links

- [x] 8.2 Refactor `src/pages/member/MemberAnnouncements.tsx`
  - Three `useQuery` hooks: member group IDs, announcements with all relations, active announcement types
  - All queries use `staleTime: 300_000`
  - Audience filtering logic (all / specific_group / leaders_only) and expiry filtering
  - Dynamic category filter pills (rounded-full, active pill uses type color, "All" uses `bg-orange-500`)
  - Container: `max-w-[680px] mx-auto`
  - Loading: skeleton cards
  - Empty: `Empty` component with megaphone icon and "No announcements for you right now"
  - Reaction toggle mutation: insert or delete from `TABLES.ANNOUNCEMENT_REACTIONS`
  - Comment add mutation: insert into `TABLES.ANNOUNCEMENT_COMMENTS`
  - Wraps content in `<PageTransition>`, uses `font-jakarta`

---

## Task 9: Notification Bell Integration

- [x] 9.1 Create `src/hooks/useNotificationBell.ts`
  - `useQuery` with `queryKey: ["member-notifications", member.memberId]`, `staleTime: 60_000`
  - Fetches from `TABLES.NOTIFICATIONS` filtered by `tenant_id` and `user_id`, ordered by `created_at` desc, limit 20
  - Returns `{ notifications, unreadCount, markAllRead, markOneRead }`
  - `markAllRead` mutation: bulk update `is_read: true` for all unread records
  - `markOneRead` mutation: update single record `is_read: true`

- [x] 9.2 Add `NotificationBell` to the member portal header component
  - Import `NotificationBell` from `src/components/ui/notifications-1.tsx`
  - Wire up `useNotificationBell` hook
  - On notification click: navigate to `/member/announcements`, call `markOneRead`, highlight target card with `ring-2 ring-orange-400 ring-offset-2` animation

---

## Task 10: Routing and Navigation

- [x] 10.1 Add lazy route for `AnnouncementTypesSettingsPage` in `src/App.tsx`
  - `const AnnouncementTypesSettingsPage = lazy(() => import("./pages/settings/AnnouncementTypes"))`
  - Add `<Route path="announcement-types" element={<Suspense fallback={<Fallback />}><AnnouncementTypesSettingsPage /></Suspense>} />` under settings routes

- [x] 10.2 Update `src/components/settings/SettingsLayout.tsx`
  - Add `{ label: "Announcement Types", icon: Megaphone, path: "/settings/announcement-types" }` to the **Features** group

---

## Task 11: Install DOMPurify

- [x] 11.1 Add `dompurify` and `@types/dompurify` as dependencies
  - Use exact versions
  - Import and use in `AnnouncementCardMember` to sanitize `rich_body` HTML before rendering

---

## Task 12: Verification

- [x] 12.1 Run `npm run build` (or `vite build`) — confirm zero TypeScript errors and no build failures
- [x] 12.2 Smoke-test routes: `/settings/announcement-types`, `/announcements`, `/member/announcements`
- [x] 12.3 Confirm all 5 new `TABLES` constants are present in `src/lib/schema.ts`
- [x] 12.4 Confirm `src/types/announcements.ts` exports all 6 required interfaces
- [x] 12.5 Confirm `PostAnnouncementDrawer` opens, TipTap editor lazy-loads (Suspense fallback visible briefly), and drawer closes cleanly
- [x] 12.6 Confirm default type seeding: navigate to `/settings/announcement-types` on a fresh tenant and verify 5 rows appear
