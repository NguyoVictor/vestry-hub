import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { StorageBar, formatBytes } from "@/components/media/StorageBar";
import { Building2, Clock, Database, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const PLATFORM_LIMIT = Number(import.meta.env.VITE_PLATFORM_STORAGE_LIMIT_BYTES ?? 107_374_182_400);

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

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["superadmin-stats"],
    queryFn: async () => {
      const [churchesRes, storageRes, pendingRes, activityRes] = await Promise.all([
        supabase.from("tenants").select("id, name, created_at", { count: "exact" }),
        supabase.from("church_storage").select("storage_used_bytes, storage_plans(name)"),
        supabase.from("church_storage").select("id", { count: "exact" }).not("upgrade_requested_at", "is", null),
        supabase.from("activity_log").select("id, action_type, description, created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      const totalChurches = churchesRes.count ?? 0;
      const storageRows = storageRes.data ?? [];
      const totalUsed = storageRows.reduce((sum, r) => sum + (r.storage_used_bytes ?? 0), 0);
      const pendingCount = pendingRes.count ?? 0;
      const recentActivity = activityRes.data ?? [];

      return { totalChurches, totalUsed, pendingCount, recentActivity };
    },
    staleTime: 60_000,
  });

  return (
    <div className="space-y-8 font-jakarta">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">VestryHub platform overview</p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-slate-800" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Building2} label="Total Churches" value={stats?.totalChurches ?? 0} />
          <StatCard icon={Database} label="Total Storage Used" value={formatBytes(stats?.totalUsed ?? 0)} />
          <StatCard icon={Clock} label="Pending Upgrades" value={stats?.pendingCount ?? 0} accent={(stats?.pendingCount ?? 0) > 0} />
          <StatCard icon={TrendingUp} label="Platform Limit" value={formatBytes(PLATFORM_LIMIT)} />
        </div>
      )}

      {/* Platform storage bar */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Platform Storage</h2>
        {isLoading ? <Skeleton className="h-8 bg-slate-700 rounded" /> : (
          <StorageBar
            usedBytes={stats?.totalUsed ?? 0}
            limitBytes={PLATFORM_LIMIT}
            planName="Supabase Pro"
            onUpgrade={() => {}}
          />
        )}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Recent Activity</h2>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 bg-slate-700 rounded" />)}</div>
        ) : !stats?.recentActivity?.length ? (
          <p className="text-sm text-slate-500 py-4 text-center">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {stats.recentActivity.map((a: any) => (
              <div key={a.id} className="flex items-start justify-between gap-3 py-2 border-b border-slate-700/50 last:border-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-300 truncate">{a.description || a.action_type}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 capitalize">{a.action_type?.replace(/_/g, " ")}</p>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true }) : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
