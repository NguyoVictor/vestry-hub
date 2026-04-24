import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageCircle,
  Download,
  ExternalLink,
  FileText,
  Video,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { ReactionChip } from "@/components/ui/reaction-chip";
import { CommentThread, type CommentNode } from "@/components/ui/reddit-nested-thread-reply";
import { useReadReceipt } from "@/hooks/useReadReceipt";
import type {
  Announcement,
  AnnouncementType,
  AnnouncementAttachment,
  AnnouncementReaction,
  AnnouncementComment,
  ReactionEmoji,
} from "@/types/announcements";

// ─── Constants ────────────────────────────────────────────────────────────────

const REACTION_EMOJIS: ReactionEmoji[] = ["🔥", "❤️", "🙏", "🎉"];
const MAX_THUMBNAILS = 3;
const BODY_TRUNCATE_LENGTH = 200;

// ─── Props ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

/**
 * Builds a nested comment tree from a flat array.
 * Top-level comments have parent_id === null.
 */
function buildCommentTree(comments: AnnouncementComment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();

  // First pass: create all nodes
  for (const c of comments) {
    map.set(c.id, {
      ...c,
      author: c.members ?? { first_name: "Unknown", last_name: "", avatar_url: null },
      replies: [],
    });
  }

  const roots: CommentNode[] = [];

  // Second pass: wire up parent → child relationships
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ─── Attachment Renderers ─────────────────────────────────────────────────────

function ImageGrid({ attachments }: { attachments: AnnouncementAttachment[] }) {
  const visible = attachments.slice(0, MAX_THUMBNAILS);
  const extra = attachments.length - MAX_THUMBNAILS;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((att) => (
        <a
          key={att.id}
          href={att.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 block"
          style={{ width: 80, height: 80 }}
        >
          <img
            src={att.url}
            alt={att.filename ?? "image"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </a>
      ))}
      {extra > 0 && (
        <div
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0"
          style={{ width: 80, height: 80 }}
        >
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 font-jakarta">
            +{extra}
          </span>
        </div>
      )}
    </div>
  );
}

function VideoPlayer({ attachment }: { attachment: AnnouncementAttachment }) {
  return (
    <video
      src={attachment.url}
      controls
      preload="metadata"
      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 max-h-64 bg-black"
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
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
    >
      <FileText className="h-4 w-4 text-red-500 shrink-0" />
      <span className="truncate max-w-[200px]">{attachment.filename ?? "Download PDF"}</span>
      <Download className="h-3.5 w-3.5 shrink-0 text-slate-400" />
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
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors max-w-full"
    >
      <ExternalLink className="h-4 w-4 text-blue-500 shrink-0" />
      <span className="truncate max-w-[240px]">{attachment.og_title ?? attachment.url}</span>
    </a>
  );
}

function AttachmentRenderer({ attachments }: { attachments: AnnouncementAttachment[] }) {
  if (!attachments.length) return null;

  const images = attachments.filter((a) => a.type === "image");
  const videos = attachments.filter((a) => a.type === "video");
  const pdfs = attachments.filter((a) => a.type === "pdf");
  const links = attachments.filter((a) => a.type === "link");

  return (
    <div className="space-y-3">
      {images.length > 0 && <ImageGrid attachments={images} />}
      {videos.map((v) => (
        <VideoPlayer key={v.id} attachment={v} />
      ))}
      {pdfs.map((p) => (
        <PdfChip key={p.id} attachment={p} />
      ))}
      {links.map((l) =>
        l.og_title || l.og_description || l.og_image_url ? (
          <OgCard key={l.id} attachment={l} />
        ) : (
          <LinkChip key={l.id} attachment={l} />
        )
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AnnouncementCardMember({
  announcement,
  currentMemberId,
  onReactionToggle,
  onAddComment,
}: AnnouncementCardMemberProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // Optimistic reaction counts
  const [optimisticReactions, setOptimisticReactions] = useState<AnnouncementReaction[]>(
    announcement.announcement_reactions ?? []
  );

  // Wire up read receipt
  useReadReceipt(announcement.id, cardRef as React.RefObject<HTMLElement>);

  const type = announcement.announcement_types;
  const color = type?.color ?? "#6366f1";

  // ── Body text ──
  const rawHtml = announcement.rich_body ?? "";
  const sanitizedHtml = rawHtml ? DOMPurify.sanitize(rawHtml) : "";
  const plainBody = rawHtml ? stripHtml(rawHtml) : (announcement.body ?? "");
  const isLong = plainBody.length > BODY_TRUNCATE_LENGTH;
  const truncatedBody = isLong ? plainBody.slice(0, BODY_TRUNCATE_LENGTH) + "…" : plainBody;

  // ── Reactions ──
  const reactionCounts = REACTION_EMOJIS.reduce<Record<string, number>>((acc, emoji) => {
    acc[emoji] = optimisticReactions.filter((r) => r.emoji === emoji).length;
    return acc;
  }, {} as Record<string, number>);

  const myReactions = new Set(
    optimisticReactions.filter((r) => r.member_id === currentMemberId).map((r) => r.emoji)
  );

  function handleReactionClick(emoji: ReactionEmoji) {
    const alreadyReacted = myReactions.has(emoji);

    // Optimistic update
    if (alreadyReacted) {
      setOptimisticReactions((prev) =>
        prev.filter((r) => !(r.member_id === currentMemberId && r.emoji === emoji))
      );
    } else {
      setOptimisticReactions((prev) => [
        ...prev,
        {
          id: `optimistic-${Date.now()}`,
          tenant_id: announcement.tenant_id,
          announcement_id: announcement.id,
          member_id: currentMemberId,
          emoji,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    onReactionToggle(announcement.id, emoji);
  }

  // ── Comments ──
  const commentTree = buildCommentTree(announcement.announcement_comments ?? []);
  const commentCount = (announcement.announcement_comments ?? []).filter(
    (c) => !c.is_deleted
  ).length;

  const createdAt = announcement.created_at
    ? formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })
    : "";

  return (
    <div
      ref={cardRef}
      className="font-jakarta rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-5"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      {/* ── Header: type badge + timestamp ── */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {type && (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${color}1a`,
                color: color,
              }}
            >
              {type.label}
            </span>
          )}
          {announcement.is_pinned && (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Pinned
            </span>
          )}
        </div>
        {createdAt && (
          <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{createdAt}</span>
        )}
      </div>

      {/* ── Title ── */}
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-jakarta mb-2 leading-snug">
        {announcement.title}
      </h3>

      {/* ── Body (collapsed) ── */}
      {!expanded && (
        <p className="text-sm text-slate-600 dark:text-slate-400 font-jakarta leading-relaxed mb-2">
          {truncatedBody}
        </p>
      )}

      {/* ── Body (expanded with animation) ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {sanitizedHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 mb-2"
              />
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400 font-jakarta leading-relaxed mb-2">
                {plainBody}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Read more / Read less toggle ── */}
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-orange-500 hover:text-orange-600 text-sm font-medium mb-3 block"
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}

      {/* ── Attachments ── */}
      {(announcement.announcement_attachments ?? []).length > 0 && (
        <div className="mb-4">
          <AttachmentRenderer attachments={announcement.announcement_attachments} />
        </div>
      )}

      {/* ── Reactions ── */}
      {announcement.reactions_enabled && (
        <div className="flex flex-wrap gap-2 mb-3">
          {REACTION_EMOJIS.map((emoji) => (
            <ReactionChip
              key={emoji}
              emoji={emoji}
              count={reactionCounts[emoji] ?? 0}
              isActive={myReactions.has(emoji)}
              onClick={() => handleReactionClick(emoji)}
            />
          ))}
        </div>
      )}

      {/* ── Comments toggle ── */}
      {announcement.comments_enabled && (
        <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
          <button
            onClick={() => setCommentsOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Comments ({commentCount})
            {commentsOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          <AnimatePresence>
            {commentsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3">
                  <CommentThread
                    comments={commentTree}
                    currentMemberId={currentMemberId}
                    onAddComment={(body, parentId) =>
                      onAddComment(announcement.id, body, parentId)
                    }
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
