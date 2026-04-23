import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Building2, Users, CheckCircle2, AlertCircle } from "lucide-react";

// ─── Booking form schema ──────────────────────────────────────────────────────

const publicBookingSchema = z.object({
  external_name: z.string().min(1, "Name is required"),
  external_email: z.string().email("Valid email required").optional().or(z.literal("")),
  external_phone: z.string().optional(),
  external_org: z.string().optional(),
  purpose: z.string().min(1, "Purpose is required"),
  booking_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  expected_attendees: z.coerce.number().optional(),
  notes: z.string().optional(),
});
type PublicBookingForm = z.infer<typeof publicBookingSchema>;

// ─── Facility Card (public read-only) ────────────────────────────────────────

const GRADIENTS = [
  "from-indigo-400 to-indigo-600",
  "from-violet-400 to-purple-600",
  "from-emerald-400 to-green-600",
  "from-amber-400 to-orange-500",
];

function PublicFacilityCard({
  facility, selected, onSelect,
}: {
  facility: any; selected: boolean; onSelect: () => void;
}) {
  const gradient = GRADIENTS[facility.name.charCodeAt(0) % GRADIENTS.length];
  const images = facility.facility_images ?? [];
  const sorted = [...images].sort((a: any, b: any) => a.sort_order - b.sort_order);
  const firstImagePath = sorted[0]?.image_path;
  const firstImageUrl = firstImagePath
    ? supabase.storage.from("facility-images").getPublicUrl(firstImagePath).data.publicUrl
    : null;

  return (
    <div
      className={`bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
        selected ? "border-indigo-500 shadow-md" : "border-slate-200 hover:border-indigo-300 hover:shadow-sm"
      }`}
      onClick={onSelect}
    >
      <div className={`h-28 ${!firstImageUrl ? `bg-gradient-to-br ${gradient}` : ""}`}>
        {firstImageUrl ? (
          <img src={firstImageUrl} alt={facility.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Building2 className="h-8 w-8 text-white/60" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-slate-900 text-sm">{facility.name}</h3>
        {facility.capacity && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
            <Users className="h-3 w-3" /><span>{facility.capacity} people</span>
          </div>
        )}
        {facility.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mt-1">{facility.description}</p>
        )}
        {facility.quotation > 0 && (
          <p className="text-xs font-semibold text-slate-700 mt-1">From {facility.quotation}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PublicBookingPage() {
  const { tenantId, facilityId } = useParams<{ tenantId: string; facilityId?: string }>();
  const navigate = useNavigate();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(facilityId ?? null);
  const [confirmation, setConfirmation] = useState<{ bookingNumber: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch tenant branding
  const { data: tenant, isLoading: tenantLoading, error: tenantError } = useQuery({
    queryKey: ["public-tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TENANTS)
        .select("name, logo, contact_email")
        .eq(COLS.ID, tenantId!)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 300000,
    enabled: !!tenantId,
  });

  // Fetch facilities
  const { data: facilities = [], isLoading: facLoading } = useQuery({
    queryKey: ["public-facilities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FACILITIES as any)
        .select("*, facility_images(id, image_path, sort_order)")
        .eq(COLS.TENANT_ID, tenantId!)
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 300000,
    enabled: !!tenantId,
  });

  // If facilityId param given but not found, redirect to tenant page
  const specificFacility = facilityId ? facilities.find(f => f.id === facilityId) : null;
  if (facilityId && !facLoading && facilities.length > 0 && !specificFacility) {
    navigate(`/book/${tenantId}`, { replace: true });
  }

  const form = useForm<PublicBookingForm>({
    resolver: zodResolver(publicBookingSchema),
    defaultValues: {
      external_name: "", external_email: "", external_phone: "",
      external_org: "", purpose: "", booking_date: "",
      start_time: "09:00", end_time: "12:00",
      expected_attendees: undefined, notes: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (values: PublicBookingForm) => {
      const facility = facilities.find(f => f.id === selectedFacilityId);
      const { data, error } = await supabase
        .from(TABLES.FACILITY_BOOKINGS)
        .insert({
          tenant_id: tenantId,
          facility_id: selectedFacilityId || null,
          facility_name: facility?.name ?? "",
          purpose: values.purpose,
          booking_date: values.booking_date,
          start_time: values.start_time,
          end_time: values.end_time,
          expected_attendees: values.expected_attendees || null,
          notes: values.notes || null,
          status: "open",
          source: "external",
          external_name: values.external_name,
          external_email: values.external_email || null,
          external_phone: values.external_phone || null,
          external_org: values.external_org || null,
        } as any)
        .select("booking_number")
        .single();
      if (error) throw error;
      return (data as any).booking_number as string;
    },
    onSuccess: (bookingNumber) => {
      setConfirmation({ bookingNumber });
      setSubmitError(null);
    },
    onError: (err: unknown) => {
      setSubmitError((err as Error)?.message ?? "Failed to submit booking. Please try again.");
    },
  });

  // ── Render states ─────────────────────────────────────────────────────────────

  if (tenantLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (tenantError || !tenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto" />
          <h1 className="text-xl font-bold text-slate-700">Church not found</h1>
          <p className="text-sm text-slate-500">The church you're looking for doesn't exist or the link may be incorrect.</p>
          <Link to="/" className="text-sm text-indigo-600 hover:underline">Go to Vestry homepage</Link>
        </div>
      </div>
    );
  }

  // ── Confirmation screen ───────────────────────────────────────────────────────

  if (confirmation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Helmet><title>Booking Confirmed — {tenant.name}</title></Helmet>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Booking Received!</h1>
          <p className="text-slate-600">Your booking request has been submitted to {tenant.name}. They will be in touch to confirm.</p>
          {confirmation.bookingNumber && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide mb-1">Booking Reference</p>
              <p className="text-2xl font-mono font-bold text-indigo-700">{confirmation.bookingNumber}</p>
            </div>
          )}
          <p className="text-xs text-slate-400">Please save your booking reference number for future correspondence.</p>
        </div>
      </div>
    );
  }

  const displayFacilities = facilityId && specificFacility ? [specificFacility] : facilities;

  return (
    <>
      <Helmet><title>Book a Facility — {tenant.name}</title></Helmet>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-5">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            {tenant.logo && (
              <img src={tenant.logo} alt={tenant.name} className="h-10 w-10 rounded-lg object-cover" />
            )}
            <div>
              <h1 className="text-lg font-bold text-slate-900">{tenant.name}</h1>
              <p className="text-xs text-slate-500">Facility Booking</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Facility selection */}
          {facLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>
          ) : displayFacilities.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No facilities available</p>
            </div>
          ) : (
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-3">
                {facilityId ? "Selected Facility" : "Select a Facility"}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {displayFacilities.map(f => (
                  <PublicFacilityCard
                    key={f.id}
                    facility={f}
                    selected={selectedFacilityId === f.id}
                    onSelect={() => setSelectedFacilityId(f.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Booking form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Your Details</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(v => submitMutation.mutate(v))} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="external_name" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Full Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="external_email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="external_phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input placeholder="+1234567890" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="external_org" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Organisation (optional)</FormLabel>
                      <FormControl><Input placeholder="Organisation name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <h2 className="text-base font-semibold text-slate-800 pt-2">Booking Details</h2>

                <FormField control={form.control} name="purpose" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="e.g., Wedding reception" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-3 gap-3">
                  <FormField control={form.control} name="booking_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date <span className="text-red-500">*</span></FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="start_time" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start <span className="text-red-500">*</span></FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="end_time" render={({ field }) => (
                    <FormItem>
                      <FormLabel>End <span className="text-red-500">*</span></FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="expected_attendees" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Attendees</FormLabel>
                    <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl><Textarea placeholder="Any special requirements or notes..." rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {submitError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {submitError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={submitMutation.isPending || !selectedFacilityId}
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Booking Request"}
                </Button>
                {!selectedFacilityId && (
                  <p className="text-xs text-center text-slate-500">Please select a facility above to continue.</p>
                )}
              </form>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
}
