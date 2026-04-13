import { useState } from "react";
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
  PenLine, Plus, Search, Trash2, FileText, BookOpen, Sparkles,
  MoreHorizontal, Pencil, Eye, BookMarked, Clock, Users, CalendarDays,
  Archive,
} from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

// ── Helpers ──────────────────────────────────────────────────────────────────

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

const STYLE_COLORS = "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";

// ── Compose / Edit Sheet ─────────────────────────────────────────────────────

interface ComposeDialogProps {
  open: boolean;
  onClose: () => void;
  editing: any | null;
  tenantId: string;
  userId: string | null;
  onSuccess: () => void;
}

function ComposeDialog({ open, onClose, editing, tenantId, userId, onSuccess }: ComposeDialogProps) {
  const [title, setTitle] = useState(editing?.title || "");
  const [type, setType] = useState(editing?.sermon_type || "sermon");
  const [style, setStyle] = useState(editing?.style || "expository");
  const [scripture, setScripture] = useState(editing?.scripture_reference || "");
  const [audience, setAudience] = useState(editing?.audience || "General Congregation");
  const [duration, setDuration] = useState(editing?.duration || "30");
  const [status, setStatus] = useState(editing?.status || "draft");
  const [introduction, setIntroduction] = useState(editing?.introduction || "");
  const [manuscript, setManuscript] = useState(editing?.manuscript || "");
  const [notes, setNotes] = useState(editing?.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        title, scripture_reference: scripture, introduction, manuscript, notes,
        status, speaker: audience, tenant_id: tenantId, created_by: userId,
      };
      if (editing?.id) {
        const { error } = await supabase.from("sermons").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sermons").insert(payload);
        if (error) throw error;
      }
      toast.success(editing?.id ? "Updated successfully" : "Sermon saved");
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
            <Sparkles className="h-5 w-5 text-indigo-600" />
            {editing?.id ? "Edit Sermon / Study" : "Prepare Sermon / Study"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sermon">Sermon</SelectItem>
                  <SelectItem value="bible_study">Bible Study</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preaching Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expository">Expository</SelectItem>
                  <SelectItem value="topical">Topical</SelectItem>
                  <SelectItem value="narrative">Narrative</SelectItem>
                  <SelectItem value="textual">Textual</SelectItem>
                  <SelectItem value="biographical">Biographical</SelectItem>
                  <SelectItem value="evangelistic">Evangelistic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Title *</Label>
            <Input className="mt-1.5" placeholder="e.g. God's Masterpiece: Designed, Destined, and Dignified" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Scripture Reference</Label>
              <Input className="mt-1.5" placeholder="e.g. Romans 8:28-29" value={scripture} onChange={e => setScripture(e.target.value)} />
            </div>
            <div>
              <Label>Audience</Label>
              <Input className="mt-1.5" placeholder="e.g. General Congregation" value={audience} onChange={e => setAudience(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration (minutes)</Label>
              <Input className="mt-1.5" type="number" placeholder="30" value={duration} onChange={e => setDuration(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="outline">
            <TabsList>
              <TabsTrigger value="outline">Outline / Introduction</TabsTrigger>
              <TabsTrigger value="manuscript">Manuscript</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="outline" className="mt-3">
              <Textarea rows={6} placeholder="Write your sermon introduction and outline points..." value={introduction} onChange={e => setIntroduction(e.target.value)} className="resize-none" />
            </TabsContent>
            <TabsContent value="manuscript" className="mt-3">
              <Textarea rows={10} placeholder="Full sermon manuscript..." value={manuscript} onChange={e => setManuscript(e.target.value)} className="resize-none" />
            </TabsContent>
            <TabsContent value="notes" className="mt-3">
              <Textarea rows={6} placeholder="Private notes, illustrations, research..." value={notes} onChange={e => setNotes(e.target.value)} className="resize-none" />
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing?.id ? "Update" : "Save"}
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
          <Button onClick={() => { setEditingItem(null); setComposeOpen(true); }}>
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

      {/* ── Tab buttons ── */}
      <div className="flex items-center gap-1 border-b mb-5">
        {[
          { key: "saved", label: "Saved Content", icon: BookMarked },
          { key: "archive", label: "AI Training Archive", icon: Archive },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* ── Search + filters ── */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by title, theme, or scripture..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
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
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <PenLine className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-1">
              {activeTab === "archive" ? "No archived content" : "No saved content yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {activeTab === "archive"
                ? "Archived sermons and studies will appear here."
                : "Click \"Prepare Sermon/Study\" to create your first sermon or Bible study."}
            </p>
            {activeTab === "saved" && (
              <Button onClick={() => { setEditingItem(null); setComposeOpen(true); }}>
                <Sparkles className="mr-2 h-4 w-4" />Prepare Sermon/Study
              </Button>
            )}
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
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_COLORS[itemType] || TYPE_COLORS.sermon}`}>
                          {itemType === "bible_study" ? "Bible Study" : "Sermon"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STYLE_COLORS}`}>
                          {itemStyle}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[item.status] || STATUS_COLORS.draft}`}>
                          {item.status}
                        </span>
                      </div>
                      {/* Title */}
                      <p className="font-semibold text-sm leading-snug mb-2">{item.title}</p>
                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {item.scripture_reference && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />{item.scripture_reference}
                          </span>
                        )}
                        {item.speaker && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />{item.speaker}
                          </span>
                        )}
                        {item.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />{item.duration} min
                          </span>
                        )}
                        {item.created_at && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />{format(new Date(item.created_at), "dd MMM yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* ⋯ menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewItem(item)}>
                          <Eye className="h-4 w-4 mr-2" />View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditingItem(item); setComposeOpen(true); }}>
                          <Pencil className="h-4 w-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(item.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── View dialog ── */}
      {viewItem && (
        <Dialog open onOpenChange={() => setViewItem(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewItem.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_COLORS[viewItem.sermon_type || "sermon"]}`}>
                  {viewItem.sermon_type === "bible_study" ? "Bible Study" : "Sermon"}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[viewItem.status]}`}>{viewItem.status}</span>
              </div>
              {viewItem.scripture_reference && <p><span className="font-medium">Scripture:</span> {viewItem.scripture_reference}</p>}
              {viewItem.speaker && <p><span className="font-medium">Audience:</span> {viewItem.speaker}</p>}
              {viewItem.introduction && (
                <div>
                  <p className="font-medium mb-1">Outline / Introduction</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{viewItem.introduction}</p>
                </div>
              )}
              {viewItem.manuscript && (
                <div>
                  <p className="font-medium mb-1">Manuscript</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{viewItem.manuscript}</p>
                </div>
              )}
              {viewItem.notes && (
                <div>
                  <p className="font-medium mb-1">Notes</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{viewItem.notes}</p>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Compose / Edit dialog ── */}
      {composeOpen && (
        <ComposeDialog
          open={composeOpen}
          onClose={() => { setComposeOpen(false); setEditingItem(null); }}
          editing={editingItem}
          tenantId={church.tenantId!}
          userId={church.userId}
          onSuccess={invalidate}
        />
      )}

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sermon/study?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SermonPreparation;
