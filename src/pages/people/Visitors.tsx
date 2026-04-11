import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
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
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  UserPlus, Users, Eye, Heart, Copy, Download, Share2,
  Phone, Mail, MapPin, Calendar, QrCode, CheckCircle,
  UserCheck, HeartHandshake, ClipboardList,
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
  onSuccess: () => void;
}

function AddVisitorSheet({ open, onOpenChange, tenantId, userId, userName, onSuccess }: AddVisitorSheetProps) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", phone: "", email: "",
    city: "", gender: "", visit_date: "", how_heard: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const reset = () => setForm({
    first_name: "", last_name: "", phone: "", email: "",
    city: "", gender: "", visit_date: "", how_heard: "", notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim()) { toast.error("First name is required"); return; }
    setSaving(true);
    try {
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
          <SheetTitle>Add Visitor</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="John" />
            </div>
            <div className="space-y-1">
              <Label>Last Name</Label>
              <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Doe" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 8900" />
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
            <Label>Visit Date</Label>
            <Input type="date" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))} />
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
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving..." : "Add Visitor"}</Button>
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
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const addFollowUpMut = useMutation({
    mutationFn: async () => {
      if (!visitor) return;
      const { error } = await supabase.from(TABLES.FOLLOW_UP_TASKS).insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        title: "Follow-up with visitor",
        description: followUpNote.trim() || null,
        related_visitor_id: visitor.id,
        due_date: followUpDate || null,
        status: "open",
        created_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitor-tasks", visitor?.id] });
      queryClient.invalidateQueries({ queryKey: ["follow-up-tasks"] });
      setFollowUpNote("");
      setFollowUpDate("");
      toast.success("Follow-up task added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const markContactedMut = useMutation({
    mutationFn: async () => {
      if (!visitor) return;
      const { error } = await supabase
        .from(TABLES.VISITORS)
        .update({ follow_up_status: "contacted" } as any)
        .eq("id", visitor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      toast.success("Marked as first contact completed");
      onMutationSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const recordSalvationMut = useMutation({
    mutationFn: async () => {
      if (!visitor) return;
      const today = format(new Date(), "dd MMM yyyy");
      const existing = visitor.notes || "";
      const updated = existing
        ? `${existing}\nSalvation decision recorded on ${today}`
        : `Salvation decision recorded on ${today}`;
      const { error } = await supabase
        .from(TABLES.VISITORS)
        .update({ notes: updated } as any)
        .eq("id", visitor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      toast.success("Salvation decision recorded");
      onMutationSuccess();
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
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!visitor) return null;

  const fullName = `${visitor.first_name} ${visitor.last_name || ""}`.trim();
  const ds = getDisplayStatus(visitor.follow_up_status);
  const isNew = ds === "new";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Visitor Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-4">
            <MemberAvatar name={fullName} size="lg" />
            <div>
              <h3 className="text-lg font-semibold">{fullName}</h3>
              <StatusBadge status={visitor.follow_up_status} />
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {visitor.gender && (
              <div>
                <p className="text-xs text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">{visitor.gender}</p>
              </div>
            )}
            {visitor.how_heard_detail && (
              <div>
                <p className="text-xs text-muted-foreground">Preferred Contact</p>
                <p className="font-medium capitalize">{visitor.how_heard_detail}</p>
              </div>
            )}
            {visitor.how_heard && (
              <div>
                <p className="text-xs text-muted-foreground">How They Heard</p>
                <p className="font-medium capitalize">{visitor.how_heard.replace(/_/g, " ")}</p>
              </div>
            )}
            {visitor.city && (
              <div className="flex items-start gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">City</p>
                  <p className="font-medium">{visitor.city}</p>
                </div>
              </div>
            )}
          </div>

          {/* Contact info */}
          <div className="space-y-2">
            {visitor.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{visitor.phone}</span>
              </div>
            )}
            {visitor.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{visitor.email}</span>
              </div>
            )}
            {visitor.visit_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Visited {format(new Date(visitor.visit_date), "dd MMM yyyy")}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {visitor.notes && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{visitor.notes}</p>
            </div>
          )}

          {/* Follow-up tasks */}
          <div>
            <p className="text-sm font-medium flex items-center gap-2 mb-2">
              <ClipboardList className="h-4 w-4" />
              Follow-up Tasks
            </p>
            {tasksLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No follow-up tasks yet.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-start justify-between rounded-md border p-2 text-sm">
                    <div>
                      <p className="font-medium">{t.title}</p>
                      {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                      {t.due_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Due: {format(new Date(t.due_date), "dd MMM yyyy")}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize text-xs shrink-0">{t.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add follow-up form */}
          <div className="rounded-lg border p-3 space-y-3">
            <p className="text-sm font-medium">Add Follow-up Task</p>
            <Textarea
              placeholder="Note or task description..."
              value={followUpNote}
              onChange={e => setFollowUpNote(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Input
                type="date"
                value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => addFollowUpMut.mutate()}
                disabled={addFollowUpMut.isPending || !followUpNote.trim()}
              >
                {addFollowUpMut.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            {isNew && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => markContactedMut.mutate()}
                disabled={markContactedMut.isPending}
              >
                <UserCheck className="h-4 w-4 text-amber-600" />
                Mark First Contact
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => recordSalvationMut.mutate()}
              disabled={recordSalvationMut.isPending}
            >
              <HeartHandshake className="h-4 w-4 text-rose-600" />
              Record Salvation
            </Button>
            {visitor.follow_up_status !== "converted" && (
              <Button
                size="sm"
                className="flex items-center gap-2 col-span-2"
                onClick={() => createMemberMut.mutate()}
                disabled={createMemberMut.isPending}
              >
                <UserPlus className="h-4 w-4" />
                {createMemberMut.isPending ? "Creating..." : "Create Member Profile"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────

const Visitors = () => {
  const { tenantId, userId, userName } = useChurch();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const registrationUrl = `${import.meta.env.VITE_BASE_URL || window.location.origin}/visitor-registration/${tenantId}`;

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

  // ── Mark contacted mutation (heart icon) ─────────────────────────────────

  const markContactedMut = useMutation({
    mutationFn: async (visitorId: string) => {
      const { error } = await supabase
        .from(TABLES.VISITORS)
        .update({ follow_up_status: "contacted" } as any)
        .eq("id", visitorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      toast.success("Visitor marked as contacted");
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
                            {isNew && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => markContactedMut.mutate(v.id)}
                                disabled={markContactedMut.isPending}
                                title="Mark as contacted"
                              >
                                <Heart className="h-4 w-4" />
                              </Button>
                            )}
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
        onOpenChange={setAddOpen}
        tenantId={tenantId!}
        userId={userId}
        userName={userName}
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
    </>
  );
};

export default Visitors;
