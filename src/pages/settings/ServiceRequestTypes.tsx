import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, GripVertical } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SRType {
  id: string;
  tenant_id: string;
  label: string;
  internal_name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

// ─── Default types seeded on first load ──────────────────────────────────────
const DEFAULTS = [
  { label: "Baby Dedication",    internal_name: "baby_dedication",    description: "Request for baby dedication ceremony",       sort_order: 0 },
  { label: "Wedding Ceremony",   internal_name: "wedding_ceremony",   description: "Request for church wedding ceremony",        sort_order: 1 },
  { label: "Funeral Service",    internal_name: "funeral_service",    description: "Request for funeral or memorial service",    sort_order: 2 },
  { label: "Baptism",            internal_name: "baptism",            description: "Request for water baptism",                 sort_order: 3 },
  { label: "House Blessing",     internal_name: "house_blessing",     description: "Request for home blessing/dedication",      sort_order: 4 },
  { label: "Counselling Session",internal_name: "counselling_session",description: "Request for pastoral counselling",          sort_order: 5 },
  { label: "Hospital Visit",     internal_name: "hospital_visit",     description: "Request for hospital visitation",           sort_order: 6 },
  { label: "Prayer Request",     internal_name: "prayer_request",     description: "General prayer request",                   sort_order: 7 },
  { label: "Prayer",             internal_name: "prayer",             description: "Prayer support request",                   sort_order: 8 },
  { label: "Counselling",        internal_name: "counselling",        description: "Pastoral counselling session",              sort_order: 9 },
  { label: "Visitation",         internal_name: "visitation",         description: "Home or hospital visitation request",       sort_order: 10 },
  { label: "Financial Aid",      internal_name: "financial_aid",      description: "Request for financial assistance",          sort_order: 11 },
  { label: "Medical Support",    internal_name: "medical_support",    description: "Request for medical support or assistance", sort_order: 12 },
  { label: "Bereavement",        internal_name: "bereavement",        description: "Bereavement support and care",              sort_order: 13 },
  { label: "General",            internal_name: "general",            description: "General service request",                  sort_order: 14 },
];
function toInternalName(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
interface TypeModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  editData?: SRType | null;
  onSuccess: () => void;
}

function TypeModal({ open, onClose, tenantId, editData, onSuccess }: TypeModalProps) {
  const qc = useQueryClient();
  const isEdit = !!editData;

  const [label,        setLabel]        = useState(editData?.label ?? "");
  const [internalName, setInternalName] = useState(editData?.internal_name ?? "");
  const [description,  setDescription]  = useState(editData?.description ?? "");
  const [isActive,     setIsActive]     = useState(editData?.is_active ?? true);
  const [submitting,   setSubmitting]   = useState(false);
  const [deleteOpen,   setDeleteOpen]   = useState(false);

  // Auto-generate internal name from label (only when adding)
  useEffect(() => {
    if (!isEdit) setInternalName(toInternalName(label));
  }, [label, isEdit]);

  const handleClose = () => {
    if (!isEdit) { setLabel(""); setInternalName(""); setDescription(""); setIsActive(true); }
    onClose();
  };

  const handleSubmit = async () => {
    if (!label.trim())        { toast.error("Display label is required."); return; }
    if (!internalName.trim()) { toast.error("Internal name is required."); return; }
    setSubmitting(true);
    try {
      if (isEdit && editData) {
        const { error } = await supabase
          .from(TABLES.SERVICE_REQUEST_TYPES)
          .update({ label: label.trim(), internal_name: internalName.trim(), description: description.trim() || null, is_active: isActive } as never)
          .eq("id", editData.id);
        if (error) throw error;
        toast.success("Service type updated.");
      } else {
        // Get max sort_order
        const { data: existing } = await supabase
          .from(TABLES.SERVICE_REQUEST_TYPES)
          .select("sort_order")
          .eq("tenant_id", tenantId)
          .order("sort_order", { ascending: false })
          .limit(1);
        const nextOrder = ((existing?.[0]?.sort_order ?? -1) as number) + 1;
        const { error } = await supabase
          .from(TABLES.SERVICE_REQUEST_TYPES)
          .insert({ tenant_id: tenantId, label: label.trim(), internal_name: internalName.trim(), description: description.trim() || null, is_active: isActive, is_default: false, sort_order: nextOrder } as never);
        if (error) throw error;
        toast.success("Service type created.");
      }
      qc.invalidateQueries({ queryKey: ["service-request-types", tenantId] });
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editData) return;
    try {
      const { error } = await supabase.from(TABLES.SERVICE_REQUEST_TYPES).delete().eq("id", editData.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["service-request-types", tenantId] });
      toast.success("Service type deleted.");
      setDeleteOpen(false);
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to delete.");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {isEdit ? "Edit Service Type" : "Add Service Type"}
            </DialogTitle>
            <p className="text-xs text-slate-500">
              {isEdit ? "Update the details of this service type." : "Create a new service request type for members to choose from."}
            </p>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Display Label */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Display Label <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g., Baby Dedication"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="focus:ring-orange-400 focus:border-orange-400"
                autoFocus
              />
            </div>

            {/* Internal Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Internal Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g., baby_dedication"
                value={internalName}
                onChange={e => setInternalName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-400">Lowercase with underscores, used internally</p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                placeholder="Brief description of this service type..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Active</p>
                <p className="text-xs text-slate-500">Enable this service type for selection</p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                className="data-[state=checked]:bg-orange-500"
              />
            </div>

            {/* Default type note */}
            {isEdit && editData?.is_default && (
              <p className="text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                This is a default type. It cannot be deleted.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
            {/* Delete button for custom types only */}
            {isEdit && !editData?.is_default ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => setDeleteOpen(true)}
              >
                Delete Type
              </Button>
            ) : <div />}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{editData?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this service request type. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ServiceRequestTypesPage() {
  const { tenantId } = useChurch();
  const qc = useQueryClient();
  const [addOpen,  setAddOpen]  = useState(false);
  const [editType, setEditType] = useState<SRType | null>(null);
  const [seeding,  setSeeding]  = useState(false);
  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [rows, setRows] = useState<SRType[]>([]);

  const { data: types = [], isLoading } = useQuery<SRType[]>({
    queryKey: ["service-request-types", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.SERVICE_REQUEST_TYPES)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SRType[];
    },
    staleTime: 300_000,
  });

  // Keep local rows in sync with query data
  useEffect(() => { setRows(types); }, [types]);

  // Seed defaults on first load
  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const rows = DEFAULTS.map(d => ({ ...d, tenant_id: tenantId, is_active: true, is_default: true }));
      const { error } = await supabase.from(TABLES.SERVICE_REQUEST_TYPES).insert(rows as never);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["service-request-types", tenantId] });
      toast.success("Default service types added.");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to seed defaults.");
    } finally {
      setSeeding(false);
    }
  };

  // Toggle active status immediately
  const toggleActive = async (type: SRType) => {
    const newVal = !type.is_active;
    // Optimistic update
    setRows(prev => prev.map(r => r.id === type.id ? { ...r, is_active: newVal } : r));
    const { error } = await supabase
      .from(TABLES.SERVICE_REQUEST_TYPES)
      .update({ is_active: newVal } as never)
      .eq("id", type.id);
    if (error) {
      toast.error(error.message);
      setRows(prev => prev.map(r => r.id === type.id ? { ...r, is_active: !newVal } : r)); // revert
    } else {
      qc.invalidateQueries({ queryKey: ["service-request-types", tenantId] });
    }
  };

  // Drag-to-reorder
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...rows];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setRows(reordered);
    setDragIdx(idx);
  };
  const handleDrop = async () => {
    setDragIdx(null);
    // Save new order
    const updates = rows.map((r, i) => ({ id: r.id, sort_order: i }));
    for (const u of updates) {
      await supabase.from(TABLES.SERVICE_REQUEST_TYPES).update({ sort_order: u.sort_order } as never).eq("id", u.id);
    }
    qc.invalidateQueries({ queryKey: ["service-request-types", tenantId] });
  };

  return (
    <>
      <Helmet><title>Member Request Types — Vestry</title></Helmet>

      <div className="max-w-3xl">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Card header */}
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Member Request Types</p>
              <p className="text-xs text-slate-500 mt-0.5">Manage the types of member requests members can submit</p>
            </div>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0"
              size="sm"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Type
            </Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <p className="text-sm font-medium">No service request types yet.</p>
              <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={seeding}>
                {seeding ? "Adding..." : "Add Default Types"}
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="w-8 px-3 py-3" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Label</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((type, idx) => (
                  <tr
                    key={type.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={e => handleDragOver(e, idx)}
                    onDrop={handleDrop}
                    className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors ${dragIdx === idx ? "opacity-50" : ""}`}
                  >
                    {/* Drag handle */}
                    <td className="px-3 py-3 cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-4 w-4 text-slate-300 hover:text-slate-500" />
                    </td>
                    {/* Label + Default badge */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{type.label}</span>
                        {type.is_default && (
                          <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-600">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Description */}
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell max-w-[240px]">
                      <p className="truncate">{type.description || "—"}</p>
                    </td>
                    {/* Status toggle */}
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={type.is_active}
                        onCheckedChange={() => toggleActive(type)}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </td>
                    {/* Edit */}
                    <td className="px-4 py-3 text-center">
                      <button
                        title="Edit"
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        onClick={() => setEditType(type)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <TypeModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        tenantId={tenantId}
        onSuccess={() => {}}
      />
      <TypeModal
        open={!!editType}
        onClose={() => setEditType(null)}
        tenantId={tenantId}
        editData={editType}
        onSuccess={() => {}}
      />
    </>
  );
}
