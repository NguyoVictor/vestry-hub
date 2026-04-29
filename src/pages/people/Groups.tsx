import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import { JitsiModal } from "@/components/shared/JitsiModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";
import {
  Users, UserCheck, Globe, MapPin, LayoutGrid, List, Search,
  Plus, Video, GitMerge, ChevronRight, Crown,
} from "lucide-react";
import { GroupDrawer } from "./GroupDrawer";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ["#7c3aed","#3b82f6","#10b981","#f59e0b","#f43f5e","#f97316","#ec4899","#14b8a6","#6366f1","#84cc16"];
  return colors[Math.abs(hash) % colors.length];
}

const MEETING_TYPE_CONFIG = {
  online:  { label: "Online",  icon: Globe,     bg: "bg-violet-100 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300" },
  onsite:  { label: "Onsite",  icon: MapPin,     bg: "bg-blue-100 dark:bg-blue-950/40",    text: "text-blue-700 dark:text-blue-300" },
  hybrid:  { label: "Hybrid",  icon: GitMerge,   bg: "bg-amber-100 dark:bg-amber-950/40",  text: "text-amber-700 dark:text-amber-300" },
};

// ── GroupCard ─────────────────────────────────────────────────────────────────
function GroupCard({ g, memberCount, members, index, onJoin }: {
  g: any; memberCount: number; members: any[]; index: number;
  onJoin: (roomName: string, title: string) => void;
}) {
  const navigate = useNavigate();
  const color = g.cover_color || g.color || "#6366f1";
  const mtCfg = MEETING_TYPE_CONFIG[g.meeting_type as keyof typeof MEETING_TYPE_CONFIG] || MEETING_TYPE_CONFIG.onsite;
  const MtIcon = mtCfg.icon;
  const initials = getInitials(g.name || "G");
  const showJoin = (g.meeting_type === "online" || g.meeting_type === "hybrid") && g.jitsi_room_name;
  const first4 = members.slice(0, 4);
  const extra = memberCount > 4 ? memberCount - 4 : 0;

  return (
    <BlurFadeIn delay={index * 0.06}>
      <motion.div
        whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="rounded-2xl border border-border/50 bg-card overflow-hidden cursor-pointer"
        style={{ borderLeftColor: color, borderLeftWidth: 4 }}
        onClick={() => navigate(`/groups/${g.id}`)}
      >
        {/* Top color band */}
        <div className="h-20 relative flex items-center px-4" style={{ backgroundColor: `${color}26` }}>
          {/* Initials avatar */}
          <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
            style={{ backgroundColor: `${color}40`, color }}>
            {initials}
          </div>
          {/* Meeting type badge */}
          <div className={`absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${mtCfg.bg} ${mtCfg.text}`}>
            <MtIcon className="h-2.5 w-2.5" />
            {mtCfg.label}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base text-foreground truncate">{g.name}</p>
              {g.group_type_label && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mt-0.5"
                  style={{ backgroundColor: `${g.group_type_color || "#6366f1"}20`, color: g.group_type_color || "#6366f1" }}>
                  {g.group_type_label}
                </span>
              )}
            </div>
          </div>
          {g.description && <p className="text-xs text-muted-foreground line-clamp-2">{g.description}</p>}
          {/* Meeting info */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {g.meeting_day && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{g.meeting_day}{g.meeting_time ? ` · ${g.meeting_time}` : ""}</span>}
            {(g.meeting_type === "online" || g.meeting_type === "hybrid") && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />Online via Jitsi</span>}
            {g.meeting_type === "onsite" && g.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{g.location}</span>}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-4 pb-4 pt-3 flex items-center justify-between">
          {/* Avatar stack */}
          <div className="flex items-center">
            {memberCount === 0 ? (
              <span className="text-xs text-muted-foreground">No members yet</span>
            ) : (
              <div className="flex -space-x-1.5">
                {first4.map((m: any, i: number) => {
                  const name = m.members ? `${m.members.first_name} ${m.members.last_name}` : "?";
                  const bg = hashColor(name);
                  return (
                    <div key={m.member_id || i} className="h-6 w-6 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ backgroundColor: bg, zIndex: i }}>
                      {getInitials(name)}
                    </div>
                  );
                })}
                {extra > 0 && (
                  <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground" style={{ zIndex: 4 }}>
                    +{extra}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {showJoin && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2"
                onClick={() => onJoin(g.jitsi_room_name, g.name)}>
                <Video className="h-3 w-3" />Join
              </Button>
            )}
            <button className="text-sm text-primary hover:underline flex items-center gap-0.5"
              onClick={() => navigate(`/groups/${g.id}`)}>
              View <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </BlurFadeIn>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const Groups = () => {
  const { tenantId, userName } = useChurch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterMeeting, setFilterMeeting] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [jitsi, setJitsi] = useState<{ open: boolean; room: string; title: string }>({ open: false, room: "", title: "" });

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.GROUPS)
        .select("*").eq(COLS.TENANT_ID, tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });

  const { data: groupTypes = [] } = useQuery({
    queryKey: ["group-types", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.GROUP_TYPES)
        .select("*").eq(COLS.TENANT_ID, tenantId).eq("is_active", true).order("sort_order");
      return data || [];
    },
    staleTime: 300_000,
  });

  const { data: memberCounts = {} } = useQuery({
    queryKey: ["group-member-counts", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.GROUP_MEMBERS).select("group_id").eq(COLS.TENANT_ID, tenantId);
      const counts: Record<string, number> = {};
      (data || []).forEach((gm: any) => { counts[gm.group_id] = (counts[gm.group_id] || 0) + 1; });
      return counts;
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });

  const { data: allGroupMembers = [] } = useQuery({
    queryKey: ["all-group-members-preview", tenantId],
    queryFn: async () => {
      const { data: gm } = await supabase.from(TABLES.GROUP_MEMBERS)
        .select("group_id, member_id").eq(COLS.TENANT_ID, tenantId);
      if (!gm?.length) return [];
      const ids = [...new Set(gm.map(r => r.member_id))];
      const { data: memberDetails } = await supabase.from(TABLES.MEMBERS)
        .select("id, first_name, last_name").in("id", ids);
      const map = Object.fromEntries((memberDetails || []).map(m => [m.id, m]));
      return gm.map(r => ({ ...r, members: map[r.member_id] || null }));
    },
    staleTime: 300_000,
  });

  // Build type map for labels/colors
  const typeMap = useMemo(() => {
    const m: Record<string, { label: string; color: string }> = {};
    groupTypes.forEach((t: any) => { m[t.id] = { label: t.label, color: t.color }; });
    return m;
  }, [groupTypes]);

  // Enrich groups with type label/color
  const enrichedGroups = useMemo(() => groups.map((g: any) => ({
    ...g,
    group_type_label: (() => {
      // Check if there's a custom group type stored in tags
      if (g.tags && Array.isArray(g.tags)) {
        const groupTypeTag = g.tags.find((tag: string) => tag.startsWith('group_type:'));
        if (groupTypeTag) {
          const typeId = groupTypeTag.replace('group_type:', '');
          const customType = groupTypes.find(t => t.id === typeId);
          if (customType) return customType.label;
        }
      }
      // Fall back to enum value display
      return g.type && g.type !== 'other' ? g.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : null;
    })(),
    group_type_color: (() => {
      // Check if there's a custom group type stored in tags
      if (g.tags && Array.isArray(g.tags)) {
        const groupTypeTag = g.tags.find((tag: string) => tag.startsWith('group_type:'));
        if (groupTypeTag) {
          const typeId = groupTypeTag.replace('group_type:', '');
          const customType = groupTypes.find(t => t.id === typeId);
          if (customType) return customType.color;
        }
      }
      return "#6366f1"; // Default color for enum types
    })(),
  })), [groups, groupTypes]);

  // Members per group (first 4 for avatar stack)
  const membersByGroup = useMemo(() => {
    const m: Record<string, any[]> = {};
    (allGroupMembers as any[]).forEach(gm => {
      if (!m[gm.group_id]) m[gm.group_id] = [];
      m[gm.group_id].push(gm);
    });
    return m;
  }, [allGroupMembers]);

  // Stats
  const totalMembers = Object.values(memberCounts).reduce((a, b) => a + b, 0);
  const onlineCount = groups.filter((g: any) => g.meeting_type === "online").length;
  const onsiteCount = groups.filter((g: any) => g.meeting_type === "onsite" || !g.meeting_type).length;

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...enrichedGroups];
    if (search) list = list.filter(g => g.name?.toLowerCase().includes(search.toLowerCase()) || g.description?.toLowerCase().includes(search.toLowerCase()));
    if (filterType !== "all") {
      list = list.filter(g => {
        // Check if filtering by group type ID (from group_types table)
        if (groupTypes.some(t => t.id === filterType)) {
          const selectedType = groupTypes.find(t => t.id === filterType);
          const enumValue = selectedType?.label.toLowerCase().replace(/\s+/g, '_');
          return g.type === enumValue;
        }
        // Direct enum value match
        return g.type === filterType;
      });
    }
    if (filterMeeting !== "all") list = list.filter(g => (g.meeting_type || "onsite") === filterMeeting);
    if (sortBy === "az") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "members") list.sort((a, b) => (memberCounts[b.id] || 0) - (memberCounts[a.id] || 0));
    return list;
  }, [enrichedGroups, search, filterType, filterMeeting, sortBy, memberCounts]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.GROUPS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["groups", tenantId] }); toast.success("Group deleted"); },
    onError: () => toast.error("Failed to delete group"),
  });

  const clearFilters = () => { setSearch(""); setFilterType("all"); setFilterMeeting("all"); };
  const hasFilters = search || filterType !== "all" || filterMeeting !== "all";

  return (
    <>
      <Helmet><title>Groups — Vestry</title></Helmet>
      <BlurFadeIn delay={0}>
        <div className="space-y-6 font-jakarta">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground font-jakarta">Groups</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Organize your members into ministry groups</p>
              {/* Stats row */}
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  { icon: Users, value: groups.length, label: "Total Groups" },
                  { icon: UserCheck, value: totalMembers, label: "Total Members" },
                  { icon: Globe, value: onlineCount, label: "Online Groups" },
                  { icon: MapPin, value: onsiteCount, label: "Onsite Groups" },
                ].map((s, i) => (
                  <BlurFadeIn key={s.label} delay={0.07 * (i + 1)}>
                    <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5 text-sm">
                      <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{s.value}</span>
                      <span className="text-muted-foreground">{s.label}</span>
                    </div>
                  </BlurFadeIn>
                ))}
              </div>
            </div>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white shrink-0 font-jakarta"
              onClick={() => { setEditGroup(null); setDrawerOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" />Create Group
            </Button>
          </div>

          {/* Toolbar */}
          <BlurFadeIn delay={0.1}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search groups..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm border-slate-200 focus:border-orange-500" />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 w-36 text-sm border-slate-200"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {groupTypes.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterMeeting} onValueChange={setFilterMeeting}>
                <SelectTrigger className="h-9 w-32 text-sm border-slate-200"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="onsite">Onsite</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-9 text-muted-foreground gap-1" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
              <div className="ml-auto flex items-center gap-1 border border-border rounded-lg overflow-hidden">
                <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "bg-orange-500 text-white" : "text-muted-foreground hover:bg-muted"}`}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode("list")} className={`p-2 transition-colors ${viewMode === "list" ? "bg-orange-500 text-white" : "text-muted-foreground hover:bg-muted"}`}>
                  <List className="h-4 w-4" />
                </button>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-9 w-32 text-sm border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="az">A–Z</SelectItem>
                  <SelectItem value="members">Most Members</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </BlurFadeIn>

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              {hasFilters ? (
                <>
                  <Search className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-base font-semibold text-foreground">No groups match your search</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                  <button className="text-sm text-primary hover:underline" onClick={clearFilters}>Clear all filters</button>
                </>
              ) : (
                <>
                  <div className="h-16 w-16 rounded-2xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                    <Users className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                  </div>
                  <p className="text-base font-semibold text-foreground">No groups yet</p>
                  <p className="text-sm text-muted-foreground max-w-sm">Create your first ministry group to organize your congregation</p>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta" onClick={() => { setEditGroup(null); setDrawerOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1.5" />Create Group
                  </Button>
                </>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((g: any, i: number) => (
                <GroupCard key={g.id} g={g} memberCount={memberCounts[g.id] || 0}
                  members={(membersByGroup[g.id] || []).slice(0, 4)} index={i}
                  onJoin={(room, title) => setJitsi({ open: true, room, title })} />
              ))}
            </div>
          ) : (
            // List view
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
              <table className="w-full text-sm font-jakarta">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-8" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Meeting</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Members</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Schedule</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g: any, i: number) => {
                    const color = g.cover_color || g.color || "#6366f1";
                    const mt = g.meeting_type || "onsite";
                    const mtCfg = MEETING_TYPE_CONFIG[mt as keyof typeof MEETING_TYPE_CONFIG] || MEETING_TYPE_CONFIG.onsite;
                    const MtIcon = mtCfg.icon;
                    return (
                      <motion.tr key={g.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.25 }}
                        className="border-b border-border/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/groups/${g.id}`)}>
                        <td className="px-4 py-3.5">
                          <span className="h-3 w-3 rounded-full block" style={{ backgroundColor: color }} />
                        </td>
                        <td className="px-4 py-3.5 font-medium text-foreground">{g.name}</td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          {g.group_type_label && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{ backgroundColor: `${g.group_type_color || "#6366f1"}20`, color: g.group_type_color || "#6366f1" }}>
                              {g.group_type_label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${mtCfg.bg} ${mtCfg.text}`}>
                            <MtIcon className="h-2.5 w-2.5" />{mtCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{memberCounts[g.id] || 0}</td>
                        <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">
                          {g.meeting_day ? `${g.meeting_day}${g.meeting_time ? ` · ${g.meeting_time}` : ""}` : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1" onClick={() => navigate(`/groups/${g.id}`)}>
                            View <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </BlurFadeIn>

      <GroupDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditGroup(null); }}
        tenantId={tenantId}
        groupTypes={groupTypes}
        editData={editGroup}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["groups", tenantId] })}
      />

      <JitsiModal
        open={jitsi.open}
        onClose={() => setJitsi(j => ({ ...j, open: false }))}
        roomName={jitsi.room}
        displayName={userName}
        title={jitsi.title}
      />
    </>
  );
};

export default Groups;
