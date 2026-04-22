import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  Plus, Users, Clock, Award, AlertTriangle, Search, MoreHorizontal,
  Pencil, Trash2, HandHeart, Briefcase, BarChart2, Download,
} from "lucide-react";
import { TABLES, COLS } from "@/lib/schema";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function deptColor(dept: string): string {
  const colors = [
    "bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500",
    "bg-pink-500","bg-indigo-500","bg-cyan-500","bg-orange-500",
    "bg-teal-500","bg-rose-500","bg-lime-500","bg-purple-500",
  ];
  if (!dept) return colors[0];
  let hash = 0;
  for (let i = 0; i < dept.length; i++) hash = dept.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Role Form Dialog ─────────────────────────────────────────────────────────
const emptyRoleForm = {
  name: "", department: "", description: "",
  min_volunteers: 1, max_volunteers: 10,
  requirements: "", time_commitment: "",
};

function RoleFormDialog({ open, onClose, onSave, initial, isPending }: {
  open: boolean; onClose: () => void;
  onSave: (form: typeof emptyRoleForm) => void;
  initial?: any; isPending: boolean;
}) {
  const [form, setForm] = useState(initial ? {
    name: initial.name || "", department: initial.department || "",
    description: initial.description || "", min_volunteers: initial.min_volunteers ?? 1,
    max_volunteers: initial.max_volunteers ?? 10,
    requirements: initial.requirements || "", time_commitment: initial.time_commitment || "",
  } : { ...emptyRoleForm });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Volunteer Role" : "Create Volunteer Role"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Role Name *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Usher, Worship Team, Sound Technician" />
          </div>
          <div>
            <Label>Department</Label>
            <Input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
              placeholder="e.g., Hospitality, Music, Technical" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe the role and responsibilities..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Min Volunteers</Label>
              <Input type="number" min={0} value={form.min_volunteers}
                onChange={e => setForm(p => ({ ...p, min_volunteers: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Max Volunteers</Label>
              <Input type="number" min={1} value={form.max_volunteers}
                onChange={e => setForm(p => ({ ...p, max_volunteers: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <Label>Time Commitment</Label>
            <Input value={form.time_commitment} onChange={e => setForm(p => ({ ...p, time_commitment: e.target.value }))}
              placeholder="e.g., Every Sunday 8AM–12PM" />
          </div>
          <div>
            <Label>Requirements (optional)</Label>
            <Textarea value={form.requirements} onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))}
              placeholder="Any specific requirements or skills needed..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.name.trim() || isPending} onClick={() => onSave(form)}
            className="bg-orange-500 hover:bg-orange-600 text-white">
            {isPending ? "Saving..." : initial ? "Save Changes" : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Log Hours Dialog ─────────────────────────────────────────────────────────
function LogHoursDialog({ open, onClose, volunteer, onSave, isPending }: {
  open: boolean; onClose: () => void;
  volunteer: any; onSave: (data: any) => void; isPending: boolean;
}) {
  const [form, setForm] = useState({
    hours: 1, logged_date: format(new Date(), "yyyy-MM-dd"), activity_description: "",
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log Hours</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-500 -mt-2">{volunteer?.memberName}</p>
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.logged_date}
              onChange={e => setForm(p => ({ ...p, logged_date: e.target.value }))} />
          </div>
          <div>
            <Label>Hours</Label>
            <Input type="number" min={0.5} step={0.5} value={form.hours}
              onChange={e => setForm(p => ({ ...p, hours: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Activity</Label>
            <Input value={form.activity_description}
              onChange={e => setForm(p => ({ ...p, activity_description: e.target.value }))}
              placeholder="e.g., Sunday service ushering" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={isPending} onClick={() => onSave({ ...form, volunteer })}
            className="bg-orange-500 hover:bg-orange-600 text-white">
            {isPending ? "Saving..." : "Save Hours"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────
function RolesTab({ roles, assignments, memberRecords, tenantId, queryClient }: any) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assignRoleId, setAssignRoleId] = useState<string | null>(null);

  const departments = useMemo(() => {
    const depts = [...new Set((roles || []).map((r: any) => r.department).filter(Boolean))];
    return depts as string[];
  }, [roles]);

  const filtered = useMemo(() => {
    return (roles || []).filter((r: any) => {
      const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.department || "").toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === "all" || r.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [roles, search, deptFilter]);

  const createMutation = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from(TABLES.VOLUNTEER_ROLES).insert({
        tenant_id: tenantId, name: form.name, department: form.department || null,
        description: form.description || null, min_volunteers: form.min_volunteers,
        max_volunteers: form.max_volunteers, requirements: form.requirements || null,
        time_commitment: form.time_commitment || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [TABLES.VOLUNTEER_ROLES, tenantId] }); toast.success("Role created"); setCreateOpen(false); },
    onError: () => toast.error("Failed to create role"),
  });

  const editMutation = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from(TABLES.VOLUNTEER_ROLES).update({
        name: form.name, department: form.department || null, description: form.description || null,
        min_volunteers: form.min_volunteers, max_volunteers: form.max_volunteers,
        requirements: form.requirements || null, time_commitment: form.time_commitment || null,
      } as any).eq("id", editRole.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [TABLES.VOLUNTEER_ROLES, tenantId] }); toast.success("Role updated"); setEditRole(null); },
    onError: () => toast.error("Failed to update role"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.VOLUNTEER_ROLES).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [TABLES.VOLUNTEER_ROLES, tenantId] }); toast.success("Role deleted"); setDeleteId(null); },
    onError: () => toast.error("Failed to delete role"),
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search roles..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-600">No volunteer roles yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first role to start building your volunteer teams</p>
            <Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Create Role
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((role: any) => {
            const roleAssignments = (assignments || []).filter((a: any) => a.role_id === role.id && a.status !== "inactive");
            const count = roleAssignments.length;
            const max = role.max_volunteers || 0;
            const min = role.min_volunteers || 0;
            const fillPct = max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0;
            const isFull = max > 0 && count >= max;
            const needsMore = min > 0 && count < min;
            const color = deptColor(role.department || "");
            const avatarMembers = roleAssignments.slice(0, 5).map((a: any) => {
              const m = memberRecords?.find((mr: any) => mr.id === a.member_id);
              return m ? `${m.first_name || ""} ${m.last_name || ""}`.trim() : "?";
            });

            return (
              <Card key={role.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Color banner */}
                <div className={cn("h-2 w-full", color)} />
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{role.name}</h3>
                      {role.department && (
                        <Badge variant="secondary" className="text-xs mt-1">{role.department}</Badge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditRole(role)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />Edit Role
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(role.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" />Delete Role
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {role.description && (
                    <p className="text-sm text-slate-500 line-clamp-2">{role.description}</p>
                  )}

                  {/* Fill rate */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{count} / {max || "∞"} volunteers</span>
                      <div className="flex gap-1">
                        {isFull && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Full</Badge>}
                        {needsMore && !isFull && <Badge className="bg-orange-100 text-orange-700 text-[10px]">Needs Volunteers</Badge>}
                      </div>
                    </div>
                    {max > 0 && (
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", isFull ? "bg-emerald-500" : "bg-orange-500")}
                          style={{ width: `${fillPct}%` }} />
                      </div>
                    )}
                  </div>

                  {/* Avatars */}
                  {avatarMembers.length > 0 && (
                    <div className="flex items-center gap-1">
                      {avatarMembers.map((name: string, i: number) => (
                        <div key={i} className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center text-[9px] font-bold text-orange-600 border border-white -ml-1 first:ml-0">
                          {getInitials(name)}
                        </div>
                      ))}
                      {count > 5 && (
                        <span className="text-xs text-slate-400 ml-1">+{count - 5} more</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 text-xs">View Volunteers</Button>
                    <Button size="sm" className="flex-1 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={() => setAssignRoleId(role.id)}>
                      Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {createOpen && (
        <RoleFormDialog open={createOpen} onClose={() => setCreateOpen(false)}
          onSave={form => createMutation.mutate(form)} isPending={createMutation.isPending} />
      )}
      {editRole && (
        <RoleFormDialog open={!!editRole} onClose={() => setEditRole(null)}
          onSave={form => editMutation.mutate(form)} initial={editRole} isPending={editMutation.isPending} />
      )}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this role?</AlertDialogTitle>
            <AlertDialogDescription>All volunteer assignments for this role will be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Volunteers Tab ───────────────────────────────────────────────────────────
function VolunteersTab({ assignments, roles, memberRecords, tenantId, queryClient, userId }: any) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [logHoursFor, setLogHoursFor] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getMemberInfo = (memberId: string) => {
    const m = memberRecords?.find((mr: any) => mr.id === memberId);
    if (m) return { name: `${m.first_name || ""} ${m.last_name || ""}`.trim(), email: m.email || "", avatarUrl: m.avatar_url };
    return { name: "Unknown", email: "", avatarUrl: null };
  };

  const filtered = useMemo(() => {
    return (assignments || []).filter((a: any) => {
      const { name } = getMemberInfo(a.member_id);
      const role = roles?.find((r: any) => r.id === a.role_id);
      const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) ||
        (role?.name || "").toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || a.role_id === roleFilter;
      const matchStatus = statusFilter === "all" || (a.status || "confirmed") === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [assignments, search, roleFilter, statusFilter, memberRecords, roles]);

  const logHoursMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("volunteer_hours" as any).insert({
        tenant_id: tenantId,
        assignment_id: data.volunteer.id,
        volunteer_member_id: data.volunteer.member_id,
        role_id: data.volunteer.role_id,
        hours: data.hours,
        activity_description: data.activity_description || null,
        logged_date: data.logged_date,
        logged_by: userId || null,
      });
      if (error) throw error;
      // Update hours_served on the assignment
      await supabase.from(TABLES.VOLUNTEERS).update({
        hours_served: (data.volunteer.hours_served || 0) + Number(data.hours),
      } as any).eq("id", data.volunteer.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLES.VOLUNTEERS, tenantId] });
      toast.success("Hours logged");
      setLogHoursFor(null);
    },
    onError: () => toast.error("Failed to log hours"),
  });

  const markInactiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.VOLUNTEERS).update({ status: "inactive" } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [TABLES.VOLUNTEERS, tenantId] }); toast.success("Marked inactive"); },
    onError: () => toast.error("Failed to update"),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.VOLUNTEERS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [TABLES.VOLUNTEERS, tenantId] }); toast.success("Volunteer removed"); setDeleteId(null); },
    onError: () => toast.error("Failed to remove"),
  });

  const statusColors: Record<string, string> = {
    confirmed: "bg-emerald-100 text-emerald-700",
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-slate-100 text-slate-500",
    on_leave: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search volunteers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {(roles || []).map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                {["Volunteer","Role","Department","Status","Hours","Joined",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No volunteers found.</td></tr>
              ) : filtered.map((a: any) => {
                const { name, email, avatarUrl } = getMemberInfo(a.member_id);
                const role = roles?.find((r: any) => r.id === a.role_id);
                const status = a.status || "confirmed";
                return (
                  <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <MemberAvatar name={name} avatarUrl={avatarUrl} size="sm" />
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">{name}</p>
                          {email && <p className="text-xs text-slate-400">{email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="text-xs">{role?.name || "—"}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">{role?.department || "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusColors[status] || statusColors.confirmed)}>
                        {status === "confirmed" ? "Active" : status === "on_leave" ? "On Leave" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">{a.hours_served || 0}h</td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs">
                      {a.created_at ? format(new Date(a.created_at), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLogHoursFor({ ...a, memberName: name })}>
                            <Clock className="h-3.5 w-3.5 mr-2" />Log Hours
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => markInactiveMutation.mutate(a.id)}>
                            Mark Inactive
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(a.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" />Remove
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
      </Card>

      {logHoursFor && (
        <LogHoursDialog open={!!logHoursFor} onClose={() => setLogHoursFor(null)}
          volunteer={logHoursFor} onSave={data => logHoursMutation.mutate(data)} isPending={logHoursMutation.isPending} />
      )}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this volunteer?</AlertDialogTitle>
            <AlertDialogDescription>This will remove them from the assignment.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && removeMutation.mutate(deleteId)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────
function ReportsTab({ assignments, roles, memberRecords }: any) {
  const [period, setPeriod] = useState<"month" | "3months" | "year">("month");

  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === "month") return startOfMonth(now);
    if (period === "3months") return startOfMonth(subMonths(now, 2));
    return new Date(now.getFullYear(), 0, 1);
  }, [period]);

  const getMemberName = (id: string) => {
    const m = memberRecords?.find((mr: any) => mr.id === id);
    return m ? `${m.first_name || ""} ${m.last_name || ""}`.trim() : "Unknown";
  };

  const periodAssignments = useMemo(() => {
    return (assignments || []).filter((a: any) => {
      const d = new Date(a.created_at || 0);
      return d >= periodStart;
    });
  }, [assignments, periodStart]);

  const totalHours = (assignments || []).reduce((s: number, a: any) => s + (Number(a.hours_served) || 0), 0);

  // Hours per volunteer
  const hoursPerVolunteer = useMemo(() => {
    const map: Record<string, number> = {};
    (assignments || []).forEach((a: any) => {
      map[a.member_id] = (map[a.member_id] || 0) + (Number(a.hours_served) || 0);
    });
    return Object.entries(map)
      .map(([id, hours]) => ({ name: getMemberName(id), hours }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }, [assignments, memberRecords]);

  const mostActive = hoursPerVolunteer[0];

  // Volunteers per role
  const volunteersPerRole = useMemo(() => {
    return (roles || []).map((r: any) => ({
      name: r.name,
      count: (assignments || []).filter((a: any) => a.role_id === r.id).length,
    })).sort((a: any, b: any) => b.count - a.count);
  }, [roles, assignments]);

  const mostPopularRole = volunteersPerRole[0];
  const avgHours = hoursPerVolunteer.length
    ? (hoursPerVolunteer.reduce((s, v) => s + v.hours, 0) / hoursPerVolunteer.length).toFixed(1)
    : "0";

  const exportCSV = () => {
    const rows = (assignments || []).map((a: any) => {
      const role = roles?.find((r: any) => r.id === a.role_id);
      return [getMemberName(a.member_id), role?.name || "", role?.department || "", a.status || "", a.hours_served || 0, a.created_at ? format(new Date(a.created_at), "yyyy-MM-dd") : ""];
    });
    const csv = [["Name","Role","Department","Status","Hours","Joined"], ...rows]
      .map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "volunteers.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["month","3months","year"] as const).map(p => (
            <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
              {p === "month" ? "This Month" : p === "3months" ? "Last 3 Months" : "This Year"}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1.5" />Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Hours", value: `${totalHours}h` },
          { label: "Most Active", value: mostActive?.name || "—", sub: mostActive ? `${mostActive.hours}h` : "" },
          { label: "Most Popular Role", value: mostPopularRole?.name || "—", sub: mostPopularRole ? `${mostPopularRole.count} volunteers` : "" },
          { label: "Avg Hours / Volunteer", value: `${avgHours}h` },
        ].map(({ label, value, sub }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{value}</p>
              {sub && <p className="text-xs text-slate-400">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm font-semibold text-slate-700 dark:text-white mb-4">Hours Per Volunteer (Top 10)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hoursPerVolunteer} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                <Tooltip />
                <Bar dataKey="hours" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-sm font-semibold text-slate-700 dark:text-white mb-4">Volunteers Per Role</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volunteersPerRole}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top volunteers table */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm font-semibold text-slate-700 dark:text-white mb-4">Top Volunteers</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["#","Name","Role","Hours","Joined"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hoursPerVolunteer.map((v, i) => {
                const assignment = (assignments || []).find((a: any) => getMemberName(a.member_id) === v.name);
                const role = roles?.find((r: any) => r.id === assignment?.role_id);
                return (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 text-slate-400 font-medium">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-white">{v.name}</td>
                    <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{role?.name || "—"}</Badge></td>
                    <td className="px-3 py-2.5 font-semibold text-orange-500">{v.hours}h</td>
                    <td className="px-3 py-2.5 text-slate-400 text-xs">
                      {assignment?.created_at ? format(new Date(assignment.created_at), "dd MMM yyyy") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VolunteeringPage() {
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"roles" | "volunteers" | "reports">("roles");
  const [assignSheetOpen, setAssignSheetOpen] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    member_id: "", role_id: "", reference_type: "service", reference_id: "", notes: "", start_date: "",
  });

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: [TABLES.VOLUNTEER_ROLES, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.VOLUNTEER_ROLES).select("*").eq(COLS.TENANT_ID, tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    staleTime: 300_000,
  });

  const { data: assignments = [], isLoading: assignLoading } = useQuery({
    queryKey: [TABLES.VOLUNTEERS, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.VOLUNTEERS).select("*").eq(COLS.TENANT_ID, tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    staleTime: 300_000,
  });

  const { data: memberRecords = [] } = useQuery({
    queryKey: ["members-for-volunteers", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, first_name, last_name, avatar_url, email").eq("tenant_id", tenantId);
      return data || [];
    },
    staleTime: 300_000,
  });

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const activeVolunteers = new Set(assignments.filter((a: any) => a.status !== "inactive").map((a: any) => a.member_id)).size;
  const totalHours = assignments.reduce((s: number, a: any) => s + (Number(a.hours_served) || 0), 0);
  const rolesNeedingVolunteers = roles.filter((r: any) => {
    const count = assignments.filter((a: any) => a.role_id === r.id && a.status !== "inactive").length;
    return r.min_volunteers > 0 && count < r.min_volunteers;
  }).length;

  // ── Assign mutation ───────────────────────────────────────────────────────────
  const assignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(TABLES.VOLUNTEERS).insert({
        tenant_id: tenantId, member_id: assignForm.member_id, role_id: assignForm.role_id || null,
        reference_type: assignForm.reference_type, reference_id: assignForm.reference_id || null,
        notes: assignForm.notes, start_date: assignForm.start_date || null, status: "confirmed",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLES.VOLUNTEERS, tenantId] });
      toast.success("Volunteer assigned");
      setAssignSheetOpen(false);
      setAssignForm({ member_id: "", role_id: "", reference_type: "service", reference_id: "", notes: "", start_date: "" });
    },
    onError: () => toast.error("Failed to assign volunteer"),
  });

  const createRoleMutation = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from(TABLES.VOLUNTEER_ROLES).insert({
        tenant_id: tenantId, name: form.name, department: form.department || null,
        description: form.description || null, min_volunteers: form.min_volunteers,
        max_volunteers: form.max_volunteers, requirements: form.requirements || null,
        time_commitment: form.time_commitment || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLES.VOLUNTEER_ROLES, tenantId] });
      toast.success("Role created");
      setCreateRoleOpen(false);
    },
    onError: () => toast.error("Failed to create role"),
  });

  const tabs = [
    { key: "roles", label: "Roles" },
    { key: "volunteers", label: "Volunteers" },
    { key: "reports", label: "Reports" },
  ] as const;

  return (
    <>
      <Helmet><title>Volunteering — Vestry</title></Helmet>
      <PageHeader
        title="Volunteering"
        subtitle="Coordinate and manage your church volunteer teams"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCreateRoleOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Create Role
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setAssignSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Assign Volunteer
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Volunteers", value: activeVolunteers, icon: Users, color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
          { label: "Total Hours Served", value: `${totalHours}h`, icon: Clock, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Volunteer Roles", value: roles.length, icon: Award, color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
          { label: "Roles Needing Volunteers", value: rolesNeedingVolunteers, icon: AlertTriangle, color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", color)}><Icon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit mb-5">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === t.key
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {rolesLoading || assignLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : (
        <>
          {activeTab === "roles" && (
            <RolesTab roles={roles} assignments={assignments} memberRecords={memberRecords}
              tenantId={tenantId} queryClient={queryClient} />
          )}
          {activeTab === "volunteers" && (
            <VolunteersTab roles={roles} assignments={assignments} memberRecords={memberRecords}
              tenantId={tenantId} queryClient={queryClient} userId={userId} />
          )}
          {activeTab === "reports" && (
            <ReportsTab roles={roles} assignments={assignments} memberRecords={memberRecords} />
          )}
        </>
      )}

      {/* Create Role (from header button) */}
      {createRoleOpen && (
        <RoleFormDialog open={createRoleOpen} onClose={() => setCreateRoleOpen(false)}
          onSave={form => createRoleMutation.mutate(form)} isPending={createRoleMutation.isPending} />
      )}

      {/* Assign Volunteer Sheet */}
      <Sheet open={assignSheetOpen} onOpenChange={setAssignSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Assign Volunteer</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Volunteer *</Label>
              <Select value={assignForm.member_id} onValueChange={v => setAssignForm(p => ({ ...p, member_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {memberRecords.filter((m: any) => m.first_name).map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={assignForm.role_id} onValueChange={v => setAssignForm(p => ({ ...p, role_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign To</Label>
              <Select value={assignForm.reference_type} onValueChange={v => setAssignForm(p => ({ ...p, reference_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={assignForm.start_date} onChange={e => setAssignForm(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={assignForm.notes} onChange={e => setAssignForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => assignMutation.mutate()} disabled={!assignForm.member_id || assignMutation.isPending}>
              {assignMutation.isPending ? "Assigning..." : "Assign Volunteer"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
