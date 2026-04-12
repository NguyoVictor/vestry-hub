import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { toast } from "sonner";
import { format, startOfWeek, startOfMonth, subWeeks } from "date-fns";
import {
  Users, GraduationCap, Droplets, AlertTriangle, TrendingUp,
  Heart, UserPlus, ChevronRight, ArrowRight,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

// ─── Onboarding Journey Stepper ───────────────────────────────────────────────

const JOURNEY_STEPS = [
  { label: "Visitor", icon: UserPlus, color: "bg-slate-100 text-slate-600" },
  { label: "Follow-up", icon: Heart, color: "bg-rose-100 text-rose-600" },
  { label: "New Convert", icon: Heart, color: "bg-orange-100 text-orange-600" },
  { label: "Baptism", icon: Droplets, color: "bg-blue-100 text-blue-600" },
  { label: "Membership", icon: Users, color: "bg-indigo-100 text-indigo-600" },
  { label: "Ministry", icon: TrendingUp, color: "bg-violet-100 text-violet-600" },
  { label: "Graduation", icon: GraduationCap, color: "bg-emerald-100 text-emerald-600" },
];

function OnboardingJourney() {
  return (
    <Card className="mb-6">
      <CardContent className="p-5">
        <p className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">Onboarding Journey</p>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {JOURNEY_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex items-center gap-1 shrink-0">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`p-2.5 rounded-full ${step.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium text-center whitespace-nowrap">{step.label}</span>
                </div>
                {i < JOURNEY_STEPS.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 mb-4" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status badge helper ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-red-100 text-red-700",
    contacted: "bg-amber-100 text-amber-700",
    integrated: "bg-emerald-100 text-emerald-700",
    "in_progress": "bg-indigo-100 text-indigo-700",
  };
  return (
    <Badge className={`${map[status] || "bg-slate-100 text-slate-700"} hover:opacity-90 capitalize text-xs`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Discipleship() {
  const { tenantId } = useChurch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const now = new Date();
  const weekStart = startOfWeek(now).toISOString();
  const monthStart = startOfMonth(now).toISOString();
  const twoWeeksAgo = subWeeks(now, 2).toISOString();

  // ── Overview stats ─────────────────────────────────────────────────────────
  const { data: overviewStats, isLoading: statsLoading } = useQuery({
    queryKey: ["discipleship-overview-stats", tenantId],
    queryFn: async () => {
      const [visitorsRes, newConvertsRes, followUpTasksRes] = await Promise.all([
        supabase.from(TABLES.VISITORS).select("id, follow_up_status, created_at").eq(COLS.TENANT_ID, tenantId!),
        supabase.from(TABLES.NEW_CONVERTS).select("id, baptism_status, discipleship_stage, updated_at, created_at").eq(COLS.TENANT_ID, tenantId!),
        supabase.from(TABLES.FOLLOW_UP_TASKS).select("id, due_date, status").eq(COLS.TENANT_ID, tenantId!),
      ]);

      const visitors = visitorsRes.data || [];
      const converts = newConvertsRes.data || [];
      const tasks = followUpTasksRes.data || [];

      const visitorsThisWeek = visitors.filter(v => v.created_at >= weekStart).length;
      const notYetContacted = visitors.filter(v => v.follow_up_status === "new").length;
      const newConvertsMonth = converts.filter(c => c.created_at >= monthStart).length;
      const baptismsMonth = converts.filter(c => c.baptism_status === "completed" && c.updated_at >= monthStart).length;
      const overdueFollowUps = tasks.filter(t => t.due_date && t.due_date < now.toISOString() && t.status !== "completed").length;
      const atRiskConverts = converts.filter(c => !c.updated_at || c.updated_at < twoWeeksAgo).length;
      const membershipClassMonth = converts.filter(c => Number(c.discipleship_stage) >= 3 && c.updated_at >= monthStart).length;

      return {
        visitorsThisWeek,
        notYetContacted,
        newConvertsMonth,
        baptismsMonth,
        overdueFollowUps,
        atRiskConverts,
        membershipClassMonth,
        visitors,
        converts,
      };
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  // ── Recent visitors & converts ─────────────────────────────────────────────
  const { data: recentVisitors = [] } = useQuery({
    queryKey: ["recent-visitors-discipleship", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.VISITORS)
        .select("id, first_name, last_name, follow_up_status, created_at")
        .eq(COLS.TENANT_ID, tenantId!)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const { data: recentConverts = [] } = useQuery({
    queryKey: ["recent-converts-discipleship", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.NEW_CONVERTS)
        .select("id, first_name, last_name, salvation_date, conversion_date, created_at")
        .eq(COLS.TENANT_ID, tenantId!)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  // ── Chart data ─────────────────────────────────────────────────────────────
  const visitors = overviewStats?.visitors || [];
  const converts = overviewStats?.converts || [];

  const pieData = [
    { name: "New", value: visitors.filter(v => v.follow_up_status === "new").length, color: "#EF4444" },
    { name: "Contacted", value: visitors.filter(v => v.follow_up_status === "contacted").length, color: "#F59E0B" },
    { name: "Integrated", value: visitors.filter(v => v.follow_up_status === "integrated").length, color: "#10B981" },
  ].filter(d => d.value > 0);

  const funnelData = [
    { name: "Visitors", value: visitors.length },
    { name: "New Converts", value: converts.length },
    { name: "Baptized", value: converts.filter(c => c.baptism_status === "completed").length },
    { name: "Members", value: converts.filter(c => Number(c.discipleship_stage) >= 3).length },
    { name: "Workers", value: converts.filter(c => Number(c.discipleship_stage) >= 4).length },
  ];

  const statCards = [
    { label: "Visitors This Week", value: overviewStats?.visitorsThisWeek ?? 0, icon: UserPlus, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { label: "Not Yet Contacted", value: overviewStats?.notYetContacted ?? 0, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
    { label: "New Converts (Month)", value: overviewStats?.newConvertsMonth ?? 0, icon: Heart, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
    { label: "Baptisms (Month)", value: overviewStats?.baptismsMonth ?? 0, icon: Droplets, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Overdue Follow-ups", value: overviewStats?.overdueFollowUps ?? 0, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "At-Risk Converts", value: overviewStats?.atRiskConverts ?? 0, icon: Users, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20" },
  ];

  return (
    <>
      <Helmet><title>Discipleship Dashboard — Vestry</title></Helmet>
      <PageHeader
        title="Discipleship Dashboard"
        subtitle="Track the full spiritual growth journey from visitor to ministry"
        action={
          <Button variant="outline" onClick={() => navigate("/discipleship/graduates")}>
            View Graduates <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        }
      />

      <OnboardingJourney />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="journey">28-Day Journey</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`rounded-lg p-2.5 ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    {statsLoading ? <Skeleton className="h-7 w-10 mb-1" /> : <p className="text-2xl font-bold">{value}</p>}
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Visitors by Status</CardTitle></CardHeader>
              <CardContent>
                {statsLoading ? <Skeleton className="h-48 w-full" /> : pieData.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No visitor data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Conversion Funnel</CardTitle></CardHeader>
              <CardContent>
                {statsLoading ? <Skeleton className="h-48 w-full" /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={funnelData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="value" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Recent Visitors</CardTitle>
                <Button variant="link" size="sm" asChild className="h-auto p-0"><Link to="/visitors">View all</Link></Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentVisitors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No visitors yet</p>
                ) : recentVisitors.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MemberAvatar name={`${v.first_name} ${v.last_name || ""}`} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{v.first_name} {v.last_name || ""}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(v.created_at), "dd MMM yyyy")}</p>
                      </div>
                    </div>
                    <StatusBadge status={v.follow_up_status || "new"} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Recent New Converts</CardTitle>
                <Button variant="link" size="sm" asChild className="h-auto p-0"><Link to="/new-converts">View all</Link></Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentConverts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No converts yet</p>
                ) : recentConverts.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MemberAvatar name={`${c.first_name} ${c.last_name || ""}`} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{c.first_name} {c.last_name || ""}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.salvation_date || c.conversion_date
                            ? format(new Date(c.salvation_date || c.conversion_date), "dd MMM yyyy")
                            : format(new Date(c.created_at), "dd MMM yyyy")}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs">In Progress</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── 28-Day Journey Tab ── */}
        <TabsContent value="journey">
          <Card>
            <CardContent className="p-8 text-center">
              <GraduationCap className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">28-Day Journey</p>
              <p className="text-sm text-muted-foreground mt-1">Structured discipleship pathway coming soon.</p>
              <Button className="mt-4" asChild>
                <Link to="/new-converts">View New Converts</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
