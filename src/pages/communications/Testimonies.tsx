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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Quote, Plus, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";

const categoryColors: Record<string, string> = {
  healing: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  financial: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  salvation: "bg-primary/10 text-primary",
  marriage: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  career: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  other: "bg-muted text-muted-foreground",
};

export default function Testimonies() {
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "other", is_anonymous: false });

  const { data: testimonies, isLoading } = useQuery({
    queryKey: ["testimonies", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("testimonies")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, first_name, last_name").eq("tenant_id", tenantId);
      return data || [];
    },
  });

  const createTestimony = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("testimonies").insert({
        tenant_id: tenantId,
        member_id: userId,
        title: form.title,
        body: form.body,
        is_approved: true,
        approved_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonies"] });
      toast.success("Testimony added");
      setShowCreate(false);
      setForm({ title: "", body: "", category: "other", is_anonymous: false });
      logActivity({ churchId: tenantId!, actionType: "new_testimony", description: `A new testimony "${form.title}" was submitted`, entityType: "testimony", entityName: form.title });
    },
    onError: () => toast.error("Failed to add testimony"),
  });

  const approveTestimony = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase.from("testimonies").update({
        is_approved: approved,
        approved_by: approved ? userId : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, approved }) => {
      queryClient.invalidateQueries({ queryKey: ["testimonies"] });
      toast.success("Testimony updated");
      if (approved) {
        logActivity({ churchId: tenantId!, actionType: "testimony_published", description: "A testimony was approved and published", entityType: "testimony", entityId: id });
      }
    },
  });

  const published = testimonies?.filter(t => t.is_approved) || [];
  const pending = testimonies?.filter(t => !t.is_approved) || [];

  const getUserName = (id: string | null) => {
    if (!id) return "Anonymous";
    const user = users?.find(u => u.id === id);
    return user ? `${user.first_name} ${user.last_name}` : "Unknown";
  };

  const TestimonyCard = ({ testimony, showActions }: { testimony: any; showActions?: boolean }) => (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge className={categoryColors[testimony.category || "other"]}>{testimony.category || "other"}</Badge>
            {testimony.is_anonymous && <Badge variant="secondary">Anonymous</Badge>}
          </div>
          {showActions && (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => approveTestimony.mutate({ id: testimony.id, approved: true })}>
                <Check className="h-3.5 w-3.5 mr-1" />Approve
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => approveTestimony.mutate({ id: testimony.id, approved: false })}>
                <X className="h-3.5 w-3.5 mr-1" />Reject
              </Button>
            </div>
          )}
        </div>
        <h3 className="font-semibold text-lg mb-2">{testimony.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-4">{testimony.body}</p>
        <div className="flex items-center gap-2 mt-4">
          <MemberAvatar name={testimony.is_anonymous ? "A" : getUserName(testimony.member_id || testimony.submitted_by)} size="sm" />
          <span className="text-xs text-muted-foreground">
            {testimony.is_anonymous ? "Anonymous Member" : getUserName(testimony.member_id || testimony.submitted_by)} · shared {testimony.created_at ? formatDistanceToNow(new Date(testimony.created_at), { addSuffix: true }) : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div>
      <PageHeader title="Testimonies" subtitle="Collect and share testimonies from your congregation" action={<Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Add Testimony</Button>} />

      <Tabs defaultValue="published">
        <TabsList>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="pending">Pending Approval {pending.length > 0 && <Badge className="ml-1" variant="destructive">{pending.length}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="published">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
          ) : !published.length ? (
            <Card><CardContent className="py-12 text-center">
              <Quote className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-lg font-medium">No testimonies yet</p>
              <p className="text-muted-foreground text-sm">Add the first testimony from your congregation.</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>Add Testimony</Button>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {published.map(t => <TestimonyCard key={t.id} testimony={t} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {!pending.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No pending testimonies.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {pending.map(t => <TestimonyCard key={t.id} testimony={t} showActions />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Add Testimony</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Testimony title..." /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["healing", "financial", "salvation", "marriage", "career", "other"].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Testimony *</Label><Textarea value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Share the testimony..." rows={8} /></div>
            <div className="flex items-center justify-between">
              <Label>Share anonymously</Label>
              <Switch checked={form.is_anonymous} onCheckedChange={(v) => setForm(f => ({ ...f, is_anonymous: v }))} />
            </div>
            <Button className="w-full" disabled={!form.title || !form.body || createTestimony.isPending} onClick={() => createTestimony.mutate()}>
              {createTestimony.isPending ? "Adding..." : "Add Testimony"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
