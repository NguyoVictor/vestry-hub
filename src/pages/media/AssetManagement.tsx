import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Plus, Search, Wrench, DollarSign } from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CurrencyDisplay } from "@/components/finance/CurrencyDisplay";

const CATEGORIES: Record<string, string> = { audio_equipment: "Audio Equipment", furniture: "Furniture", vehicle: "Vehicle", it_equipment: "IT Equipment", kitchen: "Kitchen", musical_instruments: "Musical Instruments", building: "Building", other: "Other" };
const CONDITIONS: Record<string, string> = { excellent: "Excellent", good: "Good", fair: "Fair", poor: "Poor", damaged: "Damaged" };
const STATUSES: Record<string, string> = { in_use: "In Use", available: "Available", maintenance: "Maintenance", disposed: "Disposed" };

const AssetManagement = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const form = useForm({ defaultValues: { name: "", category: "other", description: "", serial_number: "", location: "", condition: "good", purchase_value: 0, notes: "" } });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["church_assets", church.tenantId],
    queryFn: async () => { const { data, error } = await supabase.from("church_assets").select("*").eq("tenant_id", church.tenantId!).order("name"); if (error) throw error; return data || []; },
  });

  const saveAsset = useMutation({
    mutationFn: async (values: any) => {
      const payload = { ...values, tenant_id: church.tenantId };
      if (editingAsset) {
        const { error } = await supabase.from("church_assets").update(payload).eq("id", editingAsset.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("church_assets").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["church_assets"] }); toast.success(editingAsset ? "Asset updated" : "Asset added"); setFormOpen(false); setEditingAsset(null); form.reset(); },
  });

  const filtered = assets.filter((a: any) => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalValue = assets.reduce((s: number, a: any) => s + (Number(a.purchase_value) || 0), 0);
  const maintenanceCount = assets.filter((a: any) => a.condition === "poor" || a.condition === "damaged").length;

  return (
    <>
      <Helmet><title>Asset Management — Vestry</title></Helmet>
      <PageHeader title="Asset Management" subtitle="Track and manage church physical assets" action={<Button size="sm" onClick={() => { setEditingAsset(null); form.reset(); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Asset</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2.5"><Package className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{assets.length}</p><p className="text-sm text-muted-foreground">Total Assets</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="rounded-lg bg-emerald-500/10 p-2.5"><DollarSign className="h-5 w-5 text-emerald-500" /></div><div><CurrencyDisplay amount={totalValue} className="text-2xl font-bold" /><p className="text-sm text-muted-foreground">Total Value</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="rounded-lg bg-amber-500/10 p-2.5"><Wrench className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{maintenanceCount}</p><p className="text-sm text-muted-foreground">Need Attention</p></div></div></CardContent></Card>
      </div>

      <div className="flex items-center gap-3 mb-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search assets..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" /></div></div>

      {isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div> :
      filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16"><Package className="h-16 w-16 text-muted-foreground/30 mb-4" /><h3 className="font-semibold">No assets yet</h3><Button className="mt-4" onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Asset</Button></CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left p-3 font-medium">Asset</th><th className="text-left p-3 font-medium">Category</th><th className="text-left p-3 font-medium">Location</th><th className="text-left p-3 font-medium">Condition</th><th className="text-left p-3 font-medium">Value</th></tr></thead>
            <tbody>
              {filtered.map((asset: any) => (
                <tr key={asset.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => { setEditingAsset(asset); form.reset(asset); setFormOpen(true); }}>
                  <td className="p-3 font-medium">{asset.name}</td>
                  <td className="p-3"><Badge variant="secondary">{CATEGORIES[asset.category] || asset.category}</Badge></td>
                  <td className="p-3 text-muted-foreground">{asset.location || "—"}</td>
                  <td className="p-3"><Badge variant={asset.condition === "excellent" || asset.condition === "good" ? "default" : "destructive"}>{CONDITIONS[asset.condition] || asset.condition}</Badge></td>
                  <td className="p-3">{asset.purchase_value ? <CurrencyDisplay amount={Number(asset.purchase_value)} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{editingAsset ? "Edit Asset" : "Add Asset"}</SheetTitle></SheetHeader>
          <form onSubmit={form.handleSubmit(v => saveAsset.mutate(v))} className="mt-6 space-y-4">
            <div><Label>Asset Name *</Label><Input {...form.register("name", { required: true })} /></div>
            <div><Label>Category</Label><Select value={form.watch("category")} onValueChange={v => form.setValue("category", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Description</Label><Textarea {...form.register("description")} /></div>
            <div><Label>Serial Number</Label><Input {...form.register("serial_number")} /></div>
            <div><Label>Location</Label><Input {...form.register("location")} placeholder="e.g. Main Hall" /></div>
            <div><Label>Condition</Label><Select value={form.watch("condition")} onValueChange={v => form.setValue("condition", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CONDITIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Purchase Value</Label><Input type="number" step="0.01" {...form.register("purchase_value", { valueAsNumber: true })} /></div>
            <div><Label>Notes</Label><Textarea {...form.register("notes")} /></div>
            <Button type="submit" className="w-full" disabled={saveAsset.isPending}>{editingAsset ? "Update" : "Add Asset"}</Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AssetManagement;
