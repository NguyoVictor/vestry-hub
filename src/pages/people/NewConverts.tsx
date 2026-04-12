import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus, Sparkles, Users, GraduationCap, Droplets, Heart,
  Key, Building2, CheckCircle2, QrCode, ListTodo, MoreVertical, Pencil, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// ─── Constants ────────────────────────────────────────────────────────────────

const MILESTONE_LABELS = [
  "Salvation Decision",
  "Water Baptism",
  "Membership Class",
  "Workers in Training",
  "Ministry Assignment",
];

const MILESTONE_ICONS = [Heart, Droplets, GraduationCap, Key, Building2];

const convertSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  phone: z.string().optional(),
  conversion_date: z.string().min(1, "Required"),
  counsellor_name: z.string().optional(),
  notes: z.string().optional(),
  discipleship_stage: z.string().default("1"),
  baptism_status: z.string().default("not_baptized"),
  baptism_date: z.string().optional(),
});

// ─── Milestone Dialog ─────────────────────────────────────────────────────────

interface MilestoneDialogProps {
  convert: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdvance: (id: string, nextStage: number) => void;
  advancing: boolean;
}

function MilestoneDialog({ convert, open, onOpenChange, onAdvance, advancing }: MilestoneDialogProps) {
  if (!convert) return null;
  const stage = Number(convert.discipleship_stage) || 1;
  const fullName = `${convert.first_name} ${convert.last_name || ""}`.trim();
  const savedDate = convert.salvation_date || convert.conversion_date;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Discipleship Milestones</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="font-bold text-lg uppercase tracking-wide">{fullName}</p>
            {savedDate && (
              <p className="text-sm text-muted-foreground">
                Saved: {format(new Date(savedDate), "dd MMM yyyy")}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {MILESTONE_LABELS.map((label, i) => {
              const milestoneNum = i + 1;
              const completed = stage >= milestoneNum;
              const Icon = MILESTONE_ICONS[i];
              const isNext = milestoneNum === stage + 1;

              return (
                <div key={label} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${completed ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  {completed ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                      <CheckCircle2 className="h-3 w-3 mr-1" />Completed
                    </Badge>
                  ) : isNext ? (
                    <Button
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600 text-white h-7 text-xs"
                      onClick={() => onAdvance(convert.id, milestoneNum)}
                      disabled={advancing}
                    >
                      {advancing ? "Saving..." : "Mark Complete"}
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Pending</Badge>
                  )}
                </div>
              );
            })}
          </div>

          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const NewConverts = () => {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingConvert, setEditingConvert] = useState<any | null>(null);
  const [milestoneConvert, setMilestoneConvert] = useState<any | null>(null);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [taskDialogConvert, setTaskDialogConvert] = useState<any | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", due_date: "", notes: "" });
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: converts = [], isLoading } = useQuery({
    queryKey: ["new-converts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.NEW_CONVERTS)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false }) as any;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalConverts = converts.length;
  const inDiscipleship = converts.filter((c: any) => !c.graduated_at).length;
  const baptized = converts.filter((c: any) => c.baptism_status === "completed").length;
  const completed = converts.filter((c: any) => !!c.graduated_at).length;

  // ── Filtered ───────────────────────────────────────────────────────────────
  const filtered = converts.filter((c: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${c.first_name} ${c.last_name || ""}`.toLowerCase();
    return name.includes(q) || (c.phone || "").includes(q);
  });

  // ── Form ───────────────────────────────────────────────────────────────────
  const form = useForm<z.infer<typeof convertSchema>>({
    resolver: zodResolver(convertSchema),
    defaultValues: {
      first_name: "", last_name: "", phone: "", notes: "", baptism_date: "",
      counsellor_name: "",
      discipleship_stage: "1", baptism_status: "not_baptized",
      conversion_date: new Date().toISOString().split("T")[0],
    },
  });

  const openCreate = () => {
    setEditingConvert(null);
    form.reset({
      first_name: "", last_name: "", phone: "", notes: "", baptism_date: "",
      counsellor_name: "",
      discipleship_stage: "1", baptism_status: "not_baptized",
      conversion_date: new Date().toISOString().split("T")[0],
    });
    setSheetOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingConvert(c);
    form.reset({
      first_name: c.first_name || "",
      last_name: c.last_name || "",
      phone: c.phone || "",
      notes: c.notes || "",
      baptism_date: c.baptism_date || "",
      counsellor_name: c.counsellor_name || "",
      discipleship_stage: c.discipleship_stage ? String(c.discipleship_stage) : "1",
      baptism_status: c.baptism_status || "not_baptized",
      conversion_date: c.conversion_date || c.salvation_date || new Date().toISOString().split("T")[0],
    });
    setSheetOpen(true);
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async (values: z.infer<typeof convertSchema>) => {
      if (editingConvert) {
        const { error } = await supabase.from(TABLES.NEW_CONVERTS).update({
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone || null,
          salvation_date: values.conversion_date,
          conversion_date: values.conversion_date,
          notes: values.notes || null,
          counsellor_name: values.counsellor_name || null,
          discipleship_stage: values.discipleship_stage,
          baptism_status: values.baptism_status,
          baptism_date: values.baptism_date || null,
          updated_at: new Date().toISOString(),
        } as any).eq("id", editingConvert.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.NEW_CONVERTS).insert({
          tenant_id: tenantId!,
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone || null,
          salvation_date: values.conversion_date,
          conversion_date: values.conversion_date,
          notes: values.notes || null,
          counsellor_name: values.counsellor_name || null,
          discipleship_stage: values.discipleship_stage,
          baptism_status: values.baptism_status,
          baptism_date: values.baptism_date || null,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["new-converts"] });
      toast.success(editingConvert ? "Convert updated" : "Convert added");
      setSheetOpen(false);
      setEditingConvert(null);
      form.reset();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const advanceMilestoneMut = useMutation({
    mutationFn: async ({ id, nextStage }: { id: string; nextStage: number }) => {
      const isGraduating = nextStage === 5;
      const updates: any = {
        discipleship_stage: String(nextStage),
        updated_at: new Date().toISOString(),
      };
      if (nextStage === 2) updates.baptism_status = "completed";
      if (isGraduating) updates.graduated_at = new Date().toISOString();
      const { error } = await supabase.from(TABLES.NEW_CONVERTS).update(updates as any).eq("id", id);
      if (error) throw error;
      return { isGraduating, nextStage };
    },
    onSuccess: ({ isGraduating }, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["new-converts"] });
      const convert = converts.find((c: any) => c.id === id);
      const name = convert ? `${convert.first_name} ${convert.last_name || ""}`.trim() : "Convert";
      if (isGraduating) {
        toast.success(`Congratulations! ${name} has completed all milestones`);
        setMilestoneOpen(false);
      } else {
        toast.success("Milestone marked complete");
        // Refresh the milestone convert data
        setMilestoneConvert((prev: any) => prev ? { ...prev, discipleship_stage: String(isGraduating ? 5 : Number(prev.discipleship_stage) + 1) } : prev);
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createTaskMut = useMutation({
    mutationFn: async () => {
      if (!taskDialogConvert) return;
      const { error } = await supabase.from(TABLES.FOLLOW_UP_TASKS).insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId!,
        title: taskForm.title,
        description: taskForm.notes || null,
        due_date: taskForm.due_date || null,
        status: "open",
        priority: "medium",
        created_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task created");
      setTaskDialogOpen(false);
      setTaskForm({ title: "", due_date: "", notes: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const bapStatus = form.watch("baptism_status");

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.NEW_CONVERTS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["new-converts"] });
      toast.success("Convert deleted");
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openMilestones = (c: any) => {
    setMilestoneConvert(c);
    setMilestoneOpen(true);
  };

  const openTaskDialog = (c: any) => {
    setTaskDialogConvert(c);
    setTaskForm({ title: "", due_date: "", notes: "" });
    setTaskDialogOpen(true);
  };

  const statCards = [
    { label: "Total Converts", value: totalConverts, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { label: "In Discipleship", value: inDiscipleship, icon: Sparkles, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Baptized", value: baptized, icon: Droplets, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Completed", value: completed, icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  ];

  return (
    <>
      <Helmet><title>New Converts — Vestry</title></Helmet>
      <PageHeader
        title="New Converts"
        subtitle="Manage spiritual growth journeys for new believers"
        action={
          <div className="flex gap-2">
            <Button variant="outline">
              <QrCode className="h-4 w-4 mr-2" />New Convert QR
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />Add New Convert
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`rounded-lg p-2.5 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                {isLoading ? <Skeleton className="h-7 w-10 mb-1" /> : <p className="text-2xl font-bold">{value}</p>}
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search converts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">{search ? "No converts match your search" : "No new converts yet"}</p>
          {!search && <p className="text-sm text-muted-foreground mt-1">Add your first convert to begin discipleship tracking.</p>}
          {!search && <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Convert</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c: any) => {
            const stage = Number(c.discipleship_stage) || 1;
            const progress = (stage / 5) * 100;
            const fullName = `${c.first_name} ${c.last_name || ""}`.trim();
            const savedDate = c.salvation_date || c.conversion_date;

            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold uppercase tracking-wide text-sm">{fullName}</p>
                      {c.phone && <p className="text-xs text-muted-foreground mt-0.5">{c.phone}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(c.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap gap-2 text-xs items-center">
                    <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100">In Discipleship</Badge>
                    {savedDate && <span className="text-muted-foreground">Saved: {format(new Date(savedDate), "dd MMM yyyy")}</span>}
                    {c.counsellor_name && (
                      <span className="text-muted-foreground">· Counsellor: <span className="font-medium text-foreground">{c.counsellor_name}</span></span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Discipleship Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Milestone icons with labels */}
                  <div className="grid grid-cols-5 gap-1">
                    {MILESTONE_LABELS.map((label, i) => {
                      const Icon = MILESTONE_ICONS[i];
                      const done = stage >= i + 1;
                      const shortLabels = ["Salvation", "Baptism", "Membership", "Training", "Ministry"];
                      return (
                        <div key={label} className="flex flex-col items-center gap-1" title={label}>
                          <div className={`p-1.5 rounded-full ${done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className={`text-[9px] text-center leading-tight ${done ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                            {shortLabels[i]}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action buttons — stacked to prevent overflow */}
                  <div className="space-y-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-8"
                      onClick={() => openMilestones(c)}
                    >
                      View &amp; Update Milestones
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => openTaskDialog(c)}
                      >
                        <ListTodo className="h-3.5 w-3.5 mr-1" />View Tasks
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs h-8 bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => openTaskDialog(c)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />Create Task
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Milestone Dialog */}
      <MilestoneDialog
        convert={milestoneConvert}
        open={milestoneOpen}
        onOpenChange={setMilestoneOpen}
        onAdvance={(id, nextStage) => advanceMilestoneMut.mutate({ id, nextStage })}
        advancing={advanceMilestoneMut.isPending}
      />

      {/* Create Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {taskDialogConvert ? `Create Task — ${taskDialogConvert.first_name} ${taskDialogConvert.last_name || ""}`.trim() : "Create Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Task Title *</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Follow up on baptism" />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={taskForm.notes} onChange={e => setTaskForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Additional notes..." />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => createTaskMut.mutate()}
                disabled={createTaskMut.isPending || !taskForm.title}
              >
                {createTaskMut.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={v => { setSheetOpen(v); if (!v) setEditingConvert(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingConvert ? "Edit Convert" : "Add New Convert"}</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => saveMut.mutate(v))} className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="first_name" render={({ field }) => (
                  <FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="last_name" render={({ field }) => (
                  <FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="conversion_date" render={({ field }) => (
                <FormItem><FormLabel>Salvation Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="counsellor_name" render={({ field }) => (
                <FormItem><FormLabel>Counsellor Name</FormLabel><FormControl><Input {...field} placeholder="Name of counsellor" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="baptism_status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Baptism Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="not_baptized">Not Baptized</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {(bapStatus === "scheduled" || bapStatus === "completed") && (
                <FormField control={form.control} name="baptism_date" render={({ field }) => (
                  <FormItem><FormLabel>Baptism Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} placeholder="Conversion story..." rows={3} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={saveMut.isPending}>
                  {saveMut.isPending ? "Saving..." : editingConvert ? "Update Convert" : "Add Convert"}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Convert</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this convert? All their discipleship progress will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default NewConverts;
