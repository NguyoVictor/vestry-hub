import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
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
import { Plus, Pencil, GripVertical, Trash2, UsersRound } from "lucide-react";

const PRESET_COLORS = [
  '#7c3aed','#6366f1','#3b82f6','#10b981',
  '#f59e0b','#f43f5e','#f97316','#ec4899',
  '#14b8a6','#84cc16','#94a3b8','#0ea5e9',
];

const DEFAULTS = [
  { label: 'Ministry',   color: '#7c3aed', description: 'General ministry group',    sort_order: 0 },
  { label: 'Cell Group', color: '#10b981', description: 'Small home cell group',      sort_order: 1 },
  { label: 'Department', color: '#3b82f6', description: 'Church department or team',  sort_order: 2 },
  { label: 'Choir',      color: '#f59e0b', description: 'Music and worship choir',    sort_order: 3 },
  { label: 'Youth',      color: '#f43f5e', description: 'Youth ministry group',       sort_order: 4 },
  { label: 'Children',   color: '#f97316', description: 'Children ministry group',    sort_order: 5 },
  { label: 'Other',      color: '#94a3b8', description: 'Other group type',           sort_order: 6 },
];

interface GroupType { id: string; tenant_id: string; label: string; color: string; description: string | null; is_active: boolean; sort_order: number; }

interface DrawerProps { open: boolean; onClose: () => void; tenantId: string; editData?: GroupType | null; nextOrder: number; }

function TypeDrawer({ open, onClose, tenantId, editData, nextOrder }: DrawerProps) {
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const isEdit = !!editData;
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#7c3aed");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(editData?.label ?? "");
      setDescription(editData?.description ?? "");
      setColor(editData?.color ?? "#7c3aed");
      setIsActive(editData?.is_active ?? true);
    }
  }, [open, editData]);

  const handleClose = () => { setLabel(""); setDescription(""); setColor("#7c3aed"); setIsActive(true); onClose(); };

  const handleSubmit = async () => {
    if (readOnly) return;
    if (!label.trim()) { toast.error("Label is required."); return; }
    setSaving(true);
    try {
      if (isEdit && editData) {
        const { error } = await supabase.from(TABLES.GROUP_TYPES)
          .update({ label: label.trim(), description: description.trim() || null, color, is_active: isActive, updated_at: new Date().toISOString() } as never)
          .eq("id", editData.id);
        if (error) throw error;
        toast.success("Group type updated.");
      } else {
        const { error } = await supabase.from(TABLES.GROUP_TYPES)
          .insert({ tenant_id: tenantId, label: label.trim(), description: description.trim() || null, color, is_active: isActive, sort_order: nextOrder } as never);
        if (error) throw error;
        toast.success("Group type added.");
      }
      qc.invalidateQueries({ queryKey: ["group-types", tenantId] });
      handleClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && handleClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto font-jakarta">
        <SheetHeader><SheetTitle className="font-jakarta">{isEdit ? "Edit Group Type" : "Add Group Type"}</SheetTitle></SheetHeader>
        <div className="space-y-5 mt-6">
          <div className="space-y-1.5">
            <Label className="font-jakarta">Label *</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Youth" className="h-10 font-jakarta" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-jakarta">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Short description..." className="font-jakarta" />
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
              <Input value={color} onChange={e => setColor(e.target.value)} placeholder="#7c3aed" className="h-8 w-28 font-mono text-xs" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-jakarta">Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} disabled={readOnly} />
          </div>
          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-jakarta" onClick={handleSubmit} disabled={!label.trim() || saving || readOnly}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Group Type"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function GroupTypes() {
  const { tenantId } = useChurch();
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editData, setEditData] = useState<GroupType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupType | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [rows, setRows] = useState<GroupType[]>([]);
  const seedingRef = useRef(false);

  const { data: types = [], isLoading, error } = useQuery<GroupType[]>({
    queryKey: ["group-types", tenantId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from(TABLES.GROUP_TYPES)
          .select("*").eq(COLS.TENANT_ID, tenantId).order("sort_order", { ascending: true });
        if (error) throw error;
        return (data ?? []) as GroupType[];
      } catch (err: any) {
        // If table doesn't exist, return empty array and show helpful message
        if (err.message?.includes('does not exist') || err.message?.includes('schema cache')) {
          console.warn("Group types table doesn't exist:", err.message);
          return [];
        }
        throw err;
      }
    },
    staleTime: 300_000,
    retry: false, // Don't retry if table doesn't exist
  });

  const cacheKey = types.map(t => `${t.id}:${t.is_active}:${t.sort_order}:${t.label}`).join('|');
  useEffect(() => { setRows(types); }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoading && types.length === 0 && !seedingRef.current) {
      seedingRef.current = true;
      setSeeding(true);
      supabase.from(TABLES.GROUP_TYPES)
        .insert(DEFAULTS.map(d => ({ ...d, tenant_id: tenantId, is_active: true })) as never)
        .then(() => { qc.invalidateQueries({ queryKey: ["group-types", tenantId] }); setSeeding(false); })
        .catch(() => setSeeding(false));
    }
  }, [isLoading, types.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (readOnly) return;
      const { error } = await supabase.from(TABLES.GROUP_TYPES).update({ is_active, updated_at: new Date().toISOString() } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-types", tenantId] }),
    onError: () => toast.error("Failed to update."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (readOnly) return;
      const { error} = await supabase.from(TABLES.GROUP_TYPES).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["group-types", tenantId] }); toast.success("Group type deleted."); setDeleteTarget(null); },
    onError: () => toast.error("Failed to delete."),
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
    await Promise.all(rows.map((r, i) => supabase.from(TABLES.GROUP_TYPES).update({ sort_order: i } as never).eq("id", r.id)));
    qc.invalidateQueries({ queryKey: ["group-types", tenantId] });
  };

  return (
    <PageTransition>
      {/* Read-only banner */}
      {readOnly && <ReadOnlyBanner section="Group Types" />}
      
      <div className="font-jakarta space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-jakarta">Group Types</h1>
            <p className="text-sm text-slate-500 mt-0.5 font-jakarta">Manage the types used to categorize ministry groups</p>
          </div>
          <PermissionButton readOnly={readOnly} className="bg-orange-500 hover:bg-orange-600 text-white shrink-0 font-jakarta" onClick={() => { setEditData(null); setDrawerOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />Add Type
          </PermissionButton>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {error?.message?.includes('schema cache') || error?.message?.includes('does not exist') ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <UsersRound className="h-12 w-12 text-red-300" />
              <div>
                <p className="text-base font-semibold text-red-600 dark:text-red-400 font-jakarta">Database Table Missing</p>
                <p className="text-sm text-red-500 dark:text-red-400 mt-1 font-jakarta">The 'group_types' table doesn't exist in your database.</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 max-w-md">
                <p className="text-sm text-red-700 dark:text-red-300 font-jakarta mb-3">
                  <strong>To fix this:</strong>
                </p>
                <ol className="text-sm text-red-700 dark:text-red-300 font-jakarta space-y-1 text-left">
                  <li>1. Go to Supabase Dashboard → SQL Editor</li>
                  <li>2. Run the SQL script: <code className="bg-red-100 dark:bg-red-800 px-1 rounded">CREATE_GROUP_TYPES_TABLE.sql</code></li>
                  <li>3. Refresh this page</li>
                </ol>
              </div>
            </div>
          ) : isLoading || seeding ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <UsersRound className="h-12 w-12 text-slate-300" />
              <p className="text-base font-semibold text-slate-600 dark:text-slate-300 font-jakarta">No group types yet</p>
              <PermissionButton readOnly={readOnly} size="sm" className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-jakarta" onClick={() => { setEditData(null); setDrawerOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />Add Type
              </PermissionButton>
            </div>
          ) : (
            <table className="w-full text-sm font-jakarta">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Active</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t, idx) => (
                  <tr key={t.id} draggable onDragStart={() => handleDragStart(idx)} onDragOver={e => handleDragOver(e, idx)} onDrop={handleDrop}
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3.5"><GripVertical className="h-4 w-4 text-slate-300 cursor-grab" /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{t.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 hidden md:table-cell">{t.description ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3.5 text-center">
                      <Switch checked={t.is_active} onCheckedChange={v => toggleMutation.mutate({ id: t.id, is_active: v })} disabled={readOnly} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700" onClick={() => { setEditData(t); setDrawerOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500" onClick={() => setDeleteTarget(t)}>
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

        <TypeDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setEditData(null); }} tenantId={tenantId} editData={editData} nextOrder={rows.length} />
        <ConfirmDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)} title="Delete group type?" description={`"${deleteTarget?.label}" will be permanently deleted. Groups using this type will not be affected.`} confirmLabel="Delete" destructive onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} loading={deleteMutation.isPending} />
      </div>
    </PageTransition>
  );
}
