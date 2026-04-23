import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Pencil, GripVertical, Building2 } from "lucide-react";
import { PageTransition } from "@/components/ui/PageTransition";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FacilityType {
  id: string;
  tenant_id: string;
  label: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Default facility types ───────────────────────────────────────────────────
const FACILITY_DEFAULTS = [
  { label: "Main Hall",        description: "Primary worship and event hall",          sort_order: 0 },
  { label: "Chapel",           description: "Smaller chapel for intimate gatherings",  sort_order: 1 },
  { label: "Conference Room",  description: "Meeting and conference space",            sort_order: 2 },
  { label: "Outdoor",          description: "Outdoor grounds and open spaces",         sort_order: 3 },
  { label: "Parking",          description: "Parking area and car park",               sort_order: 4 },
  { label: "Kitchen",          description: "Kitchen and catering facilities",         sort_order: 5 },
  { label: "Classroom",        description: "Classroom and training room",             sort_order: 6 },
  { label: "Other",            description: "Other facility types",                    sort_order: 7 },
];

// ─── Schema ───────────────────────────────────────────────────────────────────
const facilityTypeSchema = z.object({
  label: z.string().min(1, "Label is required"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});
type FacilityTypeFormValues = z.infer<typeof facilityTypeSchema>;

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────
interface FacilityTypeModalProps {
  open: boolean;
  onClose: () => void;
  editing: FacilityType | null;
  existingCount: number;
  tenantId: string;
  onSuccess: () => void;
}

function FacilityTypeModal({ open, onClose, editing, existingCount, tenantId, onSuccess }: FacilityTypeModalProps) {
  const form = useForm<FacilityTypeFormValues>({
    resolver: zodResolver(facilityTypeSchema),
    defaultValues: { label: "", description: "", is_active: true },
  });

  // Pre-populate when editing
  useEffect(() => {
    if (editing) {
      form.reset({
        label: editing.label,
        description: editing.description ?? "",
        is_active: editing.is_active,
      });
    } else {
      form.reset({ label: "", description: "", is_active: true });
    }
  }, [editing, open, form]);

  const createMutation = useMutation({
    mutationFn: async (values: FacilityTypeFormValues) => {
      const { error } = await supabase.from(TABLES.FACILITY_TYPES).insert({
        tenant_id: tenantId,
        label: values.label,
        description: values.description || null,
        is_active: values.is_active,
        sort_order: existingCount,
        is_default: false,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Facility type created.");
      onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to create facility type.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: FacilityTypeFormValues) => {
      const { error } = await supabase
        .from(TABLES.FACILITY_TYPES)
        .update({
          label: values.label,
          description: values.description || null,
          is_active: values.is_active,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", editing!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Facility type updated.");
      onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update facility type.");
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FacilityTypeFormValues) => {
    if (editing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[480px] rounded-2xl p-0 font-jakarta">
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-slate-100">
          <DialogTitle className="text-lg font-semibold text-slate-900">
            {editing ? "Edit Facility Type" : "Add Facility Type"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="px-6 py-5 space-y-4">
              {/* Label */}
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">
                      Label <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Main Hall"
                        className="h-10 border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of this facility type (optional)"
                        className="resize-none border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-sm"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active toggle */}
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                      <div>
                        <Label className="text-sm font-medium text-slate-700">Active</Label>
                        <p className="text-xs text-slate-400 mt-0.5">Show this type in facility dropdowns</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-orange-500"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="px-6 pb-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isPending}
              >
                {isPending ? "Saving..." : editing ? "Save Changes" : "Add Type"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FacilityTypesPage() {
  const { tenantId } = useChurch();
  const qc = useQueryClient();
  const [rows, setRows] = useState<FacilityType[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<FacilityType | null>(null);

  const openAdd = () => { setEditingType(null); setModalOpen(true); };
  const openEdit = (type: FacilityType) => { setEditingType(type); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingType(null); };
  const handleModalSuccess = () => qc.invalidateQueries({ queryKey: ["facility-types", tenantId] });

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const { data: types = [], isLoading } = useQuery<FacilityType[]>({
    queryKey: ["facility-types", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FACILITY_TYPES)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FacilityType[];
    },
    staleTime: 300_000,
  });

  // Keep local rows in sync with query data
  useEffect(() => { setRows(types); }, [types]);

  // Seed default facility types
  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      const inserts = FACILITY_DEFAULTS.map(d => ({
        ...d,
        tenant_id: tenantId,
        is_active: true,
        is_default: true,
      }));
      const { error } = await supabase.from(TABLES.FACILITY_TYPES).insert(inserts as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facility-types", tenantId] });
      toast.success("Default types added");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to seed defaults.");
    },
  });

  // Toggle active status with optimistic UI
  const toggleActive = async (type: FacilityType) => {
    const newVal = !type.is_active;
    setRows(prev => prev.map(r => r.id === type.id ? { ...r, is_active: newVal } : r));
    const { error } = await supabase
      .from(TABLES.FACILITY_TYPES)
      .update({ is_active: newVal } as never)
      .eq("id", type.id);
    if (error) {
      toast.error(error.message);
      setRows(prev => prev.map(r => r.id === type.id ? { ...r, is_active: !newVal } : r));
    } else {
      qc.invalidateQueries({ queryKey: ["facility-types", tenantId] });
    }
  };

  // Drag-to-reorder
  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...rows];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setRows(reordered);
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragIdx(null);
    setDragOverIdx(null);
    // Batch-update all sort_order values in a single upsert
    const updates = rows.map((r, i) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      label: r.label,
      sort_order: i,
    }));
    const { error } = await supabase
      .from(TABLES.FACILITY_TYPES)
      .upsert(updates as never, { onConflict: "id" });
    if (error) {
      toast.error("Failed to save new order.");
      // Revert to server state
      qc.invalidateQueries({ queryKey: ["facility-types", tenantId] });
    } else {
      qc.invalidateQueries({ queryKey: ["facility-types", tenantId] });
    }
  };

  return (
    <PageTransition>
      <Helmet><title>Facility Types — Vestry</title></Helmet>

      <div className="max-w-3xl">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Card header */}
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Facility Types</p>
              <p className="text-xs text-slate-500 mt-0.5">Manage the types of facilities your church offers</p>
            </div>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0"
              size="sm"
              onClick={openAdd}
            >
              <Plus className="h-4 w-4" />
              Add Type
            </Button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Building2 className="h-12 w-12 text-slate-300" />
              <p className="text-base font-semibold text-slate-600 font-jakarta">No facility types yet</p>
              <p className="text-sm text-slate-400 max-w-sm font-jakarta">
                Add facility types to categorise the spaces your church offers for booking.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => seedDefaultsMutation.mutate()}
                disabled={seedDefaultsMutation.isPending}
              >
                {seedDefaultsMutation.isPending ? "Adding..." : "Add Default Types"}
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
                    onDragEnd={handleDragEnd}
                    className={`border-b border-slate-100 dark:border-slate-800 transition-colors
                      ${dragIdx === idx ? "opacity-40 bg-slate-50 dark:bg-slate-700/40" : "hover:bg-slate-50/50 dark:hover:bg-slate-700/30"}
                      ${dragOverIdx === idx && dragIdx !== idx ? "border-t-2 border-t-orange-400" : ""}
                    `}
                  >
                    <td className="px-3 py-3 cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-4 w-4 text-slate-300 hover:text-slate-500" />
                    </td>
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
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell max-w-[240px]">
                      <p className="truncate">{type.description || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={type.is_active}
                        onCheckedChange={() => toggleActive(type)}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        title="Edit"
                        onClick={() => openEdit(type)}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
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

      <FacilityTypeModal
        open={modalOpen}
        onClose={closeModal}
        editing={editingType}
        existingCount={rows.length}
        tenantId={tenantId}
        onSuccess={handleModalSuccess}
      />
    </PageTransition>
  );
}
