import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, ClipboardList, LayoutGrid, LayoutList, GripVertical } from "lucide-react";
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
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["follow-up-tasks", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("follow_up_tasks").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const form = useForm<z.infer<typeof taskSchema>>({ resolver: zodResolver(taskSchema), defaultValues: { title: "", priority: "medium", status: "open" } });

  const createMut = useMutation({
    mutationFn: async (values: z.infer<typeof taskSchema>) => {
      const { error } = await supabase.from("follow_up_tasks").insert({
        ...values,
        tenant_id: tenantId!,
        created_by: userId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["follow-up-tasks"] }); toast.success("Task created"); setSheetOpen(false); form.reset(); },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("follow_up_tasks").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["follow-up-tasks"] }); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await supabase.from("follow_up_tasks").delete().eq("id", id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["follow-up-tasks"] }); toast.success("Task deleted"); },
  });

  // Add overdue detection
  const enrichedTasks = tasks.map((t: any) => ({
    ...t,
    isOverdue: t.status !== "completed" && t.due_date && isPast(new Date(t.due_date)),
  }));

  const kanbanCols = [
    { key: "open", label: "To Do", color: "bg-muted" },
    { key: "in_progress", label: "In Progress", color: "bg-blue-100 dark:bg-blue-900/30" },
    { key: "completed", label: "Completed", color: "bg-emerald-100 dark:bg-emerald-900/30" },
  ];

  const columns: Column<any>[] = [
    { key: "title", header: "Task", sortable: true, render: (r) => <span className="font-medium">{r.title}</span> },
    { key: "priority", header: "Priority", sortable: true, render: (r) => <StatusBadge status={r.priority} /> },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "due_date", header: "Due Date", sortable: true,
      render: (r) => {
        const overdue = r.status !== "completed" && r.due_date && isPast(new Date(r.due_date));
        return <span className={`text-sm ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>{r.due_date ? format(new Date(r.due_date), "dd MMM yyyy") : "—"}</span>;
      },
    },
    { key: "actions", header: "", render: (r) => <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMut.mutate(r.id)}>×</Button> },
  ];

  return (
    <>
      <Helmet><title>Follow-Up Tasks — Vestry</title></Helmet>
      <PageHeader title="Follow-Up Tasks" subtitle="Assign and track member and visitor follow-ups" />
      <div className="flex gap-2 mb-4 justify-end -mt-8">
        <div className="flex border rounded-md">
          <Button variant={viewMode === "kanban" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("kanban")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("table")}><LayoutList className="h-4 w-4" /></Button>
        </div>
        <Button onClick={() => { form.reset(); setSheetOpen(true); }}><Plus className="h-4 w-4 mr-2" />Create Task</Button>
      </div>

      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanCols.map(col => {
            const colTasks = enrichedTasks.filter((t: any) => t.status === col.key);
            return (
              <div key={col.key}>
                <div className={`rounded-t-lg px-3 py-2 ${col.color} flex items-center justify-between`}>
                  <span className="font-medium text-sm">{col.label}</span>
                  <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                </div>
                <ScrollArea className="border border-t-0 rounded-b-lg min-h-[200px] max-h-[500px]">
                  <div className="p-2 space-y-2">
                    {colTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>}
                    {colTasks.map((task: any) => (
                      <Card key={task.id} className="cursor-pointer hover:shadow-sm">
                        <CardContent className="p-3 space-y-2">
                          <div className="font-medium text-sm">{task.title}</div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={task.priority} />
                            {task.isOverdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                          </div>
                          {task.due_date && <div className={`text-xs ${task.isOverdue ? "text-destructive" : "text-muted-foreground"}`}>{format(new Date(task.due_date), "dd MMM yyyy")}</div>}
                          <div className="flex gap-1">
                            {STATUSES.filter(s => s !== task.status).map(s => (
                              <Button key={s} variant="ghost" size="sm" className="h-6 text-xs capitalize" onClick={() => updateStatusMut.mutate({ id: task.id, status: s })}>{s.replace(/_/g, " ")}</Button>
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
        <DataTable data={enrichedTasks} columns={columns} loading={isLoading} getRowId={(r) => r.id} searchPlaceholder="Search tasks..." emptyIcon={<ClipboardList className="h-12 w-12 text-muted-foreground/40" />} emptyTitle="No follow-up tasks" emptyDescription="Create your first follow-up task." emptyCta={<Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Task</Button>} />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Create Task</SheetTitle></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createMut.mutate(v))} className="space-y-4 mt-6">
              <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem><FormLabel>Priority</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="due_date" render={({ field }) => (<FormItem><FormLabel>Due Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" className="w-full" disabled={createMut.isPending}>{createMut.isPending ? "Creating..." : "Create Task"}</Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default FollowUpTasks;
