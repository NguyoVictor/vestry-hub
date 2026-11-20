// Phase 10 product item — budget utilisation. ⋮ menu per budget line:
// Record expenditure, Edit line, View details (allocated / spent / remaining /
// % + expenditure history with reversal). Spend is stored server-side in
// budget_expenditures (never edited or deleted; reversed with a reason) and
// budget_categories.spent_amount is maintained by the database, so linked
// expenses / payables / ledger lines are counted at most once.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { MoreHorizontal, Receipt, Pencil, Eye, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toUserFacingError } from "@/lib/userFacingError";
import { formatCurrencyFull } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export interface BudgetLine { id: string; budget_id: string; category: string | null; allocated_amount: number | string | null; spent_amount: number | string | null }
interface Expenditure {
  id: string; amount: number | string; expenditure_date: string; description: string; reference: string | null;
  source_type: string; reversed_at: string | null; reversal_reason: string | null; created_at: string;
}
interface Props { line: BudgetLine; tenantId: string; currency: string; readOnly: boolean }

const label = (c: string | null) => (c ?? "").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

export function BudgetLineActions({ line, tenantId, currency, readOnly }: Props) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"record" | "edit" | "details" | null>(null);
  const allocated = Number(line.allocated_amount || 0);
  const spent = Number(line.spent_amount || 0);
  const remaining = allocated - spent;
  const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [linkInvoice, setLinkInvoice] = useState<string>("none");
  const [newAllocated, setNewAllocated] = useState(String(allocated));
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["budget-categories"] });
    qc.invalidateQueries({ queryKey: ["budget-expenditures", line.id] });
  };

  const { data: history = [] } = useQuery<Expenditure[]>({
    queryKey: ["budget-expenditures", line.id],
    enabled: mode === "details",
    queryFn: async () => {
      const { data, error } = await supabase.from("budget_expenditures" as never)
        .select("id, amount, expenditure_date, description, reference, source_type, reversed_at, reversal_reason, created_at")
        .eq("budget_category_id", line.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Expenditure[];
    },
  });
  const { data: invoices = [] } = useQuery<{ id: string; vendor_name: string; amount: number | string }[]>({
    queryKey: ["budget-linkable-invoices", tenantId],
    enabled: mode === "record",
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts_payable").select("id, vendor_name, amount")
        .eq("tenant_id", tenantId).eq("payment_status", "paid" as never).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; vendor_name: string; amount: number | string }[];
    },
  });

  const record = useMutation({
    mutationFn: async () => {
      if (readOnly) throw new Error("You have read-only access to finance records.");
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter an amount greater than zero.");
      if (!description.trim()) throw new Error("Describe what the money was spent on.");
      if (value > remaining && !window.confirm(`This exceeds the remaining budget (${formatCurrencyFull(remaining, currency)}). Record it anyway?`)) {
        throw new Error("Cancelled.");
      }
      const row: Record<string, unknown> = {
        tenant_id: tenantId, budget_id: line.budget_id, budget_category_id: line.id, amount: value,
        expenditure_date: date, description: description.trim(), reference: reference.trim() || null,
      };
      if (linkInvoice !== "none") { row.source_type = "accounts_payable"; row.source_id = linkInvoice; }
      const { error } = await supabase.from("budget_expenditures" as never).insert(row as never);
      if (error) {
        if (String(error.message).includes("budget_expenditures_one_active_source")) throw new Error("That invoice is already counted against a budget.");
        throw error;
      }
    },
    onSuccess: () => { refresh(); setMode(null); setAmount(""); setDescription(""); setReference(""); setLinkInvoice("none"); toast.success("Expenditure recorded."); },
    onError: (e: Error) => { if (e.message !== "Cancelled.") toast.error(toUserFacingError(e, "Could not record the expenditure")); },
  });

  const reverse = useMutation({
    mutationFn: async (id: string) => {
      const reason = window.prompt("Why is this expenditure being reversed?");
      if (!reason || !reason.trim()) throw new Error("Cancelled.");
      const { data, error } = await supabase.from("budget_expenditures" as never)
        .update({ reversed_at: new Date().toISOString(), reversal_reason: reason.trim() } as never).eq("id", id).select("id");
      if (error) throw error;
      if (!data || (data as unknown[]).length === 0) throw new Error("Nothing was reversed. You may not have permission.");
    },
    onSuccess: () => { refresh(); toast.success("Expenditure reversed (kept in history)."); },
    onError: (e: Error) => { if (e.message !== "Cancelled.") toast.error(toUserFacingError(e, "Could not reverse the expenditure")); },
  });

  const editLine = useMutation({
    mutationFn: async () => {
      if (readOnly) throw new Error("You have read-only access to finance records.");
      const value = Number(newAllocated);
      if (!Number.isFinite(value) || value < 0) throw new Error("Enter a valid allocated amount.");
      const { data, error } = await supabase.from("budget_categories").update({ allocated_amount: value } as never).eq("id", line.id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("The budget line was not updated. You may not have permission.");
    },
    onSuccess: () => { refresh(); setMode(null); toast.success("Budget line updated (change recorded in the audit trail)."); },
    onError: (e: Error) => toast.error(toUserFacingError(e, "Could not update the budget line")),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${label(line.category)}`}><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={readOnly} onClick={() => setMode("record")}><Receipt className="h-4 w-4 mr-2" />Record expenditure</DropdownMenuItem>
          <DropdownMenuItem disabled={readOnly} onClick={() => { setNewAllocated(String(allocated)); setMode("edit"); }}><Pencil className="h-4 w-4 mr-2" />Edit budget line</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMode("details")}><Eye className="h-4 w-4 mr-2" />View details</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={mode === "record"} onOpenChange={(v) => !v && setMode(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record expenditure — {label(line.category)}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Remaining: {formatCurrencyFull(remaining, currency)}</p>
            <div><Label>Amount *</Label><Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div>
            <div><Label>Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Description *</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this spent on?" /></div>
            <div><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Receipt / document number" /></div>
            <div>
              <Label>Link a paid invoice (optional — avoids double counting)</Label>
              <Select value={linkInvoice} onValueChange={setLinkInvoice}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked</SelectItem>
                  {invoices.map((i) => <SelectItem key={i.id} value={i.id}>{i.vendor_name} — {formatCurrencyFull(Number(i.amount), currency)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {Number(amount) > remaining && Number(amount) > 0 && (
              <p className="text-sm text-amber-700">This exceeds the remaining budget.</p>
            )}
          </div>
          <DialogFooter><Button onClick={() => record.mutate()} disabled={record.isPending}>{record.isPending ? "Saving…" : "Record expenditure"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "edit"} onOpenChange={(v) => !v && setMode(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit budget line — {label(line.category)}</DialogTitle></DialogHeader>
          <div><Label>Allocated amount</Label><Input type="number" min={0} value={newAllocated} onChange={(e) => setNewAllocated(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">Every change is kept in the budget audit trail.</p>
          <DialogFooter><Button onClick={() => editLine.mutate()} disabled={editLine.isPending}>{editLine.isPending ? "Saving…" : "Save changes"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "details"} onOpenChange={(v) => !v && setMode(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{label(line.category)} — budget details</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-muted-foreground">Allocated</p><p className="font-semibold">{formatCurrencyFull(allocated, currency)}</p></div>
            <div><p className="text-muted-foreground">Spent</p><p className="font-semibold">{formatCurrencyFull(spent, currency)}</p></div>
            <div><p className="text-muted-foreground">Remaining</p><p className={`font-semibold ${remaining < 0 ? "text-red-600" : ""}`}>{formatCurrencyFull(remaining, currency)}</p></div>
            <div><p className="text-muted-foreground">Utilisation</p><p className={`font-semibold ${pct > 100 ? "text-red-600" : ""}`}>{pct}%</p></div>
          </div>
          <Progress value={Math.min(pct, 100)} className="h-3" />
          {pct > 100 && <p className="text-sm text-red-600">Over budget.</p>}
          <div className="max-h-72 overflow-y-auto divide-y" data-testid="expenditure-history">
            {history.length === 0 && <p className="text-sm text-muted-foreground py-4">No expenditure recorded yet.</p>}
            {history.map((h) => (
              <div key={h.id} className={`flex items-center justify-between py-2 text-sm ${h.reversed_at ? "opacity-60 line-through" : ""}`}>
                <div>
                  <p className="font-medium">{h.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.expenditure_date} · {h.source_type === "manual" ? "manual" : `linked ${h.source_type.replace("_", " ")}`}{h.reference ? ` · ${h.reference}` : ""}
                    {h.reversed_at ? ` · reversed: ${h.reversal_reason}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatCurrencyFull(Number(h.amount), currency)}</span>
                  {!h.reversed_at && !readOnly && (
                    <Button variant="ghost" size="sm" aria-label="Reverse expenditure" onClick={() => reverse.mutate(h.id)}><Undo2 className="h-4 w-4" /></Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
