import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertTriangle, Plus, CheckCircle, MoreVertical, Pencil, Trash2, ChevronRight, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const INCIDENT_TYPES = ["theft", "vandalism", "trespassing", "physical_altercation", "medical_emergency", "fire", "unauthorized_access", "suspicious_person", "child_safety", "data_breach", "other"];

const STATUS_STEPS = ["open", "investigating", "resolved"] as const;
type IncidentStatus = typeof STATUS_STEPS[number];

const statusColors: Record<string, string> = {
  open: "bg-destructive/10 text-destructive",
  investigating: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const EMPTY_FORM = { incident_type: "other", description: "", persons_involved: "" };

// ── Status stepper ────────────────────────────────────────────────────────────
function StatusStepper({ incident, onUpdate }: { incident: any; onUpdate: (id: string, status: string) => void }) {
  const current = STATUS_STEPS.indexOf((incident.status as IncidentStatus) || "open");

  return (
    <div className="flex items-center gap-1">
      {/* Back button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        disabled={current === 0}
        onClick={() => onUpdate(incident.id, STATUS_STEPS[current - 1])}
        title="Move back"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>

      {/* Steps */}
      {STATUS_STEPS.map((step, idx) => (
        <div key={step} className="flex items-center gap-1">
          <button
            onClick={() => idx !== current && onUpdate(incident.id, step)}
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
              idx === current
                ? statusColors[step] + " border-transparent"
                : idx < current
                ? "bg-muted text-muted-foreground border-transparent opacity-60"
                : "bg-transparent text-muted-foreground border-border hover:border-primary hover:text-primary"
            }`}
            title={`Set to ${step}`}
          >
            {step}
          </button>
          {idx < STATUS_STEPS.length - 1 && (
            <ChevronRight className={`h-3 w-3 ${idx < current ? "text-muted-foreground" : "text-border"}`} />
          )}
        </div>
      ))}

      {/* Forward button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        disabled={current === STATUS_STEPS.length - 1}
        onClick={() => onUpdate(incident.id, STATUS_STEPS[current + 1])}
        title="Move forward"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function IncidentManagement() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();

  // Sheet state — shared for create and edit
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Expanded rows for people involved
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: incidents, isLoading } = useQuery({
    queryKey: ["incidents", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("incidents")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createIncident = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("incidents").insert({
        tenant_id: tenantId,
        incident_type: form.incident_type,
        description: form.description,
        persons_involved: form.persons_involved || null,
        status: "open",
        reported_by: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Incident reported");
      setSheetOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error("Failed to report incident"),
  });

  const updateIncident = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("incidents")
        .update({
          incident_type: form.incident_type,
          description: form.description,
          persons_involved: form.persons_involved || null,
        })
        .eq("id", editingId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Incident updated");
      setSheetOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error("Failed to update incident"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "resolved") updates.resolution_notes = "Resolved";
      const { error } = await supabase.from("incidents").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteIncident = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("incidents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Incident deleted");
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete incident"),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSheetMode("create");
    setSheetOpen(true);
  }

  function openEdit(incident: any) {
    setForm({
      incident_type: incident.incident_type ?? "other",
      description: incident.description ?? "",
      persons_involved: incident.persons_involved ?? "",
    });
    setEditingId(incident.id);
    setSheetMode("edit");
    setSheetOpen(true);
  }

  function toggleRow(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (sheetMode === "edit") updateIncident.mutate();
    else createIncident.mutate();
  }

  const isMutating = createIncident.isPending || updateIncident.isPending;

  // ── Stats ──────────────────────────────────────────────────────────────────

  const openCount = incidents?.filter(i => (i.status as string) !== "resolved").length || 0;
  const thisMonth = incidents?.filter(i => {
    const d = new Date(i.incident_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length || 0;

  return (
    <div>
      <PageHeader
        title="Incident Management"
        subtitle="Log, track and resolve church security incidents"
        action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Report Incident</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Open Incidents</p><p className="text-3xl font-bold text-destructive">{openCount}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">This Month</p><p className="text-3xl font-bold">{thisMonth}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Total Incidents</p><p className="text-3xl font-bold">{incidents?.length || 0}</p></CardContent></Card>
      </div>

      {/* All Incidents table */}
      <Card>
        <CardHeader><CardTitle>All Incidents</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !incidents?.length ? (
            <div className="text-center py-12">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-lg font-medium">No incidents reported</p>
              <p className="text-muted-foreground text-sm">Report your first incident to start tracking.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>People Involved</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => {
                  const isExpanded = expandedRows.has(incident.id);
                  return (
                    <>
                      <TableRow
                        key={incident.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => toggleRow(incident.id)}
                      >
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Badge variant="secondary">{incident.incident_type.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px] text-sm">
                          <span className={isExpanded ? "" : "line-clamp-1"}>{incident.description}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[160px]">
                          {incident.persons_involved
                            ? <span className={isExpanded ? "" : "line-clamp-1"}>{incident.persons_involved}</span>
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(incident.incident_date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <StatusStepper
                            incident={incident}
                            onUpdate={(id, status) => updateStatus.mutate({ id, status })}
                          />
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(incident)}>
                                <Pencil className="h-4 w-4 mr-2" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteId(incident.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={open => {
        setSheetOpen(open);
        if (!open) { setEditingId(null); setForm(EMPTY_FORM); }
      }}>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheetMode === "edit" ? "Edit Incident" : "Report Incident"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Incident Type</Label>
              <Select value={form.incident_type} onValueChange={v => setForm(f => ({ ...f, incident_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Full description of the incident..."
                rows={5}
              />
            </div>
            <div>
              <Label>People Involved</Label>
              <Textarea
                value={form.persons_involved}
                onChange={e => setForm(f => ({ ...f, persons_involved: e.target.value }))}
                placeholder="Names and roles of people involved..."
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              disabled={!form.description || isMutating}
              onClick={handleSubmit}
            >
              {isMutating
                ? sheetMode === "edit" ? "Saving..." : "Reporting..."
                : sheetMode === "edit" ? "Save Changes" : "Report Incident"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Incident</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this incident? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteIncident.mutate(deleteId)}
              disabled={deleteIncident.isPending}
            >
              {deleteIncident.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
