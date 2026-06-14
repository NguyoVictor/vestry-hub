import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { TABLES, COLS } from "@/lib/schema";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  UserCircle, Copy, RefreshCw, ShieldCheck, Crown, Building2,
  GitBranch, Layers, HandHelping, User, Check, X, ChevronRight,
} from "lucide-react";
import { FeaturePermissions } from "./FeaturePermissions";
import { UserOverrides } from "./UserOverrides";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function randomCode(len = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ─── Role definitions ─────────────────────────────────────────────────────────
const ROLES = [
  {
    key: "super_admin",
    label: "Super Admin",
    users: "Senior Pastor, General Overseer",
    icon: Crown,
    iconBg: "bg-red-100",
    iconColor: "text-red-500",
    perms: [
      { label: "Access ALL branches and data",   allowed: true },
      { label: "Manage all users and roles",      allowed: true },
      { label: "Full financial access",           allowed: true },
      { label: "Church-wide settings",            allowed: true },
    ],
  },
  {
    key: "church_admin",
    label: "Church Admin",
    users: "Church Secretary, Admin Pastor",
    icon: Building2,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-500",
    perms: [
      { label: "Manage all members",              allowed: true },
      { label: "Create events & services",        allowed: true },
      { label: "View financial reports",          allowed: true },
      { label: "Send communications",             allowed: true },
    ],
  },
  {
    key: "branch_admin",
    label: "Branch Admin",
    users: "Branch Pastor, Branch Secretary",
    icon: GitBranch,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-500",
    perms: [
      { label: "Manage assigned branch only",     allowed: true },
      { label: "Branch members & attendance",     allowed: true },
      { label: "Branch-level reports",            allowed: true },
      { label: "Cannot access other branches",    allowed: false },
    ],
  },
  {
    key: "department_head",
    label: "Department Head",
    users: "Ministry Leaders, Choir Directors",
    icon: Layers,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-500",
    perms: [
      { label: "Manage department activities",    allowed: true },
      { label: "View department reports",         allowed: true },
      { label: "Coordinate volunteers",           allowed: true },
      { label: "No financial access",             allowed: false },
    ],
  },
  {
    key: "volunteer",
    label: "Volunteer",
    users: "Ushers, Media Team, Greeters",
    icon: HandHelping,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-500",
    perms: [
      { label: "View assigned tasks",             allowed: true },
      { label: "Perform check-in duties",         allowed: true },
      { label: "Mark attendance",                 allowed: true },
      { label: "No admin access",                 allowed: false },
    ],
  },
  {
    key: "member",
    label: "Member",
    users: "General congregation",
    icon: User,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
    perms: [
      { label: "Access Member Portal",            allowed: true },
      { label: "Update personal profile",         allowed: true },
      { label: "View giving history",             allowed: true },
      { label: "No admin dashboard",              allowed: false },
    ],
  },
] as const;

type RoleKey = typeof ROLES[number]["key"];

// ─── Role card ────────────────────────────────────────────────────────────────
function RoleCard({ role, isCurrentRole }: { role: typeof ROLES[number]; isCurrentRole: boolean }) {
  const Icon = role.icon;
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${isCurrentRole ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/10" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${role.iconBg}`}>
          <Icon className={`h-4 w-4 ${role.iconColor}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{role.label}</p>
            {isCurrentRole && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">You</span>
            )}
          </div>
          <p className="text-xs text-slate-400">{role.users}</p>
        </div>
      </div>
      <ul className="space-y-1">
        {role.perms.map(p => (
          <li key={p.label} className="flex items-center gap-2 text-xs">
            {p.allowed
              ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              : <X className="h-3.5 w-3.5 text-red-400 shrink-0" />
            }
            <span className={p.allowed ? "text-slate-600 dark:text-slate-300" : "text-slate-400"}>{p.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Roles Overview tab ───────────────────────────────────────────────────────
function RolesOverview({ currentRole }: { currentRole: string }) {
  return (
    <div className="space-y-6 pt-2">
      {/* 3-column grid of role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ROLES.map(role => (
          <RoleCard key={role.key} role={role} isCurrentRole={role.key === currentRole} />
        ))}
      </div>

      {/* Role Hierarchy */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">Role Hierarchy</p>
        <p className="text-xs text-slate-500 mb-4">Higher roles inherit all permissions of lower roles</p>
        <div className="flex flex-wrap items-center gap-2">
          {ROLES.map((role, idx) => {
            const isActive = role.key === currentRole;
            return (
              <div key={role.key} className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  isActive
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                }`}>
                  {role.label}
                </span>
                {idx < ROLES.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Empty placeholder tab ────────────────────────────────────────────────────
function ComingSoonTab({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
      <ShieldCheck className="h-8 w-8" />
      <p className="text-sm font-medium">{label} coming soon</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const RolesPermissions = () => {
  const { tenantId, userRole, name: churchName } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Fetch tenant church_code — this is the single access code for members AND visitors
  const { data: tenant } = useQuery({
    queryKey: ["tenant-invite", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TENANTS)
        .select("id, church_code, invite_code_uses")
        .eq(COLS.ID, tenantId)
        .single();
      if (error) throw error;
      // Auto-generate via edge function if none exists yet
      if (!data.church_code) {
        const { data: fnData } = await supabase.functions.invoke("generate-church-code", {
          body: { tenantId, churchName },
        });
        return { ...data, church_code: fnData?.code ?? randomCode(), invite_code_uses: 0 };
      }
      return data as { id: string; church_code: string; invite_code_uses: number };
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      // Edge function handles: personalized prefix + uniqueness check + DB update
      const { data, error } = await supabase.functions.invoke("generate-church-code", {
        body: { tenantId, churchName },
      });
      if (error || data?.error) throw new Error(data?.error || "Failed to generate code");
      return data.code as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-invite", tenantId] });
      qc.invalidateQueries({ queryKey: ["tenant-church-code", tenantId] });
      toast.success("New access code generated!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCopy = () => {
    if (!tenant?.church_code) return;
    navigator.clipboard.writeText(tenant.church_code);
    toast.success("Code copied!");
  };

  // Normalise role key for matching
  const currentRole = (userRole ?? "").toLowerCase().replace(/\s+/g, "_") as RoleKey;

  return (
    <>
      <Helmet><title>Access Control — Vestry</title></Helmet>

      {readOnly && <ReadOnlyBanner section="Church Settings" />}

      <div className="max-w-4xl space-y-5">

        {/* ── CARD 1: Member Invite Code ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
              <UserCircle className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Member Invite Code</p>
              <p className="text-xs text-slate-500 max-w-lg">
                Generate a code for new members to join your church after they register an account.
                Generating a new code will invalidate the previous one.
              </p>
            </div>
          </div>

          {/* Code input + copy */}
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={tenant?.church_code ?? "Loading..."}
              className="font-mono text-base tracking-widest text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 max-w-xs"
            />
            <button
              onClick={handleCopy}
              title="Copy code"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors border border-slate-200 dark:border-slate-600"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          {/* Usage count */}
          <p className="text-xs text-slate-500">
            This code has been used <span className="font-semibold text-slate-700 dark:text-slate-300">{tenant?.invite_code_uses ?? 0}</span> time(s).
          </p>
          {/* Generate button */}
          <PermissionButton
            readOnly={readOnly}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={generateMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
            Generate New Code
          </PermissionButton>

          {/* How it works */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 space-y-1.5">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">How it works:</p>
            <ol className="space-y-1 text-xs text-slate-500 list-decimal list-inside">
              <li>Share this code with people who want to join your church</li>
              <li>They register an account and enter the code during onboarding</li>
              <li>Members are added as <strong>Pending Approval</strong> — approve them to grant portal access</li>
              <li>Visitors are logged to the Visitors page for follow-up</li>
              <li>Generating a new code invalidates the previous one</li>
            </ol>
          </div>
        </div>

        {/* ── CARD 2: Access Control ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 shrink-0">
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Access Control</p>
              <p className="text-xs text-slate-500">
                Manage role-based permissions and individual user access overrides
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="roles">
            <TabsList className="bg-slate-100 dark:bg-slate-700 p-1 rounded-lg w-auto mb-2">
              <TabsTrigger value="roles" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-sm">
                Roles Overview
              </TabsTrigger>
              <TabsTrigger value="permissions" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-sm">
                Feature Permissions
              </TabsTrigger>
              <TabsTrigger value="overrides" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-sm">
                User Overrides
              </TabsTrigger>
            </TabsList>

            <TabsContent value="roles">
              <RolesOverview currentRole={currentRole} />
            </TabsContent>
            <TabsContent value="permissions">
              <FeaturePermissions />
            </TabsContent>
            <TabsContent value="overrides">
              <UserOverrides />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Confirm generate dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate a new invite code?</AlertDialogTitle>
            <AlertDialogDescription>
              Generating a new code will invalidate the current one. Members with the old code will not be able to use it. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => { setConfirmOpen(false); generateMutation.mutate(); }}
            >
              Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RolesPermissions;
