import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { FinanceStatCard } from "@/components/finance/FinanceStatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { FileText, Plus, MoreHorizontal, Pencil, CheckCircle, Trash2, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { formatCurrencyFull } from "@/lib/format";

const AccountsPayable = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ vendor_name: "", description: "", amount: "", due_date: "", currency: "KES" });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["accounts-payable", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts_payable").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const outstanding = invoices.filter((i: any) => i.payment_status !== "paid").reduce((s: number, i: any) => s + Number(i.amount), 0);
  const overdue = invoices.filter((i: any) => i.payment_status !== "paid" && i.due_date && new Date(i.due_date) < new Date()).reduce((s: number, i: any) => s + Number(i.amount), 0);
  const dueThisWeek = invoices.filter((i: any) => { if (i.payment_status === "paid" || !i.due_date) return false; const d = new Date(i.due_date); const now = new Date(); const week = new Date(now.getTime() + 7 * 86400000); return d >= now && d <= week; }).reduce((s: number, i: any) => s + Number(i.amount), 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { tenant_id: tenantId, vendor_name: form.vendor_name, description: form.description, amount: parseFloat(form.amount), due_date: form.due_date || null, currency: form.currency, created_by: userId };
      if (editingId) {
        const { error } = await supabase.from("accounts_payable").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts_payable").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accounts-payable"] }); toast.success(editingId ? "Updated" : "Invoice added"); closeSheet(); },
    onError: () => toast.error("Failed to save"),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts_payable").update({ payment_status: "paid" } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accounts-payable"] }); toast.success("Marked as paid"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("accounts_payable").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accounts-payable"] }); toast.success("Deleted"); },
  });

  const closeSheet = () => { setSheetOpen(false); setEditingId(null); setForm({ vendor_name: "", description: "", amount: "", due_date: "", currency: "KES" }); };

  const columns: Column<any>[] = [
    { key: "vendor_name", header: "Vendor", sortable: true, render: r => <span className="font-medium">{r.vendor_name}</span> },
    { key: "description", header: "Description", render: r => <span className="text-sm text-muted-foreground">{r.description || "—"}</span> },
    { key: "amount", header: "Amount", sortable: true, render: r => <span className="font-semibold">{formatCurrencyFull(Number(r.amount), currency)}</span>, exportValue: r => String(r.amount) },
    { key: "due_date", header: "Due Date", sortable: true, render: r => { const isOverdue = r.due_date && new Date(r.due_date) < new Date() && r.payment_status !== "paid"; return <span className={`text-sm ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>{r.due_date ? format(new Date(r.due_date), "dd MMM yyyy") : "—"}</span>; } },
    { key: "payment_status", header: "Status", sortable: true, render: r => <StatusBadge status={r.payment_status || "pending"} /> },
    { key: "actions", header: "", render: r => (
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {r.payment_status !== "paid" && <DropdownMenuItem onClick={() => markPaidMutation.mutate(r.id)}><CheckCircle className="h-4 w-4 mr-2" />Mark as Paid</DropdownMenuItem>}
          <DropdownMenuItem onClick={() => { setEditingId(r.id); setForm({ vendor_name: r.vendor_name, description: r.description || "", amount: String(r.amount), due_date: r.due_date || "", currency: r.currency || "KES" }); setSheetOpen(true); }}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <>
      <Helmet><title>Accounts Payable — Vestry</title></Helmet>
      <PageHeader title="Accounts Payable" subtitle="Manage vendor invoices and upcoming payments" action={<Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Invoice</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <FinanceStatCard title="Total Outstanding" amount={outstanding} icon={FileText} />
        <FinanceStatCard title="Due This Week" amount={dueThisWeek} icon={Clock} />
        <FinanceStatCard title="Overdue" amount={overdue} icon={AlertTriangle} />
      </div>
      <DataTable data={invoices} columns={columns} loading={isLoading} getRowId={r => r.id} searchPlaceholder="Search invoices..." emptyIcon={<FileText className="h-12 w-12 text-muted-foreground/30" />} emptyTitle="No invoices" emptyCta={<Button onClick={() => setSheetOpen(true)}>Add Invoice</Button>} />
      <Sheet open={sheetOpen} onOpenChange={v => { if (!v) closeSheet(); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>{editingId ? "Edit Invoice" : "Add Invoice"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Vendor Name</Label><Input value={form.vendor_name} onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.vendor_name || !form.amount || saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Add Invoice"}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AccountsPayable;
