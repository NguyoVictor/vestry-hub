import { formatDistanceToNow } from "date-fns";
import DOMPurify from "dompurify";
import {
  Download,
  ExternalLink,
  FileText,
  Globe,
  MessageCircle,
  Pin,
  UserCheck,
  Users,
  Video,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import type {
  Announcement,
  AnnouncementAttachment,
  AnnouncementComment,
  AnnouncementReaction,
  AnnouncementType,
  CommentNode,
} from "@/types/announcements";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AnnouncementDetailModalProps {
  open: boolean;
  onClose: () => void;
  announcement: (Announcement & {
    announcement_types: Pick<AnnouncementType, "label" | "color" | "icon"> | null;
    announcement_attachments: AnnouncementAttachment[];
    announcement_reactions?: AnnouncementReaction[];
    announcement_comments?: AnnouncementComment[];
  }) | null;
  groups: { id: string; name: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REACTION_EMOJIS = ["🔥", "❤️", "🙏", "🎉"] as const;

function getAudienceLabel(
  audience: Announcement["audience"],
  groupId: string | null,
  groups: { id: string; name: string }[]
) {
  if (audience === "specific_group") {
    const group = groups.find((g) => g.id === groupId);
    return { label: group ? `Group: ${group.name}` : "Specific Group", icon: <Users className="h-3.5 w-3.5" /> };
  }
  if (audience === "leaders_only") {
    return { label: "Leaders Only", icon: <UserCheck className="h-3.5 w-3.5" /> };
  }
  return { label: "All Members", icon: <Globe className="h-3.5 w-3.5" /> };
}

// ─── Comment tree builder ─────────────────────────────────────────────────────

function buildCommentTree(comments: AnnouncementComment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  for (const c of comments) {
    map.set(c.id, {
      ...c,
      author: c.members ?? { first_name: "Unknown", last_name: "", avatar_url: null },
      replies: [],
    });
  }
  const roots: CommentNode[] = [];
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// ─── Read-only comment item ───────────────────────────────────────────────────

function ReadOnlyCommentItem({ comment, depth = 0 }: { comment: CommentNode; depth?: number }) {
  const authorName = comment.is_deleted
    ? "[deleted]"
    : `${comment.author.first_name} ${comment.author.last_name}`;

  return (
    <div className={depth > 0 ? "pl-6 border-l border-slate-100 dark:border-slate-800" : ""}>
      <div className="flex gap-2.5 py-2">
        {!comment.is_deleted && (
          <MemberAvatar
            name={authorName}
            src={comment.author.avatar_url ?? undefined}
            size="sm"
            className="shrink-0 mt-0.5"
          />
        )}
        <div className="flex-1 min-w-0">
          {comment.is_deleted ? (
            <p className="text-sm text-slate-400 italic font-jakarta">[deleted]</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-jakarta">
                  {authorName}
                </span>
                <span className="text-xs text-slate-400 font-jakarta">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-jakarta">
                {comment.body}
              </p>
            </>
          )}
        </div>
      </div>
      {comment.replies.map((reply) => (
        <ReadOnlyCommentItem key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );
}

// ─── Attachment renderers ─────────────────────────────────────────────────────

function ImageGrid({ attachments }: { attachments: AnnouncementAttachment[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((att) => (
        <a
          key={att.id}
          href={att.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 block hover:opacity-90 transition-opacity"
          style={{ width: 96, height: 96 }}
        >
          <img
            src={att.url}
            alt={att.filename ?? "image"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}

function VideoPlayer({ attachment }: { attachment: AnnouncementAttachment }) {
  return (
    <video
      src={attachment.url}
      controls
      preload="metadata"
      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 max-h-72 bg-black"
    />
  );
}

function PdfChip({ attachment }: { attachment: AnnouncementAttachment }) {
  return (
    <a
      href={attachment.url}
      download={attachment.filename ?? true}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
    >
      <FileText className="h-4 w-4 text-red-500 shrink-0" />
      <span className="truncate max-w-[220px]">{attachment.filename ?? "Download PDF"}</span>
      <Download className="h-3.5 w-3.5 shrink-0 text-slate-400" />
    </a>
  );
}

function FileChip({ attachment }: { attachment: AnnouncementAttachment }) {
  return (
    <a
      href={attachment.url}
      download={attachment.filename ?? true}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
    >
      <Download className="h-4 w-4 text-slate-500 shrink-0" />
      <span className="truncate max-w-[220px]">{attachment.filename ?? "Download file"}</span>
    </a>
  );
}

function OgCard({ attachment }: { attachment: AnnouncementAttachment }) {
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
    >
      {attachment.og_image_url && (
        <img
          src={attachment.og_image_url}
          alt={attachment.og_title ?? "link preview"}
          className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        {attachment.og_title && (
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-jakarta line-clamp-1">
            {attachment.og_title}
          </p>
        )}
        {attachment.og_description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-jakarta line-clamp-2 mt-0.5">
            {attachment.og_description}
          </p>
        )}
        <p className="text-xs text-slate-400 dark:text-slate-500 font-jakarta mt-1 truncate">
          {attachment.url}
        </p>
      </div>
    </a>
  );
}

function LinkChip({ attachment }: { attachment: AnnouncementAttachment }) {
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors max-w-full"
    >
      <ExternalLink className="h-4 w-4 text-blue-500 shrink-0" />
      <span className="truncate max-w-[240px]">{attachment.og_title ?? attachment.url}</span>
    </a>
  );
}

function VideoChip({ attachment }: { attachment: AnnouncementAttachment }) {
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
    >
      <Video className="h-4 w-4 text-purple-500 shrink-0" />
      <span className="truncate max-w-[220px]">{attachment.filename ?? "Video"}</span>
    </a>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AnnouncementDetailModal({
  open,
  onClose,
  announcement,
  groups,
}: AnnouncementDetailModalProps) {
  if (!announcement) return null;

  const type = announcement.announcement_types;
  const color = type?.color ?? "#6366f1";
  const isUrgent = type?.label?.toLowerCase() === "urgent";
  const isPinned = announcement.is_pinned;
  const audience = getAudienceLabel(announcement.audience, announcement.group_id, groups);

  const sanitizedHtml = announcement.rich_body
    ? DOMPurify.sanitize(announcement.rich_body)
    : null;

  const attachments = announcement.announcement_attachments ?? [];
  const images = attachments.filter((a) => a.type === "image");
  const videos = attachments.filter((a) => a.type === "video");
  const pdfs = attachments.filter((a) => a.type === "pdf");
  const files = attachments.filter((a) => a.type === "file");
  const links = attachments.filter((a) => a.type === "link");

  const reactions = announcement.announcement_reactions ?? [];
  const reactionCounts = REACTION_EMOJIS.reduce<Record<string, number>>((acc, emoji) => {
    acc[emoji] = reactions.filter((r) => r.emoji === emoji).length;
    return acc;
  }, {} as Record<string, number>);
  const hasAnyReaction = REACTION_EMOJIS.some((e) => reactionCounts[e] > 0);

  // ── Comments ──
  const rawComments = announcement.announcement_comments ?? [];
  const commentTree = buildCommentTree(rawComments);
  const commentCount = rawComments.filter((c) => !c.is_deleted).length;

  const createdAt = announcement.created_at
    ? formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })
    : "";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl p-0 font-jakarta max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {isPinned && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            )}
            {type && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${color}1a`, color }}
              >
                {isUrgent && (
                  <span className="animate-pulse bg-red-500 rounded-full h-2 w-2 inline-block" />
                )}
                {type.label}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {audience.icon}
              {audience.label}
            </span>
            {announcement.status === "scheduled" && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                Scheduled
              </span>
            )}
          </div>

          {/* Title */}
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 font-jakarta leading-snug">
            {announcement.title}
          </DialogTitle>

          {/* Meta */}
          <div className="flex items-center gap-2 mt-2">
            <MemberAvatar name="Admin" size="sm" className="shrink-0" />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-jakarta">{createdAt}</span>
          </div>
        </DialogHeader>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Body content */}
          {sanitizedHtml ? (
            <div
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300"
            />
          ) : announcement.body ? (
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {announcement.body}
            </p>
          ) : null}

          {/* Images */}
          {images.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 font-jakarta">
                Images
              </p>
              <ImageGrid attachments={images} />
            </div>
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 font-jakarta">
                Videos
              </p>
              <div className="space-y-3">
                {videos.map((v) =>
                  v.url.startsWith("http") ? (
                    <VideoPlayer key={v.id} attachment={v} />
                  ) : (
                    <VideoChip key={v.id} attachment={v} />
                  )
                )}
              </div>
            </div>
          )}

          {/* PDFs */}
          {pdfs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 font-jakarta">
                Documents
              </p>
              <div className="flex flex-wrap gap-2">
                {pdfs.map((p) => <PdfChip key={p.id} attachment={p} />)}
              </div>
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 font-jakarta">
                Files
              </p>
              <div className="flex flex-wrap gap-2">
                {files.map((f) => <FileChip key={f.id} attachment={f} />)}
              </div>
            </div>
          )}

          {/* Links */}
          {links.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 font-jakarta">
                Links
              </p>
              <div className="space-y-2">
                {links.map((l) =>
                  l.og_title || l.og_description || l.og_image_url ? (
                    <OgCard key={l.id} attachment={l} />
                  ) : (
                    <LinkChip key={l.id} attachment={l} />
                  )
                )}
              </div>
            </div>
          )}

          {/* Reactions summary */}
          {hasAnyReaction && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 font-jakarta">
                Member Reactions
              </p>
              <div className="flex flex-wrap gap-2">
                {REACTION_EMOJIS.filter((e) => reactionCounts[e] > 0).map((emoji) => (
                  <span
                    key={emoji}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <span>{emoji}</span>
                    <span className="text-xs font-semibold">{reactionCounts[emoji]}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Comments section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 font-jakarta">
                Comments
                {commentCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal">
                    {commentCount}
                  </span>
                )}
              </p>
            </div>

            {commentTree.length === 0 ? (
              <p className="text-sm text-slate-400 font-jakarta py-3 text-center">
                No comments yet
              </p>
            ) : (
              <div className="space-y-0 divide-y divide-slate-50 dark:divide-slate-800/60">
                {commentTree.map((comment) => (
                  <ReadOnlyCommentItem key={comment.id} comment={comment} depth={0} />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
