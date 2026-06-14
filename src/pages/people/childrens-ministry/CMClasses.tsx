import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { PageTransition } from "@/components/ui/PageTransition";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Plus, BookOpen, MoreHorizontal, Pencil, Trash2, Users, Loader2 } from "lucide-react";
import { DEFAULT_CLASSES } from "./types";
import type { ChildClass } from "./types";
import { cn } from "@/lib/utils";

export default function CMClasses() {
  const { tenantId } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('member_management');
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChildClass | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: classes = [], isLoading } = useQuery<ChildClass[]>({
    queryKey: ["children-classes", tenantId],
    queryFn: async () => {
      // Seed defaults if none exist
      const { data, count } = await supabase.from(TABLES.CHILDREN_CLASSES).select("*, teacher:members!children_classes_teacher_id_fkey(first_name, last_name)", { count: "exact" }).eq("tenant_id", tenantId!).order("min_age");
      if (count === 0) {
        await supabase.from(TABLES.CHILDREN_CLASSES).insert(
          DEFAULT_CLASSES.map(c => ({ ...c, tenant_id: tenantId! })) as any
        );
        const { data: seeded } = await supabase.from(TABLES.CHILDREN_CLASSES).select("*, teacher:members!children_classes_teacher_id_fkey(first_name, last_name)").eq("tenant_id", tenantId!).order("min_age");
        return (seeded ?? []) as ChildClass[];
      }
      return (data ?? []) as ChildClass[];
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });

  // Enrolled counts
  const { data: enrolledCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["class-enrolled-counts", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.CHILDREN).select("class_id").eq("tenant_id", tenantId!).eq("active", true);
      const counts: Record<string, number> = {};
      data?.forEach((c: any) => { if (c.class_id) counts[c.class_id] = (counts[c.class_id] ?? 0) + 1; });
      return counts;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.CHILDREN_CLASSES).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["children-classes"] }); toast.success("Class deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Helmet><title>Classes — Children's Ministry</title></Helmet>
      <PageTransition>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Classes</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage children's ministry class groups</p>
          </div>
          <PermissionButton 
            permission="member_management"
            readOnly={readOnly}
            size="sm" 
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2" 
            onClick={() => { setEditing(null); setModalOpen(true); }}
          >
            <Plus className="h-4 w-4" />Add Class
          </PermissionButton>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : classes.length === 0 ? (
          <EmptyState icon={BookOpen} title="No classes yet" description="Add your first class to get started." action={<PermissionButton permission="member_management" readOnly={readOnly} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Add Class</PermissionButton>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(cls => {
              const enrolled = enrolledCounts[cls.id] ?? 0;
              const pct = cls.capacity ? (enrolled / cls.capacity) * 100 : 0;
              const barColor = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
              return (
                <div key={cls.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-800">{cls.name}</p>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 mt-1">
                        Ages {cls.min_age}–{cls.max_age}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="font-jakarta text-sm">
                        <DropdownMenuItem onClick={() => { setEditing(cls); setModalOpen(true); }}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500" onClick={() => setDeleteId(cls.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {cls.teacher && (
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600">
                        {cls.teacher.first_name[0]}{cls.teacher.last_name[0]}
                      </div>
                      <span className="text-xs text-slate-500">{cls.teacher.first_name} {cls.teacher.last_name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span><span className="font-semibold text-slate-800">{enrolled}</span> children enrolled</span>
                  </div>

                  {cls.capacity && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Capacity</span><span>{enrolled}/{cls.capacity}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  )}

                  {!cls.active && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">Inactive</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PageTransition>

      <ClassModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} tenantId={tenantId!} />
      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete class?" description="This will remove the class. Children in this class will be unassigned." confirmLabel="Delete" destructive onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </>
  );
}

function ClassModal({ open, onClose, editing, tenantId }: { open: boolean; onClose: () => void; editing: ChildClass | null; tenantId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", min_age: 0, max_age: 12, teacher_id: "", capacity: "", active: true });

  useState(() => {
    if (editing) setForm({ name: editing.name, min_age: editing.min_age, max_age: editing.max_age, teacher_id: editing.teacher_id ?? "", capacity: editing.capacity ? String(editing.capacity) : "", active: editing.active });
    else setForm({ name: "", min_age: 0, max_age: 12, teacher_id: "", capacity: "", active: true });
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-search", tenantId],
    queryFn: async () => { const { data } = await supabase.from(TABLES.MEMBERS).select("id, first_name, last_name").eq("tenant_id", tenantId).eq("status", "active").order("first_name").limit(200); return data ?? []; },
    enabled: open,
    staleTime: 300_000,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, min_age: form.min_age, max_age: form.max_age, teacher_id: form.teacher_id || null, capacity: form.capacity ? Number(form.capacity) : null, active: form.active };
      if (editing) {
        const { error } = await supabase.from(TABLES.CHILDREN_CLASSES).update(payload as any).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.CHILDREN_CLASSES).insert({ ...payload, tenant_id: tenantId } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["children-classes"] }); toast.success(editing ? "Class updated" : "Class created"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md font-jakarta rounded-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="text-lg font-semibold text-slate-900">{editing ? "Edit Class" : "Add Class"}</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5"><Label className="text-xs font-medium text-slate-600">Class Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-10 border-slate-200 focus:border-orange-500 text-sm" placeholder="e.g. Nursery" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs font-medium text-slate-600">Min Age (years)</Label><Input type="number" min={0} max={18} value={form.min_age} onChange={e => setForm(f => ({ ...f, min_age: Number(e.target.value) }))} className="h-10 border-slate-200 focus:border-orange-500 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium text-slate-600">Max Age (years)</Label><Input type="number" min={0} max={18} value={form.max_age} onChange={e => setForm(f => ({ ...f, max_age: Number(e.target.value) }))} className="h-10 border-slate-200 focus:border-orange-500 text-sm" /></div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Teacher</Label>
            <Select value={form.teacher_id || undefined} onValueChange={v => setForm(f => ({ ...f, teacher_id: v }))}>
              <SelectTrigger className="h-10 border-slate-200 text-sm"><SelectValue placeholder="Select teacher (optional)" /></SelectTrigger>
              <SelectContent>{members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs font-medium text-slate-600">Capacity (optional)</Label><Input type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className="h-10 border-slate-200 focus:border-orange-500 text-sm" placeholder="Leave blank for unlimited" /></div>
          <div className="flex items-center gap-3"><Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} /><Label className="text-sm text-slate-700">Active</Label></div>
        </div>
        <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="border-slate-200">Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold" disabled={!form.name || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save Changes" : "Add Class"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
