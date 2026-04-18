import { Helmet } from "react-helmet-async";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { useCurrency } from "@/hooks/useCurrency";
import { TABLES, COLS } from "@/lib/schema";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
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
  UserCheck, DollarSign, CalendarDays, Briefcase, ClipboardList,
  UserPlus, Pencil, Trash2, Eye, EyeOff, Users,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const WORK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DEFAULT_WORK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Volunteer", "Contract", "Intern"];
const STAFF_STATUSES   = ["Active", "Inactive", "On Leave", "Terminated"];
const PAY_FREQUENCIES  = ["Weekly", "Bi-weekly", "Monthly", "Annually"];

// ─── Types ────────────────────────────────────────────────────────────────────
interface MemberRow { id: string; first_name: string | null; last_name: string | null; email: string | null; }

interface StaffRow {
  id: string;
  member_id: string | null;
  job_title: string | null;
  custom_position: string | null;
  employment_type: string | null;
  status: string | null;
  gross_salary: number;
  pay_frequency: string | null;
  payment_day: number | null;
  work_days: string[] | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  staff_id_number: string | null;
  department: string | null;
  supervisor_id: string | null;
  tax_id: string | null;
  bank_name: string | null;
  account_number: string | null;
  routing_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_relationship: string | null;
  probation_end_date: string | null;
  contract_renewal_date: string | null;
  annual_leave_days: number | null;
  sick_leave_days: number | null;
  health_insurance: boolean | null;
  pension_contribution: boolean | null;
  tenant_id: string;
  // joined
  members?: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

function PasswordInput({ placeholder, value, onChange, className }: {
  placeholder: string; value: string; onChange: (v: string) => void; className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`pr-9 ${className ?? ""}`}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, string> = {
    active:     "bg-emerald-50 text-emerald-700 border-emerald-200",
    inactive:   "bg-slate-100 text-slate-500 border-slate-200",
    "on leave": "bg-amber-50 text-amber-700 border-amber-200",
    terminated: "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[s] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
      {status ?? "—"}
    </span>
  );
}

function EmpTypeBadge({ type }: { type: string | null }) {
  const t = (type ?? "").toLowerCase();
  const map: Record<string, string> = {
    "full time":  "bg-blue-50 text-blue-700 border-blue-200",
    "part time":  "bg-purple-50 text-purple-700 border-purple-200",
    volunteer:    "bg-emerald-50 text-emerald-700 border-emerald-200",
    contract:     "bg-orange-50 text-orange-700 border-orange-200",
    intern:       "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[t] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
      {type ?? "—"}
    </span>
  );
}

// ─── Add/Edit Staff Modal ─────────────────────────────────────────────────────
interface StaffFormState {
  member_id: string;
  job_title: string;
  custom_position: string;
  employment_type: string;
  status: string;
  gross_salary: string;
  pay_frequency: string;
  payment_day: string;
  work_days: string[];
  start_date: string;
  end_date: string;
  notes: string;
  staff_id_number: string;
  department: string;
  supervisor_id: string;
  tax_id: string;
  bank_name: string;
  account_number: string;
  routing_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_relationship: string;
  probation_end_date: string;
  contract_renewal_date: string;
  annual_leave_days: string;
  sick_leave_days: string;
  health_insurance: boolean;
  pension_contribution: boolean;
}

const EMPTY_FORM: StaffFormState = {
  member_id: "", job_title: "", custom_position: "",
  employment_type: "Full Time", status: "Active",
  gross_salary: "0", pay_frequency: "Monthly", payment_day: "1",
  work_days: [...DEFAULT_WORK_DAYS],
  start_date: format(new Date(), "yyyy-MM-dd"), end_date: "", notes: "",
  staff_id_number: "", department: "", supervisor_id: "",
  tax_id: "", bank_name: "", account_number: "", routing_number: "",
  emergency_contact_name: "", emergency_contact_phone: "", emergency_relationship: "",
  probation_end_date: "", contract_renewal_date: "",
  annual_leave_days: "14", sick_leave_days: "10",
  health_insurance: false, pension_contribution: false,
};

interface AddStaffModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  members: MemberRow[];
  staffList: StaffRow[];
  editData?: StaffRow | null;
  onSuccess: () => void;
}

function AddStaffModal({ open, onClose, tenantId, members, staffList, editData, onSuccess }: AddStaffModalProps) {
  const qc = useQueryClient();
  const { symbol } = useCurrency();
  const isEdit = !!editData;

  const [form, setForm] = useState<StaffFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Populate form when editing
  useState(() => {
    if (editData) {
      setForm({
        member_id: editData.member_id ?? "",
        job_title: editData.job_title ?? "",
        custom_position: editData.custom_position ?? "",
        employment_type: editData.employment_type ?? "Full Time",
        status: editData.status ?? "Active",
        gross_salary: String(editData.gross_salary ?? 0),
        pay_frequency: editData.pay_frequency ?? "Monthly",
        payment_day: String(editData.payment_day ?? 1),
        work_days: editData.work_days ?? [...DEFAULT_WORK_DAYS],
        start_date: editData.start_date ?? format(new Date(), "yyyy-MM-dd"),
        end_date: editData.end_date ?? "",
        notes: editData.notes ?? "",
        staff_id_number: editData.staff_id_number ?? "",
        department: editData.department ?? "",
        supervisor_id: editData.supervisor_id ?? "",
        tax_id: editData.tax_id ?? "",
        bank_name: editData.bank_name ?? "",
        account_number: editData.account_number ?? "",
        routing_number: editData.routing_number ?? "",
        emergency_contact_name: editData.emergency_contact_name ?? "",
        emergency_contact_phone: editData.emergency_contact_phone ?? "",
        emergency_relationship: editData.emergency_relationship ?? "",
        probation_end_date: editData.probation_end_date ?? "",
        contract_renewal_date: editData.contract_renewal_date ?? "",
        annual_leave_days: String(editData.annual_leave_days ?? 14),
        sick_leave_days: String(editData.sick_leave_days ?? 10),
        health_insurance: editData.health_insurance ?? false,
        pension_contribution: editData.pension_contribution ?? false,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  });

  const set = (key: keyof StaffFormState, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleWorkDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      work_days: prev.work_days.includes(day)
        ? prev.work_days.filter(d => d !== day)
        : [...prev.work_days, day],
    }));
  };

  const handleSubmit = async () => {
    if (!form.member_id) { toast.error("Please select a member."); return; }
    if (!form.start_date) { toast.error("Start date is required."); return; }
    setSubmitting(true);
    try {
      const payload = {
        member_id: form.member_id,
        job_title: form.job_title || null,
        custom_position: form.custom_position || null,
        employment_type: form.employment_type,
        status: form.status,
        gross_salary: parseFloat(form.gross_salary) || 0,
        net_salary: parseFloat(form.gross_salary) || 0,
        pay_frequency: form.pay_frequency,
        payment_day: parseInt(form.payment_day) || 1,
        work_days: form.work_days,
        start_date: form.start_date,
        end_date: form.end_date || null,
        notes: form.notes || null,
        staff_id_number: form.staff_id_number || null,
        department: form.department || null,
        supervisor_id: form.supervisor_id || null,
        tax_id: form.tax_id || null,
        bank_name: form.bank_name || null,
        account_number: form.account_number || null,
        routing_number: form.routing_number || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        emergency_relationship: form.emergency_relationship || null,
        probation_end_date: form.probation_end_date || null,
        contract_renewal_date: form.contract_renewal_date || null,
        annual_leave_days: parseInt(form.annual_leave_days) || 14,
        sick_leave_days: parseInt(form.sick_leave_days) || 10,
        health_insurance: form.health_insurance,
        pension_contribution: form.pension_contribution,
        tenant_id: tenantId,
      };

      if (isEdit && editData) {
        const { error } = await supabase.from(TABLES.PAYROLL_STAFF).update(payload as never).eq(COLS.ID, editData.id);
        if (error) throw error;
        toast.success("Staff member updated!");
      } else {
        const { error } = await supabase.from(TABLES.PAYROLL_STAFF).insert(payload as never);
        if (error) throw error;
        toast.success("Staff member added successfully!");
      }
      qc.invalidateQueries({ queryKey: ["settings-staff", tenantId] });
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{isEdit ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {isEdit ? "Update staff member details." : "Fill in the details to add a new staff member."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* ── SECTION 1: BASIC INFO ── */}
          {/* Row 1: Select Member + Position */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Select Member <span className="text-red-500">*</span></Label>
              <Select value={form.member_id} onValueChange={v => set("member_id", v)}>
                <SelectTrigger className="focus:ring-orange-400">
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {`${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.email || m.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Position</Label>
              <Select value={form.job_title} onValueChange={v => set("job_title", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {["Pastor", "Associate Pastor", "Worship Leader", "Youth Pastor", "Administrator",
                    "Finance Officer", "Communications", "Children's Minister", "Counselor", "Evangelist"].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Position */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Or Custom Position</Label>
            <Input
              placeholder="Enter custom position title"
              value={form.custom_position}
              onChange={e => set("custom_position", e.target.value)}
            />
          </div>

          {/* Employment Type + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Employment Type <span className="text-red-500">*</span></Label>
              <Select value={form.employment_type} onValueChange={v => set("employment_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAFF_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Salary + Frequency + Payment Day */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Salary Amount ({symbol})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.gross_salary}
                onChange={e => set("gross_salary", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Payment Frequency</Label>
              <Select value={form.pay_frequency} onValueChange={v => set("pay_frequency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAY_FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Payment Day</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={form.payment_day}
                onChange={e => set("payment_day", e.target.value)}
              />
            </div>
          </div>

          {/* Work Days */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Work Days</Label>
            <div className="flex gap-2 flex-wrap">
              {WORK_DAYS.map(day => {
                const active = form.work_days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWorkDay(day)}
                    className={`flex h-8 w-12 items-center justify-center rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Date + End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Start Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={e => set("start_date", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">End Date (Optional)</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={e => set("end_date", e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea
              placeholder="Additional notes about this staff member..."
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              rows={3}
            />
          </div>

          {/* ── SECTION 2: HR INFORMATION ── */}
          <SectionDivider title="HR Information" />

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Staff ID / Employee Number</Label>
              <Input placeholder="e.g., EMP001" value={form.staff_id_number} onChange={e => set("staff_id_number", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Department</Label>
              <Input placeholder="e.g., Administration" value={form.department} onChange={e => set("department", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Supervisor</Label>
              <Select value={form.supervisor_id} onValueChange={v => set("supervisor_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
                <SelectContent>
                  {staffList.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.members
                        ? `${s.members.first_name ?? ""} ${s.members.last_name ?? ""}`.trim()
                        : s.job_title ?? s.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tax ID / SSN</Label>
            <PasswordInput
              placeholder="Tax identification number"
              value={form.tax_id}
              onChange={v => set("tax_id", v)}
              className="max-w-xs"
            />
          </div>

          {/* ── SECTION 3: BANKING ── */}
          <SectionDivider title="Banking Information (for Payroll)" />

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Bank Name</Label>
              <Input placeholder="Bank name" value={form.bank_name} onChange={e => set("bank_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Account Number</Label>
              <PasswordInput placeholder="Account number" value={form.account_number} onChange={v => set("account_number", v)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Routing Number</Label>
              <Input placeholder="Routing number" value={form.routing_number} onChange={e => set("routing_number", e.target.value)} />
            </div>
          </div>

          {/* ── SECTION 4: EMERGENCY CONTACT ── */}
          <SectionDivider title="Emergency Contact" />

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Contact Name</Label>
              <Input placeholder="Full name" value={form.emergency_contact_name} onChange={e => set("emergency_contact_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Contact Phone</Label>
              <Input placeholder="Phone number" value={form.emergency_contact_phone} onChange={e => set("emergency_contact_phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Relationship</Label>
              <Input placeholder="e.g., Spouse, Parent" value={form.emergency_relationship} onChange={e => set("emergency_relationship", e.target.value)} />
            </div>
          </div>

          {/* ── SECTION 5: CONTRACT & PROBATION ── */}
          <SectionDivider title="Contract & Probation" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Probation End Date</Label>
              <Input type="date" value={form.probation_end_date} onChange={e => set("probation_end_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Contract Renewal Date</Label>
              <Input type="date" value={form.contract_renewal_date} onChange={e => set("contract_renewal_date", e.target.value)} />
            </div>
          </div>

          {/* ── SECTION 6: LEAVE & BENEFITS ── */}
          <SectionDivider title="Leave Entitlements & Benefits" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Annual Leave Days</Label>
              <Input type="number" min="0" value={form.annual_leave_days} onChange={e => set("annual_leave_days", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Sick Leave Days</Label>
              <Input type="number" min="0" value={form.sick_leave_days} onChange={e => set("sick_leave_days", e.target.value)} />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.health_insurance}
                onChange={e => set("health_insurance", e.target.checked)}
                className="accent-orange-500 h-4 w-4"
              />
              <span className="text-sm text-slate-700">Health Insurance</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.pension_contribution}
                onChange={e => set("pension_contribution", e.target.checked)}
                className="accent-orange-500 h-4 w-4"
              />
              <span className="text-sm text-slate-700">Pension Contribution</span>
            </label>
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
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Staff"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Staff Tab Content ────────────────────────────────────────────────────────
function StaffTab() {
  const church = useChurch();
  const { format: fmtCurrency } = useCurrency();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffRow | null>(null);

  // Fetch staff
  const { data: staffList = [], isLoading } = useQuery<StaffRow[]>({
    queryKey: ["settings-staff", church.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.PAYROLL_STAFF)
        .select("*, members(first_name, last_name, email)")
        .eq(COLS.TENANT_ID, church.tenantId)
        .order(COLS.CREATED_AT, { ascending: false });
      if (error) throw error;
      return (data ?? []) as StaffRow[];
    },
    staleTime: 300_000,
  });

  // Fetch members for the modal
  const { data: members = [] } = useQuery<MemberRow[]>({
    queryKey: ["all-members-staff", church.tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.MEMBERS)
        .select("id, first_name, last_name, email")
        .eq(COLS.TENANT_ID, church.tenantId)
        .order(COLS.FIRST_NAME, { ascending: true })
        .limit(500);
      return (data ?? []) as MemberRow[];
    },
    staleTime: 300_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.PAYROLL_STAFF).delete().eq(COLS.ID, id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings-staff", church.tenantId] });
      toast.success("Staff member removed.");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to delete."),
  });

  const getStaffName = (s: StaffRow) =>
    s.members
      ? `${s.members.first_name ?? ""} ${s.members.last_name ?? ""}`.trim() || "—"
      : "—";

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Staff Members</h2>
          <p className="text-xs text-slate-500">Manage church staff, salaries, and employment details</p>
        </div>
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0"
          size="sm"
          onClick={() => setAddOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {/* Table / Empty */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : staffList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Users className="h-10 w-10" />
            <p className="text-sm font-medium">No staff members yet.</p>
            <p className="text-xs">Add your first staff member above.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Position</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employment Type</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Department</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Start Date</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList.map(s => (
                <TableRow key={s.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{getStaffName(s)}</p>
                      <p className="text-xs text-slate-400">{s.members?.email ?? "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {s.custom_position || s.job_title || "—"}
                  </TableCell>
                  <TableCell><EmpTypeBadge type={s.employment_type} /></TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell className="text-sm text-slate-500 hidden md:table-cell">{s.department ?? "—"}</TableCell>
                  <TableCell className="text-sm text-slate-500 hidden lg:table-cell">
                    {s.start_date ? format(new Date(s.start_date), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Edit"
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        onClick={() => setEditStaff(s)}
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
                            <AlertDialogTitle>Remove {getStaffName(s)}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this staff record. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-500 hover:bg-red-600 text-white"
                              onClick={() => deleteMutation.mutate(s.id)}
                            >
                              Remove
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
        )}
      </div>

      {/* Modals */}
      <AddStaffModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        tenantId={church.tenantId}
        members={members}
        staffList={staffList}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["settings-staff", church.tenantId] })}
      />
      <AddStaffModal
        open={!!editStaff}
        onClose={() => setEditStaff(null)}
        tenantId={church.tenantId}
        members={members}
        staffList={staffList}
        editData={editStaff}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["settings-staff", church.tenantId] })}
      />
    </>
  );
}

// ─── Placeholder tabs ─────────────────────────────────────────────────────────
function PlaceholderTab({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
      <Icon className="h-10 w-10" />
      <p className="text-sm font-medium">{label} coming soon</p>
    </div>
  );
}

// ─── Main Staff Page ──────────────────────────────────────────────────────────
const StaffPage = () => (
  <>
    <Helmet><title>Staff — Vestry</title></Helmet>
    <Tabs defaultValue="staff" className="w-full">
      <TabsList className="mb-6 bg-slate-100 p-1 rounded-lg w-auto">
        <TabsTrigger value="staff" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
          <UserCheck className="h-4 w-4" />Staff
        </TabsTrigger>
        <TabsTrigger value="payroll" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
          <DollarSign className="h-4 w-4" />Payroll
        </TabsTrigger>
        <TabsTrigger value="leave" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
          <CalendarDays className="h-4 w-4" />Leave
        </TabsTrigger>
        <TabsTrigger value="positions" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
          <Briefcase className="h-4 w-4" />Positions
        </TabsTrigger>
        <TabsTrigger value="tasks" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
          <ClipboardList className="h-4 w-4" />Tasks
        </TabsTrigger>
      </TabsList>

      <TabsContent value="staff"><StaffTab /></TabsContent>
      <TabsContent value="payroll"><PlaceholderTab icon={DollarSign} label="Payroll" /></TabsContent>
      <TabsContent value="leave"><PlaceholderTab icon={CalendarDays} label="Leave" /></TabsContent>
      <TabsContent value="positions"><PlaceholderTab icon={Briefcase} label="Positions" /></TabsContent>
      <TabsContent value="tasks"><PlaceholderTab icon={ClipboardList} label="Tasks" /></TabsContent>
    </Tabs>
  </>
);

export default StaffPage;
