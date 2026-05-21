import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageTransition } from "@/components/ui/PageTransition";
import { Plus, Pencil, GripVertical, Trash2, Image } from "lucide-react";
import type { MediaCategory } from "@/types/media";

const PRESET_COLORS = [
  '#6366f1', '#7c3aed', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#ec4899', '#14b8a6',
  '#f97316', '#84cc16', '#94a3b8', '#0ea5e9',
];

const DEFAULTS = [
  { name: 'General',   color: '#6366f1', description: 'General church media',              sort_order: 0 },
  { name: 'Worship',   color: '#7c3aed', description: 'Worship service photos and videos', sort_order: 1 },
  { name: 'Events',    color: '#f59e0b', description: 'Church events and programs',        sort_order: 2 },
  { name: 'Youth',     color: '#10b981', description: 'Youth ministry media',              sort_order: 3 },
  { name: 'Sermons',   color: '#3b82f6', description: 'Sermon recordings and graphics',    sort_order: 4 },
  { name: 'Community', color: '#ec4899', description: 'Community and outreach media',      sort_order: 5 },
];

interface CategoryDrawerProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  editData?: MediaCategory | null;
  nextOrder: number;
}

function CategoryDrawer({ open, onClose, tenantId, editData, nextOrder }: CategoryDrawerProps) {
  const qc = useQueryClient();
  const isEdit = !!editData;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editData?.name ?? "");
      setDescription(editData?.description ?? "");
      setColor(editData?.color ?? "#6366f1");
      setIsActive(editData?.status === "active");
    }
  }, [open, editData]);

  const handleClose = () => { setName(""); setDescription(""); setColor("#6366f1"); setIsActive(true); onClose(); };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Name is required."); return; }
    setSubmitting(true);
    try {
      if (isEdit && editData) {
        const { error } = await supabase.from(TABLES.MEDIA_CATEGORIES)
          .update({ name: name.trim(), description: description.trim() || null, color, status: isActive ? "active" : "inactive", updated_at: new Date().toISOString() } as never)
          .eq("id", editData.id);
        if (error) throw error;
        toast.success("Category updated.");
      } else {
        const { error } = await supabase.from(TABLES.MEDIA_CATEGORIES)
          .insert({ tenant_id: tenantId, name: name.trim(), description: description.trim() || null, color, status: isActive ? "active" : "inactive", sort_order: nextOrder } as never);
        if (error) throw error;
        toast.success("Category added.");
      }
      qc.invalidateQueries({ queryKey: ["media-categories", tenantId] });
      handleClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && handleClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto font-jakarta">
        <SheetHeader>
          <SheetTitle className="font-jakarta">{isEdit ? "Edit Category" : "Add Category"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-6">
          <div className="space-y-1.5">
            <Label className="font-jakarta">Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Worship" className="h-10 font-jakarta" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-jakarta">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description..." rows={3} className="font-jakarta" />
          </div>
          <div className="space-y-2">
            <Label className="font-jakarta">Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-7 h-7 rounded-full border border-slate-200" style={{ backgroundColor: color }} />
              <Input value={color} onChange={e => setColor(e.target.value)} placeholder="#6366f1" className="h-8 w-28 font-mono text-xs" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-jakarta">Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-jakarta" onClick={handleSubmit} disabled={!name.trim() || submitting}>
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Category"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function MediaCategories() {
  const { tenantId } = useChurch();
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editData, setEditData] = useState<MediaCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaCategory | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [rows, setRows] = useState<MediaCategory[]>([]);

  const { data: categories = [], isLoading } = useQuery<MediaCategory[]>({
    queryKey: ["media-categories", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.MEDIA_CATEGORIES)
        .select("*").eq(COLS.TENANT_ID, tenantId).order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MediaCategory[];
    },
    staleTime: 300_000,
  });

  // Stable cache key — string primitive so the effect only fires when data actually changes,
  // not on every render due to TanStack Query returning a new array reference each time.
  const categoriesCacheKey = categories.map(c => `${c.id}:${c.status}:${c.sort_order}:${c.name}`).join('|');
  useEffect(() => {
    setRows(categories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesCacheKey]);

  const seedingRef = useRef(false);

  useEffect(() => {
    if (!isLoading && categories.length === 0 && !seedingRef.current) {
      seedingRef.current = true;
      setSeeding(true);
      supabase.from(TABLES.MEDIA_CATEGORIES)
        .insert(DEFAULTS.map(d => ({ ...d, tenant_id: tenantId, status: "active" })) as never)
        .then(() => { qc.invalidateQueries({ queryKey: ["media-categories", tenantId] }); setSeeding(false); })
        .catch(() => setSeeding(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, categories.length]); // primitives only — no object refs

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from(TABLES.MEDIA_CATEGORIES)
        .update({ status, updated_at: new Date().toISOString() } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media-categories", tenantId] }),
    onError: () => toast.error("Failed to update status."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.MEDIA_CATEGORIES).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["media-categories", tenantId] }); toast.success("Category deleted."); setDeleteTarget(null); },
    onError: () => toast.error("Failed to delete category."),
  });

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
    await Promise.all(rows.map((r, i) => supabase.from(TABLES.MEDIA_CATEGORIES).update({ sort_order: i } as never).eq("id", r.id)));
    qc.invalidateQueries({ queryKey: ["media-categories", tenantId] });
  };

  return (
    <PageTransition>
      <div className="font-jakarta space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-jakarta">Media Categories</h1>
            <p className="text-sm text-slate-500 mt-0.5 font-jakarta">Manage categories for organizing church media</p>
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white shrink-0 font-jakarta" onClick={() => { setEditData(null); setDrawerOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />Add Category
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {isLoading || seeding ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Image className="h-12 w-12 text-slate-300" />
              <p className="text-base font-semibold text-slate-600 dark:text-slate-300 font-jakarta">No categories yet</p>
              <Button size="sm" className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-jakarta" onClick={() => { setEditData(null); setDrawerOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />Add Category
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm font-jakarta">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Active</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((cat, idx) => (
                  <tr key={cat.id} draggable onDragStart={() => handleDragStart(idx)} onDragOver={e => handleDragOver(e, idx)} onDrop={handleDrop}
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3.5"><GripVertical className="h-4 w-4 text-slate-300 cursor-grab" /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 hidden md:table-cell">{cat.description ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3.5 text-center">
                      <Switch checked={cat.status === "active"} onCheckedChange={v => toggleMutation.mutate({ id: cat.id, status: v ? "active" : "inactive" })} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700" onClick={() => { setEditData(cat); setDrawerOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500" onClick={() => setDeleteTarget(cat)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <CategoryDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setEditData(null); }} tenantId={tenantId} editData={editData} nextOrder={rows.length} />
        <ConfirmDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)} title="Delete category?" description={`"${deleteTarget?.name}" will be permanently deleted.`} confirmLabel="Delete" destructive onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} loading={deleteMutation.isPending} />
      </div>
    </PageTransition>
  );
}
