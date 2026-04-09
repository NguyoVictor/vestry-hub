import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Users, Clock, HandHeart, Award } from "lucide-react";

export default function VolunteeringPage() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [assignSheetOpen, setAssignSheetOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: "", department: "", description: "", min_volunteers: 1, max_volunteers: 10 });
  const [assignForm, setAssignForm] = useState({ member_id: "", role_id: "", reference_type: "service", reference_id: "", notes: "" });

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["volunteer_roles", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("volunteer_roles" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: assignments, isLoading: assignLoading } = useQuery({
    queryKey: ["volunteers", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("volunteers" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: members } = useQuery({
    queryKey: ["users", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, first_name, last_name").eq("tenant_id", tenantId);
      return data || [];
    },
  });

  // Also fetch from members table — portal signups use members.id not users.id
  const { data: memberRecords } = useQuery({
    queryKey: ["members-for-volunteers", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, first_name, last_name, avatar_url").eq("tenant_id", tenantId);
      return data || [];
    },
    staleTime: 300000,
  });

  // Merged lookup: check members table first, then users table
  const getMemberName = (memberId: string) => {
    const fromMembers = memberRecords?.find(m => m.id === memberId);
    if (fromMembers?.first_name) return { name: `${fromMembers.first_name} ${fromMembers.last_name || ""}`.trim(), avatarUrl: fromMembers.avatar_url };
    const fromUsers = members?.find(m => m.id === memberId);
    if (fromUsers?.first_name) return { name: `${fromUsers.first_name} ${fromUsers.last_name || ""}`.trim(), avatarUrl: null };
    return { name: "Unknown", avatarUrl: null };
  };

  const createRoleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("volunteer_roles" as any).insert({
        tenant_id: tenantId, name: roleForm.name, department: roleForm.department,
        description: roleForm.description, min_volunteers: roleForm.min_volunteers, max_volunteers: roleForm.max_volunteers,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer_roles", tenantId] });
      toast.success("Volunteer role created");
      setRoleDialogOpen(false);
      setRoleForm({ name: "", department: "", description: "", min_volunteers: 1, max_volunteers: 10 });
    },
    onError: () => toast.error("Failed to create role"),
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("volunteers" as any).insert({
        tenant_id: tenantId, member_id: assignForm.member_id, role_id: assignForm.role_id || null,
        reference_type: assignForm.reference_type, reference_id: assignForm.reference_id || null, notes: assignForm.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteers", tenantId] });
      toast.success("Volunteer assigned");
      setAssignSheetOpen(false);
    },
    onError: () => toast.error("Failed to assign volunteer"),
  });

  const uniqueVolunteers = new Set(assignments?.map((a: any) => a.member_id)).size;
  const totalHours = assignments?.reduce((sum: number, a: any) => sum + (Number(a.hours_served) || 0), 0) || 0;

  return (
    <>
      <Helmet><title>Volunteering — Vestry</title></Helmet>
      <PageHeader
        title="Volunteering"
        subtitle="Coordinate and track volunteer teams"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRoleDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Create Role
            </Button>
            <Button onClick={() => setAssignSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Assign Volunteer
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{uniqueVolunteers}</p>
              <p className="text-sm text-muted-foreground">Active Volunteers</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><Clock className="h-5 w-5 text-emerald-500" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalHours}</p>
              <p className="text-sm text-muted-foreground">Total Hours Served</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10"><Award className="h-5 w-5 text-violet-500" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{roles?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Volunteer Roles</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-4">
          {rolesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : !roles?.length ? (
            <Card className="p-12 text-center">
              <HandHeart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No volunteer roles yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create roles like "Usher", "Sound Tech", "Greeter" to organize volunteers.</p>
              <Button onClick={() => setRoleDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Role</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {roles.map((role: any) => {
                const count = assignments?.filter((a: any) => a.role_id === role.id).length || 0;
                return (
                  <Card key={role.id} className="p-4">
                    <h4 className="font-semibold text-foreground">{role.name}</h4>
                    {role.department && <Badge variant="secondary" className="text-xs mt-1">{role.department}</Badge>}
                    {role.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{role.description}</p>}
                    <p className="text-sm text-muted-foreground mt-3">{count} volunteer{count !== 1 ? "s" : ""}</p>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          {assignLoading ? (
            <Card className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</Card>
          ) : !assignments?.length ? (
            <Card className="p-12 text-center">
              <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No assignments yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Assign volunteers to services and events.</p>
              <Button onClick={() => setAssignSheetOpen(true)}><Plus className="h-4 w-4 mr-2" />Assign Volunteer</Button>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a: any) => {
                    const role = roles?.find((r: any) => r.id === a.role_id);
                    const { name, avatarUrl } = getMemberName(a.member_id);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MemberAvatar name={name} avatarUrl={avatarUrl} size="sm" />
                            <span className="font-medium text-foreground">{name}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{role?.name || "—"}</Badge></TableCell>
                        <TableCell className="capitalize text-sm text-muted-foreground">{a.reference_type || "—"}</TableCell>
                        <TableCell><StatusBadge status={a.status === "confirmed" ? "active" : a.status} /></TableCell>
                        <TableCell className="text-sm">{a.hours_served || 0}h</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Volunteer Role</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Role Name</Label><Input value={roleForm.name} onChange={e => setRoleForm(p => ({ ...p, name: e.target.value }))} placeholder="Usher" /></div>
            <div><Label>Department</Label><Input value={roleForm.department} onChange={e => setRoleForm(p => ({ ...p, department: e.target.value }))} placeholder="Hospitality" /></div>
            <div><Label>Description</Label><Textarea value={roleForm.description} onChange={e => setRoleForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min Volunteers</Label><Input type="number" value={roleForm.min_volunteers} onChange={e => setRoleForm(p => ({ ...p, min_volunteers: Number(e.target.value) }))} /></div>
              <div><Label>Max Volunteers</Label><Input type="number" value={roleForm.max_volunteers} onChange={e => setRoleForm(p => ({ ...p, max_volunteers: Number(e.target.value) }))} /></div>
            </div>
            <Button className="w-full" onClick={() => createRoleMutation.mutate()} disabled={!roleForm.name || createRoleMutation.isPending}>
              {createRoleMutation.isPending ? "Creating..." : "Create Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Volunteer Sheet */}
      <Sheet open={assignSheetOpen} onOpenChange={setAssignSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Assign Volunteer</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Volunteer</Label>
              <Select value={assignForm.member_id} onValueChange={v => setAssignForm(p => ({ ...p, member_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {memberRecords?.filter(m => m.first_name).map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={assignForm.role_id} onValueChange={v => setAssignForm(p => ({ ...p, role_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles?.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign To</Label>
              <Select value={assignForm.reference_type} onValueChange={v => setAssignForm(p => ({ ...p, reference_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={assignForm.notes} onChange={e => setAssignForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
            <Button className="w-full" onClick={() => assignMutation.mutate()} disabled={!assignForm.member_id || assignMutation.isPending}>
              {assignMutation.isPending ? "Assigning..." : "Assign Volunteer"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
