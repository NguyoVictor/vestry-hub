import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { FinanceStatCard } from "@/components/finance/FinanceStatCard";
import { TransactionBadge } from "@/components/finance/TransactionBadge";
import { PaymentMethodIcon } from "@/components/finance/PaymentMethodIcon";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CreditCard, TrendingUp, Calendar, DollarSign, Plus } from "lucide-react";
import { format, startOfMonth, startOfYear } from "date-fns";
import { formatCurrencyFull } from "@/lib/format";

const GIVING_CATEGORIES = ["tithe", "offering", "building_fund", "welfare", "missions", "special", "other"] as const;
const PAYMENT_METHODS = ["cash", "mpesa", "bank_transfer", "card", "cheque", "other"] as const;

const GiveOnline = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [form, setForm] = useState({ member_id: "", amount: "", giving_type: "offering", payment_method: "cash", payment_reference: "", given_at: new Date().toISOString().split("T")[0], notes: "" });

  const { data: stats } = useQuery({
    queryKey: ["giving-stats", tenantId],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const yearStart = startOfYear(now).toISOString();
      const todayStr = now.toISOString().split("T")[0];

      const [todayRes, monthRes, yearRes] = await Promise.all([
        supabase.from("giving_records").select("amount").gte("given_at", todayStr),
        supabase.from("giving_records").select("amount").gte("given_at", monthStart.split("T")[0]),
        supabase.from("giving_records").select("amount").gte("given_at", yearStart.split("T")[0]),
      ]);
      const sum = (d: any) => (d.data || []).reduce((s: number, r: any) => s + Number(r.amount), 0);
      const monthData = monthRes.data || [];
      return {
        today: sum(todayRes),
        month: sum(monthRes),
        year: sum(yearRes),
        avg: monthData.length > 0 ? sum(monthRes) / monthData.length : 0,
      };
    },
    enabled: !!tenantId,
  });

  const { data: recentGiving = [] } = useQuery({
    queryKey: ["recent-giving", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("giving_records").select("*").order("given_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-list", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, first_name, last_name").order("first_name");
      return data || [];
    },
    enabled: !!tenantId,
  });

  const recordMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("giving_records").insert({
        tenant_id: tenantId,
        member_id: isAnonymous ? null : form.member_id || null,
        amount: parseFloat(form.amount),
        giving_type: form.giving_type as any,
        payment_method: form.payment_method as any,
        given_at: form.given_at,
        recorded_by: userId,
        currency,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["giving-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-giving"] });
      toast.success("Giving recorded successfully");
      setSheetOpen(false);
      setForm({ member_id: "", amount: "", giving_type: "offering", payment_method: "cash", payment_reference: "", given_at: new Date().toISOString().split("T")[0], notes: "" });
    },
    onError: () => toast.error("Failed to record giving"),
  });

  return (
    <>
      <Helmet><title>Give Online — Vestry</title></Helmet>
      <PageHeader title="Give Online" subtitle="Accept digital offerings and tithes from your congregation" action={<Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-1" />Record Giving</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <FinanceStatCard title="Total Giving Today" amount={stats?.today || 0} icon={DollarSign} />
        <FinanceStatCard title="Total This Month" amount={stats?.month || 0} icon={TrendingUp} />
        <FinanceStatCard title="Total This Year" amount={stats?.year || 0} icon={Calendar} />
        <FinanceStatCard title="Average Gift" amount={stats?.avg || 0} icon={CreditCard} subtitle="This month" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Donations</CardTitle></CardHeader>
        <CardContent>
          {recentGiving.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold">No donations yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Record your first giving to get started</p>
              <Button className="mt-4" onClick={() => setSheetOpen(true)}>Record Giving</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Donor</TableHead><TableHead>Amount</TableHead><TableHead>Category</TableHead><TableHead>Method</TableHead><TableHead>Date</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {recentGiving.map((r: any) => {
                  const member = members.find((m: any) => m.id === r.member_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{member ? <div className="flex items-center gap-2"><MemberAvatar name={`${member.first_name} ${member.last_name}`} size="sm" /><span className="text-sm">{member.first_name} {member.last_name}</span></div> : <span className="text-muted-foreground italic">Anonymous</span>}</TableCell>
                      <TableCell className="font-semibold text-emerald-600">{formatCurrencyFull(Number(r.amount), currency)}</TableCell>
                      <TableCell><TransactionBadge type={r.giving_type} /></TableCell>
                      <TableCell><PaymentMethodIcon method={r.payment_method} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.given_at ? format(new Date(r.given_at), "dd MMM yyyy") : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Record Giving</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
              <Label>Anonymous donation</Label>
            </div>
            {!isAnonymous && (
              <div>
                <Label>Donor</Label>
                <Select value={form.member_id} onValueChange={v => setForm(p => ({ ...p, member_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>{members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" /></div>
            <div><Label>Category</Label>
              <Select value={form.giving_type} onValueChange={v => setForm(p => ({ ...p, giving_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GIVING_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.payment_method === "mpesa" && <div><Label>M-Pesa Reference</Label><Input value={form.payment_reference} onChange={e => setForm(p => ({ ...p, payment_reference: e.target.value }))} /></div>}
            <div><Label>Date</Label><Input type="date" value={form.given_at} onChange={e => setForm(p => ({ ...p, given_at: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => recordMutation.mutate()} disabled={!form.amount || recordMutation.isPending}>
              {recordMutation.isPending ? "Recording..." : "Record Giving"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default GiveOnline;
