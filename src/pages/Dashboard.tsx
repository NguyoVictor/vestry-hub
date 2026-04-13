import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { formatCurrencyFull } from "@/lib/format";
import { useActivityLog } from "@/hooks/useActivityLog";
import {
  Users, TrendingUp, CalendarDays, UsersRound, UserPlus, CreditCard,
  Megaphone, ArrowUpRight, ArrowDownRight, Minus, MapPin, Clock,
  Activity, Sparkles, CheckCircle2, MessageSquare, Send,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";

// ─── Activity icon + colour map ──────────────────────────────────────────────
const ACTIVITY_META: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  new_member:          { icon: Users,        color: "text-indigo-600",  bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  member_updated:      { icon: Users,        color: "text-indigo-600",  bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  member_removed:      { icon: Users,        color: "text-slate-500",   bg: "bg-slate-100 dark:bg-slate-800" },
  new_donation:        { icon: CreditCard,   color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  new_event:           { icon: CalendarDays, color: "text-violet-600",  bg: "bg-violet-100 dark:bg-violet-900/30" },
  event_updated:       { icon: CalendarDays, color: "text-violet-600",  bg: "bg-violet-100 dark:bg-violet-900/30" },
  event_cancelled:     { icon: CalendarDays, color: "text-red-500",     bg: "bg-red-100 dark:bg-red-900/30" },
  new_announcement:    { icon: Megaphone,    color: "text-amber-600",   bg: "bg-amber-100 dark:bg-amber-900/30" },
  announcement_published: { icon: Megaphone, color: "text-amber-600",  bg: "bg-amber-100 dark:bg-amber-900/30" },
  new_visitor:         { icon: UserPlus,     color: "text-cyan-600",    bg: "bg-cyan-100 dark:bg-cyan-900/30" },
  visitor_converted:   { icon: UserPlus,     color: "text-cyan-600",    bg: "bg-cyan-100 dark:bg-cyan-900/30" },
  new_convert:         { icon: Sparkles,     color: "text-indigo-600",  bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  stage_advanced:      { icon: Sparkles,     color: "text-indigo-600",  bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  convert_graduated:   { icon: Sparkles,     color: "text-indigo-600",  bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  baptism_completed:   { icon: Sparkles,     color: "text-indigo-600",  bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  attendance_recorded: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  new_request:         { icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
  request_resolved:    { icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
  new_broadcast:       { icon: Send,         color: "text-blue-600",    bg: "bg-blue-100 dark:bg-blue-900/30" },
};

function getActivityMeta(actionType: string) {
  return ACTIVITY_META[actionType] ?? { icon: Activity, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" };
}

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  indigo: { bg: "bg-indigo-100 dark:bg-indigo-950", text: "text-indigo-600" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-950", text: "text-emerald-600" },
  violet: { bg: "bg-violet-100 dark:bg-violet-950", text: "text-violet-600" },
  amber: { bg: "bg-amber-100 dark:bg-amber-950", text: "text-amber-600" },
};

const StatCard = ({ title, value, icon: Icon, color, loading, trend }: {
  title: string; value: string | number; icon: LucideIcon; color: string; loading: boolean; trend?: number;
}) => {
  const colors = COLOR_MAP[color] || COLOR_MAP.indigo;
  return (
    <Card>
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <>
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg}`}>
              <Icon className={`h-5 w-5 ${colors.text}`} />
            </div>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{title}</span>
              {trend !== undefined && (
                <span className={`inline-flex items-center text-xs font-medium ${
                  trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-500" : "text-muted-foreground"
                }`}>
                  {trend > 0 ? <ArrowUpRight className="mr-0.5 h-3 w-3" /> :
                   trend < 0 ? <ArrowDownRight className="mr-0.5 h-3 w-3" /> :
                   <Minus className="mr-0.5 h-3 w-3" />}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

const Dashboard = () => {
  const church = useChurch();
  const [chartMonths, setChartMonths] = useState(6);

  // Single RPC call replaces 4 separate stat queries — per vestry-project.md performance rules
  const { data: dashStats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats", church.tenantId],
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_stats", { p_tenant_id: church.tenantId });
      if (error) throw error;
      return data as { member_count: number; giving_month: number; events_week: number; group_count: number };
    },
  });

  const membersLoading = statsLoading;
  const givingLoading = statsLoading;
  const eventsLoading = statsLoading;
  const groupsLoading = statsLoading;
  const memberCount = dashStats?.member_count ?? 0;
  const givingTotal = dashStats?.giving_month ?? 0;
  const eventsCount = dashStats?.events_week ?? 0;
  const groupCount = dashStats?.group_count ?? 0;

  const { data: givingTrend, isLoading: trendLoading } = useQuery({
    queryKey: ["dashboard", "giving-trend", chartMonths, church.tenantId],
    staleTime: 60_000,
    queryFn: async () => {
      const start = new Date();
      start.setMonth(start.getMonth() - chartMonths);
      const { data } = await supabase.from("giving_records").select("amount, given_at")
        .eq("tenant_id", church.tenantId)
        .gte("given_at", start.toISOString().split("T")[0]).order("given_at", { ascending: true });
      const monthly: Record<string, number> = {};
      data?.forEach(r => {
        const m = r.given_at.substring(0, 7);
        monthly[m] = (monthly[m] || 0) + Number(r.amount);
      });
      return Object.entries(monthly).map(([m, total]) => ({
        month: new Date(m + "-15").toLocaleDateString("en", { month: "short" }),
        total,
      }));
    },
  });

  const { data: groupDistribution, isLoading: distLoading } = useQuery({
    queryKey: ["dashboard", "group-distribution", church.tenantId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: groups } = await supabase.from("groups").select("id, name").eq("tenant_id", church.tenantId).eq("is_active", true);
      if (!groups?.length) return [];
      const { data: gm } = await supabase.from("group_members").select("group_id").eq("tenant_id", church.tenantId);
      const counts: Record<string, number> = {};
      gm?.forEach(m => { counts[m.group_id] = (counts[m.group_id] || 0) + 1; });
      return groups.map(g => ({ name: g.name, value: counts[g.id] || 0 }))
        .sort((a, b) => b.value - a.value).slice(0, 5);
    },
  });

  const { data: upcomingEvents, isLoading: upEventsLoading } = useQuery({
    queryKey: ["dashboard", "upcoming-events-list", church.tenantId],
    staleTime: 60_000,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("events").select("id, title, event_date, start_time, location")
        .eq("tenant_id", church.tenantId)
        .gte("event_date", today).order("event_date", { ascending: true }).limit(5);
      return data || [];
    },
  });

  const { data: recentDonations, isLoading: donationsLoading } = useQuery({
    queryKey: ["dashboard", "recent-donations", church.tenantId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("giving_records")
        .select("id, amount, giving_type, payment_method, given_at, currency")
        .eq("tenant_id", church.tenantId)
        .order("given_at", { ascending: false }).limit(8);
      return data || [];
    },
  });

  const totalGroupMembers = groupDistribution?.reduce((s, g) => s + g.value, 0) || 0;

  // Recent Activity — live feed with Realtime
  const { data: activityEntries = [], isLoading: activityLoading } = useActivityLog(church.tenantId, 10);

  return (
    <>
      <Helmet><title>Dashboard — Vestry</title></Helmet>
      <PageHeader title="Dashboard" subtitle={`Welcome back! Here's what's happening at ${church.name}`} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Members" value={memberCount ?? 0} icon={Users} color="indigo" loading={membersLoading} />
        <StatCard title="Giving This Month" value={formatCurrencyFull(givingTotal ?? 0, church.currency)} icon={TrendingUp} color="emerald" loading={givingLoading} />
        <StatCard title="Upcoming Events" value={eventsCount ?? 0} icon={CalendarDays} color="violet" loading={eventsLoading} />
        <StatCard title="Active Groups" value={groupCount ?? 0} icon={UsersRound} color="amber" loading={groupsLoading} />
      </div>

      {/* Charts Row */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Giving Overview</CardTitle>
            <div className="flex gap-1">
              {[3, 6, 12].map(m => (
                <Button key={m} variant={chartMonths === m ? "default" : "ghost"} size="sm"
                  className="h-7 text-xs" onClick={() => setChartMonths(m)}>
                  {m}mo
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {trendLoading ? <Skeleton className="h-[280px] w-full" /> : givingTrend?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={givingTrend}>
                  <defs>
                    <linearGradient id="givingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(value: number) => [formatCurrencyFull(value, church.currency), "Total"]} />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="url(#givingGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground">No giving data yet</div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Group Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {distLoading ? <Skeleton className="mx-auto h-[200px] w-[200px] rounded-full" /> :
               groupDistribution?.length ? (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie data={groupDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" paddingAngle={3}>
                          {groupDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-xl font-bold text-foreground">{totalGroupMembers}</p>
                        <p className="text-xs text-muted-foreground">members</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                    {groupDistribution.map((g, i) => (
                      <div key={g.name} className="flex items-center gap-2 text-xs">
                        <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="truncate text-muted-foreground">{g.name}</span>
                        <span className="font-medium">{g.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No groups yet</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Add Member", icon: UserPlus, href: "/members" },
                  { label: "Record Giving", icon: CreditCard, href: "/give-online" },
                  { label: "Create Event", icon: CalendarDays, href: "/events" },
                  { label: "Announcement", icon: Megaphone, href: "/announcements" },
                ].map(a => (
                  <Button key={a.label} variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
                    <Link to={a.href}>
                      <a.icon className="h-5 w-5 text-primary" />
                      <span className="text-xs">{a.label}</span>
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Upcoming Events</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link to="/events">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upEventsLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : upcomingEvents?.length ? (
              <div className="space-y-3">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <div className="h-full w-1 shrink-0 self-stretch rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{event.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.event_date), "EEE, d MMM")}
                          {event.start_time && ` · ${String(event.start_time).substring(0, 5)}`}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <CalendarDays className="mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No upcoming events</p>
                <Button variant="secondary" size="sm" className="mt-3" asChild><Link to="/events">Create Event</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityEntries.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Activity className="mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
                <p className="mt-1 text-xs text-muted-foreground">Actions across your church will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityEntries.map(entry => {
                  const meta = getActivityMeta(entry.action_type);
                  const Icon = meta.icon;
                  return (
                    <div key={entry.id} className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.bg}`}>
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">{entry.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {entry.actor_name && <span className="font-medium">{entry.actor_name} · </span>}
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Donations */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Recent Donations</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs" asChild><Link to="/giving-records">View All</Link></Button>
        </CardHeader>
        <CardContent>
          {donationsLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : recentDonations?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Method</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDonations.map(d => (
                  <TableRow key={d.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{d.giving_type?.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-600">
                      {formatCurrencyFull(Number(d.amount), d.currency || church.currency)}
                    </TableCell>
                    <TableCell className="hidden capitalize sm:table-cell text-muted-foreground">
                      {d.payment_method?.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {format(new Date(d.given_at), "d MMM yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <CreditCard className="mb-2 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No donations recorded yet</p>
              <Button variant="secondary" size="sm" className="mt-3" asChild><Link to="/give-online">Record Giving</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default Dashboard;
