import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Edit } from "lucide-react";
import { format } from "date-fns";

const MemberProfile = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();

  const { data: member, isLoading } = useQuery({
    queryKey: ["member", memberId],
    queryFn: async () => {
      const { data, error } = await supabase.from("users").select("id, tenant_id, email, role, first_name, last_name, phone, avatar, date_of_birth, join_date, last_login_at, mfa_enabled, email_verified, phone_verified, user_metadata, status, created_at, updated_at, gender, avatar_url").eq("id", memberId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  const { data: memberExtra } = useQuery({
    queryKey: ["member-extra", memberId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("*").eq("id", memberId!).maybeSingle();
      return data;
    },
    enabled: !!memberId,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["member-groups", memberId],
    queryFn: async () => {
      const { data } = await supabase.from("group_members").select("*, groups(name, type)").eq("member_id", memberId!) as any;
      return data || [];
    },
    enabled: !!memberId,
  });

  if (isLoading) return <div className="space-y-4 p-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!member) return <div className="p-6 text-center text-muted-foreground">Member not found</div>;

  const name = `${member.first_name} ${member.last_name}`;

  return (
    <>
      <Helmet><title>{name} — Vestry</title></Helmet>
      <Button variant="ghost" size="sm" onClick={() => navigate("/members")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" />Back to Members</Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left profile card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 text-center space-y-4">
            <MemberAvatar name={name} avatarUrl={member.avatar_url} size="lg" className="mx-auto" />
            <div>
              <h2 className="text-xl font-bold">{name}</h2>
              <StatusBadge status={member.status} className="mt-1" />
            </div>
            <div className="text-sm text-muted-foreground space-y-2 text-left">
              {member.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4" />{member.email}</div>}
              {member.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" />{member.phone}</div>}
              {memberExtra?.city && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{memberExtra.city}{memberExtra.country ? `, ${memberExtra.country}` : ""}</div>}
              {member.join_date && <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />Joined {format(new Date(member.join_date), "dd MMM yyyy")}</div>}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" size="sm"><Edit className="h-4 w-4 mr-1" />Edit</Button>
              <Button className="flex-1" size="sm"><Mail className="h-4 w-4 mr-1" />Message</Button>
            </div>
          </CardContent>
        </Card>

        {/* Right content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="groups">Groups</TabsTrigger><TabsTrigger value="giving">Giving</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger></TabsList>
            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Personal Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Gender</span><p className="font-medium capitalize">{member.gender || "—"}</p></div>
                  <div><span className="text-muted-foreground">Date of Birth</span><p className="font-medium">{member.date_of_birth ? format(new Date(member.date_of_birth), "dd MMM yyyy") : "—"}</p></div>
                  <div><span className="text-muted-foreground">Marital Status</span><p className="font-medium capitalize">{memberExtra?.marital_status || "—"}</p></div>
                  <div><span className="text-muted-foreground">Occupation</span><p className="font-medium">{memberExtra?.occupation || "—"}</p></div>
                  <div><span className="text-muted-foreground">Membership #</span><p className="font-medium">{memberExtra?.membership_number || "—"}</p></div>
                  <div><span className="text-muted-foreground">Baptism Date</span><p className="font-medium">{memberExtra?.baptism_date ? format(new Date(memberExtra.baptism_date), "dd MMM yyyy") : "—"}</p></div>
                </CardContent>
              </Card>
              {memberExtra?.notes && (
                <Card><CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader><CardContent><p className="text-sm">{memberExtra.notes}</p></CardContent></Card>
              )}
            </TabsContent>
            <TabsContent value="groups" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Groups ({groups.length})</CardTitle></CardHeader>
                <CardContent>
                  {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Not in any groups yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {groups.map((g: any) => (
                        <div key={g.group_id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div><span className="font-medium">{g.groups?.name || "Group"}</span><Badge variant="secondary" className="ml-2 capitalize">{g.groups?.type}</Badge></div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="giving" className="mt-4">
              <Card><CardContent className="py-8 text-center text-muted-foreground">Giving history will appear here once records are added.</CardContent></Card>
            </TabsContent>
            <TabsContent value="attendance" className="mt-4">
              <Card><CardContent className="py-8 text-center text-muted-foreground">Attendance history will appear here.</CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default MemberProfile;
