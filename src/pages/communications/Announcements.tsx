import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
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
import { Megaphone, Plus, Pin, Eye, MoreVertical, Trash2, Edit } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { logActivity } from "@/lib/activityLogger";

const categoryColors: Record<string, string> = {
  general: "bg-muted text-muted-foreground",
  service: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  event: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  finance: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  urgent: "bg-destructive/10 text-destructive",
};

export default function Announcements() {
  const { tenantId, userId, userName } = useChurch();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", is_pinned: false, target_audience: "all" as string });
  const [filter, setFilter] = useState("all");

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createAnnouncement = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({
        tenant_id: tenantId,
        title: form.title,
        body: form.body,
        is_pinned: form.is_pinned,
        target_audience: form.target_audience as any,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement posted");
      logActivity({ churchId: tenantId!, actionType: "new_announcement", description: `"${form.title}" was posted as an announcement`, actorName: userName, entityType: "announcement", entityName: form.title });
      setShowCreate(false);
      setForm({ title: "", body: "", is_pinned: false, target_audience: "all" });
    },
    onError: () => toast.error("Failed to post announcement"),
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement deleted");
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from("announcements").update({ is_pinned: pinned }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Pin updated");
    },
  });

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Post church-wide announcements visible to all members" action={<Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Post Announcement</Button>} />

      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "general", "service", "event", "finance", "urgent"].map(cat => (
          <Button key={cat} variant={filter === cat ? "default" : "outline"} size="sm" onClick={() => setFilter(cat)} className="capitalize">{cat}</Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : !announcements?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-lg font-medium">No announcements yet</p>
            <p className="text-muted-foreground text-sm">Post your first announcement to your congregation.</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>Post Announcement</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements
            .filter(a => filter === "all" || (a.target_audience as string) === filter)
            .map((ann) => (
              <Card key={ann.id} className={ann.is_pinned ? "border-primary/30 bg-primary/5" : ""}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {ann.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                        {ann.is_pinned && <Badge variant="secondary" className="text-xs">Pinned</Badge>}
                        <Badge className={categoryColors[(ann.target_audience as string) || "general"]}>{(ann.target_audience as string) || "general"}</Badge>
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{ann.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3">{ann.body}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <MemberAvatar name={userName || "Admin"} size="sm" />
                        <span className="text-xs text-muted-foreground">posted {ann.created_at ? formatDistanceToNow(new Date(ann.created_at), { addSuffix: true }) : ""}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => togglePin.mutate({ id: ann.id, pinned: !ann.is_pinned })}>
                          <Pin className="mr-2 h-4 w-4" />{ann.is_pinned ? "Unpin" : "Pin"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteAnnouncement.mutate(ann.id)}>
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

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Post Announcement</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title..." /></div>
            <div><Label>Body *</Label><Textarea value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your announcement..." rows={6} /></div>
            <div>
              <Label>Audience</Label>
              <Select value={form.target_audience} onValueChange={(v) => setForm(f => ({ ...f, target_audience: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="groups">Specific Groups</SelectItem>
                  <SelectItem value="leaders">Leaders Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Pin this announcement</Label>
              <Switch checked={form.is_pinned} onCheckedChange={(v) => setForm(f => ({ ...f, is_pinned: v }))} />
            </div>
            <Button className="w-full" disabled={!form.title || !form.body || createAnnouncement.isPending} onClick={() => createAnnouncement.mutate()}>
              {createAnnouncement.isPending ? "Posting..." : "Post Announcement"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
