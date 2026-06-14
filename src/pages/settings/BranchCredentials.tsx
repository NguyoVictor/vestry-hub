import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { KeyRound, Building2, Link, Copy, Eye, EyeOff, X } from "lucide-react";
import { format } from "date-fns";

const BASE_URL = import.meta.env.VITE_BASE_URL || "https://www.churchcentralcloud.com";
const BRANCH_LOGIN_URL = `${BASE_URL}/branch-login`;

// ─── Simple hash (SHA-256 via Web Crypto) ─────────────────────────────────────
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Slug generator ───────────────────────────────────────────────────────────
function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") + "_";
}

// ─── Set Up Modal ─────────────────────────────────────────────────────────────
interface SetUpModalProps {
  branch: any;
  onClose: () => void;
  onSaved: () => void;
}

function SetUpModal({ branch, onClose, onSaved }: SetUpModalProps) {
  const queryClient = useQueryClient();
  const { tenantId } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const hasCredentials = !!branch.branch_username;

  const [username, setUsername] = useState(branch.branch_username || toSlug(branch.name));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      const errs: Record<string, string> = {};
      if (!username.trim()) errs.username = "Username is required";
      if (!hasCredentials && !password) errs.password = "Password is required";
      if (password && password !== confirmPassword) errs.confirm = "Passwords do not match";
      if (password && password.length < 6) errs.password = "Password must be at least 6 characters";
      setErrors(errs);
      if (Object.keys(errs).length > 0) throw new Error("Validation failed");

      const payload: Record<string, any> = { branch_username: username.trim() };
      if (password) {
        payload.branch_password_hash = await hashPassword(password);
      }

      const { error } = await supabase.from(TABLES.BRANCHES).update(payload).eq(COLS.ID, branch.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches-credentials", tenantId] });
      toast.success(hasCredentials ? "Credentials updated" : "Branch credentials saved");
      onSaved();
    },
    onError: (e: Error) => {
      if (e.message !== "Validation failed") toast.error(e.message || "Failed to save credentials");
    },
  });

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-orange-500" />
            {hasCredentials ? "Edit Branch Credentials" : "Set Up Branch Credentials"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 -mt-2">
          Configure login credentials for <span className="font-semibold text-slate-700 dark:text-slate-300">{branch.name}</span>. Branch users will use these to access their dashboard.
        </p>

        <div className="space-y-4 mt-2">
          {/* Username */}
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={`border-orange-300 focus-visible:ring-orange-400 ${errors.username ? "border-red-400" : ""}`}
            />
            {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label>Password {hasCredentials && <span className="text-slate-400 font-normal">(leave empty to keep current)</span>}</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`pr-10 ${errors.password ? "border-red-400" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label>Confirm Password</Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={`pr-10 ${errors.confirm ? "border-red-400" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirm && <p className="text-xs text-red-500">{errors.confirm}</p>}
          </div>

          {/* Login URL — read only */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-0.5">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Login URL:</p>
            <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">{BRANCH_LOGIN_URL}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={save.isPending}>Cancel</Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => save.mutate()}
              disabled={save.isPending || readOnly}
            >
              {save.isPending ? "Saving…" : "Save Credentials"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BranchCredentials() {
  const { tenantId } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const [setupBranch, setSetupBranch] = useState<any>(null);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["branches-credentials", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.BRANCHES)
        .select("id, name, branch_username, branch_password_hash, last_login_at, is_active")
        .eq(COLS.TENANT_ID, tenantId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  function copyDashboardLink(branch: any) {
    const url = `${BASE_URL}/branch/${branch.id}/dashboard`;
    navigator.clipboard.writeText(url);
    toast.success("Branch dashboard link copied");
  }

  function copyLoginUrl() {
    navigator.clipboard.writeText(BRANCH_LOGIN_URL);
    toast.success("Login URL copied");
  }

  return (
    <>
      <Helmet><title>Branch Credentials — Vestry</title></Helmet>

      {/* Read-only banner */}
      {readOnly && <ReadOnlyBanner section="Branch Credentials" />}

      <div className="max-w-4xl pb-10">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">

          {/* Card header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-start gap-3">
              <KeyRound className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Branch Login Credentials</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage shared login credentials for your branches. Branch users can access their dashboard using these credentials at{" "}
                  <code
                    className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-orange-600 cursor-pointer hover:bg-slate-200 transition-colors"
                    onClick={copyLoginUrl}
                    title="Click to copy"
                  >
                    /branch-login
                  </code>
                </p>
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : branches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Building2 className="h-10 w-10" />
              <p className="text-sm">No branches found. Add branches first.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                  {["Branch", "Status", "Username", "Last Login", "Actions"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {branches.map((branch: any) => {
                  const hasCredentials = !!branch.branch_username;
                  return (
                    <tr key={branch.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      {/* Branch name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800 dark:text-slate-100">{branch.name}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        {hasCredentials ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">Active</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Not Set</span>
                        )}
                      </td>

                      {/* Username */}
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {branch.branch_username || "—"}
                      </td>

                      {/* Last Login */}
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {branch.last_login_at
                          ? format(new Date(branch.last_login_at), "dd MMM yyyy")
                          : "Never"}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {/* Copy dashboard link */}
                          <button
                            onClick={() => copyDashboardLink(branch)}
                            title="Copy Branch Dashboard Link"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          >
                            <Link className="h-3.5 w-3.5" />
                          </button>

                          {/* Copy login URL */}
                          <button
                            onClick={copyLoginUrl}
                            title="Copy Login URL"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          {/* Set Up / Edit */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 px-2.5"
                            onClick={() => setSetupBranch(branch)}
                          >
                            {hasCredentials ? "Edit" : "Set Up"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Set Up Modal */}
      {setupBranch && (
        <SetUpModal
          branch={setupBranch}
          onClose={() => setSetupBranch(null)}
          onSaved={() => setSetupBranch(null)}
        />
      )}
    </>
  );
}
