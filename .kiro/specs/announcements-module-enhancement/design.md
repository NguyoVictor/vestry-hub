# Design Document — Announcements Module Enhancement


## Overview

This document describes the technical design for the Announcements Module Enhancement in Vestry. The enhancement transforms the existing basic announcements feature — a plain textarea with hardcoded category strings — into a full-featured communications hub. It introduces dynamic announcement types (configurable per church), a TipTap rich-text editor, file/media attachments with Supabase Storage, emoji reactions, nested comment threads, read receipts, scheduled publishing, audience targeting, and a redesigned feed for both admins and members.

The design follows all Vestry conventions: `tenant_id` scoping on every query, `TABLES`/`COLS` constants from `src/lib/schema.ts`, TanStack Query with `staleTime: 300_000`, VARCHAR IDs, RLS on every new table, React Hook Form + Zod for all forms, and Framer Motion for animations.

---

## Architecture

The feature spans four surface areas:

```
Admin (authenticated)
  /settings/announcement-types     → AnnouncementTypesSettingsPage
    ├── AnnouncementTypeRow (draggable)
    └── AnnouncementTypeDrawer (add/edit)

  /announcements                   → Announcements.tsx (refactored)
    ├── AnnouncementFeedAdmin
    │   ├── CategoryFilterTabs (dynamic, Framer Motion layoutId)
    │   ├── AnnouncementCardAdmin (× N)
    │   │   ├── AttachmentPreview (thumbnails, video chip, PDF chip, OG card)
    │   │   └── AnnouncementActionsMenu (⋮ dropdown)
    │   └── AnnouncementReadReceiptsModal
    └── PostAnnouncementDrawer (Sheet)
        ├── TipTapEditor (lazy-loaded)
        ├── CategoryDropdown
        ├── AudienceSelector
        ├── AttachmentDropzone
        └── SchedulingControls

Member Portal (member-authenticated)
  /member/announcements             → MemberAnnouncements.tsx (refactored)
    ├── CategoryFilterPills (dynamic)
    ├── AnnouncementCardMember (× N)
    │   ├── RichBodyRenderer (TipTap HTML or plain body)
    │   ├── ReadMoreToggle (Framer Motion AnimatePresence)
    │   ├── AttachmentRenderer (images, video, PDF, OG card, link chip)
    │   ├── ReactionChipRow (4 emoji chips)
    │   └── CommentThread (collapsible)
    └── NotificationBell (in member portal header)
```

### Data Flow

All data fetching uses TanStack Query. No `useEffect + useState` for data. Mutations use `useMutation` with `onSuccess: () => queryClient.invalidateQueries(...)`. The `useChurch()` context provides `tenantId` and `userId` for admin pages. The `useMemberPortal()` context provides `memberId`, `churchId`, and `tenantId` for member portal pages.

```
Component
  └── useQuery(queryKey, queryFn, { staleTime: 300_000 })
        └── supabase.from(TABLES.X).select(...).eq(COLS.TENANT_ID, tenantId)

Component
  └── useMutation(mutationFn)
        onSuccess → queryClient.invalidateQueries({ queryKey: [...] })
```

The `useReadReceipt` hook uses `IntersectionObserver` to detect viewport entry and a `setTimeout` for the 2-second dwell timer before upserting a read receipt. The `useAnnouncementNotifications` hook is called after a successful announcement insert to fan out notification records to all target audience members.

```
PostAnnouncementDrawer
  └── onSubmit
        ├── supabase.insert(TABLES.ANNOUNCEMENTS, payload)
        ├── supabase.insert(TABLES.ANNOUNCEMENT_ATTACHMENTS, attachments[])
        ├── supabase.rpc("increment_announcement_type_usage", { type_id })
        └── useAnnouncementNotifications.notify(announcementId, audience)
              └── supabase.insert(TABLES.NOTIFICATIONS, notifRecords[])

AnnouncementCardMember (ref)
  └── useReadReceipt(announcementId, cardRef)
        └── IntersectionObserver → 2s timer → supabase.upsert(TABLES.ANNOUNCEMENT_READ_RECEIPTS)
```

---

## Components and Interfaces

### AnnouncementTypesSettingsPage (`src/pages/settings/AnnouncementTypes.tsx`)

Mirrors `ServiceRequestTypesPage` in structure. Lazy-loaded via `React.lazy()`.

**Props:** none (reads `tenantId` from `useChurch()`)

**Queries:**
```typescript
useQuery({
  queryKey: ["announcement-types", tenantId],
  queryFn: () =>
    supabase
      .from(TABLES.ANNOUNCEMENT_TYPES)
      .select("*")
      .eq(COLS.TENANT_ID, tenantId)
      .order("order", { ascending: true }),
  staleTime: 300_000,
})
```

**Mutations:** create, update, toggleActive (optimistic with revert), reorder (drag-drop, persists `order`), seedDefaults, delete/archive

**Key behaviours:**
- On first load with zero records, automatically seeds the 5 default types (General, Service, Event, Finance, Urgent) with `is_default: true`
- Drag-to-reorder using HTML5 drag events; persists all affected `order` values on drop
- Optimistic toggle of `is_active` with revert on Supabase error
- Delete: if `usage_count === 0` → permanent delete after `ConfirmDialog`; if `usage_count > 0` → archive (`is_active: false`) with informational toast
- Default types (`is_default: true`): delete action disabled; only active toggle and label/description/color/icon editable

---

### AnnouncementTypeDrawer

Side drawer (shadcn `Sheet`) for add/edit. Uses React Hook Form + Zod.

```typescript
interface AnnouncementTypeDrawerProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  editData?: AnnouncementType | null;
}

const announcementTypeSchema = z.object({
  label: z.string().min(1, "Label is required"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
  icon: z.string().min(1, "Icon is required"),
  is_active: z.boolean().default(true),
})
```

Fields: Label (required text input), Description (optional textarea), Color (hex color picker — `<input type="color">`), Icon (lucide icon name selector — searchable combobox of common lucide names), Active toggle.

---

### PostAnnouncementDrawer (`src/components/announcements/PostAnnouncementDrawer.tsx`)

Replaces the inline form in `Announcements.tsx`. Implemented as a shadcn `Sheet` opening from the right.

```typescript
interface PostAnnouncementDrawerProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  userId: string;
  editData?: Announcement | null;  // pre-populated when editing
}

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  rich_body: z.string().min(1, "Body is required"),
  category_id: z.string().optional(),
  audience: z.enum(["all", "specific_group", "leaders_only"]).default("all"),
  group_id: z.string().optional(),
  is_pinned: z.boolean().default(false),
  comments_enabled: z.boolean().default(true),
  reactions_enabled: z.boolean().default(true),
  scheduled_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
})
```

**TipTap Editor** is loaded via `React.lazy()` with extensions: `StarterKit` (Bold, Italic, BulletList, OrderedList, Heading level 2), `Link`, `Placeholder("Write your announcement…")`. Wrapped in `<Suspense fallback={<Skeleton className="h-48 w-full" />}>`.

**Category Dropdown:** lists all active `AnnouncementType` records for the tenant. Each option renders a colored dot (`w-2 h-2 rounded-full bg-[color]`) and the type label.

**Audience Selector:** three radio-style buttons: "All Members" / "Specific Group" / "Leaders Only". When "Specific Group" is selected, a group picker appears (populated from `TABLES.GROUPS` filtered by `tenant_id`).

**AttachmentDropzone:** see dedicated section below.

**Scheduling Controls:**
- Schedule toggle (Switch). When off: "Post Now" primary button. When on: date-time picker for `scheduled_at` + "Schedule Announcement" button.
- Optional Expiry date picker for `expires_at`.

**On submit:**
1. Insert into `TABLES.ANNOUNCEMENTS` with all fields; `status: scheduled_at ? "scheduled" : "active"`
2. Upload files to Supabase Storage, insert records into `TABLES.ANNOUNCEMENT_ATTACHMENTS`
3. Call `supabase.rpc("increment_announcement_type_usage", { p_type_id: category_id })` if category selected
4. Call `useAnnouncementNotifications.notify(announcementId, audience, groupId)`
5. `queryClient.invalidateQueries({ queryKey: ["announcements", tenantId] })`
6. `toast.success("Announcement posted")` or `toast.success("Announcement scheduled")`

**On close:** reset form to empty state, clear attachment previews.

---

### AttachmentDropzone (`src/components/announcements/AttachmentDropzone.tsx`)

```typescript
interface AttachmentDropzoneProps {
  tenantId: string;
  announcementId: string;
  attachments: AttachmentPreviewItem[];
  onChange: (attachments: AttachmentPreviewItem[]) => void;
}

interface AttachmentPreviewItem {
  type: "image" | "video" | "pdf" | "file" | "link";
  file?: File;           // for file-based attachments
  url?: string;          // for link attachments or after upload
  filename?: string;
  sizeBytes?: number;
  mimeType?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  previewUrl?: string;   // object URL for image thumbnails
  uploadStatus: "pending" | "uploading" | "done" | "error";
}
```

**Accepted file types:** images (jpg, png, gif, webp), videos (mp4, mov), PDFs, generic files.

**Previews:**
- Image: inline `<img>` thumbnail at 80×80px using `URL.createObjectURL(file)`
- Video: filename chip with `<Video className="h-4 w-4" />` icon
- PDF: filename chip with `<FileText className="h-4 w-4" />` icon
- Link: after URL entry, calls `supabase.functions.invoke("fetch-og-metadata", { body: { url } })` and renders OG preview card (title, description, image) or plain link chip if OG unavailable

**Validation:** max 50 MB per file. If exceeded: `toast.error("File exceeds 50 MB limit")`, file not added.

**Upload path:** `announcements/{tenantId}/{announcementId}/{filename}` in the `announcements-media` bucket.

---

### AnnouncementFeedAdmin (`src/components/announcements/AnnouncementFeedAdmin.tsx`)

```typescript
interface AnnouncementFeedAdminProps {
  tenantId: string;
  announcementTypes: AnnouncementType[];
  onPostNew: () => void;
}
```

**Query:**
```typescript
useQuery({
  queryKey: ["announcements", tenantId],
  queryFn: () =>
    supabase
      .from(TABLES.ANNOUNCEMENTS)
      .select(`*, announcement_types(label, color, icon), announcement_attachments(*)`)
      .eq(COLS.TENANT_ID, tenantId)
      .neq("status", "archived")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false }),
  staleTime: 300_000,
})
```

**Category filter tabs:** dynamic tabs from active `AnnouncementType` records + "All" tab. Uses Framer Motion `layoutId="announcementActiveTab"` sliding underline.

**Stagger animation:**
```typescript
const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
```

**Loading state:** 3 card skeletons.

**Empty state:** `Empty` component with `Megaphone` icon, "No announcements yet" title, "Post Announcement" CTA.

---

### AnnouncementCardAdmin (`src/components/announcements/AnnouncementCardAdmin.tsx`)

```typescript
interface AnnouncementCardAdminProps {
  announcement: Announcement & {
    announcement_types: Pick<AnnouncementType, "label" | "color" | "icon"> | null;
    announcement_attachments: AnnouncementAttachment[];
  };
  groups: { id: string; name: string }[];
  onEdit: (ann: Announcement) => void;
  onDuplicate: (ann: Announcement) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onViewReceipts: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
}
```

**Visual structure:**
- 4px left border: `style={{ borderLeftColor: announcement.announcement_types?.color ?? "#6366f1" }}`
- Pinned: `bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800`
- Urgent type: pulsing red dot `<span className="animate-pulse bg-red-500 rounded-full h-2 w-2 inline-block" />`
- Category badge: `bg-[color]/10 text-[color]` using Tailwind arbitrary values
- Audience badge: "All Members" / "Group: {name}" / "Leaders Only"
- Body: `line-clamp-3`
- Author: `MemberAvatar` + name + `formatDistanceToNow` timestamp
- Attachment thumbnails: max 3 at 80×80px; "+N more" chip if > 3

**⋮ Dropdown actions:** Edit, Pin/Unpin, Duplicate, Archive, View Read Receipts, Delete (with `ConfirmDialog`).

**Hover:** `shadow-md transition-all duration-200 ease-out`

---

### AnnouncementReadReceiptsModal (`src/components/announcements/AnnouncementReadReceiptsModal.tsx`)

```typescript
interface AnnouncementReadReceiptsModalProps {
  open: boolean;
  onClose: () => void;
  announcementId: string;
  tenantId: string;
  totalAudienceCount: number;
}
```

**Query:**
```typescript
useQuery({
  queryKey: ["read-receipts", announcementId],
  queryFn: () =>
    supabase
      .from(TABLES.ANNOUNCEMENT_READ_RECEIPTS)
      .select(`*, members(first_name, last_name, avatar_url)`)
      .eq("announcement_id", announcementId)
      .order("read_at", { ascending: false }),
  staleTime: 60_000,
  enabled: open,
})
```

**Display:** "Seen by X of Y members" header. Avatar list: if < 5 readers, show all; if ≥ 5, show first 5 + "+N more" overflow chip. Each avatar shows member name and `format(read_at, "dd MMM, h:mm a")`.

---

### AnnouncementCardMember (`src/components/announcements/AnnouncementCardMember.tsx`)

```typescript
interface AnnouncementCardMemberProps {
  announcement: Announcement & {
    announcement_types: Pick<AnnouncementType, "label" | "color"> | null;
    announcement_attachments: AnnouncementAttachment[];
    announcement_reactions: AnnouncementReaction[];
    announcement_comments: AnnouncementComment[];
  };
  currentMemberId: string;
  onReactionToggle: (announcementId: string, emoji: string) => void;
  onAddComment: (announcementId: string, body: string, parentId?: string) => void;
}
```

**Read more/less:** body truncated at 200 characters. "Read more" expands with Framer Motion `AnimatePresence`:
```typescript
<AnimatePresence>
  {expanded && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* full rich body */}
    </motion.div>
  )}
</AnimatePresence>
```

**Rich body rendering:** if `rich_body` is set, render as `<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} className="prose prose-sm max-w-none" />` (sanitized with DOMPurify). Otherwise fall back to plain `body` text.

**Reaction chips:** 4 `ReactionChip` components for 🔥 ❤️ 🙏 🎉. Aggregated counts derived from `announcement_reactions`. Optimistic update on click.

**Comments toggle:** "Comments (N)" button. Expands `CommentThread` section.

**Read receipt:** card root element has a `ref` passed to `useReadReceipt(announcement.id, cardRef)`.

---

### MemberAnnouncements (`src/pages/member/MemberAnnouncements.tsx`) — refactored

**Queries:**
```typescript
// Member's group memberships (for audience filtering)
useQuery({
  queryKey: ["member-group-ids", memberId],
  queryFn: () =>
    supabase.from(TABLES.GROUP_MEMBERS).select("group_id").eq("member_id", memberId),
  staleTime: 300_000,
})

// Announcements with all related data
useQuery({
  queryKey: ["member-announcements", member.churchId],
  queryFn: () =>
    supabase
      .from(TABLES.ANNOUNCEMENTS)
      .select(`
        *,
        announcement_types(label, color),
        announcement_attachments(*),
        announcement_reactions(*),
        announcement_comments(*, members(first_name, last_name, avatar_url))
      `)
      .eq(COLS.TENANT_ID, member.churchId)
      .eq("status", "active")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false }),
  staleTime: 300_000,
})

// Active announcement types for filter pills
useQuery({
  queryKey: ["announcement-types", member.churchId],
  queryFn: () =>
    supabase
      .from(TABLES.ANNOUNCEMENT_TYPES)
      .select("id, label, color")
      .eq(COLS.TENANT_ID, member.churchId)
      .eq("is_active", true)
      .order("order"),
  staleTime: 300_000,
})
```

**Audience filtering logic:**
```typescript
const visibleAnnouncements = announcements.filter(a => {
  // Filter expired
  if (a.expires_at && new Date(a.expires_at) < new Date()) return false;
  // Audience filter
  if (a.audience === "all" || !a.audience) return true;
  if (a.audience === "specific_group") return memberGroupIds.includes(a.group_id);
  if (a.audience === "leaders_only")
    return member.memberType === "leader" || member.memberType === "staff";
  return true;
});
```

**Category filter pills:** rounded-full buttons. Active pill uses the type's `color` as background. "All" pill uses `bg-orange-500`.

**Container:** `max-w-[680px] mx-auto`

---

### NotificationBell (`src/components/ui/notifications-1.tsx`)

```typescript
interface NotificationBellProps {
  notifications: MemberNotification[];
  onMarkAllRead: () => void;
  onNotificationClick: (notif: MemberNotification) => void;
}

interface MemberNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link?: string;
  metadata?: {
    announcementId?: string;
    categoryColor?: string;
    categoryLabel?: string;
  };
}
```

**Query (in parent hook `useNotificationBell`):**
```typescript
useQuery({
  queryKey: ["member-notifications", member.memberId],
  queryFn: () =>
    supabase
      .from(TABLES.NOTIFICATIONS)
      .select("*")
      .eq(COLS.TENANT_ID, member.tenantId)
      .eq(COLS.NOTIF_USER_ID, member.memberId)
      .order("created_at", { ascending: false })
      .limit(20),
  staleTime: 60_000,
})
```

**Badge:** `unreadCount = notifications.filter(n => !n.is_read).length`. Hidden when 0.

**Dropdown:** list of notification items, each with a colored left dot (`bg-[categoryColor]`), title, body preview, relative timestamp. "Mark all as read" button at top.

**On notification click:** navigate to `/member/announcements`, mark notification as read, highlight target announcement card with a brief ring animation (`ring-2 ring-orange-400 ring-offset-2`).

---

### UI Component Library Additions

#### InfoCard (`src/components/ui/info-card.tsx`)

```typescript
interface InfoCardProps {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;  // hex string, e.g. "#6366f1"
}

export function InfoCard({ children, className, accentColor }: InfoCardProps) {
  return (
    <div
      className={cn(
        "font-jakarta bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm",
        className
      )}
      style={accentColor ? { borderLeft: `4px solid ${accentColor}` } : undefined}
    >
      {children}
    </div>
  );
}
```

#### ReactionChip (`src/components/ui/reaction-chip.tsx`)

```typescript
interface ReactionChipProps {
  emoji: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

export function ReactionChip({ emoji, count, isActive, onClick }: ReactionChipProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "font-jakarta inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-all",
        isActive
          ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-600"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
      )}
    >
      <span>{emoji}</span>
      {count > 0 && <span className="text-xs font-medium">{count}</span>}
    </motion.button>
  );
}
```

#### CommentThread (`src/components/ui/reddit-nested-thread-reply.tsx`)

```typescript
interface CommentNode {
  id: string;
  member_id: string;
  body: string;
  created_at: string;
  is_deleted: boolean;
  author: { first_name: string; last_name: string; avatar_url: string | null };
  replies: CommentNode[];
}

interface CommentThreadProps {
  comments: CommentNode[];
  currentMemberId: string;
  onAddComment: (body: string, parentId?: string) => void;
}
```

Renders top-level comments at base indentation. Replies indented by `pl-6` (24px) per level. Each comment shows `MemberAvatar`, author name, body, relative timestamp, and a "Reply" button. Deleted comments show "[deleted]" placeholder.

#### Empty (`src/components/ui/empty.tsx`)

```typescript
interface EmptyProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function Empty({ icon: Icon, title, description, action }: EmptyProps) {
  return (
    <div className="font-jakarta flex flex-col items-center justify-center py-16 gap-3 text-center">
      <Icon className="h-12 w-12 text-slate-300" />
      <p className="text-base font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      {description && <p className="text-sm text-slate-400 max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
```

---

### Hooks

#### `useReadReceipt` (`src/hooks/useReadReceipt.ts`)

```typescript
export function useReadReceipt(
  announcementId: string,
  cardRef: React.RefObject<HTMLElement>
): void {
  const member = useMemberPortal();
  const [hasRead, setHasRead] = useState(false);

  useEffect(() => {
    if (hasRead || !cardRef.current) return;

    let timer: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(async () => {
            const { error } = await supabase
              .from(TABLES.ANNOUNCEMENT_READ_RECEIPTS)
              .upsert(
                {
                  announcement_id: announcementId,
                  member_id: member.memberId,
                  tenant_id: member.tenantId,
                  read_at: new Date().toISOString(),
                },
                { onConflict: "announcement_id,member_id", ignoreDuplicates: true }
              );
            if (!error) setHasRead(true);
          }, 2000);
        } else {
          clearTimeout(timer);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [announcementId, member.memberId, member.tenantId, hasRead]);
}
```

Silent operation — no toast on success or failure.

#### `useAnnouncementNotifications` (`src/hooks/useAnnouncementNotifications.ts`)

```typescript
export function useAnnouncementNotifications() {
  const { tenantId } = useChurch();

  const notify = async (
    announcementId: string,
    announcement: Pick<Announcement, "title" | "body" | "rich_body" | "audience" | "group_id">,
    categoryColor: string,
    categoryLabel: string
  ) => {
    // 1. Fetch target member user IDs based on audience
    let memberUserIds: string[] = [];

    if (announcement.audience === "all") {
      const { data } = await supabase
        .from(TABLES.MEMBERS)
        .select("id")
        .eq(COLS.TENANT_ID, tenantId)
        .eq("status", "active");
      memberUserIds = (data ?? []).map(m => m.id);
    } else if (announcement.audience === "specific_group" && announcement.group_id) {
      const { data } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select("member_id")
        .eq("group_id", announcement.group_id);
      memberUserIds = (data ?? []).map(m => m.member_id);
    } else if (announcement.audience === "leaders_only") {
      const { data } = await supabase
        .from(TABLES.MEMBERS)
        .select("id")
        .eq(COLS.TENANT_ID, tenantId)
        .in("member_type", ["leader", "staff"]);
      memberUserIds = (data ?? []).map(m => m.id);
    }

    // 2. Build plain-text body (strip HTML tags, truncate to 120 chars)
    const plainBody = (announcement.rich_body ?? announcement.body ?? "")
      .replace(/<[^>]+>/g, "")
      .slice(0, 120);

    // 3. Insert notification records
    const records = memberUserIds.map(userId => ({
      tenant_id: tenantId,
      user_id: userId,
      type: "announcement",
      title: announcement.title,
      body: plainBody,
      is_read: false,
      link: "/member/announcements",
      metadata: { announcementId, categoryColor, categoryLabel },
    }));

    if (records.length > 0) {
      await supabase.from(TABLES.NOTIFICATIONS).insert(records as never);
    }
  };

  return { notify };
}
```

---

## Data Models

### New Table: `announcement_types`

```sql
CREATE TABLE announcement_types (
  id           VARCHAR PRIMARY KEY DEFAULT nanoid(),
  tenant_id    VARCHAR NOT NULL,
  label        TEXT NOT NULL,
  description  TEXT,
  color        VARCHAR(7) NOT NULL DEFAULT '#6366f1',  -- hex color
  icon         VARCHAR NOT NULL DEFAULT 'megaphone',   -- lucide icon name
  is_default   BOOLEAN NOT NULL DEFAULT false,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  "order"      INTEGER NOT NULL DEFAULT 0,
  usage_count  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcement_types_tenant_id ON announcement_types(tenant_id);
ALTER TABLE announcement_types ENABLE ROW LEVEL SECURITY;
```

**Default seed data (inserted when tenant has zero types):**

| label    | color     | icon            | order |
|----------|-----------|-----------------|-------|
| General  | `#6366f1` | `megaphone`     | 0     |
| Service  | `#f59e0b` | `church`        | 1     |
| Event    | `#10b981` | `calendar`      | 2     |
| Finance  | `#3b82f6` | `banknote`      | 3     |
| Urgent   | `#ef4444` | `alert-triangle`| 4     |

All seeded with `is_default: true`, `is_active: true`, `usage_count: 0`.

---

### Additions to `announcements` table

```sql
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS category_id       VARCHAR REFERENCES announcement_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audience          VARCHAR NOT NULL DEFAULT 'all'
                                             CHECK (audience IN ('all', 'specific_group', 'leaders_only')),
  ADD COLUMN IF NOT EXISTS group_id          VARCHAR REFERENCES groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pinned         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comments_enabled  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reactions_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rich_body         TEXT,
  ADD COLUMN IF NOT EXISTS view_count        INTEGER NOT NULL DEFAULT 0;

-- Ensure status column supports new values
-- (existing status column already exists; add 'scheduled' and 'archived' if not present)
ALTER TABLE announcements
  DROP CONSTRAINT IF EXISTS announcements_status_check;
ALTER TABLE announcements
  ADD CONSTRAINT announcements_status_check
  CHECK (status IN ('active', 'scheduled', 'archived', 'draft'));
```

---

### New Table: `announcement_attachments`

```sql
CREATE TABLE announcement_attachments (
  id              VARCHAR PRIMARY KEY DEFAULT nanoid(),
  tenant_id       VARCHAR NOT NULL,
  announcement_id VARCHAR NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  type            VARCHAR NOT NULL CHECK (type IN ('image', 'video', 'pdf', 'file', 'link')),
  url             TEXT NOT NULL,
  filename        TEXT,
  size_bytes      BIGINT,
  mime_type       VARCHAR,
  og_title        TEXT,
  og_description  TEXT,
  og_image_url    TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcement_attachments_tenant_id ON announcement_attachments(tenant_id);
CREATE INDEX idx_announcement_attachments_announcement_id ON announcement_attachments(announcement_id);
ALTER TABLE announcement_attachments ENABLE ROW LEVEL SECURITY;
```

---

### New Table: `announcement_reactions`

```sql
CREATE TABLE announcement_reactions (
  id              VARCHAR PRIMARY KEY DEFAULT nanoid(),
  tenant_id       VARCHAR NOT NULL,
  announcement_id VARCHAR NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  member_id       VARCHAR NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  emoji           VARCHAR NOT NULL CHECK (emoji IN ('🔥', '❤️', '🙏', '🎉')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, member_id, emoji)
);

CREATE INDEX idx_announcement_reactions_tenant_id ON announcement_reactions(tenant_id);
CREATE INDEX idx_announcement_reactions_announcement_member ON announcement_reactions(announcement_id, member_id);
ALTER TABLE announcement_reactions ENABLE ROW LEVEL SECURITY;
```

---

### New Table: `announcement_comments`

```sql
CREATE TABLE announcement_comments (
  id              VARCHAR PRIMARY KEY DEFAULT nanoid(),
  tenant_id       VARCHAR NOT NULL,
  announcement_id VARCHAR NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  member_id       VARCHAR NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  parent_id       VARCHAR REFERENCES announcement_comments(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcement_comments_tenant_id ON announcement_comments(tenant_id);
CREATE INDEX idx_announcement_comments_announcement_id ON announcement_comments(announcement_id);
ALTER TABLE announcement_comments ENABLE ROW LEVEL SECURITY;
```

---

### New Table: `announcement_read_receipts`

```sql
CREATE TABLE announcement_read_receipts (
  id              VARCHAR PRIMARY KEY DEFAULT nanoid(),
  tenant_id       VARCHAR NOT NULL,
  announcement_id VARCHAR NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  member_id       VARCHAR NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, member_id)
);

CREATE INDEX idx_announcement_read_receipts_tenant_id ON announcement_read_receipts(tenant_id);
CREATE INDEX idx_announcement_read_receipts_announcement_member ON announcement_read_receipts(announcement_id, member_id);
ALTER TABLE announcement_read_receipts ENABLE ROW LEVEL SECURITY;
```

---

### RLS Policies (pattern for all new tables)

```sql
-- announcement_types
CREATE POLICY "tenant_select" ON announcement_types
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
CREATE POLICY "tenant_insert" ON announcement_types
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
CREATE POLICY "tenant_update" ON announcement_types
  FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
CREATE POLICY "tenant_delete" ON announcement_types
  FOR DELETE USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
```

Same four-policy pattern applied to `announcement_attachments`, `announcement_reactions`, `announcement_comments`, and `announcement_read_receipts`.

For member portal read access (members are authenticated via Supabase Auth with their own `auth.uid()`), the select policy uses the same `tenant_id` check — members' `auth.uid()` maps to their `members.id` which carries the same `tenant_id`.

---

### Storage Bucket

| Bucket | Access | Max file size | Purpose |
|--------|--------|---------------|---------|
| `announcements-media` | Public (images) / Private (videos, PDFs) | 50 MB | Announcement attachments |

Upload path pattern: `announcements/{tenantId}/{announcementId}/{filename}`

---

### TABLES Constants to Add (`src/lib/schema.ts`)

```typescript
// In the Security & Communications section:
ANNOUNCEMENT_TYPES: "announcement_types",
ANNOUNCEMENT_ATTACHMENTS: "announcement_attachments",
ANNOUNCEMENT_REACTIONS: "announcement_reactions",
ANNOUNCEMENT_COMMENTS: "announcement_comments",
ANNOUNCEMENT_READ_RECEIPTS: "announcement_read_receipts",
```

---

### TypeScript Interfaces (`src/types/announcements.ts`)

```typescript
export interface AnnouncementType {
  id: string;
  tenant_id: string;
  label: string;
  description: string | null;
  color: string;           // hex, e.g. "#6366f1"
  icon: string;            // lucide icon name
  is_default: boolean;
  is_active: boolean;
  order: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export type AnnouncementAudience = "all" | "specific_group" | "leaders_only";
export type AnnouncementStatus = "active" | "scheduled" | "archived" | "draft";

export interface Announcement {
  id: string;
  tenant_id: string;
  title: string;
  body: string | null;
  rich_body: string | null;
  category_id: string | null;
  audience: AnnouncementAudience;
  group_id: string | null;
  is_pinned: boolean;
  status: AnnouncementStatus;
  scheduled_at: string | null;
  expires_at: string | null;
  comments_enabled: boolean;
  reactions_enabled: boolean;
  view_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AnnouncementAttachmentType = "image" | "video" | "pdf" | "file" | "link";

export interface AnnouncementAttachment {
  id: string;
  tenant_id: string;
  announcement_id: string;
  type: AnnouncementAttachmentType;
  url: string;
  filename: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  display_order: number;
  created_at: string;
}

export type ReactionEmoji = "🔥" | "❤️" | "🙏" | "🎉";

export interface AnnouncementReaction {
  id: string;
  tenant_id: string;
  announcement_id: string;
  member_id: string;
  emoji: ReactionEmoji;
  created_at: string;
}

export interface AnnouncementComment {
  id: string;
  tenant_id: string;
  announcement_id: string;
  member_id: string;
  parent_id: string | null;
  body: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReadReceipt {
  id: string;
  tenant_id: string;
  announcement_id: string;
  member_id: string;
  read_at: string;
}
```

---

### Routing Additions (`src/App.tsx`)

```typescript
// Lazy imports
const AnnouncementTypesSettingsPage = lazy(() =>
  import("./pages/settings/AnnouncementTypes")
);

// Inside settings routes (under /settings/*)
<Route
  path="announcement-types"
  element={
    <Suspense fallback={<Fallback />}>
      <AnnouncementTypesSettingsPage />
    </Suspense>
  }
/>
```

The existing `/announcements` and `/member/announcements` routes remain unchanged — only the page components are refactored in place.

---

### SettingsLayout Navigation Addition (`src/components/settings/SettingsLayout.tsx`)

Add to the **Features** group:

```typescript
{ label: "Announcement Types", icon: Megaphone, path: "/settings/announcement-types" },
```

---

### Member Portal Header Update

Add `NotificationBell` to the member portal header component. The bell reads from `useQuery(["member-notifications", member.memberId])` with `staleTime: 60_000`.

---

## Migration Strategy

The migration is additive — no existing data is destroyed.

1. **Create new tables** (`announcement_types`, `announcement_attachments`, `announcement_reactions`, `announcement_comments`, `announcement_read_receipts`) with all indexes and RLS policies.
2. **Alter `announcements` table** to add new columns with safe defaults (`audience DEFAULT 'all'`, `is_pinned DEFAULT false`, etc.). Existing rows remain valid.
3. **Update status constraint** on `announcements` to include `'scheduled'` and `'archived'`.
4. **Create Supabase Storage bucket** `announcements-media` with appropriate access policies.
5. **Create Edge Function** `fetch-og-metadata` for Open Graph metadata fetching (server-side to avoid CORS).
6. **Create RPC function** `increment_announcement_type_usage(p_type_id VARCHAR)` that does `UPDATE announcement_types SET usage_count = usage_count + 1 WHERE id = p_type_id`.
7. **Update `src/lib/schema.ts`** with the 5 new TABLES constants.
8. **Create `src/types/announcements.ts`** with all TypeScript interfaces.

Existing `category` column on `announcements` (the old hardcoded string) is left in place for backward compatibility. New code uses `category_id` (FK to `announcement_types`). A future migration can backfill `category_id` from `category` and drop the old column.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Default type seeding produces exactly 5 records with correct fields

*For any* tenant with zero existing announcement types, invoking the seed function should result in exactly 5 records in `announcement_types` for that tenant, each with `is_default: true`, `is_active: true`, `usage_count: 0`, and the correct label, color, and icon values (General/#6366f1/megaphone, Service/#f59e0b/church, Event/#10b981/calendar, Finance/#3b82f6/banknote, Urgent/#ef4444/alert-triangle).

**Validates: Requirements 1.2**

---

### Property 2: Drag-drop reorder persists sort order

*For any* permutation of announcement type rows applied via drag-and-drop reorder, querying `announcement_types` ordered by `order` ascending should return the records in the same sequence as the new arrangement.

**Validates: Requirements 1.4**

---

### Property 3: Active toggle is a round-trip

*For any* announcement type record, toggling `is_active` should flip the stored boolean value; toggling again should restore the original value.

**Validates: Requirements 1.5**

---

### Property 4: Add type form round-trip

*For any* valid announcement type form submission (label non-empty, valid hex color), the saved record should be retrievable from `announcement_types` with matching label, description, color, icon, `is_default: false`, and `usage_count: 0`.

**Validates: Requirements 1.7**

---

### Property 5: Archive instead of delete when usage_count > 0

*For any* announcement type with `usage_count > 0`, attempting to delete it should result in the record still existing in `announcement_types` with `is_active: false`, not a permanent deletion.

**Validates: Requirements 1.10**

---

### Property 6: Reaction unique constraint prevents duplicates

*For any* combination of `(announcement_id, member_id, emoji)`, inserting a second reaction record with the same triple should fail with a unique constraint violation — only one reaction per member per emoji per announcement is permitted.

**Validates: Requirements 2.4**

---

### Property 7: Read receipt upsert is idempotent

*For any* `(announcement_id, member_id)` pair, upserting a read receipt record multiple times should result in exactly one record in `announcement_read_receipts` for that pair — the unique constraint on `(announcement_id, member_id)` is never violated.

**Validates: Requirements 2.6, 8.3**

---

### Property 8: Post announcement drawer blocks empty title or body

*For any* form state where `title` is empty or `rich_body` is empty (or composed entirely of whitespace/empty HTML tags), attempting to submit the `PostAnnouncementDrawer` should display inline validation errors and not insert any record into `announcements`.

**Validates: Requirements 3.15**

---

### Property 9: AnnouncementCardAdmin renders all required visual elements

*For any* announcement record with an associated `announcement_type`, the rendered `AnnouncementCardAdmin` should display: a 4px left border in the type's color, the type label badge, the audience badge, the title, a body preview (line-clamp-3), the author avatar and name, a relative timestamp, and a ⋮ dropdown menu.

**Validates: Requirements 4.4**

---

### Property 10: Pinned announcements receive amber tint background

*For any* announcement with `is_pinned: true`, the rendered `AnnouncementCardAdmin` should apply `bg-amber-50 dark:bg-amber-900/10` background and `border-amber-200 dark:border-amber-800` border classes. For any announcement with `is_pinned: false`, these classes should not be applied.

**Validates: Requirements 4.5**

---

### Property 11: Duplicate announcement preserves content with correct title prefix

*For any* announcement, duplicating it should create a new record in `announcements` with `title = "Copy of " + original.title`, and with `body`, `rich_body`, `category_id`, and `audience` values identical to the original.

**Validates: Requirements 4.9**

---

### Property 12: Reaction toggle is a round-trip

*For any* member and announcement, clicking a reaction chip twice (toggle on, then toggle off) should result in zero net change to the `announcement_reactions` count for that `(announcement_id, member_id, emoji)` combination.

**Validates: Requirements 5.6**

---

### Property 13: Audience filtering shows only eligible announcements

*For any* member and any set of announcements with varying `audience` values, the visible announcements list should contain: all announcements with `audience = "all"`, announcements with `audience = "specific_group"` only if the member belongs to the announcement's `group_id`, and announcements with `audience = "leaders_only"` only if the member's `memberType` is `"leader"` or `"staff"`.

**Validates: Requirements 5.11**

---

### Property 14: Expired announcements are excluded from member feed

*For any* announcement with `expires_at` set to a datetime in the past, it should not appear in the member feed regardless of its `status`, `audience`, or `is_pinned` value.

**Validates: Requirements 5.15**

---

### Property 15: Attachment upload path matches required pattern

*For any* valid file upload to the `announcements-media` bucket, the stored object path should match the pattern `announcements/{tenantId}/{announcementId}/{filename}` exactly.

**Validates: Requirements 6.1**

---

### Property 16: File size limit is enforced client-side

*For any* file with `size > 50 * 1024 * 1024` bytes (50 MB), the `AttachmentDropzone` should reject it, call `toast.error("File exceeds 50 MB limit")`, and not add it to the attachment preview list.

**Validates: Requirements 6.7**

---

### Property 17: Notification body is truncated to 120 characters

*For any* announcement with a `rich_body` or `body` of arbitrary length, the `body` field of each generated notification record should be the plain-text content (HTML tags stripped) truncated to at most 120 characters.

**Validates: Requirements 7.2**

---

### Property 18: Notification count matches target audience size

*For any* announcement posted to a given audience, the number of notification records inserted into `notifications` should equal the number of active members in that audience (all active members for `"all"`, group members for `"specific_group"`, leaders/staff for `"leaders_only"`).

**Validates: Requirements 7.1**

---

### Property 19: Read receipts modal overflow indicator is correct

*For any* announcement with N readers where N ≥ 5, the `AnnouncementReadReceiptsModal` should render exactly 5 member avatars and a "+{N - 5} more" overflow indicator. For N < 5, all N avatars should be shown with no overflow indicator.

**Validates: Requirements 8.6**

---

### Property 20: ReactionChip renders correctly across all input combinations

*For any* combination of `(emoji, count, isActive)`, the rendered `ReactionChip` should: always display the emoji, display the count only when `count > 0`, apply active border and background tint classes when `isActive` is true, and apply neutral border classes when `isActive` is false.

**Validates: Requirements 9.3**

---

### Property 21: CommentThread indents replies by depth

*For any* nested comment tree, top-level comments should render at base indentation and each reply level should be indented by an additional 24px (`pl-6`) relative to its parent, regardless of nesting depth.

**Validates: Requirements 9.4**

---

## Error Handling

### Form Validation Errors
All forms use React Hook Form + Zod. Errors are displayed inline below each field using the shadcn `FormMessage` component. Required field errors are shown on submit attempt. The `PostAnnouncementDrawer` prevents submission if `title` or `rich_body` is empty.

### Attachment Upload Errors
- If a file exceeds 50 MB: `toast.error("File exceeds 50 MB limit")`, file not added to preview.
- If Supabase Storage upload fails: `toast.error("Failed to upload attachment")`, failed item removed from preview list, announcement insert proceeds without that attachment.
- If OG metadata fetch fails: render plain link chip instead of OG preview card — no error toast (silent degradation).

### Announcement Mutation Errors
- Insert/update fails: `toast.error("Failed to post announcement")`, drawer stays open for retry.
- Archive fails: `toast.error("Failed to archive announcement")`, optimistic update reverted.
- Delete fails: `toast.error("Failed to delete announcement")`, optimistic update reverted.

### Reaction/Comment Errors
- Reaction toggle fails: `toast.error("Failed to update reaction")`, optimistic count update reverted.
- Comment insert fails: `toast.error("Failed to post comment")`, comment input preserved for retry.

### Read Receipt Errors
Silent — no toast on success or failure. If the upsert fails, the hook does not retry; the receipt will be recorded on the next qualifying viewport dwell.

### Notification Fan-out Errors
If the notification insert fails after a successful announcement insert, the announcement is still posted. A `console.error` is logged but no user-facing error is shown (notifications are best-effort).

### Query Errors
All `useQuery` hooks rely on the global `retry: 1` setting in `QueryClient`. On error, the feed shows the `Empty` component with a "Try again" button that calls `refetch()`.

---

## Testing Strategy

### Unit Tests

Focus on pure logic functions:
- `buildAttachmentPath(tenantId, announcementId, filename): string` — verifies correct path pattern
- `truncatePlainText(html: string, maxLength: number): string` — verifies HTML stripping and truncation
- `filterAnnouncementsByAudience(announcements, member, memberGroupIds): Announcement[]` — verifies audience filtering logic
- `isExpired(expiresAt: string | null): boolean` — verifies expiry check
- `aggregateReactions(reactions: AnnouncementReaction[]): Record<ReactionEmoji, number>` — verifies count aggregation
- `buildCommentTree(comments: AnnouncementComment[]): CommentNode[]` — verifies flat list → nested tree conversion

### Property-Based Tests

Use **fast-check** (compatible with Vitest). Each property test runs a minimum of **100 iterations**.

Tag format: `// Feature: announcements-module-enhancement, Property N: <property_text>`

Properties to implement as PBT:

- **Property 1** (default type seeding): generate random tenantIds, invoke seed, assert 5 records with correct fields
- **Property 3** (active toggle round-trip): generate random `is_active` booleans, toggle twice, assert original value restored
- **Property 4** (add type form round-trip): generate random `{ label, description, color, icon }` objects, save, query, assert equality
- **Property 5** (archive instead of delete): generate types with random `usage_count > 0`, attempt delete, assert `is_active: false` and record exists
- **Property 6** (reaction unique constraint): generate random `(announcement_id, member_id, emoji)` triples, insert twice, assert second fails
- **Property 7** (read receipt idempotence): generate random `(announcement_id, member_id)` pairs, upsert twice, assert one record
- **Property 8** (form validation blocks empty fields): generate random form states with empty/whitespace title or body, assert submission blocked
- **Property 11** (duplicate title prefix): generate random announcements, duplicate, assert `title.startsWith("Copy of ")`
- **Property 12** (reaction toggle round-trip): generate random `(member_id, announcement_id, emoji)` combos, toggle twice, assert zero net change
- **Property 13** (audience filtering): generate random members and announcement sets, assert only eligible announcements returned
- **Property 14** (expired announcements excluded): generate announcements with random `expires_at` (past/future), assert only non-expired shown
- **Property 15** (attachment path pattern): generate random `(tenantId, announcementId, filename)` combos, assert path matches `/^announcements\/[^/]+\/[^/]+\/[^/]+$/`
- **Property 16** (file size limit): generate files with random sizes > 50 MB, assert rejected
- **Property 17** (notification body truncation): generate random HTML strings of arbitrary length, assert plain-text body ≤ 120 chars
- **Property 20** (ReactionChip rendering): generate random `(emoji, count, isActive)` combos, render, assert correct output
- **Property 21** (CommentThread indentation): generate random comment trees with varying depths, render, assert indentation matches depth

### Integration Tests

- Verify `announcements-media` bucket exists in Supabase Storage
- Verify all 5 new tables exist with correct columns and constraints
- Verify unique constraints on `announcement_reactions(announcement_id, member_id, emoji)` and `announcement_read_receipts(announcement_id, member_id)`
- Verify RLS policies are enabled on all new tables
- Verify `fetch-og-metadata` Edge Function accepts a URL and returns OG metadata or null
- Verify `increment_announcement_type_usage` RPC increments `usage_count` correctly

### Smoke Tests

- `/settings/announcement-types` route renders without crashing
- `/announcements` route renders the refactored `AnnouncementFeedAdmin` without crashing
- `/member/announcements` route renders the refactored member feed without crashing
- All 5 new `TABLES` constants are present in `src/lib/schema.ts`
- `src/types/announcements.ts` exports all 6 required interfaces
- `PostAnnouncementDrawer` opens and closes without errors
- `TipTapEditor` lazy-loads without errors (Suspense fallback renders during load)
