import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { FinanceStatCard } from "@/components/finance/FinanceStatCard";
import { PaymentMethodIcon } from "@/components/finance/PaymentMethodIcon";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { ArrowUpRight, Plus, TrendingDown, Calendar } from "lucide-react";
import { format, startOfMonth, startOfYear } from "date-fns";
import { formatCurrencyFull } from "@/lib/format";

const Payouts = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({ recipient_name: "", amount: "", payment_method: "bank_transfer", payment_status: "pending", reference: "", notes: "", currency: "KES" });

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["payouts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payouts").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const monthTotal = payouts.filter((p: any) => new Date(p.created_at) >= startOfMonth(new Date())).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const yearTotal = payouts.filter((p: any) => new Date(p.created_at) >= startOfYear(new Date())).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const pendingCount = payouts.filter((p: any) => p.payment_status === "pending").length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payouts").insert({
        tenant_id: tenantId, recipient_name: form.recipient_name, amount: parseFloat(form.amount),
        payment_method: form.payment_method as any, payment_status: form.payment_status as any,
        reference: form.reference, notes: form.notes, currency, created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payouts"] }); toast.success("Payout recorded"); setSheetOpen(false); setForm({ recipient_name: "", amount: "", payment_method: "bank_transfer", payment_status: "pending", reference: "", notes: "", currency: "KES" }); },
    onError: () => toast.error("Failed to record payout"),
  });

  const columns: Column<any>[] = [
    { key: "recipient_name", header: "Recipient", sortable: true, render: r => <span className="font-medium">{r.recipient_name}</span> },
    { key: "amount", header: "Amount", sortable: true, render: r => <span className="font-semibold text-destructive">{formatCurrencyFull(Number(r.amount), currency)}</span>, exportValue: r => String(r.amount) },
    { key: "payment_method", header: "Method", render: r => <PaymentMethodIcon method={r.payment_method || "cash"} /> },
    { key: "reference", header: "Reference", render: r => <span className="text-xs text-muted-foreground font-mono">{r.reference || "—"}</span> },
    { key: "created_at", header: "Date", sortable: true, render: r => <span className="text-sm text-muted-foreground">{r.created_at ? format(new Date(r.created_at), "dd MMM yyyy") : "—"}</span> },
    { key: "payment_status", header: "Status", sortable: true, render: r => <StatusBadge status={r.payment_status || "pending"} /> },
  ];

  return (
    <>
      <Helmet><title>Payouts — Vestry</title></Helmet>
      <PageHeader title="Payouts" subtitle="View and manage outgoing church payments and transfers" action={<Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-1" />Record Payout</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <FinanceStatCard title="Payouts This Month" amount={monthTotal} icon={TrendingDown} />
        <FinanceStatCard title="Payouts This Year" amount={yearTotal} icon={ArrowUpRight} />
        <FinanceStatCard title="Pending" amount={pendingCount} icon={Calendar} isCurrency={false} />
      </div>
      <DataTable data={payouts} columns={columns} loading={isLoading} getRowId={r => r.id} searchPlaceholder="Search payouts..." emptyIcon={<ArrowUpRight className="h-12 w-12 text-muted-foreground/30" />} emptyTitle="No payouts recorded" emptyCta={<Button onClick={() => setSheetOpen(true)}>Record Payout</Button>} />
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Record Payout</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Recipient Name</Label><Input value={form.recipient_name} onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))} /></div>
            <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div><Label>Payment Method</Label><Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["bank_transfer","mpesa","cash","cheque"].map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Reference</Label><Input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} /></div>
            <div><Label>Status</Label><Select value={form.payment_status} onValueChange={v => setForm(p => ({ ...p, payment_status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["processed","pending","failed","cancelled"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.recipient_name || !form.amount || saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Record Payout"}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Payouts;
