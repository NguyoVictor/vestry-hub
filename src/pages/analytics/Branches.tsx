import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { setActiveBranch } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { toast } from "sonner";
import { formatCurrencyFull } from "@/lib/format";
import { GitBranch, Plus, MoreVertical, MapPin, Users, Building2, ArrowRight, ArrowLeftRight, TrendingUp, CalendarDays } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
  new: "bg-blue-100 text-blue-700",
};

const defaultForm = {
  name: "", branch_code: "", physical_address: "", city: "", country: "Kenya",
  phone: "", email: "", website: "", currency: "KES", status: "active", notes: "",
  branch_admin_id: "",
};

export default function Branches() {
  const { tenantId, userId, currency } = useChurch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [addSheet, setAddSheet] = useState(false);
  const [editBranch, setEditBranch] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["branches", tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("churches").select("*").eq("parent_church_id", tenantId);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-list", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, first_name, last_name").eq("church_id", tenantId).order("first_name");
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: branchStats = {} } = useQuery({
    queryKey: ["branches-stats", tenantId],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const stats: Record<string, any> = {};
      for (const branch of branches) {
        const [members, giving, services, groups] = await Promise.all([
          (supabase as any).from("members").select("id", { count: "exact", head: true }).eq("church_id", branch.id).eq("status", "active"),
          (supabase as any).from("donations").select("amount").eq("church_id", branch.id).gte("donation_date", monthStart),
          (supabase as any).from("services").select("id", { count: "exact", head: true }).eq("church_id", branch.id).gte("service_date", monthStart),
          (supabase as any).from("groups").select("id", { count: "exact", head: true }).eq("church_id", branch.id).eq("is_active", true),
        ]);
        stats[branch.id] = {
          members: members.count || 0,
          giving: (giving.data || []).reduce((s: number, d: any) => s + (d.amount || 0), 0),
          services: services.count || 0,
          groups: groups.count || 0,
        };
      }
      return stats;
    },
    enabled: branches.length > 0,
  });

  const saveBranch = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        parent_church_id: tenantId,
        is_branch: true,
        branch_code: form.branch_code || `${form.city?.slice(0, 3).toUpperCase()}-${String(branches.length + 1).padStart(2, "0")}`,
      };
      if (editBranch) {
        const { error } = await (supabase as any).from("churches").update(payload).eq("id", editBranch.id);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any).from("churches").insert(payload).select().single();
        if (error) throw error;
        if (form.branch_admin_id && data) {
          await supabase.from("church_members").insert({ church_id: data.id, user_id: form.branch_admin_id, role: "super_admin" });
        }
        await supabase.from("activity_log").insert({ church_id: tenantId, action_type: "branch_created", description: `${form.name} branch created` });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches", tenantId] });
      setAddSheet(false);
      setEditBranch(null);
      setForm(defaultForm);
      toast.success(editBranch ? "Branch updated" : `${form.name} branch created successfully`);
    },
    onError: () => toast.error("Failed to save branch"),
  });

  const openEdit = (branch: any) => {
    setEditBranch(branch);
    setForm({ name: branch.name || "", branch_code: branch.branch_code || "", physical_address: branch.physical_address || "", city: branch.city || "", country: branch.country || "Kenya", phone: branch.phone || "", email: branch.email || "", website: branch.website || "", currency: branch.currency || "KES", status: branch.status || "active", notes: branch.notes || "", branch_admin_id: "" });
    setAddSheet(true);
  };

  return (
    <>
      <Helmet><title>Branches — Vestry</title></Helmet>
      <PageHeader
        title="Branches"
        subtitle="Manage multiple church locations from one account"
        action={<Button onClick={() => { setForm(defaultForm); setEditBranch(null); setAddSheet(true); }}><Plus className="h-4 w-4 mr-1" />Add Branch</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Branches", value: branches.length, icon: GitBranch, color: "indigo" },
          { label: "Total Members Across Branches", value: Object.values(branchStats as Record<string, any>).reduce((s: number, b: any) => s + (b?.members || 0), 0).toLocaleString(), icon: Users, color: "emerald" },
          { label: "Combined Monthly Giving", value: formatCurrencyFull(Object.values(branchStats as Record<string, any>).reduce((s: number, b: any) => s + (b?.giving || 0), 0), currency), icon: TrendingUp, color: "violet" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-900/30 shrink-0`}>
                <Icon className={`h-5 w-5 text-${color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Branch Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : branches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <GitBranch className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No branches yet</p>
          <p className="text-sm mt-1">Add your first branch location to get started</p>
          <Button className="mt-4" onClick={() => setAddSheet(true)}><Plus className="h-4 w-4 mr-1" />Add Branch</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch: any) => (
            <Card key={branch.id} className="overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
                {branch.branch_banner_url ? (
                  <img src={branch.branch_banner_url} alt={branch.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white/80">{branch.name?.charAt(0)}</span>
                )}
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{branch.name}</h3>
                    {(branch.city || branch.country) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />{[branch.city, branch.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className={`text-xs capitalize ${STATUS_COLORS[branch.status || "active"] || ""}`}>{branch.status || "active"}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(branch)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/branches/${branch.id}`)}>Manage Branch</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setActiveBranch({ id: branch.id, name: branch.name }); toast.success(`Switched to ${branch.name}`); }}>
                          <ArrowLeftRight className="h-4 w-4 mr-2" />Switch to Branch
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500">Deactivate</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {branch.branch_code && <p className="text-xs text-muted-foreground font-mono">Code: {branch.branch_code}</p>}
                {/* Key stats */}
                {branchStats[branch.id] && (
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-700">
                    {[
                      { label: "Members", value: branchStats[branch.id]?.members || 0, icon: Users },
                      { label: "Services", value: branchStats[branch.id]?.services || 0, icon: CalendarDays },
                      { label: "Groups", value: branchStats[branch.id]?.groups || 0, icon: Building2 },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="text-center">
                        <p className="text-base font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => navigate(`/branches/${branch.id}`)}>
                    Manage <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => { setActiveBranch({ id: branch.id, name: branch.name }); toast.success(`Switched to ${branch.name}`); }}>
                    <ArrowLeftRight className="h-3.5 w-3.5" />Switch
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Branch Sheet */}
      <Sheet open={addSheet} onOpenChange={o => { setAddSheet(o); if (!o) { setEditBranch(null); setForm(defaultForm); } }}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>{editBranch ? "Edit Branch" : "Add Branch"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5"><Label>Branch Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={100} /></div>
            <div className="space-y-1.5"><Label>Branch Code</Label><Input value={form.branch_code} onChange={e => setForm(f => ({ ...f, branch_code: e.target.value }))} placeholder="Auto-generated if empty" /></div>
            <div className="space-y-1.5"><Label>Physical Address</Label><Textarea value={form.physical_address} onChange={e => setForm(f => ({ ...f, physical_address: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Country</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Website</Label><Input type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://" /></div>
            <div className="space-y-1.5">
              <Label>Branch Admin</Label>
              <Select value={form.branch_admin_id} onValueChange={v => setForm(f => ({ ...f, branch_admin_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select admin..." /></SelectTrigger>
                <SelectContent>
                  {members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["KES","NGN","ZAR","UGX","TZS","GHS","USD","GBP","EUR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} /></div>
            <Button className="w-full" onClick={() => saveBranch.mutate()} disabled={!form.name || saveBranch.isPending}>
              {saveBranch.isPending ? "Saving..." : editBranch ? "Update Branch" : "Create Branch"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
