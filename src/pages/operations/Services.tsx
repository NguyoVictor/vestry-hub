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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarView } from "@/components/events/CalendarView";
import { TimeSlotPicker } from "@/components/events/TimeSlotPicker";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";
import { format } from "date-fns";
import { Plus, Church, CalendarDays, Users, List, LayoutGrid, Clock, MapPin } from "lucide-react";

const SERVICE_TYPES = [
  { value: "sunday_service", label: "Sunday Service" },
  { value: "midweek_service", label: "Midweek Service" },
  { value: "prayer_meeting", label: "Prayer Meeting" },
  { value: "youth_service", label: "Youth Service" },
  { value: "children_service", label: "Children's Service" },
  { value: "special_service", label: "Special Service" },
  { value: "other", label: "Other" },
];

export default function ServicesPage() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", type: "sunday_service", color: "#4F46E5",
    date: format(new Date(), "yyyy-MM-dd"), startTime: "09:00", endTime: "12:00",
    location: "", expected_attendance: 0, preacher: "", notes: "",
    is_recurring: false, recurrence_frequency: "weekly",
  });

  const { data: services, isLoading } = useQuery({
    queryKey: ["services", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("session_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("attendance_sessions").insert({
        tenant_id: tenantId,
        session_date: formData.date,
        is_open: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", tenantId] });
      toast.success("Service scheduled successfully");
      logActivity({ churchId: tenantId!, actionType: "new_service", description: `A new service was scheduled for ${formData.date}`, entityType: "service" });
      setSheetOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to schedule service"),
  });

  const resetForm = () => setFormData({
    name: "", type: "sunday_service", color: "#4F46E5",
    date: format(new Date(), "yyyy-MM-dd"), startTime: "09:00", endTime: "12:00",
    location: "", expected_attendance: 0, preacher: "", notes: "",
    is_recurring: false, recurrence_frequency: "weekly",
  });

  const upcomingCount = services?.filter(s => new Date(s.session_date) >= new Date()).length || 0;
  const completedCount = services?.filter(s => new Date(s.session_date) < new Date()).length || 0;

  return (
    <>
      <Helmet><title>Services — Vestry</title></Helmet>
      <PageHeader
        title="Services"
        subtitle="Schedule and manage your weekly church services"
        action={
          <div className="flex items-center gap-2">
            <div className="flex border rounded-md overflow-hidden">
              <Button variant={view === "list" ? "default" : "ghost"} size="sm" onClick={() => setView("list")}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant={view === "calendar" ? "default" : "ghost"} size="sm" onClick={() => setView("calendar")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => setSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Schedule Service
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Church className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{services?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Services</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><CalendarDays className="h-5 w-5 text-emerald-500" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{upcomingCount}</p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
      </div>

      {view === "calendar" ? (
        <CalendarView
          events={(services || []).map(s => ({
            id: s.id, title: "Service", date: s.session_date, type: "sunday_service",
          }))}
        />
      ) : isLoading ? (
        <Card className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</Card>
      ) : !services?.length ? (
        <Card className="p-12 text-center">
          <Church className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No services yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Schedule your first church service to get started.</p>
          <Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-2" />Schedule Service</Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>QR Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">Service</TableCell>
                  <TableCell>{format(new Date(s.session_date), "EEE, dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.is_open ? "active" : "completed"} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{s.qr_code_token?.slice(0, 8)}...</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Schedule Service Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Schedule Service</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Service Name</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Sunday Morning Service" />
            </div>
            <div>
              <Label>Service Type</Label>
              <Select value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <TimeSlotPicker
              value={{ date: formData.date, startTime: formData.startTime, endTime: formData.endTime }}
              onChange={v => setFormData(p => ({ ...p, date: v.date, startTime: v.startTime, endTime: v.endTime }))}
            />
            <div>
              <Label>Location</Label>
              <Input value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="Main Sanctuary" />
            </div>
            <div>
              <Label>Expected Attendance</Label>
              <Input type="number" value={formData.expected_attendance} onChange={e => setFormData(p => ({ ...p, expected_attendance: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Preacher / Speaker</Label>
              <Input value={formData.preacher} onChange={e => setFormData(p => ({ ...p, preacher: e.target.value }))} placeholder="Pastor John" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={3} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.is_recurring} onCheckedChange={c => setFormData(p => ({ ...p, is_recurring: c }))} />
              <Label>Recurring Service</Label>
            </div>
            {formData.is_recurring && (
              <Select value={formData.recurrence_frequency} onValueChange={v => setFormData(p => ({ ...p, recurrence_frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Scheduling..." : "Schedule Service"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
