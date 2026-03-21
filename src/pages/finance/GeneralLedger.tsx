import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BookMarked, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { formatCurrencyFull } from "@/lib/format";

const GeneralLedger = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({ description: "", reference: "", entry_date: new Date().toISOString().split("T")[0] });
  const [journalLines, setJournalLines] = useState([{ account_id: "", debit_amount: "", credit_amount: "" }, { account_id: "", debit_amount: "", credit_amount: "" }]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ledger-entries", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ledger_entries").select("*").order("entry_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["chart-of-accounts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts").select("*").order("account_code");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Seed accounts if none exist
  const seedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("seed_chart_of_accounts", { p_tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] }); toast.success("Chart of accounts created"); },
  });

  const addEntryMutation = useMutation({
    mutationFn: async () => {
      const totalDebit = journalLines.reduce((s, l) => s + (parseFloat(l.debit_amount) || 0), 0);
      const totalCredit = journalLines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) throw new Error("Debits must equal credits");

      // Insert individual ledger entries for each line
      const inserts = journalLines.filter(l => l.account_id && (l.debit_amount || l.credit_amount)).map(l => ({
        tenant_id: tenantId,
        description: entryForm.description,
        entry_date: entryForm.entry_date,
        debit_amount: parseFloat(l.debit_amount) || 0,
        credit_amount: parseFloat(l.credit_amount) || 0,
        fund_id: null,
        reference_type: entryForm.reference || null,
        created_by: userId,
      }));
      const { error } = await supabase.from("ledger_entries").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ledger-entries"] }); toast.success("Journal entry posted"); setDialogOpen(false); setEntryForm({ description: "", reference: "", entry_date: new Date().toISOString().split("T")[0] }); setJournalLines([{ account_id: "", debit_amount: "", credit_amount: "" }, { account_id: "", debit_amount: "", credit_amount: "" }]); },
    onError: (e: Error) => toast.error(e.message || "Failed to post entry"),
  });

  const totalDebit = journalLines.reduce((s, l) => s + (parseFloat(l.debit_amount) || 0), 0);
  const totalCredit = journalLines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const columns: Column<any>[] = [
    { key: "entry_date", header: "Date", sortable: true, render: r => <span className="text-sm">{r.entry_date ? format(new Date(r.entry_date), "dd MMM yyyy") : "—"}</span> },
    { key: "description", header: "Description", render: r => <span className="text-sm">{r.description}</span> },
    { key: "debit_amount", header: "Debit", sortable: true, render: r => Number(r.debit_amount) > 0 ? <span className="text-destructive">{formatCurrencyFull(Number(r.debit_amount), currency)}</span> : <span className="text-muted-foreground">—</span>, exportValue: r => String(r.debit_amount || 0) },
    { key: "credit_amount", header: "Credit", sortable: true, render: r => Number(r.credit_amount) > 0 ? <span className="text-emerald-600">{formatCurrencyFull(Number(r.credit_amount), currency)}</span> : <span className="text-muted-foreground">—</span>, exportValue: r => String(r.credit_amount || 0) },
    { key: "reference_type", header: "Reference", render: r => <span className="text-xs text-muted-foreground">{r.reference_type || "—"}</span> },
  ];

  const totalDebits = entries.reduce((s: number, e: any) => s + Number(e.debit_amount || 0), 0);
  const totalCredits = entries.reduce((s: number, e: any) => s + Number(e.credit_amount || 0), 0);

  return (
    <>
      <Helmet><title>General Ledger — Vestry</title></Helmet>
      <PageHeader title="General Ledger" subtitle="Complete double-entry accounting records" action={<Button onClick={() => { if (accounts.length === 0) seedMutation.mutate(); else setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />{accounts.length === 0 ? "Setup Chart of Accounts" : "Add Journal Entry"}</Button>} />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Debits</p><p className="text-xl font-bold text-destructive">{formatCurrencyFull(totalDebits, currency)}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Credits</p><p className="text-xl font-bold text-emerald-600">{formatCurrencyFull(totalCredits, currency)}</p></CardContent></Card>
      </div>

      <DataTable data={entries} columns={columns} loading={isLoading} getRowId={r => r.id} searchPlaceholder="Search entries..." emptyIcon={<BookMarked className="h-12 w-12 text-muted-foreground/30" />} emptyTitle="No ledger entries" emptyDescription="Post your first journal entry to get started" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Journal Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Description</Label><Input value={entryForm.description} onChange={e => setEntryForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Reference</Label><Input value={entryForm.reference} onChange={e => setEntryForm(p => ({ ...p, reference: e.target.value }))} /></div>
            <div><Label>Date</Label><Input type="date" value={entryForm.entry_date} onChange={e => setEntryForm(p => ({ ...p, entry_date: e.target.value }))} /></div>
            <Label>Journal Lines</Label>
            {journalLines.map((l, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1"><Select value={l.account_id} onValueChange={v => { const n = [...journalLines]; n[i].account_id = v; setJournalLines(n); }}><SelectTrigger className="text-xs"><SelectValue placeholder="Account" /></SelectTrigger><SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.account_code} — {a.account_name}</SelectItem>)}</SelectContent></Select></div>
                <Input className="w-24" type="number" placeholder="Debit" value={l.debit_amount} onChange={e => { const n = [...journalLines]; n[i].debit_amount = e.target.value; if (e.target.value) n[i].credit_amount = ""; setJournalLines(n); }} />
                <Input className="w-24" type="number" placeholder="Credit" value={l.credit_amount} onChange={e => { const n = [...journalLines]; n[i].credit_amount = e.target.value; if (e.target.value) n[i].debit_amount = ""; setJournalLines(n); }} />
                {journalLines.length > 2 && <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setJournalLines(journalLines.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setJournalLines([...journalLines, { account_id: "", debit_amount: "", credit_amount: "" }])}><Plus className="h-4 w-4 mr-1" />Add Line</Button>
            <div className="flex justify-between text-sm border-t pt-2">
              <span>Debits: <strong className="text-destructive">{formatCurrencyFull(totalDebit, currency)}</strong></span>
              <span>Credits: <strong className="text-emerald-600">{formatCurrencyFull(totalCredit, currency)}</strong></span>
            </div>
            {!isBalanced && totalDebit + totalCredit > 0 && <p className="text-xs text-destructive">⚠ Entry is unbalanced. Debits must equal credits.</p>}
            <Button className="w-full" onClick={() => addEntryMutation.mutate()} disabled={!entryForm.description || !isBalanced || totalDebit === 0 || addEntryMutation.isPending}>{addEntryMutation.isPending ? "Posting..." : "Post Entry"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GeneralLedger;
