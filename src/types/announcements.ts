// ─── Union Types ──────────────────────────────────────────────────────────────

export type AnnouncementAudience = "all" | "specific_group" | "leaders_only";
export type AnnouncementStatus = "active" | "scheduled" | "archived" | "draft";
export type AnnouncementAttachmentType = "image" | "video" | "pdf" | "file" | "link";
export type ReactionEmoji = "🔥" | "❤️" | "🙏" | "🎉";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface AnnouncementType {
  id: string;
  tenant_id: string;
  label: string;
  description: string | null;
  color: string;
  icon: string;
  is_default: boolean;
  is_active: boolean;
  order: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

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
  // Joined fields
  members?: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export interface ReadReceipt {
  id: string;
  tenant_id: string;
  announcement_id: string;
  member_id: string;
  read_at: string;
  // Joined fields
  members?: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

// ─── Extended types for joined queries ───────────────────────────────────────

export interface AnnouncementWithRelations extends Announcement {
  announcement_types: Pick<AnnouncementType, "label" | "color" | "icon"> | null;
  announcement_attachments: AnnouncementAttachment[];
  announcement_reactions?: AnnouncementReaction[];
  announcement_comments?: AnnouncementComment[];
}

// ─── Comment tree node (for nested rendering) ────────────────────────────────

export interface CommentNode extends AnnouncementComment {
  author: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  replies: CommentNode[];
}

// ─── Attachment preview item (for dropzone) ──────────────────────────────────

export interface AttachmentPreviewItem {
  type: AnnouncementAttachmentType;
  file?: File;
  url?: string;
  filename?: string;
  sizeBytes?: number;
  mimeType?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  previewUrl?: string;
  uploadStatus: "pending" | "uploading" | "done" | "error";
}
