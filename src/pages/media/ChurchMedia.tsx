import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Image as ImageIcon, Music, Video, X, Download, Trash2,
  Loader2, MoreHorizontal, Pencil,
} from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

// ── Constants ────────────────────────────────────────────────────────────────

const IMAGE_CATEGORIES = [
  "General", "Worship", "Project", "New Building / Renovation",
  "Ministry", "Outreach", "Sermons", "Meet Ups", "Occasion",
];

const BUCKET_MAP: Record<string, string> = {
  image: "church-media",
  audio: "church-audio",
  video: "church-video",
};

const ACCEPT_MAP: Record<string, string> = {
  image: "image/jpeg,image/png,image/gif,image/webp",
  audio: "audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/m4a",
  video: "video/mp4,video/webm,video/ogg,video/quicktime",
};

type MediaType = "image" | "audio" | "video";

// ── Upload Dialog ────────────────────────────────────────────────────────────

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mediaType: MediaType;
  tenantId: string;
  userId: string | null;
  onSuccess: () => void;
}

function UploadDialog({ open, onOpenChange, mediaType, tenantId, userId, onSuccess }: UploadDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [uploading, setUploading] = useState(false);

  const reset = () => { setFile(null); setPreview(null); setTitle(""); setDescription(""); setCategory("General"); };
  const handleClose = () => { reset(); onOpenChange(false); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (mediaType === "image") setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) { toast.error("Please select a file"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const bucket = BUCKET_MAP[mediaType];
      const { error: storageErr } = await supabase.storage.from(bucket).upload(path, file);
      if (storageErr) throw storageErr;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      const { error: dbErr } = await supabase.from("church_media_items").insert({
        tenant_id: tenantId, media_type: mediaType,
        title: title || file.name, description: description || null,
        category, file_url: publicUrl, file_name: file.name,
        file_size: file.size, mime_type: file.type,
        storage_path: path, uploaded_by: userId,
      });
      if (dbErr) throw dbErr;
      toast.success("Uploaded successfully");
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const typeLabel = mediaType === "image" ? "Image" : mediaType === "audio" ? "Audio" : "Video";
  const TypeIcon = mediaType === "image" ? ImageIcon : mediaType === "audio" ? Music : Video;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5 text-indigo-600" />Upload {typeLabel}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Upload {typeLabel.toLowerCase()} files to showcase on your church's pages.</p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Select File</Label>
            <div className="mt-1.5 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors" onClick={() => fileRef.current?.click()}>
              {preview ? (
                <img src={preview} alt="preview" className="mx-auto max-h-32 rounded-md object-contain" />
              ) : (
                <>
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Click to select a {typeLabel.toLowerCase()}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {mediaType === "image" && "JPEG, PNG, GIF, or WebP (max 10MB)"}
                    {mediaType === "audio" && "MP3, WAV, OGG, AAC, M4A (max 50MB)"}
                    {mediaType === "video" && "MP4, WebM, MOV (max 500MB)"}
                  </p>
                </>
              )}
              {file && !preview && <p className="text-sm font-medium text-indigo-600 mt-1">{file.name}</p>}
            </div>
            <input ref={fileRef} type="file" accept={ACCEPT_MAP[mediaType]} className="hidden" onChange={handleFile} />
          </div>
          <div>
            <Label>Title (optional)</Label>
            <Input className="mt-1.5" placeholder={`Enter ${typeLabel.toLowerCase()} title`} value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea className="mt-1.5 resize-none" placeholder={`Enter ${typeLabel.toLowerCase()} description`} rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          {mediaType === "image" && (
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{IMAGE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={uploading}>Cancel</Button>
            <Button className="flex-1" onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : <><Upload className="mr-2 h-4 w-4" />Upload</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Dialog ──────────────────────────────────────────────────────────────

interface EditDialogProps {
  item: any;
  onClose: () => void;
  onSuccess: () => void;
}

function EditDialog({ item, onClose, onSuccess }: EditDialogProps) {
  const [title, setTitle] = useState(item.title || "");
  const [description, setDescription] = useState(item.description || "");
  const [category, setCategory] = useState(item.category || "General");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("church_media_items").update({
        title: title || null,
        description: description || null,
        category,
        updated_at: new Date().toISOString(),
      }).eq("id", item.id);
      if (error) throw error;
      toast.success("Updated successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-indigo-600" />Edit Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Title</Label>
            <Input className="mt-1.5" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter title" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1.5 resize-none" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Enter description" />
          </div>
          {item.media_type === "image" && (
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{IMAGE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Item actions menu ────────────────────────────────────────────────────────

function ItemMenu({ item, onEdit, onDelete }: { item: any; onEdit: () => void; onDelete: () => void }) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(item.file_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.file_name || item.title || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // fallback — open in new tab
      window.open(item.file_url, "_blank");
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={e => { e.stopPropagation(); onEdit(); }}>
          <Pencil className="h-4 w-4 mr-2" />Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />Download
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="h-4 w-4 mr-2" />Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, label, onUpload }: { icon: React.ElementType; label: string; onUpload: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-20">
        <Icon className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="font-semibold text-lg mb-1">No {label} files uploaded yet</h3>
        <p className="text-sm text-muted-foreground mb-4">Upload {label.toLowerCase()} files to display on your church's public pages.</p>
        <Button onClick={onUpload}><Upload className="mr-2 h-4 w-4" />Upload {label}</Button>
      </CardContent>
    </Card>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const TABS: { key: MediaType; label: string; icon: React.ElementType }[] = [
  { key: "image", label: "Images", icon: ImageIcon },
  { key: "audio", label: "Audio",  icon: Music },
  { key: "video", label: "Video",  icon: Video },
];

const ChurchMedia = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<MediaType>("image");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightbox, setLightbox] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["church_media_items", church.tenantId, activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("church_media_items")
        .select("*")
        .eq("tenant_id", church.tenantId!)
        .eq("media_type", activeTab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!church.tenantId,
    staleTime: 60000,
  });

  const deleteMut = useMutation({
    mutationFn: async (item: any) => {
      if (item.storage_path) {
        await supabase.storage.from(BUCKET_MAP[item.media_type as MediaType]).remove([item.storage_path]);
      }
      const { error } = await supabase.from("church_media_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["church_media_items"] });
      toast.success("Deleted successfully");
      setLightbox(null);
      setDeleteItem(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["church_media_items"] });
  const filtered = categoryFilter === "all" ? items : items.filter((i: any) => i.category === categoryFilter);
  const activeTabInfo = TABS.find(t => t.key === activeTab)!;
  const uploadLabel = activeTab === "image" ? "Images" : activeTab === "audio" ? "Audio" : "Video";

  return (
    <>
      <Helmet><title>Church Media — Vestry</title></Helmet>
      <PageHeader
        title="Church Media"
        subtitle="Manage your church's images, videos, and audio"
        action={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />Upload {uploadLabel}
          </Button>
        }
      />

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 border-b mb-6">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setCategoryFilter("all"); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {activeTab === tab.key && (
                <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5">{items.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Category filter (images only) ── */}
      {activeTab === "image" && items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {["all", ...IMAGE_CATEGORIES].map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                categoryFilter === c ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={activeTabInfo.icon} label={uploadLabel} onUpload={() => setUploadOpen(true)} />

      ) : activeTab === "image" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((item: any) => (
            <div
              key={item.id}
              className="relative group cursor-pointer rounded-lg overflow-hidden aspect-square bg-muted"
              onClick={() => setLightbox(item)}
            >
              <img src={item.file_url} alt={item.title || ""} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
              {/* Actions — appear on hover, top-right */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ItemMenu
                  item={item}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => setDeleteItem(item)}
                />
              </div>
              {item.category && (
                <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                  <Badge className="text-[10px] bg-black/60 text-white border-0">{item.category}</Badge>
                </div>
              )}
            </div>
          ))}
        </div>

      ) : activeTab === "audio" ? (
        <div className="space-y-3">
          {filtered.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <Music className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title || item.file_name}</p>
                  {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{item.created_at ? format(new Date(item.created_at), "dd MMM yyyy") : ""}</p>
                </div>
                <audio controls src={item.file_url} className="h-8 max-w-[200px]" />
                <ItemMenu item={item} onEdit={() => setEditingItem(item)} onDelete={() => setDeleteItem(item)} />
              </CardContent>
            </Card>
          ))}
        </div>

      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item: any) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="relative aspect-video bg-slate-900">
                <video src={item.file_url} className="w-full h-full object-contain" controls />
              </div>
              <CardContent className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{item.title || item.file_name}</p>
                  {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{item.created_at ? format(new Date(item.created_at), "dd MMM yyyy") : ""}</p>
                </div>
                <ItemMenu item={item} onEdit={() => setEditingItem(item)} onDelete={() => setDeleteItem(item)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Image lightbox ── */}
      {lightbox && activeTab === "image" && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.file_url} alt={lightbox.title || ""} className="max-w-full max-h-[80vh] object-contain mx-auto rounded-lg" />
            <div className="absolute top-3 right-3 flex gap-2">
              <Button variant="secondary" size="icon" onClick={() => { setLightbox(null); setEditingItem(lightbox); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="secondary" size="icon" onClick={async () => {
                try {
                  const res = await fetch(lightbox.file_url);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = lightbox.file_name || lightbox.title || "download";
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch { window.open(lightbox.file_url, "_blank"); }
              }}><Download className="h-4 w-4" /></Button>
              <Button variant="destructive" size="icon" onClick={() => { setLightbox(null); setDeleteItem(lightbox); }}><Trash2 className="h-4 w-4" /></Button>
              <Button variant="secondary" size="icon" onClick={() => setLightbox(null)}><X className="h-4 w-4" /></Button>
            </div>
            {(lightbox.title || lightbox.category) && (
              <div className="mt-3 text-center">
                {lightbox.title && <p className="text-white font-medium">{lightbox.title}</p>}
                {lightbox.category && <Badge className="mt-1 bg-white/20 text-white border-0">{lightbox.category}</Badge>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Edit dialog ── */}
      {editingItem && (
        <EditDialog item={editingItem} onClose={() => setEditingItem(null)} onSuccess={invalidate} />
      )}

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deleteItem} onOpenChange={v => { if (!v) setDeleteItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteItem?.title || deleteItem?.file_name}" will be permanently removed from storage. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteItem && deleteMut.mutate(deleteItem)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Upload dialog ── */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        mediaType={activeTab}
        tenantId={church.tenantId!}
        userId={church.userId}
        onSuccess={invalidate}
      />
    </>
  );
};

export default ChurchMedia;
