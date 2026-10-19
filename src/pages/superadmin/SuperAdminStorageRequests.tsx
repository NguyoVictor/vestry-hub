import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Clock, CreditCard } from "lucide-react";

export default function SuperAdminStorageRequests() {
  const { data: subscriptions = [], isLoading, isError } = useQuery({
    queryKey: ["superadmin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("platform-admin-overview", { body: { action: "subscriptions" } });
      if (error) throw error;
      return data?.subscriptions ?? [];
    },
    staleTime: 30_000,
  });

  const pending = subscriptions.filter((row: any) => row.pending_plan);
  const active = subscriptions.filter((row: any) => String(row.status).toLowerCase() === "active");

  return (
    <div className="space-y-6 font-jakarta">
      <div>
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <p className="text-sm text-slate-400 mt-1">Platform subscription status and scheduled plan changes</p>
      </div>

      {isError && <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-300">Subscription data is temporarily unavailable.</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4"><p className="text-2xl font-bold text-white">{subscriptions.length}</p><p className="text-xs text-slate-400 mt-0.5">Tracked Churches</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4"><p className="text-2xl font-bold text-white">{active.length}</p><p className="text-xs text-slate-400 mt-0.5">Active Subscriptions</p></div>
        <div className={`rounded-xl border p-4 ${pending.length ? "border-amber-700/50 bg-amber-900/20" : "border-slate-700 bg-slate-800/60"}`}><p className={`text-2xl font-bold ${pending.length ? "text-amber-300" : "text-white"}`}>{pending.length}</p><p className="text-xs text-slate-400 mt-0.5">Pending Plan Changes</p></div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2"><CreditCard className="h-4 w-4 text-violet-400" /><h2 className="text-sm font-semibold text-slate-200">Tenant Subscriptions</h2></div>
        {isLoading ? (
          <div className="p-5 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 bg-slate-700 rounded" />)}</div>
        ) : subscriptions.length === 0 ? (
          <div className="py-16 text-center text-slate-500">No subscriptions found</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-700 bg-slate-900/50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Church</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Current Plan</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Pending Plan</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Period End</th>
            </tr></thead>
            <tbody>{subscriptions.map((row: any) => (
              <tr key={row.tenant_id} className="border-b border-slate-700/50">
                <td className="px-5 py-4 font-medium text-slate-200">{row.tenant_name || row.tenant_id}</td>
                <td className="px-5 py-4 text-slate-300 capitalize">{row.plan || "free"}</td>
                <td className="px-5 py-4 text-slate-300 capitalize">{row.status || "unknown"}</td>
                <td className="px-5 py-4">{row.pending_plan ? <span className="inline-flex items-center gap-1 text-amber-300"><Clock className="h-3.5 w-3.5" />{row.pending_plan}</span> : <span className="text-slate-500">—</span>}</td>
                <td className="px-5 py-4 text-slate-400 text-xs">{row.current_period_end ? formatDistanceToNow(new Date(row.current_period_end), { addSuffix: true }) : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
