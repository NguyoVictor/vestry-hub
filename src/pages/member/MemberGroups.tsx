import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Users, ArrowLeft, CalendarDays, MapPin } from "lucide-react";

export function MemberGroups() {
  const member = useMemberPortal();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["member-my-groups", member.memberId],
    queryFn: async () => {
      const { data } = await supabase.from("group_members").select("groups(id, name, group_type, description, meeting_day, meeting_time, location, is_active)").eq("member_id", member.memberId);
      return (data || []).map((gm: any) => gm.groups).filter(Boolean);
    },
  });

  return (
    <>
      <Helmet><title>My Groups — Vestry</title></Helmet>
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">My Groups</h1>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">You're not in any groups yet</p>
            <p className="text-sm mt-1">Ask your church admin to add you to a group</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((g: any) => (
              <Link key={g.id} to={`/member/groups/${g.id}`} className="block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-sm transition-shadow space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0">{g.name?.charAt(0)}</div>
                  <div>
                    <h3 className="font-semibold">{g.name}</h3>
                    <Badge variant="secondary" className="text-xs capitalize mt-0.5">{g.group_type?.replace(/_/g, " ")}</Badge>
                  </div>
                </div>
                {g.description && <p className="text-sm text-muted-foreground line-clamp-2">{g.description}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {g.meeting_day && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{g.meeting_day}{g.meeting_time ? ` · ${g.meeting_time}` : ""}</span>}
                  {g.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{g.location}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function MemberGroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const member = useMemberPortal();

  const { data: group, isLoading } = useQuery({
    queryKey: ["member-group", groupId],
    queryFn: async () => {
      const { data } = await supabase.from("groups").select("*").eq("id", groupId!).single();
      return data;
    },
    enabled: !!groupId,
  });

  const { data: groupMembers = [] } = useQuery({
    queryKey: ["group-members-list", groupId],
    queryFn: async () => {
      const { data } = await supabase.from("group_members").select("members(id, first_name, last_name)").eq("group_id", groupId!);
      return (data || []).map((gm: any) => gm.members).filter(Boolean);
    },
    enabled: !!groupId,
  });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!group) return <div className="text-center py-16 text-muted-foreground"><p>Group not found</p></div>;

  return (
    <>
      <Helmet><title>{group.name} — Vestry</title></Helmet>
      <div className="max-w-lg mx-auto space-y-5">
        <Button variant="ghost" size="sm" asChild className="gap-1"><Link to="/member/groups"><ArrowLeft className="h-4 w-4" />Groups</Link></Button>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">{group.name?.charAt(0)}</div>
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <Badge variant="secondary" className="capitalize">{group.group_type?.replace(/_/g, " ")}</Badge>
          </div>
        </div>
        {group.description && <p className="text-muted-foreground">{group.description}</p>}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {group.meeting_day && <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{group.meeting_day}{group.meeting_time ? ` at ${group.meeting_time}` : ""}</span>}
          {group.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{group.location}</span>}
        </div>
        <div>
          <h2 className="font-semibold mb-3">Members ({groupMembers.length})</h2>
          <div className="flex flex-wrap gap-3">
            {groupMembers.map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1.5">
                <MemberAvatar name={`${m.first_name} ${m.last_name}`} size="sm" />
                <span className="text-sm">{m.first_name} {m.last_name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
