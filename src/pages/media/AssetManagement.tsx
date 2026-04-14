import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { differenceInYears, format } from "date-fns";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { useCurrency } from "@/hooks/useCurrency";
import { TABLES } from "@/lib/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Package, Plus, Search, Pencil, Trash2, Wrench, ClipboardList,
  TrendingDown, Download, Upload, Image as ImageIcon, CheckCircle,
  Loader2, Box, ChevronDown, TriangleAlert, RotateCcw,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ["Electronics", "Furniture", "Vehicles", "Musical Instruments", "Buildings", "Other"];
const CONDITIONS = ["Excellent", "Good", "Fair", "Poor"];
const MAINT_TYPES = ["Repair", "Service", "Inspection", "Cleaning"];

const conditionColor: Record<string, string> = {
  Excellent: "bg-emerald-100 text-emerald-700",
  Good: "bg-blue-100 text-blue-700",
  Fair: "bg-amber-100 text-amber-700",
  Poor: "bg-red-100 text-red-700",
};
const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  returned: "bg-slate-100 text-slate-600",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function exportCSV(rows: any[], filename: string) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function ExportMenu({ onCSV }: { onCSV: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onCSV}>Export CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.info("PDF export coming soon")}>Export PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.info("Word export coming soon")}>Export Word</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Add/Edit Asset Dialog ─────────────────────────────────────────────────────
function AssetDialog({ open, onClose, tenantId, editing, onSuccess }: any) {
  const imgRef = useRef<HTMLInputElement>(null);
  const { symbol } = useCurrency();
  const [name, setName] = useState(editing?.name || "");
  const [category, setCategory] = useState(editing?.category || "");
  const [condition, setCondition] = useState(editing?.condition || "");
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [price, setPrice] = useState(editing?.purchase_value ?? "");
  const [purchaseDate, setPurchaseDate] = useState(editing?.purchase_date || "");
  const [serial, setSerial] = useState(editing?.serial_number || "");
  const [location, setLocation] = useState(editing?.location || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(
    editing?.image_path
      ? supabase.storage.from("asset-images").getPublicUrl(editing.image_path).data.publicUrl
      : null
  );
  const [saving, setSaving] = useState(false);

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImgFile(f); setImgPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Asset name is required"); return; }
    setSaving(true);
    try {
      let imagePath = editing?.image_path || null;
      if (imgFile) {
        const path = `${tenantId}/${Date.now()}-${imgFile.name}`;
        const { error: upErr } = await supabase.storage.from("asset-images").upload(path, imgFile);
        if (!upErr) imagePath = path;
      }
      const payload: any = {
        tenant_id: tenantId, name,
        category: category || null, condition: condition || null,
        quantity: Number(quantity),
        purchase_value: price ? Number(price) : null,
        purchase_date: purchaseDate || null,
        serial_number: serial || null, location: location || null,
        description: description || null, image_path: imagePath,
      };
      if (editing?.id) {
        const { error } = await supabase.from(TABLES.CHURCH_ASSETS).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.CHURCH_ASSETS).insert(payload);
        if (error) throw error;
      }
      toast.success(editing?.id ? "Asset updated" : "Asset added");
      onSuccess(); onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-500" />
            {editing?.id ? "Edit Asset" : "Add New Asset"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Asset Name *</Label>
              <Input className="mt-1.5" placeholder="e.g., Projector" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min={1} className="mt-1.5" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div>
              <Label>Purchase Price ({symbol})</Label>
              <Input type="number" className="mt-1.5" placeholder="0" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input type="date" className="mt-1.5" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input className="mt-1.5" placeholder="Optional" value={serial} onChange={e => setSerial(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Location</Label>
              <Input className="mt-1.5" placeholder="e.g., Main Hall" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea className="mt-1.5 resize-none" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Asset Image</Label>
            <div className="mt-1.5 flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="h-16 w-20 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 dark:bg-slate-800 shrink-0 overflow-hidden">
                {imgPreview
                  ? <img src={imgPreview} className="w-full h-full object-cover" alt="" />
                  : <ImageIcon className="h-5 w-5 text-muted-foreground/40" />}
              </div>
              <div>
                <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImg} />
                <Button variant="outline" size="sm" onClick={() => imgRef.current?.click()}>Choose file</Button>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP, max 5MB</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Asset"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Release Request Dialog ────────────────────────────────────────────────────
function ReleaseRequestDialog({ open, onClose, tenantId, assets, editing, onSuccess }: any) {
  const [assetId, setAssetId] = useState(editing?.asset_id || "");
  const [requestedBy, setRequestedBy] = useState(editing?.requested_by || "");
  const [purpose, setPurpose] = useState(editing?.purpose || "");
  const [dateNeeded, setDateNeeded] = useState(editing?.date_needed || "");
  const [returnDate, setReturnDate] = useState(editing?.return_date || "");
  const [notes, setNotes] = useState(editing?.notes || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens with new editing target
  const prevOpen = useRef(false);
  if (open !== prevOpen.current) {
    prevOpen.current = open;
    if (open) {
      setAssetId(editing?.asset_id || "");
      setRequestedBy(editing?.requested_by || "");
      setPurpose(editing?.purpose || "");
      setDateNeeded(editing?.date_needed || "");
      setReturnDate(editing?.return_date || "");
      setNotes(editing?.notes || "");
      setErrors({});
    }
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!assetId) e.assetId = "Asset is required";
    if (!requestedBy.trim()) e.requestedBy = "Requester name is required";
    if (!dateNeeded) e.dateNeeded = "Date Needed is required";
    if (!returnDate) e.returnDate = "Return Date is required";
    if (dateNeeded && returnDate && returnDate <= dateNeeded)
      e.returnDate = "Return Date must be after Date Needed";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId, asset_id: assetId, requested_by: requestedBy,
        purpose: purpose || null, date_needed: dateNeeded,
        return_date: returnDate, notes: notes || null,
      };
      if (editing?.id) {
        const { error } = await supabase.from(TABLES.ASSET_RELEASE_REQUESTS).update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Request updated");
      } else {
        const { error } = await supabase.from(TABLES.ASSET_RELEASE_REQUESTS).insert({ ...payload, status: "pending" });
        if (error) throw error;
        toast.success("Release request submitted");
      }
      onSuccess(); onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const field = (key: string) => errors[key]
    ? "border-red-500 focus-visible:ring-red-500"
    : "";

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing?.id ? "Edit Release Request" : "New Release Request"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Asset <span className="text-red-500">*</span></Label>
            <Select value={assetId} onValueChange={v => { setAssetId(v); setErrors(p => ({ ...p, assetId: "" })); }}>
              <SelectTrigger className={`mt-1.5 ${field("assetId")}`}><SelectValue placeholder="Select asset..." /></SelectTrigger>
              <SelectContent>{assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
            {errors.assetId && <p className="text-xs text-red-500 mt-1">{errors.assetId}</p>}
          </div>
          <div>
            <Label>Requested By <span className="text-red-500">*</span></Label>
            <Input className={`mt-1.5 ${field("requestedBy")}`} placeholder="Member name" value={requestedBy}
              onChange={e => { setRequestedBy(e.target.value); if (e.target.value.trim()) setErrors(p => ({ ...p, requestedBy: "" })); }} />
            {errors.requestedBy && <p className="text-xs text-red-500 mt-1">{errors.requestedBy}</p>}
          </div>
          <div>
            <Label>Purpose</Label>
            <Textarea className="mt-1.5 resize-none" rows={2} value={purpose} onChange={e => setPurpose(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date Needed <span className="text-red-500">*</span></Label>
              <Input type="date" className={`mt-1.5 ${field("dateNeeded")}`} value={dateNeeded}
                onChange={e => { setDateNeeded(e.target.value); setErrors(p => ({ ...p, dateNeeded: "", returnDate: "" })); }} />
              {errors.dateNeeded && <p className="text-xs text-red-500 mt-1">{errors.dateNeeded}</p>}
            </div>
            <div>
              <Label>Return Date <span className="text-red-500">*</span></Label>
              <Input type="date" className={`mt-1.5 ${field("returnDate")}`} value={returnDate}
                onChange={e => { setReturnDate(e.target.value); setErrors(p => ({ ...p, returnDate: "" })); }} />
              {errors.returnDate && <p className="text-xs text-red-500 mt-1">{errors.returnDate}</p>}
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea className="mt-1.5 resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing?.id ? "Save Changes" : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Log Maintenance Dialog ────────────────────────────────────────────────────
function MaintenanceDialog({ open, onClose, tenantId, assets, onSuccess }: any) {
  const { symbol } = useCurrency();
  const [assetId, setAssetId] = useState("");
  const [maintType, setMaintType] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [cost, setCost] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [descError, setDescError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!assetId || !maintType) { toast.error("Asset and type are required"); return; }
    if (!description.trim()) { setDescError("Description is required"); return; }
    setDescError("");
    setSaving(true);
    try {
      const { error } = await supabase.from(TABLES.ASSET_MAINTENANCE).insert({
        tenant_id: tenantId, asset_id: assetId, maintenance_type: maintType,
        description: description || null,
        scheduled_date: scheduledDate || null,
        maintenance_date: scheduledDate || null,
        cost: cost ? Number(cost) : null,
        performed_by: performedBy || null,
        notes: notes || null, status: "scheduled",
      });
      if (error) throw error;
      toast.success("Maintenance logged");
      onSuccess(); onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Log Maintenance</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Asset *</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select asset..." /></SelectTrigger>
              <SelectContent>{assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Maintenance Type *</Label>
            <Select value={maintType} onValueChange={setMaintType}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{MAINT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description <span className="text-red-500">*</span></Label>
            <Textarea
              className={`mt-1.5 resize-none ${descError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              rows={2}
              value={description}
              onChange={e => { setDescription(e.target.value); if (e.target.value.trim()) setDescError(""); }}
            />
            {descError && <p className="text-xs text-red-500 mt-1">{descError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Scheduled Date</Label><Input type="date" className="mt-1.5" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} /></div>
            <div><Label>Est. Cost ({symbol})</Label><Input type="number" className="mt-1.5" placeholder="0" value={cost} onChange={e => setCost(e.target.value)} /></div>
          </div>
          <div>
            <Label>Performed By</Label>
            <Input className="mt-1.5" value={performedBy} onChange={e => setPerformedBy(e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea className="mt-1.5 resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AssetManagement() {
  const { tenantId } = useChurch();
  const { format: fmtCurrency } = useCurrency();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState("assets");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");

  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [deleteRequestTarget, setDeleteRequestTarget] = useState<any>(null);
  const [maintDialogOpen, setMaintDialogOpen] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ["church-assets", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.CHURCH_ASSETS)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });

  const { data: maintenance = [], isLoading: loadingMaint } = useQuery({
    queryKey: ["asset-maintenance", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.ASSET_MAINTENANCE)
        .select("*, church_assets(name)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });

  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["asset-release-requests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.ASSET_RELEASE_REQUESTS)
        .select("*, church_assets(name)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Remove child records first to satisfy FK constraints
      await supabase.from(TABLES.ASSET_RELEASE_REQUESTS).delete().eq("asset_id", id);
      await supabase.from(TABLES.ASSET_MAINTENANCE).delete().eq("asset_id", id);
      const { error } = await supabase.from(TABLES.CHURCH_ASSETS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church-assets", tenantId] });
      toast.success("Asset deleted");
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Update request status ─────────────────────────────────────────────────
  const updateRequestStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from(TABLES.ASSET_RELEASE_REQUESTS)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-release-requests", tenantId] });
      toast.success("Request updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Delete release request ────────────────────────────────────────────────
  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.ASSET_RELEASE_REQUESTS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-release-requests", tenantId] });
      toast.success("Request deleted");
      setDeleteRequestTarget(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Compute effective status (auto-overdue) ───────────────────────────────
  const effectiveStatus = (r: any): string => {
    if (r.status === "returned" || r.status === "rejected") return r.status;
    if (r.return_date && new Date(r.return_date) < new Date() && r.status !== "returned") return "overdue";
    return r.status;
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalAssets = assets.length;
  const totalValue = assets.reduce((s: number, a: any) => s + (a.purchase_value || 0), 0);
  const poorCondition = assets.filter((a: any) => a.condition === "Poor").length;
  const pendingRequests = requests.filter((r: any) => r.status === "pending").length;

  // ── Filtered assets ───────────────────────────────────────────────────────
  const filteredAssets = assets.filter((a: any) => {
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.serial_number?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || a.category === categoryFilter;
    const matchCond = conditionFilter === "all" || a.condition === conditionFilter;
    return matchSearch && matchCat && matchCond;
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["church-assets", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["asset-maintenance", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["asset-release-requests", tenantId] });
  };

  return (
    <>
      <Helmet><title>Asset Management — Vestry</title></Helmet>

      <PageHeader
        title="Asset Management"
        subtitle="Track church assets, maintenance schedules, and release requests"
        action={
          <div className="flex items-center gap-2">
            <ExportMenu onCSV={() => exportCSV(filteredAssets, "assets.csv")} />
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => { setEditingAsset(null); setAssetDialogOpen(true); }}
            >
              <Plus className="mr-2 h-4 w-4" />Add Asset
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Assets" value={totalAssets} icon={Package} color="bg-orange-100 text-orange-600" />
        <StatCard label="Total Value" value={fmtCurrency(totalValue)} icon={TrendingDown} color="bg-indigo-100 text-indigo-600" />
        <StatCard label="Needs Attention" value={poorCondition} icon={Wrench} color="bg-red-100 text-red-600" />
        <StatCard label="Pending Requests" value={pendingRequests} icon={ClipboardList} color="bg-amber-100 text-amber-600" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="requests">Release Requests</TabsTrigger>
        </TabsList>

        {/* ── Assets Tab ── */}
        <TabsContent value="assets">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Condition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loadingAssets ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Box className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">No assets found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Add your first asset to get started</p>
              <Button size="sm" className="mt-4 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setEditingAsset(null); setAssetDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />Add Asset
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Asset</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Condition</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Value</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Qty</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredAssets.map((asset: any) => {
                    const imgUrl = asset.image_path
                      ? supabase.storage.from("asset-images").getPublicUrl(asset.image_path).data.publicUrl
                      : null;
                    return (
                      <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                              {imgUrl
                                ? <img src={imgUrl} className="w-full h-full object-cover" alt="" />
                                : <Package className="h-4 w-4 text-muted-foreground/50" />}
                            </div>
                            <div>
                              <p className="font-medium">{asset.name}</p>
                              {asset.serial_number && <p className="text-xs text-muted-foreground">S/N: {asset.serial_number}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{asset.category || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{asset.location || "—"}</td>
                        <td className="px-4 py-3">
                          {asset.condition
                            ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${conditionColor[asset.condition] || "bg-slate-100 text-slate-700"}`}>{asset.condition}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          {asset.purchase_value ? fmtCurrency(asset.purchase_value) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">{asset.quantity ?? 1}</td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingAsset(asset); setAssetDialogOpen(true); }}>
                                <Pencil className="mr-2 h-4 w-4" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteTarget(asset)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick action buttons */}
          <div className="flex gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => setMaintDialogOpen(true)}>
              <Wrench className="mr-2 h-4 w-4" />Log Maintenance
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReleaseDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />New Release Request
            </Button>
          </div>
        </TabsContent>

        {/* ── Maintenance Tab ── */}
        <TabsContent value="maintenance">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{maintenance.length} maintenance record{maintenance.length !== 1 ? "s" : ""}</p>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setMaintDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Log Maintenance
            </Button>
          </div>

          {loadingMaint ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
          ) : maintenance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">No maintenance records</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Log maintenance to keep track of asset upkeep</p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Asset</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Performed By</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {maintenance.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{(m.church_assets as any)?.name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.maintenance_type || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {m.maintenance_date ? format(new Date(m.maintenance_date), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{m.performed_by || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[m.status] || "bg-slate-100 text-slate-700"}`}>
                          {m.status || "scheduled"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        {m.cost ? fmtCurrency(m.cost) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Release Requests Tab ── */}
        <TabsContent value="requests">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{requests.length} request{requests.length !== 1 ? "s" : ""}</p>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setEditingRequest(null); setReleaseDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />New Request
            </Button>
          </div>

          {loadingRequests ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">No release requests</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Submit a request to check out an asset</p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Asset</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Requested By</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Date Needed</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Return Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {requests.map((r: any) => {
                    const status = effectiveStatus(r);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{(r.church_assets as any)?.name || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.requested_by || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {r.date_needed ? format(new Date(r.date_needed), "dd MMM yyyy") : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                          {r.return_date ? format(new Date(r.return_date), "dd MMM yyyy") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[status] || "bg-slate-100 text-slate-700"}`}>
                            {status === "overdue" && <TriangleAlert className="h-3 w-3" />}
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Edit — always available unless returned */}
                              {status !== "returned" && (
                                <DropdownMenuItem onClick={() => { setEditingRequest(r); setReleaseDialogOpen(true); }}>
                                  <Pencil className="mr-2 h-4 w-4" />Edit
                                </DropdownMenuItem>
                              )}
                              {/* Approve / Reject — pending only */}
                              {r.status === "pending" && (
                                <>
                                  <DropdownMenuItem onClick={() => updateRequestStatus.mutate({ id: r.id, status: "approved" })}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateRequestStatus.mutate({ id: r.id, status: "rejected" })} className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" />Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {/* Mark Returned — approved or overdue */}
                              {(r.status === "approved" || status === "overdue") && (
                                <DropdownMenuItem onClick={() => updateRequestStatus.mutate({ id: r.id, status: "returned" })}>
                                  <RotateCcw className="mr-2 h-4 w-4 text-slate-500" />Mark as Returned
                                </DropdownMenuItem>
                              )}
                              {/* Delete — always */}
                              <DropdownMenuItem onClick={() => setDeleteRequestTarget(r)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <AssetDialog
        open={assetDialogOpen}
        onClose={() => { setAssetDialogOpen(false); setEditingAsset(null); }}
        tenantId={tenantId}
        editing={editingAsset}
        onSuccess={invalidate}
      />

      <MaintenanceDialog
        open={maintDialogOpen}
        onClose={() => setMaintDialogOpen(false)}
        tenantId={tenantId}
        assets={assets}
        onSuccess={invalidate}
      />

      <ReleaseRequestDialog
        open={releaseDialogOpen}
        onClose={() => { setReleaseDialogOpen(false); setEditingRequest(null); }}
        tenantId={tenantId}
        assets={assets}
        editing={editingRequest}
        onSuccess={invalidate}
      />

      {/* ── Delete asset confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete release request confirm ── */}
      <AlertDialog open={!!deleteRequestTarget} onOpenChange={v => { if (!v) setDeleteRequestTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Release Request</AlertDialogTitle>
            <AlertDialogDescription>
              Delete the release request for <strong>{(deleteRequestTarget?.church_assets as any)?.name || "this asset"}</strong> by <strong>{deleteRequestTarget?.requested_by}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteRequestTarget && deleteRequestMutation.mutate(deleteRequestTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
