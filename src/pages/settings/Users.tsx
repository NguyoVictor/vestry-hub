import { Helmet } from "react-helmet-async";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, Shield, Search, Plus, Key, Pencil, Trash2, CheckCircle2,
} from "lucide-react";

// ─── Role config ──────────────────────────────────────────────────────────────
const ROLES = [
  { value: "church_admin",      label: "Church Admin",      color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "general_overseer",  label: "General Overseer",  color: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "pastor",            label: "Pastor",            color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "staff_leader",      label: "Staff",             color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "volunteer",         label: "Volunteer",         color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "member",            label: "Member",            color: "bg-slate-100 text-slate-500 border-slate-200" },
  { value: "super_admin",       label: "Super Admin",       color: "bg-red-100 text-red-700 border-red-200" },
  { value: "guest",             label: "Guest",             color: "bg-slate-100 text-slate-400 border-slate-200" },
] as const;

type RoleValue = typeof ROLES[number]["value"];

function getRoleConfig(role: string) {
  return ROLES.find(r => r.value === role) ?? { label: role, color: "bg-slate-100 text-slate-500 border-slate-200" };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  last_login_at: string | null;
  avatar_url: string | null;
  tenant_id: string;
}

interface MemberRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface BranchRow {
  id: string;
  name: string;
}

// ─── Add User Modal ───────────────────────────────────────────────────────────
interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  branches: BranchRow[];
  tenantId: string;
  onSuccess: () => void;
}

function AddUserModal({ open, onClose, branches, tenantId, onSuccess }: AddUserModalProps) {
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
  const [role, setRole] = useState<RoleValue>("member");
  const [branchId, setBranchId] = useState<string>("");
  const [sendInvite, setSendInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch ALL members upfront — filtered client-side
  const { data: allMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["all-members-for-user-add", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.MEMBERS)
        .select("id, first_name, last_name, email")
        .eq(COLS.TENANT_ID, tenantId)
        .order(COLS.FIRST_NAME, { ascending: true })
        .limit(500);
      return (data ?? []) as MemberRow[];
    },
    staleTime: 60_000,
    enabled: open,
  });

  // Client-side filter
  const filteredMembers = useMemo(() => {
    const q = memberSearch.toLowerCase().trim();
    if (!q) return allMembers;
    return allMembers.filter(m => {
      const full = `${m.first_name ?? ""} ${m.last_name ?? ""}`.toLowerCase();
      return full.includes(q) || (m.email ?? "").toLowerCase().includes(q);
    });
  }, [allMembers, memberSearch]);

  const handleSelectMember = (m: MemberRow) => {
    setSelectedMember(m);
  };

  const handleSubmit = async () => {
    if (!selectedMember) {
      toast.error("Please select a member first.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("invite-user", {
        body: {
          memberId: selectedMember.id,
          email: selectedMember.email,
          role,
          branchId: branchId || null,
          sendInvite,
          tenantId,
        },
      });
      if (error) throw error;
      const name = `${selectedMember.first_name ?? ""} ${selectedMember.last_name ?? ""}`.trim();
      toast.success(sendInvite ? `Invitation sent to ${name}!` : `${name} added as user.`);
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to add user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setMemberSearch("");
    setSelectedMember(null);
    setRole("member");
    setBranchId("");
    setSendInvite(true);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Add User</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Select a registered member to add as a user with permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Search Member */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Search Member <span className="text-red-500">*</span>
            </Label>
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9 focus-visible:ring-orange-400"
                placeholder="Search by name or email..."
                value={memberSearch}
                onChange={e => {
                  setMemberSearch(e.target.value);
                  // Clear selection if user edits the search
                  if (selectedMember) setSelectedMember(null);
                }}
              />
            </div>
            {/* Scrollable member list — always visible */}
            <div className="rounded-md border border-slate-200 overflow-hidden">
              {membersLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  ))}
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">No members found.</div>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {filteredMembers.map(m => {
                    const isSelected = selectedMember?.id === m.id;
                    const fullName = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "—";
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMember(m)}
                        className={`w-full px-4 py-2.5 text-left transition-colors ${
                          isSelected
                            ? "bg-orange-50 border-l-2 border-l-orange-500"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <p className={`text-sm font-medium ${isSelected ? "text-orange-700" : "text-slate-800"}`}>
                          {fullName}
                        </p>
                        <p className="text-xs text-slate-400">{m.email ?? "No email"}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedMember && (
              <p className="text-xs text-orange-600 font-medium">
                ✓ Selected: {`${selectedMember.first_name ?? ""} ${selectedMember.last_name ?? ""}`.trim()}
              </p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Role <span className="text-red-500">*</span>
            </Label>
            <Select value={role} onValueChange={v => setRole(v as RoleValue)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branch Assignment */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Branch Assignment</Label>
            <div className="space-y-2 rounded-md border border-slate-200 p-3">
              {branches.length === 0 ? (
                <p className="text-xs text-slate-400">No branches found.</p>
              ) : (
                branches.map(b => (
                  <label key={b.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="branch"
                      value={b.id}
                      checked={branchId === b.id}
                      onChange={() => setBranchId(b.id)}
                      className="accent-orange-500"
                    />
                    <span className="text-sm text-slate-700">{b.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-slate-400">Leave empty to grant access to all branches.</p>
          </div>

          {/* Send Email Invitation */}
          <div className="flex items-center justify-between rounded-md border border-slate-200 p-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Send Email Invitation</p>
              <p className="text-xs text-slate-400">Send an email to invite this user to join</p>
            </div>
            <Switch
              checked={sendInvite}
              onCheckedChange={setSendInvite}
              className="data-[state=checked]:bg-orange-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleSubmit}
            disabled={submitting || !selectedMember}
          >
            {submitting ? "Sending..." : "Send Invitation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
interface EditUserModalProps {
  user: UserRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

function EditUserModal({ user, onClose, onSuccess }: EditUserModalProps) {
  const [role, setRole] = useState<string>(user?.role ?? "member");
  const [status, setStatus] = useState<string>(user?.status ?? "active");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from(TABLES.USERS)
        .update({ role, status } as never)
        .eq(COLS.ID, user.id);
      if (error) throw error;
      toast.success("User updated.");
      qc.invalidateQueries({ queryKey: ["settings-users"] });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update role and status for {user.first_name} {user.last_name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Role Permissions Overview ────────────────────────────────────────────────

const ROLE_CARDS = [
  {
    label: "Church Admin",
    desc: "Full access to all features",
    pill: "bg-orange-100 text-orange-600 border-orange-200",
  },
  {
    label: "General Overseer",
    desc: "Highest church authority",
    pill: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    label: "Senior Pastor",
    desc: "Pastoral oversight and approvals",
    pill: "bg-orange-50 text-orange-500 border-orange-100",
  },
  {
    label: "Pastor",
    desc: "Ministry management access",
    pill: "bg-purple-100 text-purple-600 border-purple-200",
  },
  {
    label: "Assistant Pastor",
    desc: "Limited pastoral access",
    pill: "bg-purple-50 text-purple-500 border-purple-100",
  },
  {
    label: "Accountant",
    desc: "Financial management access",
    pill: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    label: "Leader",
    desc: "Group and ministry leadership",
    pill: "bg-blue-50 text-blue-500 border-blue-100",
  },
  {
    label: "Studio Operator",
    desc: "EasyLive Studio production access only",
    pill: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    label: "Member",
    desc: "Basic member access",
    pill: "bg-slate-100 text-slate-500 border-slate-200",
  },
];

// Capability matrix — null = "–", true = full check, string = custom label
type CellValue = true | null | string;

interface CapabilityRow {
  capability: string;
  churchAdmin: CellValue;
  seniorPastor: CellValue;
  pastor: CellValue;
  accountant: CellValue;
  leader: CellValue;
  member: CellValue;
}

const CAPABILITIES: CapabilityRow[] = [
  { capability: "Manage Users",      churchAdmin: true,  seniorPastor: true,  pastor: null,           accountant: null,           leader: null,  member: null },
  { capability: "View Members",      churchAdmin: true,  seniorPastor: true,  pastor: true,           accountant: true,           leader: true,  member: "Limited" },
  { capability: "Record Attendance", churchAdmin: true,  seniorPastor: true,  pastor: true,           accountant: null,           leader: true,  member: null },
  { capability: "Financial Access",  churchAdmin: true,  seniorPastor: true,  pastor: "Configurable", accountant: true,           leader: null,  member: null },
  { capability: "Manage Events",     churchAdmin: true,  seniorPastor: true,  pastor: true,           accountant: null,           leader: true,  member: null },
  { capability: "Church Settings",   churchAdmin: true,  seniorPastor: true,  pastor: null,           accountant: null,           leader: null,  member: null },
];

const COMPARISON_COLS = [
  { key: "churchAdmin",  label: "Church Admin" },
  { key: "seniorPastor", label: "Senior Pastor" },
  { key: "pastor",       label: "Pastor" },
  { key: "accountant",   label: "Accountant" },
  { key: "leader",       label: "Leader" },
  { key: "member",       label: "Member" },
] as const;

function CapabilityCell({ value }: { value: CellValue }) {
  if (value === null) {
    return <span className="text-slate-300 text-base select-none">–</span>;
  }
  if (value === true) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />;
  }
  return <span className="text-xs text-slate-500 font-medium">{value}</span>;
}

function RolesOverview() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
          <Shield className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">Role Permissions Overview</h2>
          <p className="text-xs text-slate-500">Understanding what each role can access</p>
        </div>
      </div>

      {/* Role cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ROLE_CARDS.map(card => (
          <div
            key={card.label}
            className="rounded-lg border border-slate-200 bg-white p-4 space-y-2 hover:border-slate-300 transition-colors"
          >
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${card.pill}`}>
              {card.label}
            </span>
            <p className="text-sm text-slate-600">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Capabilities comparison table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Role Capabilities Comparison</h3>
        <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[160px]">
                  Capability
                </TableHead>
                {COMPARISON_COLS.map(col => (
                  <TableHead
                    key={col.key}
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-center whitespace-nowrap"
                  >
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {CAPABILITIES.map((row, i) => (
                <TableRow key={row.capability} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <TableCell className="text-sm font-medium text-slate-700">{row.capability}</TableCell>
                  {COMPARISON_COLS.map(col => (
                    <TableCell key={col.key} className="text-center">
                      <CapabilityCell value={row[col.key]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Users Page ──────────────────────────────────────────────────────────
const UsersPage = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<UserRow[]>({
    queryKey: ["settings-users", church.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select("id, first_name, last_name, email, role, status, last_login_at, avatar_url, tenant_id")
        .eq(COLS.TENANT_ID, church.tenantId)
        .order(COLS.CREATED_AT, { ascending: true });
      if (error) throw error;
      return (data ?? []) as UserRow[];
    },
    staleTime: 300_000,
  });

  // Fetch branches
  const { data: branches = [] } = useQuery<BranchRow[]>({
    queryKey: ["branches-list", church.tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.BRANCHES)
        .select("id, name")
        .eq(COLS.TENANT_ID, church.tenantId)
        .eq("is_active", true)
        .order("name");
      return (data ?? []) as BranchRow[];
    },
    staleTime: 300_000,
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke("update-user-role", {
        body: { action: "deactivate", targetUserId: userId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings-users", church.tenantId] });
      toast.success("User removed.");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to remove user."),
  });

  // Reset password
  const handleResetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
      toast.success(`Password reset email sent to ${email}.`);
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to send reset email.");
    }
  };

  // Filtered users
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  const adminCount = users.filter(u => u.role === "church_admin" || u.role === "super_admin").length;

  const formatLastLogin = (ts: string | null) => {
    if (!ts) return "Never";
    try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); }
    catch { return "Unknown"; }
  };

  const getInitials = (u: UserRow) =>
    `${u.first_name?.[0] ?? ""}${u.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <>
      <Helmet><title>Users & Permissions — Vestry</title></Helmet>

      <Tabs defaultValue="users" className="w-full">
        {/* Tab nav */}
        <TabsList className="mb-6 bg-slate-100 p-1 rounded-lg w-auto">
          <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
        </TabsList>

        {/* ── USERS TAB ── */}
        <TabsContent value="users" className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">Users &amp; Permissions</h2>
                <p className="text-xs text-slate-500">Manage user accounts and their access permissions</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {adminCount}/{users.length} Admins
              </span>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                size="sm"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search by name, email, or role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">User</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Branch(es)</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Last Login</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="space-y-1"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-36" /></div></div></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-7 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Users className="h-8 w-8" />
                        <p className="text-sm font-medium">No users found</p>
                        <p className="text-xs">
                          {search ? "Try a different search term." : "Add your first user to get started."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(user => {
                    const roleConfig = getRoleConfig(user.role);
                    const isCurrentUser = user.id === church.userId;
                    return (
                      <TableRow key={user.id} className="hover:bg-slate-50/50">
                        {/* User */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600">
                              {getInitials(user)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {user.first_name} {user.last_name}
                                {isCurrentUser && <span className="ml-1.5 text-xs text-slate-400">(you)</span>}
                              </p>
                              <p className="text-xs text-slate-400">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        {/* Role */}
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleConfig.color}`}>
                            {roleConfig.label}
                          </span>
                        </TableCell>
                        {/* Branch */}
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-slate-500">
                            {branches.length > 0 ? branches[0].name : "All branches"}
                          </span>
                        </TableCell>
                        {/* Status */}
                        <TableCell>
                          {user.status === "active" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              {user.status === "suspended" ? "Suspended" : "Inactive"}
                            </span>
                          )}
                        </TableCell>
                        {/* Last Login */}
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm text-slate-500">{formatLastLogin(user.last_login_at)}</span>
                        </TableCell>
                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {/* Reset password */}
                            <button
                              title="Reset password"
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                              onClick={() => handleResetPassword(user.email)}
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            {/* Edit */}
                            <button
                              title="Edit user"
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                              onClick={() => setEditUser(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {/* Delete */}
                            {!isCurrentUser && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    title="Delete user"
                                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove {user.first_name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will revoke their access to the church dashboard. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-500 hover:bg-red-600 text-white"
                                      onClick={() => deleteMutation.mutate(user.id)}
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── ROLES TAB ── */}
        <TabsContent value="roles">
          <RolesOverview />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        branches={branches}
        tenantId={church.tenantId}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["settings-users", church.tenantId] })}
      />
      <EditUserModal
        user={editUser}
        onClose={() => setEditUser(null)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["settings-users", church.tenantId] })}
      />
    </>
  );
};

export default UsersPage;

