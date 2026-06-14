import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PageTransition } from "@/components/ui/PageTransition";
import { StatCard } from "@/components/ui/StatCard";
import { StatCardSkeletons } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReadOnlyBanner } from "@/components/shared/ReadOnlyBanner";
import { PermissionButton } from "@/components/shared/PermissionButton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TABLES } from "@/lib/schema";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { BarChart2, Download, TrendingUp, Users, Calendar, Percent } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

type Range = "this_month" | "last_month" | "3_months";

export default function CMReports() {
  const { tenantId } = useChurch();
  const { isReadOnly } = usePermissions();
  const reportsReadOnly = isReadOnly('reports_analytics');
  const [range, setRange] = useState<Range>("this_month");
  const [classFilter, setClassFilter] = useState("all");

  const getDateRange = () => {
    const now = new Date();
    if (range === "this_month") return { from: startOfMonth(now), to: endOfMonth(now) };
    if (range === "last_month") { const lm = subMonths(now, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; }
    return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
  };

  const { from, to } = getDateRange();

  const { data: classes = [] } = useQuery({
    queryKey: ["children-classes", tenantId],
    queryFn: async () => { const { data } = await supabase.from(TABLES.CHILDREN_CLASSES).select("id, name").eq("tenant_id", tenantId!).order("min_age"); return data ?? []; },
    enabled: !!tenantId, staleTime: 300_000,
  });

  const { data: checkins = [], isLoading } = useQuery({
    queryKey: ["cm-checkins-report", tenantId, range, classFilter],
    queryFn: async () => {
      let q = supabase.from(TABLES.CHILDREN_CHECKINS)
        .select("*, child:children(first_name, last_name, class_id, class:children_classes(name), guardian_primary:members!children_guardian_primary_id_fkey(first_name, last_name))")
        .eq("tenant_id", tenantId!)
        .gte("checked_in_at", from.toISOString())
        .lte("checked_in_at", to.toISOString())
        .order("checked_in_at", { ascending: false });
      const { data } = await q;
      const all = data ?? [];
      if (classFilter !== "all") return all.filter((ci: any) => ci.child?.class_id === classFilter);
      return all;
    },
    enabled: !!tenantId, staleTime: 60_000,
  });

  const { data: totalChildren = 0 } = useQuery({
    queryKey: ["cm-total-children", tenantId],
    queryFn: async () => { const { count } = await supabase.from(TABLES.CHILDREN).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!).eq("active", true); return count ?? 0; },
    enabled: !!tenantId, staleTime: 300_000,
  });

  // Aggregate by service date for chart
  const byDate: Record<string, number> = {};
  checkins.forEach((ci: any) => {
    const d = ci.checked_in_at.substring(0, 10);
    byDate[d] = (byDate[d] ?? 0) + 1;
  });
  const chartData = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({
    date: format(new Date(date), "d MMM"),
    count,
  }));

  // Per-child stats
  const childMap: Record<string, { name: string; class: string; guardian: string; count: number }> = {};
  checkins.forEach((ci: any) => {
    const id = ci.child_id;
    if (!childMap[id]) childMap[id] = {
      name: `${ci.child?.first_name ?? ""} ${ci.child?.last_name ?? ""}`.trim(),
      class: ci.child?.class?.name ?? "—",
      guardian: ci.child?.guardian_primary ? `${ci.child.guardian_primary.first_name} ${ci.child.guardian_primary.last_name}` : "—",
      count: 0,
    };
    childMap[id].count++;
  });
  const childRows = Object.values(childMap).sort((a, b) => b.count - a.count);

  const totalServices = Object.keys(byDate).length;
  const avgPerService = totalServices ? Math.round(checkins.length / totalServices) : 0;
  const attendanceRate = totalChildren ? Math.round((Object.keys(childMap).length / totalChildren) * 100) : 0;

  const exportCSV = () => {
    const rows = childRows.map(r => ({ Child: r.name, Class: r.class, Guardian: r.guardian, "Check-ins": r.count, "Total Services": totalServices, "Rate %": totalServices ? Math.round((r.count / totalServices) * 100) : 0 }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "cm-attendance.csv"; a.click();
  };

  return (
    <>
      <Helmet><title>Reports — Children's Ministry</title></Helmet>
      <PageTransition>
        {reportsReadOnly && <div className="mb-6"><ReadOnlyBanner permission="reports_analytics" /></div>}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Reports</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track children's ministry attendance over time</p>
          </div>
          <PermissionButton readOnly={reportsReadOnly} variant="outline" size="sm" className="gap-2 border-slate-200" onClick={exportCSV}>
            <Download className="h-4 w-4" />Export CSV
          </PermissionButton>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {(["this_month", "last_month", "3_months"] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", range === r ? "bg-orange-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-orange-300")}>
              {r === "this_month" ? "This Month" : r === "last_month" ? "Last Month" : "Last 3 Months"}
            </button>
          ))}
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="h-9 w-40 border-slate-200 text-sm"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        {isLoading ? <StatCardSkeletons count={4} /> : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={TrendingUp} label="Avg per Service"    value={avgPerService}       color="orange" />
            <StatCard icon={Users}      label="Total Check-ins"    value={checkins.length}     color="emerald" />
            <StatCard icon={Calendar}   label="Services Tracked"   value={totalServices}       color="blue" />
            <StatCard icon={Percent}    label="Attendance Rate"    value={`${attendanceRate}%`} color="purple" animate={false} />
          </div>
        )}

        {/* Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <p className="text-sm font-semibold text-slate-800 mb-4">Attendance Over Time</p>
          {isLoading ? <Skeleton className="h-52 w-full" /> : chartData.length === 0 ? (
            <EmptyState icon={BarChart2} title="No data for this period" className="py-8" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316", r: 3 }} name="Children" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Per-child table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Per-Child Attendance</p>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : childRows.length === 0 ? (
            <EmptyState icon={Users} title="No attendance data" description="Check-ins will appear here once children are checked in." className="py-10" />
          ) : (
            <table className="w-full text-sm font-jakarta">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Child", "Class", "Guardian", "Attended", "Total Services", "Rate"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {childRows.map((row, i) => {
                  const rate = totalServices ? Math.round((row.count / totalServices) * 100) : 0;
                  const rateColor = rate >= 80 ? "bg-emerald-100 text-emerald-700" : rate >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
                  return (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">{row.class}</span></td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{row.guardian}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{row.count}</td>
                      <td className="px-4 py-3 text-slate-500">{totalServices}</td>
                      <td className="px-4 py-3"><span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", rateColor)}>{rate}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </PageTransition>
    </>
  );
}
