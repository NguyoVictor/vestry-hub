import { Helmet } from "react-helmet-async";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { useSubscription } from "@/hooks/useSubscription";
import { showPaywallToast } from "@/components/PaywallToast";
import { TABLES, COLS } from "@/lib/schema";
import { toast } from "sonner";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
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
  Users, Shield, Search, Plus, Key, Pencil, Trash2, CheckCircle2, Send,
} from "lucide-react";

// ─── Role config ──────────────────────────────────────────────────────────────
const ROLES = [
  { value: "church_admin",      label: "Church Admin",      color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "general_overseer",  label: "General Overseer",  color: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "senior_pastor",     label: "Senior Pastor",     color: "bg-orange-50 text-orange-500 border-orange-100" },
  { value: "pastor",            label: "Pastor",            color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "assistant_pastor",  label: "Assistant Pastor",  color: "bg-purple-50 text-purple-500 border-purple-100" },
  { value: "accountant",        label: "Accountant",        color: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "leader",            label: "Leader",            color: "bg-blue-50 text-blue-500 border-blue-100" },
  { value: "studio_operator",   label: "Studio Operator",   color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  { value: "member",            label: "Member",            color: "bg-slate-100 text-slate-500 border-slate-200" },
  { value: "staff",             label: "Staff",             color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "volunteer",         label: "Volunteer",         color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "guest",             label: "Guest",             color: "bg-slate-100 text-slate-400 border-slate-200" },
] as const;

type RoleValue = typeof ROLES[number]["value"];

function getRoleConfig(role: string) {
  // Display super_admin as "Church Admin" to church users
  if (role === "super_admin") {
    return { label: "Super Admin", color: "bg-purple-100 text-purple-700 border-purple-200" };
  }
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
  invitation_sent: boolean | null;
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
  const church = useChurch();
  const { canAddStaff, usage, limits } = useSubscription();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
  const [role, setRole] = useState<string>("member");
  const [branchId, setBranchId] = useState<string>("");
  const [sendInvite, setSendInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteByEmail, setInviteByEmail] = useState(false);
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const formatRole = (r: string) =>
    r.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

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

  const { data: customRoles = [] } = useQuery({
    queryKey: ['custom-roles', church.tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('custom_roles')
        .select('name')
        .eq('tenant_id', church.tenantId)
        .eq('is_active', true)
        .order('name');
      return data ?? [];
    },
    enabled: !!church.tenantId,
    staleTime: 60_000,
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
    if (readOnly) return;
    if (inviteByEmail) {
      if (!inviteFirstName.trim() || !inviteEmail.trim()) {
        toast.error("First name and email are required.");
        setSubmitting(false);
        return;
      }
      if (!role) {
        toast.error("Please select a role.");
        setSubmitting(false);
        return;
      }

      setSubmitting(true);
      try {
        const { data, error } = await supabase.functions.invoke("send-invitation", {
          body: {
            email: inviteEmail.trim(),
            role,
            church_name: church.name,
            invited_by: church.userName || `${church.userFirstName} ${church.userLastName}`,
            tenant_id: tenantId,
            first_name: inviteFirstName.trim(),
            last_name: inviteLastName.trim() || "",
          },
        });

        if (error || data?.error) {
          throw new Error(data?.error ?? error?.message ?? "Failed to send invitation.");
        }

        if (data?.already_registered) {
          toast.success(`${inviteFirstName} already has a VestryHub account. They've been added as ${formatRole(role)} and can log in with existing credentials.`);
        } else {
          toast.success(`Invitation sent to ${inviteEmail}.`);
        }

        onSuccess();
        handleClose();
        return;
      } catch (err: unknown) {
        toast.error((err as Error)?.message ?? "Failed to send invitation.");
        setSubmitting(false);
        return;
      }
    }

    if (!selectedMember) {
      toast.error("Please select a member first.");
      return;
    }
    
    // Check staff limit for non-member roles
    if (role !== 'member' && !canAddStaff) {
      showPaywallToast('staff', 'staff accounts');
      return;
    }

    setSubmitting(true);
    try {
      if (sendInvite) {
        // Send Email Invitation ON - call send-invitation edge function
        if (!selectedMember.email) {
          toast.error("This member has no email address on file.");
          setSubmitting(false);
          return;
        }

        // Check 1 (was Check 2): active + same role → block FIRST
        const { data: existingByEmail } = await supabase
          .from('users')
          .select('id, role, status')
          .eq('email', selectedMember.email)
          .eq('tenant_id', tenantId)
          .eq('role', role)
          .eq('status', 'active')
          .maybeSingle();

        if (existingByEmail) {
          toast.error(`${selectedMember.first_name} is already a ${formatRole(role)}.`);
          setSubmitting(false);
          return;
        }

        // Check 2 (was Check 1): inactive record → reactivate SECOND
        const { data: inactiveRecords } = await supabase
          .from('users')
          .select('id, role, status')
          .eq('email', selectedMember.email)
          .eq('tenant_id', tenantId)
          .eq('status', 'inactive')
          .limit(1);

        const existingInactive = inactiveRecords?.[0] ?? null;

        if (existingInactive) {
          const { data: reactivateData, error: reactivateError } = await supabase.functions.invoke(
            "update-user-role",
            { body: { action: "reactivate", targetUserId: existingInactive.id, role } }
          );
          if (reactivateError || reactivateData?.error) {
            throw new Error(reactivateData?.error ?? reactivateError?.message ?? "Failed to restore access.");
          }
          toast.success(
            existingInactive.role === role
              ? `${selectedMember.first_name}'s access has been restored as ${formatRole(role)}.`
              : `${selectedMember.first_name} has been added as ${formatRole(role)}.`
          );
          onSuccess();
          handleClose();
          return;
        }

        // Check 3: any active record exists → has credentials, add role directly, no email
        const { data: anyActiveRecords } = await supabase
          .from('users')
          .select('id')
          .eq('email', selectedMember.email)
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .limit(1);

        if (anyActiveRecords && anyActiveRecords.length > 0) {
          const newUserId = crypto.randomUUID();
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: newUserId,
              tenant_id: tenantId,
              email: selectedMember.email,
              first_name: selectedMember.first_name,
              last_name: selectedMember.last_name,
              role,
              status: 'active',
              invitation_sent: true,
            });
          if (insertError) throw insertError;
          await supabase.functions.invoke('create-staff-thread', {
            body: {
              userId: newUserId,
              tenantId,
              firstName: selectedMember.first_name,
              lastName: selectedMember.last_name,
            },
          });
          toast.success(`${selectedMember.first_name} has been added as ${formatRole(role)}.`);
          onSuccess();
          handleClose();
          return;
        }
        // Active + different role → allow invitation for second role

        // Brand new person — send invitation email
        const { data, error } = await supabase.functions.invoke("send-invitation", {
          body: {
            email: selectedMember.email,
            role,
            church_name: church.name,
            invited_by: church.userName || `${church.userFirstName} ${church.userLastName}`,
            tenant_id: tenantId,
          },
        });

        if (error || data?.error) {
          throw new Error(data?.error ?? error?.message ?? "Failed to send invitation.");
        }

        if (data?.already_registered) {
          toast.success(`${selectedMember.first_name} already has a VestryHub account. They've been added as ${formatRole(role)} and can log in with existing credentials.`);
        } else {
          toast.success("Invitation sent successfully.");
        }
      } else {
        // Check if record exists by member ID
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, role, status')
          .eq('id', selectedMember.id)
          .maybeSingle();

        // Check by email+role to catch same role across different IDs
        if (selectedMember.email) {
          const { data: existingByEmailAndRole } = await supabase
            .from('users')
            .select('id, role, status')
            .eq('email', selectedMember.email)
            .eq('tenant_id', tenantId)
            .eq('role', role)
            .eq('status', 'active')
            .maybeSingle();

          if (existingByEmailAndRole) {
            toast.error(`${selectedMember.first_name} is already a ${formatRole(role)}.`);
            setSubmitting(false);
            return;
          }
        }

        if (existingUser) {
          if (existingUser.status === 'inactive') {
            // Reactivate existing record
            const { data: reactivateData, error: reactivateError } = await supabase.functions.invoke(
              "update-user-role",
              { body: { action: "reactivate", targetUserId: selectedMember.id, role } }
            );
            if (reactivateError || reactivateData?.error) {
              throw new Error(reactivateData?.error ?? reactivateError?.message ?? "Failed to restore access.");
            }
            toast.success(
              existingUser.role === role
                ? `${selectedMember.first_name}'s access has been restored as ${formatRole(role)}.`
                : `${selectedMember.first_name} has been added as ${formatRole(role)}.`
            );
            onSuccess();
            handleClose();
            return;
          } else if (existingUser.role === role) {
            // Active + same role → block
            toast.error(`${selectedMember.first_name} is already a ${formatRole(role)}.`);
            setSubmitting(false);
            return;
          }
          // Active + different role → insert with new UUID
          const newUserId = crypto.randomUUID();
          const { error } = await supabase
            .from('users')
            .insert({
              id: newUserId,
              tenant_id: tenantId,
              email: selectedMember.email,
              first_name: selectedMember.first_name,
              last_name: selectedMember.last_name,
              role,
              status: 'active',
              invitation_sent: true,
            });
          if (!error) {
            await supabase.functions.invoke('create-staff-thread', {
              body: {
                userId: newUserId,
                tenantId,
                firstName: selectedMember.first_name,
                lastName: selectedMember.last_name,
              },
            });
          }
          if (error) throw error;
          toast.success("User added. Send them an invitation when ready.");
        } else {
          // No existing record → insert normally
          const { error } = await supabase
            .from('users')
            .insert({
              id: selectedMember.id,
              tenant_id: tenantId,
              email: selectedMember.email,
              first_name: selectedMember.first_name,
              last_name: selectedMember.last_name,
              role,
              status: 'active',
              invitation_sent: false,
            });
          if (!error) {
            await supabase.functions.invoke('create-staff-thread', {
              body: {
                userId: selectedMember.id,
                tenantId,
                firstName: selectedMember.first_name,
                lastName: selectedMember.last_name,
              },
            });
          }
          if (error) throw error;
          toast.success("User added. Send them an invitation when ready.");
        }
      }

      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const message = (err as Error)?.message ?? '';
      if (message.includes('duplicate key') || message.includes('unique constraint')) {
        toast.error(`${selectedMember?.first_name ?? 'This user'} already has admin access.`);
      } else if (message.includes('not found') || message.includes('404')) {
        toast.error('Invitation service unavailable. Please try again.');
      } else {
        toast.error(message || 'Failed to add user. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setMemberSearch("");
    setSelectedMember(null);
    setRole("member");
    setBranchId("");
    setInviteByEmail(false);
    setInviteFirstName("");
    setInviteLastName("");
    setInviteEmail("");
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
          {!inviteByEmail ? (
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
              <button
                type="button"
                className="text-xs text-violet-600 hover:text-violet-700 underline underline-offset-2 mt-1"
                onClick={() => {
                  setInviteByEmail(true);
                  setSelectedMember(null);
                  setMemberSearch("");
                  setSendInvite(true);
                }}
              >
                Not in the system? Invite by email instead →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Invite by Email</Label>
                <button
                  type="button"
                  className="text-xs text-violet-600 hover:text-violet-700 underline underline-offset-2"
                  onClick={() => {
                    setInviteByEmail(false);
                    setInviteFirstName("");
                    setInviteLastName("");
                    setInviteEmail("");
                    setSendInvite(true);
                  }}
                >
                  ← Back to member search
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="First name"
                    value={inviteFirstName}
                    onChange={e => setInviteFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Last Name</Label>
                  <Input
                    placeholder="Last name"
                    value={inviteLastName}
                    onChange={e => setInviteLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  placeholder="their@email.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Role */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Role <span className="text-red-500">*</span>
            </Label>
            <Select value={role} onValueChange={v => setRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
                {customRoles.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide border-t border-slate-100 mt-1 pt-2">
                      Custom
                    </div>
                    {customRoles.map(r => (
                      <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </>
                )}
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
          {!inviteByEmail && (
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
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleSubmit}
            disabled={submitting || (!inviteByEmail && !selectedMember)}
          >
            {submitting ? (sendInvite ? "Sending..." : "Adding...") : (sendInvite ? "Send Invitation" : "Add User")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Modal (full version) ──────────────────────────────────────────
const EDIT_ROLES = [
  { value: "church_admin", label: "Church Admin" },
  { value: "general_overseer", label: "General Overseer" },
  { value: "senior_pastor", label: "Senior Pastor" },
  { value: "pastor", label: "Pastor" },
  { value: "assistant_pastor", label: "Assistant Pastor" },
  { value: "accountant", label: "Accountant" },
  { value: "leader", label: "Leader" },
  { value: "studio_operator", label: "Studio Operator" },
  { value: "member", label: "Member" },
  { value: "staff", label: "Staff" },
  { value: "volunteer", label: "Volunteer" },
  { value: "guest", label: "Guest" },
] as const;

interface EditUserModalProps {
  user: UserRow | null;
  branches: BranchRow[];
  onClose: () => void;
  onSuccess: () => void;
}

function EditUserModal({ user, branches, onClose, onSuccess }: EditUserModalProps) {
  const qc = useQueryClient();
  const church = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const [role, setRole] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: customRolesEdit = [] } = useQuery({
    queryKey: ['custom-roles', church.tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('custom_roles')
        .select('name')
        .eq('tenant_id', church.tenantId)
        .eq('is_active', true)
        .order('name');
      return data ?? [];
    },
    enabled: !!church.tenantId,
    staleTime: 60_000,
  });

  // Sync state when user changes
  useEffect(() => {
    if (user) {
      // Map stored role value to edit role
      const matchedRole = EDIT_ROLES.find(r => r.value === user.role);
      setRole(matchedRole?.value ?? user.role);
      setIsActive(user.status === "active");
    }
  }, [user]);

  if (!user) return null;

  const handleSave = async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      const finalRole = role;
      if (!finalRole) { toast.error("Please specify a role."); setSaving(false); return; }

      const { data, error } = await supabase.functions.invoke("update-user-role", {
        body: {
          action: "update_role",
          targetUserId: user.id,
          role: finalRole,
          status: isActive ? "active" : "inactive",
        }
      });

      if (error || data?.error) {
        throw new Error(data?.error ?? error?.message ?? "Failed to update user.");
      }

      toast.success("User updated successfully.");
      qc.invalidateQueries({ queryKey: ["settings-users", church.tenantId] });
      qc.invalidateQueries({ queryKey: ["staff-count", church.tenantId] });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email;
  const currentBranch = branches.find(b => b.id === branchId);

  return (
    <Dialog open={!!user} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Edit User</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Identity (read-only) */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">{displayName}</p>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Role</Label>
            <Select value={role} onValueChange={v => setRole(v)}>
              <SelectTrigger className="focus:ring-orange-400"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EDIT_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                {customRolesEdit.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide border-t border-slate-100 mt-1 pt-2">
                      Custom
                    </div>
                    {customRolesEdit.map(r => (
                      <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Branch Assignment */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Branch Assignment</Label>
            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              {branches.length === 0 ? (
                <p className="text-xs text-slate-400">No branches configured.</p>
              ) : (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="edit-branch" value="" checked={!branchId} onChange={() => setBranchId("")} className="accent-orange-500" />
                    <span className="text-sm text-slate-600">All branches</span>
                  </label>
                  {branches.map(b => (
                    <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="edit-branch" value={b.id} checked={branchId === b.id} onChange={() => setBranchId(b.id)} className="accent-orange-500" />
                      <span className="text-sm text-slate-700">{b.name}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Account Status */}
          <div className="rounded-lg border border-slate-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Account Status</p>
              <p className="text-xs text-slate-500">User can access the system</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-orange-500" />
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

// ─── Fine-Tune Permissions Modal ──────────────────────────────────────────────
type PermLevel = "default" | "read_only" | "full_access";

const PERM_CATEGORIES = [
  { key: "member_management",   label: "Member Management",   desc: "Controls member profiles, families, visitors, children's ministry and follow-up records. Also applies to Groups & Ministries." },
  { key: "financial_records",   label: "Financial Records",   desc: "Controls giving records, expenses, budgets, payroll, invoices, fund accounting, general ledger and payouts." },
  { key: "event_management",    label: "Event Management",    desc: "Controls events, services, volunteering roles, facility bookings, member requests and board meetings." },
  { key: "communication_tools", label: "Communication Tools", desc: "Controls announcements, email/SMS communications, member messaging, surveys and testimonies." },
  { key: "reports_analytics",   label: "Reports & Analytics", desc: "Controls report generation and analytics exports." },
  { key: "attendance",          label: "Attendance",          desc: "Controls attendance recording and attendance settings." },
  { key: "groups_ministries",   label: "Groups & Ministries", desc: "Controls groups and house fellowships independently. Note: Member Management also restricts these pages." },
  { key: "church_settings",     label: "Church Settings",     desc: "Controls staff management and all church configuration settings." },
] as const;

const PERM_LEVEL_STYLES: Record<PermLevel, string> = {
  default:     "bg-slate-100 text-slate-600 border-slate-200",
  read_only:   "bg-blue-50 text-blue-700 border-blue-200",
  full_access: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function PermDropdown({ value, onChange }: { value: PermLevel; onChange: (v: PermLevel) => void }) {
  return (
    <Select value={value} onValueChange={v => onChange(v as PermLevel)}>
      <SelectTrigger className={`w-36 h-8 text-xs rounded-full border ${PERM_LEVEL_STYLES[value]}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="default">Default</SelectItem>
        <SelectItem value="read_only">Read Only</SelectItem>
        <SelectItem value="full_access">Full Access</SelectItem>
      </SelectContent>
    </Select>
  );
}

interface FineTuneModalProps {
  user: UserRow | null;
  tenantId: string;
  onClose: () => void;
}

function FineTunePermissionsModal({ user, tenantId, onClose }: FineTuneModalProps) {
  const [perms, setPerms] = useState<Record<string, PermLevel>>(
    Object.fromEntries(PERM_CATEGORIES.map(c => [c.key, "default"]))
  );
  const [saving, setSaving] = useState(false);

  // Load existing overrides
  const { data: existing = [] } = useQuery<{ permission_key: string; level: string }[]>({
    queryKey: ["user-fine-perms", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_fine_permissions")
        .select("permission_key, level")
        .eq("user_id", user!.id)
        .eq("tenant_id", tenantId);
      return (data ?? []) as { permission_key: string; level: string }[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Seed local state from DB
  useState(() => {
    if (existing.length > 0) {
      const map: Record<string, PermLevel> = Object.fromEntries(PERM_CATEGORIES.map(c => [c.key, "default"]));
      for (const row of existing) map[row.permission_key] = row.level as PermLevel;
      setPerms(map);
    }
  });

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = PERM_CATEGORIES.map(c => ({
        user_id: user.id,
        tenant_id: tenantId,
        permission_key: c.key,
        level: perms[c.key],
      }));
      const { error } = await supabase
        .from("user_fine_permissions")
        .upsert(rows as never, { onConflict: "user_id,permission_key" });
      if (error) throw error;
      toast.success("✅ Permissions updated successfully.");
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Fine-Tune Permissions</DialogTitle>
          <p className="text-xs text-slate-500">Override default role permissions for this user.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {PERM_CATEGORIES.map((cat, idx) => (
            <div
              key={cat.key}
              className={`flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">{cat.label}</p>
                <p className="text-xs text-slate-400">{cat.desc}</p>
              </div>
              <PermDropdown
                value={perms[cat.key] ?? "default"}
                onChange={v => setPerms(prev => ({ ...prev, [cat.key]: v }))}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Permissions"}
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
  const { tenantId, userRole } = useChurch();
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const isAdmin = userRole === 'church_admin' || userRole === 'super_admin';

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<{ id: string; name: string; description: string } | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: customRoles = [] } = useQuery({
    queryKey: ['custom-roles', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('custom_roles')
        .select('id, name, description')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');
      return data ?? [];
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      if (!roleName.trim()) throw new Error('Role name is required');
      if (editingRole) {
        const { error } = await supabase
          .from('custom_roles')
          .update({ name: roleName.trim(), description: roleDescription.trim() })
          .eq('id', editingRole.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('custom_roles')
          .insert({ tenant_id: tenantId, name: roleName.trim(), description: roleDescription.trim() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-roles', tenantId] });
      toast.success(editingRole ? 'Role updated!' : 'Role created!');
      setModalOpen(false);
      setEditingRole(null);
      setRoleName('');
      setRoleDescription('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (readOnly) return;
      const { error } = await supabase
        .from('custom_roles')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-roles', tenantId] });
      toast.success('Role removed!');
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setModalOpen(true);
  };

  const openEdit = (r: { id: string; name: string; description: string }) => {
    setEditingRole(r);
    setRoleName(r.name);
    setRoleDescription(r.description ?? '');
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header — unchanged */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
          <Shield className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">Role Permissions Overview</h2>
          <p className="text-xs text-slate-500">Understanding what each role can access</p>
        </div>
      </div>

      {/* Role cards grid — unchanged */}
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

      {/* Capabilities comparison table — unchanged */}
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

      {/* Custom Roles Section — NEW */}
      <div className="border-t border-slate-100 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Custom Roles</h3>
            <p className="text-xs text-slate-400 mt-0.5">Create roles specific to your church's structure</p>
          </div>
          {isAdmin && (
            <PermissionButton
              readOnly={readOnly}
              onClick={openCreate}
              size="sm"
              className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="h-4 w-4" />Add Role
            </PermissionButton>
          )}
        </div>

        {customRoles.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No custom roles yet.{isAdmin ? ' Add one above.' : ''}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customRoles.map(r => (
              <div key={r.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{r.name}</p>
                  {r.description && <p className="text-xs text-slate-400 mt-0.5">{r.description}</p>}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => openEdit(r)}
                      className="rounded p-1.5 text-slate-400 hover:bg-purple-50 hover:text-purple-500 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(r.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Role Modal */}
      <Dialog open={modalOpen} onOpenChange={v => { if (!v) setModalOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Add Custom Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Role Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Worship Leader"
                value={roleName}
                onChange={e => setRoleName(e.target.value)}
                className="focus:ring-orange-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                placeholder="Brief description of this role's responsibilities..."
                value={roleDescription}
                onChange={e => setRoleDescription(e.target.value)}
                className="focus:ring-orange-400 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!roleName.trim() || saveMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saveMutation.isPending ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this role?</AlertDialogTitle>
            <AlertDialogDescription>
              This role will be removed. Users currently assigned this role will keep it until manually reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Users Page ──────────────────────────────────────────────────────────
const UsersPage = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const { canAddStaff, limits } = useSubscription();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [fineTuneUser, setFineTuneUser] = useState<UserRow | null>(null);

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<UserRow[]>({
    queryKey: ["settings-users", church.tenantId],
    queryFn: async () => {
      console.log("🔍 USERS QUERY DEBUG:");
      console.log("- Primary table: members");
      console.log("- Secondary table: users");
      console.log("- Tenant ID filter:", church.tenantId);
      
      // First, fetch all members from members table
      const { data: membersData, error: membersError } = await supabase
        .from(TABLES.MEMBERS)
        .select("id, first_name, last_name, email, tenant_id")
        .eq(COLS.TENANT_ID, church.tenantId);
      
      console.log("🔍 MEMBERS QUERY RESPONSE:");
      console.log("- Error:", membersError);
      console.log("- Data count:", membersData?.length || 0);
      
      if (membersError) throw membersError;
      
      // Then fetch user roles and status from users table
      const { data: userRolesData, error: userRolesError } = await supabase
        .from(TABLES.USERS)
        .select("id, first_name, last_name, email, role, status, avatar_url, tenant_id, invitation_sent, last_login_at")
        .eq("tenant_id", church.tenantId);
      
      console.log("🔍 USER ROLES QUERY RESPONSE:");
      console.log("- Error:", userRolesError);
      console.log("- Data count:", userRolesData?.length || 0);
      
      if (userRolesError) throw userRolesError;
      
      // Merge the results - show all users from users table, enrich with member data if available
      const mergedUsers: UserRow[] = [];
      
      if (userRolesData) {
        for (const userRole of userRolesData) {
          // Enrich with member data if available (by ID first, then email)
          const member = membersData?.find(m => m.id === userRole.id) ||
                         membersData?.find(m => m.email === userRole.email);
          
          mergedUsers.push({
            id: userRole.id,
            first_name: userRole.first_name || member?.first_name || 'Unknown',
            last_name: userRole.last_name || member?.last_name || '',
            email: userRole.email || member?.email || '',
            role: userRole.role || '',
            status: userRole.status || '',
            last_login_at: userRole.last_login_at || null,
            avatar_url: userRole.avatar_url || null,
            tenant_id: userRole.tenant_id || church.tenantId,
            invitation_sent: userRole.invitation_sent ?? false,
          });
        }
      }
      
      console.log("🔍 MERGED USERS RESULT:");
      console.log("- Final count:", mergedUsers.length);
      console.log("- Final data:", mergedUsers);
      
      return mergedUsers.filter(u => u.status !== "inactive");
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
      qc.invalidateQueries({ queryKey: ["staff-count", church.tenantId] });
      toast.success("User removed.");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to remove user."),
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (targetUser: UserRow) => {
      if (!canAddStaff) {
        toast.error(`Staff limit reached (${limits.staff} max on your plan). Remove an existing admin first.`);
        throw new Error('Staff limit reached');
      }
      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: {
          email: targetUser.email,
          role: targetUser.role,
          church_name: church.name,
          invited_by: church.userName || `${church.userFirstName} ${church.userLastName}`,
          tenant_id: church.tenantId,
        },
      });
      if (error || data?.error) {
        throw new Error(data?.error ?? error?.message ?? "Failed to send invitation.");
      }
      return { data, targetUser };
    },
    onSuccess: ({ data, targetUser }) => {
      qc.invalidateQueries({ queryKey: ["settings-users", church.tenantId] });
      
      const formatRole = (r: string) =>
        r.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      
      if (data?.already_registered) {
        toast.success(`${targetUser.first_name} already has a VestryHub account. They've been added as ${formatRole(targetUser.role)} and can log in with existing credentials.`);
      } else {
        toast.success("Invitation sent successfully.");
      }
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to send invitation."),
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

      {readOnly && <ReadOnlyBanner section="User Management" />}

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
                {users.length}/{limits.staff} Admins
              </span>
              <PermissionButton
                readOnly={readOnly}
                className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                size="sm"
                onClick={() => {
                  if (!canAddStaff) {
                    showPaywallToast('staff', 'staff accounts');
                    return;
                  }
                  setAddOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add User
              </PermissionButton>
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
                            {/* Send Invite — only for uninvited users, only church_admin/super_admin */}
                            {!isCurrentUser &&
                              !user.invitation_sent &&
                              (church.userRole === "church_admin" || church.userRole === "super_admin") && (
                              <button
                                title="Send invitation"
                                className="rounded p-1.5 text-slate-400 hover:bg-purple-50 hover:text-purple-500 transition-colors"
                                onClick={() => sendInviteMutation.mutate(user)}
                                disabled={sendInviteMutation.isPending}
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            )}
                            {/* Fine-tune permissions */}
                            {(church.userRole === "church_admin" || church.userRole === "super_admin") && (
                              <button
                                title="Fine-tune permissions"
                                className="rounded p-1.5 text-slate-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                                onClick={() => setFineTuneUser(user)}
                              >
                                <Key className="h-4 w-4" />
                              </button>
                            )}
                            {/* Edit */}
                            {(church.userRole === "church_admin" || church.userRole === "super_admin") && (
                              <button
                                title="Edit user"
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                onClick={() => setEditUser(user)}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {/* Delete */}
                            {!isCurrentUser &&
                              (church.userRole === "church_admin" || church.userRole === "super_admin") &&
                              !(church.userRole === "church_admin" && user.role === "super_admin") && (
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
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["settings-users", church.tenantId] });
          qc.invalidateQueries({ queryKey: ["staff-count", church.tenantId] });
        }}
      />
      <EditUserModal
        user={editUser}
        branches={branches}
        onClose={() => setEditUser(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["settings-users", church.tenantId] });
          qc.invalidateQueries({ queryKey: ["staff-count", church.tenantId] });
        }}
      />
      <FineTunePermissionsModal
        user={fineTuneUser}
        tenantId={church.tenantId}
        onClose={() => setFineTuneUser(null)}
      />
    </>
  );
};

export default UsersPage;

