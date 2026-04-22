import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeSlotPicker } from "@/components/events/TimeSlotPicker";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";
import { TABLES } from "@/lib/schema";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import { Plus, Church, CalendarDays, Users, CheckCircle2, List, LayoutGrid, Calendar, ChevronLeft, ChevronRight, MoreHorizontal, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const SERVICE_TYPES = [
  { value: "sunday",   label: "Sunday Service" },
  { value: "midweek",  label: "Midweek Service" },
  { value: "special",  label: "Special Service" },
];

const STATUS_PIPELINE = ["draft", "published", "completed"] as const;
type ServiceStatus = typeof STATUS_PIPELINE[number] | "cancelled";

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  published: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_BANNER: Record<string, string> = {
  draft:     "bg-slate-400",
  published: "bg-indigo-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

const STATUS_BORDER: Record<string, string> = {
  draft:     "border-l-slate-400",
  published: "border-l-indigo-500",
  completed: "border-l-emerald-500",
  cancelled: "border-l-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", published: "Published", completed: "Completed", cancelled: "Cancelled",
};

function serviceTypeLabel(type: string | null) {
  const map: Record<string, string> = {
    sunday: "Sunday Service",
    midweek: "Midweek Service",
    special: "Special Service",
  };
  return map[type ?? ""] ?? (type ?? "Service");
}

// ─── Status Pipeline Component ────────────────────────────────────────────────
function ServiceStatusPipeline({ status, onAdvance, onJump, compact = false }: {
  status: string; onAdvance: (s: string) => void; onJump: (s: string) => void; compact?: boolean;
}) {
  const currentIdx = STATUS_PIPELINE.indexOf(status as any);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_PIPELINE.length - 1
    ? STATUS_PIPELINE[currentIdx + 1] : null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <div className="flex items-center gap-0.5">
        {STATUS_PIPELINE.map((s, i) => {
          const isActive = s === status;
          const isPast = currentIdx > i;
          return (
            <div key={s} className="flex items-center">
              <button
                onClick={() => onJump(s)}
                className={cn("px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                  isActive ? STATUS_COLORS[s]
                  : isPast ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-900/10"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-800 hover:bg-slate-200"
                )}
              >
                {STATUS_LABELS[s]}
              </button>
              {i < STATUS_PIPELINE.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300 mx-0.5" />}
            </div>
          );
        })}
      </div>
      {nextStatus && status !== "cancelled" && (
        <Button size="sm" variant="outline"
          className={compact ? "h-5 text-[10px] px-1.5 ml-0.5" : "h-6 text-[10px] px-2 ml-1"}
          onClick={() => onAdvance(nextStatus)}
        >
          → {compact ? "Next" : STATUS_LABELS[nextStatus]}
        </Button>
      )}
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarViewPanel({ services }: { services: any[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) });
  const startDow = getDay(monthStart);
  const prefixBlanks = startDow === 0 ? 6 : startDow - 1;

  const servicesOnDate = (date: Date) =>
    services.filter(s => { try { return isSameDay(new Date(s.service_date), date); } catch { return false; } });

  const selectedServices = selectedDate ? servicesOnDate(selectedDate) : [];

  return (
    <div className="flex gap-4">
      <Card className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-semibold text-sm">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
            <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700">
          {Array.from({ length: prefixBlanks }).map((_, i) => <div key={`b-${i}`} className="bg-white dark:bg-slate-800 min-h-[72px]" />)}
          {days.map(day => {
            const dayServices = servicesOnDate(day);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            return (
              <div key={day.toISOString()}
                className={cn("bg-white dark:bg-slate-800 min-h-[72px] p-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors",
                  isSelected && "ring-2 ring-inset ring-indigo-500",
                  !isSameMonth(day, currentMonth) && "opacity-40"
                )}
                onClick={() => setSelectedDate(isSelected ? null : day)}
              >
                <div className="flex justify-end mb-0.5">
                  <span className={cn("text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full",
                    isToday(day) ? "bg-indigo-600 text-white" : "text-foreground"
                  )}>{format(day, "d")}</span>
                </div>
                <div className="space-y-0.5">
                  {dayServices.slice(0, 3).map(s => (
                    <div key={s.id} className={cn("text-[10px] text-white px-1 py-0.5 rounded truncate", STATUS_BANNER[s.status || "published"])}>
                      {s.name}
                    </div>
                  ))}
                  {dayServices.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{dayServices.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card className="w-72 shrink-0 p-4">
        {selectedDate ? (
          <>
            <h3 className="font-semibold text-sm mb-3">Services on {format(selectedDate, "EEE, dd MMM yyyy")}</h3>
            {selectedServices.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No services on this date</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedServices.map(s => (
                  <div key={s.id} className={cn("border-l-4 pl-3 py-2 rounded-r-md bg-muted/30", STATUS_BORDER[s.status || "published"])}>
                    <p className="font-medium text-sm leading-tight">{s.name}</p>
                    {s.start_time && <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{String(s.start_time).slice(0,5)}</div>}
                    {s.location && <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /><span className="truncate">{s.location}</span></div>}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Click a date to see services</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Service Card ─────────────────────────────────────────────────────────────
function ServiceCard({ service, rsvpCount, onEdit, onDelete, onStatusChange }: {
  service: any; rsvpCount: number;
  onEdit: () => void; onDelete: () => void;
  onStatusChange: (s: string) => void;
}) {
  const status = service.status || "published";
  const dateObj = new Date(service.service_date + "T00:00:00");

  return (
    <div className="flex flex-col gap-1">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Banner */}
        <div className={cn("h-28 relative flex items-end p-3", STATUS_BANNER[status])}>
          <div className="bg-white rounded-xl px-2.5 py-1.5 text-center shadow-sm min-w-[44px]">
            <p className="text-[10px] font-semibold uppercase text-indigo-600">{format(dateObj, "MMM")}</p>
            <p className="text-lg font-bold text-slate-800 leading-none">{format(dateObj, "d")}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white bg-white/20")}>
              {serviceTypeLabel(service.service_type)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={e => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-sm">
                <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* Content */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-slate-900 dark:text-white leading-snug">{service.name}</h3>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
            {service.start_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{String(service.start_time).slice(0,5)}</span>}
            {service.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{service.location}</span>}
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{rsvpCount} attending</span>
          </div>
        </div>
      </div>
      {/* Pipeline below card */}
      <div className="px-1">
        <ServiceStatusPipeline
          status={status}
          compact
          onAdvance={onStatusChange}
          onJump={onStatusChange}
        />
      </div>
    </div>
  );
}

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = {
  name: "", service_type: "sunday", description: "",
  service_date: format(new Date(), "yyyy-MM-dd"),
  start_time: "09:00", end_time: "12:00",
  location: "", expected_attendance: 0, preacher: "",
  is_recurring: false, recurrence_rule: "weekly",
  status: "draft", allow_attendance: true,
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ServicesPage() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"cards" | "calendar" | "list">("cards");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [editingService, setEditingService] = useState<any | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.SERVICES)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("service_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    staleTime: 300_000,
  });

  // Attendance counts (service_rsvps or attendance_records)
  const { data: attendanceCounts = {} } = useQuery({
    queryKey: ["service-attendance-counts", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("session_id")
        .eq("tenant_id", tenantId!);
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        if (r.session_id) counts[r.session_id] = (counts[r.session_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["services", tenantId] });

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(TABLES.SERVICES).insert({
        tenant_id: tenantId!,
        name: formData.name,
        title: formData.name,  // title is NOT NULL in DB
        service_type: formData.service_type,
        description: formData.description || null,
        service_date: formData.service_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location || null,
        expected_attendance: formData.expected_attendance || null,
        preacher: formData.preacher || null,
        is_recurring: formData.is_recurring,
        recurrence_rule: formData.is_recurring ? formData.recurrence_rule : null,
        status: formData.status,
        allow_attendance: formData.allow_attendance,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Service scheduled");
      logActivity({ churchId: tenantId!, actionType: "new_service", description: `Service "${formData.name}" scheduled`, entityType: "service" });
      setSheetOpen(false);
      setFormData({ ...emptyForm });
    },
    onError: (e: any) => toast.error(e.message || "Failed to schedule service"),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(TABLES.SERVICES).update({
        name: editForm.name,
        title: editForm.name,  // title is NOT NULL in DB
        service_type: editForm.service_type,
        description: editForm.description || null,
        service_date: editForm.service_date,
        start_time: editForm.start_time,
        end_time: editForm.end_time,
        location: editForm.location || null,
        expected_attendance: editForm.expected_attendance || null,
        preacher: editForm.preacher || null,
        is_recurring: editForm.is_recurring,
        recurrence_rule: editForm.is_recurring ? (editForm as any).recurrence_rule : null,
        status: editForm.status,
        allow_attendance: (editForm as any).allow_attendance ?? true,
      } as any).eq("id", editingService!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Service updated");
      setEditSheetOpen(false);
      setEditingService(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to update service"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.SERVICES).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Service deleted"); setDeleteServiceId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from(TABLES.SERVICES).update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (s: any) => {
    setEditingService(s);
    setEditForm({
      name: s.name || "",
      service_type: s.service_type || "sunday_service",
      description: s.description || "",
      service_date: s.service_date || format(new Date(), "yyyy-MM-dd"),
      start_time: s.start_time ? String(s.start_time).slice(0, 5) : "09:00",
      end_time: s.end_time ? String(s.end_time).slice(0, 5) : "12:00",
      location: s.location || "",
      expected_attendance: s.expected_attendance || 0,
      preacher: s.preacher || "",
      is_recurring: s.is_recurring || false,
      recurrence_rule: s.recurrence_rule || "weekly",
      status: s.status || "draft",
      allow_attendance: s.allow_attendance ?? true,
    });
    setEditSheetOpen(true);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const upcomingCount = services.filter(s => s.service_date >= today).length;
  const completedCount = services.filter(s => (s as any).status === "completed").length;
  const totalAttendance = Object.values(attendanceCounts as Record<string, number>).reduce((a, b) => a + b, 0);

  return (
    <>
      <Helmet><title>Services — Vestry</title></Helmet>
      <PageHeader
        title="Services"
        subtitle="Schedule and manage your weekly church services"
        action={
          <div className="flex items-center gap-2">
            <div className="flex border rounded-md overflow-hidden">
              <Button variant={view === "cards" ? "default" : "ghost"} size="sm" onClick={() => setView("cards")}><LayoutGrid className="h-4 w-4" /></Button>
              <Button variant={view === "calendar" ? "default" : "ghost"} size="sm" onClick={() => setView("calendar")}><Calendar className="h-4 w-4" /></Button>
              <Button variant={view === "list" ? "default" : "ghost"} size="sm" onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
            </div>
            <Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-2" />Schedule Service</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Church,       color: "bg-primary/10",    iconColor: "text-primary",       value: services.length,  label: "Total Services" },
          { icon: CalendarDays, color: "bg-emerald-500/10", iconColor: "text-emerald-500",  value: upcomingCount,    label: "Upcoming" },
          { icon: Users,        color: "bg-blue-500/10",    iconColor: "text-blue-500",     value: totalAttendance,  label: "Attendance Tracking" },
          { icon: CheckCircle2, color: "bg-violet-500/10",  iconColor: "text-violet-500",   value: completedCount,   label: "Completed" },
        ].map(({ icon: Icon, color, iconColor, value, label }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", color)}><Icon className={cn("h-5 w-5", iconColor)} /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Views */}
      {view === "calendar" ? (
        <CalendarViewPanel services={services} />
      ) : isLoading ? (
        <div className={view === "cards" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : services.length === 0 ? (
        <Card className="p-12 text-center">
          <Church className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No services yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Schedule your first church service to get started.</p>
          <Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-2" />Schedule Service</Button>
        </Card>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <ServiceCard
              key={s.id}
              service={s}
              rsvpCount={(attendanceCounts as Record<string, number>)[s.id] || 0}
              onEdit={() => openEdit(s)}
              onDelete={() => setDeleteServiceId(s.id)}
              onStatusChange={status => updateStatusMutation.mutate({ id: s.id, status })}
            />
          ))}
        </div>
      ) : (
        /* List view */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {["Service","Date","Location","Attendance","Progress",""].map(h => (
                    <th key={h} className="text-left p-3 text-sm font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {services.map(s => {
                  const status = (s as any).status || "published";
                  return (
                    <tr key={s.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium text-foreground">{s.name}</td>
                      <td className="p-3 text-sm text-muted-foreground">{format(new Date(s.service_date), "dd MMM yyyy")}</td>
                      <td className="p-3 text-sm text-muted-foreground">{s.location || "—"}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{(attendanceCounts as Record<string, number>)[s.id] || 0}</span>
                      </td>
                      <td className="p-3">
                        <ServiceStatusPipeline
                          status={status}
                          onAdvance={st => updateStatusMutation.mutate({ id: s.id, status: st })}
                          onJump={st => updateStatusMutation.mutate({ id: s.id, status: st })}
                        />
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(s)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteServiceId(s.id)}>Delete</DropdownMenuItem>
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

      {/* ── Create Sheet ─────────────────────────────────────────────────────── */}
      <ServiceFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Schedule Service"
        form={formData}
        setForm={setFormData}
        onSubmit={() => createMutation.mutate()}
        isPending={createMutation.isPending}
        submitLabel="Schedule Service"
      />

      {/* ── Edit Sheet ───────────────────────────────────────────────────────── */}
      <ServiceFormSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        title="Edit Service"
        form={editForm}
        setForm={setEditForm}
        onSubmit={() => editMutation.mutate()}
        isPending={editMutation.isPending}
        submitLabel="Save Changes"
      />

      {/* ── Delete Confirm ───────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the service and its attendance records.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteServiceId && deleteMutation.mutate(deleteServiceId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Shared Form Sheet ────────────────────────────────────────────────────────
function ServiceFormSheet({ open, onOpenChange, title, form, setForm, onSubmit, isPending, submitLabel }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string;
  form: typeof emptyForm; setForm: (f: any) => void;
  onSubmit: () => void; isPending: boolean; submitLabel: string;
}) {
  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <Label>Service Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Sunday Morning Service" />
          </div>
          <div>
            <Label>Service Type</Label>
            <Select value={form.service_type} onValueChange={v => set("service_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TimeSlotPicker
            value={{ date: form.service_date, startTime: form.start_time, endTime: form.end_time }}
            onChange={v => setForm((p: any) => ({ ...p, service_date: v.date, start_time: v.startTime, end_time: v.endTime }))}
          />
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Main Sanctuary" />
          </div>
          <div>
            <Label>Preacher / Speaker</Label>
            <Input value={form.preacher} onChange={e => set("preacher", e.target.value)} placeholder="Pastor John" />
          </div>
          <div>
            <Label>Expected Attendance</Label>
            <Input type="number" value={form.expected_attendance} onChange={e => set("expected_attendance", Number(e.target.value))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.is_recurring} onCheckedChange={c => set("is_recurring", c)} />
            <Label>Recurring Service</Label>
          </div>
          {form.is_recurring && (
            <Select value={(form as any).recurrence_rule} onValueChange={v => set("recurrence_rule", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-3">
            <Switch checked={(form as any).allow_attendance ?? true} onCheckedChange={c => set("allow_attendance", c)} />
            <Label>Allow Members to Record Attendance</Label>
          </div>
          <Button className="w-full" onClick={onSubmit} disabled={isPending || !form.name}>
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
