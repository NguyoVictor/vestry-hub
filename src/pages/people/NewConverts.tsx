import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const STAGES = ["Foundation", "Growth", "Maturity", "Leadership"];

const convertSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  phone: z.string().optional(),
  conversion_date: z.string().min(1, "Required"),
  notes: z.string().optional(),
  discipleship_stage: z.string().default("1"),
  baptism_status: z.string().default("not_baptized"),
  baptism_date: z.string().optional(),
});

const NewConverts = () => {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: converts = [], isLoading } = useQuery({
    queryKey: ["new-converts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("new_converts").select("*, member:member_id(id, first_name, last_name, avatar_url)").order("created_at", { ascending: false }) as any;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const form = useForm<z.infer<typeof convertSchema>>({ resolver: zodResolver(convertSchema), defaultValues: { discipleship_stage: "1", baptism_status: "not_baptized", conversion_date: new Date().toISOString().split("T")[0] } });

  const createMut = useMutation({
    mutationFn: async (values: z.infer<typeof convertSchema>) => {
      // Insert directly into new_converts with first_name/last_name (Option B — no users FK needed)
      const { error } = await supabase.from("new_converts").insert({
        tenant_id: tenantId!,
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone || null,
        salvation_date: values.conversion_date,
        conversion_date: values.conversion_date,
        notes: values.notes || null,
        discipleship_stage: values.discipleship_stage,
        baptism_status: values.baptism_status,
        baptism_date: values.baptism_date || null,
        member_type: "member",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["new-converts"] }); toast.success("Convert added"); setSheetOpen(false); form.reset(); },
    onError: (err: any) => toast.error(err.message),
  });

  const advanceStageMut = useMutation({
    mutationFn: async ({ id, currentStage }: { id: string; currentStage: string }) => {
      const next = Math.min(4, Number(currentStage) + 1);
      await supabase.from("new_converts").update({ discipleship_stage: String(next) } as any).eq("id", id);
      await supabase.from("convert_stage_history").insert({ convert_id: id, from_stage: Number(currentStage), to_stage: next } as any);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["new-converts"] }); toast.success("Stage advanced"); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await supabase.from("new_converts").delete().eq("id", id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["new-converts"] }); toast.success("Convert removed"); },
  });

  const columns: Column<any>[] = [
    {
      key: "member_id", header: "Convert", sortable: true,
      render: (r) => {
        const name = r.member ? `${r.member.first_name} ${r.member.last_name}` : "Unknown";
        return (
          <div className="flex items-center gap-3">
            <MemberAvatar name={name} avatarUrl={r.member?.avatar_url} />
            <span className="font-medium">{name}</span>
          </div>
        );
      },
    },
    { key: "salvation_date", header: "Conversion Date", sortable: true, render: (r) => <span className="text-sm">{r.salvation_date ? format(new Date(r.salvation_date), "dd MMM yyyy") : "—"}</span> },
    {
      key: "discipleship_stage", header: "Discipleship Stage",
      render: (r) => {
        const stage = Number(r.discipleship_stage) || 1;
        return (
          <div className="space-y-1 min-w-[120px]">
            <Progress value={stage * 25} className="h-2" />
            <span className="text-xs text-muted-foreground">{STAGES[stage - 1]}</span>
          </div>
        );
      },
    },
    { key: "baptism_status", header: "Baptism", render: (r) => <StatusBadge status={r.baptism_status || "not_baptized"} /> },
    {
      key: "actions", header: "",
      render: (r) => (
        <div className="flex gap-1">
          {Number(r.discipleship_stage) < 4 && <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => advanceStageMut.mutate({ id: r.id, currentStage: r.discipleship_stage })}>Advance</Button>}
          <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={() => deleteMut.mutate(r.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ),
    },
  ];

  const bapStatus = form.watch("baptism_status");

  return (
    <>
      <Helmet><title>New Converts — Vestry</title></Helmet>
      <PageHeader title="New Converts" subtitle="Manage spiritual growth journeys for new believers" />
      <div className="flex justify-end mb-4 -mt-8">
        <Button onClick={() => { form.reset(); setSheetOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Convert</Button>
      </div>

      <DataTable data={converts} columns={columns} loading={isLoading} getRowId={(r) => r.id} searchPlaceholder="Search converts..." emptyIcon={<Sparkles className="h-12 w-12 text-muted-foreground/40" />} emptyTitle="No new converts" emptyDescription="Add your first convert to begin discipleship tracking." emptyCta={<Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Convert</Button>} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Add New Convert</SheetTitle></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createMut.mutate(v))} className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="last_name" render={({ field }) => (<FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="conversion_date" render={({ field }) => (<FormItem><FormLabel>Conversion Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="discipleship_stage" render={({ field }) => (
                <FormItem><FormLabel>Starting Stage</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{STAGES.map((s, i) => <SelectItem key={i} value={String(i + 1)}>{i + 1}. {s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="baptism_status" render={({ field }) => (
                <FormItem><FormLabel>Baptism Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="not_baptized">Not Baptized</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
              {(bapStatus === "scheduled" || bapStatus === "completed") && (
                <FormField control={form.control} name="baptism_date" render={({ field }) => (<FormItem><FormLabel>Baptism Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              )}
              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} placeholder="Conversion story..." /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" className="w-full" disabled={createMut.isPending}>{createMut.isPending ? "Adding..." : "Add Convert"}</Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default NewConverts;
