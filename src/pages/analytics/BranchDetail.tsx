import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { setActiveBranch } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { formatCurrencyFull } from "@/lib/format";
import { formatDistanceToNow, format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Users, Building2, CalendarDays, TrendingUp, Copy, MapPin, Phone, Mail, Globe, ArrowLeft, ArrowLeftRight, Edit } from "lucide-react";

export default function BranchDetail() {
  const { branchId } = useParams<{ branchId: string }>();
  const { tenantId, currency } = useChurch();
  const queryClient = useQueryClient();

  const { data: branch, isLoading } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("churches").select("*").eq("id", branchId).single();
      return data;
    },
    enabled: !!branchId,
  });

  const { data: branchMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["branch-members", branchId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, first_name, last_name, status, created_at").eq("church_id", branchId!).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!branchId,
  });

  const { data: branchStats } = useQuery({
    queryKey: ["branch-stats", branchId],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const [members, giving, services, groups] = await Promise.all([
        supabase.from("members").select("id", { count: "exact", head: true }).eq("church_id", branchId!).eq("status", "active"),
        supabase.from("donations").select("amount").eq("church_id", branchId!).gte("donation_date", monthStart),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("church_id", branchId!).gte("service_date", monthStart),
        supabase.from("groups").select("id", { count: "exact", head: true }).eq("church_id", branchId!).eq("is_active", true),
      ]);
      const totalGiving = (giving.data || []).reduce((s, r) => s + Number(r.amount), 0);
      return { members: members.count || 0, giving: totalGiving, services: services.count || 0, groups: groups.count || 0 };
    },
    enabled: !!branchId,
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["branch-activity", branchId],
    queryFn: async () => {
      const { data } = await supabase.from("activity_log").select("*").eq("church_id", branchId!).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!branchId,
  });

  // All sibling branches for comparative stats
  const { data: allBranchStats = [] } = useQuery({
    queryKey: ["all-branch-stats", tenantId],
    queryFn: async () => {
      const { data: siblings } = await (supabase as any).from("churches").select("id").eq("parent_church_id", tenantId);
      if (!siblings?.length) return [];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      return Promise.all(siblings.map(async (s: any) => {
        const [m, g] = await Promise.all([
          (supabase as any).from("members").select("id", { count: "exact", head: true }).eq("church_id", s.id).eq("status", "active"),
          (supabase as any).from("donations").select("amount").eq("church_id", s.id).gte("donation_date", monthStart),
        ]);
        return {
          id: s.id,
          members: m.count || 0,
          giving: (g.data || []).reduce((sum: number, d: any) => sum + (d.amount || 0), 0),
        };
      }));
    },
    enabled: !!tenantId,
  });

  const memberColumns: Column<any>[] = [
    { key: "name", header: "Member", render: r => <div className="flex items-center gap-2"><MemberAvatar name={`${r.first_name} ${r.last_name}`} size="sm" /><span className="text-sm">{r.first_name} {r.last_name}</span></div> },
    { key: "status", header: "Status", render: r => <Badge className={`text-xs capitalize ${r.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{r.status}</Badge> },
    { key: "created_at", header: "Joined", render: r => <span className="text-sm text-muted-foreground">{format(new Date(r.created_at), "dd MMM yyyy")}</span> },
  ];

  const copyAccessCode = () => {
    navigator.clipboard.writeText(branch?.access_code || "");
    toast.success("Access code copied");
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!branch) return <div className="text-center py-16 text-muted-foreground"><p>Branch not found</p><Button variant="outline" asChild className="mt-4"><Link to="/branches"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button></div>;

  return (
    <>
      <Helmet><title>{branch.name} — Vestry</title></Helmet>
      <PageHeader
        title={branch.name}
        subtitle={[branch.city, branch.country].filter(Boolean).join(", ")}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`capitalize ${branch.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{branch.status || "active"}</Badge>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setActiveBranch({ id: branch.id, name: branch.name }); toast.success(`Switched to ${branch.name}`); }}>
              <ArrowLeftRight className="h-4 w-4" />Switch to Branch
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link to="/branches"><ArrowLeft className="h-4 w-4" />Back</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Members", value: branchStats?.members ?? 0, icon: Users, color: "indigo" },
              { label: "Giving This Month", value: formatCurrencyFull(branchStats?.giving ?? 0, currency), icon: TrendingUp, color: "emerald" },
              { label: "Services This Month", value: branchStats?.services ?? 0, icon: CalendarDays, color: "violet" },
              { label: "Active Groups", value: branchStats?.groups ?? 0, icon: Building2, color: "amber" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
                    <Icon className={`h-4 w-4 text-${color}-600`} />
                  </div>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Members Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Members</CardTitle>
              <Button size="sm" variant="outline" asChild><Link to={`/members?branch=${branchId}`}>View All</Link></Button>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable data={branchMembers} columns={memberColumns} loading={membersLoading} getRowId={r => r.id} emptyTitle="No members yet" />
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((a: any) => (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 shrink-0" />
                      <div>
                        <p className="text-sm">{a.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1/3 */}
        <div className="space-y-6">
          {/* Branch Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Branch Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {branch.physical_address && <div className="flex gap-2"><MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /><span>{branch.physical_address}</span></div>}
              {branch.phone && <div className="flex gap-2"><Phone className="h-4 w-4 text-muted-foreground shrink-0" /><span>{branch.phone}</span></div>}
              {branch.email && <div className="flex gap-2"><Mail className="h-4 w-4 text-muted-foreground shrink-0" /><span>{branch.email}</span></div>}
              {branch.website && <div className="flex gap-2"><Globe className="h-4 w-4 text-muted-foreground shrink-0" /><a href={branch.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{branch.website}</a></div>}
              {branch.branch_code && <div className="flex gap-2"><span className="text-muted-foreground">Code:</span><span className="font-mono">{branch.branch_code}</span></div>}
              {branch.currency && <div className="flex gap-2"><span className="text-muted-foreground">Currency:</span><span>{branch.currency}</span></div>}
            </CardContent>
          </Card>

          {/* Branch Settings */}
          <Card>
            <CardHeader><CardTitle className="text-base">Branch Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show in Church Directory</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Allow Self-Registration</Label>
                <Switch />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Branch Access Code</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded text-sm font-mono">{branch.access_code || "—"}</code>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copyAccessCode}><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              {branch.access_code && (
                <div className="flex flex-col items-center gap-2 pt-2">
                  <Label className="text-sm">Branch QR Code</Label>
                  <QRCodeSVG value={`https://vestry.app/join/${branch.access_code}`} size={120} />
                  <p className="text-xs text-muted-foreground text-center">vestry.app/join/{branch.access_code}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Branch Admin */}
          <Card>
            <CardHeader><CardTitle className="text-base">Branch Admin</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {branch.branch_admin_name ? (
                <div className="flex items-center gap-3">
                  <MemberAvatar name={branch.branch_admin_name} size="lg" />
                  <div>
                    <p className="font-semibold">{branch.branch_admin_name}</p>
                    <Badge variant="outline" className="text-xs">Super Admin</Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-amber-600">No admin assigned</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5">
                  <Edit className="h-3.5 w-3.5" />Change Admin
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" asChild>
                  <Link to="/member-messaging">
                    <ArrowLeftRight className="h-3.5 w-3.5" />Message Admin
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Comparative Stats */}
          {allBranchStats.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Comparative Stats</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    label: "Members",
                    value: branchStats?.members ?? 0,
                    avg: allBranchStats.length > 0 ? Math.round(allBranchStats.reduce((s, b) => s + (b.members || 0), 0) / allBranchStats.length) : 0,
                  },
                  {
                    label: "Giving per Member",
                    value: branchStats?.members ? Math.round((branchStats.giving || 0) / branchStats.members) : 0,
                    avg: (() => {
                      const total = allBranchStats.reduce((s, b) => s + (b.members > 0 ? b.giving / b.members : 0), 0);
                      return allBranchStats.length > 0 ? Math.round(total / allBranchStats.length) : 0;
                    })(),
                  },
                ].map(({ label, value, avg }) => {
                  const max = Math.max(value, avg, 1);
                  return (
                    <div key={label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{value.toLocaleString()} <span className="text-muted-foreground">/ avg {avg.toLocaleString()}</span></span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-16 text-muted-foreground">This branch</span>
                          <Progress value={(value / max) * 100} className="flex-1 h-2" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-16 text-muted-foreground">Average</span>
                          <Progress value={(avg / max) * 100} className="flex-1 h-2 opacity-50" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
