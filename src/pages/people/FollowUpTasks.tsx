import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, ClipboardList, LayoutGrid, LayoutList, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { format, isPast } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const taskSchema = z.object({
  title: z.string().min(1, "Required").max(200),
  description: z.string().optional(),
  priority: z.string().default("medium"),
  status: z.string().default("open"),
  due_date: z.string().min(1, "Required"),
});

const STATUSES = ["open", "in_progress", "completed"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

const FollowUpTasks = () => {
  const { tenantId, userId } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('member_management');
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [dragId, setDragId] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["follow-up-tasks", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_up_tasks")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const { data: visitors = [] } = useQuery({
    queryKey: ["visitors-for-tasks", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("visitors")
        .select("id, first_name, last_name, phone, email, follow_up_status")
        .eq("tenant_id", tenantId!);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const { data: converts = [] } = useQuery({
    queryKey: ["converts-for-tasks", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("new_converts")
        .select("id, first_name, last_name")
        .eq("tenant_id", tenantId!);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", priority: "medium", status: "open", due_date: "" },
  });

  const openCreate = () => {
    setEditingTask(null);
    form.reset({ title: "", description: "", priority: "medium", status: "open", due_date: "" });
    setSheetOpen(true);
  };

  const openEdit = (task: any) => {
    setEditingTask(task);
    form.reset({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      due_date: task.due_date || "",
    });
    setSheetOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async (values: z.infer<typeof taskSchema>) => {
      if (readOnly) return;
      if (editingTask) {
        const { error } = await supabase
          .from("follow_up_tasks")
          .update({ ...values, updated_at: new Date().toISOString() } as any)
          .eq("id", editingTask.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follow_up_tasks").insert({
          ...values,
          tenant_id: tenantId!,
          created_by: userId,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-up-tasks"] });
      toast.success(editingTask ? "Task updated" : "Task created");
      setSheetOpen(false);
      setEditingTask(null);
      form.reset();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (readOnly) {
        toast.error("You don't have permission to update tasks");
        return;
      }
      const { error } = await supabase
        .from("follow_up_tasks")
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["follow-up-tasks"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      if (readOnly) return;
      const { error } = await supabase.from("follow_up_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-up-tasks"] });
      toast.success("Task deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const onDragStart = (e: React.DragEvent, id: string) => { setDragId(id); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const onDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!dragId) return;
    if (readOnly) {
      toast.error("You don't have permission to update tasks");
      setDragId(null);
      return;
    }
    const task = tasks.find((t: any) => t.id === dragId);
    if (task && (task as any).status !== targetStatus) updateStatusMut.mutate({ id: dragId, status: targetStatus });
    setDragId(null);
  };

  const enrichedTasks = tasks.map((t: any) => ({    ...t,
    isOverdue: t.status !== "completed" && t.due_date && isPast(new Date(t.due_date)),
  }));

  const kanbanCols = [
    { key: "open", label: "To Do", color: "bg-muted" },
    { key: "in_progress", label: "In Progress", color: "bg-blue-100 dark:bg-blue-900/30" },
    { key: "completed", label: "Completed", color: "bg-emerald-100 dark:bg-emerald-900/30" },
  ];

  const TaskMenu = ({ task }: { task: any }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={e => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(task); }}>
          <Pencil className="h-4 w-4 mr-2" />Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={(e) => { e.stopPropagation(); deleteMut.mutate(task.id); }}
        >
          <Trash2 className="h-4 w-4 mr-2" />Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const columns: Column<any>[] = [
    { key: "title", header: "Task", sortable: true, render: (r) => <span className="font-medium">{r.title}</span> },
    { key: "priority", header: "Priority", sortable: true, render: (r) => <StatusBadge status={r.priority} /> },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "due_date", header: "Due Date", sortable: true,
      render: (r) => (
        <span className={`text-sm ${r.isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
          {r.due_date ? format(new Date(r.due_date), "dd MMM yyyy") : "—"}
          {r.isOverdue && <span className="ml-1 text-[10px]">(overdue)</span>}
        </span>
      ),
    },
    {
      key: "actions", header: "",
      render: (r) => <TaskMenu task={r} />,
    },
  ];

  return (
    <>
      <Helmet><title>Follow-Up Tasks — Vestry</title></Helmet>
      <PageHeader title="Follow-Up Tasks" subtitle="Assign and track member, church and visitor follow-ups" />

      <div className="flex gap-2 mb-4 justify-end -mt-8">
        <div className="flex border rounded-md">
          <Button variant={viewMode === "kanban" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("kanban")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("table")}><LayoutList className="h-4 w-4" /></Button>
        </div>
        <PermissionButton permission="member_management" readOnly={readOnly} onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Task</PermissionButton>
      </div>

      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanCols.map(col => {
            const colTasks = enrichedTasks.filter((t: any) => t.status === col.key);
            return (
              <div key={col.key} onDragOver={onDragOver} onDrop={e => onDrop(e, col.key)}>
                <div className={`rounded-t-lg px-3 py-2 ${col.color} flex items-center justify-between`}>
                  <span className="font-medium text-sm">{col.label}</span>
                  <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">drag to move</span>
                </div>
                <ScrollArea className="border border-t-0 rounded-b-lg" style={{ height: "calc(100vh - 220px)" }}>
                  <div className="p-2 space-y-2">
                    {colTasks.length === 0 && (
                      <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center text-sm text-muted-foreground">Drop here</div>
                    )}
                    {colTasks.map((task: any) => (
                      <Card key={task.id} draggable onDragStart={e => onDragStart(e, task.id)} className="hover:shadow-sm transition-shadow cursor-grab active:cursor-grabbing select-none">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {task.related_convert_id && (() => {
                                const convert = converts.find((c: any) => c.id === task.related_convert_id);
                                if (!convert) return null;
                                const convertName = `${convert.first_name} ${convert.last_name || ""}`.trim();
                                return (
                                  <p className="text-xs text-muted-foreground/60 mb-0.5">
                                    {convertName} <span className="font-medium text-muted-foreground/40">(CONVERT)</span>
                                  </p>
                                );
                              })()}
                              <span className="font-medium text-sm leading-snug">{task.title}</span>
                            </div>
                            <TaskMenu task={task} />
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}
                          {task.related_visitor_id && (() => {
                            const visitor = visitors.find((v: any) => v.id === task.related_visitor_id);
                            if (!visitor) return null;
                            return (
                              <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2 text-xs space-y-0.5">
                                <p className="font-medium text-amber-800 dark:text-amber-400 flex items-center gap-1">
                                  <span>👤</span> Visitor Follow-up
                                </p>
                                <p className="text-amber-700 dark:text-amber-300">{visitor.first_name} {visitor.last_name || ""}</p>
                                {visitor.phone && <p className="text-amber-600">{visitor.phone}</p>}
                                {visitor.email && <p className="text-amber-600">{visitor.email}</p>}
                              </div>
                            );
                          })()}
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={task.priority} />
                            {task.isOverdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                          </div>
                          {task.due_date && (
                            <div className={`text-xs ${task.isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                              {format(new Date(task.due_date), "dd MMM yyyy")}
                            </div>
                          )}
                          <div className="flex gap-1 flex-wrap">
                            {STATUSES.filter(s => s !== task.status).map(s => (
                              <Button
                                key={s}
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs capitalize px-2"
                                disabled={readOnly}
                                onClick={() => updateStatusMut.mutate({ id: task.id, status: s })}
                              >
                                {s.replace(/_/g, " ")}
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      ) : (
        <DataTable
          data={enrichedTasks}
          columns={columns}
          loading={isLoading}
          getRowId={(r) => r.id}
          searchPlaceholder="Search tasks..."
          emptyIcon={<ClipboardList className="h-12 w-12 text-muted-foreground/40" />}
          emptyTitle="No follow-up tasks"
          emptyDescription="Create your first follow-up task."
          emptyCta={<PermissionButton permission="member_management" readOnly={readOnly} onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Task</PermissionButton>}
        />
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={v => { setSheetOpen(v); if (!v) setEditingTask(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            {editingTask?.related_visitor_id ? (() => {
              const v = visitors.find((v: any) => v.id === editingTask.related_visitor_id);
              const vName = v ? `${v.first_name} ${v.last_name || ""}`.trim() : "Visitor";
              return (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <SheetTitle>{vName}</SheetTitle>
                    <span className="text-xs text-muted-foreground/50 font-normal uppercase tracking-wide">(VISITOR)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Edit follow-up task</p>
                </div>
              );
            })() : (
              <SheetTitle>{editingTask ? "Edit Task" : "Create Task"}</SheetTitle>
            )}
          </SheetHeader>

          {/* ── Visitor-specific edit form ── */}
          {editingTask?.related_visitor_id ? (() => {
            const v = visitors.find((vv: any) => vv.id === editingTask.related_visitor_id);
            const vName = v ? `${v.first_name} ${v.last_name || ""}`.trim() : "Unknown Visitor";
            const TASK_TYPES = [
              "Welcome Call",
              "Welcome SMS/WhatsApp",
              "Prayer Support Call",
              "Verify/Confirm Contact Details",
              "Invite Back to Next Service",
              "Custom Task",
            ];
            return (
              <Form {...form}>
                <div className="space-y-4 mt-6">
                  {/* Visitor name — read only */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Visitor</label>
                    <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                      {vName}
                    </div>
                  </div>
                  {/* Task Type */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Task Type *</label>
                    <Select
                      value={form.getValues("title")}
                      onValueChange={v => form.setValue("title", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select task type" /></SelectTrigger>
                      <SelectContent>
                        {TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Due Date */}
                  <FormField control={form.control} name="due_date" render={({ field }) => (
                    <FormItem><FormLabel>Due Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  {/* Notes */}
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Notes (optional)</FormLabel><FormControl><Textarea {...field} rows={3} placeholder="Add any additional notes..." /></FormControl><FormMessage /></FormItem>
                  )} />
                  {/* Status */}
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
                    <Button
                      type="button"
                      className="flex-1"
                      disabled={saveMut.isPending}
                      onClick={() => form.handleSubmit(v => saveMut.mutate(v))()}
                    >
                      {saveMut.isPending ? "Saving..." : "Update Task"}
                    </Button>
                  </div>
                </div>
              </Form>
            );
          })() : (
            /* ── Generic form ── */
            <Form {...form}>
              <form onSubmit={form.handleSubmit(v => saveMut.mutate(v))} className="space-y-4 mt-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="due_date" render={({ field }) => (
                  <FormItem><FormLabel>Due Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={saveMut.isPending}>
                    {saveMut.isPending ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default FollowUpTasks;
