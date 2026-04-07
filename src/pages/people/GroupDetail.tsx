import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, Trash2, UsersRound, Clock, MapPin } from "lucide-react";
import { useState } from "react";

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenantId } = useChurch();
  const [selectedMember, setSelectedMember] = useState("");

  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*").eq("id", groupId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  const { data: groupMembers = [] } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      const { data } = await supabase.from("group_members").select("*, members:member_id(id, first_name, last_name, email, avatar_url)").eq("group_id", groupId!) as any;
      return data || [];
    },
    enabled: !!groupId,
    staleTime: 300000,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ["all-members", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, first_name, last_name").eq("tenant_id", tenantId!).eq("status", "active");
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const existingIds = new Set(groupMembers.map((gm: any) => gm.member_id));
  const availableMembers = allMembers.filter((m: any) => !existingIds.has(m.id));

  const addMemberMut = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("group_members").insert({ group_id: groupId!, member_id: memberId, tenant_id: tenantId } as any);
      if (error) {
        if (error.code === "23505") throw new Error("This member is already in the group");
        throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["group-members", groupId] }); toast.success("Member added to group"); setSelectedMember(""); },
    onError: (err: any) => toast.error(err.message),
  });

  const removeMemberMut = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("group_members").delete().eq("group_id", groupId!).eq("member_id", memberId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["group-members", groupId] }); toast.success("Member removed"); },
  });

  if (!group) return null;

  const columns: Column<any>[] = [
    {
      key: "member_id", header: "Member",
      render: (row) => {
        const u = row.members;
        return u ? (
          <div className="flex items-center gap-3">
            <MemberAvatar name={`${u.first_name} ${u.last_name}`} avatarUrl={u.avatar_url} />
            <div><div className="font-medium">{u.first_name} {u.last_name}</div><div className="text-xs text-muted-foreground">{u.email}</div></div>
          </div>
        ) : <span className="text-muted-foreground">Unknown</span>;
      },
    },
    { key: "joined_at", header: "Joined", render: (row) => <span className="text-sm text-muted-foreground">{row.joined_at ? new Date(row.joined_at).toLocaleDateString() : "—"}</span> },
    { key: "actions", header: "", render: (row) => <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeMemberMut.mutate(row.member_id)}><Trash2 className="h-4 w-4" /></Button> },
  ];

  return (
    <>
      <Helmet><title>{group.name} — Vestry</title></Helmet>
      <Button variant="ghost" size="sm" onClick={() => navigate("/groups")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" />Back to Groups</Button>
      <PageHeader title={group.name} subtitle={`${(group as any).type?.replace(/_/g, " ")} · ${groupMembers.length} members`} />

      <Tabs defaultValue="members" className="mt-4">
        <TabsList><TabsTrigger value="members">Members</TabsTrigger><TabsTrigger value="details">Details</TabsTrigger></TabsList>
        <TabsContent value="members" className="mt-4">
          <div className="flex gap-2 mb-4">
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select member to add..." /></SelectTrigger>
              <SelectContent>{availableMembers.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}</SelectContent>
            </Select>
            <Button disabled={!selectedMember} onClick={() => addMemberMut.mutate(selectedMember)}><UserPlus className="h-4 w-4 mr-1" />Add</Button>
          </div>
          <DataTable data={groupMembers} columns={columns} getRowId={(r: any) => r.member_id} emptyIcon={<UsersRound className="h-12 w-12 text-muted-foreground/40" />} emptyTitle="No members in this group" />
        </TabsContent>
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Group Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Description</span><p className="font-medium mt-1">{(group as any).description || "—"}</p></div>
              <div><span className="text-muted-foreground">Meeting Schedule</span><p className="font-medium mt-1 flex items-center gap-1"><Clock className="h-4 w-4" />{(group as any).meeting_day || "No schedule"}{(group as any).meeting_time ? ` · ${(group as any).meeting_time}` : ""}</p></div>
              <div><span className="text-muted-foreground">Location</span><p className="font-medium mt-1 flex items-center gap-1"><MapPin className="h-4 w-4" />{(group as any).meeting_location || "—"}</p></div>
              <div><span className="text-muted-foreground">Status</span><p className="mt-1"><Badge variant={group.is_active ? "default" : "secondary"}>{group.is_active ? "Active" : "Inactive"}</Badge></p></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default GroupDetail;
