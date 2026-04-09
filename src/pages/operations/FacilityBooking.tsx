import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { formatCurrencyFull } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Building2, Calendar, Users, MoreVertical, Pencil, Trash2, Send, Edit, MessageSquare, Mail, MessageCircle } from "lucide-react";

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

const EMPTY_FACILITY_FORM = {
  name: "", type: "other", capacity: 0, description: "", is_active: true, quotation: 0,
  booker_type: "", booker_name: "", booker_org_name: "",
  booker_contact_person: "", booker_phone: "", booker_email: "",
};

export default function FacilityBookingPage() {
  const { tenantId, userId, currency } = useChurch();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "facilities";

  // Facility dialog state
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [facilityDialogMode, setFacilityDialogMode] = useState<"create" | "edit">("create");
  const [editingFacility, setEditingFacility] = useState<any | null>(null);
  const [facilityToDelete, setFacilityToDelete] = useState<any | null>(null);

  // Send confirmation / request dialog state
  const [sendConfirmationFacility, setSendConfirmationFacility] = useState<any | null>(null);
  const [sendRequestBooking, setSendRequestBooking] = useState<any | null>(null);

  // Booking sheet state
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [bookingSheetMode, setBookingSheetMode] = useState<'create' | 'edit'>('create');
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const [bookingErrors, setBookingErrors] = useState<Record<string, string>>({});

  const [facilityForm, setFacilityForm] = useState(EMPTY_FACILITY_FORM);
  const [bookingForm, setBookingForm] = useState({
    facility_name: "", purpose: "", booking_date: format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00", end_time: "12:00", expected_attendees: 0,
    setup_required: false, setup_notes: "", notes: "",
    booker_type: "", booker_name: "", booker_org_name: "",
    booker_contact_person: "", booker_phone: "", booker_email: "",
  });

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: facilities, isLoading: facLoading } = useQuery({
    queryKey: ["facilities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FACILITIES as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name");
      if (error) throw error;
      return (data || []) as any[];
    },
    staleTime: 300000,
  });

  const { data: bookings, isLoading: bookLoading } = useQuery({
    queryKey: ["facility_bookings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FACILITY_BOOKINGS)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("booking_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000,
  });

  const { data: responses, isLoading: responsesLoading } = useQuery({
    queryKey: ["facility_booking_responses", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FACILITY_BOOKING_RESPONSES)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    staleTime: 300000,
  });

  const unreadCount = responses?.filter((r: any) => !r.is_read).length ?? 0;

  const markResponsesReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from(TABLES.FACILITY_BOOKING_RESPONSES)
        .update({ is_read: true })
        .eq("tenant_id", tenantId)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility_booking_responses", tenantId] });
    },
  });

  function handleTabChange(value: string) {
    setSearchParams(value === "facilities" ? {} : { tab: value });
    if (value === "responses" && unreadCount > 0) {
      markResponsesReadMutation.mutate();
    }
  }

  // ── Facility mutations ────────────────────────────────────────────────────────

  const createFacilityMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(TABLES.FACILITIES as any).insert({
        tenant_id: tenantId,
        name: facilityForm.name,
        type: facilityForm.type,
        capacity: facilityForm.capacity || null,
        description: facilityForm.description,
        is_active: facilityForm.is_active,
        quotation: facilityForm.quotation || null,
        booker_type: facilityForm.booker_type || null,
        booker_name: facilityForm.booker_name || null,
        booker_org_name: facilityForm.booker_org_name || null,
        booker_contact_person: facilityForm.booker_contact_person || null,
        booker_phone: facilityForm.booker_phone || null,
        booker_email: facilityForm.booker_email || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities", tenantId] });
      toast.success("Facility added");
      setFacilityDialogOpen(false);
      setFacilityForm(EMPTY_FACILITY_FORM);
    },
    onError: () => toast.error("Failed to add facility"),
  });

  const updateFacilityMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from(TABLES.FACILITIES as any)
        .update({
          name: facilityForm.name,
          type: facilityForm.type,
          capacity: facilityForm.capacity || null,
          description: facilityForm.description,
          is_active: facilityForm.is_active,
          quotation: facilityForm.quotation || null,
          booker_type: facilityForm.booker_type || null,
          booker_name: facilityForm.booker_name || null,
          booker_org_name: facilityForm.booker_org_name || null,
          booker_contact_person: facilityForm.booker_contact_person || null,
          booker_phone: facilityForm.booker_phone || null,
          booker_email: facilityForm.booker_email || null,
        })
        .eq("id", editingFacility!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities", tenantId] });
      toast.success("Facility updated");
      setFacilityDialogOpen(false);
      setEditingFacility(null);
      setFacilityForm(EMPTY_FACILITY_FORM);
    },
    onError: () => toast.error("Failed to update facility"),
  });

  const deleteFacilityMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLES.FACILITIES as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities", tenantId] });
      toast.success("Facility deleted");
      setFacilityToDelete(null);
    },
    onError: () => toast.error("Failed to delete facility"),
  });

  // ── Booking mutations ─────────────────────────────────────────────────────────

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(TABLES.FACILITY_BOOKINGS).insert({
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
        status: "pending_confirmation",
        booker_type: bookingForm.booker_type || null,
        booker_name: bookingForm.booker_name || null,
        booker_org_name: bookingForm.booker_org_name || null,
        booker_contact_person: bookingForm.booker_contact_person || null,
        booker_phone: bookingForm.booker_phone || null,
        booker_email: bookingForm.booker_email || null,
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
      const { error } = await supabase.from(TABLES.FACILITY_BOOKINGS).update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility_bookings", tenantId] });
      toast.success("Booking updated");
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async (data: typeof bookingForm) => {
      const { error } = await supabase
        .from(TABLES.FACILITY_BOOKINGS)
        .update({ ...data, updated_at: new Date().toISOString() } as any)
        .eq("id", editingBooking!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility_bookings", tenantId] });
      toast.success("Booking updated successfully");
      setBookingSheetOpen(false);
      setEditingBooking(null);
      setBookingSheetMode("create");
    },
    onError: () => toast.error("Failed to update booking"),
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLES.FACILITY_BOOKINGS)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility_bookings", tenantId] });
      toast.success("Booking deleted successfully");
    },
    onError: () => toast.error("Failed to delete booking"),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function openCreateFacility() {
    setFacilityForm(EMPTY_FACILITY_FORM);
    setEditingFacility(null);
    setFacilityDialogMode("create");
    setFacilityDialogOpen(true);
  }

  function openEditFacility(facility: any) {
    setFacilityForm({
      name: facility.name ?? "",
      type: facility.type ?? "other",
      capacity: facility.capacity ?? 0,
      description: facility.description ?? "",
      is_active: facility.is_active ?? true,
      quotation: facility.quotation ?? 0,
      booker_type: facility.booker_type ?? "",
      booker_name: facility.booker_name ?? "",
      booker_org_name: facility.booker_org_name ?? "",
      booker_contact_person: facility.booker_contact_person ?? "",
      booker_phone: facility.booker_phone ?? "",
      booker_email: facility.booker_email ?? "",
    });
    setEditingFacility(facility);
    setFacilityDialogMode("edit");
    setFacilityDialogOpen(true);
  }

  function handleFacilitySubmit() {
    if (facilityDialogMode === "edit") {
      updateFacilityMutation.mutate();
    } else {
      createFacilityMutation.mutate();
    }
  }

  function openEditBooking(booking: any) {
    setBookingForm({
      facility_name: booking.facility_name ?? "",
      purpose: booking.purpose ?? "",
      booking_date: booking.booking_date ?? format(new Date(), "yyyy-MM-dd"),
      start_time: booking.start_time?.toString().slice(0, 5) ?? "09:00",
      end_time: booking.end_time?.toString().slice(0, 5) ?? "12:00",
      expected_attendees: booking.expected_attendees ?? 0,
      setup_required: booking.setup_required ?? false,
      setup_notes: booking.setup_notes ?? "",
      notes: booking.notes ?? "",
      booker_type: booking.booker_type ?? "",
      booker_name: booking.booker_name ?? "",
      booker_org_name: booking.booker_org_name ?? "",
      booker_contact_person: booking.booker_contact_person ?? "",
      booker_phone: booking.booker_phone ?? "",
      booker_email: booking.booker_email ?? "",
    });
    setEditingBooking(booking);
    setBookingSheetMode("edit");
    setBookingSheetOpen(true);
  }

  function validateBookerIdentity(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!bookingForm.booker_type) errors.booker_type = "Booker type is required";
    if (bookingForm.booker_type === "Individual" && !bookingForm.booker_name)
      errors.booker_name = "Name is required";
    if (bookingForm.booker_type === "Organisation" && !bookingForm.booker_org_name)
      errors.booker_org_name = "Organisation name is required";
    if (!bookingForm.booker_phone && !bookingForm.booker_email)
      errors.booker_contact = "Phone or email is required";
    return errors;
  }

  async function saveBooking(silent = false): Promise<string | null> {
    try {
      if (bookingSheetMode === "edit") {
        if (silent) {
          // In silent mode (called from confirmation handlers), update without closing sheet
          const { error } = await supabase
            .from(TABLES.FACILITY_BOOKINGS)
            .update({ ...bookingForm, updated_at: new Date().toISOString() } as any)
            .eq("id", editingBooking!.id);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ["facility_bookings", tenantId] });
          return editingBooking!.id;
        }
        await updateBookingMutation.mutateAsync(bookingForm);
        return editingBooking!.id;
      } else {
        // createBookingMutation doesn't return the id, so we need a direct call
        const { data, error } = await supabase.from(TABLES.FACILITY_BOOKINGS).insert({
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
          status: "pending_confirmation",
          booker_type: bookingForm.booker_type || null,
          booker_name: bookingForm.booker_name || null,
          booker_org_name: bookingForm.booker_org_name || null,
          booker_contact_person: bookingForm.booker_contact_person || null,
          booker_phone: bookingForm.booker_phone || null,
          booker_email: bookingForm.booker_email || null,
        } as any).select("id").single();
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["facility_bookings", tenantId] });
        if (!silent) {
          toast.success("Booking request submitted");
          setBookingSheetOpen(false);
        }
        return (data as any).id;
      }
    } catch {
      toast.error("Failed to save booking");
      return null;
    }
  }

  async function handleSubmitBooking() {
    const errors = validateBookerIdentity();
    if (Object.keys(errors).length > 0) { setBookingErrors(errors); return; }
    setBookingErrors({});
    await saveBooking();
  }

  async function handleEmailConfirmation() {
    const errors = validateBookerIdentity();
    if (!bookingForm.booker_email) errors.booker_email = "Email is required for email confirmation";
    if (Object.keys(errors).length > 0) { setBookingErrors(errors); return; }
    setBookingErrors({});

    const bookingId = await saveBooking(true);
    if (!bookingId) return;

    const bookerName = bookingForm.booker_type === "Organisation"
      ? (bookingForm.booker_org_name || bookingForm.booker_contact_person)
      : bookingForm.booker_name;

    const { error } = await supabase.functions.invoke("send-booking-confirmation", {
      body: {
        channel: "email",
        to: bookingForm.booker_email,
        subject: `Booking Confirmation — ${bookingForm.facility_name}`,
        body: `Dear ${bookerName},\n\nYour booking for ${bookingForm.facility_name} on ${bookingForm.booking_date} from ${bookingForm.start_time} to ${bookingForm.end_time} has been received.\n\nPurpose: ${bookingForm.purpose || "N/A"}\n\nThank you.`,
        booking_id: bookingId,
        tenant_id: tenantId,
      },
    });
    if (error) {
      toast.error("Booking saved, but failed to send email confirmation");
    } else {
      toast.success("Email confirmation sent");
    }
    setBookingSheetOpen(false);
  }

  async function handleSmsConfirmation() {
    const errors = validateBookerIdentity();
    if (!bookingForm.booker_phone) errors.booker_phone = "Phone is required for SMS confirmation";
    if (Object.keys(errors).length > 0) { setBookingErrors(errors); return; }
    setBookingErrors({});

    const bookingId = await saveBooking(true);
    if (!bookingId) return;

    const bookerName = bookingForm.booker_type === "Organisation"
      ? (bookingForm.booker_org_name || bookingForm.booker_contact_person)
      : bookingForm.booker_name;

    const { error } = await supabase.functions.invoke("send-booking-confirmation", {
      body: {
        channel: "sms",
        to: bookingForm.booker_phone,
        body: `Hi ${bookerName}, your booking for ${bookingForm.facility_name} on ${bookingForm.booking_date} (${bookingForm.start_time}–${bookingForm.end_time}) has been received.`,
        booking_id: bookingId,
        tenant_id: tenantId,
      },
    });
    if (error) {
      toast.error("Booking saved, but failed to send SMS confirmation");
    } else {
      toast.success("SMS confirmation sent");
    }
    setBookingSheetOpen(false);
  }

  function handleBookingSubmit() {
    handleSubmitBooking();
  }

  async function handleFacilitySendConfirmation(channel: 'email' | 'sms') {
    const facility = sendConfirmationFacility;
    const booking = bookings?.find((b: any) => b.facility_name === facility.name);
    if (!booking) { toast.error("No booking found for this facility"); return; }
    if (channel === 'email' && !booking.booker_email) { toast.error("No email address on file for this booking"); return; }
    if (channel === 'sms' && !booking.booker_phone) { toast.error("No phone number on file for this booking"); return; }
    setSendConfirmationFacility(null);
    const bookerName = booking.booker_type === 'Organisation'
      ? (booking.booker_org_name || booking.booker_contact_person)
      : booking.booker_name;
    const payload = channel === 'email'
      ? { channel: 'email', to: booking.booker_email, subject: `Booking Confirmation — ${facility.name}`, body: `Dear ${bookerName},\n\nYour booking for ${facility.name} on ${booking.booking_date} from ${booking.start_time?.toString().slice(0,5)} to ${booking.end_time?.toString().slice(0,5)} has been confirmed.\n\nThank you.`, booking_id: booking.id, tenant_id: tenantId }
      : { channel: 'sms', to: booking.booker_phone, body: `Hi ${bookerName}, your booking for ${facility.name} on ${booking.booking_date} (${booking.start_time?.toString().slice(0,5)}–${booking.end_time?.toString().slice(0,5)}) is confirmed.`, booking_id: booking.id, tenant_id: tenantId };
    const { error } = await supabase.functions.invoke('send-booking-confirmation', { body: payload });
    if (error) toast.error(`Failed to send ${channel === 'email' ? 'email' : 'SMS'} confirmation`);
    else toast.success(`${channel === 'email' ? 'Email' : 'SMS'} confirmation sent`);
  }

  async function handleBookingSendRequest(channel: 'email' | 'sms') {
    const booking = sendRequestBooking;
    if (channel === 'email' && !booking.booker_email) { toast.error("No email address on file for this booking"); return; }
    if (channel === 'sms' && !booking.booker_phone) { toast.error("No phone number on file for this booking"); return; }
    setSendRequestBooking(null);
    const bookerName = booking.booker_type === 'Organisation'
      ? (booking.booker_org_name || booking.booker_contact_person)
      : booking.booker_name;
    const payload = channel === 'email'
      ? { channel: 'email', to: booking.booker_email, subject: `Booking Request — ${booking.facility_name}`, body: `Dear ${bookerName},\n\nYour booking request for ${booking.facility_name} on ${booking.booking_date} from ${booking.start_time?.toString().slice(0,5)} to ${booking.end_time?.toString().slice(0,5)} has been received.\n\nPurpose: ${booking.purpose || 'N/A'}\n\nThank you.`, booking_id: booking.id, tenant_id: tenantId }
      : { channel: 'sms', to: booking.booker_phone, body: `Hi ${bookerName}, your booking request for ${booking.facility_name} on ${booking.booking_date} (${booking.start_time?.toString().slice(0,5)}–${booking.end_time?.toString().slice(0,5)}) has been received.`, booking_id: booking.id, tenant_id: tenantId };
    const { error } = await supabase.functions.invoke('send-booking-confirmation', { body: payload });
    if (error) toast.error(`Failed to send ${channel === 'email' ? 'email' : 'SMS'} request`);
    else toast.success(`${channel === 'email' ? 'Email' : 'SMS'} request sent`);
  }

  const isFacilityMutating =
    createFacilityMutation.isPending || updateFacilityMutation.isPending;

  return (
    <>
      <Helmet><title>Facility &amp; Event Booking — Vestry</title></Helmet>
      <PageHeader
        title="Facility & Event Booking"
        subtitle="Manage church space bookings and requests"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={openCreateFacility}>
              <Plus className="h-4 w-4 mr-2" />Add Facility
            </Button>
            <Button onClick={() => setBookingSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />New Booking
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="responses" className="relative">
            Responses
            {unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold min-w-[16px] h-4 px-1">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Facilities Tab ── */}
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
              <Button onClick={openCreateFacility}><Plus className="h-4 w-4 mr-2" />Add Facility</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {facilities.map((f: any) => (
                <Card key={f.id} className="overflow-hidden">
                  <div className="h-24 bg-primary/10 flex items-center justify-center">
                    {f.photo_url
                      ? <img src={f.photo_url} alt="" className="w-full h-full object-cover" />
                      : <Building2 className="h-10 w-10 text-primary/30" />}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{f.name}</h4>
                        <Badge variant={f.is_active ? "default" : "secondary"} className="text-xs shrink-0">
                          {f.is_active ? "Available" : "Inactive"}
                        </Badge>
                      </div>

                      {/* Actions menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditFacility(f)}>
                            <Pencil className="h-4 w-4 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setFacilityToDelete(f)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSendConfirmationFacility(f)}>
                            <Send className="h-4 w-4 mr-2" />Send Confirmation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <Badge variant="outline" className="text-xs capitalize mb-2">
                      {f.type?.replace(/_/g, " ")}
                    </Badge>
                    {f.capacity && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>Seats {f.capacity}</span>
                      </div>
                    )}
                    {f.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{f.description}</p>
                    )}
                    {f.quotation > 0 && (
                      <p className="text-sm font-medium text-foreground mt-2">
                        {formatCurrencyFull(f.quotation, currency)}
                      </p>
                    )}
                    {f.amenities?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {f.amenities.map((a: string) => (
                          <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Bookings Tab ── */}
        <TabsContent value="bookings" className="mt-4">
          {bookLoading ? (
            <Card className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </Card>
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
                    <TableHead>Date &amp; Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {(b as any).booking_reference || b.id.slice(0, 8)}
                      </TableCell>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditBooking(b)}>
                              <Edit className="h-4 w-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setBookingToDelete(b.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSendRequestBooking(b)}>
                              <Send className="h-4 w-4 mr-2" />Send Request
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ── Responses Tab ── */}
        <TabsContent value="responses" className="mt-4">
          {responsesLoading ? (
            <Card className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </Card>
          ) : !responses?.length ? (
            <Card className="p-12 text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No responses yet</h3>
              <p className="text-sm text-muted-foreground">
                Booker replies received via email or SMS will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {responses.map((r: any) => (
                <Card key={r.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {r.channel === "email"
                          ? <Mail className="h-4 w-4 text-indigo-500" />
                          : <MessageCircle className="h-4 w-4 text-emerald-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-sm text-foreground">
                            {r.booker_name || r.from_address || "Unknown"}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${r.channel === "email" ? "border-indigo-300 text-indigo-600 dark:text-indigo-400" : "border-emerald-300 text-emerald-600 dark:text-emerald-400"}`}
                          >
                            {r.channel}
                          </Badge>
                          {!r.is_read && (
                            <span className="inline-block w-2 h-2 rounded-full bg-destructive" title="Unread" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-2">{r.body}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {r.booking_id && (
                            <span className="font-mono">Ref: {r.booking_reference || r.booking_id.slice(0, 8)}</span>
                          )}
                          <span>{r.created_at ? format(new Date(r.created_at), "dd MMM yyyy · HH:mm") : "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Add / Edit Facility Dialog ── */}
      <Dialog open={facilityDialogOpen} onOpenChange={open => {
        setFacilityDialogOpen(open);
        if (!open) { setEditingFacility(null); setFacilityForm(EMPTY_FACILITY_FORM); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{facilityDialogMode === "edit" ? "Edit Facility" : "Add Facility"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Facility Name</Label>
              <Input
                value={facilityForm.name}
                onChange={e => setFacilityForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Main Hall"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={facilityForm.type} onValueChange={v => setFacilityForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FACILITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Capacity</Label>
              <Input
                type="number"
                value={facilityForm.capacity}
                onChange={e => setFacilityForm(p => ({ ...p, capacity: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={facilityForm.description}
                onChange={e => setFacilityForm(p => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div>
              <Label>Quotation (optional)</Label>
              <Input
                type="number"
                min={0}
                value={facilityForm.quotation || ""}
                onChange={e => setFacilityForm(p => ({ ...p, quotation: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>

            {/* ── Booker Identity ── */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-foreground mb-3">Booker Identity (optional)</p>
              <div className="space-y-3">
                <div>
                  <Label>Booker Type</Label>
                  <Select
                    value={facilityForm.booker_type}
                    onValueChange={v => setFacilityForm(p => ({ ...p, booker_type: v, booker_name: "", booker_org_name: "", booker_contact_person: "" }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Individual">Individual</SelectItem>
                      <SelectItem value="Organisation">Organisation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {facilityForm.booker_type === "Individual" && (
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={facilityForm.booker_name}
                      onChange={e => setFacilityForm(p => ({ ...p, booker_name: e.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                )}

                {facilityForm.booker_type === "Organisation" && (
                  <>
                    <div>
                      <Label>Organisation Name</Label>
                      <Input
                        value={facilityForm.booker_org_name}
                        onChange={e => setFacilityForm(p => ({ ...p, booker_org_name: e.target.value }))}
                        placeholder="Acme Ltd"
                      />
                    </div>
                    <div>
                      <Label>Contact Person</Label>
                      <Input
                        value={facilityForm.booker_contact_person}
                        onChange={e => setFacilityForm(p => ({ ...p, booker_contact_person: e.target.value }))}
                        placeholder="Jane Smith"
                      />
                    </div>
                  </>
                )}

                {facilityForm.booker_type && (
                  <>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={facilityForm.booker_phone}
                        onChange={e => setFacilityForm(p => ({ ...p, booker_phone: e.target.value }))}
                        placeholder="+254700000000"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={facilityForm.booker_email}
                        onChange={e => setFacilityForm(p => ({ ...p, booker_email: e.target.value }))}
                        placeholder="booker@example.com"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={facilityForm.is_active}
                onCheckedChange={c => setFacilityForm(p => ({ ...p, is_active: c }))}
              />
              <Label>Active</Label>
            </div>
            <Button
              className="w-full"
              onClick={handleFacilitySubmit}
              disabled={!facilityForm.name || isFacilityMutating}
            >
              {isFacilityMutating
                ? facilityDialogMode === "edit" ? "Saving..." : "Adding..."
                : facilityDialogMode === "edit" ? "Save Changes" : "Add Facility"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Facility Confirmation ── */}
      <AlertDialog open={!!facilityToDelete} onOpenChange={open => { if (!open) setFacilityToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Facility</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{facilityToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => facilityToDelete && deleteFacilityMutation.mutate(facilityToDelete.id)}
              disabled={deleteFacilityMutation.isPending}
            >
              {deleteFacilityMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Booking Confirmation ── */}
      <AlertDialog open={bookingToDelete !== null} onOpenChange={open => { if (!open) setBookingToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (bookingToDelete) {
                  deleteBookingMutation.mutate(bookingToDelete);
                  setBookingToDelete(null);
                }
              }}
              disabled={deleteBookingMutation.isPending}
            >
              {deleteBookingMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── New / Edit Booking Sheet ── */}
      <Sheet open={bookingSheetOpen} onOpenChange={open => {
        setBookingSheetOpen(open);
        if (!open) {
          setEditingBooking(null);
          setBookingSheetMode("create");
          setBookingErrors({});
        }
      }}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>{bookingSheetMode === "edit" ? "Edit Booking" : "New Booking Request"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Facility</Label>
              {facilities?.length ? (
                <Select value={bookingForm.facility_name} onValueChange={v => setBookingForm(p => ({ ...p, facility_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
                  <SelectContent>
                    {facilities.map((f: any) => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={bookingForm.facility_name}
                  onChange={e => setBookingForm(p => ({ ...p, facility_name: e.target.value }))}
                  placeholder="Facility name"
                />
              )}
            </div>
            <div>
              <Label>Purpose / Event Name</Label>
              <Input
                value={bookingForm.purpose}
                onChange={e => setBookingForm(p => ({ ...p, purpose: e.target.value }))}
                placeholder="Youth Group Meeting"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={bookingForm.booking_date} onChange={e => setBookingForm(p => ({ ...p, booking_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={bookingForm.start_time} onChange={e => setBookingForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={bookingForm.end_time} onChange={e => setBookingForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Expected Attendees</Label>
              <Input
                type="number"
                value={bookingForm.expected_attendees}
                onChange={e => setBookingForm(p => ({ ...p, expected_attendees: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={bookingForm.setup_required}
                onCheckedChange={c => setBookingForm(p => ({ ...p, setup_required: c }))}
              />
              <Label>Setup Required</Label>
            </div>
            {bookingForm.setup_required && (
              <div>
                <Label>Setup Notes</Label>
                <Textarea
                  value={bookingForm.setup_notes}
                  onChange={e => setBookingForm(p => ({ ...p, setup_notes: e.target.value }))}
                  rows={2}
                />
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={bookingForm.notes}
                onChange={e => setBookingForm(p => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>

            {/* ── Booker Identity ── */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-foreground mb-3">Booker Identity</p>
              <div className="space-y-3">
                <div>
                  <Label>Booker Type</Label>
                  <Select
                    value={bookingForm.booker_type}
                    onValueChange={v => setBookingForm(p => ({ ...p, booker_type: v, booker_name: "", booker_org_name: "", booker_contact_person: "" }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Individual">Individual</SelectItem>
                      <SelectItem value="Organisation">Organisation</SelectItem>
                    </SelectContent>
                  </Select>
                  {bookingErrors.booker_type && (
                    <p className="text-xs text-destructive mt-1">{bookingErrors.booker_type}</p>
                  )}
                </div>

                {bookingForm.booker_type === "Individual" && (
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={bookingForm.booker_name}
                      onChange={e => setBookingForm(p => ({ ...p, booker_name: e.target.value }))}
                      placeholder="John Doe"
                    />
                    {bookingErrors.booker_name && (
                      <p className="text-xs text-destructive mt-1">{bookingErrors.booker_name}</p>
                    )}
                  </div>
                )}

                {bookingForm.booker_type === "Organisation" && (
                  <>
                    <div>
                      <Label>Organisation Name</Label>
                      <Input
                        value={bookingForm.booker_org_name}
                        onChange={e => setBookingForm(p => ({ ...p, booker_org_name: e.target.value }))}
                        placeholder="Acme Ltd"
                      />
                      {bookingErrors.booker_org_name && (
                        <p className="text-xs text-destructive mt-1">{bookingErrors.booker_org_name}</p>
                      )}
                    </div>
                    <div>
                      <Label>Contact Person</Label>
                      <Input
                        value={bookingForm.booker_contact_person}
                        onChange={e => setBookingForm(p => ({ ...p, booker_contact_person: e.target.value }))}
                        placeholder="Jane Smith"
                      />
                    </div>
                  </>
                )}

                {bookingForm.booker_type && (
                  <>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={bookingForm.booker_phone}
                        onChange={e => setBookingForm(p => ({ ...p, booker_phone: e.target.value }))}
                        placeholder="+254700000000"
                      />
                      {bookingErrors.booker_phone && (
                        <p className="text-xs text-destructive mt-1">{bookingErrors.booker_phone}</p>
                      )}
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={bookingForm.booker_email}
                        onChange={e => setBookingForm(p => ({ ...p, booker_email: e.target.value }))}
                        placeholder="booker@example.com"
                      />
                      {bookingErrors.booker_email && (
                        <p className="text-xs text-destructive mt-1">{bookingErrors.booker_email}</p>
                      )}
                    </div>
                    {bookingErrors.booker_contact && (
                      <p className="text-xs text-destructive">{bookingErrors.booker_contact}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6 flex flex-col gap-2 sm:flex-col">
            <Button
              className="w-full"
              onClick={handleSubmitBooking}
              disabled={!bookingForm.facility_name || !bookingForm.purpose || updateBookingMutation.isPending}
            >
              {updateBookingMutation.isPending ? "Submitting..." : "Submit Booking"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleEmailConfirmation}
              disabled={!bookingForm.facility_name || !bookingForm.purpose || updateBookingMutation.isPending}
            >
              Email Confirmation
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSmsConfirmation}
              disabled={!bookingForm.facility_name || !bookingForm.purpose || updateBookingMutation.isPending}
            >
              SMS Confirmation
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Send Confirmation Dialog (Facility Card) ── */}
      <Dialog open={sendConfirmationFacility !== null} onOpenChange={open => { if (!open) setSendConfirmationFacility(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Confirmation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Choose how to send the confirmation for <strong>{sendConfirmationFacility?.name}</strong>.
          </p>
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button onClick={() => handleFacilitySendConfirmation('email')}>Email</Button>
            <Button onClick={() => handleFacilitySendConfirmation('sms')}>SMS</Button>
            <Button variant="outline" onClick={() => setSendConfirmationFacility(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send Request Dialog (Booking Row) ── */}
      <Dialog open={sendRequestBooking !== null} onOpenChange={open => { if (!open) setSendRequestBooking(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Request</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Choose how to send the booking request.</p>
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button onClick={() => handleBookingSendRequest('email')}>Email</Button>
            <Button onClick={() => handleBookingSendRequest('sms')}>SMS</Button>
            <Button variant="outline" onClick={() => setSendRequestBooking(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
