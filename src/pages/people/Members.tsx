import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, Users, MoreHorizontal, Eye, Trash2, Mail, MessageSquare, Copy, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { logActivity } from "@/lib/activityLogger";

const addMemberSchema = z.object({
  first_name: z.string().min(2, "Min 2 chars"),
  last_name: z.string().min(2, "Min 2 chars"),
  email: z.string().email().or(z.literal("")).optional(),
  phone: z.string().min(1, "Required"),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  marital_status: z.string().optional(),
  status: z.string().default("active"),
  join_date: z.string().default(() => new Date().toISOString().split("T")[0]),
  baptized: z.boolean().default(false),
  baptism_date: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
  nationality: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

type MemberForm = z.infer<typeof addMemberSchema>;

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  join_date: string;
  avatar_url: string | null;
  gender: string | null;
  date_of_birth: string | null;
  member_type: string | null;
}

const Members = () => {
  const { tenantId } = useChurch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [welcomeDialog, setWelcomeDialog] = useState<{
    open: boolean; memberId: string; memberName: string; email: string; tenantId: string;
  } | null>(null);
  const [sendingWelcome, setSendingWelcome] = useState<string | null>(null);
  const [copiedWelcome, setCopiedWelcome] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, email, phone, status, join_date, avatar_url, gender, date_of_birth, member_type")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as UserRow[];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const form = useForm<MemberForm>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      first_name: "", last_name: "", email: "", phone: "",
      status: "active", join_date: new Date().toISOString().split("T")[0],
      baptized: false, baptism_date: "", gender: "", marital_status: "",
      nationality: "", city: "", country: "", department: "", notes: "",
    },
  });

  const addMutation = useMutation({
    mutationFn: async (values: MemberForm) => {
      const memberId = crypto.randomUUID();

      const { error: memErr } = await supabase.from("members").insert({
        id: memberId,
        tenant_id: tenantId!,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email || null,
        phone: values.phone,
        membership_number: `MEM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        baptism_date: values.baptized && values.baptism_date ? values.baptism_date : null,
        baptized: values.baptized,
        department: values.department || null,
        nationality: values.nationality || null,
        notes: values.notes || null,
        city: values.city || null,
        country: values.country || null,
        status: values.status,
        join_date: values.join_date,
        gender: values.gender || null,
        date_of_birth: values.date_of_birth || null,
        marital_status: values.marital_status || null,
        registration_source: "admin",
        member_type: "member",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
      if (memErr) throw memErr;
      return { values, memberId };
    },
    onSuccess: (result: any) => {
      const { values, memberId } = result;
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success(`${values.first_name} ${values.last_name} added to Vestry`);
      setSheetOpen(false);
      form.reset();
      logActivity({ churchId: tenantId!, actionType: "new_member", description: `${values.first_name} ${values.last_name} was added as a new member`, entityType: "member", entityName: `${values.first_name} ${values.last_name}` });
      // Show portal access dialog if member has email
      if (values.email && memberId) {
        setWelcomeDialog({ open: true, memberId, memberName: `${values.first_name} ${values.last_name}`, email: values.email, tenantId: tenantId! });
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to add member"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("members").update({ status: "inactive" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member removed");
      logActivity({ churchId: tenantId!, actionType: "member_removed", description: "A member was removed" });
    },
  });

  const filteredMembers = members.filter(m => {
    if (filters.status?.length && !filters.status.includes(m.status)) return false;
    if (filters.gender?.length && !filters.gender.includes(m.gender)) return false;
    return true;
  });

  const columns: Column<UserRow>[] = [
    {
      key: "first_name", header: "Member", sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <MemberAvatar name={`${row.first_name} ${row.last_name}`} avatarUrl={row.avatar_url} />
          <div><div className="font-medium">{row.first_name} {row.last_name}</div><div className="text-xs text-muted-foreground">{row.email}</div></div>
        </div>
      ),
      exportValue: (row) => `${row.first_name} ${row.last_name}`,
    },
    { key: "phone", header: "Phone", render: (row) => <span className="text-sm">{row.phone || "—"}</span> },
    { key: "member_type", header: "Type", sortable: true, render: (row) => <StatusBadge status={row.member_type || "member"} /> },
    { key: "status", header: "Status", sortable: true, render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "join_date", header: "Join Date", sortable: true,
      render: (row) => <span className="text-sm text-muted-foreground">{row.join_date ? format(new Date(row.join_date), "dd MMM yyyy") : "—"}</span>,
    },
    {
      key: "actions", header: "",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/members/${row.id}`)}><Eye className="h-4 w-4 mr-2" />View Profile</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(row.id)}><Trash2 className="h-4 w-4 mr-2" />Remove</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filterFields: FilterField[] = [
    { key: "status", label: "Status", type: "checkbox-group", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }, { label: "Pending", value: "pending" }] },
    { key: "gender", label: "Gender", type: "checkbox-group", options: [{ label: "Male", value: "male" }, { label: "Female", value: "female" }] },
  ];

  const baptized = form.watch("baptized");

  return (
    <>
      <Helmet><title>Members — Vestry</title></Helmet>
      <PageHeader title="Members" subtitle="Manage your church membership database" />
      <div className="flex gap-2 mb-4 justify-end -mt-8">
        <FilterSidebar fields={filterFields} values={filters} onChange={setFilters} onClear={() => setFilters({})} />
        <Button onClick={() => { setEditingId(null); form.reset(); setSheetOpen(true); }}><UserPlus className="h-4 w-4 mr-2" />Add Member</Button>
      </div>

      <DataTable
        data={filteredMembers}
        columns={columns}
        loading={isLoading}
        getRowId={(r) => r.id}
        searchPlaceholder="Search by name, email or phone..."
        emptyIcon={<Users className="h-12 w-12 text-muted-foreground/40" />}
        emptyTitle="No members yet"
        emptyDescription="Add your first church member to get started."
        emptyCta={<Button onClick={() => setSheetOpen(true)}><UserPlus className="h-4 w-4 mr-2" />Add Member</Button>}
        onRowClick={(row) => navigate(`/members/${row.id}`)}
        bulkActions={(ids) => <Button variant="destructive" size="sm" onClick={() => ids.forEach(id => deleteMutation.mutate(id))}>Delete Selected</Button>}
        showCardView
        cardRenderer={(row) => (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/members/${row.id}`)}>
            <CardContent className="p-4 flex flex-col items-center text-center">
              <MemberAvatar name={`${row.first_name} ${row.last_name}`} avatarUrl={row.avatar_url} size="lg" className="mb-2" />
              <div className="font-semibold text-sm">{row.first_name} {row.last_name}</div>
              <StatusBadge status={row.status} className="mt-1" />
              <div className="text-xs text-muted-foreground mt-1">{row.phone || row.email}</div>
            </CardContent>
          </Card>
        )}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{editingId ? "Edit Member" : "Add Member"}</SheetTitle></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => addMutation.mutate(v))} className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="first_name" render={({ field }) => (
                  <FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="last_name" render={({ field }) => (
                  <FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone *</FormLabel><FormControl><Input {...field} placeholder="+254..." /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem><FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                  <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="marital_status" render={({ field }) => (
                  <FormItem><FormLabel>Marital Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="married">Married</SelectItem><SelectItem value="divorced">Divorced</SelectItem><SelectItem value="widowed">Widowed</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nationality" render={({ field }) => (
                  <FormItem><FormLabel>Nationality</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} placeholder="e.g. Youth Ministry" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex items-center gap-3">
                <FormField control={form.control} name="baptized" render={({ field }) => (
                  <FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">Baptized</FormLabel></FormItem>
                )} />
              </div>
              {baptized && (
                <FormField control={form.control} name="baptism_date" render={({ field }) => (
                  <FormItem><FormLabel>Baptism Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} placeholder="Internal notes..." /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={addMutation.isPending}>{addMutation.isPending ? "Adding..." : "Add Member"}</Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Portal Access Welcome Dialog */}
      {welcomeDialog && (
        <Dialog open={welcomeDialog.open} onOpenChange={() => setWelcomeDialog(null)}>
          <DialogContent className="max-w-sm" aria-describedby="welcome-dialog-desc">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Member Added Successfully
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p id="welcome-dialog-desc" className="text-sm text-muted-foreground">
                Send <strong>{welcomeDialog.memberName}</strong> their portal access details?
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full gap-2"
                  disabled={sendingWelcome === "email"}
                  onClick={async () => {
                    setSendingWelcome("email");
                    const { data, error } = await supabase.functions.invoke("send-member-welcome", {
                      body: { memberId: welcomeDialog.memberId, tenantId: welcomeDialog.tenantId, channel: "email" },
                    });
                    setSendingWelcome(null);
                    if (error) {
                      toast.error("Failed to send email");
                    } else if (data?.no_provider) {
                      // No email provider — show the code to copy manually
                      toast.info(`Email not configured. Share this code manually: ${data.details?.churchCode}`);
                      navigator.clipboard.writeText(
                        `Church: ${welcomeDialog.memberName} | Email: ${welcomeDialog.email} | Code: ${data.details?.churchCode} | Login: ${data.details?.loginUrl}`
                      );
                    } else {
                      toast.success("Welcome email sent!");
                    }
                  }}
                >
                  <Mail className="h-4 w-4" />
                  {sendingWelcome === "email" ? "Sending..." : "Send via Email"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  disabled={sendingWelcome === "sms"}
                  onClick={async () => {
                    setSendingWelcome("sms");
                    const { data, error } = await supabase.functions.invoke("send-member-welcome", {
                      body: { memberId: welcomeDialog.memberId, tenantId: welcomeDialog.tenantId, channel: "sms" },
                    });
                    setSendingWelcome(null);
                    if (error) {
                      toast.error("Failed to send SMS");
                    } else if (data?.no_provider) {
                      toast.info("SMS not configured. Use 'Copy Details' to share manually.");
                    } else {
                      toast.success("Welcome SMS sent!");
                    }
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  {sendingWelcome === "sms" ? "Sending..." : "Send via SMS"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Name: ${welcomeDialog.memberName} | Email: ${welcomeDialog.email}`
                    );
                    setCopiedWelcome(true);
                    setTimeout(() => setCopiedWelcome(false), 2000);
                    toast.success("Details copied");
                  }}
                >
                  {copiedWelcome ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  Copy Details
                </Button>
              </div>
              <button
                className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
                onClick={() => setWelcomeDialog(null)}
              >
                Skip for now
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default Members;
