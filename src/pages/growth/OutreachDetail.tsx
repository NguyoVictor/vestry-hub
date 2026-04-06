import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { format } from "date-fns";
import { Users, MapPin, Clock, Award, ArrowLeft, Heart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

function impactBadge(score: number) {
  if (score >= 100) return { label: "Platinum", color: "bg-violet-100 text-violet-700" };
  if (score >= 50) return { label: "Gold", color: "bg-amber-100 text-amber-700" };
  if (score >= 20) return { label: "Silver", color: "bg-slate-100 text-slate-700" };
  return { label: "Bronze", color: "bg-orange-100 text-orange-700" };
}

export default function OutreachDetail() {
  const { activityId } = useParams<{ activityId: string }>();
  const { tenantId } = useChurch();

  const { data: activity, isLoading } = useQuery({
    queryKey: ["outreach-activity", activityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("outreach_activities").select("*").eq("id", activityId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!activityId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-list", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, first_name, last_name").eq("church_id", tenantId);
      return data || [];
    },
    enabled: !!tenantId,
  });

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (!activity) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Activity not found</p>
      <Button variant="outline" asChild className="mt-4"><Link to="/outreach"><ArrowLeft className="h-4 w-4 mr-1" />Back to Outreach</Link></Button>
    </div>
  );

  const impactScore = (activity.people_reached || 0) + (activity.volunteer_ids?.length || 0) * 2;
  const badge = impactBadge(impactScore);
  const conversionRate = activity.people_reached > 0 ? ((activity.salvations / activity.people_reached) * 100).toFixed(1) : "0";

  const impactChartData = [
    { name: "People Reached", value: activity.people_reached || 0, fill: "#4F46E5" },
    { name: "Salvations", value: activity.salvations || 0, fill: "#10B981" },
    { name: "Visitors", value: activity.visitors_captured || 0, fill: "#7C3AED" },
  ];

  const volunteerMembers = members.filter((m: any) => activity.volunteer_ids?.includes(m.id));
  const teamLeader = members.find((m: any) => m.id === activity.team_leader_id);

  return (
    <>
      <Helmet><title>{activity.name} — Vestry</title></Helmet>
      <PageHeader
        title={activity.name}
        subtitle={`${format(new Date(activity.activity_date), "dd MMM yyyy")}${activity.location ? ` · ${activity.location}` : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Badge className={`capitalize ${STATUS_COLORS[activity.status] || ""}`}>{activity.status}</Badge>
            <Badge variant="outline" className="capitalize">{activity.type?.replace(/_/g, " ")}</Badge>
            <Button variant="outline" asChild><Link to="/outreach"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Summary */}
          <Card>
            <CardHeader><CardTitle>Activity Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Type:</span> <span className="capitalize ml-1">{activity.type?.replace(/_/g, " ")}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span className="ml-1">{format(new Date(activity.activity_date), "dd MMM yyyy")}</span></div>
                {activity.start_time && <div><span className="text-muted-foreground">Time:</span> <span className="ml-1">{activity.start_time}{activity.end_time ? ` – ${activity.end_time}` : ""}</span></div>}
                {activity.location && <div><span className="text-muted-foreground">Location:</span> <span className="ml-1">{activity.location}</span></div>}
                {activity.target_community && <div className="col-span-2"><span className="text-muted-foreground">Target Community:</span> <span className="ml-1">{activity.target_community}</span></div>}
              </div>
              {activity.materials_distributed && (
                <div><p className="text-sm text-muted-foreground font-medium mb-1">Materials Distributed</p><p className="text-sm">{activity.materials_distributed}</p></div>
              )}
              {activity.report && (
                <div><p className="text-sm text-muted-foreground font-medium mb-1">Report</p><p className="text-sm whitespace-pre-wrap">{activity.report}</p></div>
              )}
            </CardContent>
          </Card>

          {/* Impact Metrics */}
          <Card>
            <CardHeader><CardTitle>Impact Metrics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "People Reached", value: activity.people_reached || 0, icon: Users, color: "indigo" },
                  { label: "Salvations", value: activity.salvations || 0, icon: Heart, color: "emerald" },
                  { label: "Visitors Captured", value: activity.visitors_captured || 0, icon: Users, color: "violet" },
                  { label: "Volunteers", value: activity.volunteer_ids?.length || 0, icon: Users, color: "amber" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="text-center">
                    <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>
              {activity.people_reached > 0 && (
                <p className="text-sm text-emerald-600 font-medium mb-4">Conversion rate: {conversionRate}%</p>
              )}
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={impactChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {impactChartData.map((entry, i) => (
                      <Bar key={i} dataKey="value" fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Photos */}
          {activity.photo_urls && activity.photo_urls.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(activity.photo_urls as string[]).map((url, i) => (
                    <img key={i} src={url} alt={`Photo ${i + 1}`} className="rounded-lg object-cover aspect-square cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(url, "_blank")} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right 1/3 */}
        <div className="space-y-6">
          {/* Team */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Team</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {teamLeader && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Team Leader</p>
                  <div className="flex items-center gap-2">
                    <MemberAvatar name={`${teamLeader.first_name} ${teamLeader.last_name}`} size="md" />
                    <span className="font-medium">{teamLeader.first_name} {teamLeader.last_name}</span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-2">{volunteerMembers.length} Volunteer{volunteerMembers.length !== 1 ? "s" : ""}</p>
                <div className="flex flex-wrap -space-x-2">
                  {volunteerMembers.slice(0, 8).map((m: any) => (
                    <MemberAvatar key={m.id} name={`${m.first_name} ${m.last_name}`} size="sm" />
                  ))}
                  {volunteerMembers.length > 8 && <span className="text-xs text-muted-foreground ml-3 self-center">+{volunteerMembers.length - 8} more</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Follow-up */}
          {activity.follow_up_required && (
            <Card>
              <CardHeader><CardTitle>Follow-up Status</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Requiring follow-up:</span> <strong>{activity.follow_up_count || 0}</strong></p>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to={`/follow-up-tasks`}>View Follow-up Tasks</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Impact Score */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Impact Score</CardTitle></CardHeader>
            <CardContent>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${badge.color}`}>
                <Award className="h-5 w-5" />
                {badge.label}
              </div>
              <p className="text-sm text-muted-foreground mt-3">Score: {impactScore}</p>
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                <p>People reached × 1 = {activity.people_reached || 0}</p>
                <p>Volunteers × 2 = {(activity.volunteer_ids?.length || 0) * 2}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
