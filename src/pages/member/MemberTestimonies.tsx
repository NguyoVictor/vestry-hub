import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { Quote, Plus } from "lucide-react";

const CATEGORIES = ["healing", "provision", "salvation", "restoration", "breakthrough", "other"];
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function MemberTestimonies() {
  const member = useMemberPortal();
  const queryClient = useQueryClient();
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ title: "", category: "other", body: "", is_anonymous: false, testimony_date: format(new Date(), "yyyy-MM-dd") });

  const { data: published = [], isLoading: pubLoading } = useQuery({
    queryKey: ["member-testimonies-published", member.churchId],
    queryFn: async () => {
      const { data } = await supabase.from("testimonies").select("*").eq("church_id", member.churchId).eq("status", "published").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: mine = [], isLoading: mineLoading } = useQuery({
    queryKey: ["member-testimonies-mine", member.memberId],
    queryFn: async () => {
      const { data } = await supabase.from("testimonies").select("*").eq("member_id", member.memberId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("testimonies").insert({
        ...form,
        member_id: member.memberId,
        church_id: member.churchId,
        status: "pending",
        author_name: form.is_anonymous ? "Anonymous" : `${member.firstName} ${member.lastName}`,
      });
      if (error) throw error;
      await supabase.from("activity_log").insert({ church_id: member.churchId, action_type: "testimony_submitted", description: `New testimony submitted`, entity_id: member.memberId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-testimonies-mine", member.memberId] });
      setSheet(false);
      setForm({ title: "", category: "other", body: "", is_anonymous: false, testimony_date: format(new Date(), "yyyy-MM-dd") });
      toast.success("Thank you! Your testimony has been submitted for review.");
    },
    onError: () => toast.error("Failed to submit testimony"),
  });

  return (
    <>
      <Helmet><title>Testimonies — Vestry</title></Helmet>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Testimonies</h1>
          <Button className="rounded-full gap-1.5" onClick={() => setSheet(true)}><Plus className="h-4 w-4" />Share</Button>
        </div>

        <Tabs defaultValue="published">
          <TabsList className="rounded-full">
            <TabsTrigger value="published" className="rounded-full">Published</TabsTrigger>
            <TabsTrigger value="mine" className="rounded-full">My Testimonies</TabsTrigger>
          </TabsList>

          <TabsContent value="published" className="space-y-3 mt-4">
            {pubLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />) :
              published.length === 0 ? <p className="text-center text-muted-foreground py-12">No testimonies yet</p> :
              published.map((t: any) => (
                <div key={t.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Quote className="h-4 w-4 text-indigo-400" />
                    <Badge variant="secondary" className="text-xs capitalize">{t.category}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{format(new Date(t.created_at), "dd MMM yyyy")}</span>
                  </div>
                  <h3 className="font-semibold">{t.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t.body}</p>
                  <div className="flex items-center gap-2">
                    <MemberAvatar name={t.author_name || "Anonymous"} size="sm" />
                    <span className="text-xs text-muted-foreground">{t.author_name || "Anonymous"}</span>
                  </div>
                </div>
              ))
            }
          </TabsContent>

          <TabsContent value="mine" className="space-y-3 mt-4">
            {mineLoading ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />) :
              mine.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Quote className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p>You haven't shared any testimonies yet</p>
                  <Button className="mt-4 rounded-full" onClick={() => setSheet(true)}><Plus className="h-4 w-4 mr-1" />Share a Testimony</Button>
                </div>
              ) : mine.map((t: any) => (
                <div key={t.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm flex-1">{t.title}</h3>
                    <Badge className={`text-xs capitalize ${STATUS_COLORS[t.status] || ""}`}>{t.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), "dd MMM yyyy")}</p>
                </div>
              ))
            }
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Share a Testimony</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Your Testimony *</Label><Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={6} placeholder="Share what God has done for you..." /></div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.testimony_date} onChange={e => setForm(f => ({ ...f, testimony_date: e.target.value }))} className="h-11 rounded-xl" /></div>
            <div className="flex items-center gap-3"><Switch checked={form.is_anonymous} onCheckedChange={v => setForm(f => ({ ...f, is_anonymous: v }))} /><Label>Share Anonymously</Label></div>
            <Button className="w-full h-11 rounded-full" onClick={() => submit.mutate()} disabled={!form.title || !form.body || submit.isPending}>
              {submit.isPending ? "Submitting..." : "Submit Testimony"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
