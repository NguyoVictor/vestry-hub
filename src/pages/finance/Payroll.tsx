import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { FinanceStatCard } from "@/components/finance/FinanceStatCard";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { PaymentMethodIcon } from "@/components/finance/PaymentMethodIcon";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";
import { Banknote, Plus, Users, Calendar } from "lucide-react";
import { formatCurrencyFull } from "@/lib/format";

const Payroll = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ member_id: "", job_title: "", employment_type: "full_time", gross_salary: "", net_salary: "", payment_method: "bank_transfer", bank_name: "", account_number: "", mpesa_number: "", start_date: new Date().toISOString().split("T")[0], notes: "" });

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["payroll-staff", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payroll_staff").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-list", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, first_name, last_name");
      return data || [];
    },
    enabled: !!tenantId,
  });

  const getMemberName = (id: string | null) => {
    if (!id) return "Unknown";
    const m = members.find((m: any) => m.id === id);
    return m ? `${m.first_name} ${m.last_name}` : "Unknown";
  };

  const totalPayroll = staff.filter((s: any) => s.status === "active").reduce((sum: number, s: any) => sum + Number(s.net_salary || 0), 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const gross = parseFloat(form.gross_salary) || 0;
      const net = parseFloat(form.net_salary) || gross;
      const payload: any = { tenant_id: tenantId, member_id: form.member_id || null, job_title: form.job_title, employment_type: form.employment_type, gross_salary: gross, net_salary: net, payment_method: form.payment_method, bank_name: form.bank_name, account_number: form.account_number, mpesa_number: form.mpesa_number, start_date: form.start_date, notes: form.notes, deductions: [] };
      if (editingId) {
        const { error } = await supabase.from("payroll_staff").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payroll_staff").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-staff"] });
      toast.success(editingId ? "Staff updated" : "Staff added to payroll");
      if (!editingId) {
        logActivity({ churchId: tenantId!, actionType: "payroll_processed", description: `${form.job_title || "Staff"} was added to payroll`, entityType: "payroll" });
      }
      closeSheet();
    },
    onError: () => toast.error("Failed to save"),
  });

  const closeSheet = () => { setSheetOpen(false); setEditingId(null); setForm({ member_id: "", job_title: "", employment_type: "full_time", gross_salary: "", net_salary: "", payment_method: "bank_transfer", bank_name: "", account_number: "", mpesa_number: "", start_date: new Date().toISOString().split("T")[0], notes: "" }); };

  const columns: Column<any>[] = [
    { key: "member_id", header: "Staff Member", sortable: true, render: r => <div className="flex items-center gap-2"><MemberAvatar name={getMemberName(r.member_id)} size="sm" /><div><span className="text-sm font-medium">{getMemberName(r.member_id)}</span><p className="text-xs text-muted-foreground">{r.job_title || "—"}</p></div></div>, exportValue: r => getMemberName(r.member_id) },
    { key: "gross_salary", header: "Gross", sortable: true, render: r => formatCurrencyFull(Number(r.gross_salary), currency), exportValue: r => String(r.gross_salary) },
    { key: "net_salary", header: "Net", sortable: true, render: r => <span className="font-semibold text-emerald-600">{formatCurrencyFull(Number(r.net_salary), currency)}</span>, exportValue: r => String(r.net_salary) },
    { key: "payment_method", header: "Method", render: r => <PaymentMethodIcon method={r.payment_method || "cash"} /> },
    { key: "status", header: "Status", sortable: true, render: r => <StatusBadge status={r.status || "active"} /> },
  ];

  return (
    <>
      <Helmet><title>Payroll — Vestry</title></Helmet>
      <PageHeader title="Payroll" subtitle="Manage staff salaries and generate payslips" action={<Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Staff</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <FinanceStatCard title="Monthly Payroll" amount={totalPayroll} icon={Banknote} />
        <FinanceStatCard title="Staff Count" amount={staff.filter((s: any) => s.status === "active").length} icon={Users} isCurrency={false} />
        <FinanceStatCard title="Employment Types" amount={new Set(staff.map((s: any) => s.employment_type)).size} icon={Calendar} isCurrency={false} />
      </div>
      <DataTable data={staff} columns={columns} loading={isLoading} getRowId={r => r.id} searchPlaceholder="Search staff..." emptyIcon={<Banknote className="h-12 w-12 text-muted-foreground/30" />} emptyTitle="No payroll staff" emptyCta={<Button onClick={() => setSheetOpen(true)}>Add Staff</Button>} />
      <Sheet open={sheetOpen} onOpenChange={v => { if (!v) closeSheet(); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>{editingId ? "Edit Staff" : "Add Staff to Payroll"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Link to Member</Label><Select value={form.member_id} onValueChange={v => setForm(p => ({ ...p, member_id: v }))}><SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger><SelectContent>{members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Job Title</Label><Input value={form.job_title} onChange={e => setForm(p => ({ ...p, job_title: e.target.value }))} /></div>
            <div><Label>Employment Type</Label><Select value={form.employment_type} onValueChange={v => setForm(p => ({ ...p, employment_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["full_time","part_time","contract","volunteer_stipend"].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Gross Salary</Label><Input type="number" value={form.gross_salary} onChange={e => setForm(p => ({ ...p, gross_salary: e.target.value }))} /></div>
            <div><Label>Net Salary</Label><Input type="number" value={form.net_salary} onChange={e => setForm(p => ({ ...p, net_salary: e.target.value }))} placeholder="Auto-calculated after deductions" /></div>
            <div><Label>Payment Method</Label><Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["bank_transfer","mpesa","cash","cheque"].map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            {form.payment_method === "bank_transfer" && <><div><Label>Bank Name</Label><Input value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} /></div><div><Label>Account Number</Label><Input value={form.account_number} onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))} /></div></>}
            {form.payment_method === "mpesa" && <div><Label>M-Pesa Number</Label><Input value={form.mpesa_number} onChange={e => setForm(p => ({ ...p, mpesa_number: e.target.value }))} /></div>}
            <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.gross_salary || saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Add to Payroll"}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Payroll;
