// Fellowship Detail Page
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { TABLES, COLS } from "@/lib/schema";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, Users, MapPin, Clock, Calendar, Crown,
  UserPlus, Trash2, MoreHorizontal, CheckCircle2, XCircle,
  BarChart3, TrendingUp, Activity, ChevronDown, Plus,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const PRESET_COLORS_DETAIL = ["#f97316","#7c3aed","#3b82f6","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6","#6366f1","#84cc16"];
const DAYS_DETAIL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function hashColor(str: string) {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const c = ["#7c3aed","#3b82f6","#10b981","#f59e0b","#f43f5e","#f97316","#ec4899","#14b8a6","#6366f1","#84cc16"];
  return c[Math.abs(h) % c.length];
}

// ── Attendance Session Modal ──────────────────────────────────────────────────
function RecordAttendanceModal({ fellowshipId, tenantId, members, onClose, onSaved }: {
  fellowshipId: string; tenantId: string; members: any[]; onClose: () => void; onSaved: () => void;
}) {
  const [sessionDate, setSessionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [present, setPresent] = useState<Set<string>>(new Set(members.map((m: any) => m.member_id)));
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => setPresent(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = members.map((m: any) => ({
        fellowship_id: fellowshipId, tenant_id: tenantId,
        session_date: sessionDate, member_id: m.member_id,
        status: present.has(m.member_id) ? "present" : "absent",
      }));
      const { error } = await supabase.from(TABLES.FELLOWSHIP_ATTENDANCE)
        .upsert(rows, { onConflict: "fellowship_id,session_date,member_id" });
      if (error) throw error;
      toast.success("Attendance recorded");
      onSaved(); onClose();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden font-jakarta">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-foreground">Record Attendance</h2>
          <div className="mt-3">
            <label className="text-xs font-medium text-slate-600 block mb-1">Session Date</label>
            <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:border-orange-500" />
          </div>
        </div>
        <div className="px-6 py-4 max-h-72 overflow-y-auto space-y-2">
          {members.map((m: any) => {
            const name = m.members ? `${m.members.first_name} ${m.members.last_name}` : "Unknown";
            const isPresent = present.has(m.member_id);
            return (
              <div key={m.member_id} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: hashColor(name) }}>{getInitials(name)}</div>
                  <span className="text-sm font-medium text-foreground">{name}</span>
                </div>
                <button onClick={() => toggle(m.member_id)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${isPresent ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {isPresent ? <><CheckCircle2 className="h-3 w-3" />Present</> : <><XCircle className="h-3 w-3" />Absent</>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="px-6 pb-6 pt-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const FellowshipDetail = () => {
  const { fellowshipId } = useParams<{ fellowshipId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { tenantId } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('member_management') || isReadOnly('groups_ministries');
  const [activeTab, setActiveTab] = useState<"members"|"attendance"|"analytics"|"details">("members");
  const [selectedMember, setSelectedMember] = useState("");
  const [recordingAttendance, setRecordingAttendance] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Edit form state
  const [eName, setEName] = useState("");
  const [eZone, setEZone] = useState("");
  const [eHostName, setEHostName] = useState("");
  const [eHostAddress, setEHostAddress] = useState("");
  const [eMeetingDay, setEMeetingDay] = useState("");
  const [eMeetingTime, setEMeetingTime] = useState("");
  const [eMaxCapacity, setEMaxCapacity] = useState("");
  const [eNotes, setENotes] = useState("");
  const [eIsActive, setEIsActive] = useState(true);
  const [eColor, setEColor] = useState("#f97316");
  const [eSaving, setESaving] = useState(false);

  // ── Fellowship data ──────────────────────────────────────────────────────
  const { data: fellowship, isLoading } = useQuery({
    queryKey: ["fellowship", fellowshipId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.HOUSE_FELLOWSHIPS)
        .select("*").eq("id", fellowshipId!).single();
      if (error) throw error; return data;
    },
    enabled: !!fellowshipId, staleTime: 300_000,
  });

  // ── Members ──────────────────────────────────────────────────────────────
  const { data: fellowshipMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["fellowship-members", fellowshipId],
    queryFn: async () => {
      const { data: fm } = await supabase.from(TABLES.FELLOWSHIP_MEMBERS)
        .select("member_id, role, joined_at").eq("fellowship_id", fellowshipId!);
      if (!fm?.length) return [];
      const ids = fm.map(r => r.member_id);
      const { data: memberDetails } = await supabase.from(TABLES.MEMBERS)
        .select("id, first_name, last_name, email, avatar_url").in("id", ids);
      const map = Object.fromEntries((memberDetails || []).map(m => [m.id, m]));
      return fm.map(r => ({ ...r, members: map[r.member_id] || null }));
    },
    enabled: !!fellowshipId, staleTime: 300_000,
  });

  // Realtime for members
  useEffect(() => {
    if (!fellowshipId) return;
    const ch = supabase.channel(`fellowship-members-${fellowshipId}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "fellowship_members", filter: `fellowship_id=eq.${fellowshipId}` },
        () => qc.invalidateQueries({ queryKey: ["fellowship-members", fellowshipId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fellowshipId, qc]);

  // ── All members for dropdown ─────────────────────────────────────────────
  const { data: allMembers = [] } = useQuery({
    queryKey: ["all-members", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.MEMBERS)
        .select("id, first_name, last_name").eq(COLS.TENANT_ID, tenantId).eq("status", "active");
      return data || [];
    }, staleTime: 300_000,
  });

  const existingIds = new Set(fellowshipMembers.map((fm: any) => fm.member_id));
  const available = allMembers.filter((m: any) => !existingIds.has(m.id));

  // ── Attendance ───────────────────────────────────────────────────────────
  const { data: attendanceSessions = [] } = useQuery({
    queryKey: ["fellowship-attendance", fellowshipId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.FELLOWSHIP_ATTENDANCE)
        .select("session_date, status, member_id")
        .eq("fellowship_id", fellowshipId!).order("session_date", { ascending: false });
      // Group by session_date
      const sessions: Record<string, { present: number; absent: number }> = {};
      (data || []).forEach((r: any) => {
        if (!sessions[r.session_date]) sessions[r.session_date] = { present: 0, absent: 0 };
        sessions[r.session_date][r.status as "present"|"absent"]++;
      });
      return Object.entries(sessions).map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    enabled: !!fellowshipId, staleTime: 60_000,
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const addMemberMut = useMutation({
    mutationFn: async (memberId: string) => {
      if (readOnly) return;
      const { error } = await supabase.from(TABLES.FELLOWSHIP_MEMBERS)
        .insert({ fellowship_id: fellowshipId!, member_id: memberId, tenant_id: tenantId } as any);
      if (error) { if (error.code === "23505") throw new Error("Already a member"); throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fellowship-members", fellowshipId] }); toast.success("Member added"); setSelectedMember(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMemberMut = useMutation({
    mutationFn: async (memberId: string) => {
      if (readOnly) return;
      const { error } = await supabase.from(TABLES.FELLOWSHIP_MEMBERS)
        .delete().eq("fellowship_id", fellowshipId!).eq("member_id", memberId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fellowship-members", fellowshipId] }); toast.success("Member removed"); },
  });

  const setLeaderMut = useMutation({
    mutationFn: async (memberId: string) => {
      if (readOnly) return;
      const { error } = await supabase.from(TABLES.HOUSE_FELLOWSHIPS)
        .update({ leader_id: memberId } as any).eq("id", fellowshipId!);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fellowship", fellowshipId] }); toast.success("Leader updated"); },
  });

  const openEdit = () => {
    if (!fellowship) return;
    setEName((fellowship as any).name || "");
    setEZone((fellowship as any).zone || "");
    setEHostName((fellowship as any).host_name || "");
    setEHostAddress((fellowship as any).host_address || "");
    setEMeetingDay((fellowship as any).meeting_day || "");
    setEMeetingTime((fellowship as any).meeting_time || "");
    setEMaxCapacity((fellowship as any).max_capacity ? String((fellowship as any).max_capacity) : "");
    setENotes((fellowship as any).notes || "");
    setEIsActive((fellowship as any).is_active ?? true);
    setEColor((fellowship as any).cover_color || "#f97316");
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (readOnly) return;
    if (!eName.trim()) { toast.error("Name is required"); return; }
    setESaving(true);
    try {
      const { error } = await supabase.from(TABLES.HOUSE_FELLOWSHIPS).update({
        name: eName.trim(), zone: eZone.trim() || null, host_name: eHostName.trim() || null,
        host_address: eHostAddress.trim() || null, meeting_day: eMeetingDay || null,
        meeting_time: eMeetingTime || null, max_capacity: eMaxCapacity ? parseInt(eMaxCapacity) : null,
        notes: eNotes.trim() || null, is_active: eIsActive, cover_color: eColor,
      } as any).eq("id", fellowshipId!);
      if (error) throw error;
      toast.success("Fellowship updated");
      qc.invalidateQueries({ queryKey: ["fellowship", fellowshipId] });
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setESaving(false);
    }
  };

  if (isLoading) return (
    <div className="space-y-6 font-jakarta">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
  if (!fellowship) return <div className="text-center py-16 text-muted-foreground font-jakarta">Fellowship not found</div>;

  const color = (fellowship as any).cover_color || "#f97316";
  const memberCount = fellowshipMembers.length;
  const maxM = (fellowship as any).max_capacity;

  // Analytics data
  const avgAttendance = attendanceSessions.length > 0
    ? Math.round(attendanceSessions.reduce((sum, s) => sum + (s.present / (s.present + s.absent) * 100), 0) / attendanceSessions.length)
    : 0;
  const lastSession = attendanceSessions[0];
  const capacityPct = maxM ? Math.round((memberCount / maxM) * 100) : null;

  const TABS = [
    { key: "members", label: `Members · ${memberCount}${maxM ? `/${maxM}` : ""}` },
    { key: "attendance", label: "Attendance" },
    { key: "analytics", label: "Analytics" },
    { key: "details", label: "Details" },
  ] as const;

  return (
    <>
      <Helmet><title>{fellowship.name} — Vestry</title></Helmet>
      <div className="font-jakarta space-y-6">
        {/* Header band */}
        <BlurFadeIn delay={0}>
          <div className="rounded-2xl border border-border/50 overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${color}18 0%, transparent 100%)` }}>
            <div className="px-6 py-8 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="flex-1">
                  <button onClick={() => navigate("/house-fellowships")}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
                    <ArrowLeft className="h-4 w-4" />Back to House Fellowships
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl flex items-center justify-center font-bold text-2xl shrink-0"
                      style={{ backgroundColor: `${color}30`, color }}>
                      {getInitials(fellowship.name || "HF")}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-foreground">{fellowship.name}</h1>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {(fellowship as any).zone && (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                            {(fellowship as any).zone}
                          </span>
                        )}
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${fellowship.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {fellowship.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {(fellowship as any).host_name && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />{(fellowship as any).host_name}
                          {(fellowship as any).host_address && ` · ${(fellowship as any).host_address}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 shrink-0">
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{memberCount}{maxM ? `/${maxM}` : ""}</span>
                      <span className="text-muted-foreground">Members</span>
                    </div>
                    {(fellowship as any).meeting_day && (
                      <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground">{(fellowship as any).meeting_day}{(fellowship as any).meeting_time ? ` · ${(fellowship as any).meeting_time}` : ""}</span>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={openEdit}>
                    <Pencil className="h-3.5 w-3.5" />Edit
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 py-3 flex gap-1 overflow-x-auto">
              {TABS.map(tab => (
                <div key={tab.key} className="relative shrink-0">
                  <button onClick={() => setActiveTab(tab.key)}
                    className={`relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? "text-white" : "text-muted-foreground hover:text-foreground"}`}>
                    {activeTab === tab.key && (
                      <motion.div layoutId="fellowshipTab" className="absolute inset-0 rounded-full bg-orange-500"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </BlurFadeIn>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {/* ── MEMBERS TAB ── */}
          {activeTab === "members" && (
            <motion.div key="members" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="flex-1 max-w-xs border-slate-200 text-sm">
                    <SelectValue placeholder="Select member to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button disabled={!selectedMember} onClick={() => addMemberMut.mutate(selectedMember)}
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5">
                  <UserPlus className="h-4 w-4" />Add
                </Button>
              </div>
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
                {membersLoading ? (
                  <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
                ) : fellowshipMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                    <Users className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No members yet</p>
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
                      {fellowshipMembers.map((fm: any) => {
                        const m = fm.members;
                        const name = m ? `${m.first_name} ${m.last_name}` : "Unknown";
                        const isLeader = (fellowship as any).leader_id === fm.member_id;
                        return (
                          <tr key={fm.member_id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                  style={{ backgroundColor: hashColor(name) }}>{getInitials(name)}</div>
                                <div>
                                  <p className="font-medium text-foreground">{name}</p>
                                  {m?.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-xs text-muted-foreground hidden sm:table-cell">
                              {fm.joined_at ? formatDistanceToNow(new Date(fm.joined_at), { addSuffix: true }) : "—"}
                            </td>
                            <td className="px-4 py-3.5">
                              {isLeader ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                                  <Crown className="h-3 w-3" />Leader
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">Member</span>
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
                                    <DropdownMenuItem onClick={() => setLeaderMut.mutate(fm.member_id)}>
                                      <Crown className="h-3.5 w-3.5 mr-2 text-amber-500" />Set as Leader
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem className="text-destructive" onClick={() => removeMemberMut.mutate(fm.member_id)}>
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />Remove
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
          )}

          {/* ── ATTENDANCE TAB ── */}
          {activeTab === "attendance" && (
            <motion.div key="attendance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
              <div className="flex justify-end">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
                  onClick={() => setRecordingAttendance(true)} disabled={fellowshipMembers.length === 0}>
                  <Plus className="h-4 w-4" />Record Session
                </Button>
              </div>
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
                {attendanceSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No sessions recorded yet</p>
                    <p className="text-xs text-muted-foreground">Record your first attendance session</p>
                  </div>
                ) : (
                  <table className="w-full text-sm font-jakarta">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Present</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Absent</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceSessions.map((s, i) => {
                        const total = s.present + s.absent;
                        const rate = total > 0 ? Math.round((s.present / total) * 100) : 0;
                        return (
                          <motion.tr key={s.date} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3.5 font-medium text-foreground">
                              {format(parseISO(s.date), "EEE, dd MMM yyyy")}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />{s.present}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">{s.absent}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 max-w-[80px] h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${rate}%` }} />
                                </div>
                                <span className="text-xs font-medium text-foreground">{rate}%</span>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}

          {/* ── ANALYTICS TAB ── */}
          {activeTab === "analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Members", value: memberCount, icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
                  { label: "Avg Attendance", value: `${avgAttendance}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Last Session", value: lastSession ? format(parseISO(lastSession.date), "dd MMM") : "—", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Capacity Fill", value: capacityPct !== null ? `${capacityPct}%` : "—", icon: Activity, color: "text-orange-600", bg: "bg-orange-50" },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`rounded-xl border border-border/50 ${s.bg} dark:bg-slate-800 p-5`}>
                    <div className="flex items-center gap-2 mb-2">
                      <s.icon className={`h-4 w-4 ${s.color}`} />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</p>
                    </div>
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  </motion.div>
                ))}
              </div>
              {/* Attendance trend chart */}
              {attendanceSessions.length > 0 && (
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-orange-500" />Attendance Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={[...attendanceSessions].reverse().slice(-10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickFormatter={d => format(parseISO(d), "dd MMM")} tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, n) => [v, n === "present" ? "Present" : "Absent"]}
                        labelFormatter={l => format(parseISO(l), "dd MMM yyyy")} />
                      <Bar dataKey="present" fill="#10b981" radius={[4,4,0,0]} name="present" />
                      <Bar dataKey="absent" fill="#e2e8f0" radius={[4,4,0,0]} name="absent" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>
          )}

          {/* ── DETAILS TAB ── */}
          {activeTab === "details" && (
            <motion.div key="details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="bg-card rounded-xl border border-border/50 p-6">
                <h2 className="font-semibold text-foreground mb-5">Fellowship Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { label: "Host Name", value: (fellowship as any).host_name },
                    { label: "Host Address", value: (fellowship as any).host_address },
                    { label: "Zone / Area", value: (fellowship as any).zone },
                    { label: "Meeting Schedule", value: (fellowship as any).meeting_day ? `${(fellowship as any).meeting_day}${(fellowship as any).meeting_time ? ` · ${(fellowship as any).meeting_time}` : ""}` : null },
                    { label: "Max Capacity", value: (fellowship as any).max_capacity ? String((fellowship as any).max_capacity) : "Unlimited" },
                    { label: "Status", value: fellowship.is_active ? "Active" : "Inactive" },
                    { label: "Notes", value: (fellowship as any).notes },
                    { label: "Created", value: fellowship.created_at ? format(new Date(fellowship.created_at), "dd MMM yyyy") : null },
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

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={v => { setEditOpen(v); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto font-jakarta" side="right">
          <SheetHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <SheetTitle className="font-jakarta">Edit Fellowship</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 pt-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Fellowship Name *</Label>
              <Input value={eName} onChange={e => setEName(e.target.value)} className="h-10 border-slate-200 focus:border-orange-500 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Zone / Area</Label>
              <Input value={eZone} onChange={e => setEZone(e.target.value)} placeholder="e.g. Westlands Zone" className="h-10 border-slate-200 focus:border-orange-500 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Host Name</Label>
                <Input value={eHostName} onChange={e => setEHostName(e.target.value)} className="h-10 border-slate-200 focus:border-orange-500 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Max Capacity</Label>
                <Input type="number" value={eMaxCapacity} onChange={e => setEMaxCapacity(e.target.value)} placeholder="Unlimited" className="h-10 border-slate-200 focus:border-orange-500 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Host Address</Label>
              <Textarea value={eHostAddress} onChange={e => setEHostAddress(e.target.value)} rows={2} className="border-slate-200 focus:border-orange-500 text-sm resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Meeting Day</Label>
                <Select value={eMeetingDay} onValueChange={setEMeetingDay}>
                  <SelectTrigger className="h-10 border-slate-200 text-sm"><SelectValue placeholder="Select day" /></SelectTrigger>
                  <SelectContent>{DAYS_DETAIL.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Time</Label>
                <Input type="time" value={eMeetingTime} onChange={e => setEMeetingTime(e.target.value)} className="h-10 border-slate-200 focus:border-orange-500 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Notes</Label>
              <Textarea value={eNotes} onChange={e => setENotes(e.target.value)} rows={3} className="border-slate-200 focus:border-orange-500 text-sm resize-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS_DETAIL.map(c => (
                  <button key={c} type="button" onClick={() => setEColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${eColor === c ? "border-slate-900 dark:border-white scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-slate-600">Active</Label>
              <Switch checked={eIsActive} onCheckedChange={setEIsActive} />
            </div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-jakarta font-semibold h-11"
              onClick={handleEditSave} disabled={!eName.trim() || eSaving}>
              {eSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Record Attendance Modal */}
      <AnimatePresence>
        {recordingAttendance && (
          <RecordAttendanceModal
            fellowshipId={fellowshipId!}
            tenantId={tenantId}
            members={fellowshipMembers}
            onClose={() => setRecordingAttendance(false)}
            onSaved={() => qc.invalidateQueries({ queryKey: ["fellowship-attendance", fellowshipId] })}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default FellowshipDetail;
