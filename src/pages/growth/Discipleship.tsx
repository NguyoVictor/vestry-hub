import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StageProgressBar } from "@/components/growth/StageProgressBar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, formatDistanceToNow, subMonths, startOfMonth, differenceInDays } from "date-fns";
import {
  TrendingUp, Users, GraduationCap, Droplets, Clock, ChevronRight,
  UserPlus, AlertTriangle, CheckCircle2, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const STAGES = [
  { label: "Foundation", description: "Basic Christian beliefs" },
  { label: "Growth", description: "Spiritual disciplines" },
  { label: "Maturity", description: "Serving & giving" },
  { label: "Leadership", description: "Discipling others" },
];

const ACTIVITY_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  new_convert: { icon: UserPlus, color: "text-indigo-500" },
  stage_advanced: { icon: TrendingUp, color: "text-emerald-500" },
  convert_graduated: { icon: GraduationCap, color: "text-violet-500" },
  baptism_completed: { icon: Droplets, color: "text-blue-500" },
  checkin_logged: { icon: CheckCircle2, color: "text-amber-500" },
};

export default function Discipleship() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [checkinSheet, setCheckinSheet] = useState<{ open: boolean; convertId?: string; convertName?: string }>({ open: false });
  const [advanceSheet, setAdvanceSheet] = useState<{ open: boolean; convertId?: string; convertName?: string; currentStage?: number }>({ open: false });
  const [checkinForm, setCheckinForm] = useState({ checkin_date: format(new Date(), "yyyy-MM-dd"), notes: "", next_checkin_date: "" });
  const [advanceForm, setAdvanceForm] = useState({ notes: "", baptism_status: "" });

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["discipleship-stats", tenantId],
    queryFn: async () => {
      const { data: converts } = await supabase
        .from("new_converts")
        .select("id, discipleship_stage, graduated_at, conversion_date, baptism_status")
        .eq("church_id", tenantId);
      const all = converts || [];
      const thisYear = new Date().getFullYear();
      const active = all.filter(c => !c.graduated_at).length;
      const graduated = all.filter(c => c.graduated_at && new Date(c.graduated_at).getFullYear() === thisYear).length;
      const pendingBaptisms = all.filter(c => c.baptism_status === "scheduled").length;
      const graduatedWithDates = all.filter(c => c.graduated_at && c.conversion_date);
      const avgDays = graduatedWithDates.length > 0
        ? Math.round(graduatedWithDates.reduce((acc, c) => {
            const diff = (new Date(c.graduated_at!).getTime() - new Date(c.conversion_date!).getTime()) / 86400000;
            return acc + diff;
          }, 0) / graduatedWithDates.length)
        : 0;
      return { active, graduated, pendingBaptisms, avgDays };
    },
    enabled: !!tenantId,
  });

  // Stage breakdown
  const { data: stageData, isLoading: stageLoading } = useQuery({
    queryKey: ["discipleship-stages", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("new_converts")
        .select("id, discipleship_stage, first_name, last_name, updated_at, conversion_date")
        .eq("church_id", tenantId)
        .is("graduated_at", null);
      const converts = data || [];
      const total = converts.length;
      const now = new Date();
      return STAGES.map((stage, i) => {
        const stageNum = i + 1;
        const members = converts.filter(c => (c.discipleship_stage || 1) === stageNum);
        // "ready to advance": in this stage > 30 days and no check-in in last 14 days
        const readyToAdvance = members.filter(m => {
          const daysSinceConversion = differenceInDays(now, new Date(m.conversion_date || m.updated_at));
          const daysSinceUpdate = differenceInDays(now, new Date(m.updated_at));
          return daysSinceConversion > 30 && daysSinceUpdate > 14;
        }).length;
        return { ...stage, stageNum, count: members.length, pct: total > 0 ? Math.round((members.length / total) * 100) : 0, members: members.slice(0, 4), readyToAdvance };
      });
    },
    enabled: !!tenantId,
  });

  // Needs attention
  const { data: needsAttention = [], isLoading: attentionLoading } = useQuery({
    queryKey: ["discipleship-attention", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("new_converts")
        .select("id, first_name, last_name, discipleship_stage, mentor_id, baptism_status, baptism_date, updated_at, conversion_date")
        .eq("church_id", tenantId)
        .is("graduated_at", null);
      const now = new Date();
      return (data || []).filter(c => {
        const daysSinceUpdate = (now.getTime() - new Date(c.updated_at).getTime()) / 86400000;
        const daysSinceConversion = (now.getTime() - new Date(c.conversion_date).getTime()) / 86400000;
        return daysSinceUpdate > 21 || (c.baptism_status === "scheduled" && c.baptism_date && new Date(c.baptism_date) < now) || daysSinceConversion > 60;
      }).slice(0, 20);
    },
    enabled: !!tenantId,
  });

  // Upcoming baptisms
  const { data: baptisms = [], isLoading: baptismsLoading } = useQuery({
    queryKey: ["upcoming-baptisms", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("new_converts")
        .select("id, first_name, last_name, baptism_date, mentor_id")
        .eq("church_id", tenantId)
        .eq("baptism_status", "scheduled")
        .order("baptism_date", { ascending: true });
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Pipeline chart
  const { data: pipelineData = [] } = useQuery({
    queryKey: ["discipleship-pipeline", tenantId],
    queryFn: async () => {
      const months = Array.from({ length: 12 }, (_, i) => {
        const d = subMonths(new Date(), 11 - i);
        return { month: format(d, "MMM"), start: startOfMonth(d).toISOString(), end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString() };
      });
      const { data } = await supabase.from("new_converts").select("conversion_date, graduated_at, baptism_status, baptism_date").eq("church_id", tenantId);
      const converts = data || [];
      return months.map(m => ({
        month: m.month,
        "New Converts": converts.filter(c => c.conversion_date >= m.start && c.conversion_date <= m.end).length,
        "Graduated": converts.filter(c => c.graduated_at && c.graduated_at >= m.start && c.graduated_at <= m.end).length,
        "Baptized": converts.filter(c => c.baptism_status === "completed" && c.baptism_date && c.baptism_date >= m.start && c.baptism_date <= m.end).length,
      }));
    },
    enabled: !!tenantId,
  });

  // Activity feed
  const { data: activityFeed = [] } = useQuery({
    queryKey: ["discipleship-activity", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .eq("church_id", tenantId)
        .in("action_type", ["new_convert", "stage_advanced", "convert_graduated", "baptism_completed", "checkin_logged"])
        .order("created_at", { ascending: false })
        .limit(15);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const markBaptized = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("new_converts").update({ baptism_status: "completed", baptism_date: new Date().toISOString().split("T")[0] }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming-baptisms", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["discipleship-stats", tenantId] });
      toast.success("Baptism marked as completed");
    },
    onError: () => toast.error("Failed to update baptism"),
  });

  const logCheckin = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("convert_checkins").insert({
        convert_id: checkinSheet.convertId,
        church_id: tenantId,
        checkin_date: checkinForm.checkin_date,
        notes: checkinForm.notes,
        next_checkin_date: checkinForm.next_checkin_date || null,
      });
      if (error) throw error;
      await supabase.from("new_converts").update({ updated_at: new Date().toISOString() }).eq("id", checkinSheet.convertId);
      await supabase.from("activity_log").insert({
        church_id: tenantId,
        action_type: "checkin_logged",
        description: `${checkinSheet.convertName} had a check-in`,
        entity_id: checkinSheet.convertId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipleship-attention", tenantId] });
      setCheckinSheet({ open: false });
      toast.success("Check-in logged");
    },
    onError: () => toast.error("Failed to log check-in"),
  });

  const advanceStage = useMutation({
    mutationFn: async () => {
      const nextStage = (advanceSheet.currentStage || 1) + 1;
      const { error } = await supabase.from("new_converts").update({
        discipleship_stage: nextStage,
        ...(advanceForm.baptism_status ? { baptism_status: advanceForm.baptism_status } : {}),
      }).eq("id", advanceSheet.convertId);
      if (error) throw error;
      await supabase.from("convert_stage_history").insert({
        convert_id: advanceSheet.convertId,
        church_id: tenantId,
        stage: nextStage,
        notes: advanceForm.notes,
      });
      await supabase.from("activity_log").insert({
        church_id: tenantId,
        action_type: "stage_advanced",
        description: `${advanceSheet.convertName} advanced to Stage ${nextStage} (${STAGES[nextStage - 1]?.label})`,
        entity_id: advanceSheet.convertId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipleship-stages", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["discipleship-attention", tenantId] });
      setAdvanceSheet({ open: false });
      toast.success("Stage advanced");
    },
    onError: () => toast.error("Failed to advance stage"),
  });

  const attentionColumns: Column<any>[] = [
    { key: "name", header: "Disciple", render: r => <div className="flex items-center gap-2"><MemberAvatar name={`${r.first_name} ${r.last_name}`} size="sm" /><span className="text-sm font-medium">{r.first_name} {r.last_name}</span></div> },
    { key: "stage", header: "Stage", render: r => <StageProgressBar currentStage={r.discipleship_stage || 1} stages={STAGES} size="sm" /> },
    { key: "updated_at", header: "Last Check-in", render: r => { const days = Math.floor((Date.now() - new Date(r.updated_at).getTime()) / 86400000); return <span className={days > 21 ? "text-red-500 text-sm" : "text-sm"}>{days}d ago</span>; } },
    { key: "mentor", header: "Mentor", render: r => r.mentor_id ? <MemberAvatar name="Mentor" size="sm" /> : <span className="text-xs text-muted-foreground">Unassigned</span> },
    { key: "flag", header: "Flag Reason", render: r => {
      const now = Date.now();
      const daysSinceUpdate = Math.floor((now - new Date(r.updated_at).getTime()) / 86400000);
      const daysSinceConversion = Math.floor((now - new Date(r.conversion_date).getTime()) / 86400000);
      const pastBaptism = r.baptism_status === "scheduled" && r.baptism_date && new Date(r.baptism_date) < new Date();
      const reason = pastBaptism ? "Baptism overdue" : daysSinceUpdate > 21 ? "No check-in 21d+" : daysSinceConversion > 60 ? "Stuck 60d+" : "Needs attention";
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">{reason}</Badge>;
    }},
    { key: "actions", header: "Actions", render: r => (
      <div className="flex gap-1 flex-wrap">
        <Button size="sm" variant="ghost" asChild><Link to={`/new-converts`}>View</Link></Button>
        <Button size="sm" variant="ghost" onClick={() => setCheckinSheet({ open: true, convertId: r.id, convertName: `${r.first_name} ${r.last_name}` })}>Check-in</Button>
        {(r.discipleship_stage || 1) < 4 && <Button size="sm" variant="ghost" onClick={() => setAdvanceSheet({ open: true, convertId: r.id, convertName: `${r.first_name} ${r.last_name}`, currentStage: r.discipleship_stage || 1 })}>Advance</Button>}
      </div>
    )},
  ];

  return (
    <>
      <Helmet><title>Discipleship Dashboard — Vestry</title></Helmet>
      <PageHeader
        title="Discipleship Dashboard"
        subtitle="Track spiritual growth journeys for your congregation"
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/new-converts">View All Converts</Link></Button>
            <Button asChild><Link to="/new-converts?action=add"><UserPlus className="h-4 w-4 mr-1" />Add Convert</Link></Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Disciples", value: stats?.active ?? 0, icon: Users, color: "indigo" },
          { label: "Graduated This Year", value: stats?.graduated ?? 0, icon: GraduationCap, color: "emerald" },
          { label: "Pending Baptisms", value: stats?.pendingBaptisms ?? 0, icon: Droplets, color: "blue" },
          { label: "Avg Days to Graduate", value: stats?.avgDays ? `${stats.avgDays} days` : "—", icon: Clock, color: "violet" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              {statsLoading ? <Skeleton className="h-16 w-full" /> : (
                <>
                  <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
                    <Icon className={`h-5 w-5 text-${color}-600`} />
                  </div>
                  <p className="text-3xl font-bold">{value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{label}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stage Overview */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Disciples by Stage</CardTitle></CardHeader>
        <CardContent>
          {stageLoading ? <Skeleton className="h-32 w-full" /> : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(stageData || []).map((stage, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-2 relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${stage.count > 0 ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"}`}>
                    {stage.stageNum}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{stage.label}</p>
                    <p className="text-xs text-slate-500">{stage.description}</p>
                  </div>
                  <p className="text-3xl font-bold">{stage.count}</p>
                  <p className="text-sm text-slate-400">{stage.pct}% of total</p>
                  {stage.readyToAdvance > 0 && (
                    <p className="text-xs text-amber-600 font-medium">{stage.readyToAdvance} ready to advance</p>
                  )}
                  <div className="flex -space-x-2">
                    {stage.members.map((m: any) => (
                      <MemberAvatar key={m.id} name={`${m.first_name} ${m.last_name}`} size="sm" />
                    ))}
                    {stage.count > 4 && <span className="text-xs text-muted-foreground ml-1 self-center">+{stage.count - 4}</span>}
                  </div>
                  {i < 3 && <ChevronRight className="hidden lg:block absolute right-0 top-6 text-slate-300 translate-x-1/2" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attention + Baptisms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" /> Needs Attention
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{needsAttention.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={needsAttention}
                columns={attentionColumns}
                loading={attentionLoading}
                getRowId={r => r.id}
                emptyIcon={<CheckCircle2 className="h-8 w-8 text-emerald-400" />}
                emptyTitle="All disciples are on track"
                emptyDescription="No disciples require immediate attention"
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5 text-blue-500" />Upcoming Baptisms</CardTitle></CardHeader>
          <CardContent>
            {baptismsLoading ? <Skeleton className="h-40 w-full" /> : baptisms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Droplets className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No baptisms scheduled</p>
                <Button variant="link" size="sm" asChild className="mt-1"><Link to="/new-converts?action=add">Add a convert</Link></Button>
              </div>
            ) : (
              <div className="space-y-3">
                {baptisms.map((b: any) => {
                  const daysUntil = b.baptism_date ? differenceInDays(new Date(b.baptism_date), new Date()) : null;
                  return (
                    <div key={b.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <MemberAvatar name={`${b.first_name} ${b.last_name}`} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{b.first_name} {b.last_name}</p>
                          {b.baptism_date && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(b.baptism_date), "dd MMM yyyy")}
                              {daysUntil !== null && (
                                <span className={`ml-1 ${daysUntil < 0 ? "text-red-500" : "text-emerald-600"}`}>
                                  {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? "today" : `in ${daysUntil}d`}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => markBaptized.mutate(b.id)}>Done</Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Chart */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Discipleship Pipeline — Last 12 Months</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={pipelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Bar dataKey="New Converts" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Graduated" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Baptized" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Recent Discipleship Activity</CardTitle></CardHeader>
        <CardContent>
          {activityFeed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activityFeed.map((a: any) => {
                const meta = ACTIVITY_ICONS[a.action_type] || { icon: Activity, color: "text-slate-500" };
                const Icon = meta.icon;
                return (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className={`mt-0.5 ${meta.color}`}><Icon className="h-4 w-4" /></div>
                    <div className="flex-1">
                      <p className="text-sm">{a.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Check-in Sheet */}
      <Sheet open={checkinSheet.open} onOpenChange={o => setCheckinSheet({ open: o })}>
        <SheetContent>
          <SheetHeader><SheetTitle>Log Check-in — {checkinSheet.convertName}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label>Check-in Date</Label>
              <Input type="date" value={checkinForm.checkin_date} onChange={e => setCheckinForm(f => ({ ...f, checkin_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={checkinForm.notes} onChange={e => setCheckinForm(f => ({ ...f, notes: e.target.value }))} placeholder="How did the check-in go?" rows={4} />
            </div>
            <div className="space-y-1.5">
              <Label>Next Check-in Date</Label>
              <Input type="date" value={checkinForm.next_checkin_date} onChange={e => setCheckinForm(f => ({ ...f, next_checkin_date: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={() => logCheckin.mutate()} disabled={logCheckin.isPending}>
              {logCheckin.isPending ? "Saving..." : "Save Check-in"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Advance Stage Sheet */}
      <Sheet open={advanceSheet.open} onOpenChange={o => setAdvanceSheet({ open: o })}>
        <SheetContent>
          <SheetHeader><SheetTitle>Advance Stage — {advanceSheet.convertName}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="py-4">
              <StageProgressBar currentStage={(advanceSheet.currentStage || 1) + 1} stages={STAGES} size="md" />
              <p className="text-sm text-muted-foreground mt-3 text-center">
                Moving from <strong>{STAGES[(advanceSheet.currentStage || 1) - 1]?.label}</strong> → <strong>{STAGES[advanceSheet.currentStage || 1]?.label}</strong>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Advancement Notes</Label>
              <Textarea value={advanceForm.notes} onChange={e => setAdvanceForm(f => ({ ...f, notes: e.target.value }))} placeholder="Why is this disciple ready to advance?" rows={4} />
            </div>
            {(advanceSheet.currentStage || 1) >= 1 && (
              <div className="space-y-1.5">
                <Label>Baptism Status</Label>
                <Select value={advanceForm.baptism_status} onValueChange={v => setAdvanceForm(f => ({ ...f, baptism_status: v }))}>
                  <SelectTrigger><SelectValue placeholder="Update baptism status (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_scheduled">Not Scheduled</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" onClick={() => advanceStage.mutate()} disabled={advanceStage.isPending}>
              {advanceStage.isPending ? "Advancing..." : "Confirm Advancement"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
