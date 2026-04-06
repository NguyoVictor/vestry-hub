import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { TransactionBadge } from "@/components/finance/TransactionBadge";
import { PaymentMethodIcon } from "@/components/finance/PaymentMethodIcon";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Receipt, MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { formatCurrencyFull } from "@/lib/format";

import { logActivity } from "@/lib/activityLogger";

interface GivingRow { id: string; member_id: string | null; amount: number; giving_type: string; payment_method: string; given_at: string; recorded_by: string | null; created_at: string; }

const GIVING_CATEGORIES = ["tithe", "offering", "building_fund", "welfare", "missions", "special", "other"];
const PAYMENT_METHODS = ["cash", "mpesa", "bank_transfer", "card", "cheque", "other"];

const GivingRecords = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [form, setForm] = useState({ member_id: "", amount: "", giving_type: "offering", payment_method: "cash", given_at: new Date().toISOString().split("T")[0] });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["giving-records", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("giving_records").select("*").order("given_at", { ascending: false });
      if (error) throw error;
      return (data || []) as GivingRow[];
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
    if (!id) return null;
    const m = members.find((m: any) => m.id === id);
    return m ? `${m.first_name} ${m.last_name}` : null;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        tenant_id: tenantId,
        member_id: isAnonymous ? null : form.member_id || null,
        amount: parseFloat(form.amount),
        giving_type: form.giving_type as any,
        payment_method: form.payment_method as any,
        given_at: form.given_at,
        recorded_by: userId,
        currency,
      };
      if (editingId) {
        const { error } = await supabase.from("giving_records").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("giving_records").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["giving-records"] });
      toast.success(editingId ? "Record updated" : "Giving recorded");
      if (!editingId) {
        logActivity({ churchId: tenantId!, actionType: "new_donation", description: `A ${form.giving_type.replace(/_/g, " ")} of ${form.amount} was recorded`, entityType: "donation" });
      }
      closeSheet();
    },
    onError: () => toast.error("Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("giving_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["giving-records"] }); toast.success("Record deleted"); },
  });

  const closeSheet = () => { setSheetOpen(false); setEditingId(null); setIsAnonymous(false); setForm({ member_id: "", amount: "", giving_type: "offering", payment_method: "cash", given_at: new Date().toISOString().split("T")[0] }); };

  const openEdit = (r: GivingRow) => {
    setEditingId(r.id);
    setIsAnonymous(!r.member_id);
    setForm({ member_id: r.member_id || "", amount: String(r.amount), giving_type: r.giving_type, payment_method: r.payment_method, given_at: r.given_at });
    setSheetOpen(true);
  };

  const totalFiltered = records.reduce((s, r) => s + Number(r.amount), 0);

  const columns: Column<GivingRow>[] = [
    { key: "member_id", header: "Donor", sortable: true, render: (r) => { const name = getMemberName(r.member_id); return name ? <div className="flex items-center gap-2"><MemberAvatar name={name} size="sm" /><span className="text-sm font-medium">{name}</span></div> : <span className="text-muted-foreground italic text-sm">Anonymous</span>; }, exportValue: (r) => getMemberName(r.member_id) || "Anonymous" },
    { key: "amount", header: "Amount", sortable: true, render: (r) => <span className="font-semibold text-emerald-600">{formatCurrencyFull(Number(r.amount), currency)}</span>, exportValue: (r) => String(r.amount) },
    { key: "giving_type", header: "Category", sortable: true, render: (r) => <TransactionBadge type={r.giving_type} /> },
    { key: "payment_method", header: "Method", render: (r) => <PaymentMethodIcon method={r.payment_method} /> },
    { key: "given_at", header: "Date", sortable: true, render: (r) => <span className="text-sm text-muted-foreground">{r.given_at ? format(new Date(r.given_at), "dd MMM yyyy") : "—"}</span> },
    { key: "actions", header: "", render: (r) => (
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEdit(r)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <>
      <Helmet><title>Giving Records — Vestry</title></Helmet>
      <PageHeader title="Giving Records" subtitle="View, search and export your complete donation history" action={<Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-1" />Record Giving</Button>} />

      <Card className="mb-4"><CardContent className="p-3 flex gap-6 text-sm">
        <span className="text-muted-foreground">Showing <strong>{records.length}</strong> donations</span>
        <span className="text-muted-foreground">Total: <strong className="text-emerald-600">{formatCurrencyFull(totalFiltered, currency)}</strong></span>
        {records.length > 0 && <span className="text-muted-foreground">Avg: <strong>{formatCurrencyFull(totalFiltered / records.length, currency)}</strong></span>}
      </CardContent></Card>

      <DataTable data={records} columns={columns} loading={isLoading} getRowId={r => r.id} searchPlaceholder="Search donations..." emptyIcon={<Receipt className="h-12 w-12 text-muted-foreground/30" />} emptyTitle="No giving records" emptyDescription="Record your first donation to get started" emptyCta={<Button onClick={() => setSheetOpen(true)}>Record Giving</Button>} />

      <Sheet open={sheetOpen} onOpenChange={v => { if (!v) closeSheet(); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>{editingId ? "Edit Record" : "Record Giving"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-2"><Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} /><Label>Anonymous</Label></div>
            {!isAnonymous && <div><Label>Donor</Label><Select value={form.member_id} onValueChange={v => setForm(p => ({ ...p, member_id: v }))}><SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger><SelectContent>{members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}</SelectContent></Select></div>}
            <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div><Label>Category</Label><Select value={form.giving_type} onValueChange={v => setForm(p => ({ ...p, giving_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GIVING_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Payment Method</Label><Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Date</Label><Input type="date" value={form.given_at} onChange={e => setForm(p => ({ ...p, given_at: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.amount || saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editingId ? "Update Record" : "Record Giving"}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default GivingRecords;
