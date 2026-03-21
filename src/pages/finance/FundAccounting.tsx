import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, Plus } from "lucide-react";
import { formatCurrencyFull } from "@/lib/format";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const FUND_TYPES = ["restricted", "unrestricted", "temporarily_restricted"];

const FundAccounting = () => {
  const { tenantId, currency } = useChurch();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "unrestricted", description: "", purpose: "", target_amount: "", opening_balance: "0" });

  const { data: funds = [], isLoading } = useQuery({
    queryKey: ["funds", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("funds").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("funds").insert({
        tenant_id: tenantId, name: form.name, description: form.description, is_active: true,
        balance: parseFloat(form.opening_balance) || 0,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["funds"] }); toast.success("Fund created"); setDialogOpen(false); setForm({ name: "", type: "unrestricted", description: "", purpose: "", target_amount: "", opening_balance: "0" }); },
    onError: () => toast.error("Failed to create fund"),
  });

  const typeColors: Record<string, string> = { restricted: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", unrestricted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", temporarily_restricted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };

  return (
    <>
      <Helmet><title>Fund Accounting — Vestry</title></Helmet>
      <PageHeader title="Fund Accounting" subtitle="Track restricted and unrestricted church funds" action={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />Create Fund</Button>} />

      {isLoading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <Card key={i}><CardContent className="p-5 h-40 animate-pulse bg-muted" /></Card>)}</div> : funds.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg">No funds created</h3>
          <p className="text-sm text-muted-foreground mt-1">Create your first fund to start tracking</p>
          <Button className="mt-4" onClick={() => setDialogOpen(true)}>Create Fund</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {funds.map((f: any) => (
            <Card key={f.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{f.name}</h3>
                  <Badge variant="outline" className={typeColors[f.type || "unrestricted"] || typeColors.unrestricted}>
                    {(f.type || "unrestricted").replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </Badge>
                </div>
                <p className="text-2xl font-bold mt-2">{formatCurrencyFull(Number(f.balance || f.current_balance || 0), currency)}</p>
                {f.description && <p className="text-xs text-muted-foreground mt-2">{f.description}</p>}
                <div className="h-12 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[{ v: Number(f.balance || 0) * 0.7 }, { v: Number(f.balance || 0) * 0.85 }, { v: Number(f.balance || 0) * 0.9 }, { v: Number(f.balance || 0) * 0.95 }, { v: Number(f.balance || 0) }]}>
                      <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Create Fund</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Fund Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Fund Type</Label><Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FUND_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Opening Balance</Label><Input type="number" value={form.opening_balance} onChange={e => setForm(p => ({ ...p, opening_balance: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Fund"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FundAccounting;
