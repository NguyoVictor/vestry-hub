import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import { JitsiModal } from "@/components/shared/JitsiModal";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Users, Globe, MapPin, GitMerge, Video, Crown, ArrowLeft,
  CalendarDays, CheckCircle2, ChevronRight,
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

// ── Member Group Card ─────────────────────────────────────────────────────────
function MemberGroupCard({ g, isLeader, memberCount, members, onJoin, showJoin }: {
  g: any; isLeader: boolean; memberCount: number; members: any[];
  onJoin: (room: string, title: string) => void; showJoin: boolean;
}) {
  const color = g.cover_color || g.color || "#6366f1";
  const mt = g.meeting_type || "onsite";
  const mtCfg = MT_CONFIG[mt as keyof typeof MT_CONFIG] || MT_CONFIG.onsite;
  const MtIcon = mtCfg.icon;
  const initials = getInitials(g.name || "G");
  const first4 = members.slice(0, 4);
  const extra = memberCount > 4 ? memberCount - 4 : 0;

  return (
    <motion.div whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="rounded-2xl border border-border/50 bg-card overflow-hidden"
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
      {/* Top band */}
      <div className="h-20 relative flex items-center px-4" style={{ backgroundColor: `${color}26` }}>
        <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
          style={{ backgroundColor: `${color}40`, color }}>{initials}</div>
        <div className={`absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${mtCfg.bg} ${mtCfg.text}`}>
          <MtIcon className="h-2.5 w-2.5" />{mtCfg.label}
        </div>
      </div>
      {/* Body */}
      <div className="p-4 space-y-2">
        <p className="font-semibold text-base text-foreground truncate font-jakarta">{g.name}</p>
        {g.description && <p className="text-xs text-muted-foreground line-clamp-2">{g.description}</p>}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {g.meeting_day && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{g.meeting_day}{g.meeting_time ? ` · ${g.meeting_time}` : ""}</span>}
          {(mt === "online" || mt === "hybrid") && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />Online via Jitsi</span>}
          {mt === "onsite" && g.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{g.location}</span>}
        </div>
      </div>
      {/* Footer */}
      <div className="border-t border-border/50 px-4 pb-4 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {first4.map((m: any, i: number) => {
              const name = m.members ? `${m.members.first_name} ${m.members.last_name}` : "?";
              return (
                <div key={m.member_id || i} className="h-6 w-6 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ backgroundColor: hashColor(name), zIndex: i }}>
                  {getInitials(name)}
                </div>
              );
            })}
            {extra > 0 && <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground" style={{ zIndex: 4 }}>+{extra}</div>}
          </div>
          {isLeader && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <Crown className="h-3 w-3" />You are the leader
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showJoin && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => onJoin(g.jitsi_room_name, g.name)}>
              <Video className="h-3 w-3" />Join
            </Button>
          )}
          <Link to={`/member/groups/${g.id}`} className="text-sm text-primary hover:underline flex items-center gap-0.5">
            View <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── My Groups Tab ─────────────────────────────────────────────────────────────
export function MemberGroups() {
  const member = useMemberPortal();
  const [activeTab, setActiveTab] = useState<"mine"|"discover">("mine");
  const [jitsi, setJitsi] = useState<{ open: boolean; room: string; title: string }>({ open: false, room: "", title: "" });
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { data: myGroups = [], isLoading: myLoading } = useQuery({
    queryKey: ["member-my-groups", member.memberId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.GROUP_MEMBERS)
        .select("group_id, groups(id, name, description, cover_color, color, meeting_type, meeting_day, meeting_time, location, is_active, jitsi_room_name, leader_id, group_type_id)")
        .eq("member_id", member.memberId);
      return (data || []).map((gm: any) => gm.groups).filter(Boolean);
    },
    staleTime: 300_000,
  });

  const { data: publicGroups = [], isLoading: pubLoading } = useQuery({
    queryKey: ["public-groups", member.churchId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.GROUPS)
        .select("id, name, description, cover_color, color, meeting_type, meeting_day, meeting_time, location, jitsi_room_name, group_type_id")
        .eq(COLS.TENANT_ID, member.churchId).eq("visibility", "public").eq("is_active", true);
      return data || [];
    },
    staleTime: 300_000,
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ["my-join-requests", member.memberId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.JOIN_REQUESTS)
        .select("group_id, status").eq("member_id", member.memberId);
      return data || [];
    },
    staleTime: 300_000,
  });

  const { data: allGroupMembers = [] } = useQuery({
    queryKey: ["all-group-members-preview", member.churchId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.GROUP_MEMBERS)
        .select("group_id, member_id, members(first_name, last_name)")
        .eq(COLS.TENANT_ID, member.churchId);
      return data || [];
    },
    staleTime: 300_000,
  });

  const membersByGroup: Record<string, any[]> = {};
  (allGroupMembers as any[]).forEach(gm => {
    if (!membersByGroup[gm.group_id]) membersByGroup[gm.group_id] = [];
    membersByGroup[gm.group_id].push(gm);
  });

  const myGroupIds = new Set(myGroups.map((g: any) => g.id));
  const pendingGroupIds = new Set((myRequests as any[]).filter(r => r.status === "pending").map(r => r.group_id));

  const requestMut = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from(TABLES.JOIN_REQUESTS)
        .insert({ group_id: groupId, member_id: member.memberId, status: "pending" } as never);
      if (error) throw error;
    },
    onMutate: (groupId) => {
      setPendingRequests(prev => new Set([...prev, groupId]));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-join-requests", member.memberId] });
      toast.success("Request sent! Waiting for admin approval.");
    },
    onError: (_, groupId) => {
      setPendingRequests(prev => { const n = new Set(prev); n.delete(groupId); return n; });
      toast.error("Failed to send request");
    },
  });

  const memberName = `${member.firstName} ${member.lastName}`;

  return (
    <>
      <Helmet><title>My Groups — Vestry</title></Helmet>
      <div className="font-jakarta max-w-4xl mx-auto space-y-6 pb-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <BlurFadeIn delay={0}><p className="text-xs uppercase tracking-widest text-muted-foreground font-jakarta">MY GROUPS</p></BlurFadeIn>
          <BlurFadeIn delay={0.07}><h1 className="text-2xl font-bold text-foreground font-jakarta">Your Ministry Communities</h1></BlurFadeIn>
          <BlurFadeIn delay={0.14}><p className="text-sm text-muted-foreground font-jakarta">Connect with your church groups and join online meetings</p></BlurFadeIn>
          <BlurFadeIn delay={0.21}>
            <div className="inline-flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5 text-sm">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground">{myGroups.length}</span>
              <span className="text-muted-foreground">group{myGroups.length !== 1 ? "s" : ""}</span>
            </div>
          </BlurFadeIn>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 justify-center">
          {(["mine","discover"] as const).map(tab => (
            <div key={tab} className="relative">
              <button onClick={() => setActiveTab(tab)}
                className={`relative z-10 px-5 py-2 rounded-full text-sm font-medium transition-colors font-jakarta ${activeTab === tab ? "text-white" : "text-muted-foreground hover:text-foreground"}`}>
                {activeTab === tab && <motion.div layoutId="memberGroupsTab" className="absolute inset-0 rounded-full bg-orange-500" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                <span className="relative z-10">{tab === "mine" ? "My Groups" : "Discover"}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "mine" ? (
            <motion.div key="mine" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {myLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
                </div>
              ) : myGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                    <Users className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-jakarta">You are not in any groups yet</p>
                  <p className="text-sm text-muted-foreground font-jakarta">Your church admin will add you to groups</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myGroups.map((g: any, i: number) => (
                    <BlurFadeIn key={g.id} delay={i * 0.06}>
                      <MemberGroupCard
                        g={g}
                        isLeader={g.leader_id === member.memberId}
                        memberCount={membersByGroup[g.id]?.length || 0}
                        members={(membersByGroup[g.id] || []).slice(0, 4)}
                        showJoin={(g.meeting_type === "online" || g.meeting_type === "hybrid") && !!g.jitsi_room_name}
                        onJoin={(room, title) => setJitsi({ open: true, room, title })}
                      />
                    </BlurFadeIn>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="discover" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {pubLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
                </div>
              ) : publicGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Globe className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-base font-semibold text-foreground font-jakarta">No public groups available</p>
                  <p className="text-sm text-muted-foreground font-jakarta">Check back soon or contact your church admin</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publicGroups.map((g: any, i: number) => {
                    const color = g.cover_color || g.color || "#6366f1";
                    const isMember = myGroupIds.has(g.id);
                    const isPending = pendingGroupIds.has(g.id) || pendingRequests.has(g.id);
                    return (
                      <BlurFadeIn key={g.id} delay={i * 0.06}>
                        <motion.div whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className="rounded-2xl border border-border/50 bg-card overflow-hidden"
                          style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
                          <div className="h-20 relative flex items-center px-4" style={{ backgroundColor: `${color}26` }}>
                            <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
                              style={{ backgroundColor: `${color}40`, color }}>{getInitials(g.name || "G")}</div>
                          </div>
                          <div className="p-4 space-y-2">
                            <p className="font-semibold text-base text-foreground font-jakarta">{g.name}</p>
                            {g.description && <p className="text-xs text-muted-foreground line-clamp-2">{g.description}</p>}
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {g.meeting_day && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{g.meeting_day}</span>}
                            </div>
                          </div>
                          <div className="border-t border-border/50 px-4 pb-4 pt-3 flex items-center justify-end">
                            {isMember ? (
                              <span className="text-xs text-muted-foreground font-jakarta">Already a member</span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-jakarta">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />Request Sent ✓
                              </span>
                            ) : (
                              <Button size="sm" variant="outline" className="h-8 text-xs font-jakarta border-orange-300 text-orange-600 hover:bg-orange-50"
                                onClick={() => requestMut.mutate(g.id)} disabled={requestMut.isPending}>
                                Request to Join
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      </BlurFadeIn>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <JitsiModal open={jitsi.open} onClose={() => setJitsi(j => ({ ...j, open: false }))} roomName={jitsi.room} displayName={memberName} title={jitsi.title} />
    </>
  );
}

// ── Member Group Detail ───────────────────────────────────────────────────────
export function MemberGroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const member = useMemberPortal();
  const [jitsiOpen, setJitsiOpen] = useState(false);

  const { data: group, isLoading } = useQuery({
    queryKey: ["member-group", groupId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.GROUPS).select("*").eq("id", groupId!).single();
      return data;
    },
    enabled: !!groupId,
    staleTime: 300_000,
  });

  const { data: groupMembers = [] } = useQuery({
    queryKey: ["group-members-list", groupId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.GROUP_MEMBERS)
        .select("member_id, members(id, first_name, last_name, avatar_url)").eq("group_id", groupId!);
      return (data || []).map((gm: any) => gm.members).filter(Boolean);
    },
    enabled: !!groupId,
    staleTime: 300_000,
  });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!group) return <div className="text-center py-16 text-muted-foreground font-jakarta">Group not found</div>;

  const color = (group as any).cover_color || (group as any).color || "#6366f1";
  const mt = (group as any).meeting_type || "onsite";
  const showJoin = (mt === "online" || mt === "hybrid") && (group as any).jitsi_room_name;
  const memberName = `${member.firstName} ${member.lastName}`;

  return (
    <>
      <Helmet><title>{group.name} — Vestry</title></Helmet>
      <div className="font-jakarta max-w-lg mx-auto space-y-5 pb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/member/groups")} className="gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />My Groups
        </Button>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center font-bold text-2xl shrink-0"
            style={{ backgroundColor: `${color}30`, color }}>{getInitials(group.name || "G")}</div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-jakarta">{group.name}</h1>
            {(group as any).description && <p className="text-sm text-muted-foreground mt-0.5">{(group as any).description}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {(group as any).meeting_day && <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{(group as any).meeting_day}{(group as any).meeting_time ? ` at ${(group as any).meeting_time}` : ""}</span>}
          {(group as any).location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{(group as any).location}</span>}
        </div>
        {showJoin && (
          <Button className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta gap-2" onClick={() => setJitsiOpen(true)}>
            <Video className="h-4 w-4" />Join Meeting
          </Button>
        )}
        <div>
          <h2 className="font-semibold mb-3 font-jakarta">Members ({groupMembers.length})</h2>
          <div className="flex flex-wrap gap-3">
            {groupMembers.map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 bg-card rounded-full border border-border px-3 py-1.5">
                <MemberAvatar name={`${m.first_name} ${m.last_name}`} avatarUrl={m.avatar_url} size="sm" />
                <span className="text-sm font-jakarta">{m.first_name} {m.last_name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <JitsiModal open={jitsiOpen} onClose={() => setJitsiOpen(false)} roomName={(group as any).jitsi_room_name || ""} displayName={memberName} title={group.name} />
    </>
  );
}
