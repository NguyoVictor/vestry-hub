import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/components/media/StorageBar";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

function StatusChip({ pct, pending }: { pct: number; pending: boolean }) {
  if (pending) return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-violet-900/40 text-violet-300 border border-violet-700/50">
      <Clock className="h-3 w-3" />Upgrade Pending
    </span>
  );
  if (pct >= 90) return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-900/40 text-red-300 border border-red-700/50">
      <AlertTriangle className="h-3 w-3" />{Math.round(pct)}% Full
    </span>
  );
  if (pct >= 70) return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-900/40 text-amber-300 border border-amber-700/50">
      <AlertTriangle className="h-3 w-3" />{Math.round(pct)}% Used
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">
      <CheckCircle className="h-3 w-3" />{Math.round(pct)}% Used
    </span>
  );
}

export default function SuperAdminChurches() {
  const { data: churches = [], isLoading } = useQuery({
    queryKey: ["superadmin-churches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, created_at, church_storage(storage_used_bytes, upgrade_requested_at, storage_plans(name, storage_limit))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6 font-jakarta">
      <div>
        <h1 className="text-2xl font-bold text-white">Churches</h1>
        <p className="text-sm text-slate-400 mt-1">{churches.length} churches registered on the platform</p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 bg-slate-700 rounded" />)}</div>
        ) : churches.length === 0 ? (
          <div className="py-16 text-center text-slate-500">No churches registered yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Church</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Plan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Storage Used</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody>
              {churches.map((church: any) => {
                const storage = Array.isArray(church.church_storage) ? church.church_storage[0] : church.church_storage;
                const used = storage?.storage_used_bytes ?? 0;
                const limit = storage?.storage_plans?.storage_limit ?? 209_715_200;
                const pct = limit > 0 ? (used / limit) * 100 : 0;
                const pending = !!storage?.upgrade_requested_at;
                return (
                  <tr key={church.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-200">{church.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{church.id}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{storage?.storage_plans?.name ?? "Free"}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-slate-300">{formatBytes(used)}</p>
                      <p className="text-[10px] text-slate-500">of {formatBytes(limit)}</p>
                    </td>
                    <td className="px-5 py-3.5"><StatusChip pct={pct} pending={pending} /></td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {church.created_at ? format(new Date(church.created_at), "dd MMM yyyy") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
