import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Target, Plus, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { formatCurrencyFull } from "@/lib/format";

const CATEGORIES = ["building_fund", "missions", "equipment", "welfare", "community", "other"];

const PledgeCampaigns = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "other", target_amount: "", start_date: new Date().toISOString().split("T")[0], end_date: "", status: "draft" });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["pledge-campaigns", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pledge_campaigns").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: pledgesBycamp = {} } = useQuery({
    queryKey: ["pledges-summary", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("pledges").select("campaign_id, committed_amount, fulfilled_amount").eq("tenant_id", tenantId!);
      const map: Record<string, { count: number; pledged: number; paid: number }> = {};
      (data || []).forEach((p: any) => {
        if (!map[p.campaign_id]) map[p.campaign_id] = { count: 0, pledged: 0, paid: 0 };
        map[p.campaign_id].count++;
        map[p.campaign_id].pledged += Number(p.committed_amount);
        map[p.campaign_id].paid += Number(p.fulfilled_amount);
      });
      return map;
    },
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { tenant_id: tenantId, name: form.name, description: form.description, category: form.category, target_amount: parseFloat(form.target_amount), currency, start_date: form.start_date, end_date: form.end_date, status: form.status, created_by: userId };
      if (editingId) {
        const { error } = await supabase.from("pledge_campaigns").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pledge_campaigns").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pledge-campaigns"] }); toast.success(editingId ? "Campaign updated" : "Campaign created"); closeSheet(); },
    onError: () => toast.error("Failed to save campaign"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("pledge_campaigns").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pledge-campaigns"] }); toast.success("Campaign deleted"); },
  });

  const closeSheet = () => { setSheetOpen(false); setEditingId(null); setForm({ name: "", description: "", category: "other", target_amount: "", start_date: new Date().toISOString().split("T")[0], end_date: "", status: "draft" }); };

  const openEdit = (c: any) => { setEditingId(c.id); setForm({ name: c.name, description: c.description || "", category: c.category, target_amount: String(c.target_amount), start_date: c.start_date, end_date: c.end_date, status: c.status }); setSheetOpen(true); };

  return (
    <>
      <Helmet><title>Pledge Campaigns — Vestry</title></Helmet>
      <PageHeader title="Pledge Campaigns" subtitle="Run fundraising pledge drives for your church projects" action={<Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-1" />Create Campaign</Button>} />

      {isLoading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <Card key={i}><CardContent className="p-5 h-48 animate-pulse bg-muted" /></Card>)}</div> : campaigns.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Target className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg">No campaigns yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create your first pledge campaign to start fundraising</p>
          <Button className="mt-4" onClick={() => setSheetOpen(true)}>Create Campaign</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c: any) => {
            const summary = pledgesBycamp[c.id] || { count: 0, pledged: 0, paid: 0 };
            const pct = c.target_amount > 0 ? Math.min(100, (summary.pledged / Number(c.target_amount)) * 100) : 0;
            return (
              <Card key={c.id} className="relative">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{c.name}</h3>
                      <div className="flex gap-1.5 mt-1"><StatusBadge status={c.status} /><Badge variant="outline" className="text-xs">{c.category?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</Badge></div>
                    </div>
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Target: {formatCurrencyFull(Number(c.target_amount), currency)}</p>
                  <Progress value={pct} className="h-2 mb-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrencyFull(summary.pledged, currency)} pledged</span>
                    <span>{Math.round(pct)}%</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{summary.count} pledges</span>
                    <span>{c.start_date && c.end_date ? `${format(new Date(c.start_date), "dd MMM")} — ${format(new Date(c.end_date), "dd MMM yyyy")}` : ""}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={v => { if (!v) closeSheet(); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>{editingId ? "Edit Campaign" : "Create Campaign"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Campaign Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Target Amount</Label><Input type="number" value={form.target_amount} onChange={e => setForm(p => ({ ...p, target_amount: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["draft","active","completed","cancelled"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select></div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.name || !form.target_amount || !form.end_date || saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editingId ? "Update Campaign" : "Create Campaign"}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default PledgeCampaigns;
