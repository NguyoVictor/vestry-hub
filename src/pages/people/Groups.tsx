import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";
import { Plus, UsersRound, MoreHorizontal, Trash2, Eye, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const groupSchema = z.object({
  name: z.string().min(1, "Required").max(100),
  type: z.string().default("other"),
  description: z.string().max(300).optional(),
  color: z.string().default("#4F46E5"),
  meeting_day: z.string().optional(),
  meeting_time: z.string().optional(),
  meeting_location: z.string().optional(),
  is_active: z.boolean().default(true),
});

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#64748B"];
const TYPES = ["ministry", "cell_group", "department", "choir", "youth", "children", "other"];

const Groups = () => {
  const { tenantId } = useChurch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const { data: memberCounts = {} } = useQuery({
    queryKey: ["group-member-counts", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("group_members").select("group_id").eq("tenant_id", tenantId!);
      const counts: Record<string, number> = {};
      (data || []).forEach((gm: any) => { counts[gm.group_id] = (counts[gm.group_id] || 0) + 1; });
      return counts;
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const form = useForm<z.infer<typeof groupSchema>>({ resolver: zodResolver(groupSchema), defaultValues: { name: "", type: "other", color: "#4F46E5", is_active: true } });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof groupSchema>) => {
      const { error } = await supabase.from("groups").insert({ ...values, tenant_id: tenantId! } as any);
      if (error) throw error;
      return values;
    },
    onSuccess: (values) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Group created");
      setSheetOpen(false);
      form.reset();
      logActivity({ churchId: tenantId!, actionType: "new_group", description: `"${values.name}" group was created`, entityType: "group", entityName: values.name });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["groups"] }); toast.success("Group deleted"); },
  });

  return (
    <>
      <Helmet><title>Groups — Vestry</title></Helmet>
      <PageHeader title="Groups" subtitle="Organize your members into ministry groups" />
      <div className="flex justify-end mb-4 -mt-8">
        <Button onClick={() => { form.reset(); setSheetOpen(true); }}><Plus className="h-4 w-4 mr-2" />Create Group</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : groups.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><UsersRound className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" /><h3 className="font-semibold">No groups yet</h3><p className="text-sm text-muted-foreground mt-1">Create your first group to organize members.</p><Button className="mt-4" onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Group</Button></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g: any) => (
            <Card key={g.id} className="relative hover:shadow-md transition-shadow" style={{ borderLeftColor: g.color || "#4F46E5", borderLeftWidth: 4 }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{g.name}</h3>
                    <Badge variant="secondary" className="capitalize mt-1">{(g.type || "other").replace(/_/g, " ")}</Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/groups/${g.id}`)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(g.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {g.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{g.description}</p>}
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><UsersRound className="h-4 w-4" />{memberCounts[g.id] || 0} members</span>
                  {g.meeting_day && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{g.meeting_day}{g.meeting_time ? ` · ${g.meeting_time}` : ""}</span>}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => navigate(`/groups/${g.id}`)}>View Group</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Create Group</SheetTitle></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-4 mt-6">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Group Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem><FormLabel>Color</FormLabel><div className="flex gap-2 flex-wrap">{COLORS.map(c => (
                  <button key={c} type="button" className={`h-8 w-8 rounded-full border-2 transition-all ${field.value === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} onClick={() => field.onChange(c)} />
                ))}</div><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="meeting_day" render={({ field }) => (
                  <FormItem><FormLabel>Meeting Day</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="meeting_time" render={({ field }) => (<FormItem><FormLabel>Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="meeting_location" render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Group"}</Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Groups;
