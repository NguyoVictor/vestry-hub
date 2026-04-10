import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Megaphone, Plus, Pin, MoreVertical, Trash2, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";

const CATEGORIES = ["general", "service", "event", "finance", "urgent"] as const;
type Category = typeof CATEGORIES[number];

const categoryColors: Record<string, string> = {
  general: "bg-muted text-muted-foreground",
  service: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  event: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  finance: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  urgent: "bg-destructive/10 text-destructive",
};

const EMPTY_FORM = {
  title: "", body: "", category: "general" as Category,
  target_audience: "all" as string, target_id: "" as string, is_pinned: false,
};

export default function Announcements() {
  const { tenantId, userId, userName } = useChurch();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.ANNOUNCEMENTS)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 300000,
  });

  const { data: groups } = useQuery({
    queryKey: ["groups", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.GROUPS)
        .select("id, name")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
    staleTime: 300000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const createAnnouncement = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(TABLES.ANNOUNCEMENTS).insert({
        tenant_id: tenantId,
        title: form.title,
        body: form.body,
        category: form.category,
        is_pinned: form.is_pinned,
        target_audience: form.target_audience as any,
        target_id: form.target_audience === "group" ? form.target_id || null : null,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement posted");
      logActivity({ churchId: tenantId!, actionType: "new_announcement", description: `"${form.title}" was posted`, actorName: userName, entityType: "announcement", entityName: form.title });
      setSheetOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error("Failed to post announcement"),
  });

  const updateAnnouncement = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from(TABLES.ANNOUNCEMENTS)
        .update({
          title: form.title,
          body: form.body,
          category: form.category,
          is_pinned: form.is_pinned,
          target_audience: form.target_audience as any,
          target_id: form.target_audience === "group" ? form.target_id || null : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement updated");
      setSheetOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error("Failed to update announcement"),
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.ANNOUNCEMENTS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement deleted");
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete announcement"),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from(TABLES.ANNOUNCEMENTS).update({ is_pinned: pinned }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Pin updated");
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSheetMode("create");
    setSheetOpen(true);
  }

  function openEdit(ann: any) {
    setForm({
      title: ann.title ?? "",
      body: ann.body ?? "",
      category: (ann.category ?? "general") as Category,
      target_audience: ann.target_audience ?? "all",
      target_id: ann.target_id ?? "",
      is_pinned: ann.is_pinned ?? false,
    });
    setEditingId(ann.id);
    setSheetMode("edit");
    setSheetOpen(true);
  }

  function handleSubmit() {
    if (sheetMode === "edit") updateAnnouncement.mutate();
    else createAnnouncement.mutate();
  }

  const isMutating = createAnnouncement.isPending || updateAnnouncement.isPending;

  const filtered = announcements?.filter(a =>
    filter === "all" || (a.category as string) === filter
  ) ?? [];

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Post church-wide announcements visible to all members"
        action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Post Announcement</Button>}
      />

      {/* Category filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", ...CATEGORIES].map(cat => (
          <Button key={cat} variant={filter === cat ? "default" : "outline"} size="sm" onClick={() => setFilter(cat)} className="capitalize">{cat}</Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : !filtered.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-lg font-medium">{filter === "all" ? "No announcements yet" : `No ${filter} announcements`}</p>
            <p className="text-muted-foreground text-sm">Post your first announcement to your congregation.</p>
            <Button className="mt-4" onClick={openCreate}>Post Announcement</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((ann: any) => (
            <Card key={ann.id} className={ann.is_pinned ? "border-primary/30 bg-primary/5" : ""}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {ann.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                      {ann.is_pinned && <Badge variant="secondary" className="text-xs">Pinned</Badge>}
                      {/* Category badge */}
                      <Badge className={categoryColors[(ann.category as string) || "general"]}>
                        {(ann.category as string) || "general"}
                      </Badge>
                      {/* Audience badge */}
                      <Badge variant="outline" className="text-xs capitalize">
                        {ann.target_audience === "group"
                          ? `Group: ${groups?.find((g: any) => g.id === ann.target_id)?.name ?? ann.target_id ?? "specific"}`
                          : ann.target_audience === "branch" ? "Branch" : "All Members"}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{ann.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">{ann.body}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <MemberAvatar name={userName || "Admin"} size="sm" />
                      <span className="text-xs text-muted-foreground">
                        posted {ann.created_at ? formatDistanceToNow(new Date(ann.created_at), { addSuffix: true }) : ""}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(ann)}>
                        <Pencil className="mr-2 h-4 w-4" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => togglePin.mutate({ id: ann.id, pinned: !ann.is_pinned })}>
                        <Pin className="mr-2 h-4 w-4" />{ann.is_pinned ? "Unpin" : "Pin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(ann.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={open => {
        setSheetOpen(open);
        if (!open) { setEditingId(null); setForm(EMPTY_FORM); }
      }}>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheetMode === "edit" ? "Edit Announcement" : "Post Announcement"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title..." />
            </div>
            <div>
              <Label>Body *</Label>
              <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your announcement..." rows={6} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as Category }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Audience</Label>
              <Select value={form.target_audience} onValueChange={v => setForm(f => ({ ...f, target_audience: v, target_id: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="group">Specific Group</SelectItem>
                  <SelectItem value="branch">Leaders Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.target_audience === "group" && (
              <div>
                <Label>Group</Label>
                <Select value={form.target_id} onValueChange={v => setForm(f => ({ ...f, target_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a group..." /></SelectTrigger>
                  <SelectContent>
                    {groups?.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Pin this announcement</Label>
              <Switch checked={form.is_pinned} onCheckedChange={v => setForm(f => ({ ...f, is_pinned: v }))} />
            </div>
            <Button
              className="w-full"
              disabled={!form.title || !form.body || (form.target_audience === "group" && !form.target_id) || isMutating}
              onClick={handleSubmit}
            >
              {isMutating
                ? sheetMode === "edit" ? "Saving..." : "Posting..."
                : sheetMode === "edit" ? "Save Changes" : "Post Announcement"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this announcement? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteAnnouncement.mutate(deleteId)}
              disabled={deleteAnnouncement.isPending}
            >
              {deleteAnnouncement.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
