import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2 } from "lucide-react";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["super_admin", "church_admin", "staff", "member"]),
});

const ROLE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  super_admin: { label: "Super Admin", color: "bg-primary text-primary-foreground", desc: "Full access, can delete church account" },
  church_admin: { label: "Admin", color: "bg-primary/80 text-primary-foreground", desc: "Full access except billing and account deletion" },
  staff: { label: "Staff", color: "bg-accent text-accent-foreground", desc: "Can manage people, events, communications" },
  member: { label: "Member", color: "bg-muted text-muted-foreground", desc: "Read-only access to all modules" },
};

const RolesPermissions = () => {
  const church = useChurch();
  const qc = useQueryClient();

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "staff" },
  });

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ["team-members", church.tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users")
        .select("id, first_name, last_name, email, role, status, avatar_url, created_at")
        .eq("tenant_id", church.tenantId)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("update-user-role", {
        body: { action: "update_role", targetUserId: userId, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-members", church.tenantId] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update role"),
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("update-user-role", {
        body: { action: "deactivate", targetUserId: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-members", church.tenantId] });
      toast.success("Member removed");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to remove member"),
  });

  const superAdminCount = teamMembers?.filter(m => m.role === "super_admin").length || 0;

  return (
    <>
      <Helmet><title>Roles & Permissions — Vestry</title></Helmet>
      <PageHeader title="Roles & Permissions" subtitle="Manage who has access to your church dashboard" />

      <div className="max-w-4xl space-y-6">
        {/* Invite */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" />Invite a Team Member</CardTitle></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(() => toast.info("Invite system coming soon — add members directly via Supabase Auth"))} className="flex flex-col sm:flex-row gap-3">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className="flex-1"><FormControl><Input placeholder="email@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem className="w-full sm:w-48">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit"><UserPlus className="mr-2 h-4 w-4" />Send Invite</Button>
              </form>
            </Form>
            {form.watch("role") && (
              <p className="mt-2 text-xs text-muted-foreground">{ROLE_LABELS[form.watch("role")]?.desc}</p>
            )}
          </CardContent>
        </Card>

        {/* Team table */}
        <Card>
          <CardHeader><CardTitle className="text-base">Current Team Members</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers?.filter(m => m.status !== "inactive").map(member => {
                    const isCurrentUser = member.id === church.userId;
                    const isLastSuperAdmin = member.role === "super_admin" && superAdminCount <= 1;
                    const initials = `${member.first_name?.[0] || ""}${member.last_name?.[0] || ""}`;
                    const roleInfo = ROLE_LABELS[member.role || "member"] || ROLE_LABELS.member;

                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{member.first_name} {member.last_name}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={member.role || "member"}
                            onValueChange={(role) => updateRoleMutation.mutate({ userId: member.id, role })}
                            disabled={isCurrentUser || isLastSuperAdmin}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_LABELS).map(([key, { label }]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={member.status === "active" ? "default" : "secondary"} className="text-xs capitalize">
                            {member.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {!isCurrentUser && !isLastSuperAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove {member.first_name}?</AlertDialogTitle>
                                  <AlertDialogDescription>This will revoke their access to the church dashboard.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => removeMutation.mutate(member.id)}>Remove</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default RolesPermissions;
