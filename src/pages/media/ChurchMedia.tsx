import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import { StorageBar } from "@/components/media/StorageBar";
import { StorageUpgradeModal } from "@/components/media/StorageUpgradeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Upload, Image as ImageIcon, Music, Video, X, Download, Trash2, Loader2, MoreHorizontal, Pencil, Play, ChevronUp, ChevronDown, ListMusic, Star, Search, FolderOpen, Plus, LayoutGrid, List } from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { useSubscription } from "@/hooks/useSubscription";
import { showPaywallToast } from "@/components/PaywallToast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TABLES } from "@/lib/schema";
import type { StorageStats, StoragePlan } from "@/types/media";
import { useMediaNotifications } from "@/hooks/useMediaNotifications";

const BUCKET_MAP: Record<string, string> = { image: "church-media", audio: "church-audio", video: "church-video" };
const ACCEPT_MAP: Record<string, string> = {
  image: "image/jpeg,image/png,image/gif,image/webp",
  audio: "audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/m4a",
  video: "video/mp4,video/webm,video/ogg,video/quicktime",
};
type MediaType = "image" | "audio" | "video";

interface UploadDialogProps {
  open: boolean; onOpenChange: (v: boolean) => void; mediaType: MediaType;
  tenantId: string; userId: string | null; onSuccess: () => void;
  categories: Array<{ id: string; name: string; color: string }>;
  storageStats: StorageStats | null | undefined;
}
function UploadDialog({ open, onOpenChange, mediaType, tenantId, userId, onSuccess, categories, storageStats }: UploadDialogProps) {
  const { limits, usage } = useSubscription();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [visibility, setVisibility] = useState<"members" | "featured" | "admin">("members");
  const [downloadEnabled, setDownloadEnabled] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  useEffect(() => { if (categories.length > 0 && !category) setCategory(categories[0].name); }, [categories, category]);
  const reset = () => { setFile(null); setFiles([]); setPreview(null); setTitle(""); setDescription(""); setCategory(categories[0]?.name ?? "General"); setVisibility("members"); setDownloadEnabled(true); setUploadProgress(0); setIsDragOver(false); };
  const handleClose = () => { reset(); onOpenChange(false); };

  const applyFile = (f: File) => { setFile(f); if (mediaType === "image") setPreview(URL.createObjectURL(f)); };
  const applyFiles = (fs: FileList | File[]) => {
    const arr = Array.from(fs);
    if (mediaType === "image" && arr.length > 1) { setFiles(arr); setFile(arr[0]); setPreview(URL.createObjectURL(arr[0])); }
    else if (arr[0]) applyFile(arr[0]);
  };
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) applyFiles(e.target.files); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files) applyFiles(e.dataTransfer.files); };
  const handleUpload = async () => {
    if (storageStats?.is_over_limit) { toast.error("Storage limit reached. Please upgrade your plan."); return; }
    const filesToUpload = files.length > 1 ? files : (file ? [file] : []);
    if (!filesToUpload.length) { toast.error("Please select a file"); return; }
    
    // Calculate total size of files to upload
    const totalSizeGB = filesToUpload.reduce((sum, f) => sum + (f.size / (1024 * 1024 * 1024)), 0);
    
    // Check storage limit before upload
    if ((usage.storage_gb + totalSizeGB) > limits.storage_gb) {
      showPaywallToast('storage', 'storage');
      return;
    }
    
    setUploading(true); setUploadProgress(10);
    try {
      const bucket = BUCKET_MAP[mediaType];
      for (let i = 0; i < filesToUpload.length; i++) {
        const f = filesToUpload[i];
        const ext = f.name.split(".").pop();
        const path = `${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        setUploadProgress(Math.round(10 + (80 * i) / filesToUpload.length));
        const { error: storageErr } = await supabase.storage.from(bucket).upload(path, f);
        if (storageErr) throw storageErr;
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
        const { error: dbErr } = await supabase.from(TABLES.CHURCH_MEDIA_ITEMS).insert({
          tenant_id: tenantId, media_type: mediaType,
          title: filesToUpload.length === 1 ? (title || f.name) : f.name,
          description: description || null, category: category || "General",
          visibility, download_enabled: downloadEnabled,
          file_url: publicUrl, file_name: f.name, file_size: f.size,
          mime_type: f.type, storage_path: path, uploaded_by: userId,
        });
        if (dbErr) throw dbErr;
      }
      
      // Increment storage usage after successful upload
      await supabase
        .from(TABLES.TENANT_SUBSCRIPTIONS)
        .update({
          storage_used_gb: usage.storage_gb + totalSizeGB
        })
        .eq('tenant_id', tenantId);
      
      setUploadProgress(100);
      toast.success(filesToUpload.length > 1 ? `${filesToUpload.length} files uploaded!` : "Uploaded successfully");
      onSuccess(); handleClose();
    } catch (err: any) { toast.error(err.message || "Upload failed"); } finally { setUploading(false); }
  };
  const typeLabel = mediaType === "image" ? "Image" : mediaType === "audio" ? "Audio" : "Video";
  const TypeIcon = mediaType === "image" ? ImageIcon : mediaType === "audio" ? Music : Video;
  const categoryOptions = categories.length > 0 ? categories : [{ id: "general", name: "General", color: "#6366f1" }];
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><TypeIcon className="h-5 w-5 text-indigo-600" />Upload {typeLabel}</DialogTitle>
          <p className="text-sm text-muted-foreground">Upload {typeLabel.toLowerCase()} files to showcase on your church's pages.</p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Select File</Label>
            <div
              className={`mt-1.5 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragOver ? "border-orange-500 bg-orange-50/50 dark:bg-orange-900/10 scale-[1.01]" : "border-slate-200 dark:border-slate-700 hover:border-orange-400 hover:bg-orange-50/30 dark:hover:bg-orange-900/10"}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              {preview ? (
                <img src={preview} alt="preview" className="mx-auto max-h-32 rounded-md object-contain" />
              ) : (
                <>
                  <Upload className={`mx-auto h-8 w-8 mb-2 ${isDragOver ? "text-orange-500" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium text-muted-foreground">{isDragOver ? "Drop to upload" : `Drag files here or click to browse`}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {mediaType === "image" && "JPEG, PNG, GIF, or WebP — max 10MB"}
                    {mediaType === "audio" && "MP3, WAV, OGG, AAC, M4A — max 50MB"}
                    {mediaType === "video" && "MP4, WebM, MOV — max 500MB"}
                  </p>
                </>
              )}
              {file && !preview && <p className="text-sm font-medium text-orange-600 mt-1">{file.name}</p>}
              {files.length > 1 && <p className="text-xs text-orange-600 mt-1 font-medium">{files.length} files selected</p>}
            </div>
            <input ref={fileRef} type="file" accept={ACCEPT_MAP[mediaType]} multiple={mediaType === "image"} className="hidden" onChange={handleFile} />
          </div>

          {/* Upload progress bar */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-orange-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <div><Label>Title (optional)</Label><Input className="mt-1.5" placeholder={`Enter ${typeLabel.toLowerCase()} title`} value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><Label>Description (optional)</Label><Textarea className="mt-1.5 resize-none" placeholder={`Enter ${typeLabel.toLowerCase()} description`} rows={3} value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map(c => (
                  <SelectItem key={c.id} value={c.name}>
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />{c.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Visibility */}
          <div>
            <Label>Visibility</Label>
            <div className="flex gap-2 mt-1.5">
              {(["members", "featured", "admin"] as const).map(v => (
                <button key={v} type="button" onClick={() => setVisibility(v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${visibility === v ? "bg-orange-500 border-orange-500 text-white" : "border-slate-200 dark:border-slate-700 text-muted-foreground hover:border-orange-400"}`}>
                  {v === "members" ? "Members" : v === "featured" ? "Featured" : "Admin Only"}
                </button>
              ))}
            </div>
          </div>
          {/* Download toggle */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Enable download for members</p>
              <p className="text-xs text-muted-foreground mt-0.5">Members can download this file</p>
            </div>
            <Switch checked={downloadEnabled} onCheckedChange={setDownloadEnabled} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={uploading}>Cancel</Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleUpload} disabled={(!file && !files.length) || uploading}>
              {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : <><Upload className="mr-2 h-4 w-4" />Upload</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface EditDialogProps { item: any; onClose: () => void; onSuccess: () => void; categories: Array<{ id: string; name: string; color: string }>; }
function EditDialog({ item, onClose, onSuccess, categories }: EditDialogProps) {
  const [title, setTitle] = useState(item.title || "");
  const [description, setDescription] = useState(item.description || "");
  const [category, setCategory] = useState(item.category || "General");
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from(TABLES.CHURCH_MEDIA_ITEMS).update({ title: title || null, description: description || null, category, updated_at: new Date().toISOString() }).eq("id", item.id);
      if (error) throw error;
      toast.success("Updated successfully"); onSuccess(); onClose();
    } catch (err: any) { toast.error(err.message || "Update failed"); } finally { setSaving(false); }
  };
  const categoryOptions = categories.length > 0 ? categories : [{ id: "general", name: "General", color: "#6366f1" }];
  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-indigo-600" />Edit Details</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div><Label>Title</Label><Input className="mt-1.5" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter title" /></div>
          <div><Label>Description</Label><Textarea className="mt-1.5 resize-none" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Enter description" /></div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map(c => (
                  <SelectItem key={c.id} value={c.name}>
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />{c.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ItemMenu({ item, onEdit, onDelete, onFeatureToggle }: { item: any; onEdit: () => void; onDelete: () => void; onFeatureToggle?: () => void }) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(item.file_url); const blob = await res.blob();
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = item.file_name || item.title || "download";
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch { window.open(item.file_url, "_blank"); }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="secondary" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={e => { e.stopPropagation(); onEdit(); }}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload}><Download className="h-4 w-4 mr-2" />Download</DropdownMenuItem>
        {onFeatureToggle && (
          <DropdownMenuItem onClick={e => { e.stopPropagation(); onFeatureToggle(); }}>
            <Star className="h-4 w-4 mr-2" />{item.is_featured ? "Unfeature" : "Set as Featured"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); onDelete(); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({ icon: Icon, label, onUpload }: { icon: React.ElementType; label: string; onUpload: () => void }) {
  return (
    <Card><CardContent className="flex flex-col items-center justify-center py-20">
      <Icon className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h3 className="font-semibold text-lg mb-1">No {label} files uploaded yet</h3>
      <p className="text-sm text-muted-foreground mb-4">Upload {label.toLowerCase()} files to display on your church's public pages.</p>
      <Button onClick={onUpload}><Upload className="mr-2 h-4 w-4" />Upload {label}</Button>
    </CardContent></Card>
  );
}

const TABS: { key: MediaType | "albums"; label: string; icon: React.ElementType }[] = [
  { key: "image",  label: "Images", icon: ImageIcon },
  { key: "audio",  label: "Audio",  icon: Music },
  { key: "video",  label: "Video",  icon: Video },
  { key: "albums", label: "Albums", icon: FolderOpen },
];

const ChurchMedia = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const { checkAndNotifyStorageThresholds, notifyFeaturedMedia } = useMediaNotifications();
  const [activeTab, setActiveTab] = useState<MediaType | "albums">("image");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightbox, setLightbox] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [albumFilter, setAlbumFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "name" | "size">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [expandedAudioId, setExpandedAudioId] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [currentTrackIdx, setCurrentTrackIdx] = useState<number | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["church_media_items", church.tenantId, activeTab, sortOrder],
    queryFn: async () => {
      if (activeTab === "albums") return [];
      let q = supabase.from(TABLES.CHURCH_MEDIA_ITEMS).select("*").eq("tenant_id", church.tenantId!).eq("media_type", activeTab as MediaType);
      if (sortOrder === "newest") q = q.order("created_at", { ascending: false });
      else if (sortOrder === "oldest") q = q.order("created_at", { ascending: true });
      else if (sortOrder === "name") q = q.order("title", { ascending: true });
      else if (sortOrder === "size") q = q.order("file_size", { ascending: false });
      const { data, error } = await q;
      if (error) throw error; return data || [];
    },
    enabled: !!church.tenantId && activeTab !== "albums", staleTime: 60_000,
  });

  const { data: albums = [], isLoading: albumsLoading } = useQuery({
    queryKey: ["media-albums", church.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.MEDIA_ALBUMS).select("*").eq("tenant_id", church.tenantId!).order("sort_order", { ascending: true });
      if (error) throw error; return data || [];
    },
    enabled: !!church.tenantId, staleTime: 300_000,
  });

  const { data: storageStats } = useQuery<StorageStats | null>({
    queryKey: ["storage-stats", church.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_storage_stats", { p_tenant_id: church.tenantId });
      if (error) throw error; return data?.[0] ?? null;
    },
    staleTime: 60_000,
  });

  const { data: storagePlans = [] } = useQuery<StoragePlan[]>({
    queryKey: ["storage-plans"],
    queryFn: async () => { const { data } = await supabase.from(TABLES.STORAGE_PLANS).select("*").order("sort_order"); return data ?? []; },
    staleTime: 300_000,
  });

  const { data: churchStorage } = useQuery({
    queryKey: ["church-storage", church.tenantId],
    queryFn: async () => { const { data } = await supabase.from(TABLES.CHURCH_STORAGE).select("storage_plan_id").eq("tenant_id", church.tenantId).single(); return data; },
    staleTime: 60_000,
  });

  const { data: mediaCategories = [] } = useQuery({
    queryKey: ["media-categories", church.tenantId],
    queryFn: async () => { const { data } = await supabase.from(TABLES.MEDIA_CATEGORIES).select("*").eq("tenant_id", church.tenantId).eq("status", "active").order("sort_order"); return data ?? []; },
    staleTime: 300_000,
  });

  const upgradeRequestMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.from(TABLES.CHURCH_STORAGE).update({ upgrade_requested_at: new Date().toISOString(), upgrade_requested_plan_id: planId } as never).eq("tenant_id", church.tenantId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["church-storage", church.tenantId] }); qc.invalidateQueries({ queryKey: ["storage-stats", church.tenantId] }); toast.success("Upgrade request sent! We'll be in touch within 24 hours."); },
    onError: () => toast.error("Failed to send upgrade request"),
  });

  const deleteMut = useMutation({
    mutationFn: async (item: any) => {
      if (item.storage_path) await supabase.storage.from(BUCKET_MAP[item.media_type as MediaType]).remove([item.storage_path]);
      const { error } = await supabase.from(TABLES.CHURCH_MEDIA_ITEMS).delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["church_media_items"] }); qc.invalidateQueries({ queryKey: ["storage-stats", church.tenantId] }); toast.success("Deleted successfully"); setLightbox(null); setDeleteItem(null); },
    onError: (err: any) => toast.error(err.message),
  });

  const featureMutation = useMutation({
    mutationFn: async ({ id, is_featured, title }: { id: string; is_featured: boolean; title: string | null }) => {
      const { error } = await supabase.from(TABLES.CHURCH_MEDIA_ITEMS).update({ is_featured } as never).eq("id", id);
      if (error) throw error;
      return { is_featured, title };
    },
    onSuccess: async ({ is_featured, title }) => {
      qc.invalidateQueries({ queryKey: ["church_media_items"] });
      toast.success(is_featured ? "Marked as featured!" : "Removed from featured.");
      if (is_featured) {
        await notifyFeaturedMedia(church.tenantId, title, "");
      }
    },
    onError: () => toast.error("Failed to update featured status"),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["church_media_items"] });
    qc.invalidateQueries({ queryKey: ["storage-stats", church.tenantId] });
    // Check storage thresholds after upload
    checkAndNotifyStorageThresholds(church.tenantId);
  };

  useEffect(() => { if (activeTab === "audio") setQueue(items as any[]); }, [items, activeTab]);

  const moveTrack = (idx: number, dir: -1 | 1) => {
    const next = idx + dir; if (next < 0 || next >= queue.length) return;
    const q = [...queue]; [q[idx], q[next]] = [q[next], q[idx]]; setQueue(q);
  };

  const playTrack = (idx: number) => {
    Object.values(audioRefs.current).forEach(a => { if (a) { a.pause(); a.currentTime = 0; } });
    setCurrentTrackIdx(idx); const item = queue[idx]; const el = audioRefs.current[item.id]; if (el) el.play();
  };

  const handleTrackEnded = useCallback((idx: number) => {
    if (!autoPlay) return;
    const nextIdx = shuffle ? Math.floor(Math.random() * queue.length) : (idx + 1) % queue.length;
    playTrack(nextIdx);
  }, [autoPlay, shuffle, queue]);

  const filtered = (() => {
    let result = categoryFilter === "all" ? items : items.filter((i: any) => i.category === categoryFilter);
    if (albumFilter !== "all") result = result.filter((i: any) => i.album_id === albumFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i: any) => (i.title || "").toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q) || (i.file_name || "").toLowerCase().includes(q));
    }
    return result;
  })();
  const activeTabInfo = TABS.find(t => t.key === activeTab)!;
  const uploadLabel = activeTab === "image" ? "Images" : activeTab === "audio" ? "Audio" : "Video";
  const isNearLimit = storageStats?.is_near_limit ?? false;
  const isOverLimit = storageStats?.is_over_limit ?? false;
  const categoryPillOptions = mediaCategories.map((c: any) => c.name);

  return (
    <BlurFadeIn>
      <Helmet><title>Church Media — Vestry</title></Helmet>
      <PageHeader title="Church Media" subtitle="Manage your church's images, videos, and audio"
        action={<Button onClick={() => setUploadOpen(true)}><Upload className="mr-2 h-4 w-4" />Upload {uploadLabel}</Button>} />

      {storageStats && (
        <BlurFadeIn delay={0.05} className="mb-4">
          <StorageBar usedBytes={storageStats.used_bytes} limitBytes={storageStats.limit_bytes} planName={storageStats.plan_name} onUpgrade={() => setUpgradeModalOpen(true)} compact />
        </BlurFadeIn>
      )}

      <AnimatePresence>
        {storageStats && (isNearLimit || isOverLimit) && (
          <BlurFadeIn delay={0.08} className="mb-5">
            <StorageBar usedBytes={storageStats.used_bytes} limitBytes={storageStats.limit_bytes} planName={storageStats.plan_name} onUpgrade={() => setUpgradeModalOpen(true)} />
          </BlurFadeIn>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1 border-b mb-4">
        {TABS.map(tab => { const Icon = tab.icon; return (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key as any); setCategoryFilter("all"); setSearchQuery(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab.key ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Icon className="h-4 w-4" />{tab.label}
            {activeTab === tab.key && tab.key !== "albums" && <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5">{items.length}</span>}
            {activeTab === tab.key && tab.key === "albums" && <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5">{albums.length}</span>}
          </button>
        ); })}
      </div>

      {/* Toolbar — shown for image/audio/video tabs */}
      {activeTab !== "albums" && (
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search media..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
            <option value="all">All Categories</option>
            {mediaCategories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select value={albumFilter} onChange={e => setAlbumFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
            <option value="all">All Albums</option>
            {albums.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A–Z</option>
            <option value="size">Largest First</option>
          </select>
          {/* Grid / List toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button onClick={() => setViewMode("grid")} title="Grid view"
              className={`h-9 w-9 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-orange-500 text-white" : "bg-white dark:bg-slate-800 text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode("list")} title="List view"
              className={`h-9 w-9 flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-orange-500 text-white" : "bg-white dark:bg-slate-800 text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}</div>
      ) : activeTab === "albums" ? (
        <div>
          {albumsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
          ) : albums.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <FolderOpen className="h-16 w-16 text-muted-foreground/30" />
              <h3 className="font-semibold text-lg">No albums yet</h3>
              <p className="text-sm text-muted-foreground">Create albums to organise your media into collections.</p>
              <Button onClick={() => toast.info("Album creation coming soon")}><Plus className="mr-2 h-4 w-4" />Create Album</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {albums.map((album: any) => (
                <div key={album.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="aspect-video bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <FolderOpen className="h-12 w-12 text-slate-300" />
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-sm">{album.name}</p>
                    {album.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{album.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={activeTabInfo?.icon ?? ImageIcon} label={uploadLabel} onUpload={() => setUploadOpen(true)} />
      ) : activeTab === "image" ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
          {filtered.map((item: any) => (
            <div key={item.id} className="group rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-800 cursor-pointer hover:shadow-md transition-shadow">
              <div className="relative h-[200px] bg-muted overflow-hidden" onClick={() => setLightbox(item)}>
                <img src={item.file_url} alt={item.title || ""} className="w-full h-full object-cover" />
                {item.is_featured && <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">★ Featured</span>}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ItemMenu item={item} onEdit={() => setEditingItem(item)} onDelete={() => setDeleteItem(item)} onFeatureToggle={() => featureMutation.mutate({ id: item.id, is_featured: !item.is_featured, title: item.title })} />
                </div>
              </div>
              <div className="p-3 space-y-1.5">
                <p className="font-semibold text-sm leading-snug break-words">{item.title || item.file_name}</p>
                {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                {item.category && <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{item.category}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === "audio" ? (
        <div className="space-y-5">
          <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4"><ListMusic className="h-4 w-4 text-indigo-600" /><h3 className="font-semibold text-sm">Playback Settings</h3></div>
              <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-700">
                <div className="flex items-center justify-between py-3"><div><p className="text-sm font-medium">Auto-play next track</p><p className="text-xs text-muted-foreground mt-0.5">Automatically play the next audio track when one finishes</p></div><Switch checked={autoPlay} onCheckedChange={setAutoPlay} /></div>
                <div className="flex items-center justify-between py-3"><div><p className="text-sm font-medium">Shuffle mode</p><p className="text-xs text-muted-foreground mt-0.5">Randomize playback order for listeners</p></div><Switch checked={shuffle} onCheckedChange={setShuffle} /></div>
              </div>
            </CardContent>
          </Card>
          {queue.length > 0 && (
            <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><ListMusic className="h-4 w-4 text-indigo-600" /><h3 className="font-semibold text-sm">Playback Queue</h3></div><Badge variant="secondary" className="text-xs">{queue.length} {queue.length === 1 ? "track" : "tracks"}</Badge></div>
                <div className="space-y-1">
                  {queue.map((item: any, idx: number) => (
                    <div key={item.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentTrackIdx === idx ? "bg-indigo-50 dark:bg-indigo-900/20" : "hover:bg-muted/50"}`}>
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button onClick={() => moveTrack(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"><ChevronUp className="h-3.5 w-3.5" /></button>
                        <button onClick={() => moveTrack(idx, 1)} disabled={idx === queue.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"><ChevronDown className="h-3.5 w-3.5" /></button>
                      </div>
                      <span className="text-xs text-muted-foreground w-4 text-center shrink-0">{idx + 1}</span>
                      <button onClick={() => playTrack(idx)} className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 hover:bg-indigo-200 transition-colors shrink-0"><Play className="h-3.5 w-3.5 ml-0.5" /></button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title || item.file_name}</p>
                        {item.category && <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{item.category}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {/* Audio list with inline expanded player */}
          <div className="space-y-2">
            {filtered.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                    <Music className="h-4.5 w-4.5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title || item.file_name}</p>
                    <p className="text-xs text-muted-foreground">{item.category || "General"}</p>
                  </div>
                  <button onClick={() => setExpandedAudioId(expandedAudioId === item.id ? null : item.id)}
                    className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 hover:bg-indigo-200 transition-colors shrink-0">
                    {expandedAudioId === item.id ? <ChevronUp className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </button>
                  <ItemMenu item={item} onEdit={() => setEditingItem(item)} onDelete={() => setDeleteItem(item)} onFeatureToggle={() => featureMutation.mutate({ id: item.id, is_featured: !item.is_featured, title: item.title })} />
                </div>
                {expandedAudioId === item.id && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
                    <audio controls src={item.file_url} className="w-full" ref={el => { audioRefs.current[item.id] = el; }} onEnded={() => handleTrackEnded(queue.findIndex(q => q.id === item.id))} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {filtered.map((item: any) => (
            <div key={item.id} className="group rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
              <div className="relative h-[200px] bg-slate-900 overflow-hidden">
                <video src={item.file_url} className="w-full h-full object-cover" controls />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <ItemMenu item={item} onEdit={() => setEditingItem(item)} onDelete={() => setDeleteItem(item)} onFeatureToggle={() => featureMutation.mutate({ id: item.id, is_featured: !item.is_featured, title: item.title })} />
                </div>
              </div>
              <div className="p-3 space-y-1.5">
                <p className="font-semibold text-sm leading-snug break-words">{item.title || item.file_name}</p>
                {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                {item.category && <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{item.category}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && activeTab === "image" && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative w-full max-w-3xl bg-slate-900 rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors" onClick={() => setLightbox(null)}><X className="h-4 w-4" /></button>
            <img src={lightbox.file_url} alt={lightbox.title || ""} className="w-full max-h-[65vh] object-contain" />
            <div className="bg-slate-800 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                {lightbox.title && <p className="text-white font-medium text-sm truncate">{lightbox.title}</p>}
                {lightbox.category && <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-white/70">{lightbox.category}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={() => { setLightbox(null); setEditingItem(lightbox); }}><Pencil className="h-4 w-4 mr-1.5" />Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => { setLightbox(null); setDeleteItem(lightbox); }}><Trash2 className="h-4 w-4 mr-1.5" />Delete</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingItem && <EditDialog item={editingItem} onClose={() => setEditingItem(null)} onSuccess={invalidate} categories={mediaCategories} />}

      <AlertDialog open={!!deleteItem} onOpenChange={v => { if (!v) setDeleteItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this file?</AlertDialogTitle><AlertDialogDescription>"{deleteItem?.title || deleteItem?.file_name}" will be permanently removed from storage. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteItem && deleteMut.mutate(deleteItem)} disabled={deleteMut.isPending}>{deleteMut.isPending ? "Deleting..." : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} mediaType={(activeTab === "albums" ? "image" : activeTab) as MediaType} tenantId={church.tenantId!} userId={church.userId} onSuccess={invalidate} categories={mediaCategories} storageStats={storageStats} />

      <StorageUpgradeModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} currentPlanId={churchStorage?.storage_plan_id ?? ""} plans={storagePlans} onRequestUpgrade={async (planId) => { await upgradeRequestMutation.mutateAsync(planId); }} />
    </BlurFadeIn>
  );
};

export default ChurchMedia;
