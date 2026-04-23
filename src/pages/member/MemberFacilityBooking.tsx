import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  ArrowLeft, Building2, Users, Calendar, Clock, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FacilityImage {
  image_path: string;
  sort_order: number;
}

interface Facility {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  quotation: number | null;
  is_active: boolean;
  type: string | null;
  facility_images: FacilityImage[];
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const memberBookingSchema = z.object({
  purpose: z.string().min(1, "Purpose is required"),
  booking_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  expected_attendees: z.coerce.number().optional(),
  setup_required: z.boolean().default(false),
  notes: z.string().optional(),
});
type MemberBookingFormValues = z.infer<typeof memberBookingSchema>;

// ─── Gradient placeholders ────────────────────────────────────────────────────

const GRADIENTS = [
  "from-indigo-400 to-indigo-600",
  "from-violet-400 to-purple-600",
  "from-emerald-400 to-green-600",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-600",
  "from-cyan-400 to-blue-500",
];

// ─── MemberBookingModal ───────────────────────────────────────────────────────

function MemberBookingModal({
  open,
  onClose,
  facility,
  churchId,
  memberId,
}: {
  open: boolean;
  onClose: () => void;
  facility: Facility | null;
  churchId: string;
  memberId: string;
}) {
  const qc = useQueryClient();

  const form = useForm<MemberBookingFormValues>({
    resolver: zodResolver(memberBookingSchema),
    defaultValues: {
      purpose: "",
      booking_date: format(new Date(), "yyyy-MM-dd"),
      start_time: "09:00",
      end_time: "12:00",
      expected_attendees: undefined,
      setup_required: false,
      notes: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (values: MemberBookingFormValues) => {
      const { error } = await supabase.from(TABLES.FACILITY_BOOKINGS as any).insert({
        tenant_id: churchId,
        facility_id: facility!.id,
        facility_name: facility!.name,
        booked_by: memberId,
        status: "open",
        purpose: values.purpose.trim(),
        booking_date: values.booking_date,
        start_time: values.start_time,
        end_time: values.end_time,
        expected_attendees: values.expected_attendees ?? null,
        setup_required: values.setup_required,
        notes: values.notes?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking submitted");
      qc.invalidateQueries({ queryKey: ["member-my-bookings", memberId] });
      form.reset();
      onClose();
    },
    onError: () => toast.error("Failed to submit booking"),
  });

  if (!facility) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Book — {facility.name}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(v => submitMutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="purpose" render={({ field }) => (
              <FormItem>
                <FormLabel>Purpose <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Birthday celebration" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="booking_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Date <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="start_time" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="end_time" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="expected_attendees" render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Attendees</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="setup_required" render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="mb-0">Setup Required</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </FormControl>
                </div>
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any additional details..." rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Booking"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Facility Card (read-only member variant) ─────────────────────────────────

function MemberFacilityCard({
  facility,
  onBookNow,
}: {
  facility: Facility;
  onBookNow: () => void;
}) {
  const sortedImages = [...(facility.facility_images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const firstImage = sortedImages[0]?.image_path ?? null;
  const gradientIdx = facility.name.charCodeAt(0) % GRADIENTS.length;
  const gradient = GRADIENTS[gradientIdx];

  const imageUrl = firstImage
    ? supabase.storage.from("facility-images").getPublicUrl(firstImage).data.publicUrl
    : null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Image / Gradient */}
      <div className={cn("h-36 relative", !imageUrl && `bg-gradient-to-br ${gradient}`)}>
        {imageUrl ? (
          <img src={imageUrl} alt={facility.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Building2 className="h-12 w-12 text-white/60" />
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-slate-900 dark:text-white leading-snug">
          {facility.name}
        </h3>

        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          {facility.capacity && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {facility.capacity} people
            </span>
          )}
          {facility.quotation && facility.quotation > 0 && (
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              KES {facility.quotation.toLocaleString()}
            </span>
          )}
        </div>

        {facility.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {facility.description}
          </p>
        )}

        <Button
          size="sm"
          className="w-full rounded-full h-9 mt-1 bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={onBookNow}
        >
          Book Now
        </Button>
      </div>
    </div>
  );
}

// ─── My Bookings Section ──────────────────────────────────────────────────────

function MyBookingsSection({
  memberId,
  churchId,
}: {
  memberId: string;
  churchId: string;
}) {
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["member-my-bookings", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FACILITY_BOOKINGS as any)
        .select("id, purpose, booking_date, start_time, end_time, status, facility_id, facilities(name)")
        .eq(COLS.TENANT_ID, churchId)
        .eq("booked_by", memberId)
        .order("booking_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        <Calendar className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No bookings yet</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Your submitted booking requests will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((b: any) => (
        <div
          key={b.id}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {(b.facilities as any)?.name ?? "Facility"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {b.purpose}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {b.booking_date}
              </span>
              {b.start_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {b.start_time.slice(0, 5)}
                  {b.end_time ? ` – ${b.end_time.slice(0, 5)}` : ""}
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={b.status ?? "pending"} />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MemberFacilityBooking() {
  const member = useMemberPortal();
  const navigate = useNavigate();
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ["member-facilities", member.churchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FACILITIES as any)
        .select("id, name, description, capacity, quotation, is_active, type, facility_images(image_path, sort_order)")
        .eq(COLS.TENANT_ID, member.churchId)
        .neq("is_active", false)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Facility[];
    },
    staleTime: 300000,
  });

  const handleBookNow = (facility: Facility) => {
    setSelectedFacility(facility);
    setModalOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Facility Booking — {member.churchName}</title>
      </Helmet>

      <div className="max-w-2xl mx-auto pb-8">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate("/member")}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {member.churchName}
            </p>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-indigo-500" />
              Facility Booking
            </h1>
          </div>
        </div>

        {/* Facilities grid */}
        <section className="mb-8">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Available Spaces
          </p>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-2xl" />
              ))}
            </div>
          ) : facilities.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
              <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No facilities available
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Check back soon for available spaces.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {facilities.map(facility => (
                <MemberFacilityCard
                  key={facility.id}
                  facility={facility}
                  onBookNow={() => handleBookNow(facility)}
                />
              ))}
            </div>
          )}
        </section>

        {/* My Bookings */}
        <section>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            My Bookings
          </p>
          <MyBookingsSection memberId={member.memberId} churchId={member.churchId} />
        </section>
      </div>

      {/* Booking modal */}
      <MemberBookingModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedFacility(null); }}
        facility={selectedFacility}
        churchId={member.churchId}
        memberId={member.memberId}
      />
    </>
  );
}
