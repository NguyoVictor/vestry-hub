import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Search, BookOpen, QrCode, Share2, Plus, Eye, Pencil, Trash2,
  Copy, Download, Loader2, Image as ImageIcon, FileText, Music, Video,
} from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";

// ── Add Sermon Dialog ─────────────────────────────────────────────────────────

interface AddSermonDialogProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  userId: string | null;
  editing: any | null;
  onSuccess: () => void;
}

function AddSermonDialog({ open, onClose, tenantId, userId, editing, onSuccess }: AddSermonDialogProps) {
  const thumbnailRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(editing?.title || "");
  const [sermonDate, setSermonDate] = useState(editing?.sermon_date || new Date().toISOString().split("T")[0]);
  const [scripture, setScripture] = useState(editing?.scripture_reference || "");
  const [preacher, setPreacher] = useState(editing?.speaker || "");
  const [series, setSeries] = useState(editing?.series || "");
  const [author, setAuthor] = useState(editing?.notes || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(editing?.thumbnail_url || null);
  const [sermonNotes, setSermonNotes] = useState(editing?.manuscript || "");
  const [transcript, setTranscript] = useState("");
  const [videoUrl, setVideoUrl] = useState(editing?.video_url || "");
  const [audioUrl, setAudioUrl] = useState(editing?.audio_url || "");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [closingPrayer, setClosingPrayer] = useState("");
  const [benediction, setBenediction] = useState("");
  const [isPublished, setIsPublished] = useState(editing?.is_published || false);
  const [saving, setSaving] = useState(false);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleThumbnail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setThumbnailFile(f);
    setThumbnailPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      let thumbnailUrl = editing?.thumbnail_url || null;
      if (thumbnailFile) {
        const path = `${tenantId}/thumbnails/${Date.now()}-${thumbnailFile.name}`;
        const { error: upErr } = await supabase.storage.from("church-media").upload(path, thumbnailFile);
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from("church-media").getPublicUrl(path);
          thumbnailUrl = publicUrl;
        }
      }

      const payload: any = {
        tenant_id: tenantId,
        title,
        sermon_date: sermonDate || null,
        scripture_reference: scripture || null,
        speaker: preacher || null,
        series: series || null,
        notes: author || null,
        is_published: isPublished,
        thumbnail_url: thumbnailUrl,
        video_url: videoUrl || null,
        audio_url: audioUrl || null,
        manuscript: sermonNotes || null,
      };

      if (editing?.id) {
        const { error } = await supabase.from("sermons").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sermons").insert({ ...payload, created_by: userId });
        if (error) throw error;
      }

      toast.success(editing?.id ? "Sermon updated" : "Sermon saved");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-orange-500" />
            {editing?.id ? "Edit Sermon" : "Add New Sermon"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Basic Information */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
              <BookOpen className="h-3.5 w-3.5" />Basic Information
            </p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Title *</Label>
                  <Input className="mt-1.5" placeholder="Enter sermon title" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Sermon Date *</Label>
                  <Input type="date" className="mt-1.5" value={sermonDate} onChange={e => setSermonDate(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Scripture Reference</Label>
                  <Input className="mt-1.5" placeholder="e.g., John 3:16" value={scripture} onChange={e => setScripture(e.target.value)} />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><span className="text-muted-foreground">👤</span> Preacher</Label>
                  <Select value={preacher || "none"} onValueChange={v => setPreacher(v === "none" ? "" : v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="Pastor">Pastor</SelectItem>
                      <SelectItem value="Associate Pastor">Associate Pastor</SelectItem>
                      <SelectItem value="Guest Speaker">Guest Speaker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-1"><span className="text-muted-foreground">📚</span> Series Name</Label>
                  <Input className="mt-1.5" placeholder="e.g., Faith Series" value={series} onChange={e => setSeries(e.target.value)} />
                </div>
                <div>
                  <Label>Author (legacy)</Label>
                  <Input className="mt-1.5" placeholder="e.g., Pastor John Smith" value={author} onChange={e => setAuthor(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea className="mt-1.5 resize-none" rows={3} placeholder="Brief summary of the sermon" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
              🏷️ Tags
            </p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex gap-2">
                <Input placeholder="Add a tag..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()} className="flex-1" />
                <Button variant="outline" onClick={addTag}>Add</Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700">
                      {t}
                      <button onClick={() => setTags(tags.filter(x => x !== t))} className="text-muted-foreground hover:text-destructive">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
              <ImageIcon className="h-3.5 w-3.5" />Thumbnail Image
            </p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-28 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800 shrink-0 overflow-hidden">
                  {thumbnailPreview ? <img src={thumbnailPreview} className="w-full h-full object-cover" alt="" /> : (
                    <div className="text-center"><ImageIcon className="h-6 w-6 text-muted-foreground/40 mx-auto" /><p className="text-[10px] text-muted-foreground mt-1">No image</p></div>
                  )}
                </div>
                <div>
                  <input ref={thumbnailRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleThumbnail} />
                  <Button variant="outline" size="sm" onClick={() => thumbnailRef.current?.click()}>Choose file</Button>
                  <p className="text-xs text-muted-foreground mt-1">Recommended: 16:9 aspect ratio, JPG or PNG</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sermon Content */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
              <FileText className="h-3.5 w-3.5" />Sermon Content
            </p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
              <div>
                <Label>Sermon Notes</Label>
                <Textarea className="mt-1.5 resize-none" rows={4} placeholder="Full sermon notes/content..." value={sermonNotes} onChange={e => setSermonNotes(e.target.value)} />
              </div>
              <div>
                <Label>Transcript</Label>
                <Textarea className="mt-1.5 resize-none" rows={4} placeholder="Full sermon transcript..." value={transcript} onChange={e => setTranscript(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Media & Attachments */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
              <Video className="h-3.5 w-3.5" />Media &amp; Attachments
            </p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-1"><Video className="h-3.5 w-3.5" />Video URL</Label>
                  <Input className="mt-1.5" placeholder="YouTube/Vimeo link" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Music className="h-3.5 w-3.5" />Audio URL</Label>
                  <Input className="mt-1.5" placeholder="Audio file link (or upload below)" value={audioUrl} onChange={e => setAudioUrl(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1 mb-1.5">⬆️ Upload Audio File</Label>
                <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={e => setAudioFile(e.target.files?.[0] || null)} />
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => audioRef.current?.click()}>
                  {audioFile ? audioFile.name : "Choose file  No file chosen"}
                </Button>
              </div>
              <div>
                <Label className="flex items-center gap-1 mb-1.5">📄 Sermon Document (PDF/Word)</Label>
                <input ref={docRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => setDocFile(e.target.files?.[0] || null)} />
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => docRef.current?.click()}>
                  {docFile ? docFile.name : "Choose file  No file chosen"}
                </Button>
              </div>
            </div>
          </div>

          {/* Prayer & Blessing */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
              🙏 Prayer &amp; Blessing
            </p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
              <div>
                <Label>Closing Prayer</Label>
                <Textarea className="mt-1.5 resize-none" rows={3} placeholder="Closing prayer text..." value={closingPrayer} onChange={e => setClosingPrayer(e.target.value)} />
              </div>
              <div>
                <Label>Benediction / Blessing</Label>
                <Textarea className="mt-1.5 resize-none" rows={3} placeholder="Benediction/blessing text..." value={benediction} onChange={e => setBenediction(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Publish toggle */}
          <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Publish Sermon</p>
                <p className="text-xs text-muted-foreground">Make visible to the public</p>
              </div>
            </div>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Sermon"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const Sermons = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const qrRef = useRef<SVGSVGElement>(null);

  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editingSermon, setEditingSermon] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const sermonUrl = `${window.location.origin}/member/sermons`;

  const { data: sermons = [], isLoading } = useQuery({
    queryKey: ["sermons-admin", church.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sermons").select("*")
        .eq("tenant_id", church.tenantId!)
        .order("sermon_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sermons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sermons-admin"] });
      toast.success("Sermon deleted");
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["sermons-admin"] });

  // Unique series for filter
  const allSeries = Array.from(new Set(sermons.map((s: any) => s.series).filter(Boolean)));

  const filtered = sermons.filter((s: any) => {
    const matchSearch = !search.trim() ||
      (s.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.scripture_reference || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.speaker || "").toLowerCase().includes(search.toLowerCase());
    const matchSeries = seriesFilter === "all" || s.series === seriesFilter;
    const matchStatus = statusFilter === "all" ||
      (statusFilter === "published" && s.is_published) ||
      (statusFilter === "draft" && !s.is_published);
    return matchSearch && matchSeries && matchStatus;
  });

  const downloadQR = () => {
    if (!qrRef.current) return;
    const svg = new XMLSerializer().serializeToString(qrRef.current);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sermons-qr.svg";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success("QR code downloaded");
  };

  return (
    <>
      <Helmet><title>Sermons & Messages — Vestry</title></Helmet>

      {/* Page header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">Sermons &amp; Messages</h1>
          <p className="text-sm text-muted-foreground">Manage and share sermon content</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
          <QrCode className="mr-2 h-4 w-4" />Sermons QR
        </Button>
      </div>

      {/* Sermon Management section */}
      <div className="flex items-start justify-between mb-4 mt-6">
        <div>
          <h2 className="font-bold text-base">Sermon Management</h2>
          <p className="text-sm text-muted-foreground">Create, upload, and share pastor's messages</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />Share Link
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" size="sm" onClick={() => { setEditingSermon(null); setAddOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Add Sermon
          </Button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search sermons by title, scripture, author, or tags..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={seriesFilter} onValueChange={setSeriesFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Series</SelectItem>
            {allSeries.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sermon list */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No sermons found</p>
            <Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white" size="sm" onClick={() => { setEditingSermon(null); setAddOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />Add First Sermon
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((s: any) => (
            <Card key={s.id} className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                {/* Icon */}
                <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-orange-500" />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{s.title}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {s.sermon_date && <span>📅 {format(new Date(s.sermon_date), "MMMM d, yyyy")}</span>}
                    {s.scripture_reference && <span>· {s.scripture_reference.toUpperCase()}</span>}
                    {s.speaker && <span>· 👤 {s.speaker.toUpperCase()}</span>}
                  </div>
                </div>
                {/* Status + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={s.is_published ? "bg-emerald-100 text-emerald-700 border-0" : "bg-slate-100 text-slate-600 border-0"}>
                    {s.is_published ? "Published" : "Draft"}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`/member/sermons`, "_blank")}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingSermon(s); setAddOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Sermons QR Dialog ── */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Sermons &amp; Messages QR</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex flex-col items-center p-6 bg-white rounded-xl border border-slate-200">
              <QRCodeSVG ref={qrRef} value={sermonUrl} size={180} level="H" includeMargin />
              <p className="text-xs text-muted-foreground mt-3">Scan to access sermon library</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Link</Label>
              <div className="flex gap-2 mt-1">
                <Input value={sermonUrl} readOnly className="text-xs font-mono" />
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(sermonUrl); toast.success("Copied"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={downloadQR}>
                <Download className="mr-2 h-4 w-4" />Download QR
              </Button>
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(sermonUrl); toast.success("Link copied"); }}>
                <Share2 className="mr-2 h-4 w-4" />Share Link
              </Button>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">How to use</p>
              <p>• Display on church screens</p>
              <p>• Include in bulletins</p>
              <p>• Share on social media</p>
              <p>• Members scan to access sermons anytime</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Share Link Dialog ── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Share Sermon Page</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex justify-center p-4 bg-white rounded-xl border border-slate-200">
              <QRCodeSVG value={sermonUrl} size={160} level="H" includeMargin />
            </div>
            <div className="flex gap-2">
              <Input value={sermonUrl} readOnly className="text-xs font-mono border-orange-300 focus-visible:ring-orange-400" />
              <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(sermonUrl); toast.success("Copied"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">Share this link or QR code for members to access published sermons</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Sermon Dialog ── */}
      {addOpen && (
        <AddSermonDialog
          open={addOpen}
          onClose={() => { setAddOpen(false); setEditingSermon(null); }}
          tenantId={church.tenantId!}
          userId={church.userId}
          editing={editingSermon}
          onSuccess={invalidate}
        />
      )}

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sermon?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteId && deleteMut.mutate(deleteId)} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Sermons;
