import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Copy,
  Archive,
  Eye,
  Trash2,
  Users,
  UserCheck,
  Globe,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { AnnouncementReadReceiptsModal } from "@/components/announcements/AnnouncementReadReceiptsModal";
import type {
  Announcement,
  AnnouncementType,
  AnnouncementAttachment,
} from "@/types/announcements";

// ─── Props ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_THUMBNAILS = 3;
const THUMBNAIL_SIZE = 80;

function getAudienceLabel(
  audience: Announcement["audience"],
  groupId: string | null,
  groups: { id: string; name: string }[]
): { label: string; icon: React.ReactNode } {
  if (audience === "specific_group") {
    const group = groups.find((g) => g.id === groupId);
    return {
      label: group ? `Group: ${group.name}` : "Specific Group",
      icon: <Users className="h-3 w-3" />,
    };
  }
  if (audience === "leaders_only") {
    return {
      label: "Leaders Only",
      icon: <UserCheck className="h-3 w-3" />,
    };
  }
  return {
    label: "All Members",
    icon: <Globe className="h-3 w-3" />,
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnnouncementCardAdmin({
  announcement,
  groups,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onViewReceipts,
  onTogglePin,
}: AnnouncementCardAdminProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [receiptsOpen, setReceiptsOpen] = useState(false);

  const type = announcement.announcement_types;
  const color = type?.color ?? "#6366f1";
  const isUrgent = type?.label?.toLowerCase() === "urgent";
  const isPinned = announcement.is_pinned;

  const attachments = announcement.announcement_attachments ?? [];
  const imageAttachments = attachments.filter((a) => a.type === "image");
  const visibleThumbnails = imageAttachments.slice(0, MAX_THUMBNAILS);
  const extraCount = imageAttachments.length - MAX_THUMBNAILS;
  const nonImageAttachments = attachments.filter((a) => a.type !== "image");

  const audience = getAudienceLabel(
    announcement.audience,
    announcement.group_id,
    groups
  );

  const bodyText = announcement.rich_body
    ? stripHtml(announcement.rich_body)
    : (announcement.body ?? "");

  const authorName = ""; // author info not in base Announcement type; rendered via created_by if available
  const createdAt = announcement.created_at
    ? formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })
    : "";

  return (
    <>
      {/* Card */}
      <div
        className={cn(
          "font-jakarta rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-5",
          "hover:shadow-md transition-all duration-200 ease-out",
          isPinned &&
            "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
        )}
        style={{
          borderLeft: `4px solid ${color}`,
        }}
      >
        {/* ── Top row: badges + actions ── */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {/* Pinned indicator */}
            {isPinned && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            )}

            {/* Category badge */}
            {type && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${color}1a`,
                  color: color,
                }}
              >
                {/* Urgent pulsing dot */}
                {isUrgent && (
                  <span className="animate-pulse bg-red-500 rounded-full h-2 w-2 inline-block" />
                )}
                {type.label}
              </span>
            )}

            {/* Audience badge */}
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {audience.icon}
              {audience.label}
            </span>

            {/* Status badge (scheduled / draft) */}
            {announcement.status === "scheduled" && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                Scheduled
              </span>
            )}
            {announcement.status === "draft" && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                Draft
              </span>
            )}
          </div>

          {/* ⋮ Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Announcement actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 font-jakarta">
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => onEdit(announcement)}
              >
                <Pencil className="h-4 w-4 text-slate-400" />
                Edit
              </DropdownMenuItem>

              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => onTogglePin(announcement.id, !isPinned)}
              >
                {isPinned ? (
                  <>
                    <PinOff className="h-4 w-4 text-slate-400" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4 text-slate-400" />
                    Pin
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => onDuplicate(announcement)}
              >
                <Copy className="h-4 w-4 text-slate-400" />
                Duplicate
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => onArchive(announcement.id)}
              >
                <Archive className="h-4 w-4 text-slate-400" />
                Archive
              </DropdownMenuItem>

              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => {
                  onViewReceipts(announcement.id);
                  setReceiptsOpen(true);
                }}
              >
                <Eye className="h-4 w-4 text-slate-400" />
                View Read Receipts
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Title ── */}
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-jakarta mb-1.5 leading-snug">
          {announcement.title}
        </h3>

        {/* ── Body ── */}
        {bodyText && (
          <p className="text-sm text-slate-600 dark:text-slate-400 font-jakarta line-clamp-3 leading-relaxed mb-3">
            {bodyText}
          </p>
        )}

        {/* ── Image thumbnails ── */}
        {visibleThumbnails.length > 0 && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {visibleThumbnails.map((att) => (
              <div
                key={att.id}
                className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0"
                style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
              >
                <img
                  src={att.url}
                  alt={att.filename ?? "attachment"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
            {extraCount > 0 && (
              <div
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0"
                style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
              >
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 font-jakarta">
                  +{extraCount}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Non-image attachment chips ── */}
        {nonImageAttachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {nonImageAttachments.map((att) => (
              <span
                key={att.id}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
              >
                <Paperclip className="h-3 w-3" />
                {att.filename ?? att.type}
              </span>
            ))}
          </div>
        )}

        {/* ── Author row ── */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
          <MemberAvatar
            name={authorName || "Admin"}
            size="sm"
            className="shrink-0"
          />
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {authorName && (
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 font-jakarta truncate">
                {authorName}
              </span>
            )}
            {authorName && createdAt && (
              <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
            )}
            {createdAt && (
              <span className="text-xs text-slate-400 dark:text-slate-500 font-jakarta">
                {createdAt}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete announcement?"
        description="This action cannot be undone. The announcement and all its attachments will be permanently removed."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          onDelete(announcement.id);
          setDeleteOpen(false);
        }}
      />

      {/* ── Read receipts modal ── */}
      <AnnouncementReadReceiptsModal
        open={receiptsOpen}
        onClose={() => setReceiptsOpen(false)}
        announcementId={announcement.id}
        tenantId={announcement.tenant_id}
        totalAudienceCount={0}
      />
    </>
  );
}
