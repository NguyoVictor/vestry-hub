import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "@/components/events/EventCard";
import { TimeSlotPicker } from "@/components/events/TimeSlotPicker";
import { toast } from "sonner";
import {
  format, startOfMonth, endOfMonth, eachDayOfMonth, getDay,
  isSameDay, isSameMonth, isToday, addMonths, subMonths,
} from "date-fns";
import {
  Plus, CalendarDays, Users, BarChart3, List, LayoutGrid, Calendar,
  ChevronLeft, ChevronRight, MoreHorizontal, MapPin, Clock,
} from "lucide-react";
import { logActivity } from "@/lib/activityLogger";
import { TABLES } from "@/lib/schema";

const EVENT_TYPES = [
  { value: "conference", label: "Conference" },
  { value: "outreach", label: "Outreach" },
  { value: "youth", label: "Youth" },
  { value: "womens", label: "Women's" },
  { value: "mens", label: "Men's" },
  { value: "childrens", label: "Children's" },
  { value: "prayer", label: "Prayer" },
  { value: "social", label: "Social" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "other", label: "Other" },
];

const EVENT_TYPE_BG: Record<string, string> = {
  conference: "bg-violet-500",
  outreach: "bg-emerald-500",
  youth: "bg-amber-500",
  womens: "bg-pink-500",
  mens: "bg-blue-500",
  childrens: "bg-orange-500",
  prayer: "bg-indigo-500",
  social: "bg-cyan-500",
  fundraiser: "bg-emerald-600",
  other: "bg-slate-500",
};

const EVENT_TYPE_BORDER: Record<string, string> = {
  conference: "border-l-violet-500",
  outreach: "border-l-emerald-500",
  youth: "border-l-amber-500",
  womens: "border-l-pink-500",
  mens: "border-l-blue-500",
  childrens: "border-l-orange-500",
  prayer: "border-l-indigo-500",
  social: "border-l-cyan-500",
  fundraiser: "border-l-emerald-600",
  other: "border-l-slate-500",
};

// ─── Status Pipeline ──────────────────────────────────────────────────────────
const EVENT_STATUS_PIPELINE = ["draft", "published", "completed"] as const;

const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  completed: "Completed",
  cancelled: "Cancelled",
};

const EVENT_STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  published: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function EventStatusPipeline({
  status,
  onAdvance,
  onJump,
  compact = false,
}: {
  status: string;
  onAdvance: (s: string) => void;
  onJump: (s: string) => void;
  compact?: boolean;
}) {
  const currentIdx = EVENT_STATUS_PIPELINE.indexOf(status as any);
  const nextStatus =
    currentIdx >= 0 && currentIdx < EVENT_STATUS_PIPELINE.length - 1
      ? EVENT_STATUS_PIPELINE[currentIdx + 1]
      : null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <div className="flex items-center gap-0.5">
        {EVENT_STATUS_PIPELINE.map((s, i) => {
          const isActive = s === status;
          const isPast = currentIdx > i;
          return (
            <div key={s} className="flex items-center">
              <button
                onClick={() => onJump(s)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  isActive
                    ? EVENT_STATUS_COLORS[s]
                    : isPast
                    ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-900/10"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800 hover:bg-slate-200"
                }`}
              >
                {EVENT_STATUS_LABELS[s]}
              </button>
              {i < EVENT_STATUS_PIPELINE.length - 1 && (
                <ChevronRight className="h-3 w-3 text-slate-300 mx-0.5" />
              )}
            </div>
          );
        })}
      </div>
      {!compact && nextStatus && status !== "cancelled" && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] px-2 ml-1"
          onClick={() => onAdvance(nextStatus)}
        >
          → {EVENT_STATUS_LABELS[nextStatus]}
        </Button>
      )}
      {compact && nextStatus && status !== "cancelled" && (
        <Button
          size="sm"
          variant="outline"
          className="h-5 text-[10px] px-1.5 ml-0.5"
          onClick={() => onAdvance(nextStatus)}
        >
          → Next
        </Button>
      )}
      {!compact && status !== "cancelled" && status !== "completed" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-0.5">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive text-xs"
              onClick={() => onJump("cancelled")}
            >
              Cancel Event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ─── Calendar View Panel ──────────────────────────────────────────────────────
function CalendarViewPanel({ events }: { events: any[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfMonth(monthStart);

  // getDay returns 0=Sun..6=Sat; we want Mon=0..Sun=6
  const startDow = getDay(monthStart); // 0=Sun
  const prefixBlanks = startDow === 0 ? 6 : startDow - 1;

  const eventsOnDate = (date: Date) =>
    events.filter((e) => {
      try {
        return isSameDay(new Date(e.event_date), date);
      } catch {
        return false;
      }
    });

  const selectedEvents = selectedDate ? eventsOnDate(selectedDate) : [];

  return (
    <div className="flex gap-4">
      {/* Calendar grid */}
      <Card className="flex-1 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700">
          {Array.from({ length: prefixBlanks }).map((_, i) => (
            <div key={`blank-${i}`} className="bg-white dark:bg-slate-800 min-h-[72px]" />
          ))}
          {days.map((day) => {
            const dayEvents = eventsOnDate(day);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const todayDay = isToday(day);
            const inMonth = isSameMonth(day, currentMonth);

            return (
              <div
                key={day.toISOString()}
                className={`bg-white dark:bg-slate-800 min-h-[72px] p-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                  isSelected ? "ring-2 ring-inset ring-indigo-500" : ""
                } ${!inMonth ? "opacity-40" : ""}`}
                onClick={() => setSelectedDate(isSelected ? null : day)}
              >
                <div className="flex justify-end mb-0.5">
                  <span
                    className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${
                      todayDay
                        ? "bg-indigo-600 text-white"
                        : "text-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className={`text-[10px] text-white px-1 py-0.5 rounded truncate ${
                        EVENT_TYPE_BG[e.type || "other"] || EVENT_TYPE_BG.other
                      }`}
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{dayEvents.length - 3} more
                    </div>
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
            <h3 className="font-semibold text-sm mb-3">
              Events on {format(selectedDate, "EEE, dd MMM yyyy")}
            </h3>
            {selectedEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No events on this date</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((e) => (
                  <div
                    key={e.id}
                    className={`border-l-4 ${EVENT_TYPE_BORDER[e.type || "other"] || EVENT_TYPE_BORDER.other} pl-3 py-2 rounded-r-md bg-muted/30`}
                  >
                    <p className="font-medium text-sm leading-tight">{e.title}</p>
                    {e.start_time && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {e.start_time.slice(0, 5)}
                        {e.end_time && ` – ${e.end_time.slice(0, 5)}`}
                      </div>
                    )}
                    {e.location && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{e.location}</span>
                      </div>
                    )}
                    <Badge variant="outline" className="text-[10px] mt-1 capitalize">
                      {(e.type || "other").replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Click a date to see events</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Empty form defaults ──────────────────────────────────────────────────────
const emptyForm = {
  title: "", type: "other", description: "",
  date: format(new Date(), "yyyy-MM-dd"), startTime: "09:00", endTime: "12:00",
  location: "", capacity_limit: 0, is_published: true,
  location_type: "on_site", online_link: "", allow_rsvp: true,
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"cards" | "calendar" | "list">("cards");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");

  // Create form
  const [formData, setFormData] = useState({ ...emptyForm });

  // Edit state
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...emptyForm });

  // Delete state
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: events, isLoading } = useQuery({
    queryKey: ["events", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.EVENTS)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("event_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000,
  });

  const { data: rsvpCounts = {} } = useQuery({
    queryKey: ["event-rsvp-counts", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.EVENT_RSVPS)
        .select("event_id")
        .eq("tenant_id", tenantId!)
        .eq("status", "confirmed");
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        counts[r.event_id] = (counts[r.event_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const invalidateEvents = () => {
    queryClient.invalidateQueries({ queryKey: ["events", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["event-rsvp-counts", tenantId] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(TABLES.EVENTS).insert({
        tenant_id: tenantId,
        title: formData.title,
        event_date: formData.date,
        start_time: formData.startTime,
        end_time: formData.endTime,
        location: formData.location,
        capacity_limit: formData.capacity_limit || null,
        is_published: formData.is_published,
        description: formData.description,
        type: formData.type,
        location_type: formData.location_type,
        online_link: formData.online_link,
        allow_rsvp: formData.allow_rsvp,
        status: formData.is_published ? "published" : "draft",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateEvents();
      toast.success("Event created successfully");
      logActivity({
        churchId: tenantId!,
        actionType: "new_event",
        description: `"${formData.title}" event was created`,
        entityType: "event",
        entityName: formData.title,
      });
      setSheetOpen(false);
      setFormData({ ...emptyForm });
    },
    onError: () => toast.error("Failed to create event"),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from(TABLES.EVENTS)
        .update({
          title: editForm.title,
          event_date: editForm.date,
          start_time: editForm.startTime,
          end_time: editForm.endTime,
          location: editForm.location,
          capacity_limit: editForm.capacity_limit || null,
          is_published: editForm.is_published,
          description: editForm.description,
          type: editForm.type,
          location_type: editForm.location_type,
          online_link: editForm.online_link,
          allow_rsvp: editForm.allow_rsvp,
        } as any)
        .eq("id", editingEvent!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateEvents();
      toast.success("Event updated");
      setEditSheetOpen(false);
      setEditingEvent(null);
    },
    onError: () => toast.error("Failed to update event"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.EVENTS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateEvents();
      toast.success("Event deleted");
      setDeleteEventId(null);
    },
    onError: () => toast.error("Failed to delete event"),
  });

  const updateEventStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from(TABLES.EVENTS)
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateEvents();
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const openEditEvent = (e: any) => {
    setEditingEvent(e);
    setEditForm({
      title: e.title || "",
      type: e.type || "other",
      description: e.description || "",
      date: e.event_date || format(new Date(), "yyyy-MM-dd"),
      startTime: e.start_time ? e.start_time.toString().slice(0, 5) : "09:00",
      endTime: e.end_time ? e.end_time.toString().slice(0, 5) : "12:00",
      location: e.location || "",
      capacity_limit: e.capacity_limit || 0,
      is_published: e.is_published ?? true,
      location_type: e.location_type || "on_site",
      online_link: e.online_link || "",
      allow_rsvp: e.allow_rsvp ?? true,
    });
    setEditSheetOpen(true);
  };

  // ── Derived data ──────────────────────────────────────────────────────────────
  const filteredEvents = events?.filter(
    (e) => typeFilter === "all" || (e as any).type === typeFilter
  ) || [];

  const upcomingCount = events?.filter((e) => new Date(e.event_date) >= new Date()).length || 0;
  const totalRsvps = Object.values(rsvpCounts as Record<string, number>).reduce((a, b) => a + b, 0);
  const yearCount = events?.length || 0;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <Helmet><title>Events — Vestry</title></Helmet>
      <PageHeader
        title="Events"
        subtitle="Create and manage church events"
        action={
          <div className="flex items-center gap-2">
            <div className="flex border rounded-md overflow-hidden">
              <Button variant={view === "cards" ? "default" : "ghost"} size="sm" onClick={() => setView("cards")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={view === "calendar" ? "default" : "ghost"} size="sm" onClick={() => setView("calendar")}>
                <Calendar className="h-4 w-4" />
              </Button>
              <Button variant={view === "list" ? "default" : "ghost"} size="sm" onClick={() => setView("list")}>
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => setSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Create Event
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><CalendarDays className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{upcomingCount}</p>
              <p className="text-sm text-muted-foreground">Upcoming Events</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><Users className="h-5 w-5 text-emerald-500" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalRsvps}</p>
              <p className="text-sm text-muted-foreground">Total RSVPs This Month</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10"><BarChart3 className="h-5 w-5 text-violet-500" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{yearCount}</p>
              <p className="text-sm text-muted-foreground">Events This Year</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant={typeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("all")}>All</Button>
        {EVENT_TYPES.map((t) => (
          <Button key={t.value} variant={typeFilter === t.value ? "default" : "outline"} size="sm" onClick={() => setTypeFilter(t.value)}>
            {t.label}
          </Button>
        ))}
      </div>

      {/* Views */}
      {view === "calendar" ? (
        <CalendarViewPanel
          events={filteredEvents.map((e) => ({
            id: e.id,
            title: e.title,
            event_date: e.event_date,
            type: (e as any).type || "other",
            start_time: e.start_time || undefined,
            end_time: e.end_time || undefined,
            location: e.location || undefined,
          }))}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      ) : !filteredEvents.length ? (
        <Card className="p-12 text-center">
          <CalendarDays className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No events yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first church event to get started.</p>
          <Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Event</Button>
        </Card>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((e) => {
            const status = (e as any).status || (e.is_published ? "published" : "draft");
            return (
              <div key={e.id} className="flex flex-col gap-1">
                <EventCard
                  event={{
                    id: e.id, title: e.title, event_date: e.event_date,
                    type: (e as any).type, start_time: e.start_time || undefined,
                    location: e.location || undefined, description: e.description || undefined,
                    banner_image_url: (e as any).banner_image_url,
                    capacity_limit: e.capacity_limit || undefined,
                    status,
                    rsvp_count: (rsvpCounts as Record<string, number>)[e.id] || 0,
                  }}
                  variant="full"
                  onClick={() => {}}
                  onEdit={() => openEditEvent(e)}
                  onDelete={() => setDeleteEventId(e.id)}
                />
                {/* Compact status pipeline below card */}
                <div className="px-1">
                  <EventStatusPipeline
                    status={status}
                    compact
                    onAdvance={(s) => updateEventStatusMutation.mutate({ id: e.id, status: s })}
                    onJump={(s) => updateEventStatusMutation.mutate({ id: e.id, status: s })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Event</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Location</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">RSVPs</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Progress</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((e) => {
                  const status = (e as any).status || (e.is_published ? "published" : "draft");
                  return (
                    <tr key={e.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium text-foreground">{e.title}</td>
                      <td className="p-3 text-sm text-muted-foreground">{format(new Date(e.event_date), "dd MMM yyyy")}</td>
                      <td className="p-3 text-sm text-muted-foreground">{e.location || "—"}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {(rsvpCounts as Record<string, number>)[e.id] || 0}
                        </span>
                      </td>
                      <td className="p-3">
                        <EventStatusPipeline
                          status={status}
                          onAdvance={(s) => updateEventStatusMutation.mutate({ id: e.id, status: s })}
                          onJump={(s) => updateEventStatusMutation.mutate({ id: e.id, status: s })}
                        />
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditEvent(e)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteEventId(e.id)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Create Event Sheet ─────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Create Event</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Event Name</Label>
              <Input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} placeholder="Annual Church Conference" />
            </div>
            <div>
              <Label>Event Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <TimeSlotPicker
              value={{ date: formData.date, startTime: formData.startTime, endTime: formData.endTime }}
              onChange={(v) => setFormData((p) => ({ ...p, date: v.date, startTime: v.startTime, endTime: v.endTime }))}
            />
            <div>
              <Label>Location Type</Label>
              <Select value={formData.location_type} onValueChange={(v) => setFormData((p) => ({ ...p, location_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_site">On-site</SelectItem>
                  <SelectItem value="off_site">Off-site</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Venue / Location</Label>
              <Input value={formData.location} onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))} />
            </div>
            {(formData.location_type === "online" || formData.location_type === "hybrid") && (
              <div>
                <Label>Online Link</Label>
                <Input value={formData.online_link} onChange={(e) => setFormData((p) => ({ ...p, online_link: e.target.value }))} placeholder="https://zoom.us/..." />
              </div>
            )}
            <div>
              <Label>Capacity (0 = unlimited)</Label>
              <Input type="number" value={formData.capacity_limit} onChange={(e) => setFormData((p) => ({ ...p, capacity_limit: Number(e.target.value) }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.allow_rsvp} onCheckedChange={(c) => setFormData((p) => ({ ...p, allow_rsvp: c }))} />
              <Label>Allow RSVP</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.is_published} onCheckedChange={(c) => setFormData((p) => ({ ...p, is_published: c }))} />
              <Label>Published</Label>
            </div>
            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!formData.title || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Edit Event Sheet ───────────────────────────────────────────────── */}
      <Sheet open={editSheetOpen} onOpenChange={(v) => { setEditSheetOpen(v); if (!v) setEditingEvent(null); }}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Edit Event</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Event Name</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} placeholder="Annual Church Conference" />
            </div>
            <div>
              <Label>Event Type</Label>
              <Select value={editForm.type} onValueChange={(v) => setEditForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <TimeSlotPicker
              value={{ date: editForm.date, startTime: editForm.startTime, endTime: editForm.endTime }}
              onChange={(v) => setEditForm((p) => ({ ...p, date: v.date, startTime: v.startTime, endTime: v.endTime }))}
            />
            <div>
              <Label>Location Type</Label>
              <Select value={editForm.location_type} onValueChange={(v) => setEditForm((p) => ({ ...p, location_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_site">On-site</SelectItem>
                  <SelectItem value="off_site">Off-site</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Venue / Location</Label>
              <Input value={editForm.location} onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))} />
            </div>
            {(editForm.location_type === "online" || editForm.location_type === "hybrid") && (
              <div>
                <Label>Online Link</Label>
                <Input value={editForm.online_link} onChange={(e) => setEditForm((p) => ({ ...p, online_link: e.target.value }))} placeholder="https://zoom.us/..." />
              </div>
            )}
            <div>
              <Label>Capacity (0 = unlimited)</Label>
              <Input type="number" value={editForm.capacity_limit} onChange={(e) => setEditForm((p) => ({ ...p, capacity_limit: Number(e.target.value) }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editForm.allow_rsvp} onCheckedChange={(c) => setEditForm((p) => ({ ...p, allow_rsvp: c }))} />
              <Label>Allow RSVP</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editForm.is_published} onCheckedChange={(c) => setEditForm((p) => ({ ...p, is_published: c }))} />
              <Label>Published</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditSheetOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => editMutation.mutate()} disabled={!editForm.title || editMutation.isPending}>
                {editMutation.isPending ? "Saving..." : "Update Event"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete AlertDialog ─────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteEventId} onOpenChange={(v) => { if (!v) setDeleteEventId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event permanently?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteEventId && deleteMutation.mutate(deleteEventId)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
