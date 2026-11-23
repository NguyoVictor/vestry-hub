// Settings → Branches (T14). Shared branch usernames/passwords were retired:
// branch staff sign in with their own invited accounts and are assigned to a
// branch on the Users page (Edit user → Branch Assignment).
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { fetchBranchOverview } from "@/lib/branchOverview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, ShieldCheck } from "lucide-react";

export default function BranchCredentials() {
  const { tenantId } = useChurch();

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["settings-branches", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.BRANCHES)
        .select("id, name, location, is_active").eq(COLS.TENANT_ID, tenantId!).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: overview = {} } = useQuery({
    queryKey: ["branch-overview", tenantId],
    enabled: !!tenantId,
    queryFn: () => fetchBranchOverview(tenantId!),
  });

  return (
    <div className="space-y-6">
      <Helmet><title>Branches — Settings — Vestry</title></Helmet>
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Branches</h2>
        <p className="text-sm text-slate-500">Who works at which branch.</p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" data-testid="branch-access-explainer">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Branch staff use their own accounts</p>
          <p>Invite each person from <span className="font-medium">Users</span>, give them the roles they need, and choose their branch under <span className="font-medium">Branch Assignment</span>. Shared branch passwords are no longer used.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : branches.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
          No branches yet. Add branches from <Link to="/branches" className="underline">Branches</Link>.
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map(b => {
            const o = overview[b.id];
            return (
              <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" data-testid="settings-branch-row">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-900 dark:text-white">{b.name}</span>
                    {!b.is_active && <Badge variant="outline">Inactive</Badge>}
                  </div>
                  <span className="flex items-center gap-1 text-sm text-slate-500"><Users className="h-4 w-4" />{o?.staff_count ?? 0} staff</span>
                </div>
                {b.location && <p className="mt-1 text-xs text-slate-500">{b.location}</p>}
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {o?.staff.length ? o.staff.map(s => s.name || "Unnamed").join(", ") : "No staff assigned yet."}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Button asChild variant="outline"><Link to="/settings/users">Manage staff and branches</Link></Button>
    </div>
  );
}
