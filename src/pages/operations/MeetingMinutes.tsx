import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInMinutes } from "date-fns";
import {
  ArrowLeft, Download, Save, Plus, Trash2, CheckCircle2,
  Clock, MapPin, Calendar, Link, FileText, Users, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ActionItem {
  id: string;
  task_description: string;
  assigned_to: string;
  due_date: string;
  status: "open" | "in_progress" | "completed";
  isNew?: boolean;
}

interface Decision {
  id: string;
  decision_text: string;
  isNew?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Pending", in_progress: "In Progress",
  completed: "Completed", cancelled: "Cancelled",
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};
const ACTION_STATUS_COLORS: Record<string, string> = {
  open: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
};
const MEETING_TYPES: Record<string, string> = {
  board_meeting: "Board Meeting", elders_meeting: "Elders Meeting",
  staff_meeting: "Staff Meeting", finance_committee: "Finance Committee",
  general_assembly: "General Assembly", special_meeting: "Special Meeting", other: "Other",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getAvatarGradient(name: string) {
  const ch = (name?.[0] ?? "A").toUpperCase();
  if (ch <= "D") return "from-orange-400 to-orange-500";
  if (ch <= "H") return "from-violet-500 to-purple-600";
  if (ch <= "L") return "from-blue-400 to-blue-600";
  if (ch <= "P") return "from-emerald-400 to-green-500";
  if (ch <= "T") return "from-pink-400 to-rose-500";
  return "from-amber-400 to-yellow-500";
}

function calcDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return "—";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}`.trim() : `${m}m`;
}

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MeetingMinutesPage({ meetingIdProp, inline = false }: { meetingIdProp?: string; inline?: boolean } = {}) {
  const params = useParams<{ id: string }>();
  const meetingId = meetingIdProp ?? params.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenantId, name: churchName } = useChurch();

  // ── Local state ──────────────────────────────────────────────────────────
  const [minutesText, setMinutesText] = useState("");
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: meeting, isLoading: meetingLoading } = useQuery({
    queryKey: ["board_meeting", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.BOARD_MEETINGS)
        .select("*")
        .eq("id", meetingId!)
        .eq("tenant_id", tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!meetingId,
    staleTime: 300_000,
  });

  const { data: attendees = [], isLoading: attendeesLoading } = useQuery({
    queryKey: ["meeting_attendees", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.MEETING_ATTENDEES)
        .select("id, member_id, attendance_status, is_present")
        .eq("meeting_id", meetingId!);
      if (error) throw error;
      const rows = data ?? [];

      // Resolve names from both members and users tables
      const ids = rows.map((r: any) => r.member_id).filter(Boolean);
      if (!ids.length) return rows;

      const [{ data: memberRows }, { data: userRows }] = await Promise.all([
        supabase.from(TABLES.MEMBERS).select("id, first_name, last_name").in("id", ids),
        supabase.from(TABLES.USERS).select("id, first_name, last_name").in("id", ids),
      ]);

      const nameMap: Record<string, { first_name: string; last_name: string }> = {};
      (memberRows ?? []).forEach((m: any) => { nameMap[m.id] = m; });
      (userRows ?? []).forEach((u: any) => { if (!nameMap[u.id]) nameMap[u.id] = u; });

      return rows.map((r: any) => ({
        ...r,
        members: nameMap[r.member_id] ?? null,
      }));
    },
    enabled: !!meetingId,
    staleTime: 300_000,
  });

  const { data: minutesRecord } = useQuery({
    queryKey: ["meeting_minutes", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.MEETING_MINUTES)
        .select("*")
        .eq("meeting_id", meetingId!)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!meetingId,
    staleTime: 300_000,
  });

  const { data: decisionsData = [] } = useQuery({
    queryKey: ["meeting_decisions", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.MEETING_DECISIONS)
        .select("*")
        .eq("meeting_id", meetingId!)
        .eq("tenant_id", tenantId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!meetingId,
    staleTime: 300_000,
  });

  const { data: actionItemsData = [] } = useQuery({
    queryKey: ["meeting_action_items", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.MEETING_ACTION_ITEMS)
        .select("*")
        .eq("meeting_id", meetingId!)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!meetingId,
    staleTime: 300_000,
  });

  // ── Seed local state from queries ────────────────────────────────────────
  // Use query select transforms to initialize editable state only once
  useEffect(() => {
    if (minutesRecord && minutesText === "") {
      setMinutesText(minutesRecord.minutes_text ?? "");
    }
  }, [minutesRecord?.meeting_id]); // only re-seed when meeting changes

  useEffect(() => {
    if (decisionsData.length && decisions.length === 0) {
      setDecisions(decisionsData.map((d: any) => ({ id: d.id, decision_text: d.decision_text })));
    }
  }, [decisionsData.length > 0 ? decisionsData[0]?.meeting_id : null]);

  useEffect(() => {
    if (actionItemsData.length && actionItems.length === 0) {
      setActionItems(actionItemsData.map((a: any) => ({
        id: a.id,
        task_description: a.description ?? "",
        assigned_to: a.assigned_to ?? "",
        due_date: a.due_date ?? "",
        status: a.status ?? "open",
      })));
    }
  }, [actionItemsData.length > 0 ? actionItemsData[0]?.meeting_id : null]);

  useEffect(() => {
    if (attendees.length) {
      const map: Record<string, boolean> = {};
      attendees.forEach((a: any) => { map[a.id] = a.is_present ?? true; });
      setAttendance(map);
    }
  }, [attendees]);

  // ── Save logic ───────────────────────────────────────────────────────────
  const doSave = useCallback(async () => {
    if (!meetingId) return;
    setIsSaving(true);
    try {
      // 1. Upsert minutes
      const { error: mErr } = await supabase
        .from(TABLES.MEETING_MINUTES)
        .upsert({
          meeting_id: meetingId,
          tenant_id: tenantId,
          minutes_text: minutesText,
          updated_at: new Date().toISOString(),
        }, { onConflict: "meeting_id" });
      if (mErr) throw mErr;

      // 2. Update attendance
      const attendanceUpdates = attendees.map((a: any) =>
        supabase
          .from(TABLES.MEETING_ATTENDEES)
          .update({ is_present: attendance[a.id] ?? true })
          .eq("id", a.id)
      );
      await Promise.all(attendanceUpdates);

      // 3. Decisions — delete removed, insert new
      const existingDecisionIds = decisionsData.map((d: any) => d.id);
      const currentDecisionIds = decisions.filter(d => !d.isNew).map(d => d.id);
      const deletedDecisionIds = existingDecisionIds.filter((id: string) => !currentDecisionIds.includes(id));
      if (deletedDecisionIds.length) {
        await supabase.from(TABLES.MEETING_DECISIONS).delete().in("id", deletedDecisionIds);
      }
      const newDecisions = decisions.filter(d => d.isNew && d.decision_text.trim());
      if (newDecisions.length) {
        await supabase.from(TABLES.MEETING_DECISIONS).insert(
          newDecisions.map(d => ({
            meeting_id: meetingId,
            tenant_id: tenantId,
            decision_text: d.decision_text,
          }))
        );
      }

      // 4. Action items — delete removed, insert new, update existing
      const existingActionIds = actionItemsData.map((a: any) => a.id);
      const currentActionIds = actionItems.filter(a => !a.isNew).map(a => a.id);
      const deletedActionIds = existingActionIds.filter((id: string) => !currentActionIds.includes(id));
      if (deletedActionIds.length) {
        await supabase.from(TABLES.MEETING_ACTION_ITEMS).delete().in("id", deletedActionIds);
      }
      const newActions = actionItems.filter(a => a.isNew && a.task_description.trim());
      if (newActions.length) {
        await supabase.from(TABLES.MEETING_ACTION_ITEMS).insert(
          newActions.map(a => ({
            meeting_id: meetingId,
            description: a.task_description,
            assigned_to: a.assigned_to,
            due_date: a.due_date || null,
            status: a.status,
          }))
        );
      }
      const updatedActions = actionItems.filter(a => !a.isNew);
      await Promise.all(
        updatedActions.map(a =>
          supabase.from(TABLES.MEETING_ACTION_ITEMS).update({
            description: a.task_description,
            assigned_to: a.assigned_to,
            due_date: a.due_date || null,
            status: a.status,
          }).eq("id", a.id)
        )
      );

      setLastSaved(new Date());
      // Mark all decisions/actions as no longer new
      setDecisions(prev => prev.map(d => ({ ...d, isNew: false })));
      setActionItems(prev => prev.map(a => ({ ...a, isNew: false })));

      queryClient.invalidateQueries({ queryKey: ["meeting_minutes", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["meeting_decisions", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["meeting_action_items", meetingId] });
    } catch (err: any) {
      toast.error("Failed to save: " + (err.message ?? "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  }, [meetingId, tenantId, minutesText, attendance, attendees, decisions, decisionsData, actionItems, actionItemsData, queryClient]);

  const handleSave = async () => {
    await doSave();
    toast.success("Minutes saved successfully");
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { doSave(); }, 30_000);
    return () => clearInterval(interval);
  }, [doSave]);

  // ── Toolbar helpers ──────────────────────────────────────────────────────
  function insertMarkdown(before: string, after = "") {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = minutesText.slice(start, end);
    const newText =
      minutesText.slice(0, start) + before + selected + after + minutesText.slice(end);
    setMinutesText(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  }

  // ── Export PDF ───────────────────────────────────────────────────────────
  function handleExportPDF() {
    const presentAttendees = attendees.filter((a: any) => attendance[a.id] !== false);
    const absentAttendees = attendees.filter((a: any) => attendance[a.id] === false);
    const dateStr = meeting?.meeting_date
      ? format(new Date(meeting.meeting_date), "MMMM d, yyyy")
      : "—";
    const timeStr = meeting?.start_time
      ? `${meeting.start_time}${meeting.end_time ? " – " + meeting.end_time : ""}`
      : "—";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Meeting Minutes — ${meeting?.title ?? ""}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; margin: 40px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 28px; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f1f5f9; text-align: left; padding: 6px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
    .present { color: #16a34a; font-weight: 600; }
    .absent  { color: #94a3b8; }
    .minutes { white-space: pre-wrap; line-height: 1.6; margin-top: 8px; }
    .decision { padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
    .signature { margin-top: 60px; border-top: 1px solid #334155; width: 240px; padding-top: 6px; font-size: 12px; color: #64748b; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <p style="color:#f97316;font-weight:700;font-size:14px;margin-bottom:2px;">${churchName}</p>
  <h1>${meeting?.title ?? "Meeting Minutes"}</h1>
  <div class="meta">
    ${dateStr} &nbsp;|&nbsp; ${timeStr}
    ${meeting?.location ? `&nbsp;|&nbsp; ${meeting.location}` : ""}
    ${meeting?.type ? `&nbsp;|&nbsp; ${MEETING_TYPES[meeting.type] ?? meeting.type}` : ""}
  </div>

  <h2>Attendance</h2>
  <table>
    <thead><tr><th>Name</th><th>Status</th></tr></thead>
    <tbody>
      ${attendees.map((a: any) => {
        const m = a.members;
        const name = m ? `${m.first_name} ${m.last_name}` : "Unknown";
        const present = attendance[a.id] !== false;
        return `<tr><td>${name}</td><td class="${present ? "present" : "absent"}">${present ? "Present" : "Absent"}</td></tr>`;
      }).join("")}
    </tbody>
  </table>
  <p style="font-size:12px;color:#64748b;margin-top:6px;">
    Present: ${presentAttendees.length} / ${attendees.length}
  </p>

  <h2>Minutes</h2>
  <div class="minutes">${minutesText || "<em>No minutes recorded.</em>"}</div>

  <h2>Decisions Made</h2>
  ${decisions.length
    ? decisions.map((d, i) => `<div class="decision"><strong>${i + 1}.</strong> ${d.decision_text}</div>`).join("")
    : "<p style='color:#94a3b8'>No decisions recorded.</p>"
  }

  <h2>Action Items</h2>
  ${actionItems.length ? `
  <table>
    <thead><tr><th>Task</th><th>Assigned To</th><th>Due Date</th><th>Status</th></tr></thead>
    <tbody>
      ${actionItems.map(a => `
        <tr>
          <td>${a.task_description}</td>
          <td>${a.assigned_to || "—"}</td>
          <td>${a.due_date ? format(new Date(a.due_date), "MMM d, yyyy") : "—"}</td>
          <td>${a.status.replace("_", " ")}</td>
        </tr>`).join("")}
    </tbody>
  </table>` : "<p style='color:#94a3b8'>No action items recorded.</p>"}

  <div class="signature">Signed by: ___________________________</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) { toast.error("Pop-up blocked. Please allow pop-ups and try again."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (meetingLoading) {
    return (
      <div className="min-h-screen bg-slate-50 font-jakarta">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-7 w-64" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-72 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-slate-50 font-jakarta flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto" />
          <p className="text-base font-semibold text-slate-600">Meeting not found</p>
          {!inline && (
          <Button variant="outline" onClick={() => navigate("/board-meetings")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Meetings
          </Button>
          )}
        </div>
      </div>
    );
  }

  const presentCount = attendees.filter((a: any) => attendance[a.id] !== false).length;
  const duration = calcDuration(meeting.start_time, meeting.end_time);
  const attendeeNames = attendees.map((a: any) => {
    const m = a.members;
    return m ? `${m.first_name} ${m.last_name}` : "";
  }).filter(Boolean);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-jakarta">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {!inline && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-0.5 text-slate-500 hover:text-slate-900"
                onClick={() => navigate("/board-meetings")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{meeting.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {meeting.meeting_date ? format(new Date(meeting.meeting_date), "MMMM d, yyyy") : "—"}
                </span>
                {meeting.start_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {meeting.start_time}{meeting.end_time ? ` – ${meeting.end_time}` : ""}
                  </span>
                )}
                <Badge className={cn("text-xs font-medium rounded-full px-2.5 py-0.5", STATUS_COLORS[meeting.status] ?? "bg-slate-100 text-slate-600")}>
                  {STATUS_LABELS[meeting.status] ?? meeting.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Auto-save indicator */}
            <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
              {isSaving ? (
                <><Clock className="h-3 w-3 animate-spin" /> Saving...</>
              ) : lastSaved ? (
                <><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}</>
              ) : null}
            </span>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="border-slate-200 text-slate-600 hover:border-slate-300">
              <Download className="h-4 w-4 mr-1.5" /> Export PDF
            </Button>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-1.5" />
              {isSaving ? "Saving..." : "Save Minutes"}
            </Button>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Attendance Card */}
            <Card className="rounded-xl border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  Attendance
                  <span className="ml-auto text-sm font-normal text-slate-500">
                    Present: <span className="font-semibold text-slate-700">{presentCount}</span> / {attendees.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendeesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                  </div>
                ) : attendees.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2 text-center">
                    <Users className="h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">No attendees added to this meeting.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {attendees.map((a: any) => {
                      const m = a.members;
                      const fullName = m ? `${m.first_name} ${m.last_name}` : "Unknown";
                      const initials = m ? `${m.first_name?.[0] ?? ""}${m.last_name?.[0] ?? ""}`.toUpperCase() : "?";
                      const isPresent = attendance[a.id] !== false;
                      return (
                        <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className={cn("h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shrink-0", getAvatarGradient(fullName))}>
                            {initials}
                          </div>
                          <span className="flex-1 text-sm text-slate-700 font-medium">{fullName}</span>
                          <button
                            onClick={() => setAttendance(prev => ({ ...prev, [a.id]: !isPresent }))}
                            className={cn(
                              "text-xs font-semibold px-3 py-1 rounded-full transition-colors",
                              isPresent
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {isPresent ? "Present" : "Absent"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Minutes Editor Card */}
            <Card className="rounded-xl border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-500" />
                  Meeting Minutes
                  {lastSaved && (
                    <span className="ml-auto text-xs font-normal text-slate-400">
                      Last saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Toolbar */}
                <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-lg border border-slate-200">
                  <button
                    onClick={() => insertMarkdown("**", "**")}
                    className="px-2.5 py-1 text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded transition-all"
                    title="Bold"
                  >B</button>
                  <button
                    onClick={() => insertMarkdown("_", "_")}
                    className="px-2.5 py-1 text-sm italic text-slate-600 hover:bg-white hover:shadow-sm rounded transition-all"
                    title="Italic"
                  >I</button>
                  <div className="w-px h-5 bg-slate-200 mx-1" />
                  <button
                    onClick={() => {
                      const ta = textareaRef.current;
                      if (!ta) return;
                      const pos = ta.selectionStart;
                      const before = minutesText.slice(0, pos);
                      const after = minutesText.slice(pos);
                      const prefix = before.endsWith("\n") || before === "" ? "• " : "\n• ";
                      setMinutesText(before + prefix + after);
                      setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + prefix.length, pos + prefix.length); }, 0);
                    }}
                    className="px-2.5 py-1 text-sm text-slate-600 hover:bg-white hover:shadow-sm rounded transition-all"
                    title="Bullet point"
                  >• Bullet</button>
                  <button
                    onClick={() => {
                      const ta = textareaRef.current;
                      if (!ta) return;
                      const pos = ta.selectionStart;
                      const before = minutesText.slice(0, pos);
                      const after = minutesText.slice(pos);
                      const lines = before.split("\n");
                      const nums = lines.filter(l => /^\d+\. /.test(l));
                      const n = nums.length + 1;
                      const prefix = before.endsWith("\n") || before === "" ? `${n}. ` : `\n${n}. `;
                      setMinutesText(before + prefix + after);
                      setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + prefix.length, pos + prefix.length); }, 0);
                    }}
                    className="px-2.5 py-1 text-sm text-slate-600 hover:bg-white hover:shadow-sm rounded transition-all"
                    title="Numbered list"
                  >1. Numbered</button>
                </div>
                <Textarea
                  ref={textareaRef}
                  value={minutesText}
                  onChange={e => setMinutesText(e.target.value)}
                  placeholder="Record the meeting minutes here..."
                  className="min-h-[280px] resize-y border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-sm text-slate-700 font-mono leading-relaxed"
                />
              </CardContent>
            </Card>

            {/* Decisions Card */}
            <Card className="rounded-xl border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-orange-500" />
                  Decisions Made
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {decisions.length === 0 ? (
                  <div className="flex flex-col items-center py-6 gap-2 text-center">
                    <CheckCircle2 className="h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">No decisions recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {decisions.map((d, i) => (
                      <div key={d.id} className="flex items-start gap-2">
                        <span className="mt-2.5 text-xs font-semibold text-slate-400 w-5 shrink-0">{i + 1}.</span>
                        <Input
                          value={d.decision_text}
                          onChange={e => setDecisions(prev => prev.map(x => x.id === d.id ? { ...x, decision_text: e.target.value } : x))}
                          placeholder="Describe the decision..."
                          className="flex-1 h-9 text-sm border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                        />
                        <button
                          onClick={() => setDecisions(prev => prev.filter(x => x.id !== d.id))}
                          className="mt-1.5 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-500"
                  onClick={() => setDecisions(prev => [...prev, { id: nanoid(), decision_text: "", isNew: true }])}
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Add Decision
                </Button>
              </CardContent>
            </Card>

            {/* Action Items Card */}
            <Card className="rounded-xl border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Action Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {actionItems.length === 0 ? (
                  <div className="flex flex-col items-center py-6 gap-2 text-center">
                    <AlertCircle className="h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">No action items yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Task</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned To</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                          <th className="px-3 py-2.5 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {actionItems.map(item => (
                          <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                            <td className="px-3 py-2">
                              <Input
                                value={item.task_description}
                                onChange={e => setActionItems(prev => prev.map(x => x.id === item.id ? { ...x, task_description: e.target.value } : x))}
                                placeholder="Describe task..."
                                className="h-8 text-xs border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/10 min-w-[140px]"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Select
                                value={item.assigned_to || "__none__"}
                                onValueChange={val => setActionItems(prev => prev.map(x => x.id === item.id ? { ...x, assigned_to: val === "__none__" ? "" : val } : x))}
                              >
                                <SelectTrigger className="h-8 text-xs border-slate-200 min-w-[120px]">
                                  <SelectValue placeholder="Assign to..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Unassigned</SelectItem>
                                  {attendeeNames.map(name => (
                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="date"
                                value={item.due_date}
                                onChange={e => setActionItems(prev => prev.map(x => x.id === item.id ? { ...x, due_date: e.target.value } : x))}
                                className="h-8 text-xs border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/10 w-[130px]"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Select
                                value={item.status}
                                onValueChange={val => setActionItems(prev => prev.map(x => x.id === item.id ? { ...x, status: val as ActionItem["status"] } : x))}
                              >
                                <SelectTrigger className="h-8 text-xs border-slate-200 w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => setActionItems(prev => prev.filter(x => x.id !== item.id))}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-500"
                  onClick={() => setActionItems(prev => [...prev, {
                    id: nanoid(),
                    task_description: "",
                    assigned_to: "",
                    due_date: "",
                    status: "open",
                    isNew: true,
                  }])}
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Add Action Item
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN (sidebar) ── */}
          <div className="space-y-6">

            {/* Meeting Details Card */}
            <Card className="rounded-xl border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  Meeting Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {meeting.type && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Type</p>
                    <p className="text-slate-700 font-medium">{MEETING_TYPES[meeting.type] ?? meeting.type}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Date & Time</p>
                  <p className="text-slate-700">
                    {meeting.meeting_date ? format(new Date(meeting.meeting_date), "MMMM d, yyyy") : "—"}
                  </p>
                  {meeting.start_time && (
                    <p className="text-slate-500 text-xs mt-0.5">
                      {meeting.start_time}{meeting.end_time ? ` – ${meeting.end_time}` : ""}
                      {duration !== "—" && <span className="ml-2 text-slate-400">({duration})</span>}
                    </p>
                  )}
                </div>
                {meeting.location && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Location</p>
                    <p className="text-slate-700 flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 text-slate-400 shrink-0" />
                      {meeting.location}
                    </p>
                  </div>
                )}
                {meeting.online_link && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Online Link</p>
                    <a
                      href={meeting.online_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-500 hover:text-orange-600 flex items-center gap-1.5 text-xs break-all"
                    >
                      <Link className="h-3.5 w-3.5 shrink-0" />
                      {meeting.online_link}
                    </a>
                  </div>
                )}
                {meeting.agenda && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Agenda</p>
                    <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">{meeting.agenda}</p>
                  </div>
                )}
                {meeting.pre_meeting_notes && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Pre-meeting Notes</p>
                    <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">{meeting.pre_meeting_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Meeting Card */}
            <Card className="rounded-xl border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  Next Meeting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 mb-4">Schedule the next meeting to keep momentum going.</p>
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                  onClick={() => !inline && navigate("/board-meetings?action=new")}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Schedule Next Meeting
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
