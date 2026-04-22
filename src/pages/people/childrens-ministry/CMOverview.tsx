import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageTransition } from "@/components/ui/PageTransition";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSkeleton, StatCardSkeletons } from "@/components/ui/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TABLES } from "@/lib/schema";
import { format } from "date-fns";
import { Baby, CheckSquare, BookOpen, Users, UserPlus, Monitor, BarChart2, Clock, CheckCircle2 } from "lucide-react";
import { childGradient, calcAge } from "./types";
import { cn } from "@/lib/utils";
import { useState } from "react";
import RegisterChildModal from "./RegisterChildModal";

export default function CMOverview() {
  const { tenantId } = useChurch();
  const navigate = useNavigate();
  const [registerOpen, setRegisterOpen] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["cm-stats", tenantId],
    queryFn: async () => {
      const [childrenRes, classesRes, familiesRes, checkinsRes] = await Promise.all([
        supabase.from(TABLES.CHILDREN).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!).eq("active", true),
        supabase.from(TABLES.CHILDREN_CLASSES).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!).eq("active", true),
        supabase.from(TABLES.CHILDREN).select("guardian_primary_id").eq("tenant_id", tenantId!).eq("active", true),
        supabase.from(TABLES.CHILDREN_CHECKINS).select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId!).gte("checked_in_at", today + "T00:00:00").is("checked_out_at", null),
      ]);
      const uniqueGuardians = new Set(familiesRes.data?.map(c => c.guardian_primary_id).filter(Boolean)).size;
      return {
        totalChildren: childrenRes.count ?? 0,
        checkedInToday: checkinsRes.count ?? 0,
        activeClasses: classesRes.count ?? 0,
        familiesWithChildren: uniqueGuardians,
      };
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  // Today's service
  const { data: todayService } = useQuery({
    queryKey: ["cm-today-service", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.SERVICES)
        .select("id, name, start_time")
        .eq("tenant_id", tenantId!)
        .eq("service_date", today)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  // Recent check-ins
  const { data: recentCheckins = [], isLoading: checkinsLoading } = useQuery({
    queryKey: ["cm-recent-checkins", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.CHILDREN_CHECKINS)
        .select("*, child:children(first_name, last_name, class:children_classes(name), guardian_primary:members!children_guardian_primary_id_fkey(first_name, last_name))")
        .eq("tenant_id", tenantId!)
        .order("checked_in_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  return (
    <>
      <Helmet><title>Children's Ministry — Vestry</title></Helmet>
      <PageTransition>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Children's Ministry</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage check-in, attendance, and child records</p>
          </div>
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={() => setRegisterOpen(true)}>
            <UserPlus className="h-4 w-4" />Register Child
          </Button>
        </div>

        {/* Stats */}
        {statsLoading ? <StatCardSkeletons count={4} /> : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Baby}       label="Total Children"        value={stats?.totalChildren ?? 0}       color="orange" />
            <StatCard icon={CheckSquare} label="Checked In Today"     value={stats?.checkedInToday ?? 0}      color="emerald" />
            <StatCard icon={BookOpen}   label="Active Classes"        value={stats?.activeClasses ?? 0}       color="blue" />
            <StatCard icon={Users}      label="Families with Children" value={stats?.familiesWithChildren ?? 0} color="purple" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Today's service + recent check-ins */}
          <div className="lg:col-span-2 space-y-5">
            {/* Today's service card */}
            {todayService ? (
              <div className="bg-white rounded-xl border-l-4 border-l-orange-500 border border-slate-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Service Active Today</span>
                    </div>
                    <p className="text-base font-semibold text-slate-800">{todayService.name}</p>
                    {todayService.start_time && (
                      <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {String(todayService.start_time).substring(0, 5)}
                      </p>
                    )}
                    <p className="text-sm text-slate-600 mt-1">
                      <span className="font-semibold text-orange-600">{stats?.checkedInToday ?? 0}</span> children checked in so far
                    </p>
                  </div>
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white shrink-0" onClick={() => navigate("/childrens-ministry/checkin")}>
                    Open Check-in
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-3 text-slate-400">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Baby className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">No service scheduled today</p>
                    <p className="text-xs text-slate-400">Check-in will be available when a service is added for today</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent check-ins */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">Recent Check-ins</p>
              </div>
              {checkinsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-24" /></div>
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : recentCheckins.length === 0 ? (
                <EmptyState icon={CheckSquare} title="No check-ins yet" description="Check-ins will appear here once children arrive." className="py-10" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Child", "Class", "Check-in Time", "Status", "Guardian"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentCheckins.map((ci: any) => {
                      const name = `${ci.child?.first_name ?? ""} ${ci.child?.last_name ?? ""}`.trim();
                      const grad = childGradient(name);
                      const ini = `${ci.child?.first_name?.[0] ?? ""}${ci.child?.last_name?.[0] ?? ""}`.toUpperCase();
                      const isOut = !!ci.checked_out_at;
                      return (
                        <tr key={ci.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={cn("h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shrink-0", grad)}>{ini}</div>
                              <span className="font-medium text-slate-800">{name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{ci.child?.class?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{format(new Date(ci.checked_in_at), "h:mm a")}</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", isOut ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700")}>
                              {isOut ? "Checked Out" : "Checked In"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {ci.child?.guardian_primary ? `${ci.child.guardian_primary.first_name} ${ci.child.guardian_primary.last_name}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right: Quick actions */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Quick Actions</p>
            {[
              { icon: UserPlus,  label: "Register Child",  desc: "Add a new child to the ministry", action: () => setRegisterOpen(true), primary: true },
              { icon: Monitor,   label: "Kiosk Mode",      desc: "Full-screen tablet check-in",     action: () => navigate("/childrens-ministry/kiosk"), primary: false },
              { icon: BarChart2, label: "View Reports",    desc: "Attendance analytics",             action: () => navigate("/childrens-ministry/reports"), primary: false },
            ].map(({ icon: Icon, label, desc, action, primary }) => (
              <button key={label} onClick={action}
                className={cn("w-full text-left bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-0.5",
                  primary ? "border-orange-200 hover:border-orange-300" : "border-slate-200"
                )}>
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", primary ? "bg-orange-50" : "bg-slate-100")}>
                  <Icon className={cn("h-5 w-5", primary ? "text-orange-500" : "text-slate-500")} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </PageTransition>

      <RegisterChildModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </>
  );
}
