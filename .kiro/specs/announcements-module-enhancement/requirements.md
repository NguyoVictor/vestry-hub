# Requirements Document

## Introduction

The Announcements Module Enhancement transforms Vestry Hub's existing basic announcements feature into a premium, full-featured communications hub. The current implementation uses a plain textarea for content, hardcoded category strings, and has no engagement features. This enhancement introduces dynamic announcement types (configurable per church), a rich-text TipTap editor, file/media attachments, emoji reactions, nested comment threads, read receipts, scheduled publishing, audience targeting, and a redesigned feed for both admins and members — all consistent with Vestry Hub's design system and technical conventions.

---

## Glossary

- **Announcement_Type**: A configurable category record (e.g. "General", "Urgent") stored in the `announcement_types` table, owned per tenant, with a color, icon, and active/default status.
- **Announcement**: A rich-content post stored in the `announcements` table, extended with category, audience, attachments, reactions, comments, and scheduling fields.
- **Attachment**: A file or link associated with an announcement — image, video, PDF, generic file, or URL with Open Graph preview.
- **Reaction**: An emoji response (🔥 ❤️ 🙏 🎉) a member adds to an announcement, stored in `announcement_reactions`.
- **Comment**: A text reply to an announcement, optionally nested under a parent comment, stored in `announcement_comments`.
- **Read_Receipt**: A record that a specific member has viewed an announcement, stored in `announcement_read_receipts`.
- **Notification**: An in-app alert record in the existing `notifications` table, created for each target audience member when an announcement is posted.
- **Admin_Feed**: The announcements list at `/announcements` visible to church admins and staff.
- **Member_Feed**: The announcements list at `/member/announcements` visible to authenticated church members.
- **TipTap_Editor**: The lazy-loaded rich-text editor component built on `@tiptap/react` with Bold, Italic, BulletList, OrderedList, Link, and H2 extensions.
- **Post_Announcement_Drawer**: The side drawer (shadcn `Sheet`) used by admins to create or edit announcements.
- **Announcement_Types_Settings**: The settings page at `/settings/announcement-types` for managing `Announcement_Type` records.
- **InfoCard**: A reusable premium card shell component at `src/components/ui/info-card.tsx`.
- **NotificationBell**: The notification bell dropdown component at `src/components/ui/notifications-1.tsx` shown in the member portal header.
- **ReactionChip**: The emoji reaction chip component at `src/components/ui/reaction-chip.tsx`.
- **CommentThread**: The nested comment thread component at `src/components/ui/reddit-nested-thread-reply.tsx`.
- **Empty**: The empty state component at `src/components/ui/empty.tsx`.
- **IntersectionObserver**: The browser API used to auto-mark announcements as read when they scroll into the member's viewport.
- **OG_Preview**: An Open Graph metadata preview card rendered for link-type attachments, styled like Slack link previews.
- **Tenant_ID**: The `tenant_id` column used on every table to scope data to a single church, sourced from `useChurch()` or `useMemberPortal()`.

---

## Requirements

### Requirement 1: Announcement Types Management

**User Story:** As a church admin, I want to define and manage custom announcement categories (types) with colors and icons, so that announcements are visually organized and meaningful to my congregation.

#### Acceptance Criteria

1. THE `Announcement_Types_Settings` page SHALL be accessible at the route `/settings/announcement-types` and listed under the **Features** group in the Settings sidebar, labelled "Announcement Types".
2. WHEN the `Announcement_Types_Settings` page loads for a tenant with no existing types, THE System SHALL seed the following five default types for that tenant: General (color `#6366f1`, icon `megaphone`), Service (color `#f59e0b`, icon `church`), Event (color `#10b981`, icon `calendar`), Finance (color `#3b82f6`, icon `banknote`), Urgent (color `#ef4444`, icon `alert-triangle`), each with `is_default: true` and `is_active: true`.
3. THE `Announcement_Types_Settings` page SHALL display all announcement types for the current tenant in a table with columns: drag handle, color swatch + label, description, active toggle, and an edit button — mirroring the structure of the existing `ServiceRequestTypes` settings page.
4. WHEN an admin drags a row to a new position, THE System SHALL persist the updated `order` values for all affected rows to the `announcement_types` table.
5. WHEN an admin toggles the active switch on a type row, THE System SHALL immediately update `is_active` on that record and reflect the change optimistically in the UI.
6. WHEN an admin clicks "Add Type", THE System SHALL open an edit drawer with fields: Label (required), Description, Color (hex color picker), Icon (lucide icon name selector), and Active toggle.
7. WHEN an admin submits the add form with a valid label, THE System SHALL insert a new `announcement_types` record with `is_default: false`, `usage_count: 0`, and the next available `order` value, then invalidate the `["announcement-types", tenantId]` query key.
8. WHEN an admin edits an existing type and submits, THE System SHALL update the record's label, description, color, icon, and is_active fields, then show `toast.success("Announcement type updated")`.
9. WHEN an admin attempts to delete a type with `usage_count === 0`, THE System SHALL permanently delete the record after a confirmation dialog.
10. WHEN an admin attempts to delete a type with `usage_count > 0`, THE System SHALL archive the type by setting `is_active: false` instead of deleting, and show an informational toast explaining the archival.
11. IF a type has `is_default: true`, THEN THE System SHALL disable the delete action and show only the active toggle and edit (label/description/color/icon only) options for that type.
12. THE `Announcement_Types_Settings` page SHALL use `staleTime: 300_000` on its `useQuery` hook and filter all queries by `tenant_id` from `useChurch()`.

---

### Requirement 2: Extended Announcement Data Model

**User Story:** As a developer, I want the announcements data model to support rich content, audience targeting, scheduling, attachments, reactions, comments, and read receipts, so that all enhanced features have a reliable data foundation.

#### Acceptance Criteria

1. THE System SHALL maintain an `announcement_types` table with columns: `id` (varchar PK), `tenant_id` (varchar FK), `label` (text), `description` (text nullable), `color` (varchar, hex), `icon` (varchar, lucide name), `is_default` (boolean), `is_active` (boolean), `order` (integer), `usage_count` (integer default 0), `created_at`, `updated_at`.
2. THE System SHALL extend the existing `announcements` table with columns: `category_id` (varchar FK → `announcement_types.id`, nullable), `audience` (enum: `all`, `specific_group`, `leaders_only`), `group_id` (varchar nullable FK → `groups.id`), `is_pinned` (boolean default false), `scheduled_at` (timestamptz nullable), `expires_at` (timestamptz nullable), `comments_enabled` (boolean default true), `reactions_enabled` (boolean default true), `rich_body` (text nullable, stores TipTap HTML), `view_count` (integer default 0).
3. THE System SHALL maintain an `announcement_attachments` table with columns: `id`, `tenant_id`, `announcement_id` (FK), `type` (enum: `image`, `video`, `pdf`, `file`, `link`), `url` (text), `filename` (text nullable), `size_bytes` (bigint nullable), `mime_type` (varchar nullable), `og_title` (text nullable), `og_description` (text nullable), `og_image_url` (text nullable), `display_order` (integer), `created_at`.
4. THE System SHALL maintain an `announcement_reactions` table with columns: `id`, `tenant_id`, `announcement_id` (FK), `member_id` (FK → `members.id`), `emoji` (varchar, one of: `🔥`, `❤️`, `🙏`, `🎉`), `created_at`, with a unique constraint on `(announcement_id, member_id, emoji)`.
5. THE System SHALL maintain an `announcement_comments` table with columns: `id`, `tenant_id`, `announcement_id` (FK), `member_id` (FK), `parent_id` (varchar nullable FK → `announcement_comments.id`), `body` (text), `is_deleted` (boolean default false), `created_at`, `updated_at`.
6. THE System SHALL maintain an `announcement_read_receipts` table with columns: `id`, `tenant_id`, `announcement_id` (FK), `member_id` (FK), `read_at` (timestamptz), with a unique constraint on `(announcement_id, member_id)`.
7. THE System SHALL add a Supabase migration file that creates the `announcement_types` table, `announcement_attachments` table, `announcement_reactions` table, `announcement_comments` table, and `announcement_read_receipts` table, and adds the new columns to `announcements`.
8. THE System SHALL add indexes on `tenant_id` for every new table, and composite indexes on `(announcement_id, member_id)` for reactions and read receipts.
9. THE System SHALL add RLS policies on all new tables: select/insert/update/delete restricted to authenticated users whose `tenant_id` matches the row's `tenant_id`.
10. THE `src/lib/schema.ts` TABLES constant SHALL be extended with: `ANNOUNCEMENT_TYPES`, `ANNOUNCEMENT_ATTACHMENTS`, `ANNOUNCEMENT_REACTIONS`, `ANNOUNCEMENT_COMMENTS`, `ANNOUNCEMENT_READ_RECEIPTS`.
11. THE `src/types/announcements.ts` file SHALL export TypeScript interfaces: `AnnouncementType`, `Announcement` (extended), `AnnouncementAttachment`, `AnnouncementReaction`, `AnnouncementComment`, `ReadReceipt`.

---

### Requirement 3: Post Announcement Drawer (Admin)

**User Story:** As a church admin, I want a premium side drawer with a rich-text editor, attachment dropzone, and scheduling options to compose and publish announcements, so that I can create engaging, well-formatted posts efficiently.

#### Acceptance Criteria

1. THE `Post_Announcement_Drawer` SHALL be implemented as a `Sheet` (shadcn) component that opens from the right side, replacing the existing inline form in `Announcements.tsx`.
2. THE `Post_Announcement_Drawer` SHALL contain a `TipTap_Editor` loaded via `React.lazy()` with extensions: StarterKit (Bold, Italic, BulletList, OrderedList, Heading level 2), Link, and Placeholder ("Write your announcement…").
3. THE `Post_Announcement_Drawer` SHALL include a Category dropdown that lists all active `Announcement_Type` records for the tenant, rendering each option with a colored dot (using the type's `color` field) and the type label.
4. THE `Post_Announcement_Drawer` SHALL include an Audience selector with three options: "All Members" (`all`), "Specific Group" (`specific_group`), "Leaders Only" (`leaders_only`). WHEN "Specific Group" is selected, THE Drawer SHALL show a group picker populated from the `groups` table filtered by `tenant_id`.
5. THE `Post_Announcement_Drawer` SHALL include an `AttachmentDropzone` component that accepts drag-and-drop and click-to-browse for images (jpg, png, gif, webp), videos (mp4, mov), PDFs, and generic files, plus a URL input for link attachments.
6. WHEN an image attachment is added, THE `AttachmentDropzone` SHALL display an inline thumbnail preview.
7. WHEN a video attachment is added, THE `AttachmentDropzone` SHALL display a video filename chip with a play icon.
8. WHEN a PDF attachment is added, THE `AttachmentDropzone` SHALL display a PDF filename chip with a file icon.
9. WHEN a link URL is entered, THE `AttachmentDropzone` SHALL attempt to fetch Open Graph metadata via a Supabase Edge Function and display a preview card with OG title, description, and image if available.
10. THE `Post_Announcement_Drawer` SHALL include toggle switches for: Pin announcement, Enable comments, Enable reactions.
11. THE `Post_Announcement_Drawer` SHALL include a Schedule toggle. WHEN Schedule is off, THE Drawer SHALL show a "Post Now" primary button. WHEN Schedule is on, THE Drawer SHALL show a date-time picker for `scheduled_at` and a "Schedule Announcement" primary button.
12. THE `Post_Announcement_Drawer` SHALL include an optional Expiry date picker for `expires_at`.
13. WHEN the admin submits the form with a valid title and body, THE System SHALL insert a record into `announcements` with all provided fields, insert records into `announcement_attachments` for each attachment, increment `usage_count` on the selected `announcement_type`, and call `toast.success("Announcement posted")`.
14. WHEN the admin submits with `scheduled_at` set, THE System SHALL set the announcement's `status` to `scheduled` and `scheduled_at` to the chosen datetime, and call `toast.success("Announcement scheduled")`.
15. IF the title or body is empty when the admin submits, THEN THE Drawer SHALL display inline validation errors and prevent submission.
16. THE `Post_Announcement_Drawer` SHALL use React Hook Form with Zod validation for all form fields.
17. WHEN the drawer closes, THE System SHALL reset the form to its empty state and clear all attachment previews.

---

### Requirement 4: Admin Announcement Feed Redesign

**User Story:** As a church admin, I want a premium announcement feed with dynamic category filters, animated cards, and rich management actions, so that I can efficiently oversee and manage all church announcements.

#### Acceptance Criteria

1. THE `AnnouncementFeedAdmin` component SHALL replace the existing card list in `Announcements.tsx` and render a staggered entrance animation using Framer Motion's `staggerChildren: 0.05` pattern.
2. THE `AnnouncementFeedAdmin` SHALL render dynamic category filter tabs sourced from active `Announcement_Type` records for the tenant, plus an "All" tab, using the Framer Motion `layoutId="activeTab"` sliding underline pattern.
3. WHEN a category filter tab is selected, THE Feed SHALL filter displayed announcements to only those with a matching `category_id`, without a full page reload.
4. THE `AnnouncementCardAdmin` component SHALL render each announcement with: a 4px left border in the announcement type's `color`, the type label badge, audience badge, title (font-semibold), body preview (line-clamp-3), author avatar + name + relative timestamp, and a ⋮ dropdown menu.
5. WHEN an announcement has `is_pinned: true`, THE `AnnouncementCardAdmin` SHALL apply an amber tint background (`bg-amber-50 dark:bg-amber-900/10`) and show a pin icon.
6. WHEN an announcement has category type "Urgent", THE `AnnouncementCardAdmin` SHALL display a red pulsing dot badge (`animate-pulse bg-red-500`) next to the category label.
7. THE ⋮ dropdown menu on each `AnnouncementCardAdmin` SHALL contain actions: Edit, Pin/Unpin, Duplicate, Archive, View Read Receipts, Delete.
8. WHEN "Edit" is selected, THE System SHALL open the `Post_Announcement_Drawer` pre-populated with the announcement's existing data.
9. WHEN "Duplicate" is selected, THE System SHALL create a new announcement with the same content, category, and audience, with title prefixed "Copy of …", and call `toast.success("Announcement duplicated")`.
10. WHEN "Archive" is selected, THE System SHALL set the announcement's `status` to `archived` and remove it from the active feed, calling `toast.success("Announcement archived")`.
11. WHEN "Delete" is selected, THE System SHALL show a `ConfirmDialog` and, upon confirmation, permanently delete the announcement and all related attachments, reactions, comments, and read receipts, calling `toast.success("Announcement deleted")`.
12. WHEN "View Read Receipts" is selected, THE System SHALL open the `AnnouncementReadReceiptsModal` showing "Seen by X of Y members" with member avatars and names.
13. THE `AnnouncementFeedAdmin` SHALL show skeleton loaders (3 card skeletons) while the query is loading.
14. WHEN the filtered list is empty, THE `AnnouncementFeedAdmin` SHALL render the `Empty` component with a megaphone icon, "No announcements yet" title, and a "Post Announcement" CTA button.
15. THE `AnnouncementFeedAdmin` SHALL use `useQuery` with `queryKey: ["announcements", tenantId]` and `staleTime: 300_000`.

---

### Requirement 5: Member Announcement Feed Redesign

**User Story:** As a church member, I want a beautiful, engaging announcement feed with reactions, comments, and read-more expansion, so that I can stay informed and interact with my church community.

#### Acceptance Criteria

1. THE `MemberAnnouncements` page SHALL render its content in a centered container with `max-w-[680px] mx-auto`.
2. THE `MemberAnnouncements` page SHALL render dynamic category filter pills sourced from active `Announcement_Type` records for the tenant, plus an "All" pill, styled as rounded-full buttons with the type's color when active.
3. THE `AnnouncementCardMember` component SHALL render each announcement with: a 4px left border in the type's `color`, the type label badge, title, rich body content (rendered from `rich_body` HTML or plain `body` fallback), author name + relative timestamp, reaction chips, and a comments toggle.
4. WHEN an announcement's body exceeds 200 characters, THE `AnnouncementCardMember` SHALL show a "Read more" button that expands the full content using Framer Motion `AnimatePresence` height animation, and a "Read less" button to collapse it.
5. THE `AnnouncementCardMember` SHALL render `ReactionChip` components for each of the four emojis (🔥 ❤️ 🙏 🎉) when `reactions_enabled` is true, showing the aggregated count and highlighting the chip if the current member has reacted with that emoji.
6. WHEN a member clicks a `ReactionChip`, THE System SHALL toggle their reaction: if the member has not reacted with that emoji, insert a record into `announcement_reactions`; if they have, delete the existing record. THE System SHALL optimistically update the count in the UI.
7. WHEN `comments_enabled` is true, THE `AnnouncementCardMember` SHALL show a "Comments (N)" toggle button. WHEN clicked, THE System SHALL expand a `CommentThread` section below the card.
8. THE `CommentThread` section SHALL display existing comments in a nested thread (replies indented under their parent), with a text input to add a new top-level comment or reply.
9. WHEN a member submits a comment, THE System SHALL insert a record into `announcement_comments` with the member's `member_id`, the `announcement_id`, and optionally a `parent_id` for replies, then invalidate the comments query.
10. THE `MemberAnnouncements` page SHALL use an `IntersectionObserver` (via the `useReadReceipt` hook) to automatically upsert a record into `announcement_read_receipts` when an announcement card enters the viewport, with a minimum 2-second dwell time before marking as read.
11. THE `MemberAnnouncements` page SHALL filter visible announcements by audience: `all` → show to all members; `specific_group` → show only if the member belongs to the `group_id`; `leaders_only` → show only if the member's `member_type` is `leader` or `staff`.
12. WHEN the filtered list is empty, THE `MemberAnnouncements` page SHALL render the `Empty` component with a megaphone icon and "No announcements for you right now" message.
13. THE `MemberAnnouncements` page SHALL show skeleton loaders while the query is loading.
14. THE `MemberAnnouncements` page SHALL use `useQuery` with `queryKey: ["member-announcements", member.churchId]` and `staleTime: 300_000`.
15. WHEN an announcement has `expires_at` set and the current datetime is past `expires_at`, THE `MemberAnnouncements` page SHALL not display that announcement.

---

### Requirement 6: Attachment Handling

**User Story:** As a church admin, I want to attach images, videos, PDFs, files, and links to announcements, and as a member I want to view those attachments inline, so that announcements can include rich supporting media.

#### Acceptance Criteria

1. THE `AttachmentDropzone` component SHALL upload image, video, PDF, and file attachments to Supabase Storage under the path `announcements/{tenantId}/{announcementId}/{filename}` and store the resulting public URL in `announcement_attachments`.
2. WHEN an announcement has image attachments, THE `AnnouncementCardMember` and `AnnouncementCardAdmin` SHALL render inline thumbnail previews (max 3 thumbnails at 80×80px). IF there are more than 3 images, THE System SHALL show a "+N more" chip.
3. WHEN an announcement has a video attachment, THE `AnnouncementCardMember` SHALL render an HTML5 `<video>` element with `controls` and `preload="metadata"`.
4. WHEN an announcement has a PDF attachment, THE `AnnouncementCardMember` SHALL render a download chip with a file icon and the filename.
5. WHEN an announcement has a link attachment with OG metadata, THE `AnnouncementCardMember` SHALL render an OG preview card showing the OG image, title, and description in a bordered card, styled like a Slack link preview.
6. WHEN an announcement has a link attachment without OG metadata, THE `AnnouncementCardMember` SHALL render a plain link chip with an external-link icon.
7. THE `AttachmentDropzone` SHALL enforce a maximum file size of 50 MB per file and display an error toast if exceeded.
8. WHEN an attachment upload fails, THE System SHALL call `toast.error("Failed to upload attachment")` and remove the failed item from the preview list.

---

### Requirement 7: Notification System Integration

**User Story:** As a church member, I want to receive in-app notifications when new announcements are posted to my audience, so that I never miss important church communications.

#### Acceptance Criteria

1. WHEN an announcement is posted (status becomes active or scheduled_at is reached), THE `useAnnouncementNotifications` hook SHALL insert notification records into the existing `notifications` table for each member in the target audience.
2. THE notification record SHALL include: `tenant_id`, `user_id` (member's user id), `type: "announcement"`, `title` (announcement title), `body` (first 120 characters of plain-text body), and a `metadata` JSON field containing `{ announcementId, categoryColor, categoryLabel }`.
3. THE `NotificationBell` component SHALL be added to the member portal header and display a badge count of unread notifications.
4. THE `NotificationBell` dropdown SHALL list recent notifications with a colored left dot using the `categoryColor` from the notification metadata.
5. WHEN a member clicks a notification in the `NotificationBell` dropdown, THE System SHALL navigate to `/member/announcements`, mark the notification as read (`is_read: true`), and highlight the corresponding announcement card with a brief ring animation.
6. THE `NotificationBell` component SHALL use `useQuery` with `queryKey: ["member-notifications", member.memberId]` and `staleTime: 60_000` (1 minute, shorter than default for near-real-time feel).
7. WHEN all notifications are read, THE `NotificationBell` SHALL hide the badge count.
8. THE `NotificationBell` SHALL include a "Mark all as read" action that bulk-updates all unread notification records for the member.

---

### Requirement 8: Read Receipts

**User Story:** As a church admin, I want to see which members have read each announcement, so that I can follow up with members who may have missed important communications.

#### Acceptance Criteria

1. THE `useReadReceipt` hook SHALL accept an `announcementId` and a ref to the card DOM element, and use `IntersectionObserver` with a 2-second dwell timer to upsert a record into `announcement_read_receipts` for the current member.
2. WHEN a read receipt is recorded, THE System SHALL NOT show a toast — the operation is silent.
3. IF the member has already read the announcement (a receipt exists), THEN THE `useReadReceipt` hook SHALL skip the upsert to avoid duplicate writes.
4. THE `AnnouncementReadReceiptsModal` SHALL display the total member count for the announcement's audience, the count of members who have read it, and a list of member avatars with names and read timestamps.
5. THE `AnnouncementReadReceiptsModal` SHALL use `useQuery` with `queryKey: ["read-receipts", announcementId]` and `staleTime: 60_000`.
6. WHEN fewer than 5 members have read the announcement, THE `AnnouncementReadReceiptsModal` SHALL show all avatars. WHEN 5 or more have read it, THE Modal SHALL show the first 5 avatars and a "+N more" overflow indicator.

---

### Requirement 9: UI Component Library Additions

**User Story:** As a developer, I want a set of reusable, design-system-compliant UI components for the announcements module, so that the feature is consistent, maintainable, and extensible.

#### Acceptance Criteria

1. THE `InfoCard` component (`src/components/ui/info-card.tsx`) SHALL accept props: `children`, `className`, and an optional `accentColor` (hex string) that renders a 4px left border in that color. It SHALL apply the standard card styles: `bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm`.
2. THE `NotificationBell` component (`src/components/ui/notifications-1.tsx`) SHALL accept props: `notifications` (array), `onMarkAllRead` (callback), `onNotificationClick` (callback). It SHALL render a bell icon button with a badge count and a dropdown list of notification items.
3. THE `ReactionChip` component (`src/components/ui/reaction-chip.tsx`) SHALL accept props: `emoji` (string), `count` (number), `isActive` (boolean), `onClick` (callback). It SHALL render a pill button with the emoji, count, and an active state style (colored border + background tint). WHEN `count` is 0, THE chip SHALL still render but show no count number.
4. THE `CommentThread` component (`src/components/ui/reddit-nested-thread-reply.tsx`) SHALL accept props: `comments` (nested array), `currentMemberId` (string), `onAddComment` (callback), `onAddReply` (callback). It SHALL render top-level comments with reply threads indented by 24px, each showing the author avatar, name, body, and a "Reply" button.
5. THE `Empty` component (`src/components/ui/empty.tsx`) SHALL accept props: `icon` (Lucide icon component), `title` (string), `description` (string, optional), `action` (ReactNode, optional). It SHALL render a centered flex column with the icon at 48px, title in `text-base font-semibold text-slate-600`, description in `text-sm text-slate-400`, and the action below.
6. ALL new UI components SHALL support dark mode via Tailwind's `dark:` variant classes.
7. ALL new UI components SHALL be exported as named exports and use `font-jakarta` on their root element.

---

### Requirement 10: Design System Compliance

**User Story:** As a designer, I want all new announcement UI to follow Vestry Hub's design system tokens, so that the feature looks and feels native to the platform.

#### Acceptance Criteria

1. THE `AnnouncementCardAdmin` and `AnnouncementCardMember` SHALL use `rounded-xl shadow-sm` at rest and `shadow-md` on hover, with `transition-all duration-200 ease-out`.
2. THE category color badge SHALL use `bg-[color]/10 text-[color]` pattern (Tailwind arbitrary value with opacity modifier) where `[color]` is the announcement type's hex color.
3. ALL card titles SHALL use `font-semibold` and metadata (timestamps, author) SHALL use `text-muted-foreground text-xs`.
4. THE Framer Motion stagger animation on the admin feed SHALL use `staggerChildren: 0.05`, `initial: { opacity: 0, y: 10 }`, `animate: { opacity: 1, y: 0 }`.
5. THE "Read more / Read less" height animation SHALL use Framer Motion `AnimatePresence` with `initial={{ height: 0, opacity: 0 }}` and `animate={{ height: "auto", opacity: 1 }}`.
6. ALL new pages and components SHALL use `font-jakarta` on their root element.
7. ALL new pages SHALL wrap their content in the existing `PageTransition` component.
8. THE urgent announcement pulsing dot SHALL use Tailwind class `animate-pulse` on a `bg-red-500 rounded-full h-2 w-2` element.
9. THE pinned announcement card background SHALL use `bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800`.
10. ALL Supabase queries in new hooks and components SHALL use `TABLES` and `COLS` constants from `src/lib/schema.ts` — no hardcoded table or column name strings.
