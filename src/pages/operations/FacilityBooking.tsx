import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { formatCurrencyFull } from "@/lib/format";
import { convertToWebP } from "@/lib/imageUtils";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PremiumGallery } from "@/components/ui/PremiumGallery";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus, Building2, Calendar, Users, MoreVertical, Pencil, Trash2,
  Share2, Eye, MessageSquare, Search, X, ChevronRight, Video, ChevronLeft, ImageIcon, Download,
} from "lucide-react";

// ─── Pure helper functions ────────────────────────────────────────────────────

export function getSourceBadgeProps(source: string): { label: string; className: string } {
  switch (source) {
    case "member":   return { label: "Member Portal", className: "bg-emerald-100 text-emerald-700" };
    case "external": return { label: "External",      className: "bg-amber-100 text-amber-700" };
    default:         return { label: "In-App",        className: "bg-indigo-100 text-indigo-700" };
  }
}

export function generateBookingNumber(seq: number): string {
  return `BK-${String(seq).padStart(4, "0")}`;
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function bookingsToRows(bookings: any[]) {
  return bookings.map(b => ({
    "Booking #": b.booking_number || b.id?.slice(0, 8) || "—",
    "Facility": b.facility_name || "—",
    "Booked By": b.booker_name || b.booked_by || "—",
    "Purpose": b.purpose || "—",
    "Date": b.booking_date || "—",
    "Start Time": b.start_time?.slice(0, 5) || "—",
    "End Time": b.end_time?.slice(0, 5) || "—",
    "Attendees": b.expected_attendees ?? "—",
    "Status": b.status || "—",
    "Source": b.source || "admin",
    "Notes": b.notes || "",
  }));
}

function exportBookingsCSV(bookings: any[]) {
  const csv = Papa.unparse(bookingsToRows(bookings));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `facility-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function exportBookingsXLSX(bookings: any[]) {
  const ws = XLSX.utils.json_to_sheet(bookingsToRows(bookings));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bookings");
  XLSX.writeFile(wb, `facility-bookings-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportBookingsPDF(bookings: any[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Facility Bookings", 14, 15);
  doc.setFontSize(9);
  const rows = bookingsToRows(bookings);
  const headers = Object.keys(rows[0] ?? {});
  let y = 25;
  // Header row
  doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => doc.text(h, 14 + i * 28, y));
  y += 6;
  doc.setFont("helvetica", "normal");
  rows.forEach(row => {
    if (y > 190) { doc.addPage(); y = 15; }
    headers.forEach((h, i) => doc.text(String(row[h as keyof typeof row]).slice(0, 14), 14 + i * 28, y));
    y += 6;
  });
  doc.save(`facility-bookings-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const facilitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().optional(),
  capacity: z.coerce.number().optional(),
  description: z.string().optional(),
  quotation: z.coerce.number().optional(),
  is_active: z.boolean().default(true),
});
type FacilityFormValues = z.infer<typeof facilitySchema>;

const bookingSchema = z.object({
  facility_id: z.string().min(1, "Facility is required"),
  purpose: z.string().min(1, "Purpose is required"),
  booking_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  expected_attendees: z.coerce.number().optional(),
  setup_required: z.boolean().default(false),
  notes: z.string().optional(),
  contact_type: z.enum(["member", "external_individual", "external_org"]),
  member_id: z.string().optional(),
  external_name: z.string().optional(),
  external_email: z.string().email().optional().or(z.literal("")),
  external_phone: z.string().optional(),
  external_org: z.string().optional(),
  external_contact_person: z.string().optional(),
});
type BookingFormValues = z.infer<typeof bookingSchema>;

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | undefined; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        {value === undefined ? <Skeleton className="h-7 w-12" /> : value}
      </div>
    </div>
  );
}

// ─── Source Badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const { label, className } = getSourceBadgeProps(source);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// ─── Booking Status Badge ─────────────────────────────────────────────────────
// Maps DB enum values to human-readable facility booking statuses

function BookingStatusBadge({ status, rejectionReason }: { status: string; rejectionReason?: string | null }) {
  if (status === "cancelled" && rejectionReason === "booker_withdrew") {
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">Withdrawn</span>;
  }
  switch (status) {
    case "open":
      return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">Pending</span>;
    case "in_progress":
    case "completed":
      return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">Approved</span>;
    case "cancelled":
      return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-600">Rejected</span>;
    default:
      return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">{status}</span>;
  }
}

// ─── FacilityCard ─────────────────────────────────────────────────────────────

const TYPE_GRADIENTS: Record<string, string> = {
  outdoor:    "from-orange-400 to-orange-500",
  indoor:     "from-indigo-500 to-indigo-600",
  hall:       "from-violet-500 to-purple-600",
  chapel:     "from-pink-400 to-rose-500",
  conference: "from-blue-400 to-blue-600",
  classroom:  "from-emerald-400 to-green-500",
  parking:    "from-slate-400 to-slate-600",
  kitchen:    "from-amber-400 to-yellow-500",
};

function getTypeGradient(type: string | null): string {
  if (!type) return "from-blue-400 to-blue-600";
  const key = type.toLowerCase().split(" ")[0];
  return TYPE_GRADIENTS[key] ?? "from-blue-400 to-blue-600";
}

function FacilityCard({
  facility, firstImage, typeName, onView, onEdit, onDelete, onBookNow, onShare,
  currency,
}: {
  facility: any; firstImage: string | null; typeName: string; onView: () => void;
  onEdit: () => void; onDelete: () => void; onBookNow: () => void; onShare: () => void;
  currency: string;
}) {
  const gradient = getTypeGradient(facility.type);
  const imageCount = (facility.facility_images ?? []).length;

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.10)" }}
      transition={{ duration: 0.2 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden cursor-pointer"
      onClick={onView}
    >
      {/* Thumbnail — 180px */}
      <div className={`h-[180px] relative overflow-hidden ${!firstImage ? `bg-gradient-to-br ${gradient}` : ""}`}>
        {firstImage ? (
          <img
            src={firstImage}
            alt={facility.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }}
            />
            <div className="flex items-center justify-center h-full">
              <Building2 className="h-12 w-12 text-white/70" />
            </div>
          </>
        )}

        {/* Type badge — top left glass */}
        {typeName && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-white/20 backdrop-blur-sm text-white border border-white/20">
              {typeName}
            </span>
          </div>
        )}

        {/* Status badge — top right glass */}
        <div className="absolute top-2 right-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm border ${
            facility.is_active
              ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/30"
              : "bg-slate-500/20 text-slate-200 border-slate-400/30"
          }`}>
            {facility.is_active ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Photo count — bottom right */}
        {imageCount > 0 && (
          <div className="absolute bottom-2 right-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-black/50 backdrop-blur-sm text-white">
              🖼 {imageCount} photo{imageCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4
            className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm cursor-pointer hover:text-indigo-600 transition-colors"
            onClick={onView}
          >
            {facility.name}
          </h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-1">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {facility.capacity && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
            <Users className="h-3.5 w-3.5" />
            <span>{facility.capacity.toLocaleString()} people</span>
          </div>
        )}
        {facility.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">{facility.description}</p>
        )}
        {facility.quotation > 0 && (
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
            {formatCurrencyFull(facility.quotation, currency)}
          </p>
        )}

        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg"
            onClick={onBookNow}
          >
            Book Now
          </Button>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-lg" onClick={onShare} title="Share booking link">
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── FacilityDetailModal ──────────────────────────────────────────────────────

function FacilityDetailModal({
  facility, images, upcomingBookings, open, onClose, typeName, currency,
}: {
  facility: any | null; images: any[]; upcomingBookings: any[]; open: boolean;
  onClose: () => void; typeName: string; currency: string;
}) {
  const [activeImg, setActiveImg] = useState(0);
  if (!facility) return null;

  const sortedImages = [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const thumbUrl = facility.thumbnail_path
    ? supabase.storage.from("facility-thumbnails").getPublicUrl(facility.thumbnail_path).data.publicUrl
    : null;
  const videoUrl = facility.video_path
    ? supabase.storage.from("facility-videos").getPublicUrl(facility.video_path).data.publicUrl
    : null;
  const galleryUrls = sortedImages.map((img: any) =>
    supabase.storage.from("facility-images").getPublicUrl(img.image_path).data.publicUrl
  );
  const gradient = getTypeGradient(facility.type);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* ── Hero ── */}
        <div className={`relative h-[260px] md:h-[300px] overflow-hidden ${!thumbUrl ? `bg-gradient-to-br ${gradient}` : ""}`}>
          {thumbUrl ? (
            <img src={thumbUrl} alt={facility.name} className="w-full h-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }}
              />
              <div className="flex items-center justify-center h-full">
                <Building2 className="h-20 w-20 text-white/50" />
              </div>
            </>
          )}
          {/* Gradient overlay for text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {/* Name + badges on hero */}
          <div className="absolute bottom-4 left-5 right-14">
            <h2 className="text-white font-bold text-2xl leading-tight mb-2">{facility.name}</h2>
            <div className="flex flex-wrap gap-2">
              {typeName && (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-white/20 backdrop-blur-sm text-white border border-white/20">
                  {typeName}
                </span>
              )}
              {facility.capacity && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-white/20 backdrop-blur-sm text-white border border-white/20">
                  <Users className="h-3 w-3" />{facility.capacity.toLocaleString()} people
                </span>
              )}
            </div>
          </div>
          {/* Close button handled by DialogContent */}
        </div>

        {/* ── Two-column body ── */}
        <div className="flex flex-col md:flex-row gap-0">
          {/* Left: info */}
          <div className="flex-[55] p-6 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-700 space-y-5">
            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4">
              {typeName && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Type</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{typeName}</p>
                </div>
              )}
              {facility.capacity && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Capacity</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{facility.capacity.toLocaleString()} people</p>
                </div>
              )}
              {facility.quotation > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Price</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatCurrencyFull(facility.quotation, currency)}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  facility.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                }`}>{facility.is_active ? "Active" : "Inactive"}</span>
              </div>
            </div>

            {facility.description && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">About this space</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{facility.description}</p>
              </div>
            )}

            {/* Upcoming bookings */}
            {upcomingBookings.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Upcoming Bookings</p>
                <div className="space-y-2">
                  {upcomingBookings.slice(0, 4).map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                      <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{b.purpose || "Booking"}</span>
                      <span className="text-slate-400 shrink-0 ml-2">{b.booking_date} · {b.start_time?.slice(0, 5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: gallery */}
          <div className="flex-[45] p-6 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Gallery</p>
              <PremiumGallery
                images={galleryUrls}
                videos={videoUrl ? [videoUrl] : []}
                facilityName={facility.name}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── AddEditFacilityModal ─────────────────────────────────────────────────────

function AddEditFacilityModal({
  open, onClose, tenantId, editData, facilityTypes,
}: {
  open: boolean; onClose: () => void; tenantId: string;
  editData?: any | null; facilityTypes: any[];
}) {
  const qc = useQueryClient();
  const isEdit = !!editData;

  // thumbnail
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [existingThumbPath, setExistingThumbPath] = useState<string | null>(null);

  // gallery images
  const [images, setImages] = useState<{ path: string; name: string; existing?: boolean }[]>([]);

  // video
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [existingVideoPath, setExistingVideoPath] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);

  const form = useForm<FacilityFormValues>({
    resolver: zodResolver(facilitySchema),
    defaultValues: { name: "", type: "", capacity: undefined, description: "", quotation: undefined, is_active: true },
  });

  useEffect(() => {
    if (open && editData) {
      form.reset({
        name: editData.name ?? "",
        type: editData.type ?? "",
        capacity: editData.capacity ?? undefined,
        description: editData.description ?? "",
        quotation: editData.quotation ?? undefined,
        is_active: editData.is_active ?? true,
      });
      setExistingThumbPath(editData.thumbnail_path ?? null);
      setThumbFile(null); setThumbPreview(null);
      const existingImgs = [...(editData.facility_images ?? [])]
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((img: any) => ({ path: img.image_path, name: img.image_path?.split("/").pop() ?? "image", existing: true }));
      setImages(existingImgs);
      setVideoFile(null);
      setExistingVideoPath(editData.video_path ?? null);
    } else if (open) {
      form.reset({ name: "", type: "", capacity: undefined, description: "", quotation: undefined, is_active: true });
      setExistingThumbPath(null); setThumbFile(null); setThumbPreview(null);
      setImages([]); setVideoFile(null); setExistingVideoPath(null);
    }
  }, [open, editData]);

  const saveMutation = useMutation({
    mutationFn: async (values: FacilityFormValues) => {
      setUploading(true);
      try {
        // 1. Upload thumbnail as WebP
        let thumbnailPath = existingThumbPath;
        if (thumbFile) {
          const webpBlob = await convertToWebP(thumbFile, 600, 0.8);
          const tPath = `${tenantId}/${Date.now()}-thumb.webp`;
          const { error: tErr } = await supabase.storage.from("facility-thumbnails").upload(tPath, webpBlob, { contentType: "image/webp" });
          if (tErr) throw new Error("Failed to upload thumbnail");
          thumbnailPath = tPath;
        }

        // 2. Upload video
        let videoPath = existingVideoPath;
        if (videoFile) {
          const vPath = `${tenantId}/${Date.now()}-${videoFile.name}`;
          const { error: vErr } = await supabase.storage.from("facility-videos").upload(vPath, videoFile);
          if (vErr) throw new Error("Failed to upload video");
          videoPath = vPath;
        }

        // 3. Save facility record
        const payload: any = {
          tenant_id: tenantId,
          name: values.name.trim(),
          type: values.type || null,
          capacity: values.capacity || null,
          description: values.description?.trim() || null,
          quotation: values.quotation || null,
          is_active: values.is_active,
          thumbnail_path: thumbnailPath,
          video_path: videoPath,
        };

        let facilityId: string;
        if (isEdit) {
          const { error } = await supabase.from(TABLES.FACILITIES as any).update(payload).eq(COLS.ID, editData.id);
          if (error) throw error;
          facilityId = editData.id;
        } else {
          const { data, error } = await supabase.from(TABLES.FACILITIES as any).insert(payload).select("id").single();
          if (error) throw error;
          facilityId = (data as any).id;
        }

        // 3. Sync gallery images
        const existingPaths = new Set((editData?.facility_images ?? []).map((i: any) => i.image_path));
        const keptPaths = new Set(images.filter(i => i.existing).map(i => i.path));
        const removedPaths = [...existingPaths].filter(p => !keptPaths.has(p as string));
        const newImages = images.filter(i => !i.existing);

        if (removedPaths.length > 0) {
          await supabase.from(TABLES.FACILITY_IMAGES as any)
            .delete()
            .eq("facility_id", facilityId)
            .in("image_path", removedPaths);
        }
        if (newImages.length > 0) {
          const rows = newImages.map((img, idx) => ({
            facility_id: facilityId,
            tenant_id: tenantId,
            image_path: img.path,
            sort_order: keptPaths.size + idx,
          }));
          const { error: imgErr } = await supabase.from(TABLES.FACILITY_IMAGES as any).insert(rows);
          if (imgErr) throw imgErr;
        }

        return facilityId;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilities", tenantId] });
      toast.success(isEdit ? "Facility updated." : "Facility created.");
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save facility."),
  });

  const handleThumbSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Thumbnail exceeds 5 MB."); return; }
    setThumbFile(file);
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    setThumbPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (images.length + files.length > 5) { toast.error("Maximum 5 gallery images."); return; }
    setUploading(true);
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} exceeds 5 MB.`); continue; }
      try {
        const webpBlob = await convertToWebP(file);
        const path = `${tenantId}/${Date.now()}-${file.name.replace(/\.[^.]+$/, "")}.webp`;
        const { error } = await supabase.storage.from("facility-images").upload(path, webpBlob, { contentType: "image/webp" });
        if (error) { toast.error(`Failed to upload ${file.name}`); continue; }
        setImages(prev => [...prev, { path, name: path.split("/").pop()! }]);
      } catch { toast.error(`Failed to convert ${file.name}`); }
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("Video exceeds 50 MB limit."); return; }
    setVideoFile(file);
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Facility" : "Add Facility"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(v => saveMutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                <FormControl><Input placeholder="e.g., Main Hall" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {facilityTypes.map((t: any) => (
                      <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="capacity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 200" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="quotation" render={({ field }) => (
                <FormItem>
                  <FormLabel>Price / Quotation</FormLabel>
                  <FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Describe this facility..." rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* ── Thumbnail ── */}
            <div>
              <p className="text-sm font-medium mb-2">Thumbnail <span className="text-xs text-slate-400 font-normal">(card cover · WebP)</span></p>
              {(thumbPreview || existingThumbPath) ? (
                <div className="relative h-32 w-full rounded-xl overflow-hidden border border-slate-200 mb-2">
                  <img
                    src={thumbPreview ?? supabase.storage.from("facility-thumbnails").getPublicUrl(existingThumbPath!).data.publicUrl}
                    alt="thumbnail" className="w-full h-full object-cover"
                  />
                  <button type="button"
                    className="absolute top-1.5 right-1.5 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
                    onClick={() => { setThumbFile(null); if (thumbPreview) URL.revokeObjectURL(thumbPreview); setThumbPreview(null); setExistingThumbPath(null); }}
                  ><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-24 w-full rounded-xl border-2 border-dashed border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors mb-2">
                  <ImageIcon className="h-6 w-6 text-slate-300 mb-1" />
                  <span className="text-xs text-slate-400">Click to upload thumbnail</span>
                  <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleThumbSelect} />
                </label>
              )}
            </div>

            {/* ── Gallery Images ── */}
            <div>
              <p className="text-sm font-medium mb-2">Gallery Images <span className="text-xs text-slate-400 font-normal">(max 5 · WebP)</span></p>
              <div className="flex flex-wrap gap-2 mb-2">
                {images.map((img, i) => (
                  <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-slate-200">
                    <img src={supabase.storage.from("facility-images").getPublicUrl(img.path).data.publicUrl} alt="" className="w-full h-full object-cover" />
                    <button type="button"
                      className="absolute top-0.5 right-0.5 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center"
                      onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                    ><X className="h-2.5 w-2.5" /></button>
                  </div>
                ))}
              </div>
              <label className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-dashed border-slate-300 cursor-pointer hover:bg-slate-50 transition-colors ${images.length >= 5 || uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <Plus className="h-4 w-4" />
                {uploading ? "Uploading..." : "Add Gallery Images"}
                <input type="file" accept="image/png,image/jpeg,image/jpg" multiple className="hidden" onChange={handleImageUpload} disabled={images.length >= 5 || uploading} />
              </label>
              {images.length >= 5 && <p className="text-xs text-slate-500 mt-1">Maximum 5 gallery images</p>}
            </div>

            {/* ── Video ── */}
            <div>
              <p className="text-sm font-medium mb-2">Video <span className="text-xs text-slate-400 font-normal">(max 50 MB)</span></p>
              {(existingVideoPath && !videoFile) && (
                <div className="flex items-center gap-2 mb-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                  <Video className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span className="truncate">{existingVideoPath.split("/").pop()}</span>
                  <button type="button" onClick={() => setExistingVideoPath(null)} className="ml-auto text-red-500"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}
              {videoFile && (
                <div className="flex items-center gap-2 mb-2 text-sm text-slate-600 bg-indigo-50 rounded-lg px-3 py-2">
                  <Video className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span className="truncate">{videoFile.name}</span>
                  <button type="button" onClick={() => setVideoFile(null)} className="ml-auto text-red-500"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}
              {!videoFile && (
                <label className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-dashed border-slate-300 cursor-pointer hover:bg-slate-50 transition-colors">
                  <Plus className="h-4 w-4" />
                  {existingVideoPath ? "Replace Video" : "Add Video"}
                  <input type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
                </label>
              )}
            </div>

            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Active</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-indigo-600" /></FormControl>
                </div>
              </FormItem>
            )} />

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={saveMutation.isPending || uploading}>
                {saveMutation.isPending || uploading ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── BookingDetailDrawer ──────────────────────────────────────────────────────

function BookingDetailDrawer({
  booking, open, onClose, tenantId, userId, onCreateFromResponse,
}: {
  booking: any | null; open: boolean; onClose: () => void;
  tenantId: string; userId: string; onCreateFromResponse?: () => void;
}) {
  const qc = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const updates: any = { status };
      if (status === "in_progress") { updates.approved_at = new Date().toISOString(); updates.approved_by = userId; }
      if (status === "cancelled") { updates.approved_at = null; }
      const { error } = await supabase.from(TABLES.FACILITY_BOOKINGS).update(updates).eq(COLS.ID, booking.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facility-bookings", tenantId] });
      toast.success("Booking status updated.");
    },
    onError: () => toast.error("Failed to update status."),
  });

  if (!booking) return null;
  const { label: sourceLabel, className: sourceCls } = getSourceBadgeProps(booking.source ?? "admin");

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Booking Details</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {/* Header info */}
          <div className="flex items-center gap-3">
            {booking.booking_number && (
              <span className="text-sm font-mono font-semibold text-indigo-600">{booking.booking_number}</span>
            )}
            <BookingStatusBadge status={booking.status} rejectionReason={booking.rejection_reason} />
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sourceCls}`}>{sourceLabel}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-slate-500 mb-0.5">Facility</p><p className="font-medium">{booking.facility_name || "—"}</p></div>
            <div><p className="text-xs text-slate-500 mb-0.5">Date</p><p className="font-medium">{booking.booking_date}</p></div>
            <div><p className="text-xs text-slate-500 mb-0.5">Time</p><p className="font-medium">{booking.start_time?.slice(0,5)} – {booking.end_time?.slice(0,5)}</p></div>
            <div><p className="text-xs text-slate-500 mb-0.5">Attendees</p><p className="font-medium">{booking.expected_attendees ?? "—"}</p></div>
            <div className="col-span-2"><p className="text-xs text-slate-500 mb-0.5">Purpose</p><p className="font-medium">{booking.purpose || "—"}</p></div>
          </div>

          {/* Contact info */}
          {(booking.external_name || booking.booker_name) && (
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-sm space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contact</p>
              {(booking.external_name || booking.booker_name) && <p><span className="text-slate-500">Name: </span>{booking.external_name || booking.booker_name}</p>}
              {(booking.external_email || booking.booker_email) && <p><span className="text-slate-500">Email: </span>{booking.external_email || booking.booker_email}</p>}
              {(booking.external_phone || booking.booker_phone) && <p><span className="text-slate-500">Phone: </span>{booking.external_phone || booking.booker_phone}</p>}
              {(booking.external_org || booking.booker_org_name) && <p><span className="text-slate-500">Org: </span>{booking.external_org || booking.booker_org_name}</p>}
            </div>
          )}

          {booking.notes && (
            <div><p className="text-xs text-slate-500 mb-1">Notes</p><p className="text-sm text-slate-700 dark:text-slate-300">{booking.notes}</p></div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {booking.rejection_reason === "booker_withdrew" ? (
              <div className="w-full rounded-lg bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                Booker withdrew this request — no further action available.
              </div>
            ) : (
              <>
                {booking.status !== "in_progress" && booking.status !== "cancelled" && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateStatus.mutate({ status: "in_progress" })}>
                    Approve
                  </Button>
                )}
                {booking.status !== "cancelled" && (
                  <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => updateStatus.mutate({ status: "cancelled" })}>
                    Reject
                  </Button>
                )}
                {booking.status !== "cancelled" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ status: "cancelled" })}>
                    Cancel
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── NewBookingDrawer ─────────────────────────────────────────────────────────

function NewBookingDrawer({
  open, onClose, tenantId, userId, facilities, preselectedFacilityId, editData,
}: {
  open: boolean; onClose: () => void; tenantId: string; userId: string;
  facilities: any[]; preselectedFacilityId?: string | null; editData?: any | null;
}) {
  const qc = useQueryClient();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      facility_id: preselectedFacilityId ?? "",
      purpose: "", booking_date: format(new Date(), "yyyy-MM-dd"),
      start_time: "09:00", end_time: "12:00",
      expected_attendees: undefined, setup_required: false, notes: "",
      contact_type: "external_individual",
      member_id: "", external_name: "", external_email: "",
      external_phone: "", external_org: "", external_contact_person: "",
    },
  });

  // Sync when drawer opens
  useState(() => {
    if (open) {
      if (editData) {
        form.reset({
          facility_id: editData.facility_id ?? editData.facility_name ?? "",
          purpose: editData.purpose ?? "",
          booking_date: editData.booking_date ?? format(new Date(), "yyyy-MM-dd"),
          start_time: editData.start_time?.slice(0, 5) ?? "09:00",
          end_time: editData.end_time?.slice(0, 5) ?? "12:00",
          expected_attendees: editData.expected_attendees ?? undefined,
          setup_required: editData.setup_required ?? false,
          notes: editData.notes ?? "",
          contact_type: editData.source === "member" ? "member" : "external_individual",
          external_name: editData.external_name ?? editData.booker_name ?? "",
          external_email: editData.external_email ?? editData.booker_email ?? "",
          external_phone: editData.external_phone ?? editData.booker_phone ?? "",
          external_org: editData.external_org ?? editData.booker_org_name ?? "",
          external_contact_person: editData.booker_contact_person ?? "",
        });
      } else {
        form.reset({
          facility_id: preselectedFacilityId ?? "",
          purpose: "", booking_date: format(new Date(), "yyyy-MM-dd"),
          start_time: "09:00", end_time: "12:00",
          expected_attendees: undefined, setup_required: false, notes: "",
          contact_type: "external_individual",
          member_id: "", external_name: "", external_email: "",
          external_phone: "", external_org: "", external_contact_person: "",
        });
      }
    }
  });

  const contactType = form.watch("contact_type");

  const buildPayload = (values: BookingFormValues) => {
    const facility = facilities.find(f => f.id === values.facility_id);
    return {
      tenant_id: tenantId,
      facility_id: values.facility_id || null,
      facility_name: facility?.name ?? values.facility_id,
      purpose: values.purpose,
      booking_date: values.booking_date,
      start_time: values.start_time,
      end_time: values.end_time,
      booked_by: userId,
      expected_attendees: values.expected_attendees || null,
      setup_required: values.setup_required,
      notes: values.notes || null,
      status: "open" as const,
      booker_name: values.external_name || null,
      booker_email: values.external_email || null,
      booker_phone: values.external_phone || null,
      booker_org_name: values.external_org || null,
      booker_type: values.contact_type,
    };
  };

  const saveBooking = async (values: BookingFormValues): Promise<string | null> => {
    try {
      if (editData) {
        const { error } = await supabase.from(TABLES.FACILITY_BOOKINGS).update(buildPayload(values) as any).eq(COLS.ID, editData.id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["facility-bookings", tenantId] });
        return editData.id;
      } else {
        const { data, error } = await supabase.from(TABLES.FACILITY_BOOKINGS).insert(buildPayload(values) as any).select(COLS.ID).single();
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["facility-bookings", tenantId] });
        return (data as any).id;
      }
    } catch {
      toast.error("Failed to save booking.");
      return null;
    }
  };

  const handleSave = async (values: BookingFormValues) => {
    const id = await saveBooking(values);
    if (id) { toast.success("Booking saved."); onClose(); }
  };

  const handleEmailConfirm = async (values: BookingFormValues) => {
    const email = values.external_email;
    if (!email) { form.setError("external_email", { message: "Email required for email confirmation" }); return; }
    const id = await saveBooking(values);
    if (!id) return;
    const { error } = await supabase.functions.invoke("send-booking-confirmation", {
      body: { channel: "email", to: email, booking_id: id, tenant_id: tenantId,
        subject: `Booking Confirmation`, body: `Your booking for ${values.purpose} on ${values.booking_date} has been received.` },
    });
    if (error) toast.error("Booking saved, but failed to send confirmation.");
    else toast.success("Email confirmation sent.");
    onClose();
  };

  const handleSmsConfirm = async (values: BookingFormValues) => {
    const phone = values.external_phone;
    if (!phone) { form.setError("external_phone", { message: "Phone required for SMS confirmation" }); return; }
    const id = await saveBooking(values);
    if (!id) return;
    const { error } = await supabase.functions.invoke("send-booking-confirmation", {
      body: { channel: "sms", to: phone, booking_id: id, tenant_id: tenantId,
        body: `Your booking for ${values.purpose} on ${values.booking_date} has been received.` },
    });
    if (error) toast.error("Booking saved, but failed to send confirmation.");
    else toast.success("SMS confirmation sent.");
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editData ? "Edit Booking" : "New Booking"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form className="mt-4 space-y-4">
            <FormField control={form.control} name="facility_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Facility <span className="text-red-500">*</span></FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {facilities.filter(f => f.is_active).map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="purpose" render={({ field }) => (
              <FormItem>
                <FormLabel>Purpose <span className="text-red-500">*</span></FormLabel>
                <FormControl><Input placeholder="e.g., Wedding Reception" {...field} /></FormControl>
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

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="expected_attendees" render={({ field }) => (
                <FormItem>
                  <FormLabel>Attendees</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="setup_required" render={({ field }) => (
                <FormItem>
                  <FormLabel>Setup Required</FormLabel>
                  <div className="flex items-center h-10">
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-indigo-600" /></FormControl>
                  </div>
                </FormItem>
              )} />
            </div>

            {/* Contact type */}
            <FormField control={form.control} name="contact_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Type <span className="text-red-500">*</span></FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="external_individual">External Individual</SelectItem>
                    <SelectItem value="external_org">External Organisation</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {contactType === "external_individual" && (
              <div className="space-y-3">
                <FormField control={form.control} name="external_name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Full name" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="external_email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="external_phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+1234567890" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>
            )}

            {contactType === "external_org" && (
              <div className="space-y-3">
                <FormField control={form.control} name="external_org" render={({ field }) => (
                  <FormItem><FormLabel>Organisation Name</FormLabel><FormControl><Input placeholder="Organisation" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="external_contact_person" render={({ field }) => (
                  <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input placeholder="Contact person name" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="external_email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="external_phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>
            )}

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Additional notes..." rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <Button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={form.handleSubmit(handleSave)}>
                Save Booking
              </Button>
              <Button type="button" variant="outline" onClick={form.handleSubmit(handleEmailConfirm)}>
                Save &amp; Email Confirmation
              </Button>
              <Button type="button" variant="outline" onClick={form.handleSubmit(handleSmsConfirm)}>
                Save &amp; SMS Confirmation
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// ─── ResponseDetailModal ──────────────────────────────────────────────────────

function ResponseDetailModal({
  response, open, onClose, onCreateBooking,
}: {
  response: any | null; open: boolean; onClose: () => void; onCreateBooking: (r: any) => void;
}) {
  if (!response) return null;
  const { label, className } = getSourceBadgeProps(response.source);
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Response Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>
            <span className="text-xs text-slate-500">{response.created_at ? format(new Date(response.created_at), "PPp") : ""}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-slate-500 mb-0.5">Name</p><p className="font-medium">{response.respondent_name}</p></div>
            {response.respondent_email && <div><p className="text-xs text-slate-500 mb-0.5">Email</p><p>{response.respondent_email}</p></div>}
            {response.respondent_phone && <div><p className="text-xs text-slate-500 mb-0.5">Phone</p><p>{response.respondent_phone}</p></div>}
            {response.respondent_org && <div><p className="text-xs text-slate-500 mb-0.5">Organisation</p><p>{response.respondent_org}</p></div>}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Message</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">{response.message}</p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { onCreateBooking(response); onClose(); }}>
              Create Booking from Response
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FacilityBookingPage() {
  const { tenantId, userId, currency } = useChurch();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "facilities";

  // Facility state
  const [facilitySearch, setFacilitySearch] = useState("");
  const [facilityTypeFilter, setFacilityTypeFilter] = useState("all");
  const [facilityStatusFilter, setFacilityStatusFilter] = useState("all");
  const [viewFacility, setViewFacility] = useState<any | null>(null);
  const [editFacility, setEditFacility] = useState<any | null>(null);
  const [addFacilityOpen, setAddFacilityOpen] = useState(false);
  const [deleteFacility, setDeleteFacility] = useState<any | null>(null);

  // Booking state
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingFacilityFilter, setBookingFacilityFilter] = useState("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [viewBooking, setViewBooking] = useState<any | null>(null);
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<any | null>(null);
  const [preselectedFacilityId, setPreselectedFacilityId] = useState<string | null>(null);
  const [deleteBooking, setDeleteBooking] = useState<string | null>(null);

  // Response state
  const [responseFilter, setResponseFilter] = useState("all");
  const [viewResponse, setViewResponse] = useState<any | null>(null);
  const [responseBookingPrefill, setResponseBookingPrefill] = useState<any | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: stats } = useQuery({
    queryKey: ["facility-booking-stats", tenantId],
    queryFn: async () => {
      const [facilitiesRes, bookingsRes, pendingRes, externalRes] = await Promise.all([
        supabase.from(TABLES.FACILITIES as any).select("id", { count: "exact", head: true }).eq(COLS.TENANT_ID, tenantId),
        supabase.from(TABLES.FACILITY_BOOKINGS).select("id", { count: "exact", head: true }).eq(COLS.TENANT_ID, tenantId).eq(COLS.STATUS, "in_progress"),
        supabase.from(TABLES.FACILITY_BOOKINGS).select("id", { count: "exact", head: true }).eq(COLS.TENANT_ID, tenantId).eq(COLS.STATUS, "open"),
        supabase.from(TABLES.FACILITY_BOOKINGS).select("id", { count: "exact", head: true }).eq(COLS.TENANT_ID, tenantId).eq("source", "external"),
      ]);
      return {
        totalFacilities: facilitiesRes.count ?? 0,
        activeBookings: bookingsRes.count ?? 0,
        pendingRequests: pendingRes.count ?? 0,
        externalRequests: externalRes.count ?? 0,
      };
    },
    staleTime: 300000,
  });

  const { data: facilities = [], isLoading: facLoading } = useQuery({
    queryKey: ["facilities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FACILITIES as any)
        .select("*, facility_images(id, image_path, sort_order)")
        .eq(COLS.TENANT_ID, tenantId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 300000,
  });

  const { data: facilityTypes = [] } = useQuery({
    queryKey: ["facility-types", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FACILITY_TYPES)
        .select("*")
        .eq(COLS.TENANT_ID, tenantId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 300000,
  });

  const { data: bookings = [], isLoading: bookLoading } = useQuery({
    queryKey: ["facility-bookings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FACILITY_BOOKINGS)
        .select("*")
        .eq(COLS.TENANT_ID, tenantId)
        .is("admin_deleted_at", null)   // exclude soft-deleted bookings
        .order("booking_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 300000,
  });

  const { data: responses = [], isLoading: responsesLoading } = useQuery({
    queryKey: ["facility-responses", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FACILITY_RESPONSES)
        .select("*")
        .eq(COLS.TENANT_ID, tenantId)
        .order(COLS.CREATED_AT, { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 300000,
  });

  const unreadCount = responses.filter((r: any) => r.status === "new").length;

  const markResponsesRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from(TABLES.FACILITY_RESPONSES)
        .update({ status: "read" } as never)
        .eq(COLS.TENANT_ID, tenantId)
        .eq(COLS.STATUS, "new");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["facility-responses", tenantId] }),
  });

  const deleteFacilityMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.FACILITIES as any).delete().eq(COLS.ID, id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilities", tenantId] });
      toast.success("Facility deleted.");
      setDeleteFacility(null);
    },
    onError: () => toast.error("Failed to delete facility."),
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete — set admin_deleted_at so the record stays visible to the member
      const { error } = await supabase
        .from(TABLES.FACILITY_BOOKINGS)
        .update({ admin_deleted_at: new Date().toISOString() } as never)
        .eq(COLS.ID, id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facility-bookings", tenantId] });
      toast.success("Booking removed from admin view.");
      setDeleteBooking(null);
    },
    onError: () => toast.error("Failed to remove booking."),
  });

  function handleTabChange(value: string) {
    setSearchParams(value === "facilities" ? {} : { tab: value });
    if (value === "responses" && unreadCount > 0) markResponsesRead.mutate();
  }

  const handleShare = useCallback((facility: any) => {
    const url = `${window.location.origin}/book/${tenantId}/${facility.id}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Booking link copied!"));
  }, [tenantId]);

  // ── Filtered data ─────────────────────────────────────────────────────────────

  const filteredFacilities = facilities.filter(f => {
    const matchSearch = !facilitySearch || f.name.toLowerCase().includes(facilitySearch.toLowerCase());
    const matchType = facilityTypeFilter === "all" || f.type === facilityTypeFilter;
    const matchStatus = facilityStatusFilter === "all" || (facilityStatusFilter === "active" ? f.is_active : !f.is_active);
    return matchSearch && matchType && matchStatus;
  });

  const filteredBookings = bookings.filter(b => {
    const matchSearch = !bookingSearch || (b.facility_name ?? "").toLowerCase().includes(bookingSearch.toLowerCase()) || (b.purpose ?? "").toLowerCase().includes(bookingSearch.toLowerCase());
    const matchFacility = bookingFacilityFilter === "all" || b.facility_id === bookingFacilityFilter;
    const matchStatus = bookingStatusFilter === "all" || b.status === bookingStatusFilter;
    return matchSearch && matchFacility && matchStatus;
  });

  const filteredResponses = responses.filter(r => {
    return responseFilter === "all" || r.source === responseFilter;
  });

  const getTypeName = (typeLabel: string) => typeLabel ?? "";
  const getFirstImage = (facility: any) => {
    // Only use thumbnail_path — never fall back to gallery images
    if (facility.thumbnail_path) {
      return supabase.storage.from("facility-thumbnails").getPublicUrl(facility.thumbnail_path).data.publicUrl;
    }
    return null;
  };

  const viewFacilityImages = viewFacility?.facility_images ?? [];
  const viewFacilityBookings = bookings.filter(b => b.facility_id === viewFacility?.id && new Date(b.booking_date) >= new Date());

  return (
    <>
      <Helmet><title>Facility &amp; Event Booking — Vestry</title></Helmet>
      <PageHeader
        title="Facility & Event Booking"
        subtitle="Manage church spaces and booking requests"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddFacilityOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Facility
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setEditBooking(null); setPreselectedFacilityId(null); setNewBookingOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />New Booking
            </Button>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Facilities" value={stats?.totalFacilities} icon={Building2} color="bg-indigo-500" />
        <StatCard label="Approved Bookings" value={stats?.activeBookings} icon={Calendar} color="bg-emerald-500" />
        <StatCard label="Pending Requests" value={stats?.pendingRequests} icon={Users} color="bg-amber-500" />
        <StatCard label="External Requests" value={stats?.externalRequests} icon={MessageSquare} color="bg-violet-500" />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="responses" className="relative">
            Responses
            {unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold min-w-[16px] h-4 px-1">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Facilities Tab ── */}
        <TabsContent value="facilities">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search facilities..." className="pl-9" value={facilitySearch} onChange={e => setFacilitySearch(e.target.value)} />
            </div>
            <Select value={facilityTypeFilter} onValueChange={setFacilityTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {facilityTypes.map((t: any) => <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={facilityStatusFilter} onValueChange={setFacilityStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {facLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
            </div>
          ) : filteredFacilities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Building2 className="h-12 w-12 text-slate-300" />
              <p className="text-base font-semibold text-slate-600">No facilities found</p>
              <p className="text-sm text-slate-400">Try adjusting your search or filters, or add a new facility.</p>
              <Button size="sm" className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setAddFacilityOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />Add Facility
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFacilities.map(f => (
                <FacilityCard
                  key={f.id}
                  facility={f}
                  firstImage={getFirstImage(f)}
                  typeName={getTypeName(f.type)}
                  currency={currency}
                  onView={() => setViewFacility(f)}
                  onEdit={() => setEditFacility(f)}
                  onDelete={() => setDeleteFacility(f)}
                  onBookNow={() => { setPreselectedFacilityId(f.id); setEditBooking(null); setNewBookingOpen(true); }}
                  onShare={() => handleShare(f)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Bookings Tab ── */}
        <TabsContent value="bookings">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search bookings..." className="pl-9" value={bookingSearch} onChange={e => setBookingSearch(e.target.value)} />
            </div>
            <Select value={bookingFacilityFilter} onValueChange={setBookingFacilityFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Facilities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Facilities</SelectItem>
                {facilities.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Pending</SelectItem>
                <SelectItem value="in_progress">Approved</SelectItem>
                <SelectItem value="cancelled">Rejected / Withdrawn</SelectItem>
              </SelectContent>
            </Select>

            {/* Export dropdown */}
            {filteredBookings.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-10">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportBookingsCSV(filteredBookings)}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportBookingsXLSX(filteredBookings)}>
                    Export as Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportBookingsPDF(filteredBookings)}>
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {bookLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Calendar className="h-12 w-12 text-slate-300" />
              <p className="text-base font-semibold text-slate-600">No bookings found</p>
              <p className="text-sm text-slate-400">Create a new booking to get started.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Booking #</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Facility</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Booked By</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Purpose</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Date / Time</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Attendees</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Source</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map(b => {
                    const bookerWithdrew = b.status === "cancelled" && b.rejection_reason === "booker_withdrew";
                    return (
                    <TableRow
                      key={b.id}
                      className={`cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-opacity ${bookerWithdrew ? "opacity-50" : ""}`}
                      onClick={() => setViewBooking(b)}
                    >
                      <TableCell className="font-mono text-xs text-indigo-600">{b.booking_number || "—"}</TableCell>
                      <TableCell className="font-medium text-sm">{b.facility_name || "—"}</TableCell>
                      <TableCell className="text-sm text-slate-700 dark:text-slate-300 hidden md:table-cell max-w-[140px] truncate">
                        {b.booker_name || b.external_name || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 hidden md:table-cell max-w-[160px] truncate">{b.purpose || "—"}</TableCell>
                      <TableCell className="text-xs text-slate-500 hidden lg:table-cell">
                        {b.booking_date}<br />{b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}
                      </TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">{b.expected_attendees ?? "—"}</TableCell>
                      <TableCell>
                        {bookerWithdrew ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 cursor-default">
                                Withdrawn
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">Booker withdrew this request</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <BookingStatusBadge status={b.status} rejectionReason={b.rejection_reason} />
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell"><SourceBadge source={b.source ?? "admin"} /></TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewBooking(b)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditBooking(b); setPreselectedFacilityId(null); setNewBookingOpen(true); }}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteBooking(b.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Responses Tab ── */}
        <TabsContent value="responses">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {["all", "in_app", "external", "email", "sms", "whatsapp"].map(f => (
              <button
                key={f}
                onClick={() => setResponseFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  responseFilter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f === "all" ? "All" : f === "in_app" ? "In-App" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {responsesLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : filteredResponses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <MessageSquare className="h-12 w-12 text-slate-300" />
              <p className="text-base font-semibold text-slate-600">No responses yet</p>
              <p className="text-sm text-slate-400">Responses from members and external visitors will appear here.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Respondent</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Message</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Received</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponses.map(r => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-700/30" onClick={() => setViewResponse(r)}>
                      <TableCell>
                        <p className="font-medium text-sm">{r.respondent_name}</p>
                        {r.respondent_email && <p className="text-xs text-slate-500">{r.respondent_email}</p>}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 hidden md:table-cell max-w-[200px]">
                        <p className="truncate">{r.message}</p>
                      </TableCell>
                      <TableCell><SourceBadge source={r.source} /></TableCell>
                      <TableCell className="text-xs text-slate-500 hidden lg:table-cell">
                        {r.created_at ? format(new Date(r.created_at), "PP") : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.status === "new" ? "bg-blue-100 text-blue-700" :
                          r.status === "converted" ? "bg-emerald-100 text-emerald-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewResponse(r)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Modals & Drawers ── */}

      <FacilityDetailModal
        facility={viewFacility}
        images={viewFacilityImages}
        upcomingBookings={viewFacilityBookings}
        open={!!viewFacility}
        onClose={() => setViewFacility(null)}
        typeName={getTypeName(viewFacility?.type)}
        currency={currency}
      />

      <AddEditFacilityModal
        open={addFacilityOpen || !!editFacility}
        onClose={() => { setAddFacilityOpen(false); setEditFacility(null); }}
        tenantId={tenantId}
        editData={editFacility}
        facilityTypes={facilityTypes}
      />

      <NewBookingDrawer
        open={newBookingOpen}
        onClose={() => { setNewBookingOpen(false); setEditBooking(null); setPreselectedFacilityId(null); }}
        tenantId={tenantId}
        userId={userId}
        facilities={facilities}
        preselectedFacilityId={preselectedFacilityId}
        editData={editBooking}
      />

      {/* New booking from response prefill */}
      {responseBookingPrefill && (
        <NewBookingDrawer
          open={!!responseBookingPrefill}
          onClose={() => setResponseBookingPrefill(null)}
          tenantId={tenantId}
          userId={userId}
          facilities={facilities}
          editData={{
            external_name: responseBookingPrefill.respondent_name,
            external_email: responseBookingPrefill.respondent_email,
            external_phone: responseBookingPrefill.respondent_phone,
            external_org: responseBookingPrefill.respondent_org,
          }}
        />
      )}

      <BookingDetailDrawer
        booking={viewBooking}
        open={!!viewBooking}
        onClose={() => setViewBooking(null)}
        tenantId={tenantId}
        userId={userId}
      />

      <ResponseDetailModal
        response={viewResponse}
        open={!!viewResponse}
        onClose={() => setViewResponse(null)}
        onCreateBooking={r => setResponseBookingPrefill(r)}
      />

      {/* Delete facility confirm */}
      <AlertDialog open={!!deleteFacility} onOpenChange={v => !v && setDeleteFacility(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteFacility?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this facility. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={() => deleteFacilityMutation.mutate(deleteFacility.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete booking confirm */}
      <AlertDialog open={!!deleteBooking} onOpenChange={v => !v && setDeleteBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this booking?</AlertDialogTitle>
            <AlertDialogDescription>This removes the booking from your admin view. The member will still see it in their booking history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={() => deleteBookingMutation.mutate(deleteBooking!)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
