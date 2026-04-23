import { useState } from "react";
import { motion } from "framer-motion";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertTitle,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PremiumGallery } from "@/components/ui/PremiumGallery";
import {
  ArrowLeft, Building2, Users, Calendar, Clock, CheckCircle2, Video, ChevronLeft, ChevronRight, ImageIcon, X,
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
  thumbnail_path: string | null;
  video_path: string | null;
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

const TYPE_GRADIENTS_MEMBER: Record<string, string> = {
  outdoor:    "from-orange-400 to-orange-500",
  indoor:     "from-indigo-500 to-indigo-600",
  hall:       "from-violet-500 to-purple-600",
  chapel:     "from-pink-400 to-rose-500",
  conference: "from-blue-400 to-blue-600",
  classroom:  "from-emerald-400 to-green-500",
  parking:    "from-slate-400 to-slate-600",
  kitchen:    "from-amber-400 to-yellow-500",
};

function getMemberTypeGradient(type: string | null): string {
  if (!type) return "from-blue-400 to-blue-600";
  const key = type.toLowerCase().split(" ")[0];
  return TYPE_GRADIENTS_MEMBER[key] ?? "from-blue-400 to-blue-600";
}

// ─── MemberBookingModal ───────────────────────────────────────────────────────

function MemberBookingModal({
  open,
  onClose,
  facility,
  churchId,
  memberId,
  memberName,
}: {
  open: boolean;
  onClose: () => void;
  facility: Facility | null;
  churchId: string;
  memberId: string;
  memberName: string;
}) {
  const qc = useQueryClient();

  const form = useForm<MemberBookingFormValues>({
    resolver: zodResolver(memberBookingSchema),
    defaultValues: {
      purpose: "",
      booking_date: format(new Date(), "yyyy-MM-dd"),
      start_time: "09:00",
      end_time: "12:00",
      expected_attendees: "" as any,
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
        booker_name: memberName,
        booker_type: "member",
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-describedby="booking-modal-desc">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Book — {facility.name}
          </DialogTitle>
          <p id="booking-modal-desc" className="sr-only">Submit a booking request for {facility.name}</p>
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

// ─── Facility Detail Sheet ────────────────────────────────────────────────────

function FacilityDetailSheet({
  facility,
  open,
  onClose,
  onBookNow,
}: {
  facility: Facility | null;
  open: boolean;
  onClose: () => void;
  onBookNow: () => void;
}) {
  if (!facility) return null;

  const sortedImages = [...(facility.facility_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const thumbUrl = facility.thumbnail_path
    ? supabase.storage.from("facility-thumbnails").getPublicUrl(facility.thumbnail_path).data.publicUrl
    : null;
  const videoUrl = facility.video_path
    ? supabase.storage.from("facility-videos").getPublicUrl(facility.video_path).data.publicUrl
    : null;
  const galleryUrls = sortedImages.map(img =>
    supabase.storage.from("facility-images").getPublicUrl(img.image_path).data.publicUrl
  );
  const gradient = getMemberTypeGradient(facility.type);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-2xl p-0 flex flex-col">
        {/* ── Hero ── */}
        <div className={`relative h-[200px] md:h-[260px] shrink-0 overflow-hidden ${!thumbUrl ? `bg-gradient-to-br ${gradient}` : ""}`}>
          {thumbUrl ? (
            <img src={thumbUrl} alt={facility.name} className="w-full h-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }}
              />
              <div className="flex items-center justify-center h-full">
                <Building2 className="h-16 w-16 text-white/60" />
              </div>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-12">
            <h2 className="text-white font-bold text-xl leading-tight mb-1.5">{facility.name}</h2>
            <div className="flex flex-wrap gap-1.5">
              {facility.type && (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-white/20 backdrop-blur-sm text-white border border-white/20">
                  {facility.type}
                </span>
              )}
              {facility.capacity && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-white/20 backdrop-blur-sm text-white border border-white/20">
                  <Users className="h-2.5 w-2.5" />{facility.capacity.toLocaleString()} people
                </span>
              )}
              {facility.quotation && facility.quotation > 0 && (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-amber-500/80 backdrop-blur-sm text-white border border-amber-400/30">
                  KES {facility.quotation.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          {/* Close button handled by SheetContent */}
        </div>

        {/* ── Two-column body ── */}
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto">
          {/* Left: info */}
          <div className="flex-[55] p-5 space-y-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-700">
            {facility.description && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">About this space</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{facility.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {facility.capacity && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Capacity</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{facility.capacity.toLocaleString()} people</p>
                </div>
              )}
              {facility.quotation && facility.quotation > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Price</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">KES {facility.quotation.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: gallery + book button */}
          <div className="flex-[45] p-5 space-y-4 flex flex-col">
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Gallery</p>
              <PremiumGallery
                images={galleryUrls}
                videos={videoUrl ? [videoUrl] : []}
                facilityName={facility.name}
              />
            </div>

            {/* Book button — below gallery on desktop, sticky on mobile */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-3 pb-1 md:static md:bg-transparent md:pt-0 md:pb-0">
              <Button
                className="w-full rounded-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base shadow-lg shadow-orange-500/25"
                onClick={() => { onClose(); onBookNow(); }}
              >
                Book This Space
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Facility Card (read-only member variant) ─────────────────────────────────

function MemberFacilityCard({
  facility,
  onBookNow,
  onViewDetails,
}: {
  facility: Facility;
  onBookNow: () => void;
  onViewDetails: () => void;
}) {
  const sortedImages = [...(facility.facility_images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const gradient = getMemberTypeGradient(facility.type);
  const thumbUrl = facility.thumbnail_path
    ? supabase.storage.from("facility-thumbnails").getPublicUrl(facility.thumbnail_path).data.publicUrl
    : null;

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.10)" }}
      transition={{ duration: 0.2 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm cursor-pointer"
      onClick={onViewDetails}
    >
      {/* Image / Gradient */}
      <div className={cn("h-[180px] relative overflow-hidden", !thumbUrl && `bg-gradient-to-br ${gradient}`)}>
        {thumbUrl ? (
          <img src={thumbUrl} alt={facility.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.03]" />
        ) : (
          <>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }}
            />
            <div className="flex items-center justify-center h-full">
              <Building2 className="h-12 w-12 text-white/60" />
            </div>
          </>
        )}
        {/* Badges */}
        {(facility.facility_images?.length ?? 0) > 0 && (
          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
            {facility.facility_images!.length} photos
          </span>
        )}
        {facility.video_path && (
          <span className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <Video className="h-2.5 w-2.5" /> Video
          </span>
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

        <div className="flex gap-2 mt-1" onClick={e => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 rounded-full h-9 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            onClick={onViewDetails}
          >
            View Details
          </Button>
          <Button
            size="sm"
            className="flex-1 rounded-full h-9 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            onClick={onBookNow}
          >
            Book Now
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── My Bookings Section ──────────────────────────────────────────────────────

const WITHDRAWABLE_STATUSES = ["open", "pending_confirmation"];

function MyBookingsSection({
  memberId,
  churchId,
}: {
  memberId: string;
  churchId: string;
}) {
  const qc = useQueryClient();
  const [withdrawId, setWithdrawId] = useState<string | null>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["member-my-bookings", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FACILITY_BOOKINGS as any)
        .select("id, purpose, booking_date, start_time, end_time, status, facility_id, facility_name")
        .eq(COLS.TENANT_ID, churchId)
        .eq("booked_by", memberId)
        .order("booking_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300000,
  });

  const withdrawMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from(TABLES.FACILITY_BOOKINGS as any)
        .update({ status: "cancelled" } as never)
        .eq(COLS.ID, bookingId)
        .eq("booked_by", memberId)
        .eq("status", "open");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking request withdrawn");
      qc.invalidateQueries({ queryKey: ["member-my-bookings", memberId] });
      setWithdrawId(null);
    },
    onError: () => toast.error("Failed to withdraw booking"),
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
    <>
      <div className="space-y-3">
        {bookings.map((b: any) => {
          const canWithdraw = WITHDRAWABLE_STATUSES.includes(b.status);
          return (
            <div
              key={b.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {b.facility_name ?? "Facility"}
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
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={b.status ?? "pending"} />
                  {canWithdraw && (
                    <button
                      onClick={() => setWithdrawId(b.id)}
                      className="text-[11px] font-medium text-red-500 hover:text-red-700 transition-colors underline underline-offset-2"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Withdraw confirmation dialog */}
      <AlertDialog open={!!withdrawId} onOpenChange={open => !open && setWithdrawId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertTitle>Withdraw booking request?</AlertTitle>
            <AlertDialogDescription>
              This will cancel your pending booking request. You can submit a new request at any time.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => withdrawId && withdrawMutation.mutate(withdrawId)}
              disabled={withdrawMutation.isPending}
            >
              {withdrawMutation.isPending ? "Withdrawing..." : "Yes, Withdraw"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
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
        .select("id, name, description, capacity, quotation, is_active, type, thumbnail_path, video_path, facility_images(image_path, sort_order)")
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

  const [detailFacility, setDetailFacility] = useState<Facility | null>(null);

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
                  onViewDetails={() => setDetailFacility(facility)}
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
        memberName={`${member.firstName} ${member.lastName}`.trim()}
      />

      {/* Facility detail sheet */}
      <FacilityDetailSheet
        facility={detailFacility}
        open={!!detailFacility}
        onClose={() => setDetailFacility(null)}
        onBookNow={() => { if (detailFacility) handleBookNow(detailFacility); }}
      />
    </>
  );
}
