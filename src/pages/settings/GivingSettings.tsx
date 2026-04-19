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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GivingCategory {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
}

// ─── Default system categories ────────────────────────────────────────────────
const SYSTEM_DEFAULTS = [
  { name: "Tithe",        code: "TITHE",        description: "10% of income given to the church",  sort_order: 0 },
  { name: "Thanksgiving", code: "THANKSGIVING",  description: "Offerings given in gratitude to God", sort_order: 1 },
  { name: "Offering",     code: "OFFERING",      description: "Regular donations beyond tithe",      sort_order: 2 },
];

// ─── Auto-generate code from name ────────────────────────────────────────────
function toCode(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// ─── Category Modal (Add / Edit) ─────────────────────────────────────────────
interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  editData?: GivingCategory | null;
  existingCodes: string[];
  onSuccess: () => void;
}

function CategoryModal({ open, onClose, tenantId, editData, existingCodes, onSuccess }: CategoryModalProps) {
  const qc = useQueryClient();
  const isEdit = !!editData;

  const [name,        setName]        = useState(editData?.name ?? "");
  const [code,        setCode]        = useState(editData?.code ?? "");
  const [description, setDescription] = useState(editData?.description ?? "");
  const [isActive,    setIsActive]    = useState(editData?.is_active ?? true);
  const [codeError,   setCodeError]   = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  // Auto-generate code from name (only when adding)
  useEffect(() => {
    if (!isEdit) setCode(toCode(name));
  }, [name, isEdit]);

  const handleClose = () => {
    if (!isEdit) { setName(""); setCode(""); setDescription(""); setIsActive(true); }
    setCodeError("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Name is required."); return; }
    if (!code.trim()) { toast.error("Code is required."); return; }

    // Check code uniqueness (exclude current record when editing)
    const otherCodes = existingCodes.filter(c =>
      isEdit ? c !== editData?.code : true
    );
    if (otherCodes.includes(code.trim().toUpperCase())) {
      setCodeError("This code already exists. Please use a unique code.");
      return;
    }
    setCodeError("");
    setSubmitting(true);

    try {
      if (isEdit && editData) {
        const { error } = await supabase
          .from(TABLES.GIVING_CATEGORIES)
          .update({
            name: name.trim(),
            // Only update code for non-system categories
            ...(editData.is_system ? {} : { code: code.trim().toUpperCase() }),
            description: description.trim() || null,
            is_active: isActive,
          } as never)
          .eq("id", editData.id);
        if (error) throw error;
        toast.success("✅ Category updated successfully.");
      } else {
        const { data: existing } = await supabase
          .from(TABLES.GIVING_CATEGORIES)
          .select("sort_order")
          .eq("tenant_id", tenantId)
          .order("sort_order", { ascending: false })
          .limit(1);
        const nextOrder = ((existing?.[0]?.sort_order ?? -1) as number) + 1;

        const { error } = await supabase
          .from(TABLES.GIVING_CATEGORIES)
          .insert({
            tenant_id: tenantId,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim() || null,
            is_active: isActive,
            is_system: false,
            sort_order: nextOrder,
          } as never);
        if (error) throw error;
        toast.success("✅ Category created successfully.");
      }
      qc.invalidateQueries({ queryKey: ["giving-categories", tenantId] });
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Edit Category" : "Add Category"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g., Tithe, Offering, Missions"
              value={name}
              onChange={e => setName(e.target.value)}
              className="focus:ring-orange-400 focus:border-orange-400"
              autoFocus
            />
          </div>

          {/* Code */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Code</Label>
            {isEdit && editData?.is_system ? (
              <div title="System category codes cannot be changed">
                <Input
                  value={code}
                  readOnly
                  className="bg-slate-50 text-slate-400 cursor-not-allowed font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">System category codes cannot be changed</p>
              </div>
            ) : (
              <>
                <Input
                  placeholder="e.g., TITHE"
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "")); setCodeError(""); }}
                  className="font-mono"
                />
                {codeError && <p className="text-xs text-red-500">{codeError}</p>}
              </>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              placeholder="Brief description of this giving category"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="resize-y"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium cursor-pointer" onClick={() => setIsActive(v => !v)}>
              Active
            </Label>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="data-[state=checked]:bg-orange-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GivingSettings() {
  const { tenantId } = useChurch();
  const qc = useQueryClient();
  const [addOpen,    setAddOpen]    = useState(false);
  const [editCat,    setEditCat]    = useState<GivingCategory | null>(null);
  const [deleteCat,  setDeleteCat]  = useState<GivingCategory | null>(null);
  const [seeding,    setSeeding]    = useState(false);

  const { data: categories = [], isLoading } = useQuery<GivingCategory[]>({
    queryKey: ["giving-categories", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.GIVING_CATEGORIES)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GivingCategory[];
    },
    staleTime: 300_000,
  });

  const existingCodes = categories.map(c => c.code);

  // Seed defaults on first load
  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const rows = SYSTEM_DEFAULTS.map(d => ({
        ...d,
        tenant_id: tenantId,
        is_active: true,
        is_system: true,
      }));
      const { error } = await supabase
        .from(TABLES.GIVING_CATEGORIES)
        .insert(rows as never);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["giving-categories", tenantId] });
      toast.success("Default giving categories added.");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to seed defaults.");
    } finally {
      setSeeding(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLES.GIVING_CATEGORIES)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["giving-categories", tenantId] });
      setDeleteCat(null);
      toast.success("Category deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Helmet><title>Giving Settings — Vestry</title></Helmet>

      <div className="max-w-3xl">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Card header */}
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Giving Categories</p>
              <p className="text-xs text-slate-500 mt-0.5">Configure the types of donations your church accepts</p>
            </div>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0"
              size="sm"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <p className="text-sm font-medium">No giving categories yet.</p>
              <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={seeding}>
                {seeding ? "Adding..." : "Add Default Categories"}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="w-10 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, idx) => (
                    <tr
                      key={cat.id}
                      className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors ${idx === categories.length - 1 ? "border-b-0" : ""}`}
                    >
                      {/* Name + System badge */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{cat.name}</span>
                          {cat.is_system && (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              System
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Code */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{cat.code}</span>
                      </td>
                      {/* Description */}
                      <td className="px-4 py-3 hidden md:table-cell max-w-[240px]">
                        <p className="text-xs text-slate-500 truncate">{cat.description || "—"}</p>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {cat.is_active ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                            Inactive
                          </span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-3 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-orange-500 transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() => setEditCat(cat)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </DropdownMenuItem>
                            {!cat.is_system && (
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
                                onClick={() => setDeleteCat(cat)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add modal */}
      <CategoryModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        tenantId={tenantId}
        existingCodes={existingCodes}
        onSuccess={() => {}}
      />

      {/* Edit modal */}
      <CategoryModal
        open={!!editCat}
        onClose={() => setEditCat(null)}
        tenantId={tenantId}
        editData={editCat}
        existingCodes={existingCodes}
        onSuccess={() => {}}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteCat} onOpenChange={v => !v && setDeleteCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteCat?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => deleteCat && deleteMutation.mutate(deleteCat.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
