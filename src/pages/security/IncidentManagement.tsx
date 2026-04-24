import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ShieldAlert,
  Calendar,
  FileText,
  Download,
  Filter,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
  Paperclip,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle2,
  Search,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "low" | "medium" | "high" | "critical";
type IncidentStatus = "open" | "investigating" | "resolved" | "closed";

interface Incident {
  id: string;
  tenant_id: string;
  incident_number: string | null;
  incident_date: string;
  incident_time: string | null;
  incident_type: string;
  severity: Severity;
  description: string;
  persons_involved: string | null;
  location: string | null;
  witnesses: string | null;
  attachment_paths: string[] | null;
  status: IncidentStatus;
  resolution_notes: string | null;
  reported_by: string | null;
  created_at: string;
}

interface StatusLog {
  id: string;
  incident_id: string;
  tenant_id: string;
  old_status: string | null;
  new_status: string;
  note: string | null;
  changed_at: string;
}

type SortField = "incident_date" | "severity" | "status";
type SortDir = "asc" | "desc";

// ─── Constants ────────────────────────────────────────────────────────────────

const INCIDENT_TYPES = [
  "Theft",
  "Fire",
  "Medical Emergency",
  "Vandalism",
  "Misconduct",
  "Harassment",
  "Unauthorized Access",
  "Property Damage",
  "Suspicious Activity",
  "Child Safety Concern",
  "Other",
];

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const STATUS_ORDER: Record<IncidentStatus, number> = {
  open: 0,
  investigating: 1,
  resolved: 2,
  closed: 3,
};

// ─── Badge helpers ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  const map: Record<Severity, string> = {
    low: "bg-blue-100 text-blue-700 border-blue-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    critical: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${map[severity] ?? map.medium}`}
    >
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const map: Record<IncidentStatus, string> = {
    open: "bg-red-100 text-red-700 border-red-200",
    investigating: "bg-amber-100 text-amber-700 border-amber-200",
    resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    closed: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const labels: Record<IncidentStatus, string> = {
    open: "Open",
    investigating: "Investigating",
    resolved: "Resolved",
    closed: "Closed",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${map[status] ?? map.open}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ─── Severity pill selector ───────────────────────────────────────────────────

function SeverityPillSelector({
  value,
  onChange,
}: {
  value: Severity;
  onChange: (v: Severity) => void;
}) {
  const options: { value: Severity; label: string; cls: string }[] = [
    { value: "low", label: "Low", cls: "bg-blue-100 text-blue-700 border-blue-300 data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:border-blue-600" },
    { value: "medium", label: "Medium", cls: "bg-amber-100 text-amber-700 border-amber-300 data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500" },
    { value: "high", label: "High", cls: "bg-orange-100 text-orange-700 border-orange-300 data-[active=true]:bg-orange-500 data-[active=true]:text-white data-[active=true]:border-orange-500" },
    { value: "critical", label: "Critical", cls: "bg-red-100 text-red-700 border-red-300 data-[active=true]:bg-red-600 data-[active=true]:text-white data-[active=true]:border-red-600" },
  ];
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          data-active={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${o.cls}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />;
  return sortDir === "asc"
    ? <ChevronUp className="h-3.5 w-3.5 text-orange-500" />
    : <ChevronDown className="h-3.5 w-3.5 text-orange-500" />;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  iconBg: string;
  iconColor: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
      <div>
        {loading ? (
          <>
            <Skeleton className="h-7 w-16 mb-1" />
            <Skeleton className="h-3.5 w-24" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-slate-900 font-jakarta leading-none">{value}</p>
            <p className="text-sm text-slate-500 font-jakarta mt-0.5">{label}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Report Incident Sheet ────────────────────────────────────────────────────

interface ReportSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  userName: string;
  editingIncident?: Incident | null;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  incident_date: new Date().toISOString().split("T")[0],
  incident_time: "",
  incident_type: "",
  incident_type_other: "",
  severity: "medium" as Severity,
  description: "",
  persons_involved: "",
  location: "",
  witnesses: "",
  status: "open" as IncidentStatus,
  resolution_notes: "",
};

function ReportIncidentSheet({
  open,
  onOpenChange,
  tenantId,
  userName,
  editingIncident,
  onSuccess,
}: ReportSheetProps) {
  const isEdit = !!editingIncident;
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form when editing
  useState(() => {
    if (open && editingIncident) {
      setForm({
        incident_date: editingIncident.incident_date ?? "",
        incident_time: editingIncident.incident_time ?? "",
        incident_type: editingIncident.incident_type ?? "",
        incident_type_other: "",
        severity: editingIncident.severity ?? "medium",
        description: editingIncident.description ?? "",
        persons_involved: editingIncident.persons_involved ?? "",
        location: editingIncident.location ?? "",
        witnesses: editingIncident.witnesses ?? "",
        status: editingIncident.status ?? "open",
        resolution_notes: editingIncident.resolution_notes ?? "",
      });
    } else if (!open) {
      setForm(EMPTY_FORM);
      setAttachmentFiles([]);
      setErrors({});
    }
  });

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, val: (typeof EMPTY_FORM)[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.incident_date) e.incident_date = "Date is required";
    if (!form.incident_type) e.incident_type = "Incident type is required";
    if (form.incident_type === "Other" && !form.incident_type_other.trim())
      e.incident_type_other = "Please specify the incident type";
    if (!form.description.trim()) e.description = "Description is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const uploadAttachments = async (): Promise<string[]> => {
    if (!attachmentFiles.length) return [];
    const paths: string[] = [];
    for (const file of attachmentFiles) {
      const path = `${tenantId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("incident-attachments")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      paths.push(path);
    }
    return paths;
  };

  const handleSave = async (asDraft: boolean) => {
    if (!validate()) return;
    setSaving(true);
    try {
      setUploading(true);
      const newPaths = await uploadAttachments();
      setUploading(false);

      const resolvedType =
        form.incident_type === "Other" ? form.incident_type_other.trim() : form.incident_type;

      const payload = {
        tenant_id: tenantId,
        incident_date: form.incident_date,
        incident_time: form.incident_time || null,
        incident_type: resolvedType,
        severity: form.severity,
        description: form.description.trim(),
        persons_involved: form.persons_involved.trim() || null,
        location: form.location.trim() || null,
        witnesses: form.witnesses.trim() || null,
        status: form.status,
        resolution_notes: form.resolution_notes.trim() || null,
        reported_by: userName || null,
      };

      if (isEdit && editingIncident) {
        const existingPaths = editingIncident.attachment_paths ?? [];
        const { error } = await supabase
          .from(TABLES.INCIDENTS as any)
          .update({
            ...payload,
            attachment_paths: [...existingPaths, ...newPaths],
          })
          .eq("id", editingIncident.id);
        if (error) throw error;
        toast.success("Incident updated");
      } else {
        const incidentNumber = `INC-${String(Date.now()).slice(-6)}`;
        const { error } = await supabase.from(TABLES.INCIDENTS as any).insert({
          id: crypto.randomUUID(),
          ...payload,
          incident_number: incidentNumber,
          attachment_paths: newPaths.length ? newPaths : null,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
        if (!asDraft) toast.success("Incident reported successfully");
      }

      setForm(EMPTY_FORM);
      setAttachmentFiles([]);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save incident");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const removeFile = (idx: number) =>
    setAttachmentFiles((f) => f.filter((_, i) => i !== idx));

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setForm(EMPTY_FORM); setAttachmentFiles([]); setErrors({}); } }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto font-jakarta">
        <SheetHeader className="pb-4 border-b border-slate-100">
          <SheetTitle className="text-lg font-semibold text-slate-900">
            {isEdit ? "Edit Incident" : "Report Incident"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-5 pb-6">
          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Date of Incident <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.incident_date}
                onChange={(e) => set("incident_date", e.target.value)}
                className={`h-10 text-sm ${errors.incident_date ? "border-red-400" : "border-slate-200"}`}
              />
              {errors.incident_date && (
                <p className="text-xs text-red-500">{errors.incident_date}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Time of Incident</Label>
              <Input
                type="time"
                value={form.incident_time}
                onChange={(e) => set("incident_time", e.target.value)}
                className="h-10 text-sm border-slate-200"
              />
            </div>
          </div>

          {/* Incident Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Incident Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.incident_type}
              onValueChange={(v) => set("incident_type", v)}
            >
              <SelectTrigger className={`h-10 text-sm ${errors.incident_type ? "border-red-400" : "border-slate-200"}`}>
                <SelectValue placeholder="Select incident type" />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.incident_type && (
              <p className="text-xs text-red-500">{errors.incident_type}</p>
            )}
          </div>

          {/* Other type specify */}
          {form.incident_type === "Other" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Please specify <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.incident_type_other}
                onChange={(e) => set("incident_type_other", e.target.value)}
                placeholder="Describe the incident type"
                className={`h-10 text-sm ${errors.incident_type_other ? "border-red-400" : "border-slate-200"}`}
              />
              {errors.incident_type_other && (
                <p className="text-xs text-red-500">{errors.incident_type_other}</p>
              )}
            </div>
          )}

          {/* Severity */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Severity</Label>
            <SeverityPillSelector
              value={form.severity}
              onChange={(v) => set("severity", v)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Describe what happened in detail..."
              className={`text-sm resize-none ${errors.description ? "border-red-400" : "border-slate-200"}`}
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description}</p>
            )}
          </div>

          {/* People Involved */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">People Involved</Label>
            <Textarea
              value={form.persons_involved}
              onChange={(e) => set("persons_involved", e.target.value)}
              rows={2}
              placeholder="Names of people involved (optional)"
              className="text-sm resize-none border-slate-200"
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Location</Label>
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Where did this occur? (optional)"
              className="h-10 text-sm border-slate-200"
            />
          </div>

          {/* Witnesses */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Witnesses</Label>
            <Textarea
              value={form.witnesses}
              onChange={(e) => set("witnesses", e.target.value)}
              rows={2}
              placeholder="Names of witnesses (optional)"
              className="text-sm resize-none border-slate-200"
            />
          </div>

          {/* Attachments */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Attachments</Label>
            <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg p-3 hover:border-orange-400 hover:bg-orange-50/40 transition-colors">
              <Paperclip className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-500">Click to attach files</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setAttachmentFiles((prev) => [...prev, ...files]);
                  e.target.value = "";
                }}
              />
            </label>
            {attachmentFiles.length > 0 && (
              <div className="space-y-1 mt-1">
                {attachmentFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1.5 border border-slate-200">
                    <span className="truncate text-slate-700">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 ml-2 shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v as IncidentStatus)}
            >
              <SelectTrigger className="h-10 text-sm border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-slate-300"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-slate-300"
              onClick={() => handleSave(true)}
              disabled={saving || uploading}
            >
              {saving ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              type="button"
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => handleSave(false)}
              disabled={saving || uploading}
            >
              {uploading ? "Uploading..." : saving ? "Saving..." : isEdit ? "Save Changes" : "Report Incident"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Update Status Modal ──────────────────────────────────────────────────────

interface UpdateStatusModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  incident: Incident | null;
  tenantId: string;
  onSuccess: () => void;
}

function UpdateStatusModal({
  open,
  onOpenChange,
  incident,
  tenantId,
  onSuccess,
}: UpdateStatusModalProps) {
  const [status, setStatus] = useState<IncidentStatus>("open");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync when incident changes
  if (incident && status !== incident.status && !saving) {
    setStatus(incident.status);
  }

  const handleSave = async () => {
    if (!incident) return;
    setSaving(true);
    try {
      const { error: updateErr } = await supabase
        .from(TABLES.INCIDENTS as any)
        .update({ status })
        .eq("id", incident.id);
      if (updateErr) throw updateErr;

      const { error: logErr } = await supabase
        .from(TABLES.INCIDENT_STATUS_LOGS as any)
        .insert({
          id: crypto.randomUUID(),
          incident_id: incident.id,
          tenant_id: tenantId,
          old_status: incident.status,
          new_status: status,
          note: note.trim() || null,
          changed_at: new Date().toISOString(),
        });
      if (logErr) throw logErr;

      toast.success("Status updated");
      setNote("");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-0 font-jakarta">
        <div className="px-6 pt-6 pb-5 border-b border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              Update Status
            </DialogTitle>
          </DialogHeader>
          {incident && (
            <p className="text-xs text-slate-500 mt-1">
              {incident.incident_number ?? "Incident"} — {incident.incident_type}
            </p>
          )}
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">New Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as IncidentStatus)}>
              <SelectTrigger className="h-10 text-sm border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add a note about this status change..."
              className="text-sm resize-none border-slate-200"
            />
          </div>
        </div>
        <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
          <Button
            variant="outline"
            className="border-slate-300"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── View Incident Sheet ──────────────────────────────────────────────────────

interface ViewSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  incident: Incident | null;
  tenantId: string;
}

function ViewIncidentSheet({ open, onOpenChange, incident, tenantId }: ViewSheetProps) {
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["incident-status-logs", incident?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.INCIDENT_STATUS_LOGS as any)
        .select("*")
        .eq("incident_id", incident!.id)
        .eq("tenant_id", tenantId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StatusLog[];
    },
    enabled: !!incident?.id && open,
    staleTime: 300000,
  });

  if (!incident) return null;

  const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex gap-3">
        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-slate-500" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">{label}</p>
          <p className="text-sm text-slate-700 mt-0.5">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto font-jakarta">
        <SheetHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-lg font-semibold text-slate-900">
                {incident.incident_number
                  ? `INC-${incident.incident_number.replace(/^INC-/, "")}`
                  : "Incident Details"}
              </SheetTitle>
              <p className="text-sm text-slate-500 mt-0.5">{incident.incident_type}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-5 pb-6">
          {/* Core details */}
          <div className="space-y-3">
            <InfoRow
              icon={Calendar}
              label="Date"
              value={
                incident.incident_date
                  ? format(new Date(incident.incident_date), "MMMM d, yyyy") +
                    (incident.incident_time ? ` at ${incident.incident_time}` : "")
                  : null
              }
            />
            <InfoRow icon={MapPin} label="Location" value={incident.location} />
            <InfoRow icon={Users} label="People Involved" value={incident.persons_involved} />
            <InfoRow icon={Eye} label="Witnesses" value={incident.witnesses} />
            <InfoRow icon={FileText} label="Reported By" value={incident.reported_by} />
          </div>

          {/* Description */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Description</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{incident.description}</p>
          </div>

          {/* Resolution notes */}
          {incident.resolution_notes && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Resolution Notes</p>
              <p className="text-sm text-emerald-800 leading-relaxed whitespace-pre-wrap">{incident.resolution_notes}</p>
            </div>
          )}

          {/* Attachments */}
          {incident.attachment_paths && incident.attachment_paths.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Attachments</p>
              <div className="space-y-1.5">
                {incident.attachment_paths.map((path, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{path.split("/").pop()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status history */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Status History</p>
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No status changes recorded.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-3 items-start rounded-lg border border-slate-200 bg-white p-3">
                    <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.old_status && (
                          <>
                            <StatusBadge status={log.old_status as IncidentStatus} />
                            <span className="text-slate-400 text-xs">→</span>
                          </>
                        )}
                        <StatusBadge status={log.new_status as IncidentStatus} />
                      </div>
                      {log.note && (
                        <p className="text-xs text-slate-500 mt-1">{log.note}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(log.changed_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

interface FilterState {
  dateFrom: string;
  dateTo: string;
  types: string[];
  severities: Severity[];
  statuses: IncidentStatus[];
}

const EMPTY_FILTERS: FilterState = {
  dateFrom: "",
  dateTo: "",
  types: [],
  severities: [],
  statuses: [],
};

interface FilterPanelProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onClear: () => void;
}

function FilterPanel({ filters, onChange, onClear }: FilterPanelProps) {
  const toggleArr = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const severities: Severity[] = ["low", "medium", "high", "critical"];
  const statuses: IncidentStatus[] = ["open", "investigating", "resolved", "closed"];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5 font-jakarta">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date From */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Date From</Label>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            className="h-9 text-sm border-slate-200"
          />
        </div>
        {/* Date To */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Date To</Label>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            className="h-9 text-sm border-slate-200"
          />
        </div>

        {/* Severity */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Severity</Label>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-0.5">
            {severities.map((s) => (
              <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={filters.severities.includes(s)}
                  onCheckedChange={() =>
                    onChange({ ...filters, severities: toggleArr(filters.severities, s) })
                  }
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs text-slate-600 capitalize">{s}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Status</Label>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-0.5">
            {statuses.map((s) => (
              <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={filters.statuses.includes(s)}
                  onCheckedChange={() =>
                    onChange({ ...filters, statuses: toggleArr(filters.statuses, s) })
                  }
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs text-slate-600 capitalize">{s}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Incident Types */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Incident Type</Label>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {INCIDENT_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={filters.types.includes(t)}
                onCheckedChange={() =>
                  onChange({ ...filters, types: toggleArr(filters.types, t) })
                }
                className="h-3.5 w-3.5"
              />
              <span className="text-xs text-slate-600">{t}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-slate-700 text-xs"
          onClick={onClear}
        >
          Clear All
        </Button>
      </div>
    </div>
  );
}

// ─── Active filter chips ──────────────────────────────────────────────────────

function ActiveFilterChips({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const chips: { label: string; onRemove: () => void }[] = [];

  if (filters.dateFrom)
    chips.push({ label: `From: ${filters.dateFrom}`, onRemove: () => onChange({ ...filters, dateFrom: "" }) });
  if (filters.dateTo)
    chips.push({ label: `To: ${filters.dateTo}`, onRemove: () => onChange({ ...filters, dateTo: "" }) });
  filters.types.forEach((t) =>
    chips.push({ label: t, onRemove: () => onChange({ ...filters, types: filters.types.filter((x) => x !== t) }) })
  );
  filters.severities.forEach((s) =>
    chips.push({ label: `Severity: ${s}`, onRemove: () => onChange({ ...filters, severities: filters.severities.filter((x) => x !== s) }) })
  );
  filters.statuses.forEach((s) =>
    chips.push({ label: `Status: ${s}`, onRemove: () => onChange({ ...filters, statuses: filters.statuses.filter((x) => x !== s) }) })
  );

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-0.5 text-xs font-medium"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="hover:text-orange-900 ml-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportToPDF(incidents: Incident[], churchName: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const today = format(new Date(), "MMMM d, yyyy");
  const filename = `Incidents_${churchName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;

  // Header
  doc.setFillColor(249, 115, 22); // orange-500
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Incident Management Report", margin, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${churchName}  •  Exported ${today}`, pageW - margin, 12, { align: "right" });

  // Table headers
  const headers = ["Incident #", "Type", "Date", "Severity", "Status", "People Involved", "Description"];
  const colWidths = [24, 36, 26, 22, 26, 44, 80];
  let y = 26;

  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y - 5, pageW - margin * 2, 8, "F");
  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");

  let x = margin;
  headers.forEach((h, i) => {
    doc.text(h, x + 1, y);
    x += colWidths[i];
  });

  y += 5;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  incidents.forEach((inc, rowIdx) => {
    if (y > pageH - 20) {
      doc.addPage();
      y = 20;
    }

    // Alternating row bg
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, pageW - margin * 2, 7, "F");
    }

    doc.setTextColor(15, 23, 42); // slate-900
    x = margin;

    const incNum = inc.incident_number
      ? `INC-${inc.incident_number.replace(/^INC-/, "")}`
      : "—";
    const incDate = inc.incident_date
      ? format(new Date(inc.incident_date), "MMM d, yyyy")
      : "—";
    const people = inc.persons_involved
      ? inc.persons_involved.length > 30
        ? inc.persons_involved.slice(0, 28) + "…"
        : inc.persons_involved
      : "—";
    const desc = inc.description
      ? inc.description.length > 60
        ? inc.description.slice(0, 58) + "…"
        : inc.description
      : "—";

    const cells = [incNum, inc.incident_type, incDate, inc.severity, inc.status, people, desc];
    cells.forEach((cell, i) => {
      doc.text(String(cell), x + 1, y);
      x += colWidths[i];
    });

    // Row separator
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 3, pageW - margin, y + 3);

    y += 8;
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("Generated by Vestry Hub", pageW / 2, pageH - 6, { align: "center" });

  doc.save(filename);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IncidentManagement() {
  const { tenantId, name: churchName, userName } = useChurch();
  const queryClient = useQueryClient();

  // UI state
  const [reportOpen, setReportOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [viewingIncident, setViewingIncident] = useState<Incident | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusIncident, setStatusIncident] = useState<Incident | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Incident | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("incident_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [exporting, setExporting] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.INCIDENTS as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Incident[];
    },
    staleTime: 300000,
  });

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = incidents.filter((i) => {
      const d = new Date(i.incident_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      open: incidents.filter((i) => i.status === "open").length,
      thisMonth: thisMonth.length,
      total: incidents.length,
    };
  }, [incidents]);

  // ── Filtering + sorting ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...incidents];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.incident_type.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          (i.persons_involved ?? "").toLowerCase().includes(q) ||
          (i.incident_number ?? "").toLowerCase().includes(q) ||
          (i.location ?? "").toLowerCase().includes(q)
      );
    }

    // Date range
    if (filters.dateFrom) {
      result = result.filter((i) => i.incident_date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      result = result.filter((i) => i.incident_date <= filters.dateTo);
    }

    // Types
    if (filters.types.length) {
      result = result.filter((i) => filters.types.includes(i.incident_type));
    }

    // Severities
    if (filters.severities.length) {
      result = result.filter((i) => filters.severities.includes(i.severity));
    }

    // Statuses
    if (filters.statuses.length) {
      result = result.filter((i) => filters.statuses.includes(i.status));
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "incident_date") {
        cmp = a.incident_date.localeCompare(b.incident_date);
      } else if (sortField === "severity") {
        cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      } else if (sortField === "status") {
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [incidents, search, filters, sortField, sortDir]);

  const hasActiveFilters = useMemo(
    () =>
      !!filters.dateFrom ||
      !!filters.dateTo ||
      filters.types.length > 0 ||
      filters.severities.length > 0 ||
      filters.statuses.length > 0,
    [filters]
  );

  // ── Sort toggle ────────────────────────────────────────────────────────────

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField]
  );

  // ── Delete mutation ────────────────────────────────────────────────────────

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLES.INCIDENTS as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents", tenantId] });
      toast.success("Incident deleted");
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to delete incident"),
  });

  // ── PDF export ─────────────────────────────────────────────────────────────

  const handleExport = async () => {
    if (!filtered.length) {
      toast.error("No incidents to export");
      return;
    }
    setExporting(true);
    try {
      await exportToPDF(filtered, churchName);
      toast.success("PDF exported successfully");
    } catch (err: any) {
      toast.error(err.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const formatIncidentNumber = (inc: Incident) =>
    inc.incident_number
      ? `INC-${inc.incident_number.replace(/^INC-/, "")}`
      : `INC-${inc.id.slice(-6).toUpperCase()}`;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["incidents", tenantId] });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 font-jakarta">
      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-jakarta tracking-tight">
              Incident Management
            </h1>
            <p className="text-sm text-slate-500 mt-0.5 font-jakarta">
              Log, track and resolve church security incidents
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className={`border-slate-300 text-slate-600 hover:border-orange-400 hover:text-orange-600 gap-1.5 ${filterOpen ? "border-orange-400 text-orange-600 bg-orange-50" : ""}`}
              onClick={() => setFilterOpen((v) => !v)}
            >
              <Filter className="h-4 w-4" />
              Filter
              {hasActiveFilters && (
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 ml-0.5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-600 hover:border-orange-400 hover:text-orange-600 gap-1.5"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting..." : "Export PDF"}
            </Button>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
              onClick={() => { setEditingIncident(null); setReportOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              Report Incident
            </Button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={ShieldAlert}
            label="Open Incidents"
            value={stats.open}
            iconBg="bg-red-100"
            iconColor="text-red-600"
            loading={isLoading}
          />
          <StatCard
            icon={Calendar}
            label="This Month"
            value={stats.thisMonth}
            iconBg="bg-slate-100"
            iconColor="text-slate-600"
            loading={isLoading}
          />
          <StatCard
            icon={FileText}
            label="Total Incidents"
            value={stats.total}
            iconBg="bg-slate-100"
            iconColor="text-slate-600"
            loading={isLoading}
          />
        </div>

        {/* ── Filter Panel ── */}
        {filterOpen && (
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_FILTERS)}
          />
        )}

        {/* ── Active filter chips ── */}
        {hasActiveFilters && (
          <ActiveFilterChips filters={filters} onChange={setFilters} />
        )}

        {/* ── Search + Table ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Search bar */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search incidents..."
                className="pl-9 h-9 text-sm border-slate-200 focus:border-orange-400"
              />
            </div>
            {filtered.length !== incidents.length && (
              <p className="text-xs text-slate-500">
                Showing {filtered.length} of {incidents.length}
              </p>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-jakarta">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    Incident #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    Type
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort("incident_date")}
                  >
                    <span className="flex items-center gap-1">
                      Date
                      <SortIcon field="incident_date" sortField={sortField} sortDir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort("severity")}
                  >
                    <span className="flex items-center gap-1">
                      Severity
                      <SortIcon field="severity" sortField={sortField} sortDir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort("status")}
                  >
                    <span className="flex items-center gap-1">
                      Status
                      <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    People Involved
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                        <ShieldAlert className="h-12 w-12 text-slate-300" />
                        <p className="text-base font-semibold text-slate-600 font-jakarta">
                          {incidents.length === 0 ? "No incidents recorded" : "No incidents match your filters"}
                        </p>
                        <p className="text-sm text-slate-400 max-w-sm font-jakarta">
                          {incidents.length === 0
                            ? "When incidents are reported, they'll appear here."
                            : "Try adjusting your filters or search query."}
                        </p>
                        {incidents.length === 0 && (
                          <Button
                            size="sm"
                            className="mt-2 bg-orange-500 hover:bg-orange-600 text-white"
                            onClick={() => { setEditingIncident(null); setReportOpen(true); }}
                          >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Report First Incident
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((inc) => (
                    <tr
                      key={inc.id}
                      className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Incident # */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {formatIncidentNumber(inc)}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-700 whitespace-nowrap">{inc.incident_type}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {format(new Date(inc.incident_date), "MMM d, yyyy")}
                        </div>
                        {inc.incident_time && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                            <Clock className="h-3 w-3 shrink-0" />
                            {inc.incident_time}
                          </div>
                        )}
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-3.5">
                        <SeverityBadge severity={inc.severity} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={inc.status} />
                      </td>

                      {/* People Involved */}
                      <td className="px-4 py-3.5 max-w-[160px]">
                        <span className="text-sm text-slate-600 truncate block" title={inc.persons_involved ?? ""}>
                          {inc.persons_involved
                            ? inc.persons_involved.length > 40
                              ? inc.persons_involved.slice(0, 38) + "…"
                              : inc.persons_involved
                            : <span className="text-slate-400">—</span>}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <span className="text-sm text-slate-600 truncate block" title={inc.description}>
                          {inc.description.length > 60
                            ? inc.description.slice(0, 58) + "…"
                            : inc.description}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 font-jakarta">
                            <DropdownMenuItem
                              className="gap-2 text-sm cursor-pointer"
                              onClick={() => { setViewingIncident(inc); setViewOpen(true); }}
                            >
                              <Eye className="h-4 w-4 text-slate-400" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 text-sm cursor-pointer"
                              onClick={() => { setEditingIncident(inc); setReportOpen(true); }}
                            >
                              <Pencil className="h-4 w-4 text-slate-400" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 text-sm cursor-pointer"
                              onClick={() => { setStatusIncident(inc); setStatusModalOpen(true); }}
                            >
                              <RefreshCw className="h-4 w-4 text-slate-400" />
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-sm cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => setDeleteTarget(inc)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Drawers & Modals ── */}

      <ReportIncidentSheet
        open={reportOpen}
        onOpenChange={(v) => { setReportOpen(v); if (!v) setEditingIncident(null); }}
        tenantId={tenantId}
        userName={userName}
        editingIncident={editingIncident}
        onSuccess={invalidate}
      />

      <ViewIncidentSheet
        open={viewOpen}
        onOpenChange={setViewOpen}
        incident={viewingIncident}
        tenantId={tenantId}
      />

      <UpdateStatusModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        incident={statusIncident}
        tenantId={tenantId}
        onSuccess={invalidate}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent className="font-jakarta">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Incident</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget ? formatIncidentNumber(deleteTarget) : "this incident"}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
