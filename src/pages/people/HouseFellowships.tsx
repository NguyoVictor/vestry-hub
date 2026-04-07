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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Home, Trash2, Pencil, MoreHorizontal } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const fellowshipSchema = z.object({
  name: z.string().min(1, "Required"),
  zone: z.string().optional(),
  host_name: z.string().optional(),
  host_address: z.string().optional(),
  meeting_day: z.string().optional(),
  meeting_time: z.string().optional(),
  max_capacity: z.number().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
});

const HouseFellowships = () => {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: fellowships = [], isLoading } = useQuery({
    queryKey: ["fellowships", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("house_fellowships").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const form = useForm<z.infer<typeof fellowshipSchema>>({
    resolver: zodResolver(fellowshipSchema),
    defaultValues: { name: "", is_active: true },
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset({ name: "", zone: "", host_name: "", host_address: "", meeting_day: "", meeting_time: "", is_active: true, notes: "" });
    setSheetOpen(true);
  };

  const openEdit = (fellowship: any) => {
    setEditingId(fellowship.id);
    form.reset({
      name: fellowship.name || "",
      zone: fellowship.zone || "",
      host_name: fellowship.host_name || "",
      host_address: fellowship.host_address || "",
      meeting_day: fellowship.meeting_day || "",
      meeting_time: fellowship.meeting_time || "",
      max_capacity: fellowship.max_capacity || undefined,
      is_active: fellowship.is_active ?? true,
      notes: fellowship.notes || "",
    });
    setSheetOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async (values: z.infer<typeof fellowshipSchema>) => {
      if (editingId) {
        const { error } = await supabase.from("house_fellowships").update({ ...values } as any).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("house_fellowships").insert({ ...values, tenant_id: tenantId! } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fellowships"] });
      toast.success(editingId ? "Fellowship updated" : "Fellowship created");
      setSheetOpen(false);
      setEditingId(null);
      form.reset();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("house_fellowships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["fellowships"] }); toast.success("Fellowship deleted"); },
  });

  const columns: Column<any>[] = [
    { key: "name", header: "Fellowship Name", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "zone", header: "Zone/Area", render: (r) => r.zone || "—" },
    { key: "host_name", header: "Host", render: (r) => r.host_name || "—" },
    { key: "meeting_day", header: "Meeting", render: (r) => r.meeting_day ? `${r.meeting_day}${r.meeting_time ? ` · ${r.meeting_time}` : ""}` : "—" },
    { key: "is_active", header: "Status", render: (r) => <StatusBadge status={r.is_active ? "active" : "inactive"} /> },
    {
      key: "actions", header: "",
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(r)}>
              <Pencil className="h-4 w-4 mr-2" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => deleteMut.mutate(r.id)}>
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const isActive = form.watch("is_active");

  return (
    <>
      <Helmet><title>House Fellowships — Vestry</title></Helmet>
      <PageHeader title="House Fellowships" subtitle="Track and manage home cell groups" />
      <div className="flex justify-end mb-4 -mt-8">
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Fellowship</Button>
      </div>

      <DataTable
        data={fellowships}
        columns={columns}
        loading={isLoading}
        getRowId={(r) => r.id}
        emptyIcon={<Home className="h-12 w-12 text-muted-foreground/40" />}
        emptyTitle="No fellowships yet"
        emptyDescription="Create your first house fellowship."
        emptyCta={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Fellowship</Button>}
      />

      <Sheet open={sheetOpen} onOpenChange={v => { setSheetOpen(v); if (!v) setEditingId(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit House Fellowship" : "Add House Fellowship"}</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => saveMut.mutate(v))} className="space-y-4 mt-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Fellowship Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="zone" render={({ field }) => (
                <FormItem><FormLabel>Zone / Area</FormLabel><FormControl><Input {...field} placeholder="e.g. Westlands Zone" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="host_name" render={({ field }) => (
                <FormItem><FormLabel>Host Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="host_address" render={({ field }) => (
                <FormItem><FormLabel>Host Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="meeting_day" render={({ field }) => (
                  <FormItem><FormLabel>Meeting Day</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="meeting_time" render={({ field }) => (
                  <FormItem><FormLabel>Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="max_capacity" render={({ field }) => (
                <FormItem><FormLabel>Max Capacity</FormLabel>
                  <FormControl><Input type="number" min={0} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)} placeholder="Optional" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Active</FormLabel>
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={saveMut.isPending}>
                {saveMut.isPending ? "Saving..." : editingId ? "Update Fellowship" : "Create Fellowship"}
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default HouseFellowships;
