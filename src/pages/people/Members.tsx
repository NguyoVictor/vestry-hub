import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { UserPlus, Search, QrCode, Upload, Download, LayoutGrid, List, Users, Mail, MessageSquare, Copy, CheckCircle2 } from "lucide-react";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { logActivity } from "@/lib/activityLogger";
import { captureEvent } from "@/lib/monitoring";
import { cn } from "@/lib/utils";
import { TABLES } from "@/lib/schema";
import { MemberCard } from "@/components/members/MemberCard";
import { MemberRow } from "@/components/members/MemberRow";
import { MemberFilters, type MemberFilterValues } from "@/components/members/MemberFilters";
import { MemberImportModal } from "@/components/members/MemberImportModal";
import { MemberUsageBanner } from "@/components/members/MemberStats";
import { ChurchQRModal } from "@/components/shared/ChurchQRModal";
import { useSubscription } from "@/hooks/useSubscription";
import { showPaywallToast } from "@/components/PaywallToast";

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

interface MemberRow2 {
  id: string; first_name: string; last_name: string; email: string;
  phone: string | null; status: string; join_date: string;
  avatar_url: string | null; gender: string | null; date_of_birth: string | null;
  member_type: string | null; city: string | null; membership_number: string | null;
  department: string | null;
}

const DEFAULT_FILTERS: MemberFilterValues = {
  status: "All Statuses", gender: "All Genders", segment: "All Segments",
  marital: "All Marital Status", branch: "All Branches", baptism: "All Baptism",
  joinDate: "All Join Dates", order: "Default Order",
};

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

const Members = () => {
  const { tenantId } = useChurch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canAddMember } = useSubscription();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('member_management');
  const reportsReadOnly = isReadOnly('reports_analytics');

  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<MemberFilterValues>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [welcomeDialog, setWelcomeDialog] = useState<{ open: boolean; memberId: string; memberName: string; email: string; tenantId: string } | null>(null);
  const [sendingWelcome, setSendingWelcome] = useState<string | null>(null);
  const [copiedWelcome, setCopiedWelcome] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.MEMBERS)
        .select("id, first_name, last_name, email, phone, status, join_date, avatar_url, gender, date_of_birth, member_type, city, membership_number, department")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MemberRow2[];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name").eq("tenant_id", tenantId!);
      return data ?? [];
    },
    staleTime: 300000,
    enabled: !!tenantId,
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
      if (readOnly) return;
      const memberId = crypto.randomUUID();
      const { error } = await supabase.from("members").insert({
        id: memberId, tenant_id: tenantId!,
        first_name: values.first_name, last_name: values.last_name,
        email: values.email || null, phone: values.phone,
        membership_number: `MEM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        baptism_date: values.baptized && values.baptism_date ? values.baptism_date : null,
        baptized: values.baptized, department: values.department || null,
        nationality: values.nationality || null, notes: values.notes || null,
        city: values.city || null, country: values.country || null,
        status: values.status, join_date: values.join_date,
        gender: values.gender || null, date_of_birth: values.date_of_birth || null,
        marital_status: values.marital_status || null,
        registration_source: "admin", member_type: "member",
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
      return { values, memberId };
    },
    onSuccess: (result: any) => {
      const { values, memberId } = result;
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success(`${values.first_name} ${values.last_name} added successfully`);
      setSheetOpen(false); form.reset();
      captureEvent("member_created");
      logActivity({ churchId: tenantId!, actionType: "new_member", description: `${values.first_name} ${values.last_name} was added`, entityType: "member", entityName: `${values.first_name} ${values.last_name}` });
      if (values.email && memberId) {
        setWelcomeDialog({ open: true, memberId, memberName: `${values.first_name} ${values.last_name}`, email: values.email, tenantId: tenantId! });
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to add member"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (readOnly) return;
      const { error } = await supabase.from("members").update({ status: "inactive" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["members"] }); toast.success("Member removed"); },
  });

  // Filter logic
  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    if (q && !`${m.first_name} ${m.last_name} ${m.email ?? ""} ${m.phone ?? ""} ${m.city ?? ""} ${m.membership_number ?? ""}`.toLowerCase().includes(q)) return false;
    if (filters.status !== "All Statuses" && (m.member_type || m.status || "").toLowerCase() !== filters.status.toLowerCase()) return false;
    if (filters.gender !== "All Genders" && (m.gender ?? "").toLowerCase() !== filters.gender.toLowerCase()) return false;
    if (filters.baptism === "Baptized" && !(m as any).baptized) return false;
    if (filters.baptism === "Not Baptized" && (m as any).baptized) return false;
    if (filters.joinDate !== "All Join Dates" && m.join_date) {
      const d = new Date(m.join_date);
      const now = new Date();
      if (filters.joinDate === "Joined This Month" && d < startOfMonth(now)) return false;
      if (filters.joinDate === "Joined This Year" && d < startOfYear(now)) return false;
      if (filters.joinDate === "Last 30 Days" && d < subDays(now, 30)) return false;
      if (filters.joinDate === "Last 90 Days" && d < subDays(now, 90)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (filters.order === "Name (A→Z)") return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    if (filters.order === "Name (Z→A)") return `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`);
    if (filters.order === "Newest First") return new Date(b.join_date).getTime() - new Date(a.join_date).getTime();
    if (filters.order === "Oldest First") return new Date(a.join_date).getTime() - new Date(b.join_date).getTime();
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const exportCSV = () => {
    const rows = [["Name","Email","Phone","Status","City","Join Date"]];
    filtered.forEach(m => rows.push([`${m.first_name} ${m.last_name}`, m.email ?? "", m.phone ?? "", m.member_type || m.status, m.city ?? "", m.join_date ?? ""]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "members.csv"; a.click();
  };

  const baptized = form.watch("baptized");

  return (
    <>
      <Helmet><title>Members — Vestry</title></Helmet>
      <div className="min-h-screen bg-[#F8F9FA] font-jakarta">
        <div className="max-w-7xl mx-auto px-6 py-6">

          {/* Usage banner */}
          <MemberUsageBanner count={members.length} />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 font-jakarta">Members</h1>
              <p className="text-sm text-slate-500 mt-0.5">Manage your church members and their information</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setQrOpen(true)} className="gap-2 font-jakarta text-xs border-slate-200">
                <QrCode className="h-4 w-4" />Member Registration QR
              </Button>
              <PermissionButton readOnly={reportsReadOnly} variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-2 font-jakarta text-xs border-slate-200">
                <Upload className="h-4 w-4" />Import Members
              </PermissionButton>
              <PermissionButton readOnly={reportsReadOnly} variant="outline" size="sm" onClick={exportCSV} className="gap-2 font-jakarta text-xs border-slate-200">
                <Download className="h-4 w-4" />Export
              </PermissionButton>
              <PermissionButton readOnly={readOnly} size="sm" onClick={() => {
                if (!canAddMember) {
                  showPaywallToast('member', 'members');
                  return;
                }
                form.reset(); 
                setSheetOpen(true);
              }} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white font-jakarta text-xs">
                <UserPlus className="h-4 w-4" />Add Member
              </PermissionButton>
            </div>
          </div>

          {readOnly && <ReadOnlyBanner section="Member Management" />}
          {reportsReadOnly && <ReadOnlyBanner permission="reports_analytics" />}

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, phone, email, city, or member #..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 rounded-xl border-slate-200 bg-white font-jakarta text-sm focus:ring-orange-400 focus:border-orange-400 h-10"
            />
          </div>

          {/* Filters */}
          <div className="mb-5">
            <MemberFilters
              values={filters}
              onChange={patch => { setFilters(f => ({ ...f, ...patch })); setPage(1); }}
              branches={branches as any[]}
            />
          </div>

          {/* Results bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 font-jakarta">
              <Users className="h-4 w-4 text-orange-500" />
              {filtered.length} Member{filtered.length !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setView("grid")} className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors", view === "grid" ? "bg-orange-500 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50")}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button onClick={() => setView("list")} className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors", view === "list" ? "bg-orange-500 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50")}>
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className={cn("gap-4", view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "space-y-2")}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-slate-200 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Users className="h-12 w-12 opacity-30" />
              <p className="text-base font-semibold text-slate-600">No members found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
              <Button size="sm" onClick={() => {
                if (!canAddMember) {
                  showPaywallToast('member', 'members');
                  return;
                }
                form.reset(); 
                setSheetOpen(true);
              }} className="bg-orange-500 hover:bg-orange-600 text-white gap-2 mt-2 font-jakarta">
                <UserPlus className="h-4 w-4" />Add Member
              </Button>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginated.map((m, i) => (
                <MemberCard key={m.id} member={m} index={i} onClick={() => navigate(`/members/${m.id}`)} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="pl-4 pr-2 py-3 w-10">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-orange-500"
                        checked={selectedIds.size === paginated.length && paginated.length > 0}
                        onChange={() => setSelectedIds(s => s.size === paginated.length ? new Set() : new Set(paginated.map(m => m.id)))} />
                    </th>
                    {["Member","Member #","Contact","Status","Branch","Department","City","Joined",""].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((m, i) => (
                    <MemberRow
                      key={m.id} member={m} index={i}
                      selected={selectedIds.has(m.id)}
                      onSelect={id => setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                      onClick={() => navigate(`/members/${m.id}`)}
                      onDelete={id => deleteMutation.mutate(id)}
                      readOnly={readOnly}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between mt-5 font-jakarta text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8 w-20 text-xs border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>{[10,25,50,100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
                <span>per page</span>
              </div>
              <span className="text-slate-500">Showing {Math.min((page-1)*perPage+1, filtered.length)}–{Math.min(page*perPage, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="h-8 px-3 text-xs">Prev</Button>
                <span className="px-3 text-xs">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="h-8 px-3 text-xs">Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto font-jakarta">
          <SheetHeader><SheetTitle className="font-jakarta">Add New Member</SheetTitle></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => addMutation.mutate(v))} className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="first_name" render={({ field }) => (
                  <FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} className="rounded-lg" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="last_name" render={({ field }) => (
                  <FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input {...field} className="rounded-lg" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone *</FormLabel><FormControl><Input {...field} placeholder="+254..." className="rounded-lg" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} className="rounded-lg" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem><FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl><SelectTrigger className="rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                  <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} className="rounded-lg" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="marital_status" render={({ field }) => (
                  <FormItem><FormLabel>Marital Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl><SelectTrigger className="rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="married">Married</SelectItem><SelectItem value="divorced">Divorced</SelectItem><SelectItem value="widowed">Widowed</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} className="rounded-lg" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} placeholder="e.g. Youth Ministry" className="rounded-lg" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex items-center gap-3">
                <FormField control={form.control} name="baptized" render={({ field }) => (
                  <FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">Baptized</FormLabel></FormItem>
                )} />
              </div>
              {baptized && (
                <FormField control={form.control} name="baptism_date" render={({ field }) => (
                  <FormItem><FormLabel>Baptism Date</FormLabel><FormControl><Input type="date" {...field} className="rounded-lg" /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} placeholder="Internal notes..." className="rounded-lg" /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-jakarta" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Adding..." : "Add Member"}
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Import Modal */}
      <MemberImportModal open={importOpen} onClose={() => setImportOpen(false)} tenantId={tenantId!}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["members"] })} />

      {/* QR Modal — fetches church_code internally */}
      <ChurchQRModal open={qrOpen} onClose={() => setQrOpen(false)} />

      {/* Welcome Dialog */}
      {welcomeDialog && (
        <Dialog open={welcomeDialog.open} onOpenChange={() => setWelcomeDialog(null)}>
          <DialogContent className="max-w-sm font-jakarta">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-jakarta">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />Member Added Successfully
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-slate-500">Send <strong>{welcomeDialog.memberName}</strong> their portal access details?</p>
              <div className="flex flex-col gap-2">
                <Button className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white font-jakarta" disabled={sendingWelcome === "email"}
                  onClick={async () => {
                    setSendingWelcome("email");
                    const { data, error } = await supabase.functions.invoke("send-member-welcome", { body: { memberId: welcomeDialog.memberId, tenantId: welcomeDialog.tenantId, channel: "email" } });
                    setSendingWelcome(null);
                    if (error) toast.error("Failed to send email");
                    else if (data?.no_provider) toast.info(`Share code manually: ${data.details?.churchCode}`);
                    else toast.success("Welcome email sent!");
                  }}>
                  <Mail className="h-4 w-4" />{sendingWelcome === "email" ? "Sending..." : "Send via Email"}
                </Button>
                <Button variant="outline" className="w-full gap-2 font-jakarta" disabled={sendingWelcome === "sms"}
                  onClick={async () => {
                    setSendingWelcome("sms");
                    const { data, error } = await supabase.functions.invoke("send-member-welcome", { body: { memberId: welcomeDialog.memberId, tenantId: welcomeDialog.tenantId, channel: "sms" } });
                    setSendingWelcome(null);
                    if (error) toast.error("Failed to send SMS");
                    else if (data?.no_provider) toast.info("SMS not configured.");
                    else toast.success("Welcome SMS sent!");
                  }}>
                  <MessageSquare className="h-4 w-4" />{sendingWelcome === "sms" ? "Sending..." : "Send via SMS"}
                </Button>
                <Button variant="ghost" className="w-full gap-2 font-jakarta"
                  onClick={() => { navigator.clipboard.writeText(`Name: ${welcomeDialog.memberName} | Email: ${welcomeDialog.email}`); setCopiedWelcome(true); setTimeout(() => setCopiedWelcome(false), 2000); toast.success("Details copied"); }}>
                  {copiedWelcome ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}Copy Details
                </Button>
              </div>
              <button className="w-full text-xs text-slate-400 hover:text-slate-600 text-center" onClick={() => setWelcomeDialog(null)}>Skip for now</button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default Members;
