// Finding 27 — functional tax configuration (Phase 10). Per-church tax rates
// (name, percentage, description, inclusive / exclusive, active) + an
// enable/disable switch. Configuration only: rates are NOT applied
// automatically to giving, expenses or other records (report requirement).
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toUserFacingError } from "@/lib/userFacingError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TaxRate { id: string; name: string; percentage: number | string; description: string | null; is_inclusive: boolean; is_active: boolean }
const EMPTY = { name: "", percentage: "", description: "", is_inclusive: false };

export function TaxRatesTab({ tenantId, readOnly }: { tenantId: string; readOnly: boolean }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: enabled = false } = useQuery({
    queryKey: ["tax-enabled", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tax_settings").select("tax_enabled" as never).eq("tenant_id", tenantId).maybeSingle();
      if (error) throw error;
      return Boolean((data as { tax_enabled?: boolean } | null)?.tax_enabled);
    },
  });
  const { data: rates = [], isLoading } = useQuery<TaxRate[]>({
    queryKey: ["tax-rates", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tax_rates" as never).select("*").eq("tenant_id", tenantId).order("name");
      if (error) throw error;
      return (data ?? []) as unknown as TaxRate[];
    },
  });

  useEffect(() => {
    if (open) setForm(editing ? { name: editing.name, percentage: String(editing.percentage), description: editing.description ?? "", is_inclusive: editing.is_inclusive } : EMPTY);
  }, [open, editing]);

  const toggleEnabled = useMutation({
    mutationFn: async (value: boolean) => {
      if (readOnly) throw new Error("You have read-only access to church settings.");
      const { error } = await supabase.from("tax_settings").upsert({ tenant_id: tenantId, tax_enabled: value } as never, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-enabled", tenantId] }); toast.success("Tax configuration updated."); },
    onError: (e: Error) => toast.error(toUserFacingError(e, "Could not update tax configuration")),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (readOnly) throw new Error("You have read-only access to church settings.");
      const pct = Number(form.percentage);
      if (!form.name.trim()) throw new Error("Give the tax a name.");
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new Error("Percentage must be between 0 and 100.");
      const row = { name: form.name.trim(), percentage: pct, description: form.description.trim() || null, is_inclusive: form.is_inclusive, updated_at: new Date().toISOString() };
      if (editing) {
        const { data, error } = await supabase.from("tax_rates" as never).update(row as never).eq("id", editing.id).eq("tenant_id", tenantId).select("id");
        if (error) throw error;
        if (!data || (data as unknown[]).length === 0) throw new Error("The tax rate was not updated. You may not have permission.");
      } else {
        const { error } = await supabase.from("tax_rates" as never).insert({ ...row, tenant_id: tenantId } as never);
        if (error) {
          if (String(error.message).includes("tax_rates_tenant_id_name_key")) throw new Error("A tax rate with this name already exists.");
          throw error;
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-rates", tenantId] }); setOpen(false); setEditing(null); toast.success(editing ? "Tax rate updated." : "Tax rate added."); },
    onError: (e: Error) => toast.error(toUserFacingError(e, "Could not save the tax rate")),
  });

  const setActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (readOnly) throw new Error("You have read-only access to church settings.");
      const { data, error } = await supabase.from("tax_rates" as never).update({ is_active: active, updated_at: new Date().toISOString() } as never).eq("id", id).eq("tenant_id", tenantId).select("id");
      if (error) throw error;
      if (!data || (data as unknown[]).length === 0) throw new Error("The tax rate was not changed. You may not have permission.");
      return active;
    },
    onSuccess: (active) => { qc.invalidateQueries({ queryKey: ["tax-rates", tenantId] }); toast.success(active ? "Tax rate activated." : "Tax rate deactivated."); },
    onError: (e: Error) => toast.error(toUserFacingError(e, "Could not change the tax rate")),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border p-4 bg-white dark:bg-slate-900">
        <div>
          <p className="font-medium">Enable tax configuration</p>
          <p className="text-sm text-muted-foreground">Tax rates are configuration only — they are never applied automatically to giving or expenses.</p>
        </div>
        <Switch aria-label="Enable tax configuration" checked={enabled} disabled={readOnly || toggleEnabled.isPending} onCheckedChange={(v) => toggleEnabled.mutate(v)} />
      </div>

      <div className="rounded-xl border bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between p-4 border-b">
          <p className="font-medium">Tax rates</p>
          <Button size="sm" disabled={readOnly || !enabled} onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add tax rate</Button>
        </div>
        {!enabled && <p className="p-4 text-sm text-muted-foreground">Turn on tax configuration to add rates.</p>}
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
        {enabled && !isLoading && rates.length === 0 && <p className="p-4 text-sm text-muted-foreground">No tax rates yet.</p>}
        <div className="divide-y">
          {rates.map((r) => (
            <div key={r.id} className={`flex items-center justify-between p-4 ${r.is_active ? "" : "opacity-60"}`}>
              <div>
                <p className="font-medium">{r.name} — {Number(r.percentage)}% <span className="text-xs text-muted-foreground">({r.is_inclusive ? "inclusive" : "exclusive"}{r.is_active ? "" : ", inactive"})</span></p>
                {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" aria-label={`Edit ${r.name}`} disabled={readOnly} onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" aria-label={`${r.is_active ? "Deactivate" : "Activate"} ${r.name}`} disabled={readOnly} onClick={() => setActive.mutate({ id: r.id, active: !r.is_active })}><Power className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit tax rate" : "Add tax rate"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. VAT" /></div>
            <div><Label>Percentage *</Label><Input type="number" min={0} max={100} step="0.001" value={form.percentage} onChange={(e) => setForm((f) => ({ ...f, percentage: e.target.value }))} placeholder="e.g. 16" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="flex items-center justify-between">
              <Label htmlFor="tax-inclusive">Price includes this tax (inclusive)</Label>
              <Switch id="tax-inclusive" checked={form.is_inclusive} onCheckedChange={(v) => setForm((f) => ({ ...f, is_inclusive: v }))} />
            </div>
          </div>
          <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save tax rate"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
