import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FilterSidebar, FilterField } from "@/components/shared/FilterSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { UserPlus, Users, MoreHorizontal, UserCheck, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { logActivity } from "@/lib/activityLogger";

const visitorSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  phone: z.string().min(1, "Required"),
  email: z.string().email().or(z.literal("")).optional(),
  visit_date: z.string().default(() => new Date().toISOString().split("T")[0]),
  how_heard: z.string().optional(),
  service_attended: z.string().optional(),
  notes: z.string().optional(),
  follow_up_due_date: z.string().optional(),
});

const SOURCES = [
  { value: "friend_referral", label: "Friend Referral" },
  { value: "social_media", label: "Social Media" },
  { value: "walk_in", label: "Walk-in" },
  { value: "church_event", label: "Church Event" },
  { value: "online_search", label: "Online Search" },
  { value: "other", label: "Other" },
];

const Visitors = () => {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ["visitors", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("visitors").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const form = useForm<z.infer<typeof visitorSchema>>({ resolver: zodResolver(visitorSchema), defaultValues: { first_name: "", last_name: "", phone: "", visit_date: new Date().toISOString().split("T")[0] } });

  const createMut = useMutation({
    mutationFn: async (values: z.infer<typeof visitorSchema>) => {
      const { error } = await supabase.from("visitors").insert({
        ...values,
        tenant_id: tenantId!,
        follow_up_status: "not_contacted",
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      toast.success("Visitor logged");
      logActivity({ churchId: tenantId!, actionType: "new_visitor", description: `${values.first_name} ${values.last_name} was logged as a visitor`, entityType: "visitor", entityName: `${values.first_name} ${values.last_name}` });
      setSheetOpen(false);
      form.reset();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const convertMut = useMutation({
    mutationFn: async (visitor: any) => {
      // Create a member record directly (no users table insert)
      const memberId = crypto.randomUUID();
      const { error: memErr } = await supabase.from("members").insert({
        id: memberId,
        tenant_id: tenantId!,
        first_name: visitor.first_name,
        last_name: visitor.last_name,
        email: visitor.email || null,
        phone: visitor.phone,
        status: "active",
        member_type: "member",
        registration_source: "admin",
        join_date: new Date().toISOString().split("T")[0],
        membership_number: `MEM-${Date.now().toString(36).toUpperCase()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
      if (memErr) throw memErr;
      await supabase.from("visitors").update({ follow_up_status: "converted", converted_to_member_id: memberId } as any).eq("id", visitor.id);
    },
    onSuccess: (_, visitor) => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Visitor converted to member!");
      logActivity({ churchId: tenantId!, actionType: "visitor_converted", description: `${visitor.first_name} ${visitor.last_name} was converted from visitor to member`, entityType: "member", entityName: `${visitor.first_name} ${visitor.last_name}` });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await supabase.from("visitors").delete().eq("id", id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["visitors"] }); toast.success("Visitor removed"); },
  });

  const filteredVisitors = visitors.filter((v: any) => {
    if (filters.follow_up_status?.length && !filters.follow_up_status.includes(v.follow_up_status)) return false;
    return true;
  });

  const columns: Column<any>[] = [
    {
      key: "first_name", header: "Visitor", sortable: true,
      render: (r) => (
        <div className="flex items-center gap-3">
          <MemberAvatar name={`${r.first_name} ${r.last_name}`} />
          <div><div className="font-medium">{r.first_name} {r.last_name}</div><div className="text-xs text-muted-foreground">{r.email || r.phone}</div></div>
        </div>
      ),
    },
    { key: "phone", header: "Phone", render: (r) => <span className="text-sm">{r.phone || "—"}</span> },
    { key: "visit_date", header: "Visit Date", sortable: true, render: (r) => <span className="text-sm">{r.visit_date ? format(new Date(r.visit_date), "dd MMM yyyy") : "—"}</span> },
    { key: "how_heard", header: "Source", render: (r) => <span className="text-sm capitalize">{(r.how_heard || "—").replace(/_/g, " ")}</span> },
    { key: "follow_up_status", header: "Follow-up", render: (r) => <StatusBadge status={r.follow_up_status || "not_contacted"} /> },
    {
      key: "actions", header: "",
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {r.follow_up_status !== "converted" && <DropdownMenuItem onClick={() => convertMut.mutate(r)}><UserCheck className="h-4 w-4 mr-2" />Convert to Member</DropdownMenuItem>}
            <DropdownMenuItem className="text-destructive" onClick={() => deleteMut.mutate(r.id)}><Trash2 className="h-4 w-4 mr-2" />Remove</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filterFields: FilterField[] = [
    { key: "follow_up_status", label: "Follow-up Status", type: "checkbox-group", options: [
      { label: "Not Contacted", value: "not_contacted" }, { label: "Contacted", value: "contacted" },
      { label: "Follow-up Scheduled", value: "follow_up_scheduled" }, { label: "Converted", value: "converted" }, { label: "Not Interested", value: "not_interested" },
    ]},
  ];

  return (
    <>
      <Helmet><title>Visitors — Vestry</title></Helmet>
      <PageHeader title="Visitors" subtitle="Log and follow up with people who have visited your church" />
      <div className="flex gap-2 mb-4 justify-end -mt-8">
        <FilterSidebar fields={filterFields} values={filters} onChange={setFilters} onClear={() => setFilters({})} />
        <Button onClick={() => { form.reset(); setSheetOpen(true); }}><UserPlus className="h-4 w-4 mr-2" />Log Visitor</Button>
      </div>

      <DataTable data={filteredVisitors} columns={columns} loading={isLoading} getRowId={(r) => r.id} searchPlaceholder="Search visitors..." emptyIcon={<Users className="h-12 w-12 text-muted-foreground/40" />} emptyTitle="No visitors logged" emptyDescription="Log your first church visitor." emptyCta={<Button onClick={() => setSheetOpen(true)}><UserPlus className="h-4 w-4 mr-2" />Log Visitor</Button>} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Log Visitor</SheetTitle></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createMut.mutate(v))} className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="last_name" render={({ field }) => (<FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone *</FormLabel><FormControl><Input {...field} placeholder="+254..." /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="visit_date" render={({ field }) => (<FormItem><FormLabel>Visit Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="how_heard" render={({ field }) => (
                <FormItem><FormLabel>How did they hear about us?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>{SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} placeholder="First impressions, prayer requests..." /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" className="w-full" disabled={createMut.isPending}>{createMut.isPending ? "Logging..." : "Log Visitor"}</Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Visitors;
