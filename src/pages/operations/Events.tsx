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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "@/components/events/EventCard";
import { CalendarView } from "@/components/events/CalendarView";
import { TimeSlotPicker } from "@/components/events/TimeSlotPicker";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, CalendarDays, Users, BarChart3, List, LayoutGrid, Calendar } from "lucide-react";

import { logActivity } from "@/lib/activityLogger";

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

export default function EventsPage() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"cards" | "calendar" | "list">("cards");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [formData, setFormData] = useState({
    title: "", type: "other", description: "",
    date: format(new Date(), "yyyy-MM-dd"), startTime: "09:00", endTime: "12:00",
    location: "", capacity_limit: 0, is_published: true,
    location_type: "on_site", online_link: "", allow_rsvp: true,
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("event_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000,
  });

  // Fetch RSVP counts per event for this tenant
  const { data: rsvpCounts = {} } = useQuery({
    queryKey: ["event-rsvp-counts", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_rsvps")
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

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").insert({
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
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", tenantId] });
      toast.success("Event created successfully");
      logActivity({ churchId: tenantId!, actionType: "new_event", description: `"${formData.title}" event was created`, entityType: "event", entityName: formData.title });
      setSheetOpen(false);
    },
    onError: () => toast.error("Failed to create event"),
  });

  const filteredEvents = events?.filter(e =>
    typeFilter === "all" || (e as any).type === typeFilter
  ) || [];

  const upcomingCount = events?.filter(e => new Date(e.event_date) >= new Date()).length || 0;
  const thisMonthStart = new Date(); thisMonthStart.setDate(1); thisMonthStart.setHours(0,0,0,0);
  const totalRsvps = Object.values(rsvpCounts as Record<string, number>).reduce((a, b) => a + b, 0);
  const yearCount = events?.length || 0;

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
        {EVENT_TYPES.map(t => (
          <Button key={t.value} variant={typeFilter === t.value ? "default" : "outline"} size="sm" onClick={() => setTypeFilter(t.value)}>{t.label}</Button>
        ))}
      </div>

      {view === "calendar" ? (
        <CalendarView
          events={filteredEvents.map(e => ({
            id: e.id, title: e.title, date: e.event_date,
            type: (e as any).type || "other", startTime: e.start_time || undefined,
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
          {filteredEvents.map(e => (
            <EventCard
              key={e.id}
              event={{
                id: e.id, title: e.title, event_date: e.event_date,
                type: (e as any).type, start_time: e.start_time || undefined,
                location: e.location || undefined, description: e.description || undefined,
                banner_image_url: (e as any).banner_image_url,
                capacity_limit: e.capacity_limit || undefined,
                status: (e as any).status || (e.is_published ? "published" : "draft"),
                rsvp_count: (rsvpCounts as Record<string, number>)[e.id] || 0,
              }}
              variant="full"
              onClick={() => {}}
            />
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Event</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Location</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">RSVPs</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map(e => (
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
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.is_published ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {e.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Event Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Create Event</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Event Name</Label>
              <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Annual Church Conference" />
            </div>
            <div>
              <Label>Event Type</Label>
              <Select value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} />
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
                  <SelectItem value="off_site">Off-site</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Venue / Location</Label>
              <Input value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} />
            </div>
            {(formData.location_type === "online" || formData.location_type === "hybrid") && (
              <div>
                <Label>Online Link</Label>
                <Input value={formData.online_link} onChange={e => setFormData(p => ({ ...p, online_link: e.target.value }))} placeholder="https://zoom.us/..." />
              </div>
            )}
            <div>
              <Label>Capacity (0 = unlimited)</Label>
              <Input type="number" value={formData.capacity_limit} onChange={e => setFormData(p => ({ ...p, capacity_limit: Number(e.target.value) }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.allow_rsvp} onCheckedChange={c => setFormData(p => ({ ...p, allow_rsvp: c }))} />
              <Label>Allow RSVP</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.is_published} onCheckedChange={c => setFormData(p => ({ ...p, is_published: c }))} />
              <Label>Published</Label>
            </div>
            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!formData.title || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
