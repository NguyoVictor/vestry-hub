import { useRef, useState, useCallback, DragEvent, ChangeEvent } from "react";
import {
  Image,
  Video,
  FileText,
  File,
  Link as LinkIcon,
  X,
  Upload,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AttachmentPreviewItem, AnnouncementAttachmentType } from "@/types/announcements";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const ACCEPTED_MIME_TYPES: Record<string, AnnouncementAttachmentType> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
  "application/pdf": "pdf",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface AttachmentDropzoneProps {
  tenantId: string;
  announcementId: string;
  attachments: AttachmentPreviewItem[];
  onChange: (attachments: AttachmentPreviewItem[]) => void;
}

// ─── OG Metadata ─────────────────────────────────────────────────────────────

interface OGMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
}

async function fetchOGMetadata(url: string): Promise<OGMetadata | null> {
  try {
    const { data, error } = await supabase.functions.invoke("fetch-og-metadata", {
      body: { url },
    });
    if (error || !data) return null;
    return data as OGMetadata;
  } catch {
    return null;
  }
}

// ─── Attachment Preview Item ──────────────────────────────────────────────────

interface AttachmentItemProps {
  item: AttachmentPreviewItem;
  onRemove: () => void;
}

function AttachmentItem({ item, onRemove }: AttachmentItemProps) {
  const isUploading = item.uploadStatus === "uploading";
  const isError = item.uploadStatus === "error";

  return (
    <div
      className={cn(
        "font-jakarta relative flex items-start gap-3 rounded-lg border p-3 bg-white dark:bg-slate-800 transition-colors",
        isError
          ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10"
          : "border-slate-200 dark:border-slate-700"
      )}
    >
      {/* ── Image preview ─────────────────────────────────────────────────── */}
      {item.type === "image" && item.previewUrl && (
        <img
          src={item.previewUrl}
          alt={item.filename ?? "image"}
          className="h-20 w-20 rounded-md object-cover shrink-0 border border-slate-200 dark:border-slate-700"
        />
      )}

      {/* ── Video chip ────────────────────────────────────────────────────── */}
      {item.type === "video" && (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
          <Video className="h-8 w-8 text-slate-400" />
        </div>
      )}

      {/* ── PDF chip ──────────────────────────────────────────────────────── */}
      {item.type === "pdf" && (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
          <FileText className="h-8 w-8 text-red-400" />
        </div>
      )}

      {/* ── Generic file chip ─────────────────────────────────────────────── */}
      {item.type === "file" && (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
          <File className="h-8 w-8 text-slate-400" />
        </div>
      )}

      {/* ── Link OG card ──────────────────────────────────────────────────── */}
      {item.type === "link" && (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700">
          {item.ogImageUrl ? (
            <img
              src={item.ogImageUrl}
              alt={item.ogTitle ?? "link preview"}
              className="h-full w-full object-cover"
            />
          ) : (
            <LinkIcon className="h-8 w-8 text-slate-400" />
          )}
        </div>
      )}

      {/* ── Text info ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
          {item.type === "link"
            ? (item.ogTitle ?? item.url ?? "Link")
            : (item.filename ?? "File")}
        </p>

        {item.type === "link" && item.ogDescription && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
            {item.ogDescription}
          </p>
        )}

        {item.type === "link" && item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-orange-500 hover:underline mt-1"
          >
            <ExternalLink className="h-3 w-3" />
            {item.url.length > 40 ? `${item.url.slice(0, 40)}…` : item.url}
          </a>
        )}

        {item.type !== "link" && item.sizeBytes != null && (
          <p className="text-xs text-slate-400 mt-0.5">
            {(item.sizeBytes / (1024 * 1024)).toFixed(1)} MB
          </p>
        )}

        {isError && (
          <p className="text-xs text-red-500 mt-0.5">Upload failed</p>
        )}
      </div>

      {/* ── Status / remove ───────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1">
        {isUploading && (
          <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
        )}
        <button
          type="button"
          onClick={onRemove}
          className="h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          aria-label="Remove attachment"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AttachmentDropzone({
  tenantId,
  announcementId,
  attachments,
  onChange,
}: AttachmentDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [fetchingOG, setFetchingOG] = useState(false);

  // ── File processing ─────────────────────────────────────────────────────────

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newItems: AttachmentPreviewItem[] = [];

      for (const file of fileArray) {
        // Enforce 50 MB limit
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(`"${file.name}" exceeds 50 MB limit`);
          continue;
        }

        const mimeType = file.type;
        const attachmentType: AnnouncementAttachmentType =
          ACCEPTED_MIME_TYPES[mimeType] ?? "file";

        const item: AttachmentPreviewItem = {
          type: attachmentType,
          file,
          filename: file.name,
          sizeBytes: file.size,
          mimeType,
          uploadStatus: "pending",
        };

        // Generate object URL for image previews
        if (attachmentType === "image") {
          item.previewUrl = URL.createObjectURL(file);
        }

        newItems.push(item);
      }

      if (newItems.length === 0) return;

      // Add items to state first (pending), then upload
      const updatedAttachments = [...attachments, ...newItems];
      onChange(updatedAttachments);

      // Upload each file
      for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i];
        if (!item.file) continue;

        const globalIndex = attachments.length + i;

        // Mark as uploading
        onChange(
          updatedAttachments.map((a, idx) =>
            idx === globalIndex ? { ...a, uploadStatus: "uploading" } : a
          )
        );

        const uploadPath = `announcements/${tenantId}/${announcementId}/${Date.now()}-${item.file.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("announcements-media")
          .upload(uploadPath, item.file, { upsert: false });

        if (uploadError) {
          toast.error(`Failed to upload "${item.filename}"`);
          onChange(
            updatedAttachments.map((a, idx) =>
              idx === globalIndex ? { ...a, uploadStatus: "error" } : a
            )
          );
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("announcements-media")
          .getPublicUrl(uploadData.path);

        onChange(
          updatedAttachments.map((a, idx) =>
            idx === globalIndex
              ? { ...a, url: urlData.publicUrl, uploadStatus: "done" }
              : a
          )
        );
      }
    },
    [attachments, onChange, tenantId, announcementId]
  );

  // ── Drag & drop handlers ────────────────────────────────────────────────────

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // ── File input handler ──────────────────────────────────────────────────────

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    }
  };

  // ── Link attachment handler ─────────────────────────────────────────────────

  const handleAddLink = async () => {
    const url = linkUrl.trim();
    if (!url) return;

    // Prepend https:// if missing
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    setFetchingOG(true);

    const og = await fetchOGMetadata(normalizedUrl);

    const linkItem: AttachmentPreviewItem = {
      type: "link",
      url: normalizedUrl,
      filename: normalizedUrl,
      ogTitle: og?.title,
      ogDescription: og?.description,
      ogImageUrl: og?.imageUrl,
      uploadStatus: "done",
    };

    onChange([...attachments, linkItem]);
    setLinkUrl("");
    setFetchingOG(false);
  };

  const handleLinkKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddLink();
    }
  };

  // ── Remove handler ──────────────────────────────────────────────────────────

  const handleRemove = (index: number) => {
    const item = attachments[index];
    // Revoke object URL to avoid memory leaks
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    onChange(attachments.filter((_, i) => i !== index));
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="font-jakarta space-y-3">
      {/* ── Drop zone ─────────────────────────────────────────────────────── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-all duration-200",
          isDragging
            ? "border-orange-400 bg-orange-50 dark:bg-orange-900/10"
            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-900/5"
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            isDragging
              ? "bg-orange-100 dark:bg-orange-900/30"
              : "bg-slate-100 dark:bg-slate-700"
          )}
        >
          <Upload
            className={cn(
              "h-5 w-5 transition-colors",
              isDragging ? "text-orange-500" : "text-slate-400"
            )}
          />
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Drop files here or{" "}
            <span className="text-orange-500 hover:text-orange-600">browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Images, videos, PDFs, files — max 50 MB each
          </p>
        </div>

        {/* Type icons row */}
        <div className="flex items-center gap-3 mt-1">
          {[
            { icon: Image, label: "Images", color: "text-blue-400" },
            { icon: Video, label: "Videos", color: "text-purple-400" },
            { icon: FileText, label: "PDFs", color: "text-red-400" },
            { icon: File, label: "Files", color: "text-slate-400" },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <Icon className={cn("h-4 w-4", color)} />
              <span className="text-[10px] text-slate-400">{label}</span>
            </div>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,application/pdf,*/*"
          className="sr-only"
          onChange={handleFileInputChange}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* ── Link input ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            type="url"
            placeholder="Paste a link URL…"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={handleLinkKeyDown}
            className="pl-9 h-9 text-sm border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 font-jakarta"
            disabled={fetchingOG}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddLink}
          disabled={!linkUrl.trim() || fetchingOG}
          className="h-9 shrink-0 border-slate-200 dark:border-slate-700 font-jakarta text-sm"
        >
          {fetchingOG ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Add Link"
          )}
        </Button>
      </div>

      {/* ── Attachment previews ───────────────────────────────────────────── */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((item, index) => (
            <AttachmentItem
              key={`${item.filename ?? item.url}-${index}`}
              item={item}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
