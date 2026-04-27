
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, addDays, nextDay, getDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Home, MapPin, Clock, Calendar, Users, Crown,
  CheckCircle2, XCircle, ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function hashColor(str: string) {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const c = ["#7c3aed","#3b82f6","#10b981","#f59e0b","#f43f5e","#f97316","#ec4899","#14b8a6","#6366f1","#84cc16"];
  return c[Math.abs(h) % c.length];
}

const DAY_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

function getNextSessionDate(meetingDay: string): string {
  const today = new Date();
  const targetDay = DAY_MAP[meetingDay];
  if (targetDay === undefined) return format(today, "yyyy-MM-dd");
  const todayDay = getDay(today);
  const daysUntil = (targetDay - todayDay + 7) % 7 || 7;
  return format(addDays(today, daysUntil), "yyyy-MM-dd");
}

export default function MemberHouseFellowship() {
  const member = useMemberPortal();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Find which fellowship this member belongs to
  const { data: myFellowship, isLoading } = useQuery({
    queryKey: ["member-fellowship", member.memberId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.FELLOWSHIP_MEMBERS)
        .select("fellowship_id, role, house_fellowships(id, name, zone, host_name, host_address, meeting_day, meeting_time, max_capacity, is_active, cover_color, leader_id)")
        .eq("member_id", member.memberId).limit(1).maybeSingle();
      if (!data) return null;
      return { ...data.house_fellowships as any, myRole: data.role };
    },
    staleTime: 300_000,
  });

  // Fellow members
  const { data: fellowMembers = [] } = useQuery({
    queryKey: ["fellow-members", myFellowship?.id],
    queryFn: async () => {
      const { data: fm } = await supabase.from(TABLES.FELLOWSHIP_MEMBERS)
        .select("member_id, role").eq("fellowship_id", myFellowship!.id);
      if (!fm?.length) return [];
      const ids = fm.map(r => r.member_id);
      const { data: memberDetails } = await supabase.from(TABLES.MEMBERS)
        .select("id, first_name, last_name, avatar_url").in("id", ids);
      const map = Object.fromEntries((memberDetails || []).map(m => [m.id, m]));
      return fm.map(r => ({ ...r, members: map[r.member_id] || null }));
    },
    enabled: !!myFellowship?.id, staleTime: 300_000,
  });

  // Realtime for fellow members
  useEffect(() => {
    if (!myFellowship?.id) return;
    const ch = supabase.channel(`member-fellowship-${myFellowship.id}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "fellowship_members", filter: `fellowship_id=eq.${myFellowship.id}` },
        () => qc.invalidateQueries({ queryKey: ["fellow-members", myFellowship.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myFellowship?.id, qc]);

  // Next session date
  const nextSessionDate = myFellowship?.meeting_day ? getNextSessionDate(myFellowship.meeting_day) : null;

  // RSVP
  const { data: myRsvp } = useQuery({
    queryKey: ["my-rsvp", myFellowship?.id, nextSessionDate],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.FELLOWSHIP_RSVP)
        .select("status").eq("fellowship_id", myFellowship!.id)
        .eq("member_id", member.memberId).eq("session_date", nextSessionDate!).maybeSingle();
      return data?.status ?? null;
    },
    enabled: !!myFellowship?.id && !!nextSessionDate, staleTime: 60_000,
  });

  const { data: rsvpCount = 0 } = useQuery({
    queryKey: ["rsvp-count", myFellowship?.id, nextSessionDate],
    queryFn: async () => {
      const { count } = await supabase.from(TABLES.FELLOWSHIP_RSVP)
        .select("*", { count: "exact", head: true })
        .eq("fellowship_id", myFellowship!.id).eq("session_date", nextSessionDate!).eq("status", "attending");
      return count ?? 0;
    },
    enabled: !!myFellowship?.id && !!nextSessionDate, staleTime: 60_000,
  });

  const rsvpMut = useMutation({
    mutationFn: async (status: "attending" | "not_attending") => {
      const { error } = await supabase.from(TABLES.FELLOWSHIP_RSVP)
        .upsert({ fellowship_id: myFellowship!.id, member_id: member.memberId, session_date: nextSessionDate!, status, tenant_id: member.churchId } as never,
          { onConflict: "fellowship_id,member_id,session_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-rsvp", myFellowship?.id, nextSessionDate] });
      qc.invalidateQueries({ queryKey: ["rsvp-count", myFellowship?.id, nextSessionDate] });
      toast.success("RSVP updated");
    },
    onError: () => toast.error("Failed to update RSVP"),
  });

  // Past attendance
  const { data: myAttendance = [] } = useQuery({
    queryKey: ["my-attendance", myFellowship?.id, member.memberId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.FELLOWSHIP_ATTENDANCE)
        .select("session_date, status").eq("fellowship_id", myFellowship!.id)
        .eq("member_id", member.memberId).order("session_date", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!myFellowship?.id, staleTime: 300_000,
  });

  if (isLoading) return (
    <div className="max-w-2xl mx-auto space-y-4 font-jakarta">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );

  return (
    <>
      <Helmet><title>My House Fellowship — Vestry</title></Helmet>
      <div className="font-jakarta max-w-2xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <BlurFadeIn delay={0}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/member")}
              className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs text-muted-foreground">{member.churchName}</p>
              <h1 className="text-xl font-bold text-foreground leading-tight">My House Fellowship</h1>
            </div>
          </div>
        </BlurFadeIn>

        {!myFellowship ? (
          /* Empty state */
          <BlurFadeIn delay={0.1}>
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="h-20 w-20 rounded-3xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
                <Home className="h-10 w-10 text-orange-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">Not yet assigned</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  You haven't been assigned to a House Fellowship yet. Contact your church admin.
                </p>
              </div>
            </div>
          </BlurFadeIn>
        ) : (
          <>
            {/* Hero card */}
            <BlurFadeIn delay={0.1}>
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="rounded-2xl border border-border/50 overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${myFellowship.cover_color || "#f97316"}18 0%, transparent 100%)` }}>
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0"
                      style={{ backgroundColor: `${myFellowship.cover_color || "#f97316"}30`, color: myFellowship.cover_color || "#f97316" }}>
                      {getInitials(myFellowship.name || "HF")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-foreground">{myFellowship.name}</h2>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {myFellowship.zone && (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                            {myFellowship.zone}
                          </span>
                        )}
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${myFellowship.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {myFellowship.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {myFellowship.host_name && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-orange-500" />
                        <div>
                          <p className="font-medium text-foreground">{myFellowship.host_name}</p>
                          {myFellowship.host_address && <p className="text-xs">{myFellowship.host_address}</p>}
                        </div>
                      </div>
                    )}
                    {myFellowship.meeting_day && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0 text-orange-500" />
                        <span>{myFellowship.meeting_day}{myFellowship.meeting_time ? ` · ${myFellowship.meeting_time}` : ""}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4 shrink-0 text-orange-500" />
                      <span>{fellowMembers.length} member{fellowMembers.length !== 1 ? "s" : ""}
                        {myFellowship.max_capacity ? ` / ${myFellowship.max_capacity}` : ""}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </BlurFadeIn>

            {/* Fellow Members */}
            <BlurFadeIn delay={0.2}>
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />Fellow Members
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {fellowMembers.map((fm: any, i: number) => {
                    const m = fm.members;
                    const name = m ? `${m.first_name} ${m.last_name}` : "Unknown";
                    const isLeader = myFellowship.leader_id === fm.member_id;
                    return (
                      <motion.div key={fm.member_id}
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/40 text-center">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: hashColor(name) }}>{getInitials(name)}</div>
                        <p className="text-xs font-medium text-foreground leading-tight">{name}</p>
                        {isLeader && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                            <Crown className="h-2.5 w-2.5" />Leader
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </BlurFadeIn>

            {/* RSVP Section */}
            {nextSessionDate && (
              <BlurFadeIn delay={0.3}>
                <div className="bg-card rounded-xl border border-border/50 p-5">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-500" />Upcoming Meeting
                  </h3>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-medium text-foreground">
                        {myFellowship.meeting_day} · {format(parseISO(nextSessionDate), "dd MMM yyyy")}
                      </p>
                      {myFellowship.meeting_time && <p className="text-sm text-muted-foreground">{myFellowship.meeting_time}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{rsvpCount} member{rsvpCount !== 1 ? "s" : ""} attending</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm"
                        className={`gap-1.5 ${myRsvp === "attending" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                        onClick={() => rsvpMut.mutate("attending")} disabled={rsvpMut.isPending}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {myRsvp === "attending" ? "Attending ✓" : "I'll Attend"}
                      </Button>
                      <Button size="sm" variant="outline"
                        className={`gap-1.5 ${myRsvp === "not_attending" ? "border-red-300 text-red-600 bg-red-50" : ""}`}
                        onClick={() => rsvpMut.mutate("not_attending")} disabled={rsvpMut.isPending}>
                        <XCircle className="h-3.5 w-3.5" />Can't Make It
                      </Button>
                    </div>
                  </div>
                </div>
              </BlurFadeIn>
            )}

            {/* Past Attendance */}
            {myAttendance.length > 0 && (
              <BlurFadeIn delay={0.4}>
                <div className="bg-card rounded-xl border border-border/50 p-5">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-500" />My Attendance History
                  </h3>
                  <div className="space-y-2">
                    {myAttendance.map((a: any, i: number) => (
                      <motion.div key={a.session_date}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                        <span className="text-sm text-foreground">
                          {format(parseISO(a.session_date), "EEE, dd MMM yyyy")}
                        </span>
                        {a.status === "present" ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />Present
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <XCircle className="h-3.5 w-3.5" />Absent
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </BlurFadeIn>
            )}
          </>
        )}
      </div>
    </>
  );
}
