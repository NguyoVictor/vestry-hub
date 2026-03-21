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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TimeSlotPicker } from "@/components/events/TimeSlotPicker";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Video, Calendar, MapPin, Clock, Users } from "lucide-react";

const MEETING_TYPES = [
  { value: "board_meeting", label: "Board Meeting" },
  { value: "elders_meeting", label: "Elders Meeting" },
  { value: "staff_meeting", label: "Staff Meeting" },
  { value: "finance_committee", label: "Finance Committee" },
  { value: "general_assembly", label: "General Assembly" },
  { value: "special_meeting", label: "Special Meeting" },
  { value: "other", label: "Other" },
];

const STATUS_MAP: Record<string, string> = {
  scheduled: "pending",
  in_progress: "in_progress",
  completed: "completed",
  cancelled: "inactive",
};

export default function BoardMeetingsPage() {
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "", type: "board_meeting",
    date: format(new Date(), "yyyy-MM-dd"), startTime: "10:00", endTime: "12:00",
    location: "", location_type: "on_site", online_link: "",
    agenda: "", pre_meeting_notes: "",
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
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("board_meetings").insert({
        tenant_id: tenantId,
        title: formData.title,
        meeting_date: formData.date,
        start_time: formData.startTime,
        agenda: formData.agenda,
        location: formData.location,
        created_by: userId,
        type: formData.type,
        end_time: formData.endTime,
        location_type: formData.location_type,
        online_link: formData.online_link,
        pre_meeting_notes: formData.pre_meeting_notes,
        status: "scheduled",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board_meetings", tenantId] });
      toast.success("Meeting scheduled");
      setSheetOpen(false);
    },
    onError: () => toast.error("Failed to schedule meeting"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("board_meetings").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board_meetings", tenantId] });
      toast.success("Meeting updated");
    },
  });

  const upcoming = meetings?.filter(m => new Date(m.meeting_date) >= new Date()) || [];
  const completed = meetings?.filter(m => (m as any).status === "completed").length || 0;

  return (
    <>
      <Helmet><title>Board Meetings — Vestry</title></Helmet>
      <PageHeader
        title="Board Meetings"
        subtitle="Schedule meetings, build agendas and record minutes"
        action={<Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-2" />Schedule Meeting</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Calendar className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{upcoming.length}</p>
              <p className="text-sm text-muted-foreground">Upcoming Meetings</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><Video className="h-5 w-5 text-emerald-500" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{meetings?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Meetings</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {upcoming.slice(0, 3).map(m => (
              <Card key={m.id} className="p-4 min-w-[280px] shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs capitalize">{(m as any).type?.replace(/_/g, " ") || "Meeting"}</Badge>
                  <StatusBadge status="pending" />
                </div>
                <h4 className="font-semibold text-foreground">{m.title}</h4>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{format(new Date(m.meeting_date), "EEE, dd MMM yyyy")}</span>
                </div>
                {m.start_time && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{m.start_time.toString().slice(0, 5)}</span>
                  </div>
                )}
                {m.location && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{m.location}</span>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: m.id, status: "in_progress" })}>Start</Button>
                  <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => updateStatusMutation.mutate({ id: m.id, status: "completed" })}>Complete</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Meetings Table */}
      {isLoading ? (
        <Card className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</Card>
      ) : !meetings?.length ? (
        <Card className="p-12 text-center">
          <Video className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No meetings yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Schedule your first board meeting.</p>
          <Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-2" />Schedule Meeting</Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meeting</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Minutes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium text-foreground">{m.title}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{(m as any).type?.replace(/_/g, " ") || "—"}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(m.meeting_date), "dd MMM yyyy")}
                    {m.start_time && ` · ${m.start_time.toString().slice(0, 5)}`}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.location || "—"}</TableCell>
                  <TableCell><StatusBadge status={STATUS_MAP[(m as any).status || "scheduled"] || "pending"} /></TableCell>
                  <TableCell>
                    {(m as any).minutes_content || m.minutes ? (
                      <Badge variant="secondary" className="text-xs">Recorded</Badge>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Schedule Meeting Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Schedule Meeting</SheetTitle></SheetHeader>
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
            <div><Label>Agenda</Label><Textarea value={formData.agenda} onChange={e => setFormData(p => ({ ...p, agenda: e.target.value }))} rows={4} placeholder="1. Opening Prayer&#10;2. Review of Minutes&#10;3. Financial Report..." /></div>
            <div><Label>Pre-meeting Notes</Label><Textarea value={formData.pre_meeting_notes} onChange={e => setFormData(p => ({ ...p, pre_meeting_notes: e.target.value }))} rows={2} /></div>
            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!formData.title || createMutation.isPending}>
              {createMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
