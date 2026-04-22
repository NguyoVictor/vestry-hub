import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  UserPlus, Users, Eye, Heart, Copy, Download, Share2,
  Phone, Mail, MapPin, Calendar, QrCode, CheckCircle,
  UserCheck, HeartHandshake, ClipboardList, MoreVertical, Pencil, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { logActivity } from "@/lib/activityLogger";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Visitor {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  gender: string | null;
  visit_date: string | null;
  follow_up_status: string | null;
  how_heard: string | null;
  notes: string | null;
  how_heard_detail: string | null;
  converted_to_member_id: string | null;
  created_at: string;
}

interface FollowUpTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DisplayStatus = "new" | "contacted" | "integrated";

function getDisplayStatus(raw: string | null): DisplayStatus {
  if (!raw || raw === "new" || raw === "not_contacted") return "new";
  if (raw === "contacted") return "contacted";
  return "integrated";
}

function StatusBadge({ status }: { status: string | null }) {
  const ds = getDisplayStatus(status);
  if (ds === "new") return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">New</Badge>;
  if (ds === "contacted") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Contacted</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Integrated</Badge>;
}


// ─── Add Visitor Sheet ────────────────────────────────────────────────────────

interface AddVisitorSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  userId: string;
  userName: string;
  editingVisitor?: Visitor | null;
  onSuccess: () => void;
}

function AddVisitorSheet({ open, onOpenChange, tenantId, userId, userName, editingVisitor, onSuccess }: AddVisitorSheetProps) {
  const isEdit = !!editingVisitor;
  const today = new Date().toISOString().split("T")[0];
  const emptyForm = { first_name: "", last_name: "", phone: "", email: "", city: "", gender: "", visit_date: today, how_heard: "", notes: "" };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Pre-fill form when editingVisitor changes or sheet opens
  useEffect(() => {
    if (open && editingVisitor) {
      setForm({
        first_name: editingVisitor.first_name ?? "",
        last_name: editingVisitor.last_name ?? "",
        phone: editingVisitor.phone ?? "",
        email: editingVisitor.email ?? "",
        city: editingVisitor.city ?? "",
        gender: editingVisitor.gender ?? "",
        visit_date: editingVisitor.visit_date ?? "",
        how_heard: editingVisitor.how_heard ?? "",
        notes: editingVisitor.notes ?? "",
      });
    } else if (!open) {
      setForm(emptyForm);
    }
  }, [open, editingVisitor?.id]);

  const reset = () => { setForm(emptyForm); setFieldErrors({}); }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.first_name.trim()) errors.first_name = "First name is required";
    if (!form.last_name.trim()) errors.last_name = "Last name is required";
    if (!form.phone.trim()) errors.phone = "Phone number is required";
    if (!form.visit_date) errors.visit_date = "Visit date is required";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setSaving(true);
    try {
      if (isEdit && editingVisitor) {
        const { error } = await supabase.from(TABLES.VISITORS).update({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          city: form.city.trim() || null,
          gender: form.gender || null,
          visit_date: form.visit_date || null,
          how_heard: form.how_heard || null,
          notes: form.notes.trim() || null,
        } as any).eq("id", editingVisitor.id);
        if (error) throw error;
        toast.success("Visitor updated");
      } else {
        const { error } = await supabase.from(TABLES.VISITORS).insert({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          city: form.city.trim() || null,
          gender: form.gender || null,
          visit_date: form.visit_date || null,
          how_heard: form.how_heard || null,
          notes: form.notes.trim() || null,
          follow_up_status: "new",
          created_at: new Date().toISOString(),
        } as any);
        if (error) throw error;
        await logActivity({
          churchId: tenantId,
          actionType: "new_visitor",
          description: `New visitor ${form.first_name} ${form.last_name} added`,
          actorId: userId,
          actorName: userName,
          entityType: "visitor",
          entityName: `${form.first_name} ${form.last_name}`,
        });
        toast.success("Visitor added");
      }
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Visitor" : "Add Visitor"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={e => { setForm(f => ({ ...f, first_name: e.target.value })); setFieldErrors(fe => ({ ...fe, first_name: "" })); }} placeholder="John" className={fieldErrors.first_name ? "border-destructive" : ""} />
              {fieldErrors.first_name && <p className="text-xs text-destructive">{fieldErrors.first_name}</p>}
            </div>
            <div className="space-y-1">
              <Label>Last Name *</Label>
              <Input value={form.last_name} onChange={e => { setForm(f => ({ ...f, last_name: e.target.value })); setFieldErrors(fe => ({ ...fe, last_name: "" })); }} placeholder="Doe" className={fieldErrors.last_name ? "border-destructive" : ""} />
              {fieldErrors.last_name && <p className="text-xs text-destructive">{fieldErrors.last_name}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Phone *</Label>
            <Input value={form.phone} onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setFieldErrors(fe => ({ ...fe, phone: "" })); }} placeholder="+1 234 567 8900" className={fieldErrors.phone ? "border-destructive" : ""} />
            {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>City</Label>
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Nairobi" />
            </div>
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Visit Date *</Label>
            <Input type="date" value={form.visit_date} onChange={e => { setForm(f => ({ ...f, visit_date: e.target.value })); setFieldErrors(fe => ({ ...fe, visit_date: "" })); }} className={fieldErrors.visit_date ? "border-destructive" : ""} />
            {fieldErrors.visit_date && <p className="text-xs text-destructive">{fieldErrors.visit_date}</p>}
          </div>
          <div className="space-y-1">
            <Label>How did they hear about us?</Label>
            <Select value={form.how_heard} onValueChange={v => setForm(f => ({ ...f, how_heard: v }))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="friend">Friend / Family</SelectItem>
                <SelectItem value="social_media">Social Media</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="flyer">Flyer / Poster</SelectItem>
                <SelectItem value="walk_in">Walk-in</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Any additional notes..." />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving..." : isEdit ? "Save Changes" : "Add Visitor"}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}


// ─── QR Code Modal ────────────────────────────────────────────────────────────

interface QRModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  registrationUrl: string;
}

function QRModal({ open, onOpenChange, registrationUrl }: QRModalProps) {
  const qrRef = useRef<SVGSVGElement>(null);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const downloadQR = () => {
    if (!qrRef.current) return;
    const svgEl = qrRef.current;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "visitor-registration-qr.svg";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("QR code downloaded");
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Visitor Registration", url: registrationUrl });
      } catch {
        // user cancelled
      }
    } else {
      await copyUrl();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Visitor Registration Link
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* QR Code */}
          <div className="flex justify-center p-4 bg-white rounded-lg border">
            <QRCodeSVG
              ref={qrRef}
              value={registrationUrl}
              size={200}
              level="H"
              includeMargin
            />
          </div>

          {/* URL display */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Registration URL</Label>
            <div className="flex gap-2">
              <Input value={registrationUrl} readOnly className="text-xs font-mono" />
              <Button variant="outline" size="icon" onClick={copyUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={downloadQR}>
              <Download className="h-4 w-4 mr-2" />
              Download QR
            </Button>
            <Button className="flex-1" onClick={shareLink}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Link
            </Button>
          </div>

          {/* How to use */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              How to use
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Print the QR code and display it at your church entrance</li>
              <li>Visitors scan the code to fill in their details</li>
              <li>Submissions appear automatically in this Visitors list</li>
              <li>Share the link via WhatsApp, email, or social media</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ─── Visitor Details Modal ────────────────────────────────────────────────────

interface VisitorDetailsModalProps {
  visitor: Visitor | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  userId: string;
  userName: string;
  onMutationSuccess: () => void;
}

function VisitorDetailsModal({
  visitor, open, onOpenChange, tenantId, userId, userName, onMutationSuccess,
}: VisitorDetailsModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    task_type: "", assigned_to: "", due_date: "", notes: "",
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [salvationModalOpen, setSalvationModalOpen] = useState(false);
  const [salvationForm, setSalvationForm] = useState({
    salvation_date: new Date().toISOString().split("T")[0],
    counsellor_name: "",
    notes: "",
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["visitor-tasks", visitor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FOLLOW_UP_TASKS)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("related_visitor_id", visitor!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as FollowUpTask[];
    },
    enabled: !!visitor?.id && open,
    staleTime: 300000,
  });

  const { data: admins = [] } = useQuery({
    queryKey: ["tenant-admins", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("tenant_id", tenantId)
        .in("role", ["super_admin", "staff_leader"]);
      return data || [];
    },
    enabled: open,
    staleTime: 300000,
  });

  const addFollowUpMut = useMutation({
    mutationFn: async () => {
      if (!visitor) return;
      const taskTitle = followUpForm.task_type === "Custom Task"
        ? (followUpForm.notes.trim() || "Custom Follow-up")
        : followUpForm.task_type;
      const { error } = await supabase.from(TABLES.FOLLOW_UP_TASKS).insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        title: taskTitle,
        description: followUpForm.notes.trim() || null,
        related_visitor_id: visitor.id,
        assigned_to: followUpForm.assigned_to || null,
        due_date: followUpForm.due_date || null,
        status: "open",
        priority: "medium",
        created_by: userId,
        created_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitor-tasks", visitor?.id] });
      queryClient.invalidateQueries({ queryKey: ["follow-up-tasks"] });
      setFollowUpForm({ task_type: "", assigned_to: "", due_date: "", notes: "" });
      setFollowUpModalOpen(false);
      toast.success("Follow-up task created");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const markContactedMut = useMutation({
    mutationFn: async () => {
      if (!visitor) return;
      // Update visitor status to contacted
      const { error } = await supabase
        .from(TABLES.VISITORS)
        .update({ follow_up_status: "contacted" } as any)
        .eq("id", visitor.id);
      if (error) throw error;
      // Determine channel from visitor's preferred contact method
      const preferred = visitor.how_heard_detail || "phone_call";
      const channel = preferred === "email" ? "email" : "sms";
      // Create a DRAFT broadcast so admin can compose and send it from Communications
      await supabase.from("broadcasts").insert({
        tenant_id: tenantId,
        subject: `Follow-up with ${visitor.first_name} ${visitor.last_name || ""}`.trim(),
        body: `Hi ${visitor.first_name},\n\nThank you for visiting us! We'd love to stay in touch.\n\nBest regards,\nThe Church Team`,
        channels: [channel],
        recipient_type: "visitor",
        recipient_config: {
          visitor_id: visitor.id,
          name: `${visitor.first_name} ${visitor.last_name || ""}`.trim(),
          phone: visitor.phone,
          email: visitor.email,
          preferred_channel: channel,
        },
        status: "draft",
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast.success("Visitor marked as contacted — draft message created in Communications");
      onMutationSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const recordSalvationMut = useMutation({
    mutationFn: async (data: { salvation_date: string; counsellor_name: string; notes: string }) => {
      if (!visitor) return;
      const { error: ncErr } = await supabase.from(TABLES.NEW_CONVERTS).insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        first_name: visitor.first_name,
        last_name: visitor.last_name || "",
        phone: visitor.phone || null,
        email: visitor.email || null,
        visitor_id: visitor.id,
        conversion_date: data.salvation_date,
        salvation_date: data.salvation_date,
        notes: data.notes || null,
        counsellor_name: data.counsellor_name || null,
        discipleship_stage: "1",
        baptism_status: "not_baptized",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
      if (ncErr) throw ncErr;
      await supabase.from(TABLES.VISITORS).update({ follow_up_status: "integrated" } as any).eq("id", visitor.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["new-converts"] });
      toast.success("Salvation recorded — visitor moved to New Converts");
      setSalvationModalOpen(false);
      onOpenChange(false);
      onMutationSuccess();
      navigate("/new-converts");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createMemberMut = useMutation({
    mutationFn: async () => {
      if (!visitor) return;
      const newMemberId = crypto.randomUUID();
      const today = new Date().toISOString().split("T")[0];
      const membershipNumber = "MEM-" + Date.now().toString(36).toUpperCase();
      const { error: memberError } = await supabase.from(TABLES.MEMBERS).insert({
        id: newMemberId,
        tenant_id: tenantId,
        first_name: visitor.first_name,
        last_name: visitor.last_name || "",
        email: visitor.email || null,
        phone: visitor.phone || null,
        status: "active",
        member_type: "member",
        membership_status: "Pending Approval",
        registration_source: "admin",
        join_date: today,
        membership_number: membershipNumber,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
      if (memberError) throw memberError;
      const { error: visitorError } = await supabase
        .from(TABLES.VISITORS)
        .update({ follow_up_status: "converted", converted_to_member_id: newMemberId } as any)
        .eq("id", visitor.id);
      if (visitorError) throw visitorError;
      await logActivity({
        churchId: tenantId,
        actionType: "visitor_converted",
        description: `Visitor ${visitor.first_name} ${visitor.last_name} converted to member`,
        actorId: userId,
        actorName: userName,
        entityType: "member",
        entityId: newMemberId,
        entityName: `${visitor.first_name} ${visitor.last_name}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member profile created");
      onOpenChange(false);
      onMutationSuccess();
      navigate("/members");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!visitor) return null;

  const fullName = `${visitor.first_name} ${visitor.last_name || ""}`.trim();
  const ds = getDisplayStatus(visitor.follow_up_status);
  const isNew = ds === "new";

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Visitor Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Header — name + status + gender + age group inline */}
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wide">{fullName}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={visitor.follow_up_status} />
              {visitor.gender && <span className="text-sm text-muted-foreground capitalize">{visitor.gender}</span>}
              {visitor.notes && visitor.notes.includes("Age group:") && (
                <span className="text-sm text-muted-foreground">
                  {visitor.notes.match(/Age group: ([^\n]+)/)?.[1]?.replace(/_/g, "–") ?? ""}
                </span>
              )}
            </div>
          </div>

          {/* Two-column info cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Contact Information */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Contact Information</p>
              {visitor.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{visitor.phone}</span>
                  {visitor.how_heard_detail && (
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground capitalize">
                      Prefers: {visitor.how_heard_detail.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              )}
              {visitor.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{visitor.email}</span>
                </div>
              )}
              {visitor.city && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{visitor.city}</span>
                </div>
              )}
              {!visitor.phone && !visitor.email && !visitor.city && (
                <p className="text-xs text-muted-foreground">No contact info</p>
              )}
            </div>

            {/* Visit Details */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Visit Details</p>
              {visitor.visit_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Visited on {format(new Date(visitor.visit_date), "MMMM d, yyyy")}</span>
                </div>
              )}
              {visitor.how_heard && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground text-xs">💬</span>
                  <span className="capitalize">Heard about us via: {visitor.how_heard.replace(/_/g, " ")}</span>
                </div>
              )}
              {!visitor.visit_date && !visitor.how_heard && (
                <p className="text-xs text-muted-foreground">No visit details</p>
              )}
            </div>
          </div>

          {/* Follow-up Tasks */}
          <div className="rounded-lg border p-3">
            <p className="text-xs font-semibold text-foreground mb-2">Follow-up Tasks</p>
            {tasksLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No follow-up tasks</p>
            ) : (
              <div className="space-y-1.5">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-start justify-between rounded border p-2 text-xs">
                    <div>
                      <p className="font-medium text-sm">{t.title}</p>
                      {t.description && <p className="text-muted-foreground">{t.description}</p>}
                      {t.due_date && <p className="text-muted-foreground mt-0.5">Due: {format(new Date(t.due_date), "dd MMM yyyy")}</p>}
                    </div>
                    <Badge variant="outline" className="capitalize text-xs shrink-0">{t.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons — all 4 visible initially, each disappears after its task is done */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Add Follow-up — disappears once a task exists */}
            {tasks.length === 0 && !tasksLoading && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => setFollowUpModalOpen(true)}
              >
                <ClipboardList className="h-4 w-4" />
                Add Follow-up
              </Button>
            )}

            {/* Mark First Contact Completed — disappears once contacted or beyond */}
            {ds === "new" && (
              <Button
                size="sm"
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => markContactedMut.mutate()}
                disabled={markContactedMut.isPending}
              >
                <UserCheck className="h-4 w-4" />
                {markContactedMut.isPending ? "Updating..." : "Mark First Contact Completed"}
              </Button>
            )}

            {/* Record Salvation Decision — disappears once integrated */}
            {ds !== "integrated" && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => setSalvationModalOpen(true)}
                disabled={recordSalvationMut.isPending}
              >
                <HeartHandshake className="h-4 w-4 text-rose-500" />
                Record Salvation Decision
              </Button>
            )}

            {/* Create Member Profile — disappears once converted to member */}
            {!visitor.converted_to_member_id && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => createMemberMut.mutate()}
                disabled={createMemberMut.isPending}
              >
                <UserPlus className="h-4 w-4 text-indigo-500" />
                {createMemberMut.isPending ? "Creating..." : "Create Member Profile"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* ── Create Follow-Up Task Modal ── */}
    <Dialog open={followUpModalOpen} onOpenChange={v => { setFollowUpModalOpen(v); if (!v) setFollowUpForm({ task_type: "", assigned_to: "", due_date: "", notes: "" }); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Follow-Up Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Visitor *</Label>
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
              {visitor ? `${visitor.first_name} ${visitor.last_name || ""}`.trim() + ` (${getDisplayStatus(visitor.follow_up_status)})` : ""}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Task Type *</Label>
            <Select value={followUpForm.task_type} onValueChange={v => setFollowUpForm(f => ({ ...f, task_type: v }))}>
              <SelectTrigger><SelectValue placeholder="Select task type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Welcome Call">Welcome Call</SelectItem>
                <SelectItem value="Welcome SMS/WhatsApp">Welcome SMS/WhatsApp</SelectItem>
                <SelectItem value="Prayer Support Call">Prayer Support Call</SelectItem>
                <SelectItem value="Verify/Confirm Contact Details">Verify/Confirm Contact Details</SelectItem>
                <SelectItem value="Invite Back to Next Service">Invite Back to Next Service</SelectItem>
                <SelectItem value="Custom Task">Custom Task</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assign To *</Label>
            <Select value={followUpForm.assigned_to} onValueChange={v => setFollowUpForm(f => ({ ...f, assigned_to: v }))}>
              <SelectTrigger><SelectValue placeholder="Select admin" /></SelectTrigger>
              <SelectContent>
                {admins.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.first_name} {a.last_name}{a.email ? ` (${a.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Due Date *</Label>
            <Input type="date" value={followUpForm.due_date} onChange={e => setFollowUpForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={followUpForm.notes} onChange={e => setFollowUpForm(f => ({ ...f, notes: e.target.value }))} placeholder="Add any additional notes..." rows={3} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setFollowUpModalOpen(false)}>Cancel</Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => addFollowUpMut.mutate()}
              disabled={addFollowUpMut.isPending || !followUpForm.task_type || !followUpForm.assigned_to || !followUpForm.due_date}
            >
              {addFollowUpMut.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* ── Record Salvation Decision Modal ── */}
    <Dialog open={salvationModalOpen} onOpenChange={v => { setSalvationModalOpen(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Salvation Decision</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Salvation Date</Label>
            <Input
              type="date"
              value={salvationForm.salvation_date}
              onChange={e => setSalvationForm(f => ({ ...f, salvation_date: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Counsellor Name</Label>
            <Input
              value={salvationForm.counsellor_name}
              onChange={e => setSalvationForm(f => ({ ...f, counsellor_name: e.target.value }))}
              placeholder="Name of counsellor"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={salvationForm.notes}
              onChange={e => setSalvationForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any notes about the salvation decision..."
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setSalvationModalOpen(false)}>Cancel</Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => recordSalvationMut.mutate(salvationForm)}
              disabled={recordSalvationMut.isPending || !salvationForm.salvation_date}
            >
              {recordSalvationMut.isPending ? "Recording..." : "Record Salvation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────

const Visitors = () => {
  const { tenantId, userId, userName } = useChurch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [deleteVisitorId, setDeleteVisitorId] = useState<string | null>(null);

  // Fetch church_code for QR — same code used by members and visitors
  const { data: tenantCode } = useQuery({
    queryKey: ["tenant-church-code", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.TENANTS)
        .select("church_code")
        .eq("id", tenantId!)
        .single();
      return data?.church_code as string | null;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const BASE_URL = import.meta.env.VITE_BASE_URL || window.location.origin;
  // Visitor QR links to /member/join with type=visitor pre-selected
  const registrationUrl = tenantCode
    ? `${BASE_URL}/member/join?code=${tenantCode}&type=visitor`
    : `${BASE_URL}/member/join`;

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ["visitors", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.VISITORS)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Visitor[];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  // ── Convert to New Convert mutation (heart icon) ─────────────────────────

  const convertToNewConvertMut = useMutation({
    mutationFn: async (v: Visitor) => {
      const today = new Date().toISOString().split("T")[0];
      const { error: ncErr } = await supabase.from(TABLES.NEW_CONVERTS).insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId!,
        first_name: v.first_name,
        last_name: v.last_name || "",
        phone: v.phone || null,
        email: v.email || null,
        visitor_id: v.id,
        conversion_date: today,
        salvation_date: today,
        discipleship_stage: "1",
        baptism_status: "not_baptized",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
      if (ncErr) throw ncErr;
      // Same as Record Salvation Decision — status becomes "integrated"
      await supabase.from(TABLES.VISITORS).update({ follow_up_status: "integrated" } as any).eq("id", v.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["new-converts"] });
      toast.success("Visitor recorded as New Convert");
      navigate("/new-converts");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Delete visitor mutation ───────────────────────────────────────────────

  const deleteVisitorMut = useMutation({
    mutationFn: async (id: string) => {
      // Step 1: nullify related_visitor_id on any linked follow_up_tasks
      const { error: fkErr1 } = await supabase
        .from(TABLES.FOLLOW_UP_TASKS)
        .update({ related_visitor_id: null } as any)
        .eq("related_visitor_id", id);
      if (fkErr1) throw fkErr1;

      // Step 2: nullify visitor_id on any linked new_converts
      const { error: fkErr2 } = await supabase
        .from(TABLES.NEW_CONVERTS)
        .update({ visitor_id: null } as any)
        .eq("visitor_id", id);
      if (fkErr2) throw fkErr2;

      // Step 3: now safe to delete the visitor
      const { error } = await supabase.from(TABLES.VISITORS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      toast.success("Visitor deleted");
      setDeleteVisitorId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Computed stats ────────────────────────────────────────────────────────
  const total = visitors.length;
  const newCount = visitors.filter(v => getDisplayStatus(v.follow_up_status) === "new").length;
  const contactedCount = visitors.filter(v => getDisplayStatus(v.follow_up_status) === "contacted").length;
  const integratedCount = visitors.filter(v => getDisplayStatus(v.follow_up_status) === "integrated").length;

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = visitors.filter(v => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${v.first_name} ${v.last_name || ""}`.toLowerCase();
    return (
      name.includes(q) ||
      (v.phone || "").toLowerCase().includes(q) ||
      (v.email || "").toLowerCase().includes(q)
    );
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openDetails = (v: Visitor) => {
    setSelectedVisitor(v);
    setDetailsOpen(true);
  };

  const handleMutationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["visitors"] });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const statCards = [
    { label: "Total Visitors", value: total, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { label: "New", value: newCount, icon: UserPlus, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
    { label: "Contacted", value: contactedCount, icon: Phone, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Integrated", value: integratedCount, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  ];

  return (
    <>
      <Helmet><title>Visitors — Vestry</title></Helmet>

      <PageHeader
        title="Visitors"
        subtitle="Track and follow up with church visitors"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setQrOpen(true)}>
              <QrCode className="h-4 w-4 mr-2" />
              Visitor Registration Link
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Visitor
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`rounded-lg p-2.5 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-7 w-10 mb-1" />
                ) : (
                  <p className="text-2xl font-bold">{value}</p>
                )}
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search by name, phone or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">
                {search ? "No visitors match your search" : "No visitors yet"}
              </p>
              {!search && (
                <p className="text-sm text-muted-foreground mt-1">
                  Add your first visitor or share the registration link.
                </p>
              )}
              {!search && (
                <Button className="mt-4" onClick={() => setAddOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Visitor
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Visit Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">City</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => {
                    const fullName = `${v.first_name} ${v.last_name || ""}`.trim();
                    const ds = getDisplayStatus(v.follow_up_status);
                    const isNew = ds === "new";
                    return (
                      <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <MemberAvatar name={fullName} size="sm" />
                            <span className="font-medium">{fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {v.phone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span className="text-xs">{v.phone}</span>
                              </div>
                            )}
                            {v.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="text-xs">{v.email}</span>
                              </div>
                            )}
                            {!v.phone && !v.email && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {v.visit_date ? format(new Date(v.visit_date), "dd MMM yyyy") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={v.follow_up_status} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {v.city ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {v.city}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openDetails(v)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {ds !== "integrated" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => convertToNewConvertMut.mutate(v)}
                                disabled={convertToNewConvertMut.isPending}
                                title="Convert to New Convert"
                              >
                                <Heart className="h-4 w-4" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">More actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setEditingVisitor(v); setAddOpen(true); }}>
                                  <Pencil className="h-4 w-4 mr-2" />Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteVisitorId(v.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals & Sheets */}
      <QRModal open={qrOpen} onOpenChange={setQrOpen} registrationUrl={registrationUrl} />

      <AddVisitorSheet
        open={addOpen}
        onOpenChange={v => { setAddOpen(v); if (!v) setEditingVisitor(null); }}
        tenantId={tenantId!}
        userId={userId}
        userName={userName}
        editingVisitor={editingVisitor}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["visitors"] })}
      />

      <VisitorDetailsModal
        visitor={selectedVisitor}
        open={detailsOpen}
        onOpenChange={(v) => { setDetailsOpen(v); if (!v) setSelectedVisitor(null); }}
        tenantId={tenantId!}
        userId={userId}
        userName={userName}
        onMutationSuccess={handleMutationSuccess}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteVisitorId} onOpenChange={open => { if (!open) setDeleteVisitorId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visitor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this visitor? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteVisitorId && deleteVisitorMut.mutate(deleteVisitorId)}
              disabled={deleteVisitorMut.isPending}
            >
              {deleteVisitorMut.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Visitors;
