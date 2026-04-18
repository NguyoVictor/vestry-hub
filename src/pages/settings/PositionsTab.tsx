import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { Briefcase, Plus, Pencil, Trash2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Position {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  org_id: string;
  created_at: string;
}

// ─── Default positions seeded on first load ───────────────────────────────────
const DEFAULT_POSITIONS = [
  { name: "Accountant",             description: "Manages church financial records and accounts" },
  { name: "Children Ministry Lead", description: "Leads children church programs" },
  { name: "Choir Director",         description: "Leads church choir and music ministry" },
  { name: "Cleaner",                description: "Church facility maintenance" },
  { name: "Driver",                 description: "Church transportation services" },
  { name: "Media Manager",          description: "Manages church media and communications" },
  { name: "Secretary",              description: "Handles administrative tasks and correspondence" },
  { name: "Security",               description: "Church security services" },
  { name: "Treasurer",              description: "Oversees church finances and payments" },
  { name: "Youth Coordinator",      description: "Coordinates youth programs and activities" },
];

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
interface PositionModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  editData?: Position | null;
  onSuccess: () => void;
}

function PositionModal({ open, onClose, tenantId, editData, onSuccess }: PositionModalProps) {
  const qc = useQueryClient();
  const isEdit = !!editData;

  const [name, setName]           = useState(editData?.name ?? "");
  const [description, setDesc]    = useState(editData?.description ?? "");
  const [isActive, setIsActive]   = useState(editData?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (!isEdit) { setName(""); setDesc(""); setIsActive(true); }
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Position name is required."); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        is_active: isActive,
        org_id: tenantId,
      };
      if (isEdit && editData) {
        const { error } = await supabase
          .from(TABLES.STAFF_POSITIONS)
          .update(payload as never)
          .eq("id", editData.id);
        if (error) throw error;
        toast.success("Position updated successfully!");
      } else {
        const { error } = await supabase
          .from(TABLES.STAFF_POSITIONS)
          .insert(payload as never);
        if (error) throw error;
        toast.success("Position created successfully!");
      }
      qc.invalidateQueries({ queryKey: ["staff-positions", tenantId] });
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save position.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Edit Position" : "Add Position"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Position Name */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Position Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g., Accountant, Driver"
              value={name}
              onChange={e => setName(e.target.value)}
              className="focus:ring-orange-400 focus:border-orange-400"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              placeholder="Brief description of this position..."
              value={description}
              onChange={e => setDesc(e.target.value)}
              rows={3}
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="data-[state=checked]:bg-orange-500"
            />
            <Label className="text-sm font-medium cursor-pointer" onClick={() => setIsActive(v => !v)}>
              Active
            </Label>
          </div>
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
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main PositionsTab ────────────────────────────────────────────────────────
export function PositionsTab() {
  const church = useChurch();
  const tenantId = church.tenantId;
  const qc = useQueryClient();

  const [addOpen, setAddOpen]     = useState(false);
  const [editPos, setEditPos]     = useState<Position | null>(null);
  const [seeding, setSeeding]     = useState(false);

  const { data: positions = [], isLoading } = useQuery<Position[]>({
    queryKey: ["staff-positions", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.STAFF_POSITIONS)
        .select("*")
        .eq("org_id", tenantId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Position[];
    },
    staleTime: 300_000,
  });

  // Seed defaults on first load when table is empty
  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const rows = DEFAULT_POSITIONS.map(p => ({
        ...p,
        is_active: true,
        org_id: tenantId,
      }));
      const { error } = await supabase
        .from(TABLES.STAFF_POSITIONS)
        .insert(rows as never);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["staff-positions", tenantId] });
      toast.success("Default positions added.");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to seed positions.");
    } finally {
      setSeeding(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLES.STAFF_POSITIONS)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-positions", tenantId] });
      toast.success("Position deleted successfully!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Check how many active staff use this position
  const getStaffCount = async (positionName: string): Promise<number> => {
    const { count } = await supabase
      .from("payroll_staff")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("job_title", positionName)
      .eq("status", "Active");
    return count ?? 0;
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
            <Briefcase className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Staff Positions</h2>
            <p className="text-xs text-slate-500">Define and manage staff positions/roles</p>
          </div>
        </div>
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0"
          size="sm"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Position
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <Briefcase className="h-8 w-8" />
            <p className="text-sm font-medium">No positions defined yet.</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-slate-600"
              onClick={handleSeedDefaults}
              disabled={seeding}
            >
              {seeding ? "Adding..." : "Add Default Positions"}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map(pos => (
                <TableRow key={pos.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <p className="text-sm font-semibold text-slate-800">{pos.name}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-slate-500">{pos.description || "—"}</p>
                  </TableCell>
                  <TableCell>
                    {pos.is_active ? (
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 border-slate-200">
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Edit"
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        onClick={() => setEditPos(pos)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <DeletePositionButton
                        position={pos}
                        onDelete={() => deleteMutation.mutate(pos.id)}
                        getStaffCount={getStaffCount}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <PositionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        tenantId={tenantId}
        onSuccess={() => {}}
      />
      <PositionModal
        open={!!editPos}
        onClose={() => setEditPos(null)}
        tenantId={tenantId}
        editData={editPos}
        onSuccess={() => {}}
      />
    </>
  );
}

// ─── Delete button with staff-count warning ───────────────────────────────────
function DeletePositionButton({
  position,
  onDelete,
  getStaffCount,
}: {
  position: Position;
  onDelete: () => void;
  getStaffCount: (name: string) => Promise<number>;
}) {
  const [staffCount, setStaffCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const handleOpen = async () => {
    const count = await getStaffCount(position.name);
    setStaffCount(count);
    setOpen(true);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          title="Delete"
          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          onClick={e => { e.preventDefault(); handleOpen(); }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{position.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            {staffCount !== null && staffCount > 0 ? (
              <>
                <span className="text-amber-600 font-medium">
                  This position is assigned to {staffCount} staff member{staffCount !== 1 ? "s" : ""}.
                  Deleting it will remove their position assignment.
                </span>
                <br /><br />
              </>
            ) : null}
            Are you sure you want to delete this position? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-500 hover:bg-red-600 text-white"
            onClick={onDelete}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
