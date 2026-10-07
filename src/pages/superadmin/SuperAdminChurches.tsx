import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle } from "lucide-react";

function StatusChip({ status }: { status?: string | null }) {
  const normalized = String(status || "trial").toLowerCase();
  const active = normalized === "active" || normalized === "trial";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${active ? "bg-emerald-900/40 text-emerald-300 border-emerald-700/50" : "bg-amber-900/40 text-amber-300 border-amber-700/50"}`}>
      {active ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {normalized.replace(/_/g, " ")}
    </span>
  );
}

export default function SuperAdminChurches() {
  const { data: churches = [], isLoading, isError } = useQuery({
    queryKey: ["superadmin-churches"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("platform-admin-overview", { body: { action: "churches" } });
      if (error) throw error;
      return data?.churches ?? [];
    },
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6 font-jakarta">
      <div>
        <h1 className="text-2xl font-bold text-white">Churches</h1>
        <p className="text-sm text-slate-400 mt-1">{churches.length} churches registered on the platform</p>
      </div>

      {isError && <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-300">Church data is temporarily unavailable.</div>}

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
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Storage</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody>
              {churches.map((church: any) => {
                const sub = church.subscription;
                const used = Number(sub?.storage_used_gb || 0);
                const limit = Number(sub?.storage_limit_gb || 0) + Number(sub?.storage_addons_gb || 0);
                return (
                  <tr key={church.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-200">{church.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{church.slug || church.id}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 capitalize">{sub?.plan || "free"}</td>
                    <td className="px-5 py-3.5 text-slate-300">{used.toFixed(1)} GB <span className="text-slate-500">/ {limit.toFixed(1)} GB</span></td>
                    <td className="px-5 py-3.5"><StatusChip status={sub?.status} /></td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">{church.created_at ? format(new Date(church.created_at), "dd MMM yyyy") : "—"}</td>
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
