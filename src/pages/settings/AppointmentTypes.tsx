import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useChurch } from '@/contexts/ChurchContext';
import { TABLES, COLS } from '@/lib/schema';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageTransition } from '@/components/ui/PageTransition';
import { Plus, Pencil, Trash2, CalendarClock } from 'lucide-react';
import type { AppointmentType } from '@/types/appointments';

interface DrawerProps { open: boolean; onClose: () => void; tenantId: string; editData?: AppointmentType | null; nextOrder: number; }

function TypeDrawer({ open, onClose, tenantId, editData, nextOrder }: DrawerProps) {
  const qc = useQueryClient();
  const isEdit = !!editData;
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(editData?.label ?? '');
      setDescription(editData?.description ?? '');
      setIsActive(editData?.is_active ?? true);
    }
  }, [open, editData]);

  const handleClose = () => { setLabel(''); setDescription(''); setIsActive(true); onClose(); };

  const handleSubmit = async () => {
    if (!label.trim()) { toast.error('Label is required'); return; }
    setSaving(true);
    try {
      if (isEdit && editData) {
        const { error } = await supabase.from(TABLES.APPOINTMENT_TYPES)
          .update({ label: label.trim(), description: description.trim() || null, is_active: isActive } as never)
          .eq('id', editData.id);
        if (error) throw error;
        toast.success('Type updated');
      } else {
        const { error } = await supabase.from(TABLES.APPOINTMENT_TYPES)
          .insert({ tenant_id: tenantId, label: label.trim(), description: description.trim() || null, is_active: isActive, sort_order: nextOrder } as never);
        if (error) throw error;
        toast.success('Type added');
      }
      qc.invalidateQueries({ queryKey: ['appointment-types', tenantId] });
      handleClose();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && handleClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto font-jakarta">
        <SheetHeader><SheetTitle className="font-jakarta">{isEdit ? 'Edit Type' : 'Add Appointment Type'}</SheetTitle></SheetHeader>
        <div className="space-y-5 mt-6">
          <div className="space-y-1.5">
            <Label className="font-jakarta">Label *</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Counselling Session" className="h-10 font-jakarta" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-jakarta">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Short description..." className="font-jakarta" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-jakarta">Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-jakarta" onClick={handleSubmit} disabled={!label.trim() || saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Type'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function AppointmentTypes() {
  const { tenantId } = useChurch();
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editData, setEditData] = useState<AppointmentType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppointmentType | null>(null);

  const { data: types = [], isLoading } = useQuery<AppointmentType[]>({
    queryKey: ['appointment-types', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.APPOINTMENT_TYPES)
        .select('*').eq(COLS.TENANT_ID, tenantId).order('sort_order');
      if (error) throw error;
      return (data ?? []) as AppointmentType[];
    },
    staleTime: 300_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.APPOINTMENT_TYPES).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointment-types', tenantId] }); toast.success('Type deleted'); setDeleteTarget(null); },
    onError: () => toast.error('Failed to delete'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from(TABLES.APPOINTMENT_TYPES).update({ is_active } as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointment-types', tenantId] }),
    onError: () => toast.error('Failed to update'),
  });

  return (
    <PageTransition>
      <div className="font-jakarta space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-jakarta">Appointment Types</h1>
            <p className="text-sm text-slate-500 mt-0.5">Configure the types of appointments members can request</p>
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white shrink-0 font-jakarta" onClick={() => { setEditData(null); setDrawerOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />Add Type
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : types.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <CalendarClock className="h-12 w-12 text-slate-300" />
              <p className="text-base font-semibold text-slate-600 dark:text-slate-300">No appointment types yet</p>
              <Button size="sm" className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-jakarta" onClick={() => { setEditData(null); setDrawerOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />Add Type
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm font-jakarta">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Label</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Active</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.map(t => (
                  <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">{t.label}</td>
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 hidden md:table-cell">{t.description ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3.5 text-center">
                      <Switch checked={t.is_active} onCheckedChange={v => toggleMutation.mutate({ id: t.id, is_active: v })} />
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

        <TypeDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setEditData(null); }} tenantId={tenantId} editData={editData} nextOrder={types.length} />
        <ConfirmDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)} title="Delete appointment type?" description={`"${deleteTarget?.label}" will be permanently deleted.`} confirmLabel="Delete" destructive onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} loading={deleteMutation.isPending} />
      </div>
    </PageTransition>
  );
}
