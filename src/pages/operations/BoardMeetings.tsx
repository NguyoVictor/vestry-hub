import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TimeSlotPicker } from "@/components/events/TimeSlotPicker";
import { toast } from "sonner";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isSameDay, isSameMonth, isToday, addMonths, subMonths,
} from "date-fns";
import { Plus, Video, Calendar, MapPin, Clock, Users, MoreHorizontal, Pencil, Trash2, ChevronRight, UserCheck, ChevronLeft, LayoutList, LayoutGrid, Eye, FileText, Link } from "lucide-react";
import { JoinMeetingButton } from "@/components/shared/JoinMeetingButton";

const MEETING_TYPES = [
  { value: "board_meeting", label: "Board Meeting" },
  { value: "elders_meeting", label: "Elders Meeting" },
  { value: "staff_meeting", label: "Staff Meeting" },
  { value: "finance_committee", label: "Finance Committee" },
  { value: "general_assembly", label: "General Assembly" },
  { value: "special_meeting", label: "Special Meeting" },
  { value: "other", label: "Other" },
];

// Status pipeline — order matters
const STATUS_PIPELINE = ["scheduled", "in_progress", "completed"];

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const emptyForm = {
  title: "", type: "board_meeting",
  date: format(new Date(), "yyyy-MM-dd"), startTime: "10:00", endTime: "12:00",
  location: "", location_type: "on_site", online_link: "",
  agenda: "", pre_meeting_notes: "", status: "scheduled",
};

const LEADERSHIP_ROLES = [
  "Pastor", "Senior Pastor", "Associate Pastor", "Elder", "Deacon",
  "Administrator", "Church Administrator", "Treasurer", "Finance Officer",
  "Board Member", "Staff",
];

// Inline status pipeline component
function StatusPipeline({ status, onAdvance, onJump }: { status: string; onAdvance: (s: string) => void; onJump: (s: string) => void }) {
  const currentIdx = STATUS_PIPELINE.indexOf(status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_PIPELINE.length - 1 ? STATUS_PIPELINE[currentIdx + 1] : null;

  return (
    <div className="flex items-center gap-1">
      {/* Pipeline steps */}
      <div className="flex items-center gap-0.5">
        {STATUS_PIPELINE.map((s, i) => {
          const isActive = s === status;
          const isPast = currentIdx > i;
          return (
            <div key={s} className="flex items-center">
              <button
                onClick={() => onJump(s)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  isActive
                    ? STATUS_COLORS[s]
                    : isPast
                    ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-900/10"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800 hover:bg-slate-200"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
              {i < STATUS_PIPELINE.length - 1 && (
                <ChevronRight className="h-3 w-3 text-slate-300 mx-0.5" />
              )}
            </div>
          );
        })}
      </div>
      {/* Advance button */}
      {nextStatus && status !== "cancelled" && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] px-2 ml-1"
          onClick={() => onAdvance(nextStatus)}
        >
          → {STATUS_LABELS[nextStatus]}
        </Button>
      )}
      {/* Cancel option via dropdown */}
      {status !== "cancelled" && status !== "completed" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-0.5">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive text-xs" onClick={() => onJump("cancelled")}>
              Cancel Meeting
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ─── Meeting Calendar View ────────────────────────────────────────────────────
const MEETING_STATUS_CHIP: Record<string, string> = {
  scheduled: "bg-amber-500",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

function MeetingCalendarView({ meetings }: { meetings: any[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) });
  const startDow = getDay(monthStart);
  const prefixBlanks = startDow === 0 ? 6 : startDow - 1;

  const meetingsOnDate = (date: Date) =>
    meetings.filter((m) => {
      try { return isSameDay(new Date(m.meeting_date), date); } catch { return false; }
    });

  const selectedMeetings = selectedDate ? meetingsOnDate(selectedDate) : [];

  return (
    <div className="flex gap-4">
      <Card className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700">
          {Array.from({ length: prefixBlanks }).map((_, i) => (
            <div key={`blank-${i}`} className="bg-white dark:bg-slate-800 min-h-[72px]" />
          ))}
          {days.map((day) => {
            const dayMeetings = meetingsOnDate(day);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const todayDay = isToday(day);
            const inMonth = isSameMonth(day, currentMonth);
            return (
              <div
                key={day.toISOString()}
                className={`bg-white dark:bg-slate-800 min-h-[72px] p-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? "ring-2 ring-inset ring-indigo-500" : ""} ${!inMonth ? "opacity-40" : ""}`}
                onClick={() => setSelectedDate(isSelected ? null : day)}
              >
                <div className="flex justify-end mb-0.5">
                  <span className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${todayDay ? "bg-indigo-600 text-white" : "text-foreground"}`}>
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayMeetings.slice(0, 3).map((m) => (
                    <div key={m.id} className={`text-[10px] text-white px-1 py-0.5 rounded truncate ${MEETING_STATUS_CHIP[(m as any).status || "scheduled"] || MEETING_STATUS_CHIP.scheduled}`}>
                      {m.title}
                    </div>
                  ))}
                  {dayMeetings.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">+{dayMeetings.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Side panel */}
      <Card className="w-72 shrink-0 p-4">
        {selectedDate ? (
          <>
            <h3 className="font-semibold text-sm mb-3">Meetings on {format(selectedDate, "EEE, dd MMM yyyy")}</h3>
            {selectedMeetings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No meetings on this date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedMeetings.map((m) => {
                  const status = (m as any).status || "scheduled";
                  return (
                    <div key={m.id} className="border rounded-lg p-3 space-y-1.5">
                      <p className="font-medium text-sm leading-tight">{m.title}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{(m as any).type?.replace(/_/g, " ") || "—"}</Badge>
                      {m.start_time && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />{m.start_time.toString().slice(0, 5)}
                          {m.end_time && ` – ${m.end_time.toString().slice(0, 5)}`}
                        </div>
                      )}
                      {m.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /><span className="truncate">{m.location}</span>
                        </div>
                      )}
                      <div className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[status]}`}>
                        {STATUS_LABELS[status]}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Click a date to see meetings</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Status banner colors ─────────────────────────────────────────────────────
const STATUS_BANNER: Record<string, string> = {
  scheduled: "bg-amber-400",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

// ─── Meeting View Modal ───────────────────────────────────────────────────────
function MeetingViewModal({ meeting, onClose, onEdit }: { meeting: any; onClose: () => void; onEdit: () => void }) {
  const { tenantId, userName } = useChurch();
  const status = meeting.status || "scheduled";
  const typeLabel = MEETING_TYPES.find(t => t.value === meeting.type)?.label || meeting.type?.replace(/_/g, " ") || "Meeting";

  const { data: attendees = [] } = useQuery({
    queryKey: ["meeting-attendees-view", meeting.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("meeting_attendees")
        .select("member_id, attendance_status, members(first_name, last_name)")
        .eq("meeting_id", meeting.id);
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: actionItems = [] } = useQuery({
    queryKey: ["meeting-action-items-view", meeting.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("meeting_action_items")
        .select("*")
        .eq("meeting_id", meeting.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    staleTime: 60_000,
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        {/* Colored header banner */}
        <div className={`h-24 ${STATUS_BANNER[status] || STATUS_BANNER.scheduled} relative flex items-end px-6 pb-4`}>
          <div className="bg-white dark:bg-slate-800 rounded-xl px-3 py-2 text-center shadow-md min-w-[52px] mr-4">
            <div className="text-[10px] uppercase font-semibold text-primary">{format(new Date(meeting.meeting_date), "MMM")}</div>
            <div className="text-xl font-bold text-foreground leading-tight">{format(new Date(meeting.meeting_date), "dd")}</div>
          </div>
          <div>
            <p className="text-white/80 text-xs font-medium">{typeLabel}</p>
            <h2 className="text-white font-bold text-lg leading-tight">{meeting.title}</h2>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Status + actions */}
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status]}`}>
              {STATUS_LABELS[status]}
            </span>
            <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />Edit Meeting
            </Button>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</p>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {format(new Date(meeting.meeting_date), "EEEE, dd MMMM yyyy")}
              </p>
            </div>
            {(meeting.start_time || meeting.end_time) && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</p>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {meeting.start_time?.toString().slice(0, 5)}
                  {meeting.end_time && ` – ${meeting.end_time.toString().slice(0, 5)}`}
                </p>
              </div>
            )}
            {meeting.location && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</p>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {meeting.location}
                </p>
              </div>
            )}
            {meeting.meeting_date && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Join Meeting</p>
                <JoinMeetingButton
                  meetingDate={meeting.meeting_date}
                  meetingTime={meeting.start_time?.toString().slice(0, 5)}
                  roomName={`vestryhub-bm-${meeting.id}`}
                  displayName={userName}
                  title={meeting.title}
                  size="sm"
                />
              </div>
            )}
            {meeting.online_link && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">External Link</p>
                <a href={meeting.online_link} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-orange-500 hover:underline flex items-center gap-1.5">
                  <Link className="h-3.5 w-3.5" />Open Link
                </a>
              </div>
            )}
          </div>

          {/* Agenda */}
          {meeting.agenda && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />Agenda
              </p>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {meeting.agenda}
              </div>
            </div>
          )}

          {/* Pre-meeting notes */}
          {meeting.pre_meeting_notes && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pre-Meeting Notes</p>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {meeting.pre_meeting_notes}
              </div>
            </div>
          )}

          {/* Minutes */}
          {(meeting.minutes_content || meeting.minutes) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Meeting Minutes</p>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {meeting.minutes_content || meeting.minutes}
              </div>
            </div>
          )}

          {/* Attendees */}
          {attendees.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />Attendees ({attendees.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {attendees.map((a: any) => {
                  const name = a.members ? `${a.members.first_name || ""} ${a.members.last_name || ""}`.trim() : "Unknown";
                  return (
                    <span key={a.member_id} className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <UserCheck className="h-3 w-3 text-emerald-500" />
                      {name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action items */}
          {actionItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Action Items ({actionItems.length})</p>
              <div className="space-y-2">
                {actionItems.map((item: any) => (
                  <div key={item.id} className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2.5">
                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${item.status === "completed" ? "bg-emerald-500" : "bg-amber-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{item.description || item.title}</p>
                      {item.assigned_to && <p className="text-xs text-slate-400 mt-0.5">Assigned to: {item.assigned_to}</p>}
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${item.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {item.status || "pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────
function MeetingCard({
  m, attendeeCount, onEdit, onDelete, onAdvance, onJump, onView, onMinutes, hasMinutes, userName,
}: {
  m: any; attendeeCount: number;
  onEdit: () => void; onDelete: () => void;
  onAdvance: (s: string) => void; onJump: (s: string) => void;
  onView: () => void; onMinutes: () => void; hasMinutes: boolean; userName: string;
}) {
  const status = m.status || "scheduled";
  const typeLabel = MEETING_TYPES.find(t => t.value === m.type)?.label || m.type?.replace(/_/g, " ") || "Meeting";

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer" onClick={onView}>
      {/* Colored banner */}
      <div className={`h-28 ${STATUS_BANNER[status] || STATUS_BANNER.scheduled} relative flex items-center justify-center`}>
        <Video className="h-10 w-10 text-white/30" />
        {/* Date badge */}
        <div className="absolute bottom-2 left-3 bg-white dark:bg-slate-800 rounded-lg p-1.5 text-center shadow-md min-w-[48px]">
          <div className="text-[10px] uppercase font-semibold text-primary">
            {format(new Date(m.meeting_date), "MMM")}
          </div>
          <div className="text-lg font-bold text-foreground leading-tight">
            {format(new Date(m.meeting_date), "dd")}
          </div>
        </div>
        {/* ⋯ menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={e => { e.stopPropagation(); onView(); }}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
              <DropdownMenuItem onClick={e => { e.stopPropagation(); onEdit(); }}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); onDelete(); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs capitalize">{typeLabel}</Badge>
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground line-clamp-1">{m.title}</h3>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {m.start_time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />{m.start_time.toString().slice(0, 5)}
            </span>
          )}
          {m.location && (
            <span className="flex items-center gap-1 truncate max-w-[120px]">
              <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{m.location}</span>
            </span>
          )}
          {attendeeCount > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />{attendeeCount}
            </span>
          )}
        </div>

        {/* Join Meeting button */}
        <div onClick={e => e.stopPropagation()}>
          <JoinMeetingButton
            meetingDate={m.meeting_date}
            meetingTime={m.start_time?.toString().slice(0, 5)}
            roomName={`vestryhub-bm-${m.id}`}
            displayName={userName}
            title={m.title}
            size="sm"
          />
        </div>

        {/* Progress pipeline */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
          <StatusPipeline status={status} onAdvance={onAdvance} onJump={onJump} />
        </div>

        {/* Minutes button — only for completed meetings */}
        {status === "completed" && (
          <div onClick={e => e.stopPropagation()}>
            <Button
              size="sm"
              variant={hasMinutes ? "default" : "outline"}
              className={hasMinutes
                ? "w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                : "w-full text-xs border-orange-400 text-orange-600 bg-white hover:bg-orange-500 hover:text-white hover:border-orange-500"}
              onClick={onMinutes}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              {hasMinutes ? "View Minutes" : "Write Minutes"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function BoardMeetingsPage() {
  const { tenantId, userId, userName } = useChurch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"cards" | "list" | "calendar">("cards");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<any | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);

  // Leadership members for attendees dropdown
  const { data: leadershipMembers = [] } = useQuery({
    queryKey: ["leadership-members", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("id, first_name, last_name, membership_status")
        .eq("tenant_id", tenantId!)
        .in("membership_status", LEADERSHIP_ROLES)
        .order("first_name", { ascending: true });
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const { data: meetings, isLoading } = useQuery({
    queryKey: ["board_meetings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("board_meetings")
        .select("*").eq("tenant_id", tenantId)
        .order("meeting_date", { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Attendee counts per meeting
  const { data: attendeeCounts = {} } = useQuery({
    queryKey: ["meeting-attendee-counts", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("meeting_attendees").select("meeting_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((a: any) => { counts[a.meeting_id] = (counts[a.meeting_id] || 0) + 1; });
      return counts;
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  // Minutes existence per meeting
  const { data: minutesMap = {} } = useQuery({
    queryKey: ["meeting-minutes-map", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("meeting_minutes").select("meeting_id, minutes_text").eq("tenant_id", tenantId);
      const map: Record<string, boolean> = {};
      (data || []).forEach((m: any) => { map[m.meeting_id] = !!(m.minutes_text && m.minutes_text.trim()); });
      return map;
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...emptyForm });
    setSelectedAttendees([]);
    setSheetOpen(true);
  };

  const openEdit = async (m: any) => {
    setEditingId(m.id);
    setFormData({
      title: m.title || "",
      type: m.type || "board_meeting",
      date: m.meeting_date || format(new Date(), "yyyy-MM-dd"),
      startTime: m.start_time ? m.start_time.toString().slice(0, 5) : "10:00",
      endTime: m.end_time ? m.end_time.toString().slice(0, 5) : "12:00",
      location: m.location || "",
      location_type: m.location_type || "on_site",
      online_link: m.online_link || "",
      agenda: m.agenda || "",
      pre_meeting_notes: m.pre_meeting_notes || "",
      status: m.status || "scheduled",
    });
    // Load existing attendees
    const { data: existing } = await supabase
      .from("meeting_attendees")
      .select("member_id")
      .eq("meeting_id", m.id);
    setSelectedAttendees((existing || []).map((a: any) => a.member_id));
    setSheetOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: formData.title,
        meeting_date: formData.date,
        start_time: formData.startTime,
        end_time: formData.endTime,
        agenda: formData.agenda,
        location: formData.location,
        type: formData.type,
        location_type: formData.location_type,
        online_link: formData.online_link,
        pre_meeting_notes: formData.pre_meeting_notes,
        status: formData.status,
      };
      let meetingId = editingId;
      if (editingId) {
        const { error } = await supabase.from("board_meetings").update(payload).eq("id", editingId);
        if (error) throw error;
        // Replace attendees
        await supabase.from("meeting_attendees").delete().eq("meeting_id", editingId);
      } else {
        const { data, error } = await supabase.from("board_meetings").insert({
          ...payload, tenant_id: tenantId, created_by: userId,
        }).select().single();
        if (error) throw error;
        meetingId = data.id;
      }
      // Insert selected attendees
      if (selectedAttendees.length && meetingId) {
        await supabase.from("meeting_attendees").insert(
          selectedAttendees.map(memberId => ({
            meeting_id: meetingId,
            member_id: memberId,
            attendance_status: "expected",
          }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board_meetings", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["meeting-attendee-counts", tenantId] });
      toast.success(editingId ? "Meeting updated" : "Meeting scheduled");
      setSheetOpen(false);
      setEditingId(null);
      setFormData({ ...emptyForm });
      setSelectedAttendees([]);
    },
    onError: () => toast.error("Failed to save meeting"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("meeting_attendees").delete().eq("meeting_id", id);
      await supabase.from("meeting_action_items").delete().eq("meeting_id", id);
      const { error } = await supabase.from("board_meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board_meetings", tenantId] });
      setDeleteId(null);
      toast.success("Meeting deleted");
    },
    onError: () => toast.error("Failed to delete meeting"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("board_meetings").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board_meetings", tenantId] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const upcoming = meetings?.filter(m => new Date(m.meeting_date) >= new Date() && (m as any).status !== "cancelled") || [];
  const completed = meetings?.filter(m => (m as any).status === "completed").length || 0;

  return (
    <>
      <Helmet><title>Board Meetings — Vestry</title></Helmet>
      <PageHeader
        title="Board Meetings"
        subtitle="Schedule meetings, build agendas and record minutes"
        action={
          <div className="flex items-center gap-2">
            <div className="flex border rounded-md overflow-hidden">
              <Button variant={view === "cards" ? "default" : "ghost"} size="sm" onClick={() => setView("cards")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={view === "list" ? "default" : "ghost"} size="sm" onClick={() => setView("list")}>
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button variant={view === "calendar" ? "default" : "ghost"} size="sm" onClick={() => setView("calendar")}>
                <Calendar className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Schedule Meeting</Button>
          </div>
        }      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Calendar className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{upcoming.length}</p><p className="text-sm text-muted-foreground">Upcoming Meetings</p></div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><Video className="h-5 w-5 text-emerald-500" /></div>
            <div><p className="text-2xl font-bold">{meetings?.length || 0}</p><p className="text-sm text-muted-foreground">Total Meetings</p></div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-2xl font-bold">{completed}</p><p className="text-sm text-muted-foreground">Completed</p></div>
          </div>
        </Card>
      </div>

      {/* Cards / Table / Calendar */}
      {view === "calendar" ? (
        <MeetingCalendarView meetings={meetings || []} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      ) : !meetings?.length ? (
        <Card className="p-12 text-center">
          <Video className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-1">No meetings yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Schedule your first board meeting.</p>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Schedule Meeting</Button>
        </Card>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map(m => (
            <MeetingCard
              key={m.id}
              m={m}
              attendeeCount={(attendeeCounts as Record<string, number>)[m.id] || 0}
              hasMinutes={!!(minutesMap as Record<string, boolean>)[m.id]}
              userName={userName}
              onView={() => setViewingMeeting(m)}
              onEdit={() => openEdit(m)}
              onDelete={() => setDeleteId(m.id)}
              onMinutes={() => navigate(`/board-meetings/${m.id}/minutes`)}
              onAdvance={s => updateStatusMutation.mutate({ id: m.id, status: s })}
              onJump={s => updateStatusMutation.mutate({ id: m.id, status: s })}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meeting</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Minutes</TableHead>
                <TableHead>Join</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.map(m => {
                const status = (m as any).status || "scheduled";
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {(m as any).type?.replace(/_/g, " ") || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(m.meeting_date), "dd MMM yyyy")}
                      {m.start_time && ` · ${m.start_time.toString().slice(0, 5)}`}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.location || "—"}</TableCell>
                    <TableCell>
                      <StatusPipeline
                        status={status}
                        onAdvance={s => updateStatusMutation.mutate({ id: m.id, status: s })}
                        onJump={s => updateStatusMutation.mutate({ id: m.id, status: s })}
                      />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const status = (m as any).status || "scheduled";
                        const has = !!(minutesMap as Record<string, boolean>)[m.id];
                        if (has) {
                          return (
                            <Button size="sm" variant="default"
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2.5"
                              onClick={() => navigate(`/board-meetings/${m.id}/minutes`)}>
                              <FileText className="h-3 w-3 mr-1" />View Minutes
                            </Button>
                          );
                        }
                        if (status === "completed") {
                          return (
                            <Button size="sm" variant="outline"
                              className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50 h-7 px-2.5"
                              onClick={() => navigate(`/board-meetings/${m.id}/minutes`)}>
                              <FileText className="h-3 w-3 mr-1" />Write Minutes
                            </Button>
                          );
                        }
                        return <span className="text-xs text-slate-400">Pending</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      <JoinMeetingButton
                        meetingDate={m.meeting_date}
                        meetingTime={m.start_time?.toString().slice(0, 5)}
                        roomName={`vestryhub-bm-${m.id}`}
                        displayName={userName}
                        title={m.title}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingMeeting(m)}>
                            <Eye className="h-4 w-4 mr-2" />View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(m)}>
                            <Pencil className="h-4 w-4 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(m.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={v => { setSheetOpen(v); if (!v) { setEditingId(null); setSelectedAttendees([]); } }}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>{editingId ? "Edit Meeting" : "Schedule Meeting"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div><Label>Meeting Name</Label><Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Board Meeting — Q1 Review" /></div>
            <div>
              <Label>Meeting Type</Label>
              <Select value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MEETING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <TimeSlotPicker
              value={{ date: formData.date, startTime: formData.startTime, endTime: formData.endTime }}
              onChange={v => setFormData(p => ({ ...p, date: v.date, startTime: v.startTime, endTime: v.endTime }))}
            />
            <div>
              <Label>Location Type</Label>
              <Select value={formData.location_type} onValueChange={v => setFormData(p => ({ ...p, location_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_site">On-site</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Venue / Location</Label><Input value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} /></div>
            {(formData.location_type === "online" || formData.location_type === "hybrid") && (
              <div><Label>Online Link</Label><Input value={formData.online_link} onChange={e => setFormData(p => ({ ...p, online_link: e.target.value }))} placeholder="https://zoom.us/..." /></div>
            )}
            {editingId && (
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Agenda</Label><Textarea value={formData.agenda} onChange={e => setFormData(p => ({ ...p, agenda: e.target.value }))} rows={4} placeholder="1. Opening Prayer&#10;2. Review of Minutes&#10;3. Financial Report..." /></div>
            <div><Label>Pre-meeting Notes</Label><Textarea value={formData.pre_meeting_notes} onChange={e => setFormData(p => ({ ...p, pre_meeting_notes: e.target.value }))} rows={2} /></div>

            {/* Attendees — leadership members only */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <UserCheck className="h-4 w-4" />Attendees
              </Label>
              {leadershipMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic border border-dashed border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                  No leadership members found — assign roles via the Members page
                </p>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                  {(leadershipMembers as any[]).map((m: any) => {
                    const checked = selectedAttendees.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={v => {
                            setSelectedAttendees(prev =>
                              v ? [...prev, m.id] : prev.filter(id => id !== m.id)
                            );
                          }}
                        />
                        <span className="text-sm flex-1">
                          {m.first_name} {m.last_name}
                          <span className="text-xs text-muted-foreground ml-1">— {m.membership_status}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {selectedAttendees.length > 0 && (
                <p className="text-xs text-muted-foreground">{selectedAttendees.length} attendee{selectedAttendees.length !== 1 ? "s" : ""} selected</p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => saveMutation.mutate()} disabled={!formData.title || saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingId ? "Update Meeting" : "Schedule Meeting"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this meeting permanently?</AlertDialogTitle>
            <AlertDialogDescription>This will also remove all associated minutes and agenda items. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Meeting View Modal */}
      {viewingMeeting && (
        <MeetingViewModal
          meeting={viewingMeeting}
          onClose={() => setViewingMeeting(null)}
          onEdit={() => { setViewingMeeting(null); openEdit(viewingMeeting); }}
        />
      )}
    </>
  );
}
