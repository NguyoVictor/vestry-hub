import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { HandHeart, Users, Clock, Search, ArrowLeft, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function deptColor(dept: string): string {
  const colors = [
    "bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500",
    "bg-pink-500","bg-indigo-500","bg-cyan-500","bg-orange-500",
    "bg-teal-500","bg-rose-500",
  ];
  if (!dept) return colors[0];
  let hash = 0;
  for (let i = 0; i < dept.length; i++) hash = dept.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function MemberVolunteer() {
  const member = useMemberPortal();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [withdrawConfirm, setWithdrawConfirm] = useState<{ id: string; name: string } | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["member-volunteer-roles-list", member.churchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.VOLUNTEER_ROLES)
        .select("*")
        .eq(COLS.TENANT_ID, member.churchId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 300_000,
  });

  const { data: mySignups = [] } = useQuery({
    queryKey: ["member-my-signups", member.memberId, member.churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.VOLUNTEERS)
        .select("id, role_id, hours_served")
        .eq("member_id", member.memberId)
        .eq(COLS.TENANT_ID, member.churchId);
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: volunteerCounts = {} } = useQuery({
    queryKey: ["member-volunteer-counts", member.churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.VOLUNTEERS)
        .select("role_id")
        .eq(COLS.TENANT_ID, member.churchId)
        .eq("status", "confirmed");
      const counts: Record<string, number> = {};
      (data || []).forEach((v: any) => { counts[v.role_id] = (counts[v.role_id] || 0) + 1; });
      return counts;
    },
    staleTime: 60_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["member-my-signups", member.memberId, member.churchId] });
    queryClient.invalidateQueries({ queryKey: ["member-volunteer-counts", member.churchId] });
  };

  const signupMut = useMutation({
    mutationFn: async (role: any) => {
      const { error } = await supabase.from(TABLES.VOLUNTEERS).insert({
        tenant_id: member.churchId,
        member_id: member.memberId,
        role_id: role.id,
        status: "confirmed",
        joined_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
      return role;
    },
    onSuccess: (role) => {
      invalidate();
      toast.success(`You've signed up as ${role.name}! Thank you for serving 🙏`);
    },
    onError: (err: any) => toast.error(err.message || "Failed to sign up"),
  });

  const withdrawMut = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from(TABLES.VOLUNTEERS)
        .delete()
        .eq("member_id", member.memberId)
        .eq("role_id", roleId)
        .eq(COLS.TENANT_ID, member.churchId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("You have withdrawn from the role");
      setWithdrawConfirm(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to withdraw"),
  });

  // ── Derived ───────────────────────────────────────────────────────────────────
  const myRoleIds = new Set((mySignups as any[]).map(s => s.role_id));
  const myRoles = roles.filter((r: any) => myRoleIds.has(r.id));
  const departments = [...new Set(roles.map((r: any) => r.department).filter(Boolean))] as string[];

  const availableRoles = roles.filter((r: any) => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.department || "").toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "all" || r.department === deptFilter;
    return matchSearch && matchDept;
  });

  return (
    <div className="max-w-2xl mx-auto pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/member")}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <p className="text-xs font-medium text-slate-500">{member.churchName}</p>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <HandHeart className="h-4 w-4 text-orange-500" />Volunteer
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Sign up to serve in a ministry role</p>
        </div>
      </div>

      {/* My Roles */}
      {myRoles.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">My Roles</h2>
          {myRoles.map((role: any) => {
            const signup = (mySignups as any[]).find(s => s.role_id === role.id);
            const color = deptColor(role.department || "");
            return (
              <div key={role.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className={cn("h-1.5 w-full", color)} />
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 dark:text-white">{role.name}</p>
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs border-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Signed up ✓
                      </Badge>
                    </div>
                    {role.department && <Badge variant="secondary" className="text-xs mt-1">{role.department}</Badge>}
                    {signup?.hours_served > 0 && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />{signup.hours_served}h contributed
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline"
                    className="text-xs border-red-200 text-red-500 hover:bg-red-50 shrink-0"
                    onClick={() => setWithdrawConfirm({ id: role.id, name: role.name })}>
                    Withdraw
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Available Roles */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Available Roles</h2>

        {/* Search + dept filters */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search roles..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {departments.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setDeptFilter("all")}
              className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                deptFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
              All
            </button>
            {departments.map(d => (
              <button key={d} onClick={() => setDeptFilter(d)}
                className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  deptFilter === d ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                {d}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          </div>
        ) : availableRoles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <HandHeart className="h-12 w-12 text-slate-300" />
            <p className="text-base font-semibold text-slate-600">No volunteer roles available at this time</p>
            <p className="text-sm text-slate-400">Check back soon for new opportunities to serve!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableRoles.map((role: any) => {
              const isSignedUp = myRoleIds.has(role.id);
              const count = (volunteerCounts as Record<string, number>)[role.id] || 0;
              const max = role.max_volunteers || 0;
              const isFull = max > 0 && count >= max;
              const spotsLeft = max > 0 ? max - count : null;
              const fillPct = max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0;
              const color = deptColor(role.department || "");

              const spotsColor = spotsLeft === null ? "" :
                spotsLeft <= 1 ? "text-red-500" :
                spotsLeft <= 3 ? "text-orange-500" : "text-emerald-600";

              return (
                <div key={role.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className={cn("h-1.5 w-full", color)} />
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{role.name}</p>
                        {role.department && <Badge variant="secondary" className="text-xs mt-1">{role.department}</Badge>}
                      </div>
                      {isFull && <Badge className="bg-slate-100 text-slate-500 text-xs border-0 shrink-0">Full</Badge>}
                    </div>

                    {role.description && (
                      <p className="text-sm text-slate-500 leading-relaxed">{role.description}</p>
                    )}

                    {role.time_commitment && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />{role.time_commitment}
                      </p>
                    )}

                    {role.requirements && (
                      <p className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                        Requirements: {role.requirements}
                      </p>
                    )}

                    {/* Fill bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Users className="h-3 w-3" />{count}{max > 0 ? ` / ${max}` : ""} volunteers
                        </span>
                        {spotsLeft !== null && !isFull && (
                          <span className={cn("font-medium", spotsColor)}>{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left</span>
                        )}
                      </div>
                      {max > 0 && (
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", isFull ? "bg-emerald-500" : "bg-orange-500")}
                            style={{ width: `${fillPct}%` }} />
                        </div>
                      )}
                    </div>

                    {/* Button */}
                    {isSignedUp ? (
                      <div className="flex gap-2">
                        <Button size="sm" disabled className="flex-1 rounded-full h-9 bg-emerald-600 text-white opacity-100 cursor-default">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Signed Up ✓
                        </Button>
                        <Button size="sm" variant="outline"
                          className="rounded-full h-9 border-red-200 text-red-500 hover:bg-red-50"
                          onClick={() => setWithdrawConfirm({ id: role.id, name: role.name })}>
                          Withdraw
                        </Button>
                      </div>
                    ) : isFull ? (
                      <Button size="sm" disabled className="w-full rounded-full h-9 bg-slate-100 text-slate-400">
                        Role is Full
                      </Button>
                    ) : (
                      <Button size="sm"
                        className="w-full rounded-full h-9 bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => signupMut.mutate(role)}
                        disabled={signupMut.isPending}>
                        Sign Up
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Withdraw confirm */}
      <AlertDialog open={!!withdrawConfirm} onOpenChange={v => { if (!v) setWithdrawConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw from {withdrawConfirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to withdraw from this volunteer role?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={() => withdrawConfirm && withdrawMut.mutate(withdrawConfirm.id)}
              disabled={withdrawMut.isPending}>
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
