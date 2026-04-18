import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays, Plus, Trash2, CheckCircle, XCircle, Users, Pencil, UserCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StaffRow {
  id: string;
  job_title: string | null;
  custom_position: string | null;
  status: string | null;
  annual_leave_days: number | null;
  sick_leave_days: number | null;
  members?: { first_name: string | null; last_name: string | null } | null;
}

interface LeaveRequest {
  id: string;
  staff_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  reason: string | null;
  cover_staff_id: string | null;
  cover_notes: string | null;
  status: string;
  org_id: string;
  created_at: string;
  payroll_staff?: {
    job_title: string | null;
    custom_position: string | null;
    members?: { first_name: string | null; last_name: string | null } | null;
  } | null;
  cover_staff?: {
    members?: { first_name: string | null; last_name: string | null } | null;
  } | null;
}

interface LeaveBalance {
  id: string;
  staff_id: string;
  annual_leave_total: number;
  annual_leave_used: number;
  sick_leave_total: number;
  sick_leave_used: number;
  maternity_leave_total: number;
  maternity_leave_used: number;
  paternity_leave_total: number;
  paternity_leave_used: number;
  compassionate_leave_total: number;
  compassionate_leave_used: number;
  unpaid_leave_total: number;
  unpaid_leave_used: number;
  org_id: string;
  year: number;
  payroll_staff?: {
    job_title: string | null;
    custom_position: string | null;
    members?: { first_name: string | null; last_name: string | null } | null;
  } | null;
}

interface Absence {
  id: string;
  staff_id: string;
  absence_date: string;
  reason: string | null;
  status: string;
  notes: string | null;
  org_id: string;
  payroll_staff?: {
    job_title: string | null;
    custom_position: string | null;
    members?: { first_name: string | null; last_name: string | null } | null;
  } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const LEAVE_TYPES = [
  "Annual Leave",
  "Sick Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Compassionate Leave",
  "Unpaid Leave",
  "Other",
] as const;

type LeaveType = typeof LEAVE_TYPES[number];

function leaveTypeBadge(type: string) {
  const map: Record<string, string> = {
    "Annual Leave":       "bg-blue-50 text-blue-700 border-blue-200",
    "Sick Leave":         "bg-red-50 text-red-700 border-red-200",
    "Maternity Leave":    "bg-pink-50 text-pink-700 border-pink-200",
    "Paternity Leave":    "bg-teal-50 text-teal-700 border-teal-200",
    "Compassionate Leave":"bg-purple-50 text-purple-700 border-purple-200",
    "Unpaid Leave":       "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[type] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
      {type}
    </span>
  );
}

function leaveStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending:   "bg-amber-50 text-amber-700 border-amber-200",
    approved:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected:  "bg-red-50 text-red-600 border-red-200",
    cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  };
  const s = status.toLowerCase();
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${map[s] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
      {status}
    </span>
  );
}

function absenceStatusBadge(status: string) {
  const s = status.toLowerCase();
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
      s === "excused"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-red-50 text-red-600 border-red-200"
    }`}>
      {status}
    </span>
  );
}

function staffName(s: { members?: { first_name: string | null; last_name: string | null } | null } | null | undefined) {
  if (!s?.members) return "—";
  return `${s.members.first_name ?? ""} ${s.members.last_name ?? ""}`.trim() || "—";
}

function staffPosition(s: { job_title: string | null; custom_position: string | null } | null | undefined) {
  return s?.custom_position || s?.job_title || "—";
}

function calcDuration(start: string, end: string): number {
  if (!start || !end) return 0;
  const diff = differenceInCalendarDays(parseISO(end), parseISO(start));
  return diff < 0 ? 0 : diff + 1;
}

// ─── New Leave Request Modal ──────────────────────────────────────────────────
interface NewLeaveRequestModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  staffList: StaffRow[];
  onSuccess: () => void;
}

function NewLeaveRequestModal({ open, onClose, tenantId, staffList, onSuccess }: NewLeaveRequestModalProps) {
  const qc = useQueryClient();
  const [staffId, setStaffId]       = useState("");
  const [leaveType, setLeaveType]   = useState<LeaveType>("Annual Leave");
  const [otherLeaveType, setOtherLeaveType] = useState("");
  const [startDate, setStartDate]   = useState("");
  const [endDate, setEndDate]       = useState("");
  const [reason, setReason]         = useState("");
  const [coverStaffId, setCoverStaffId] = useState("");
  const [coverNotes, setCoverNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const duration = calcDuration(startDate, endDate);

  const activeStaff = staffList.filter(s => s.status?.toLowerCase() === "active");
  const coverOptions = activeStaff.filter(s => s.id !== staffId);

  const handleClose = () => {
    setStaffId(""); setLeaveType("Annual Leave"); setOtherLeaveType(""); setStartDate(""); setEndDate("");
    setReason(""); setCoverStaffId(""); setCoverNotes("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!staffId)    { toast.error("Please select a staff member."); return; }
    if (!startDate)  { toast.error("Start date is required."); return; }
    if (!endDate)    { toast.error("End date is required."); return; }
    if (endDate < startDate) { toast.error("End date must be on or after start date."); return; }
    if (leaveType === "Other" && !otherLeaveType.trim()) {
      toast.error("Please specify the leave type.");
      return;
    }

    setSubmitting(true);
    try {
      const dur = calcDuration(startDate, endDate);
      const resolvedLeaveType = leaveType === "Other" ? otherLeaveType.trim() : leaveType;

      const { error } = await supabase.from(TABLES.STAFF_LEAVE_REQUESTS).insert({
        staff_id: staffId,
        leave_type: resolvedLeaveType,
        start_date: startDate,
        end_date: endDate,
        duration_days: dur,
        reason: reason || null,
        cover_staff_id: coverStaffId || null,
        cover_notes: coverNotes || null,
        status: "pending",
        org_id: tenantId,
      } as never);

      if (error) throw error;

      // Deduct from leave balance (only for known leave types, not "Other")
      const leaveColMap: Record<string, string> = {
        "Annual Leave":        "annual_leave_used",
        "Sick Leave":          "sick_leave_used",
        "Maternity Leave":     "maternity_leave_used",
        "Paternity Leave":     "paternity_leave_used",
        "Compassionate Leave": "compassionate_leave_used",
        "Unpaid Leave":        "unpaid_leave_used",
      };
      const usedCol = leaveColMap[leaveType];
      const year = new Date(startDate).getFullYear();

      const { data: balRow } = await supabase
        .from(TABLES.STAFF_LEAVE_BALANCES)
        .select("id, " + usedCol)
        .eq("staff_id", staffId)
        .eq("year", year)
        .eq("org_id", tenantId)
        .maybeSingle();

      if (balRow) {
        const currentUsed = (balRow as Record<string, number>)[usedCol] ?? 0;
        await supabase
          .from(TABLES.STAFF_LEAVE_BALANCES)
          .update({ [usedCol]: currentUsed + dur } as never)
          .eq("id", balRow.id);
      }

      qc.invalidateQueries({ queryKey: ["leave-requests", tenantId] });
      qc.invalidateQueries({ queryKey: ["leave-balances", tenantId] });
      toast.success("Leave request submitted successfully!");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">New Leave Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Staff Member */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Staff Member <span className="text-red-500">*</span></Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="focus:ring-orange-400">
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {activeStaff.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {staffName(s)} — {staffPosition(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Leave Type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Leave Type <span className="text-red-500">*</span></Label>
            <Select value={leaveType} onValueChange={v => setLeaveType(v as LeaveType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {leaveType === "Other" && (
              <Input
                className="mt-2"
                placeholder="Specify leave type..."
                value={otherLeaveType}
                onChange={e => setOtherLeaveType(e.target.value)}
                autoFocus
              />
            )}
          </div>

          {/* Start + End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Start Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                placeholder="mm/dd/yyyy"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">End Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                placeholder="mm/dd/yyyy"
              />
            </div>
          </div>
          {startDate && endDate && (
            <p className="text-xs text-slate-500 -mt-2">
              Duration: <span className="font-semibold text-slate-700">{duration} day{duration !== 1 ? "s" : ""}</span>
            </p>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Reason</Label>
            <Textarea
              placeholder="Reason for leave..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Cover Staff */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Cover Staff</Label>
            <Select value={coverStaffId} onValueChange={setCoverStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Select who will cover" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {coverOptions.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {staffName(s)} — {staffPosition(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cover Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Cover Notes</Label>
            <Textarea
              placeholder="Instructions for the covering staff..."
              value={coverNotes}
              onChange={e => setCoverNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Record Absence Modal ─────────────────────────────────────────────────────
interface AbsenceModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  staffList: StaffRow[];
  editData?: Absence | null;
  onSuccess: () => void;
}

function AbsenceModal({ open, onClose, tenantId, staffList, editData, onSuccess }: AbsenceModalProps) {
  const qc = useQueryClient();
  const isEdit = !!editData;

  const [staffId, setStaffId]         = useState(editData?.staff_id ?? "");
  const [absenceDate, setAbsenceDate] = useState(editData?.absence_date ?? "");
  const [reason, setReason]           = useState(editData?.reason ?? "");
  const [status, setStatus]           = useState(editData?.status ?? "unexcused");
  const [notes, setNotes]             = useState(editData?.notes ?? "");
  const [submitting, setSubmitting]   = useState(false);

  const handleClose = () => {
    if (!isEdit) { setStaffId(""); setAbsenceDate(""); setReason(""); setStatus("unexcused"); setNotes(""); }
    onClose();
  };

  const handleSubmit = async () => {
    if (!staffId)     { toast.error("Please select a staff member."); return; }
    if (!absenceDate) { toast.error("Absence date is required."); return; }
    setSubmitting(true);
    try {
      const payload = {
        staff_id: staffId,
        absence_date: absenceDate,
        reason: reason || null,
        status,
        notes: notes || null,
        org_id: tenantId,
      };
      if (isEdit && editData) {
        const { error } = await supabase.from(TABLES.STAFF_ABSENCES).update(payload as never).eq("id", editData.id);
        if (error) throw error;
        toast.success("Absence updated.");
      } else {
        const { error } = await supabase.from(TABLES.STAFF_ABSENCES).insert(payload as never);
        if (error) throw error;
        toast.success("Absence recorded.");
      }
      qc.invalidateQueries({ queryKey: ["staff-absences", tenantId] });
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save absence.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeStaff = staffList.filter(s => s.status?.toLowerCase() === "active");

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{isEdit ? "Edit Absence" : "Log Absence"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Staff Member <span className="text-red-500">*</span></Label>
            <Select value={staffId} onValueChange={setStaffId} disabled={isEdit}>
              <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent className="max-h-56">
                {activeStaff.map(s => (
                  <SelectItem key={s.id} value={s.id}>{staffName(s)} — {staffPosition(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Absence Date <span className="text-red-500">*</span></Label>
            <Input type="date" value={absenceDate} onChange={e => setAbsenceDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Reason</Label>
            <Input placeholder="Reason for absence..." value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="excused">Excused</SelectItem>
                <SelectItem value="unexcused">Unexcused</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Log Absence"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Leave Requests Sub-tab ───────────────────────────────────────────────────
function LeaveRequestsTab({ tenantId, staffList }: { tenantId: string; staffList: StaffRow[] }) {
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["leave-requests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.STAFF_LEAVE_REQUESTS)
        .select(`
          *,
          payroll_staff:staff_id(job_title, custom_position, members(first_name, last_name)),
          cover_staff:cover_staff_id(members(first_name, last_name))
        `)
        .eq("org_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeaveRequest[];
    },
    staleTime: 300_000,
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from(TABLES.STAFF_LEAVE_REQUESTS)
      .update({ status } as never)
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["leave-requests", tenantId] });
    toast.success(`Request ${status}.`);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.STAFF_LEAVE_REQUESTS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests", tenantId] });
      toast.success("Leave request deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      {/* Action row */}
      <div className="flex justify-end mb-3">
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
          size="sm"
          onClick={() => setNewOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New Leave Request
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <CalendarDays className="h-8 w-8" />
            <p className="text-sm font-medium">No leave requests yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  {["Staff Member", "Leave Type", "Start Date", "End Date", "Duration", "Reason", "Cover Staff", "Status", "Actions"].map(h => (
                    <TableHead key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(r => (
                  <TableRow key={r.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800">{staffName(r.payroll_staff)}</p>
                      <p className="text-xs text-slate-400">{staffPosition(r.payroll_staff)}</p>
                    </TableCell>
                    <TableCell>{leaveTypeBadge(r.leave_type)}</TableCell>
                    <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                      {r.start_date ? format(parseISO(r.start_date), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                      {r.end_date ? format(parseISO(r.end_date), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                      {r.duration_days} day{r.duration_days !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell className="max-w-[160px]">
                      <p className="text-sm text-slate-600 truncate" title={r.reason ?? ""}>
                        {r.reason || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {r.cover_staff ? staffName(r.cover_staff) : "—"}
                    </TableCell>
                    <TableCell>{leaveStatusBadge(r.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {r.status === "pending" && (
                          <>
                            <button
                              title="Approve"
                              className="rounded p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                              onClick={() => updateStatus(r.id, "approved")}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              title="Reject"
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              onClick={() => updateStatus(r.id, "rejected")}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              title="Delete"
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this leave request?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-500 hover:bg-red-600 text-white"
                                onClick={() => deleteMutation.mutate(r.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <NewLeaveRequestModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        tenantId={tenantId}
        staffList={staffList}
        onSuccess={() => {}}
      />
    </>
  );
}

// ─── Leave Balances Sub-tab ───────────────────────────────────────────────────
function ProgressBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function BalanceCell({ used, total, color }: { used: number; total: number; color: string }) {
  return (
    <div className="min-w-[90px]">
      <p className="text-xs text-slate-600 font-medium">{used} / {total} days</p>
      <ProgressBar used={used} total={total} color={color} />
    </div>
  );
}

const YEARS_LIST = Array.from({ length: 11 }, (_, i) => 2020 + i);

// ─── Edit Balance Modal ───────────────────────────────────────────────────────
interface EditBalanceModalProps {
  open: boolean;
  onClose: () => void;
  balance: LeaveBalance | null;
  onSuccess: () => void;
}

function EditBalanceModal({ open, onClose, balance, onSuccess }: EditBalanceModalProps) {
  const qc = useQueryClient();
  const [fields, setFields] = useState({
    annual_leave_total: 0, annual_leave_used: 0,
    sick_leave_total: 0, sick_leave_used: 0,
    maternity_leave_total: 0, maternity_leave_used: 0,
    paternity_leave_total: 0, paternity_leave_used: 0,
    compassionate_leave_total: 0, compassionate_leave_used: 0,
    unpaid_leave_total: 0, unpaid_leave_used: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  // Sync fields when balance changes
  useState(() => {
    if (balance) {
      setFields({
        annual_leave_total: balance.annual_leave_total,
        annual_leave_used: balance.annual_leave_used,
        sick_leave_total: balance.sick_leave_total,
        sick_leave_used: balance.sick_leave_used,
        maternity_leave_total: balance.maternity_leave_total,
        maternity_leave_used: balance.maternity_leave_used,
        paternity_leave_total: balance.paternity_leave_total,
        paternity_leave_used: balance.paternity_leave_used,
        compassionate_leave_total: balance.compassionate_leave_total,
        compassionate_leave_used: balance.compassionate_leave_used,
        unpaid_leave_total: balance.unpaid_leave_total,
        unpaid_leave_used: balance.unpaid_leave_used,
      });
    }
  });

  const set = (key: keyof typeof fields, val: string) =>
    setFields(prev => ({ ...prev, [key]: parseInt(val) || 0 }));

  const handleSave = async () => {
    if (!balance) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from(TABLES.STAFF_LEAVE_BALANCES)
        .update(fields as never)
        .eq("id", balance.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success("Leave balance updated successfully!");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to update balance.");
    } finally {
      setSubmitting(false);
    }
  };

  const name = balance ? staffName(balance.payroll_staff) : "";

  const leaveRows: { label: string; totalKey: keyof typeof fields; usedKey: keyof typeof fields }[] = [
    { label: "Annual Leave",        totalKey: "annual_leave_total",        usedKey: "annual_leave_used" },
    { label: "Sick Leave",          totalKey: "sick_leave_total",          usedKey: "sick_leave_used" },
    { label: "Maternity Leave",     totalKey: "maternity_leave_total",     usedKey: "maternity_leave_used" },
    { label: "Paternity Leave",     totalKey: "paternity_leave_total",     usedKey: "paternity_leave_used" },
    { label: "Compassionate Leave", totalKey: "compassionate_leave_total", usedKey: "compassionate_leave_used" },
    { label: "Unpaid Leave",        totalKey: "unpaid_leave_total",        usedKey: "unpaid_leave_used" },
  ];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Edit Leave Balance — {name}</DialogTitle>
        </DialogHeader>
        {balance && (
          <p className="text-xs text-slate-500 -mt-1">Year: <span className="font-medium text-slate-700">{balance.year}</span></p>
        )}
        <div className="space-y-4 pt-1">
          {leaveRows.map(row => (
            <div key={row.label} className="space-y-1.5">
              <p className="text-sm font-medium text-slate-700">{row.label}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Total Days</Label>
                  <Input
                    type="number"
                    min="0"
                    value={fields[row.totalKey]}
                    onChange={e => set(row.totalKey, e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Used Days</Label>
                  <Input
                    type="number"
                    min="0"
                    value={fields[row.usedKey]}
                    onChange={e => set(row.usedKey, e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave} disabled={submitting}>
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LeaveBalancesTab({ tenantId, staffList }: { tenantId: string; staffList: StaffRow[] }) {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selYear, setSelYear] = useState(String(currentYear));
  const [editBalance, setEditBalance] = useState<LeaveBalance | null>(null);
  const [initializing, setInitializing] = useState(false);

  const { data: balances = [], isLoading } = useQuery<LeaveBalance[]>({
    queryKey: ["leave-balances", tenantId, selYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.STAFF_LEAVE_BALANCES)
        .select("*, payroll_staff:staff_id(job_title, custom_position, annual_leave_days, sick_leave_days, members(first_name, last_name))")
        .eq("org_id", tenantId)
        .eq("year", parseInt(selYear))
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LeaveBalance[];
    },
    staleTime: 300_000,
  });

  const handleInitialize = async () => {
    const activeStaff = staffList.filter(s => s.status?.toLowerCase() === "active");
    if (activeStaff.length === 0) { toast.error("No active staff members found."); return; }

    if (balances.length > 0) {
      const confirmed = window.confirm(
        `Leave balances for ${selYear} already exist. Reinitialize?`
      );
      if (!confirmed) return;
      await supabase
        .from(TABLES.STAFF_LEAVE_BALANCES)
        .delete()
        .eq("org_id", tenantId)
        .eq("year", parseInt(selYear));
    }

    setInitializing(true);
    try {
      const rows = activeStaff.map(s => ({
        staff_id: s.id,
        annual_leave_total: s.annual_leave_days ?? 14,
        annual_leave_used: 0,
        sick_leave_total: s.sick_leave_days ?? 10,
        sick_leave_used: 0,
        maternity_leave_total: 90,
        maternity_leave_used: 0,
        paternity_leave_total: 14,
        paternity_leave_used: 0,
        compassionate_leave_total: 3,
        compassionate_leave_used: 0,
        unpaid_leave_total: 0,
        unpaid_leave_used: 0,
        org_id: tenantId,
        year: parseInt(selYear),
      }));

      const { error } = await supabase.from(TABLES.STAFF_LEAVE_BALANCES).insert(rows as never);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["leave-balances", tenantId, selYear] });
      toast.success(`Leave balances initialized for ${activeStaff.length} staff member${activeStaff.length !== 1 ? "s" : ""}.`);
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to initialize balances.");
    } finally {
      setInitializing(false);
    }
  };

  return (
    <>
      {/* Action row */}
      <div className="flex items-center justify-between mb-3">
        <Select value={selYear} onValueChange={setSelYear}>
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS_LIST.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-slate-600"
          onClick={handleInitialize}
          disabled={initializing}
        >
          <UserCircle className="h-4 w-4" />
          {initializing ? "Initializing..." : "Initialize Balances"}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : balances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <Users className="h-8 w-8" />
            <p className="text-sm font-medium">No leave balances for {selYear}.</p>
            <p className="text-xs">Click "Initialize Balances" to create them.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  {["Staff Member", "Annual Leave", "Sick Leave", "Maternity Leave", "Paternity Leave", "Compassionate Leave", "Unpaid Leave", "Actions"].map(h => (
                    <TableHead key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map(b => (
                  <TableRow key={b.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800">{staffName(b.payroll_staff)}</p>
                      <p className="text-xs text-slate-400">{staffPosition(b.payroll_staff)}</p>
                    </TableCell>
                    <TableCell><BalanceCell used={b.annual_leave_used} total={b.annual_leave_total} color="bg-blue-500" /></TableCell>
                    <TableCell><BalanceCell used={b.sick_leave_used} total={b.sick_leave_total} color="bg-red-500" /></TableCell>
                    <TableCell><BalanceCell used={b.maternity_leave_used} total={b.maternity_leave_total} color="bg-pink-500" /></TableCell>
                    <TableCell><BalanceCell used={b.paternity_leave_used} total={b.paternity_leave_total} color="bg-teal-500" /></TableCell>
                    <TableCell><BalanceCell used={b.compassionate_leave_used} total={b.compassionate_leave_total} color="bg-purple-500" /></TableCell>
                    <TableCell>
                      <div className="min-w-[90px]">
                        <p className="text-xs text-slate-600 font-medium">{b.unpaid_leave_used} days used</p>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                          <div className="bg-slate-400 h-1.5 rounded-full" style={{ width: b.unpaid_leave_used > 0 ? "40%" : "0%" }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        title="Edit balance"
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        onClick={() => setEditBalance(b)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <EditBalanceModal
        open={!!editBalance}
        onClose={() => setEditBalance(null)}
        balance={editBalance}
        onSuccess={() => {}}
      />
    </>
  );
}

// ─── Absences Sub-tab ─────────────────────────────────────────────────────────
function AbsencesTab({ tenantId, staffList }: { tenantId: string; staffList: StaffRow[] }) {
  const qc = useQueryClient();
  const [logOpen, setLogOpen]       = useState(false);
  const [editAbsence, setEditAbsence] = useState<Absence | null>(null);

  const { data: absences = [], isLoading } = useQuery<Absence[]>({
    queryKey: ["staff-absences", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.STAFF_ABSENCES)
        .select("*, payroll_staff:staff_id(job_title, custom_position, members(first_name, last_name))")
        .eq("org_id", tenantId)
        .order("absence_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Absence[];
    },
    staleTime: 300_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.STAFF_ABSENCES).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-absences", tenantId] });
      toast.success("Absence deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      {/* Action row */}
      <div className="flex justify-end mb-3">
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
          size="sm"
          onClick={() => setLogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Log Absence
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : absences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <CalendarDays className="h-8 w-8" />
            <p className="text-sm font-medium">No absences recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  {["Staff Member", "Date", "Reason", "Status", "Notes", "Actions"].map(h => (
                    <TableHead key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {absences.map(a => (
                  <TableRow key={a.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800">{staffName(a.payroll_staff)}</p>
                      <p className="text-xs text-slate-400">{staffPosition(a.payroll_staff)}</p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                      {a.absence_date ? format(parseISO(a.absence_date), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-[160px]">
                      <p className="truncate" title={a.reason ?? ""}>{a.reason || "—"}</p>
                    </TableCell>
                    <TableCell>{absenceStatusBadge(a.status)}</TableCell>
                    <TableCell className="text-sm text-slate-500 max-w-[160px]">
                      <p className="truncate" title={a.notes ?? ""}>{a.notes || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          title="Edit"
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                          onClick={() => setEditAbsence(a)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              title="Delete"
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this absence record?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-500 hover:bg-red-600 text-white"
                                onClick={() => deleteMutation.mutate(a.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AbsenceModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        tenantId={tenantId}
        staffList={staffList}
        onSuccess={() => {}}
      />
      <AbsenceModal
        open={!!editAbsence}
        onClose={() => setEditAbsence(null)}
        tenantId={tenantId}
        staffList={staffList}
        editData={editAbsence}
        onSuccess={() => {}}
      />
    </>
  );
}

// ─── Main LeaveTab Export ─────────────────────────────────────────────────────
export function LeaveTab({ staffList }: { staffList: StaffRow[] }) {
  const church = useChurch();
  const tenantId = church.tenantId;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
          <CalendarDays className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">Leave &amp; Absence Management</h2>
          <p className="text-xs text-slate-500">Manage leave requests, balances, and track absences</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-lg w-auto mb-4">
          <TabsTrigger value="requests" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Leave Requests
          </TabsTrigger>
          <TabsTrigger value="balances" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Leave Balances
          </TabsTrigger>
          <TabsTrigger value="absences" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Absences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <LeaveRequestsTab tenantId={tenantId} staffList={staffList} />
        </TabsContent>
        <TabsContent value="balances">
          <LeaveBalancesTab tenantId={tenantId} staffList={staffList} />
        </TabsContent>
        <TabsContent value="absences">
          <AbsencesTab tenantId={tenantId} staffList={staffList} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
