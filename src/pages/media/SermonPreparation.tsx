import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PenLine, Search, Trash2, FileText, BookOpen, Sparkles,
  MoreHorizontal, Pencil, Eye, BookMarked, Clock, Users, CalendarDays,
  Archive, Loader2, Copy, Printer, CheckCircle2, Upload, Brain, FileCheck,
} from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

// ── Constants ────────────────────────────────────────────────────────────────

const AUDIENCES = ["General Congregation", "Youth", "Children", "Men", "Women", "Couples", "Leaders"];
const DURATIONS = ["15 minutes", "30 minutes", "45 minutes", "60 minutes"];

const TYPE_COLORS: Record<string, string> = {
  sermon: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  bible_study: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};
const STATUS_COLORS: Record<string, string> = {
  ready: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  published: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  archived: "bg-muted text-muted-foreground",
};
const STYLE_PILL = "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";

const STYLES = ["Expository", "Topical", "Narrative", "Devotional", "Apologetic", "Evangelistic"];

const ARCHIVE_CATEGORIES = [
  "General", "Church Doctrine", "Salvation", "Faith & Trust", "Prayer",
  "Worship", "Family & Marriage", "Leadership", "Evangelism", "Discipleship",
];

// ── Compose Dialog ───────────────────────────────────────────────────────────

interface ComposeDialogProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  userId: string | null;
  onSuccess: () => void;
}

function ComposeDialog({ open, onClose, tenantId, userId, onSuccess }: ComposeDialogProps) {
  const [tab, setTab] = useState<"setup" | "preview">("setup");
  const [type, setType] = useState("sermon");
  const [style, setStyle] = useState("Expository");
  const [theme, setTheme] = useState("");
  const [scripture, setScripture] = useState("");
  const [audience, setAudience] = useState("General Congregation");
  const [duration, setDuration] = useState("30 minutes");
  const [draftNotes, setDraftNotes] = useState("");
  const [instructions, setInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");

  const reset = () => {
    setTab("setup"); setType("sermon"); setStyle("Expository"); setTheme("");
    setScripture(""); setAudience("General Congregation"); setDuration("30 minutes");
    setDraftNotes(""); setInstructions(""); setGenerating(false); setSaving(false);
    setGeneratedContent(""); setGeneratedTitle("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleGenerate = async () => {
    if (!theme && !scripture) { toast.error("Please enter a theme/topic or scripture reference"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-sermon", {
        body: { type, style, theme, scripture, audience, duration, draftNotes, instructions, tenantId },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      const content: string = data.content;
      setGeneratedContent(content);
      const titleMatch = content.match(/\*\*TITLE:\*\*\s*(.+)/);
      setGeneratedTitle(titleMatch ? titleMatch[1].trim() : theme || `${style} ${type === "sermon" ? "Sermon" : "Bible Study"}`);
      setTab("preview");
      toast.success("Content generated successfully!");
    } catch {
      toast.error("Generation failed — please try again in a moment");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("sermons").insert({
        tenant_id: tenantId,
        created_by: userId,
        title: generatedTitle,
        scripture_reference: scripture || null,
        sermon_type: type,
        style: style.toLowerCase(),
        audience,
        duration,
        draft_notes: draftNotes || null,
        additional_instructions: instructions || null,
        manuscript: generatedContent,
        status: "ready",
        ai_generated: true,
        speaker: audience,
      } as any);
      if (error) throw error;
      toast.success("Sermon saved to Saved Content!");
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success("Copied to clipboard");
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>${generatedTitle}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;line-height:1.8;color:#1a1a1a}h1{font-size:24px;margin-bottom:8px}pre{white-space:pre-wrap;font-family:inherit}</style></head><body><h1>${generatedTitle}</h1><pre>${generatedContent}</pre></body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            AI Sermon &amp; Bible Study Preparation
          </DialogTitle>
          {/* Info banner */}
          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Upload sermon archives in the 'AI Training Archive' tab to enable AI-powered topic suggestions.
          </div>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex border rounded-lg overflow-hidden shrink-0 mt-1">
          <button
            onClick={() => setTab("setup")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === "setup" ? "bg-slate-100 dark:bg-slate-700 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Setup
          </button>
          <button
            onClick={() => { if (generatedContent) setTab("preview"); }}
            disabled={!generatedContent}
            className={`flex-1 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${tab === "preview" ? "bg-slate-100 dark:bg-slate-700 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Preview &amp; Actions
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "setup" ? (
            <div className="space-y-4 py-2">
              {/* Type selector */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "sermon", label: "Sermon", desc: "Full sermon outline with points and applications", icon: "📖" },
                  { key: "bible_study", label: "Bible Study", desc: "Discussion-based study with questions", icon: "📚" },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setType(t.key)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${type === t.key ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Style */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Style</Label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${style === s ? "bg-orange-400 text-white border-orange-400" : "border-slate-200 dark:border-slate-700 text-muted-foreground hover:border-slate-300"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme + Scripture */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Theme/Topic</Label>
                  <Input className="mt-1.5" placeholder="e.g. Faith in difficult times" value={theme} onChange={e => setTheme(e.target.value)} />
                </div>
                <div>
                  <Label>Main Scripture Reference</Label>
                  <Input className="mt-1.5" placeholder="e.g. Romans 8:28-39" value={scripture} onChange={e => setScripture(e.target.value)} />
                </div>
              </div>

              {/* Audience + Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Target Audience</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>{AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>{DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Draft notes */}
              <div>
                <Label>Draft Sermon / Idea Notes (Optional)</Label>
                <Textarea
                  className="mt-1.5 resize-none"
                  rows={4}
                  placeholder="Paste your draft sermon, sermon outline, or idea notes here. The AI will use this as a foundation to build upon..."
                  value={draftNotes}
                  onChange={e => setDraftNotes(e.target.value)}
                />
              </div>

              {/* Additional instructions */}
              <div>
                <Label>Additional Instructions (Optional)</Label>
                <Textarea
                  className="mt-1.5 resize-none"
                  rows={3}
                  placeholder="Any specific points to cover, illustrations to include, or context for the message..."
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                />
              </div>

              {/* Generate button */}
              <Button
                className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleGenerate}
                disabled={generating || (!theme && !scripture)}
              >
                {generating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating {type === "sermon" ? "Sermon" : "Bible Study"}...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" />Generate {type === "sermon" ? "Sermon" : "Bible Study"}</>
                )}
              </Button>
            </div>
          ) : (
            /* ── Preview & Actions ── */
            <div className="space-y-4 py-2">
              {/* Title + meta */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-base mb-2">{generatedTitle}</h3>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_COLORS[type]}`}>
                    {type === "bible_study" ? "Bible Study" : "Sermon"}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STYLE_PILL}`}>{style}</span>
                  {scripture && <span className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="h-3 w-3" />{scripture}</span>}
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{audience}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{duration}</span>
                </div>
              </div>

              {/* Generated content */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 max-h-[320px] overflow-y-auto">
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">{generatedContent}</pre>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />Copy to Clipboard
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />Print / Export
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setTab("setup")}>
                  ← Back to Setup
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Save to Library</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Upload Archive Dialog ────────────────────────────────────────────────────

interface UploadArchiveDialogProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  userId: string | null;
  onSuccess: () => void;
}

function UploadArchiveDialog({ open, onClose, tenantId, userId, onSuccess }: UploadArchiveDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [preacher, setPreacher] = useState("");
  const [sermonDate, setSermonDate] = useState("");
  const [scriptureRefs, setScriptureRefs] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setFile(null); setTitle(""); setCategory("General"); setPreacher("");
    setSermonDate(""); setScriptureRefs(""); setDescription(""); setTags("");
  };
  const handleClose = () => { reset(); onClose(); };

  const handleUpload = async () => {
    if (!file || !title.trim()) { toast.error("File and title are required"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: storageErr } = await supabase.storage.from("sermon-archives").upload(path, file);
      if (storageErr) throw storageErr;
      // Private bucket — store path only, generate signed URLs on demand
      const { data: insertData, error: dbErr } = await supabase.from("sermon_archives" as any).insert({
        tenant_id: tenantId,
        title,
        category,
        preacher: preacher || null,
        sermon_date: sermonDate || null,
        scripture_references: scriptureRefs || null,
        description: description || null,
        tags: tags || null,
        file_url: path,  // store path, not public URL — bucket is private
        file_name: file.name,
        file_size: file.size,
        storage_path: path,
        status: "pending",
        uploaded_by: userId,
      }).select();
      if (dbErr) throw dbErr;

      // Kick off AI processing in the background — don't await so UI closes immediately
      toast.success("Uploaded! AI is processing your archive...");
      onSuccess();
      handleClose();

      // Fire-and-forget: process the archive asynchronously
      supabase.functions.invoke("process-sermon-archive", {
        body: { archiveId: (insertData as any)?.[0]?.id },
      }).then(() => {
        // Invalidate so the status updates when the user is still on the page
        onSuccess();
      }).catch(() => {/* silent — status will show "pending" until manually retried */});
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Sermon Notes</DialogTitle>
          <p className="text-sm text-muted-foreground">Upload sermon manuscripts, notes, or teaching materials to train the AI</p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* File picker */}
          <div>
            <Label>File *</Label>
            <div
              className="mt-1.5 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              {file ? (
                <p className="text-sm font-medium text-indigo-600">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-muted-foreground">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">PDF, DOC, DOCX, TXT, MD, RTF (max 50MB)</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,.rtf"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {/* Title */}
          <div>
            <Label>Title *</Label>
            <Input className="mt-1.5" placeholder="Sermon or teaching title" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* Category + Preacher */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ARCHIVE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preacher/Teacher</Label>
              <Input className="mt-1.5" placeholder="Name of speaker" value={preacher} onChange={e => setPreacher(e.target.value)} />
            </div>
          </div>

          {/* Date + Scripture */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sermon Date</Label>
              <Input className="mt-1.5" type="date" value={sermonDate} onChange={e => setSermonDate(e.target.value)} />
            </div>
            <div>
              <Label>Scripture References</Label>
              <Input className="mt-1.5" placeholder="John 3:16, Romans 8:28" value={scriptureRefs} onChange={e => setScriptureRefs(e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              className="mt-1.5 resize-none"
              rows={3}
              placeholder="Brief description of the sermon content and themes"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <Input className="mt-1.5" placeholder="faith, hope, salvation (comma separated)" value={tags} onChange={e => setTags(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={uploading}>Cancel</Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleUpload}
              disabled={!file || !title.trim() || uploading}
            >
              {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : <><Upload className="mr-2 h-4 w-4" />Upload</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

const SermonPreparation = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"saved" | "archive">("saved");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [uploadArchiveOpen, setUploadArchiveOpen] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState("all");

  const { data: sermons = [], isLoading } = useQuery({
    queryKey: ["sermons", church.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sermons").select("*")
        .eq("tenant_id", church.tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: archives = [], isLoading: archivesLoading } = useQuery({
    queryKey: ["sermon_archives", church.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sermon_archives" as any)
        .select("*")
        .eq("tenant_id", church.tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!church.tenantId,
    staleTime: 60000,
  });

  const deleteArchiveMut = useMutation({
    mutationFn: async (item: any) => {
      if (item.storage_path) {
        await supabase.storage.from("sermon-archives").remove([item.storage_path]);
      }
      const { error } = await supabase.from("sermon_archives" as any).delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sermon_archives"] });
      toast.success("Archive deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sermons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sermons"] });
      toast.success("Deleted");
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["sermons"] });
  const invalidateArchives = () => qc.invalidateQueries({ queryKey: ["sermon_archives"] });

  const filtered = sermons.filter((s: any) => {
    const matchTab = activeTab === "archive" ? s.status === "archived" : s.status !== "archived";
    const matchType = typeFilter === "all" || (s.sermon_type || "sermon") === typeFilter;
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchSearch = !search.trim() ||
      (s.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.scripture_reference || "").toLowerCase().includes(search.toLowerCase());
    return matchTab && matchType && matchStatus && matchSearch;
  });

  return (
    <>
      <Helmet><title>Sermon Preparation — Vestry</title></Helmet>
      <PageHeader
        title="Sermon Preparation"
        subtitle="AI-powered sermon and Bible study preparation with storage, sharing, and printing"
        action={
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setComposeOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />Prepare Sermon/Study
          </Button>
        }
      />

      {/* ── Info card ── */}
      <Card className="mb-6 border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-orange-50/60 to-indigo-50/40 dark:from-orange-900/10 dark:to-indigo-900/10">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-base mb-1">AI-Powered Sermon &amp; Bible Study Preparation</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Create comprehensive sermon outlines and Bible studies in minutes. Choose from multiple styles (expository, topical, narrative, and more), specify your audience, and let AI generate structured content with scripture references, illustrations, and application points.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: FileText, label: "Full Sermon Outlines" },
                { icon: BookOpen, label: "Bible Study Guides" },
                { icon: PenLine, label: "6 Preaching Styles" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <Icon className="h-3.5 w-3.5 text-orange-500" />{label}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b mb-5">
        {[
          { key: "saved", label: "Saved Content", icon: BookMarked },
          { key: "archive", label: "AI Training Archive", icon: Archive },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key ? "border-indigo-600 text-indigo-600" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* ── Search + filters (Saved Content tab only) ── */}
      {activeTab === "saved" && (
        <>
          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by title, theme, or scripture..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sermon">Sermons</SelectItem>
                  <SelectItem value="bible_study">Bible Study</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Content list ── */}
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20">
                <PenLine className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg mb-1">No saved content yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Click "Prepare Sermon/Study" to generate your first AI-powered sermon or Bible study.</p>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setComposeOpen(true)}>
                  <Sparkles className="mr-2 h-4 w-4" />Prepare Sermon/Study
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((item: any) => {
                const itemType = item.sermon_type || "sermon";
                const itemStyle = item.style || "expository";
                return (
                  <Card key={item.id} className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_COLORS[itemType] || TYPE_COLORS.sermon}`}>
                              {itemType === "bible_study" ? "Bible Study" : "Sermon"}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STYLE_PILL}`}>{itemStyle}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[item.status] || STATUS_COLORS.draft}`}>{item.status}</span>
                            {(item as any).ai_generated && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                <Sparkles className="h-3 w-3" />AI
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-sm leading-snug mb-2">{item.title}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {item.scripture_reference && <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{item.scripture_reference}</span>}
                            {item.speaker && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{item.speaker}</span>}
                            {item.duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{item.duration}</span>}
                            {item.created_at && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(item.created_at), "dd MMM yyyy")}</span>}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewItem(item)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── AI Training Archive tab ── */}
      {activeTab === "archive" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { icon: FileText, color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20", val: archives.length, label: "Total Archives" },
              { icon: FileCheck, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20", val: archives.filter((a: any) => a.status === "processed").length, label: "AI Processed" },
              { icon: Clock, color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20", val: archives.filter((a: any) => a.status === "pending").length, label: "Pending Processing" },
            ].map(({ icon: Icon, color, val, label }) => (
              <Card key={label}>
                <CardContent className="p-5 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${color.split(" ").slice(1).join(" ")}`}>
                    <Icon className={`h-5 w-5 ${color.split(" ")[0]}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{val}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Info card */}
          <Card className="mb-5 border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-50/60 to-purple-50/40 dark:from-indigo-900/10 dark:to-purple-900/10">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 mt-0.5">
                <Brain className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1">Train AI with Your Church's Voice</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload sermon notes, manuscripts, and teaching materials to help the AI understand your church's doctrine, message tone, and delivery style. This enriches AI-generated content to be specific to your church rather than generic.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["PDF", "Word Documents", "Text Files", "RTF"].map(f => (
                    <span key={f} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{f}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search + category filter + upload button */}
          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search archives..." value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} />
            </div>
            <Select value={archiveCategoryFilter} onValueChange={setArchiveCategoryFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {ARCHIVE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white shrink-0" onClick={() => setUploadArchiveOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />Upload Sermon Notes
            </Button>
          </div>

          {/* Archive list */}
          {archivesLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : (() => {
            const filteredArchives = archives.filter((a: any) => {
              const matchCat = archiveCategoryFilter === "all" || a.category === archiveCategoryFilter;
              const matchSearch = !archiveSearch.trim() ||
                (a.title || "").toLowerCase().includes(archiveSearch.toLowerCase()) ||
                (a.preacher || "").toLowerCase().includes(archiveSearch.toLowerCase());
              return matchCat && matchSearch;
            });
            return filteredArchives.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="font-semibold text-lg mb-1">No sermon archives yet</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
                    Upload sermon notes and manuscripts to help the AI understand your church's unique voice and doctrine.
                  </p>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setUploadArchiveOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />Upload First Archive
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredArchives.map((item: any) => (
                  <Card key={item.id} className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0 mt-0.5">
                            <FileText className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">{item.category}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${item.status === "processed" ? "bg-emerald-100 text-emerald-700" : item.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                {item.status}
                              </span>
                            </div>
                            <p className="font-semibold text-sm leading-snug">{item.title}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                              {item.preacher && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{item.preacher}</span>}
                              {item.sermon_date && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(item.sermon_date), "dd MMM yyyy")}</span>}
                              {item.scripture_references && <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{item.scripture_references}</span>}
                              {item.file_name && <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{item.file_name}</span>}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {item.file_url && (
                              <DropdownMenuItem onClick={async () => {
                                if (item.storage_path) {
                                  const { data } = await supabase.storage
                                    .from("sermon-archives")
                                    .createSignedUrl(item.storage_path, 60);
                                  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                                } else {
                                  window.open(item.file_url, "_blank");
                                }
                              }}>
                                <Eye className="h-4 w-4 mr-2" />View File
                              </DropdownMenuItem>
                            )}
                            {(item.status === "pending" || item.status === "failed") && (
                              <DropdownMenuItem onClick={async () => {
                                toast.info("Retrying AI processing...");
                                const { error } = await supabase.functions.invoke("process-sermon-archive", {
                                  body: { archiveId: item.id },
                                });
                                if (error) {
                                  toast.error("Retry failed — check logs");
                                } else {
                                  toast.success("Processing complete!");
                                  qc.invalidateQueries({ queryKey: ["sermon_archives"] });
                                }
                              }}>
                                <Brain className="h-4 w-4 mr-2" />Retry Processing
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteArchiveMut.mutate(item)}>
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </>
      )}

      {/* ── View dialog ── */}
      {viewItem && (
        <Dialog open onOpenChange={() => setViewItem(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle>{viewItem.title}</DialogTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_COLORS[viewItem.sermon_type || "sermon"]}`}>
                  {viewItem.sermon_type === "bible_study" ? "Bible Study" : "Sermon"}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[viewItem.status]}`}>{viewItem.status}</span>
                {viewItem.ai_generated && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700"><Sparkles className="h-3 w-3" />AI Generated</span>}
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3 py-2">
                {viewItem.scripture_reference && <p className="text-sm"><span className="font-medium">Scripture:</span> {viewItem.scripture_reference}</p>}
                {viewItem.speaker && <p className="text-sm"><span className="font-medium">Audience:</span> {viewItem.speaker}</p>}
                {viewItem.duration && <p className="text-sm"><span className="font-medium">Duration:</span> {viewItem.duration}</p>}
                {viewItem.manuscript && (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{viewItem.manuscript}</pre>
                  </div>
                )}
                {viewItem.introduction && !viewItem.manuscript && (
                  <div>
                    <p className="font-medium text-sm mb-1">Introduction</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewItem.introduction}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-3 shrink-0 border-t">
              <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(viewItem.manuscript || viewItem.introduction || ""); toast.success("Copied"); }}>
                <Copy className="mr-2 h-4 w-4" />Copy
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => {
                const win = window.open("", "_blank");
                if (!win) return;
                win.document.write(`<html><head><title>${viewItem.title}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;line-height:1.8}pre{white-space:pre-wrap;font-family:inherit}</style></head><body><h1>${viewItem.title}</h1><pre>${viewItem.manuscript || viewItem.introduction || ""}</pre></body></html>`);
                win.document.close(); win.print();
              }}>
                <Printer className="mr-2 h-4 w-4" />Print
              </Button>
              <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Upload Archive dialog ── */}
      <UploadArchiveDialog
        open={uploadArchiveOpen}
        onClose={() => setUploadArchiveOpen(false)}
        tenantId={church.tenantId!}
        userId={church.userId}
        onSuccess={invalidateArchives}
      />

      {/* ── Compose dialog ── */}
      <ComposeDialog
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        tenantId={church.tenantId!}
        userId={church.userId}
        onSuccess={invalidate}
      />

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sermon/study?</AlertDialogTitle>
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

export default SermonPreparation;
