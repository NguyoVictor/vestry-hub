import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Clock, Database, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SentryMonitor } from "@/components/security/SentryMonitor";
import { PostHogDashboard } from "@/components/security/PostHogDashboard";

function StatCard({ icon: Icon, label, value, accent = false }: { icon: React.ElementType; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? "border-amber-700/50 bg-amber-900/20" : "border-slate-700 bg-slate-800/60"}`}>
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${accent ? "bg-amber-600/20" : "bg-slate-700"}`}>
          <Icon className={`h-4.5 w-4.5 ${accent ? "text-amber-400" : "text-slate-300"}`} />
        </div>
        <div>
          <p className={`text-2xl font-bold ${accent ? "text-amber-300" : "text-white"}`}>{value}</p>
          <p className="text-xs text-slate-400 mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}

const formatGb = (value: number) => `${Number(value || 0).toFixed(value >= 100 ? 0 : 1)} GB`;

export default function SuperAdminDashboard() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["superadmin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("platform-admin-overview", { body: { action: "overview" } });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  return (
    <div className="space-y-8 font-jakarta">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">VestryHub platform overview</p>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-300">
          Platform metrics are temporarily unavailable. Your access remains protected.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-slate-800" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Building2} label="Total Churches" value={stats?.totalChurches ?? 0} />
          <StatCard icon={TrendingUp} label="Active Subscriptions" value={stats?.activeSubscriptions ?? 0} />
          <StatCard icon={Clock} label="Pending Plan Changes" value={stats?.pendingPlanChanges ?? 0} accent={(stats?.pendingPlanChanges ?? 0) > 0} />
          <StatCard icon={Database} label="Storage Used" value={formatGb(stats?.totalStorageUsedGb ?? 0)} />
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-sm font-semibold text-slate-300">Subscription Storage Capacity</h2>
          <span className="text-xs text-slate-500">{formatGb(stats?.totalStorageUsedGb ?? 0)} / {formatGb(stats?.totalStorageLimitGb ?? 0)}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all"
            style={{ width: `${Math.min(100, (Number(stats?.totalStorageUsedGb || 0) / Math.max(1, Number(stats?.totalStorageLimitGb || 0))) * 100)}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Recent Subscription Payments</h2>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 bg-slate-700 rounded" />)}</div>
        ) : !stats?.recentPayments?.length ? (
          <p className="text-sm text-slate-500 py-4 text-center">No recent subscription payments</p>
        ) : (
          <div className="space-y-2">
            {stats.recentPayments.map((payment: any) => (
              <div key={payment.id} className="flex items-start justify-between gap-3 py-2 border-b border-slate-700/50 last:border-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-300 truncate">{payment.product_code || "Subscription payment"}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">KES {Number(payment.expected_amount || 0).toLocaleString()} · {payment.status || "pending"}</p>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {payment.created_at ? formatDistanceToNow(new Date(payment.created_at), { addSuffix: true }) : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <SentryMonitor />
      <PostHogDashboard />
    </div>
  );
}
