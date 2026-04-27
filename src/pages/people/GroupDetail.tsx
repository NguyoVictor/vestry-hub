import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import { JitsiModal } from "@/components/shared/JitsiModal";
import { GroupDrawer } from "./GroupDrawer";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ArrowLeft, Video, Pencil, Users, Clock, Activity, Crown,
  UserPlus, Trash2, MoreHorizontal, ChevronDown, Globe, MapPin, GitMerge,
  CheckCircle2, XCircle,
} from "lucide-react";

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function hashColor(str: string) {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const c = ["#7c3aed","#3b82f6","#10b981","#f59e0b","#f43f5e","#f97316","#ec4899","#14b8a6","#6366f1","#84cc16"];
  return c[Math.abs(h) % c.length];
}

const MT_CONFIG = {
  online: { label: "Online", icon: Globe, bg: "bg-violet-100 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300" },
  onsite: { label: "Onsite", icon: MapPin,  bg: "bg-blue-100 dark:bg-blue-950/40",   text: "text-blue-700 dark:text-blue-300" },
  hybrid: { label: "Hybrid", icon: GitMerge,bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300" },
};

const GroupDetail = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { tenantId, userName } = useChurch();
  const [activeTab, setActiveTab] = useState<"members"|"details">("members");
  const [selectedMember, setSelectedMember] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [jitsiOpen, setJitsiOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(true);

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.GROUPS).select("*").eq("id", groupId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
    staleTime: 300_000,
  });

  const { data: groupTypes = [] } = useQuery({
    queryKey: ["group-types", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.GROUP_TYPES).select("*").eq(COLS.TENANT_ID, tenantId).eq("is_active", true).order("sort_order");
      return data || [];
    },
    staleTime: 300_000,
  });

  const { data: groupMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      const { data: gm } = await supabase.from(TABLES.GROUP_MEMBERS).select("member_id, joined_at, role").eq("group_id", groupId!);
      if (!gm?.length) return [];
      const ids = gm.map(r => r.member_id);
      const { data: memberDetails } = await supabase.from(TABLES.MEMBERS).select("id, first_name, last_name, email, avatar_url").in("id", ids);
      const map = Object.fromEntries((memberDetails || []).map(m => [m.id, m]));
      return gm.map(r => ({ ...r, members: map[r.member_id] || null }));
    },
    enabled: !!groupId,
    staleTime: 300_000,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ["all-members", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.MEMBERS).select("id, first_name, last_name").eq(COLS.TENANT_ID, tenantId).eq("status", "active");
      return data || [];
    },
    staleTime: 300_000,
  });

  const { data: joinRequests = [] } = useQuery({
    queryKey: ["join-requests", groupId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.JOIN_REQUESTS)
        .select("*, members(id, first_name, last_name, avatar_url)")
        .eq("group_id", groupId!).eq("status", "pending");
      return data || [];
    },
    enabled: !!groupId,
    staleTime: 300_000,
  });

  const existingIds = new Set(groupMembers.map((gm: any) => gm.member_id));
  const available = allMembers.filter((m: any) => !existingIds.has(m.id));
  const atCap = group?.max_members && groupMembers.length >= group.max_members;

  const addMemberMut = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from(TABLES.GROUP_MEMBERS).insert({ group_id: groupId!, member_id: memberId, tenant_id: tenantId } as any);
      if (error) { if (error.code === "23505") throw new Error("Already in group"); throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["group-members", groupId] }); toast.success("Member added"); setSelectedMember(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMemberMut = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from(TABLES.GROUP_MEMBERS).delete().eq("group_id", groupId!).eq("member_id", memberId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["group-members", groupId] }); toast.success("Member removed"); },
  });

  const setLeaderMut = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from(TABLES.GROUPS).update({ leader_id: memberId } as any).eq("id", groupId!);
      if (error) throw error;
    },
    onSuccess: (_, memberId) => {
      qc.invalidateQueries({ queryKey: ["group", groupId] });
      const m = groupMembers.find((gm: any) => gm.member_id === memberId);
      const name = m?.members ? `${m.members.first_name} ${m.members.last_name}` : "Member";
      toast.success(`${name} is now the group leader`);
    },
  });

  const approveRequestMut = useMutation({
    mutationFn: async (requestId: string) => {
      const req = joinRequests.find((r: any) => r.id === requestId);
      if (!req) throw new Error("Request not found");
      await supabase.from(TABLES.JOIN_REQUESTS).update({ status: "approved" } as any).eq("id", requestId);
      const { error } = await supabase.from(TABLES.GROUP_MEMBERS).insert({ group_id: groupId!, member_id: (req as any).member_id, tenant_id: tenantId } as any);
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["join-requests", groupId] }); qc.invalidateQueries({ queryKey: ["group-members", groupId] }); toast.success("Request approved"); },
  });

  const declineRequestMut = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.from(TABLES.JOIN_REQUESTS).update({ status: "declined" } as any).eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["join-requests", groupId] }); toast.success("Request declined"); },
  });

  if (groupLoading) return (
    <div className="space-y-6 font-jakarta">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
  if (!group) return <div className="text-center py-16 text-muted-foreground font-jakarta">Group not found</div>;

  const color = (group as any).cover_color || (group as any).color || "#6366f1";
  const mt = (group as any).meeting_type || "onsite";
  const mtCfg = MT_CONFIG[mt as keyof typeof MT_CONFIG] || MT_CONFIG.onsite;
  const MtIcon = mtCfg.icon;
  const initials = getInitials(group.name || "G");
  const typeInfo = groupTypes.find((t: any) => t.id === (group as any).group_type_id);
  const showJoin = (mt === "online" || mt === "hybrid") && (group as any).jitsi_room_name;
  const memberCount = groupMembers.length;
  const maxM = (group as any).max_members;

  return (
    <>
      <Helmet><title>{group.name} — Vestry</title></Helmet>
      <div className="font-jakarta space-y-0">
        {/* Header band */}
        <BlurFadeIn delay={0}>
          <div className="rounded-2xl border border-border/50 overflow-hidden mb-6" style={{ background: `linear-gradient(135deg, ${color}18 0%, transparent 100%)` }}>
            <div className="px-6 py-8 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                {/* Left */}
                <div className="flex-1">
                  <button onClick={() => navigate("/groups")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
                    <ArrowLeft className="h-4 w-4" />Back to Groups
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl flex items-center justify-center font-bold text-2xl shrink-0"
                      style={{ backgroundColor: `${color}30`, color }}>
                      {initials}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-foreground font-jakarta">{group.name}</h1>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {typeInfo && (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: `${typeInfo.color}20`, color: typeInfo.color }}>
                            {typeInfo.label}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${mtCfg.bg} ${mtCfg.text}`}>
                          <MtIcon className="h-3 w-3" />{mtCfg.label}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${group.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                          {group.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {(group as any).description && <p className="text-sm text-muted-foreground mt-1">{(group as any).description}</p>}
                      {(group as any).tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(group as any).tags.map((tag: string) => (
                            <span key={tag} className="text-xs bg-muted rounded-full px-2 py-0.5 text-muted-foreground">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Right */}
                <div className="flex flex-col gap-3 shrink-0">
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{memberCount}{maxM ? `/${maxM}` : ""}</span>
                      <span className="text-muted-foreground">Members</span>
                    </div>
                    {(group as any).meeting_day && (
                      <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground">{(group as any).meeting_day}{(group as any).meeting_time ? ` · ${(group as any).meeting_time}` : ""}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {showJoin && (
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onClick={() => setJitsiOpen(true)}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
                        <Video className="h-4 w-4" />Join Meeting
                      </motion.button>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
                      <Pencil className="h-3.5 w-3.5" />Edit
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 py-3 flex gap-1">
              {(["members","details"] as const).map(tab => (
                <div key={tab} className="relative">
                  <button onClick={() => setActiveTab(tab)}
                    className={`relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors font-jakarta ${activeTab === tab ? "text-white" : "text-muted-foreground hover:text-foreground"}`}>
                    {activeTab === tab && (
                      <motion.div layoutId="groupDetailTab" className="absolute inset-0 rounded-full bg-orange-500" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                    )}
                    <span className="relative z-10">
                      {tab === "members" ? `Members · ${memberCount}${maxM ? `/${maxM}` : ""}` : "Details"}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </BlurFadeIn>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "members" ? (
            <motion.div key="members" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
              {/* Add member row */}
              <div className="flex gap-2">
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="flex-1 max-w-xs border-slate-200 font-jakarta text-sm">
                    <SelectValue placeholder="Select member to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button disabled={!selectedMember || !!atCap} onClick={() => addMemberMut.mutate(selectedMember)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta gap-1.5"
                  title={atCap ? `Group is full (${maxM}/${maxM} members)` : undefined}>
                  <UserPlus className="h-4 w-4" />Add
                </Button>
              </div>
              {atCap && <p className="text-xs text-amber-600 font-jakarta">Group is full ({maxM}/{maxM} members)</p>}

              {/* Pending join requests */}
              {joinRequests.length > 0 && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 overflow-hidden">
                  <button onClick={() => setPendingOpen(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Pending Requests ({joinRequests.length})
                    <motion.div animate={{ rotate: pendingOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {pendingOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="border-t border-amber-200 dark:border-amber-800 divide-y divide-amber-100 dark:divide-amber-900">
                          {joinRequests.map((req: any) => {
                            const m = req.members;
                            const name = m ? `${m.first_name} ${m.last_name}` : "Unknown";
                            return (
                              <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                                <MemberAvatar name={name} avatarUrl={m?.avatar_url} size="sm" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{name}</p>
                                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white gap-1" onClick={() => approveRequestMut.mutate(req.id)}>
                                    <CheckCircle2 className="h-3 w-3" />Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 gap-1" onClick={() => declineRequestMut.mutate(req.id)}>
                                    <XCircle className="h-3 w-3" />Decline
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Members table */}
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
                {membersLoading ? (
                  <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
                ) : groupMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                    <Users className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No members in this group</p>
                  </div>
                ) : (
                  <table className="w-full text-sm font-jakarta">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Member</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Joined</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                        <th className="px-4 py-3 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {groupMembers.map((gm: any) => {
                        const m = gm.members;
                        const name = m ? `${m.first_name} ${m.last_name}` : "Unknown";
                        const isLeader = (group as any).leader_id === gm.member_id;
                        return (
                          <tr key={gm.member_id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                  style={{ backgroundColor: hashColor(name) }}>
                                  {getInitials(name)}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{name}</p>
                                  {m?.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-xs text-muted-foreground hidden sm:table-cell">
                              {gm.joined_at ? formatDistanceToNow(new Date(gm.joined_at), { addSuffix: true }) : "—"}
                            </td>
                            <td className="px-4 py-3.5">
                              {isLeader ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                  <Crown className="h-3 w-3" />Leader
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Member</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="font-jakarta text-sm">
                                  {!isLeader && (
                                    <DropdownMenuItem onClick={() => setLeaderMut.mutate(gm.member_id)}>
                                      <Crown className="h-3.5 w-3.5 mr-2 text-amber-500" />Set as Leader
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => removeMemberMut.mutate(gm.member_id)}>
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />Remove from Group
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="bg-card rounded-xl border border-border/50 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold text-foreground font-jakarta">Group Information</h2>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-3.5 w-3.5" />Edit
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { label: "Description", value: (group as any).description },
                    { label: "Meeting Schedule", value: (group as any).meeting_day ? `${(group as any).meeting_day}${(group as any).meeting_time ? ` · ${(group as any).meeting_time}` : ""}` : null },
                    { label: "Location", value: (group as any).location || (group as any).meeting_location },
                    { label: "Status", value: group.is_active ? "Active" : "Inactive" },
                    { label: "Max Members", value: (group as any).max_members ? String((group as any).max_members) : "Unlimited" },
                    { label: "Visibility", value: (group as any).visibility === "public" ? "Public" : "Private" },
                    { label: "Meeting Type", value: mtCfg.label },
                    { label: "Jitsi Room", value: (mt === "online" || mt === "hybrid") ? (group as any).jitsi_room_name : null },
                    { label: "Tags", value: (group as any).tags?.length > 0 ? (group as any).tags.join(", ") : null },
                    { label: "Created", value: group.created_at ? new Date(group.created_at).toLocaleDateString() : null },
                  ].map(field => (
                    <div key={field.label}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{field.label}</p>
                      <p className="text-sm text-foreground">{field.value || <span className="text-muted-foreground">—</span>}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <GroupDrawer open={editOpen} onClose={() => setEditOpen(false)} tenantId={tenantId} groupTypes={groupTypes} editData={group} onSuccess={() => qc.invalidateQueries({ queryKey: ["group", groupId] })} />
      <JitsiModal open={jitsiOpen} onClose={() => setJitsiOpen(false)} roomName={(group as any).jitsi_room_name || ""} displayName={userName} title={group.name} />
    </>
  );
};

export default GroupDetail;