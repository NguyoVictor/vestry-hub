import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { PageHeader } from "@/components/layout/PageHeader";
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Shield, AlertTriangle, Users, Clock, Monitor, Smartphone, Download, RefreshCw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { SentryMonitor } from "@/components/security/SentryMonitor";
import { PostHogDashboard } from "@/components/security/PostHogDashboard";

const severityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  critical: "bg-destructive/10 text-destructive animate-pulse",
};

const statusColors: Record<string, string> = {
  open: "bg-destructive/10 text-destructive",
  investigating: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive",
};

export default function SecurityCentre() {
  const { tenantId, userRole } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('reports_analytics');
  const queryClient = useQueryClient();

  const { data: loginEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ["login_events", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("login_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: alerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ["security_alerts", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("security_alerts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, first_name, last_name, email, role, status")
        .eq("tenant_id", tenantId)
        .eq("status", "active");
      return data || [];
    },
  });

  const { data: activeSessions, isLoading: loadingSessions } = useQuery({
    queryKey: ["active_sessions", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-active-sessions", {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      return data?.sessions || [];
    },
    refetchInterval: 60000,
    enabled: userRole === "church_admin" || userRole === "super_admin",
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("security_alerts")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security_alerts"] });
      toast.success("Alert resolved");
    },
  });

  // Calculate stats with proper 24h filtering
  const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString();
  const failedCount = loginEvents?.filter(e => 
    e.status === "failed" && 
    new Date(e.created_at).getTime() > Date.now() - 86400000
  ).length || 0;
  
  const activeSessionsCount = loginEvents?.filter(e => 
    e.status === "success" && 
    new Date(e.created_at).getTime() > Date.now() - 86400000
  ).length || 0;
  
  const unresolvedAlerts = alerts?.filter(a => a.status !== "resolved") || [];
  const staffCount = users?.length || 0;

  return (
    <div>
      <PageHeader title="Security Centre" subtitle="Monitor access, sessions and suspicious activity" action={<PermissionButton readOnly={readOnly} variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export Logs</PermissionButton>} />

      {readOnly && <ReadOnlyBanner permission="reports_analytics" />}

      {unresolvedAlerts.length > 0 && (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <span className="text-sm font-medium text-destructive">{unresolvedAlerts.length} unresolved security alert(s) require your attention.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { title: "Logins (24h)", value: activeSessionsCount, icon: Monitor, color: "text-primary" },
          { title: "Failed Logins (24h)", value: failedCount, icon: AlertTriangle, color: "text-destructive" },
          { title: "Admin Accounts", value: staffCount, icon: Users, color: "text-primary" },
          { title: "Unresolved Alerts", value: unresolvedAlerts.length, icon: Shield, color: "text-amber-500" },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`rounded-lg bg-muted p-2.5 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Access Log */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Recent Access Log</CardTitle></CardHeader>
        <CardContent>
          {loadingEvents ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !loginEvents?.length ? (
            <p className="text-center text-muted-foreground py-8">No login events recorded yet.</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loginEvents.map((event) => {
                  const user = users?.find(u => u.id === event.user_id);
                  const isMobile = event.user_agent?.toLowerCase().includes("mobile");
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MemberAvatar name={user ? `${user.first_name} ${user.last_name}` : "Unknown"} size="sm" />
                          <div>
                            <p className="font-medium text-sm">{user ? `${user.first_name} ${user.last_name}` : "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><code className="text-xs">{event.ip_address || "—"}</code></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {isMobile ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
                          <span className="text-sm">{isMobile ? "Mobile" : "Desktop"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{event.created_at ? format(new Date(event.created_at), "dd MMM yyyy · HH:mm") : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[event.status || "success"]}>{event.status || "success"}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Alerts */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2">Security Alerts {unresolvedAlerts.length > 0 && <Badge variant="destructive">{unresolvedAlerts.length}</Badge>}</CardTitle></CardHeader>
        <CardContent>
          {loadingAlerts ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !alerts?.length ? (
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No security alerts. Everything looks good!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Triggered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell><Badge className={severityColors[alert.severity]}>{alert.severity}</Badge></TableCell>
                    <TableCell className="text-sm">{alert.alert_type}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{alert.description}</TableCell>
                    <TableCell className="text-sm">{alert.created_at ? formatDistanceToNow(new Date(alert.created_at), { addSuffix: true }) : "—"}</TableCell>
                    <TableCell><Badge className={statusColors[alert.status || "open"]}>{alert.status}</Badge></TableCell>
                    <TableCell>
                      {alert.status !== "resolved" && (
                        <Button variant="outline" size="sm" onClick={() => resolveAlert.mutate(alert.id)}>Resolve</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Staff Overview */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Admin Access Overview</CardTitle></CardHeader>
        <CardContent>
          {!users?.length ? (
            <p className="text-center text-muted-foreground py-8">No staff accounts found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MemberAvatar name={`${user.first_name} ${user.last_name}`} size="sm" />
                        <div>
                          <p className="font-medium text-sm">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {user.role === "super_admin"
                          ? "Super Admin"
                          : user.role === "church_admin"
                          ? "Church Admin"
                          : user.role
                              ?.split("_")
                              .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                              .join(" ") || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge className={user.status === "active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}>{user.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions — church_admin and super_admin only */}
      {(userRole === "church_admin" || userRole === "super_admin") && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Active Sessions
              </div>
              <span className="text-sm font-normal text-muted-foreground">
                {activeSessions?.length || 0} online
              </span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["active_sessions", tenantId] })}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {loadingSessions ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !activeSessions?.length ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No active sessions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((session: any) => (
                    <TableRow key={session.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MemberAvatar
                            name={`${session.first_name || ""} ${session.last_name || ""}`.trim()}
                            size="sm"
                          />
                          <div>
                            <p className="font-medium text-sm">
                              {session.first_name} {session.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{session.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {session.role?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500">
                          {session.last_active
                            ? formatDistanceToNow(new Date(session.last_active), { addSuffix: true })
                            : "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {session.user_agent?.toLowerCase().includes("mobile") ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Smartphone className="h-3.5 w-3.5" />
                            <span className="text-xs">Mobile</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Monitor className="h-3.5 w-3.5" />
                            <span className="text-xs">Desktop</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500 font-mono">
                          {session.ip_address || "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error & Performance Monitor (Sentry) */}
      <div className="mt-6">
        <SentryMonitor />
      </div>

      {/* Live Analytics (PostHog) */}
      <PostHogDashboard />
    </div>
  );
}
