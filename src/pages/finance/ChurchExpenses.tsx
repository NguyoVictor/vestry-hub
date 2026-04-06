import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { FinanceStatCard } from "@/components/finance/FinanceStatCard";
import { TransactionBadge } from "@/components/finance/TransactionBadge";
import { PaymentMethodIcon } from "@/components/finance/PaymentMethodIcon";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";
import { Wallet, Plus, MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle, TrendingDown, AlertTriangle } from "lucide-react";
import { format, startOfMonth, startOfYear } from "date-fns";
import { formatCurrencyFull } from "@/lib/format";

const CATEGORIES = ["salaries", "utilities", "rent", "equipment", "maintenance", "events", "outreach", "supplies", "transport", "other"];
const METHODS = ["cash", "mpesa", "bank_transfer", "card", "cheque"];

const ChurchExpenses = () => {
  const { tenantId, currency, userId, userRole } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ description: "", amount: "", category: "other", payment_method: "cash", expense_date: new Date().toISOString().split("T")[0], recorded_by: "", title: "" });
  const isAdmin = ["super_admin", "church_admin", "admin"].includes(userRole);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const stats = {
    month: expenses.filter((e: any) => new Date(e.expense_date) >= startOfMonth(new Date())).reduce((s: number, e: any) => s + Number(e.amount), 0),
    year: expenses.filter((e: any) => new Date(e.expense_date) >= startOfYear(new Date())).reduce((s: number, e: any) => s + Number(e.amount), 0),
    pending: expenses.filter((e: any) => e.approval_status === "pending").length,
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { tenant_id: tenantId, description: form.description || form.title, amount: parseFloat(form.amount), category: form.category, payment_method: form.payment_method, expense_date: form.expense_date, recorded_by: userId, currency, title: form.title };
      if (editingId) {
        const { error } = await supabase.from("expenses").update(payload as any).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); toast.success(editingId ? "Expense updated" : "Expense added"); closeSheet(); },
    onError: () => toast.error("Failed to save"),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("expenses").update({ approval_status: status, approved_by: userId, approved_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(`Expense ${status}`);
      if (status === "approved") {
        logActivity({ churchId: tenantId!, actionType: "expense_approved", description: `An expense was approved`, entityType: "expense" });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("expenses").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Expense deleted"); },
  });

  const closeSheet = () => { setSheetOpen(false); setEditingId(null); setForm({ description: "", amount: "", category: "other", payment_method: "cash", expense_date: new Date().toISOString().split("T")[0], recorded_by: "", title: "" }); };

  const openEdit = (e: any) => { setEditingId(e.id); setForm({ description: e.description, amount: String(e.amount), category: e.category || "other", payment_method: e.payment_method || "cash", expense_date: e.expense_date, recorded_by: e.recorded_by || "", title: e.title || "" }); setSheetOpen(true); };

  const columns: Column<any>[] = [
    { key: "description", header: "Description", sortable: true, render: (r) => <div><span className="font-medium text-sm">{r.title || r.description}</span><div className="mt-0.5"><TransactionBadge type={r.category || "other"} /></div></div>, exportValue: r => r.description },
    { key: "amount", header: "Amount", sortable: true, render: (r) => <span className="font-semibold text-destructive">{formatCurrencyFull(Number(r.amount), currency)}</span>, exportValue: r => String(r.amount) },
    { key: "payment_method", header: "Method", render: (r) => <PaymentMethodIcon method={r.payment_method || "other"} /> },
    { key: "expense_date", header: "Date", sortable: true, render: (r) => <span className="text-sm text-muted-foreground">{r.expense_date ? format(new Date(r.expense_date), "dd MMM yyyy") : "—"}</span> },
    { key: "approval_status", header: "Status", sortable: true, render: (r) => <StatusBadge status={r.approval_status || "pending"} /> },
    { key: "actions", header: "", render: (r) => (
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEdit(r)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
          {isAdmin && r.approval_status === "pending" && <>
            <DropdownMenuItem onClick={() => approveMutation.mutate({ id: r.id, status: "approved" })}><CheckCircle className="h-4 w-4 mr-2" />Approve</DropdownMenuItem>
            <DropdownMenuItem onClick={() => approveMutation.mutate({ id: r.id, status: "rejected" })}><XCircle className="h-4 w-4 mr-2" />Reject</DropdownMenuItem>
          </>}
          <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <>
      <Helmet><title>Church Expenses — Vestry</title></Helmet>
      <PageHeader title="Church Expenses" subtitle="Log, categorize and approve church expenditure" action={<Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Expense</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <FinanceStatCard title="Expenses This Month" amount={stats.month} icon={TrendingDown} />
        <FinanceStatCard title="Expenses This Year" amount={stats.year} icon={Wallet} />
        <FinanceStatCard title="Pending Approval" amount={stats.pending} icon={AlertTriangle} isCurrency={false} />
      </div>
      <DataTable data={expenses} columns={columns} loading={isLoading} getRowId={r => r.id} searchPlaceholder="Search expenses..." emptyIcon={<Wallet className="h-12 w-12 text-muted-foreground/30" />} emptyTitle="No expenses recorded" emptyCta={<Button onClick={() => setSheetOpen(true)}>Add Expense</Button>} />
      <Sheet open={sheetOpen} onOpenChange={v => { if (!v) closeSheet(); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>{editingId ? "Edit Expense" : "Add Expense"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Payment Method</Label><Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.amount || saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Add Expense"}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ChurchExpenses;
