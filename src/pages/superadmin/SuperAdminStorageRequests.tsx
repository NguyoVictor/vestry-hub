import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatBytes } from "@/components/media/StorageBar";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, Clock, X } from "lucide-react";
import { TABLES } from "@/lib/schema";

interface PendingRequest {
  id: string;
  tenant_id: string;
  upgrade_requested_at: string;
  storage_used_bytes: number;
  storage_plan_id: string;
  upgrade_requested_plan_id: string;
  tenants: { name: string } | null;
  current_plan: { name: string; storage_limit: number } | null;
  requested_plan: { id: string; name: string; storage_limit: number } | null;
}

export default function SuperAdminStorageRequests() {
  const qc = useQueryClient();
  const [approveTarget, setApproveTarget] = useState<PendingRequest | null>(null);
  const [declineTarget, setDeclineTarget] = useState<PendingRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery<PendingRequest[]>({
    queryKey: ["superadmin-storage-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.CHURCH_STORAGE)
        .select(`
          id, tenant_id, upgrade_requested_at, storage_used_bytes,
          storage_plan_id, upgrade_requested_plan_id,
          tenants(name),
          current_plan:storage_plans!church_storage_storage_plan_id_fkey(name, storage_limit),
          requested_plan:storage_plans!church_storage_upgrade_requested_plan_id_fkey(id, name, storage_limit)
        `)
        .not("upgrade_requested_at", "is", null)
        .order("upgrade_requested_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PendingRequest[];
    },
    staleTime: 30_000,
  });

  // Stats
  const { data: allChurches } = useQuery({
    queryKey: ["superadmin-church-count"],
    queryFn: async () => {
      const { count } = await supabase.from("tenants").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
    staleTime: 300_000,
  });

  const { data: freePlanCount } = useQuery({
    queryKey: ["superadmin-free-count"],
    queryFn: async () => {
      const freePlan = await supabase.from(TABLES.STORAGE_PLANS).select("id").eq("name", "Free").single();
      if (!freePlan.data) return 0;
      const { count } = await supabase.from(TABLES.CHURCH_STORAGE).select("id", { count: "exact", head: true }).eq("storage_plan_id", freePlan.data.id);
      return count ?? 0;
    },
    staleTime: 300_000,
  });

  const approveMutation = useMutation({
    mutationFn: async (req: PendingRequest) => {
      // Update church_storage
      const { error } = await supabase
        .from(TABLES.CHURCH_STORAGE)
        .update({
          storage_plan_id: req.upgrade_requested_plan_id,
          plan_activated_at: new Date().toISOString(),
          upgrade_requested_at: null,
          upgrade_requested_plan_id: null,
          storage_warning_sent_at: null,
          storage_full_notified_at: null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("tenant_id", req.tenant_id);
      if (error) throw error;

      // Notify church admin users
      const { data: adminUsers } = await supabase
        .from("users")
        .select("id")
        .eq("tenant_id", req.tenant_id);

      if (adminUsers?.length) {
        const planName = req.requested_plan?.name ?? "upgraded";
        const planStorage = req.requested_plan?.storage_limit ? formatBytes(req.requested_plan.storage_limit) : "more storage";
        const records = adminUsers.map(u => ({
          tenant_id: req.tenant_id,
          user_id: u.id,
          type: "storage_upgraded",
          title: "Storage Upgraded! 🎉",
          body: `Your storage has been upgraded to ${planName}. You now have ${planStorage} of storage available.`,
          is_read: false,
          link: "/church-media",
          metadata: { planName, planStorage },
        }));
        await supabase.from("notifications").insert(records as never);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superadmin-storage-requests"] });
      qc.invalidateQueries({ queryKey: ["superadmin-church-count"] });
      toast.success("Storage upgrade approved and church notified.");
      setApproveTarget(null);
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to approve upgrade"),
  });

  const declineMutation = useMutation({
    mutationFn: async (req: PendingRequest) => {
      const { error } = await supabase
        .from(TABLES.CHURCH_STORAGE)
        .update({
          upgrade_requested_at: null,
          upgrade_requested_plan_id: null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("tenant_id", req.tenant_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superadmin-storage-requests"] });
      toast.success("Upgrade request declined.");
      setDeclineTarget(null);
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to decline request"),
  });

  return (
    <div className="space-y-6 font-jakarta">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Storage Upgrade Requests</h1>
        <p className="text-sm text-slate-400 mt-1">Review and approve storage plan upgrades from churches</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Churches", value: allChurches ?? "—" },
          { label: "On Free Plan", value: freePlanCount ?? "—" },
          { label: "Pending Requests", value: requests.length, amber: requests.length > 0 },
          { label: "Paid Plans", value: ((allChurches ?? 0) - (freePlanCount ?? 0)) },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.amber ? "border-amber-700/50 bg-amber-900/20" : "border-slate-700 bg-slate-800/60"}`}>
            <p className={`text-2xl font-bold ${s.amber ? "text-amber-300" : "text-white"}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Requests table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-200">Pending Requests</h2>
          {requests.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {requests.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 bg-slate-700 rounded" />)}</div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
            <p className="text-sm font-semibold text-slate-300">No pending requests</p>
            <p className="text-xs text-slate-500">All upgrade requests have been processed.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Church</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Current Plan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Requested Plan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Requested</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-200">{(req.tenants as any)?.name ?? "Unknown Church"}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{req.tenant_id}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-slate-300">{req.current_plan?.name ?? "Free"}</p>
                    <p className="text-[10px] text-slate-500">{req.current_plan?.storage_limit ? formatBytes(req.current_plan.storage_limit) : "200 MB"}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-violet-300 font-medium">{req.requested_plan?.name ?? "—"}</p>
                    <p className="text-[10px] text-slate-500">{req.requested_plan?.storage_limit ? formatBytes(req.requested_plan.storage_limit) : "—"}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-400 text-xs">
                    {req.upgrade_requested_at ? formatDistanceToNow(new Date(req.upgrade_requested_at), { addSuffix: true }) : "—"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs" onClick={() => setApproveTarget(req)}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-red-900/20 hover:text-red-400 hover:border-red-700 h-7 text-xs" onClick={() => setDeclineTarget(req)}>
                        <X className="h-3.5 w-3.5 mr-1" />Decline
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Approve confirm */}
      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={v => !v && setApproveTarget(null)}
        title={`Approve upgrade for ${(approveTarget?.tenants as any)?.name ?? "this church"}?`}
        description={`This will change their plan from ${approveTarget?.current_plan?.name ?? "Free"} (${approveTarget?.current_plan?.storage_limit ? formatBytes(approveTarget.current_plan.storage_limit) : "200 MB"}) to ${approveTarget?.requested_plan?.name ?? "—"} (${approveTarget?.requested_plan?.storage_limit ? formatBytes(approveTarget.requested_plan.storage_limit) : "—"}). The church will be notified immediately.`}
        confirmLabel="Approve Upgrade"
        onConfirm={() => approveTarget && approveMutation.mutate(approveTarget)}
        loading={approveMutation.isPending}
      />

      {/* Decline confirm */}
      <ConfirmDialog
        open={!!declineTarget}
        onOpenChange={v => !v && setDeclineTarget(null)}
        title="Decline upgrade request?"
        description={`The upgrade request from ${(declineTarget?.tenants as any)?.name ?? "this church"} will be cleared. Their plan will remain unchanged.`}
        confirmLabel="Decline"
        destructive
        onConfirm={() => declineTarget && declineMutation.mutate(declineTarget)}
        loading={declineMutation.isPending}
      />
    </div>
  );
}
