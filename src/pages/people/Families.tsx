import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, HeartHandshake, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const familySchema = z.object({
  name: z.string().min(1, "Required"),
  head_of_household_id: z.string().optional(),
});

const Families = () => {
  const { tenantId } = useChurch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: families = [], isLoading } = useQuery({
    queryKey: ["families", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("families").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false }) as any;
      if (error) throw error;
      if (!data?.length) return [];
      // Fetch head member details separately (FK was dropped)
      const headIds = [...new Set(data.map((f: any) => f.head_of_household_id).filter(Boolean))];
      let headMap: Record<string, any> = {};
      if (headIds.length) {
        const { data: heads } = await supabase.from("members").select("id, first_name, last_name, avatar_url").in("id", headIds as string[]);
        headMap = Object.fromEntries((heads || []).map(h => [h.id, h]));
      }
      return data.map((f: any) => ({ ...f, head: headMap[f.head_of_household_id] || null }));
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["all-users", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, first_name, last_name").eq("tenant_id", tenantId!);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: familyMemberCounts = {} } = useQuery({
    queryKey: ["family-member-counts", tenantId],
    queryFn: async () => {
      // family_members has no tenant_id — scope via families that belong to this tenant
      const { data: tenantFamilies } = await supabase.from("families").select("id").eq("tenant_id", tenantId!);
      if (!tenantFamilies?.length) return {};
      const familyIds = tenantFamilies.map(f => f.id);
      const { data } = await supabase.from("family_members").select("family_id").in("family_id", familyIds);
      const counts: Record<string, number> = {};
      (data || []).forEach((fm: any) => { counts[fm.family_id] = (counts[fm.family_id] || 0) + 1; });
      return counts;
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const form = useForm<z.infer<typeof familySchema>>({ resolver: zodResolver(familySchema), defaultValues: { name: "" } });

  const createMut = useMutation({
    mutationFn: async (values: z.infer<typeof familySchema>) => {
      const { error } = await supabase.from("families").insert({
        id: crypto.randomUUID(),
        name: values.name,
        head_of_household_id: values.head_of_household_id || null,
        tenant_id: tenantId!,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["families"] }); toast.success("Family created"); setSheetOpen(false); form.reset(); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("families").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["families"] }); toast.success("Family deleted"); },
  });

  const columns: Column<any>[] = [
    { key: "name", header: "Family Name", sortable: true, render: (r) => <span className="font-semibold">{r.name}</span> },
    {
      key: "head_of_household_id", header: "Family Head",
      render: (r) => r.head ? (
        <div className="flex items-center gap-2"><MemberAvatar name={`${r.head.first_name} ${r.head.last_name}`} avatarUrl={r.head.avatar_url} size="sm" /><span className="text-sm">{r.head.first_name} {r.head.last_name}</span></div>
      ) : <span className="text-muted-foreground">—</span>,
    },
    { key: "members_count", header: "Members", render: (r) => <span className="text-sm">{(familyMemberCounts[r.id] || 0) + (r.head_of_household_id ? 1 : 0)}</span> },
    { key: "actions", header: "", render: (r) => <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMut.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button> },
  ];

  return (
    <>
      <Helmet><title>Families — Vestry</title></Helmet>
      <PageHeader title="Families" subtitle="Link members together as family units" />
      <div className="flex justify-end mb-4 -mt-8">
        <Button onClick={() => { form.reset(); setSheetOpen(true); }}><Plus className="h-4 w-4 mr-2" />Create Family</Button>
      </div>

      <DataTable data={families} columns={columns} loading={isLoading} getRowId={(r) => r.id} emptyIcon={<HeartHandshake className="h-12 w-12 text-muted-foreground/40" />} emptyTitle="No families yet" emptyDescription="Create family units to link members together." emptyCta={<Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Family</Button>} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Create Family</SheetTitle></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createMut.mutate(v))} className="space-y-4 mt-6">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Family Name *</FormLabel><FormControl><Input {...field} placeholder='e.g. "The Kamau Family"' /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="head_of_household_id" render={({ field }) => (
                <FormItem><FormLabel>Family Head</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger></FormControl>
                    <SelectContent>{members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createMut.isPending}>{createMut.isPending ? "Creating..." : "Create Family"}</Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Families;
