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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, UserPlus, Users, MoreHorizontal, Trash2, Eye } from "lucide-react";
import { childGradient, calcAge } from "./types";
import type { Child, ChildClass } from "./types";
import { cn } from "@/lib/utils";
import RegisterChildModal from "./RegisterChildModal";

export default function CMChildren() {
  const { tenantId } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('member_management');
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: classes = [] } = useQuery<ChildClass[]>({
    queryKey: ["children-classes", tenantId],
    queryFn: async () => { const { data } = await supabase.from(TABLES.CHILDREN_CLASSES).select("id, name, min_age, max_age, active, teacher_id, capacity, created_at").eq("tenant_id", tenantId!).order("min_age"); return (data ?? []) as ChildClass[]; },
    enabled: !!tenantId, staleTime: 300_000,
  });

  const { data: children = [], isLoading } = useQuery<Child[]>({
    queryKey: ["children-list", tenantId, classFilter, statusFilter],
    queryFn: async () => {
      let q = supabase.from(TABLES.CHILDREN)
        .select("*, class:children_classes(name), guardian_primary:members!children_guardian_primary_id_fkey(first_name, last_name)")
        .eq("tenant_id", tenantId!)
        .order("first_name");
      if (classFilter !== "all") q = q.eq("class_id", classFilter);
      if (statusFilter === "active") q = q.eq("active", true);
      else if (statusFilter === "inactive") q = q.eq("active", false);
      const { data } = await q;
      return (data ?? []) as Child[];
    },
    enabled: !!tenantId, staleTime: 60_000,
  });

  // Last check-in per child
  const { data: lastCheckins = {} } = useQuery<Record<string, string>>({
    queryKey: ["children-last-checkins", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.CHILDREN_CHECKINS).select("child_id, checked_in_at").eq("tenant_id", tenantId!).order("checked_in_at", { ascending: false });
      const map: Record<string, string> = {};
      data?.forEach((ci: any) => { if (!map[ci.child_id]) map[ci.child_id] = ci.checked_in_at; });
      return map;
    },
    enabled: !!tenantId, staleTime: 60_000,
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => { if (readOnly) return; const { error } = await supabase.from(TABLES.CHILDREN).update({ active: false } as any).eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["children-list"] }); qc.invalidateQueries({ queryKey: ["cm-stats"] }); toast.success("Child deactivated"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = children.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      `${c.guardian_primary?.first_name ?? ""} ${c.guardian_primary?.last_name ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <>
      <Helmet><title>Children — Children's Ministry</title></Helmet>
      <PageTransition>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Children</h1>
            <p className="text-sm text-slate-500 mt-0.5">All registered children in the ministry</p>
          </div>
          <PermissionButton 
            permission="member_management"
            readOnly={readOnly}
            size="sm" 
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2" 
            onClick={() => setRegisterOpen(true)}
          >
            <UserPlus className="h-4 w-4" />Register Child
          </PermissionButton>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search children..." className="pl-9 h-9 border-slate-200 focus:border-orange-500 text-sm" />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="h-9 w-40 border-slate-200 text-sm"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-36 border-slate-200 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-24" /></div><Skeleton className="h-5 w-16 rounded-full" /></div>)}</div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No children found" description="Register your first child to get started." action={<PermissionButton permission="member_management" readOnly={readOnly} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setRegisterOpen(true)}><UserPlus className="h-4 w-4 mr-1.5" />Register Child</PermissionButton>} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm font-jakarta">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Child", "Age", "Class", "Guardian", "Last Check-in", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(child => {
                  const name = `${child.first_name} ${child.last_name}`;
                  const grad = childGradient(name);
                  const ini = `${child.first_name[0]}${child.last_name[0]}`.toUpperCase();
                  const age = calcAge(child.date_of_birth);
                  const lastCI = lastCheckins[child.id];
                  return (
                    <tr key={child.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shrink-0", grad)}>{ini}</div>
                          <span className="font-semibold text-slate-800">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{age}y</td>
                      <td className="px-4 py-3">
                        {child.class ? <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">{child.class.name}</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {child.guardian_primary ? `${child.guardian_primary.first_name} ${child.guardian_primary.last_name}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {lastCI ? format(new Date(lastCI), "d MMM yyyy") : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", child.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                          {child.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="font-jakarta text-sm">
                            <DropdownMenuItem className="text-red-500" onClick={() => setDeleteId(child.id)}><Trash2 className="h-4 w-4 mr-2" />Deactivate</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">{filtered.length} children</div>
          </div>
        )}
      </PageTransition>

      <RegisterChildModal open={registerOpen} onClose={() => setRegisterOpen(false)} onSuccess={() => qc.invalidateQueries({ queryKey: ["children-list"] })} />
      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Deactivate child?" description="This child will be marked inactive and won't appear in check-in. You can reactivate them later." confirmLabel="Deactivate" destructive onConfirm={() => deleteId && deactivateMutation.mutate(deleteId)} loading={deactivateMutation.isPending} />
    </>
  );
}
