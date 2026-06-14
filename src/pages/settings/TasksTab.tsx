import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from '@/hooks/usePermissions';
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ClipboardList, Plus, Pencil, Trash2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Priority = "low" | "medium" | "high" | "urgent";
type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

interface StaffRow {
  id: string;
  job_title: string | null;
  custom_position: string | null;
  status: string | null;
  members?: { first_name: string | null; last_name: string | null } | null;
}

interface Task {
  id: string;
  assigned_to: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: Priority;
  status: TaskStatus;
  org_id: string;
  created_at: string;
  payroll_staff?: {
    job_title: string | null;
    custom_position: string | null;
    members?: { first_name: string | null; last_name: string | null } | null;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function staffLabel(s: StaffRow) {
  const name = s.members
    ? `${s.members.first_name ?? ""} ${s.members.last_name ?? ""}`.trim()
    : "";
  return name || s.custom_position || s.job_title || s.id;
}

function taskStaffLabel(t: Task) {
  const m = t.payroll_staff?.members;
  return m ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "—" : "—";
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    low:    "bg-blue-50 text-blue-700 border-blue-200",
    medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    high:   "bg-orange-50 text-orange-700 border-orange-200",
    urgent: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${map[priority]}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, string> = {
    pending:    "bg-slate-100 text-slate-600 border-slate-200",
    in_progress:"bg-blue-50 text-blue-700 border-blue-200",
    completed:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled:  "bg-red-50 text-red-600 border-red-200",
  };
  const labels: Record<TaskStatus, string> = {
    pending: "Pending", in_progress: "In Progress",
    completed: "Completed", cancelled: "Cancelled",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  staffList: StaffRow[];
  editData?: Task | null;
  onSuccess: () => void;
}

function TaskModal({ open, onClose, tenantId, staffList, editData, onSuccess }: TaskModalProps) {
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const isEdit = !!editData;

  const [assignedTo, setAssignedTo] = useState(editData?.assigned_to ?? "");
  const [title, setTitle]           = useState(editData?.title ?? "");
  const [description, setDesc]      = useState(editData?.description ?? "");
  const [dueDate, setDueDate]       = useState(editData?.due_date ?? "");
  const [priority, setPriority]     = useState<Priority>(editData?.priority ?? "medium");
  const [status, setStatus]         = useState<TaskStatus>(editData?.status ?? "pending");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (!isEdit) {
      setAssignedTo(""); setTitle(""); setDesc("");
      setDueDate(""); setPriority("medium"); setStatus("pending");
    }
    onClose();
  };

  const handleSubmit = async () => {
    if (readOnly) return;
    if (!assignedTo) { toast.error("Please select a staff member."); return; }
    if (!title.trim()) { toast.error("Task title is required."); return; }
    setSubmitting(true);
    try {
      const payload = {
        assigned_to: assignedTo,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        priority,
        status,
        org_id: tenantId,
      };
      if (isEdit && editData) {
        const { error } = await supabase
          .from(TABLES.STAFF_TASKS)
          .update(payload as never)
          .eq("id", editData.id);
        if (error) throw error;
        toast.success("Task updated successfully!");
      } else {
        const { error } = await supabase
          .from(TABLES.STAFF_TASKS)
          .insert(payload as never);
        if (error) throw error;
        toast.success("Task created successfully!");
      }
      qc.invalidateQueries({ queryKey: ["staff-tasks", tenantId] });
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save task.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeStaff = staffList.filter(s => s.status?.toLowerCase() === "active");

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Edit Task" : "Add Task"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Assign To */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Assign To <span className="text-red-500">*</span>
            </Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="focus:ring-orange-400">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {activeStaff.map(s => (
                  <SelectItem key={s.id} value={s.id}>{staffLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Title */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Task Title <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Enter task title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="focus:ring-orange-400 focus:border-orange-400"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              placeholder="Task details..."
              value={description}
              onChange={e => setDesc(e.target.value)}
              rows={3}
            />
          </div>

          {/* Due Date + Priority side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                placeholder="mm/dd/yyyy"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Priority</Label>
              <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status — only shown when editing */}
          {isEdit && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main TasksTab ────────────────────────────────────────────────────────────
export function TasksTab() {
  const church = useChurch();
  const tenantId = church.tenantId;
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');

  const [addOpen, setAddOpen]       = useState(false);
  const [editTask, setEditTask]     = useState<Task | null>(null);
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch active staff for filters + modal
  const { data: staffList = [] } = useQuery<StaffRow[]>({
    queryKey: ["staff-tasks-staff", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.PAYROLL_STAFF)
        .select("id, job_title, custom_position, status, members(first_name, last_name)")
        .eq("tenant_id", tenantId)
        .eq("status", "Active")
        .order("created_at", { ascending: true });
      return (data ?? []) as StaffRow[];
    },
    staleTime: 300_000,
  });

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["staff-tasks", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.STAFF_TASKS)
        .select("*, payroll_staff:assigned_to(job_title, custom_position, members(first_name, last_name))")
        .eq("org_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
    staleTime: 300_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (readOnly) return;
      const { error } = await supabase.from(TABLES.STAFF_TASKS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-tasks", tenantId] });
      toast.success("Task deleted successfully!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Client-side filtering
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterStaff !== "all" && t.assigned_to !== filterStaff) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      return true;
    });
  }, [tasks, filterStaff, filterStatus]);

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
            <ClipboardList className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Staff Tasks</h2>
            <p className="text-xs text-slate-500">Assign and track tasks for staff members</p>
          </div>
        </div>
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0"
          size="sm"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={filterStaff} onValueChange={setFilterStaff}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="All Staff" />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            <SelectItem value="all">All Staff</SelectItem>
            {staffList.map(s => (
              <SelectItem key={s.id} value={s.id}>{staffLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <ClipboardList className="h-8 w-8" />
            <p className="text-sm font-medium">No tasks found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  {["Task Title", "Assigned To", "Description", "Due Date", "Priority", "Status", "Actions"].map(h => (
                    <TableHead key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <p className="text-sm font-semibold text-slate-800">{t.title}</p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                      {taskStaffLabel(t)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm text-slate-500 truncate" title={t.description ?? ""}>
                        {t.description || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                      {t.due_date ? format(parseISO(t.due_date), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          title="Edit"
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                          onClick={() => setEditTask(t)}
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
                              <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{t.title}"? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-500 hover:bg-red-600 text-white"
                                onClick={() => deleteMutation.mutate(t.id)}
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

      <TaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        tenantId={tenantId}
        staffList={staffList}
        onSuccess={() => {}}
      />
      <TaskModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        tenantId={tenantId}
        staffList={staffList}
        editData={editTask}
        onSuccess={() => {}}
      />
    </>
  );
}
