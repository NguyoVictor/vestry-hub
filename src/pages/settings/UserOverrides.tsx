import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { TABLES, COLS } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle2, Plus, Search, Pencil, Trash2, ChevronDown, ShieldCheck } from "lucide-react";
import { ManagePermissionsModal, type ManageTarget } from "./ManagePermissionsModal";

// ─── Role definitions ─────────────────────────────────────────────────────────
const OVERRIDE_ROLES: { key: string; label: string; color: string }[] = [
  { key: "super_admin",       label: "Super Admin (Senior Pastor)", color: "bg-red-50 text-red-700 border-red-200" },
  { key: "church_admin",      label: "Church Admin",                color: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "branch_admin",      label: "Branch Admin",                color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "pastor",            label: "Pastor",                      color: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "assistant_pastor",  label: "Assistant Pastor",            color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { key: "department_head",   label: "Department Head",             color: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "accountant",        label: "Accountant",                  color: "bg-teal-50 text-teal-700 border-teal-200" },
  { key: "volunteer",         label: "Volunteer",                   color: "bg-slate-100 text-slate-600 border-slate-200" },
  { key: "member",            label: "Member",                      color: "bg-slate-50 text-slate-500 border-slate-200" },
];

function getRoleInfo(key: string) {
  return OVERRIDE_ROLES.find(r => r.key === key) ?? { key, label: key, color: "bg-slate-100 text-slate-500 border-slate-200" };
}

function RoleBadge({ roleKey }: { roleKey: string }) {
  const info = getRoleInfo(roleKey);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${info.color}`}>
      {info.label}
    </span>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface MemberRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface OverrideRow {
  id: string;
  member_id: string;
  role: string;
  tenant_id: string;
  members: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────
interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  existingMemberIds: Set<string>;
  editOverride?: OverrideRow | null;
  onSuccess: () => void;
}

function AddMemberModal({ open, onClose, tenantId, existingMemberIds, editOverride, onSuccess }: AddMemberModalProps) {
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const isEdit = !!editOverride;
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: members = [], isLoading } = useQuery<MemberRow[]>({
    queryKey: ["members-for-overrides", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.MEMBERS)
        .select("id, first_name, last_name, email")
        .eq(COLS.TENANT_ID, tenantId)
        .order("first_name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
    enabled: open,
    staleTime: 300_000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter(m => {
      const name = `${m.first_name ?? ""} ${m.last_name ?? ""}`.toLowerCase();
      const email = (m.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, search]);

  const handleAssign = async (member: MemberRow, roleKey: string) => {
    if (readOnly) return;
    const roleInfo = getRoleInfo(roleKey);
    setSubmitting(true);
    try {
      if (isEdit && editOverride) {
        const { error } = await supabase
          .from(TABLES.USER_ROLE_OVERRIDES)
          .update({ role: roleKey } as never)
          .eq("id", editOverride.id);
        if (error) throw error;
        toast.success(`Role updated to ${roleInfo.label}`);
      } else {
        const { error } = await supabase
          .from(TABLES.USER_ROLE_OVERRIDES)
          .insert({
            tenant_id: tenantId,
            member_id: member.id,
            role: roleKey,
          } as never);
        if (error) throw error;
        toast.success(`Member added as ${roleInfo.label}`);
      }
      qc.invalidateQueries({ queryKey: ["user-role-overrides", tenantId] });
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save override.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  // When editing, show only the member being edited
  const displayList = isEdit
    ? members.filter(m => m.id === editOverride?.member_id)
    : filtered.filter(m => !existingMemberIds.has(m.id));

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Edit Member Role" : "Add Member to Overrides"}
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a member to add to the user overrides list and assign their role.
          </p>
        </DialogHeader>

        {/* Search */}
        {!isEdit && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        )}

        {/* Member list */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 min-h-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
              <UserCircle2 className="h-7 w-7" />
              <p className="text-sm">{search ? "No members match your search." : "All members already added."}</p>
            </div>
          ) : (
            displayList.map(member => {
              const fullName = `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() || "—";
              return (
                <div key={member.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wide truncate">
                      {fullName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{member.email ?? "—"}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={submitting}
                        className="ml-3 shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-300 text-orange-600 text-xs font-medium hover:bg-orange-50 transition-colors disabled:opacity-50"
                      >
                        {isEdit
                          ? (getRoleInfo(editOverride?.role ?? "").label)
                          : "Add as..."}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 z-50">
                      {OVERRIDE_ROLES.map(role => (
                        <DropdownMenuItem
                          key={role.key}
                          onClick={() => handleAssign(member, role.key)}
                          className="text-sm cursor-pointer"
                        >
                          {role.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main UserOverrides component ─────────────────────────────────────────────
export function UserOverrides() {
  const { tenantId } = useChurch();
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOverride, setEditOverride] = useState<OverrideRow | null>(null);
  const [manageTarget, setManageTarget] = useState<ManageTarget | null>(null);

  const { data: overrides = [], isLoading } = useQuery<OverrideRow[]>({
    queryKey: ["user-role-overrides", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.USER_ROLE_OVERRIDES)
        .select("id, member_id, role, tenant_id, members(first_name, last_name, email)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OverrideRow[];
    },
    staleTime: 300_000,
  });

  // Fetch which members have custom permission overrides (for summary column)
  const { data: mpoSummary = [] } = useQuery<{ member_id: string }[]>({
    queryKey: ["mpo-summary", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.MEMBER_PERMISSION_OVERRIDES)
        .select("member_id")
        .eq("tenant_id", tenantId);
      return (data ?? []) as { member_id: string }[];
    },
    staleTime: 60_000,
  });

  const membersWithCustomPerms = useMemo(
    () => new Set(mpoSummary.map(r => r.member_id)),
    [mpoSummary]
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (readOnly) return;
      const { error } = await supabase.from(TABLES.USER_ROLE_OVERRIDES).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-role-overrides", tenantId] });
      toast.success("Override removed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const existingMemberIds = useMemo(() => new Set(overrides.map(o => o.member_id)), [overrides]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return overrides;
    return overrides.filter(o => {
      const name = `${o.members?.first_name ?? ""} ${o.members?.last_name ?? ""}`.toLowerCase();
      const email = (o.members?.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [overrides, search]);

  const getMemberName = (o: OverrideRow) =>
    `${o.members?.first_name ?? ""} ${o.members?.last_name ?? ""}`.trim() || "—";

  return (
    <div className="pt-2 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 ml-auto"
          size="sm"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <UserCircle2 className="h-8 w-8" />
            <p className="text-sm font-medium">
              {search ? "No users match your search." : "No user overrides yet. Add members to assign them specific roles."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">User</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Overrides</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(o => {
                const hasCustomPerms = membersWithCustomPerms.has(o.member_id);
                return (
                  <TableRow key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <TableCell>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                        {getMemberName(o)}
                      </p>
                      <p className="text-xs text-slate-400">{o.members?.email ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <RoleBadge roleKey={o.role} />
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${hasCustomPerms ? "text-orange-600 font-medium" : "text-slate-400"}`}>
                        {hasCustomPerms ? "Custom permissions set" : "Using defaults"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Manage button */}
                        <button
                          title="Manage permissions"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                          onClick={() => setManageTarget({
                            overrideId: o.id,
                            memberId: o.member_id,
                            memberName: getMemberName(o).toUpperCase(),
                            role: o.role,
                          })}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Manage
                        </button>
                        {/* Edit role */}
                        <button
                          title="Edit role"
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                          onClick={() => setEditOverride(o)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {/* Delete */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              title="Remove override"
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove {getMemberName(o)} from user overrides?</AlertDialogTitle>
                              <AlertDialogDescription>
                                They will revert to their default member role.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-500 hover:bg-red-600 text-white"
                                onClick={() => deleteMutation.mutate(o.id)}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add modal */}
      <AddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        tenantId={tenantId}
        existingMemberIds={existingMemberIds}
        onSuccess={() => {}}
      />

      {/* Edit role modal */}
      <AddMemberModal
        open={!!editOverride}
        onClose={() => setEditOverride(null)}
        tenantId={tenantId}
        existingMemberIds={existingMemberIds}
        editOverride={editOverride}
        onSuccess={() => {}}
      />

      {/* Manage permissions modal */}
      <ManagePermissionsModal
        open={!!manageTarget}
        onClose={() => setManageTarget(null)}
        tenantId={tenantId}
        target={manageTarget}
        onSaved={() => qc.invalidateQueries({ queryKey: ["mpo-summary", tenantId] })}
      />
    </div>
  );
}
