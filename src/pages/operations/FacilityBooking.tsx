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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarView } from "@/components/events/CalendarView";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Building2, Calendar, Users, MapPin } from "lucide-react";

const FACILITY_TYPES = [
  { value: "main_hall", label: "Main Hall" },
  { value: "classroom", label: "Classroom" },
  { value: "conference_room", label: "Conference Room" },
  { value: "outdoor", label: "Outdoor" },
  { value: "kitchen", label: "Kitchen" },
  { value: "other", label: "Other" },
];

const BOOKING_STATUS_MAP: Record<string, string> = {
  pending: "pending", approved: "active", rejected: "inactive",
  cancelled: "inactive", completed: "completed", open: "pending",
};

export default function FacilityBookingPage() {
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [facilityForm, setFacilityForm] = useState({
    name: "", type: "other", capacity: 0, description: "", is_active: true,
  });
  const [bookingForm, setBookingForm] = useState({
    facility_name: "", purpose: "", booking_date: format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00", end_time: "12:00", expected_attendees: 0,
    setup_required: false, setup_notes: "", notes: "",
  });

  const { data: facilities, isLoading: facLoading } = useQuery({
    queryKey: ["facilities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("facilities" as any).select("*").eq("tenant_id", tenantId).order("name");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: bookings, isLoading: bookLoading } = useQuery({
    queryKey: ["facility_bookings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("facility_bookings")
        .select("*").eq("tenant_id", tenantId)
        .order("booking_date", { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const createFacilityMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("facilities" as any).insert({
        tenant_id: tenantId, name: facilityForm.name, type: facilityForm.type,
        capacity: facilityForm.capacity || null, description: facilityForm.description,
        is_active: facilityForm.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities", tenantId] });
      toast.success("Facility added");
      setFacilityDialogOpen(false);
      setFacilityForm({ name: "", type: "other", capacity: 0, description: "", is_active: true });
    },
    onError: () => toast.error("Failed to add facility"),
  });

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("facility_bookings").insert({
        tenant_id: tenantId,
        facility_name: bookingForm.facility_name,
        purpose: bookingForm.purpose,
        booking_date: bookingForm.booking_date,
        start_time: bookingForm.start_time,
        end_time: bookingForm.end_time,
        booked_by: userId,
        expected_attendees: bookingForm.expected_attendees || null,
        setup_required: bookingForm.setup_required,
        setup_notes: bookingForm.setup_notes || null,
        notes: bookingForm.notes || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility_bookings", tenantId] });
      toast.success("Booking request submitted");
      setBookingSheetOpen(false);
    },
    onError: () => toast.error("Failed to create booking"),
  });

  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "approved") {
        updates.approved_by = userId;
        updates.approved_at = new Date().toISOString();
      }
      const { error } = await supabase.from("facility_bookings").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility_bookings", tenantId] });
      toast.success("Booking updated");
    },
  });

  return (
    <>
      <Helmet><title>Facility & Event Booking — Vestry</title></Helmet>
      <PageHeader
        title="Facility & Event Booking"
        subtitle="Manage church space bookings and requests"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFacilityDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Facility
            </Button>
            <Button onClick={() => setBookingSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />New Booking
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="facilities">
        <TabsList>
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="facilities" className="mt-4">
          {facLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : !facilities?.length ? (
            <Card className="p-12 text-center">
              <Building2 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No facilities yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Add your church facilities to enable booking.</p>
              <Button onClick={() => setFacilityDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Facility</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {facilities.map((f: any) => (
                <Card key={f.id} className="overflow-hidden">
                  <div className="h-24 bg-primary/10 flex items-center justify-center">
                    {f.photo_url ? <img src={f.photo_url} alt="" className="w-full h-full object-cover" /> : <Building2 className="h-10 w-10 text-primary/30" />}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground">{f.name}</h4>
                      <Badge variant={f.is_active ? "default" : "secondary"} className="text-xs">
                        {f.is_active ? "Available" : "Inactive"}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize mb-2">{f.type?.replace(/_/g, " ")}</Badge>
                    {f.capacity && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>Seats {f.capacity}</span>
                      </div>
                    )}
                    {f.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{f.description}</p>}
                    {f.amenities?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {f.amenities.map((a: string) => <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>)}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          {bookLoading ? (
            <Card className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</Card>
          ) : !bookings?.length ? (
            <Card className="p-12 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No bookings yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first booking request.</p>
              <Button onClick={() => setBookingSheetOpen(true)}><Plus className="h-4 w-4 mr-2" />New Booking</Button>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{(b as any).booking_reference || b.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium text-foreground">{b.facility_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.purpose || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(b.booking_date), "dd MMM yyyy")}
                        {b.start_time && ` · ${b.start_time.toString().slice(0, 5)}`}
                        {b.end_time && ` - ${b.end_time.toString().slice(0, 5)}`}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={BOOKING_STATUS_MAP[b.status || "open"] || "pending"} />
                      </TableCell>
                      <TableCell>
                        {(b.status === "open" || (b.status as string) === "pending") && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600"
                              onClick={() => updateBookingStatus.mutate({ id: b.id, status: "approved" })}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive"
                              onClick={() => updateBookingStatus.mutate({ id: b.id, status: "rejected" })}>
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Facility Dialog */}
      <Dialog open={facilityDialogOpen} onOpenChange={setFacilityDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Facility</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Facility Name</Label><Input value={facilityForm.name} onChange={e => setFacilityForm(p => ({ ...p, name: e.target.value }))} placeholder="Main Hall" /></div>
            <div>
              <Label>Type</Label>
              <Select value={facilityForm.type} onValueChange={v => setFacilityForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FACILITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Capacity</Label><Input type="number" value={facilityForm.capacity} onChange={e => setFacilityForm(p => ({ ...p, capacity: Number(e.target.value) }))} /></div>
            <div><Label>Description</Label><Textarea value={facilityForm.description} onChange={e => setFacilityForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={facilityForm.is_active} onCheckedChange={c => setFacilityForm(p => ({ ...p, is_active: c }))} />
              <Label>Active</Label>
            </div>
            <Button className="w-full" onClick={() => createFacilityMutation.mutate()} disabled={!facilityForm.name || createFacilityMutation.isPending}>
              {createFacilityMutation.isPending ? "Adding..." : "Add Facility"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Booking Sheet */}
      <Sheet open={bookingSheetOpen} onOpenChange={setBookingSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>New Booking Request</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Facility</Label>
              {facilities?.length ? (
                <Select value={bookingForm.facility_name} onValueChange={v => setBookingForm(p => ({ ...p, facility_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
                  <SelectContent>{facilities.map((f: any) => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={bookingForm.facility_name} onChange={e => setBookingForm(p => ({ ...p, facility_name: e.target.value }))} placeholder="Facility name" />
              )}
            </div>
            <div><Label>Purpose / Event Name</Label><Input value={bookingForm.purpose} onChange={e => setBookingForm(p => ({ ...p, purpose: e.target.value }))} placeholder="Youth Group Meeting" /></div>
            <div><Label>Date</Label><Input type="date" value={bookingForm.booking_date} onChange={e => setBookingForm(p => ({ ...p, booking_date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time</Label><Input type="time" value={bookingForm.start_time} onChange={e => setBookingForm(p => ({ ...p, start_time: e.target.value }))} /></div>
              <div><Label>End Time</Label><Input type="time" value={bookingForm.end_time} onChange={e => setBookingForm(p => ({ ...p, end_time: e.target.value }))} /></div>
            </div>
            <div><Label>Expected Attendees</Label><Input type="number" value={bookingForm.expected_attendees} onChange={e => setBookingForm(p => ({ ...p, expected_attendees: Number(e.target.value) }))} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={bookingForm.setup_required} onCheckedChange={c => setBookingForm(p => ({ ...p, setup_required: c }))} />
              <Label>Setup Required</Label>
            </div>
            {bookingForm.setup_required && (
              <div><Label>Setup Notes</Label><Textarea value={bookingForm.setup_notes} onChange={e => setBookingForm(p => ({ ...p, setup_notes: e.target.value }))} rows={2} /></div>
            )}
            <div><Label>Notes</Label><Textarea value={bookingForm.notes} onChange={e => setBookingForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <Button className="w-full" onClick={() => createBookingMutation.mutate()} disabled={!bookingForm.facility_name || !bookingForm.purpose || createBookingMutation.isPending}>
              {createBookingMutation.isPending ? "Submitting..." : "Submit Booking"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
