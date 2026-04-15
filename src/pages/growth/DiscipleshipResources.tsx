import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  BookOpen, FileText, Video, Link as LinkIcon, GraduationCap,
  Search, Plus, Trash2, Upload, FolderOpen, Eye, Download, X,
  CheckCircle2, MoreVertical, Pencil,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ResourceType = "document" | "video" | "link" | "lesson";

interface Resource {
  id: string;
  title: string;
  description?: string | null;
  resource_type: ResourceType;
  type?: string | null;
  file_url?: string | null;
  external_url?: string | null;
  video_url?: string | null;
  lesson_content?: string | null;
  category_id?: string | null;
  duration_minutes?: number | null;
  sequence_order?: number;
  is_required?: boolean;
  is_published?: boolean;
  tenant_id: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  tenant_id: string;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
const DOC_ACCEPT    = ".pdf,.doc,.docx,.ppt,.pptx";
const VIDEO_ACCEPT  = ".mp4,.webm,.mov";
const LESSON_ACCEPT = ".pdf,.doc,.docx,.mp4,.webm,.mov,.jpg,.jpeg,.png,.webp";

function bucketForFile(file: File): "resources" | "church-video" {
  return file.type.startsWith("video/") ? "church-video" : "resources";
}

// Store path as  "tenantId/timestamp-random.ext|originalName"  so we can
// recover the original filename for downloads without a DB column.
async function uploadFile(
  file: File,
  tenantId: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const bucket = bucketForFile(file);
  const ext     = file.name.split(".").pop();
  const storagePath = `${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  onProgress?.(30);
  const { error } = await supabase.storage.from(bucket).upload(storagePath, file, { upsert: false });
  if (error) throw error;
  onProgress?.(100);

  if (bucket === "church-video") {
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    // Embed original name after a pipe so we can extract it later
    return `${data.publicUrl}|${file.name}`;
  }
  // Private bucket: store "path|originalName"
  return `${storagePath}|${file.name}`;
}

/** Split stored value into { url/path, originalName } */
function parseStoredUrl(stored: string): { value: string; originalName: string } {
  const idx = stored.lastIndexOf("|");
  if (idx === -1) return { value: stored, originalName: "download" };
  return { value: stored.slice(0, idx), originalName: stored.slice(idx + 1) };
}

/** Resolve a stored file_url / video_url to a viewable URL */
async function resolveUrl(stored: string, bucket: "resources" | "church-video" = "resources"): Promise<string | null> {
  const { value } = parseStoredUrl(stored);
  if (value.startsWith("http")) return value;
  // Private path — generate signed URL
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(value, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Trigger a named download without opening a new tab */
async function downloadFile(stored: string, fallbackName: string, bucket: "resources" | "church-video" = "resources") {
  const { value, originalName } = parseStoredUrl(stored);
  let href: string;

  if (value.startsWith("http")) {
    href = value;
  } else {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(value, 3600);
    if (error || !data) { toast.error("Could not generate download link"); return; }
    href = data.signedUrl;
  }

  const a = document.createElement("a");
  a.href = href;
  a.download = originalName || fallbackName;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_META: Record<ResourceType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  document: { label: "Document", icon: FileText,     color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20" },
  video:    { label: "Video",    icon: Video,         color: "text-red-500",     bg: "bg-red-50 dark:bg-red-900/20" },
  link:     { label: "Link",     icon: LinkIcon,      color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  lesson:   { label: "Lesson",   icon: GraduationCap, color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-900/20" },
};

const LEGACY_TYPE: Record<ResourceType, string> = {
  document: "document", video: "video", link: "external_link", lesson: "document",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  resource_type: "document" as ResourceType,
  file_url: "",
  external_url: "",
  video_url: "",
  lesson_content: "",
  category_id: "",
  duration_minutes: "" as string | number,
  sequence_order: 0,
  is_required: false,
  is_published: true,
};

// ─── Upload Drop Zone ─────────────────────────────────────────────────────────
interface DropZoneProps {
  accept: string; label: string; hint: string; icon: React.ElementType;
  file: File | null; uploading: boolean; progress: number; error?: string;
  onFile: (f: File) => void; onClear: () => void;
}
function DropZone({ accept, label, hint, icon: Icon, file, uploading, progress, error, onFile, onClear }: DropZoneProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) onFile(f);
  }
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {file ? (
        <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm flex-1 truncate">{file.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            {!uploading && <button onClick={onClear} className="text-slate-400 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>}
          </div>
          {uploading && (
            <div className="mt-2 space-y-1">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground">{progress < 100 ? `Uploading… ${progress}%` : "Processing…"}</p>
            </div>
          )}
          {!uploading && progress === 100 && (
            <div className="flex items-center gap-1 mt-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-emerald-600">Uploaded</span>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => ref.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${dragging ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/10" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
        >
          <Icon className="h-6 w-6 mx-auto mb-2 text-slate-400" />
          <p className="text-sm text-muted-foreground">{hint}</p>
          <input ref={ref} type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Resource Card ────────────────────────────────────────────────────────────
interface CardProps {
  resource: Resource;
  categoryName?: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
function ResourceItemCard({ resource, categoryName, onView, onEdit, onDelete }: CardProps) {
  const meta = TYPE_META[resource.resource_type] || TYPE_META.document;
  const Icon = meta.icon;

  // Determine which stored field holds the file
  const storedFile = resource.file_url || null;
  const storedVideo = resource.video_url || null;
  const storedLink = resource.external_url || null;
  const hasDownloadable = !!(storedFile || storedVideo);
  const isLink = resource.resource_type === "link" && storedLink;

  async function handleView() {
    // For links just open the URL
    if (isLink) { window.open(storedLink!, "_blank"); return; }
    // For video URL (YouTube/Vimeo) open in new tab
    if (storedVideo) {
      const url = await resolveUrl(storedVideo, "church-video");
      if (url) window.open(url, "_blank");
      return;
    }
    // For files open inline (view, not download)
    if (storedFile) {
      const url = await resolveUrl(storedFile, "resources");
      if (url) window.open(url, "_blank");
      else toast.error("Could not open file");
    }
  }

  async function handleDownload() {
    if (storedVideo) {
      await downloadFile(storedVideo, resource.title, "church-video");
    } else if (storedFile) {
      await downloadFile(storedFile, resource.title, "resources");
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${meta.bg}`}>
          <Icon className={`h-5 w-5 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm text-foreground line-clamp-1">{resource.title}</h3>
            {!resource.is_published && <Badge variant="outline" className="text-xs text-slate-400">Draft</Badge>}
          </div>
          {resource.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{resource.description}</p>
          )}
        </div>
        {/* ⋮ menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-0.5 rounded">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="gap-2 cursor-pointer text-red-600 focus:text-red-600">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="text-xs capitalize">{meta.label}</Badge>
        {categoryName && <Badge variant="outline" className="text-xs">{categoryName}</Badge>}
        {resource.duration_minutes && <Badge variant="outline" className="text-xs">{resource.duration_minutes} min</Badge>}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={handleView}>
          <Eye className="h-3.5 w-3.5" />
          {isLink ? "Open Link" : "View"}
        </Button>
        {hasDownloadable && (
          <Button size="sm" variant="outline" className="gap-1.5 px-3" onClick={handleDownload} title="Download">
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Resource Form (shared by Create + Edit) ──────────────────────────────────
interface ResourceFormProps {
  form: typeof EMPTY_FORM;
  formErrors: Record<string, string>;
  categories: Category[];
  docFile: File | null; videoFile: File | null; lessonFile: File | null;
  uploading: boolean; uploadProgress: Record<string, number>;
  setField: <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) => void;
  setDocFile: (f: File | null) => void;
  setVideoFile: (f: File | null) => void;
  setLessonFile: (f: File | null) => void;
  setUploadProgress: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}
function ResourceForm({
  form, formErrors, categories,
  docFile, videoFile, lessonFile, uploading, uploadProgress,
  setField, setDocFile, setVideoFile, setLessonFile, setUploadProgress,
}: ResourceFormProps) {
  return (
    <div className="space-y-5">
      {/* Type selector */}
      <div className="space-y-2">
        <Label>Resource Type</Label>
        <div className="grid grid-cols-4 gap-2">
          {(["document", "video", "link", "lesson"] as ResourceType[]).map(t => {
            const meta = TYPE_META[t]; const Icon = meta.icon; const active = form.resource_type === t;
            return (
              <button key={t} type="button"
                onClick={() => { setField("resource_type", t); setDocFile(null); setVideoFile(null); setLessonFile(null); setUploadProgress({}); }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors text-sm font-medium
                  ${active ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"}`}
              >
                <Icon className="h-5 w-5" />{meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label>Title <span className="text-red-500">*</span></Label>
        <Input placeholder="Resource title" value={form.title} onChange={e => setField("title", e.target.value)} className={formErrors.title ? "border-red-400" : ""} />
        {formErrors.title && <p className="text-xs text-red-500">{formErrors.title}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea placeholder="Brief description of this resource" value={form.description} onChange={e => setField("description", e.target.value)} rows={3} />
      </div>

      {/* Document */}
      {form.resource_type === "document" && (
        <DropZone accept={DOC_ACCEPT} label="Upload Document" hint="Click or drag to upload PDF, Word, or PowerPoint"
          icon={FileText} file={docFile} uploading={uploading} progress={uploadProgress.doc ?? 0}
          onFile={setDocFile} onClear={() => { setDocFile(null); setUploadProgress(u => ({ ...u, doc: 0 })); }} />
      )}

      {/* Video */}
      {form.resource_type === "video" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Video URL</Label>
            <Input placeholder="YouTube or Vimeo URL" value={form.video_url} onChange={e => setField("video_url", e.target.value)}
              className={formErrors.video_url ? "border-red-400" : ""} disabled={!!videoFile} />
            <p className="text-xs text-muted-foreground">Paste a YouTube or Vimeo link</p>
            {formErrors.video_url && <p className="text-xs text-red-500">{formErrors.video_url}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>
          <DropZone accept={VIDEO_ACCEPT} label="Upload Video File" hint="Click or drag to upload MP4, WebM, or MOV (max 100MB)"
            icon={Video} file={videoFile} uploading={uploading} progress={uploadProgress.video ?? 0}
            onFile={f => { setVideoFile(f); setField("video_url", ""); }}
            onClear={() => { setVideoFile(null); setUploadProgress(u => ({ ...u, video: 0 })); }} />
        </div>
      )}

      {/* Link */}
      {form.resource_type === "link" && (
        <div className="space-y-1.5">
          <Label>External URL <span className="text-red-500">*</span></Label>
          <Input placeholder="https://..." value={form.external_url} onChange={e => setField("external_url", e.target.value)}
            className={formErrors.external_url ? "border-red-400" : ""} />
          {formErrors.external_url && <p className="text-xs text-red-500">{formErrors.external_url}</p>}
        </div>
      )}

      {/* Lesson */}
      {form.resource_type === "lesson" && (
        <>
          <div className="space-y-1.5">
            <Label>Lesson Content</Label>
            <Textarea placeholder="Write your lesson content here..." value={form.lesson_content} onChange={e => setField("lesson_content", e.target.value)} rows={5} />
          </div>
          <DropZone accept={LESSON_ACCEPT} label="Attach File or Video" hint="Upload PDF, document, video, or image — max 100MB"
            icon={Upload} file={lessonFile} uploading={uploading} progress={uploadProgress.lesson ?? 0}
            onFile={setLessonFile} onClear={() => { setLessonFile(null); setUploadProgress(u => ({ ...u, lesson: 0 })); }} />
        </>
      )}

      {/* Category + Duration */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={form.category_id || "none"} onValueChange={v => setField("category_id", v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="No category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Duration (minutes)</Label>
          <Input type="number" placeholder="Optional" value={form.duration_minutes} onChange={e => setField("duration_minutes", e.target.value)} min={0}
            className={formErrors.duration_minutes ? "border-red-400" : ""} />
          {formErrors.duration_minutes && <p className="text-xs text-red-500">{formErrors.duration_minutes}</p>}
        </div>
      </div>

      {/* Sequence order */}
      <div className="space-y-1.5">
        <Label>Sequence Order</Label>
        <Input type="number" value={form.sequence_order} onChange={e => setField("sequence_order", Number(e.target.value))} min={0} />
      </div>

      {/* Toggles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch checked={form.is_required} onCheckedChange={v => setField("is_required", v)} />
          <Label className="cursor-pointer">Required for completion</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_published} onCheckedChange={v => setField("is_published", v)} />
          <Label className="cursor-pointer">Published</Label>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DiscipleshipResources() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();

  const [categoriesOpen, setCategoriesOpen]   = useState(false);
  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [editResource, setEditResource]       = useState<Resource | null>(null);
  const [viewResource, setViewResource]       = useState<Resource | null>(null);
  const [deleteTarget, setDeleteTarget]       = useState<Resource | null>(null);
  const [search, setSearch]                   = useState("");
  const [typeFilter, setTypeFilter]           = useState("all");
  const [categoryFilter, setCategoryFilter]   = useState("all");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [form, setForm]                       = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors]           = useState<Record<string, string>>({});
  const [docFile, setDocFile]                 = useState<File | null>(null);
  const [videoFile, setVideoFile]             = useState<File | null>(null);
  const [lessonFile, setLessonFile]           = useState<File | null>(null);
  const [uploadProgress, setUploadProgress]   = useState<Record<string, number>>({});
  const [uploading, setUploading]             = useState(false);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["discipleship-resources", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.DISCIPLESHIP_RESOURCES).select("*")
        .eq(COLS.TENANT_ID, tenantId).order("sequence_order", { ascending: true }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Resource[];
    },
    enabled: !!tenantId, staleTime: 300000,
  });

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ["resource-categories", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("resource_categories").select("*")
        .eq(COLS.TENANT_ID, tenantId).order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as Category[];
    },
    enabled: !!tenantId, staleTime: 300000,
  });

  const stats = {
    total:     resources.length,
    documents: resources.filter(r => r.resource_type === "document").length,
    videos:    resources.filter(r => r.resource_type === "video").length,
    lessons:   resources.filter(r => r.resource_type === "lesson").length,
  };

  const filtered = resources.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter === "all" || r.resource_type === typeFilter;
    const matchCat    = categoryFilter === "all" || r.category_id === categoryFilter;
    return matchSearch && matchType && matchCat;
  });

  // ─── Category mutations ──────────────────────────────────────────────────────
  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("resource_categories").insert({ name: name.trim(), tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["resource-categories", tenantId] }); setNewCategoryName(""); toast.success("Category added"); },
    onError: () => toast.error("Failed to add category"),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resource_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["resource-categories", tenantId] }); toast.success("Category removed"); },
    onError: () => toast.error("Failed to remove category"),
  });

  // ─── Validation ─────────────────────────────────────────────────────────────
  function validate() {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Title is required";
    else if (form.title.trim().length < 3) errors.title = "Title must be at least 3 characters";
    if (form.resource_type === "link") {
      if (!form.external_url.trim()) errors.external_url = "A URL is required for link resources";
      else if (!/^https?:\/\/.+/.test(form.external_url.trim())) errors.external_url = "Must be a valid URL starting with http:// or https://";
    }
    if (form.resource_type === "video" && !form.video_url.trim() && !videoFile) errors.video_url = "Provide a YouTube/Vimeo URL or upload a video file";
    if (form.resource_type === "video" && form.video_url.trim() && !/^https?:\/\/.+/.test(form.video_url.trim())) errors.video_url = "Must be a valid URL starting with http:// or https://";
    if (form.duration_minutes !== "" && Number(form.duration_minutes) < 0) errors.duration_minutes = "Duration cannot be negative";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) toast.error("Please fix the highlighted fields before saving");
    return Object.keys(errors).length === 0;
  }

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm(f => ({ ...f, [key]: value }));
    if (formErrors[key]) setFormErrors(e => ({ ...e, [key]: "" }));
  }

  function resetForm() {
    setForm({ ...EMPTY_FORM }); setFormErrors({});
    setDocFile(null); setVideoFile(null); setLessonFile(null); setUploadProgress({});
  }

  function openEdit(r: Resource) {
    setForm({
      title:            r.title,
      description:      r.description || "",
      resource_type:    r.resource_type,
      file_url:         r.file_url || "",
      external_url:     r.external_url || "",
      video_url:        r.video_url || "",
      lesson_content:   r.lesson_content || "",
      category_id:      r.category_id || "",
      duration_minutes: r.duration_minutes ?? "",
      sequence_order:   r.sequence_order ?? 0,
      is_required:      r.is_required ?? false,
      is_published:     r.is_published ?? true,
    });
    setFormErrors({});
    setDocFile(null); setVideoFile(null); setLessonFile(null); setUploadProgress({});
    setEditResource(r);
  }

  // ─── Build payload (shared by create + update) ───────────────────────────────
  async function buildPayload(): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {
      title:            form.title.trim(),
      description:      form.description.trim() || null,
      resource_type:    form.resource_type,
      type:             LEGACY_TYPE[form.resource_type],
      category_id:      form.category_id || null,
      sequence_order:   Number(form.sequence_order) || 0,
      duration_minutes: form.duration_minutes !== "" ? Number(form.duration_minutes) : null,
      is_required:      form.is_required,
      is_published:     form.is_published,
    };

    if (form.resource_type === "document") {
      if (docFile) payload.file_url = await uploadFile(docFile, tenantId, p => setUploadProgress(u => ({ ...u, doc: p })));
      else payload.file_url = form.file_url || null;
    }
    if (form.resource_type === "video") {
      if (videoFile) payload.video_url = await uploadFile(videoFile, tenantId, p => setUploadProgress(u => ({ ...u, video: p })));
      else payload.video_url = form.video_url || null;
    }
    if (form.resource_type === "link") payload.external_url = form.external_url || null;
    if (form.resource_type === "lesson") {
      payload.lesson_content = form.lesson_content || null;
      if (lessonFile) payload.file_url = await uploadFile(lessonFile, tenantId, p => setUploadProgress(u => ({ ...u, lesson: p })));
      else payload.file_url = form.file_url || null;
    }
    return payload;
  }

  // ─── Create ──────────────────────────────────────────────────────────────────
  const createResource = useMutation({
    mutationFn: async () => {
      setUploading(true);
      try {
        const payload = await buildPayload();
        payload.tenant_id = tenantId;
        const { error } = await supabase.from(TABLES.DISCIPLESHIP_RESOURCES).insert(payload);
        if (error) throw error;
      } finally { setUploading(false); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipleship-resources", tenantId] });
      setAddResourceOpen(false); resetForm();
      toast.success("Resource created successfully");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create resource"),
  });

  // ─── Update ──────────────────────────────────────────────────────────────────
  const updateResource = useMutation({
    mutationFn: async () => {
      if (!editResource) return;
      setUploading(true);
      try {
        const payload = await buildPayload();
        const { error } = await supabase.from(TABLES.DISCIPLESHIP_RESOURCES).update(payload).eq(COLS.ID, editResource.id);
        if (error) throw error;
      } finally { setUploading(false); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipleship-resources", tenantId] });
      setEditResource(null); resetForm();
      toast.success("Resource updated");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update resource"),
  });

  // ─── Delete ──────────────────────────────────────────────────────────────────
  const deleteResource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.DISCIPLESHIP_RESOURCES).delete().eq(COLS.ID, id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipleship-resources", tenantId] });
      setDeleteTarget(null);
      toast.success("Resource deleted");
    },
    onError: () => toast.error("Failed to delete resource"),
  });

  function handleSubmit() { if (validate()) createResource.mutate(); }
  function handleUpdate() { if (validate()) updateResource.mutate(); }

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
  return (
    <>
      <Helmet><title>Discipleship Resources — Vestry</title></Helmet>

      <PageHeader
        title="Learning & Growth Library"
        subtitle="Organise, publish and share discipleship materials with your congregation"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
              <FolderOpen className="h-4 w-4 mr-1.5" />Categories
            </Button>
            <Button onClick={() => setAddResourceOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Add Resource
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Resources", value: stats.total,     icon: BookOpen,      color: "indigo" },
          { label: "Documents",       value: stats.documents, icon: FileText,      color: "blue" },
          { label: "Videos",          value: stats.videos,    icon: Video,         color: "red" },
          { label: "Lessons",         value: stats.lessons,   icon: GraduationCap, color: "violet" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-900/30 shrink-0`}>
                <Icon className={`h-5 w-5 text-${color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="link">Links</SelectItem>
            <SelectItem value="lesson">Lessons</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Resource Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-base">No resources found</p>
          <p className="text-sm mt-1">Add your first resource to get started</p>
          <Button className="mt-4" onClick={() => setAddResourceOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Create First Resource
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <ResourceItemCard
              key={r.id} resource={r}
              categoryName={r.category_id ? categoryMap[r.category_id] : undefined}
              onView={() => setViewResource(r)}
              onEdit={() => openEdit(r)}
              onDelete={() => setDeleteTarget(r)}
            />
          ))}
        </div>
      )}

      {/* ── Manage Categories ── */}
      <Dialog open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Manage Categories</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex gap-2">
              <Input placeholder="New category name" value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && newCategoryName.trim()) createCategory.mutate(newCategoryName); }}
                className="flex-1" />
              <Button size="icon" className="bg-orange-400 hover:bg-orange-500 text-white shrink-0"
                disabled={!newCategoryName.trim() || createCategory.isPending}
                onClick={() => createCategory.mutate(newCategoryName)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {catLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            ) : categories.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No categories yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {categories.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-sm font-medium">{c.name}</span>
                    <button className="text-slate-400 hover:text-red-500 transition-colors" onClick={() => deleteCategory.mutate(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create Resource ── */}
      <Dialog open={addResourceOpen} onOpenChange={o => { setAddResourceOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Resource</DialogTitle></DialogHeader>
          <div className="mt-2">
            <ResourceForm
              form={form} formErrors={formErrors} categories={categories}
              docFile={docFile} videoFile={videoFile} lessonFile={lessonFile}
              uploading={uploading} uploadProgress={uploadProgress}
              setField={setField} setDocFile={setDocFile} setVideoFile={setVideoFile}
              setLessonFile={setLessonFile} setUploadProgress={setUploadProgress}
            />
            <div className="flex gap-3 pt-5">
              <Button variant="outline" className="flex-1" onClick={() => { setAddResourceOpen(false); resetForm(); }} disabled={uploading}>Cancel</Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSubmit} disabled={createResource.isPending || uploading}>
                {uploading ? "Uploading…" : createResource.isPending ? "Creating…" : "Create Resource"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Resource ── */}
      <Dialog open={!!editResource} onOpenChange={o => { if (!o) { setEditResource(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Resource</DialogTitle></DialogHeader>
          <div className="mt-2">
            <ResourceForm
              form={form} formErrors={formErrors} categories={categories}
              docFile={docFile} videoFile={videoFile} lessonFile={lessonFile}
              uploading={uploading} uploadProgress={uploadProgress}
              setField={setField} setDocFile={setDocFile} setVideoFile={setVideoFile}
              setLessonFile={setLessonFile} setUploadProgress={setUploadProgress}
            />
            <div className="flex gap-3 pt-5">
              <Button variant="outline" className="flex-1" onClick={() => { setEditResource(null); resetForm(); }} disabled={uploading}>Cancel</Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleUpdate} disabled={updateResource.isPending || uploading}>
                {uploading ? "Uploading…" : updateResource.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Resource ── */}
      <Dialog open={!!viewResource} onOpenChange={o => { if (!o) setViewResource(null); }}>
        <DialogContent className="max-w-lg">
          {viewResource && (() => {
            const meta = TYPE_META[viewResource.resource_type] || TYPE_META.document;
            const Icon = meta.icon;
            const storedFile  = viewResource.file_url || null;
            const storedVideo = viewResource.video_url || null;
            const storedLink  = viewResource.external_url || null;
            const hasDownloadable = !!(storedFile || storedVideo);

            async function handleView() {
              if (storedLink) { window.open(storedLink, "_blank"); return; }
              if (storedVideo) {
                const url = await resolveUrl(storedVideo, "church-video");
                if (url) window.open(url, "_blank"); else toast.error("Could not open video");
                return;
              }
              if (storedFile) {
                const url = await resolveUrl(storedFile, "resources");
                if (url) window.open(url, "_blank"); else toast.error("Could not open file");
              }
            }

            async function handleDownload() {
              if (storedVideo) await downloadFile(storedVideo, viewResource.title, "church-video");
              else if (storedFile) await downloadFile(storedFile, viewResource.title, "resources");
            }

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-md ${meta.bg}`}><Icon className={`h-4 w-4 ${meta.color}`} /></span>
                    {viewResource.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  {viewResource.description && <p className="text-sm text-muted-foreground">{viewResource.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{meta.label}</Badge>
                    {viewResource.category_id && categoryMap[viewResource.category_id] && (
                      <Badge variant="outline">{categoryMap[viewResource.category_id]}</Badge>
                    )}
                    {viewResource.duration_minutes && <Badge variant="outline">{viewResource.duration_minutes} min</Badge>}
                    {viewResource.is_required && <Badge className="bg-amber-100 text-amber-700">Required</Badge>}
                    {!viewResource.is_published && <Badge variant="outline" className="text-slate-400">Draft</Badge>}
                  </div>
                  {viewResource.lesson_content && (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {viewResource.lesson_content}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {(storedFile || storedVideo || storedLink) && (
                      <Button variant="outline" className="flex-1 gap-2" onClick={handleView}>
                        <Eye className="h-4 w-4" />
                        {storedLink ? "Open Link" : "View File"}
                      </Button>
                    )}
                    {hasDownloadable && (
                      <Button variant="outline" className="gap-2 px-4" onClick={handleDownload} title="Download">
                        <Download className="h-4 w-4" /> Download
                      </Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">"{deleteTarget?.title}"</span>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTarget && deleteResource.mutate(deleteTarget.id)}
              disabled={deleteResource.isPending}
            >
              {deleteResource.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
