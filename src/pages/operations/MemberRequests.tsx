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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";
import { formatDistanceToNow, format } from "date-fns";
import { Plus, MessageSquare, Clock, CheckCircle2, AlertTriangle, List, LayoutGrid, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

const REQUEST_TYPES = [
  { value: "prayer", label: "Prayer", icon: "🙏" },
  { value: "counselling", label: "Counselling", icon: "💬" },
  { value: "visitation", label: "Visitation", icon: "🏠" },
  { value: "financial_aid", label: "Financial Aid", icon: "💰" },
  { value: "medical_support", label: "Medical Support", icon: "🏥" },
  { value: "bereavement", label: "Bereavement", icon: "🕯️" },
  { value: "general", label: "General", icon: "❓" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-destructive/10 text-destructive",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-slate-100 text-slate-500",
};

const KANBAN_COLS = [
  { key: "open", label: "New", color: "text-muted-foreground", bg: "bg-muted/40" },
  { key: "in_progress", label: "In Progress", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
  { key: "completed", label: "Resolved", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
];

const TRANSITIONS: Record<string, { label: string; status: string; className: string }[]> = {
  open: [
    { label: "Start", status: "in_progress", className: "text-blue-600 border-blue-200 hover:bg-blue-50" },
    { label: "Resolve", status: "completed", className: "text-emerald-600 border-emerald-200 hover:bg-emerald-50" },
  ],
  in_progress: [
    { label: "← Back to New", status: "open", className: "text-muted-foreground" },
    { label: "Resolve", status: "completed", className: "text-emerald-600 border-emerald-200 hover:bg-emerald-50" },
  ],
  completed: [
    { label: "← Reopen", status: "open", className: "text-muted-foreground" },
    { label: "In Progress", status: "in_progress", className: "text-blue-600 border-blue-200 hover:bg-blue-50" },
  ],
};

const emptyForm = { member_id: "", request_type: "general", title: "", description: "", priority: "medium", assigned_to: "", is_confidential: false, status: "open" };

export default function MemberRequestsPage() {
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["member_requests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("member_requests")
        .select("*").eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Fetch active service request types from settings
  const { data: serviceRequestTypes = [] } = useQuery<{ internal_name: string; label: string }[]>({
    queryKey: ["service-request-types-admin", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_request_types")
        .select("internal_name, label")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return (data ?? []) as { internal_name: string; label: string }[];
    },
    staleTime: 300_000,
  });

  // Helper: get label for a request_type value
  const getTypeLabel = (value: string) => {
    const found = serviceRequestTypes.find(t => t.internal_name === value);
    if (found) return found.label;
    // Fallback to old hardcoded types
    const old = REQUEST_TYPES.find(t => t.value === value);
    return old ? old.label : value.replace(/_/g, " ");
  };

  const { data: userRecords = [] } = useQuery({
    queryKey: ["users", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, first_name, last_name").eq("tenant_id", tenantId);
      return data || [];
    },
  });

  const { data: memberRecords = [] } = useQuery({
    queryKey: ["members-slim", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, first_name, last_name, avatar_url").eq("tenant_id", tenantId);
      return data || [];
    },
    staleTime: 300000,
  });

  const getMemberInfo = (id: string) => {
    const fromMembers = (memberRecords as any[]).find(m => m.id === id);
    if (fromMembers?.first_name) return { name: `${fromMembers.first_name} ${fromMembers.last_name || ""}`.trim(), avatarUrl: fromMembers.avatar_url };
    const fromUsers = (userRecords as any[]).find(m => m.id === id);
    if (fromUsers?.first_name) return { name: `${fromUsers.first_name} ${fromUsers.last_name || ""}`.trim(), avatarUrl: null };
    return { name: "Unknown", avatarUrl: null };
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...emptyForm });
    setSheetOpen(true);
  };

  const openEdit = (req: any) => {
    setEditingId(req.id);
    setFormData({
      member_id: req.member_id || "",
      request_type: req.request_type || "general",
      title: req.title || "",
      description: req.description || "",
      priority: req.priority || "medium",
      assigned_to: req.assigned_to || "",
      is_confidential: req.is_confidential || false,
      status: req.status || "open",
    });
    setSheetOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("member_requests").update({
          request_type: formData.request_type,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          assigned_to: formData.assigned_to || null,
          is_confidential: formData.is_confidential,
          status: formData.status,
        } as any).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("member_requests").insert({
          tenant_id: tenantId,
          member_id: formData.member_id,
          request_type: formData.request_type,
          description: formData.description,
          assigned_to: formData.assigned_to || null,
          title: formData.title,
          priority: formData.priority,
          is_confidential: formData.is_confidential,
          status: "open",
        } as any);
        if (error) throw error;
        logActivity({ churchId: tenantId!, actionType: "new_request", description: `A new ${formData.request_type.replace(/_/g, " ")} request was submitted`, entityType: "member_request", entityName: formData.title });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member_requests", tenantId] });
      toast.success(editingId ? "Request updated" : "Request created");
      setSheetOpen(false);
      setEditingId(null);
      setFormData({ ...emptyForm });
    },
    onError: () => toast.error("Failed to save request"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("member_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member_requests", tenantId] });
      setDeleteId(null);
      toast.success("Request deleted");
    },
    onError: () => toast.error("Failed to delete request"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "completed") {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = userId;
      } else {
        updates.resolved_at = null;
        updates.resolved_by = null;
      }
      const { error } = await supabase.from("member_requests").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, status }) => {
      queryClient.invalidateQueries({ queryKey: ["member_requests", tenantId] });
      toast.success(status === "completed" ? "Request resolved" : "Status updated");
      if (status === "completed") {
        logActivity({ churchId: tenantId!, actionType: "request_resolved", description: "A member request was resolved", entityType: "member_request", entityId: id });
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to update status"),
  });

  const onDragStart = (e: React.DragEvent, id: string) => { setDragId(id); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const onDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!dragId) return;
    const req = requests?.find(r => r.id === dragId);
    if (req && req.status !== targetStatus) updateStatusMutation.mutate({ id: dragId, status: targetStatus });
    setDragId(null);
  };

  const openCount = requests?.filter(r => r.status === "open").length || 0;
  const inProgressCount = requests?.filter(r => r.status === "in_progress").length || 0;
  const completedThisMonth = requests?.filter((r: any) => r.status === "completed" && r.resolved_at && new Date(r.resolved_at).getMonth() === new Date().getMonth()).length || 0;
  const allMembers = [...(memberRecords as any[]).filter(m => m.first_name), ...(userRecords as any[]).filter(u => !(memberRecords as any[]).find((m: any) => m.id === u.id))];

  return (
    <>
      <Helmet><title>Member Requests — Vestry</title></Helmet>
      <PageHeader
        title="Member Requests"
        subtitle="Receive and respond to needs from your congregation"
        action={
          <div className="flex gap-2">
            <div className="flex border rounded-md overflow-hidden">
              <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" onClick={() => setView("kanban")}><LayoutGrid className="h-4 w-4" /></Button>
              <Button variant={view === "table" ? "default" : "ghost"} size="sm" onClick={() => setView("table")}><List className="h-4 w-4" /></Button>
            </div>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Request</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: MessageSquare, color: "bg-primary/10 text-primary", val: requests?.length || 0, label: "Total Requests" },
          { icon: AlertTriangle, color: "bg-amber-500/10 text-amber-500", val: openCount, label: "Open" },
          { icon: Clock, color: "bg-blue-500/10 text-blue-500", val: inProgressCount, label: "In Progress" },
          { icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-500", val: completedThisMonth, label: "Resolved This Month" },
        ].map(({ icon: Icon, color, val, label }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color.split(" ")[0]}`}><Icon className={`h-5 w-5 ${color.split(" ")[1]}`} /></div>
              <div><p className="text-2xl font-bold">{val}</p><p className="text-sm text-muted-foreground">{label}</p></div>
            </div>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : view === "kanban" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {KANBAN_COLS.map(col => {
            const items = requests?.filter(r => r.status === col.key) || [];
            return (
              <div key={col.key} onDragOver={onDragOver} onDrop={e => onDrop(e, col.key)} className="min-h-[200px]">
                <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg ${col.bg}`}>
                  <h3 className={`font-semibold text-sm ${col.color}`}>{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">drag to move</span>
                </div>
                <div className="space-y-3">
                  {items.map(req => {
                    const typeInfo = REQUEST_TYPES.find(t => t.value === req.request_type);
                    const priorityColor = PRIORITY_COLORS[(req as any).priority || "medium"];
                    const { name, avatarUrl } = getMemberInfo(req.member_id);
                    const transitions = TRANSITIONS[col.key] || [];
                    return (
                      <Card key={req.id} draggable onDragStart={e => onDragStart(e, req.id)} className="p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-lg shrink-0">{typeInfo?.icon || "❓"}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm line-clamp-1">{(req as any).title || req.request_type}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <MemberAvatar name={name} avatarUrl={avatarUrl} size="sm" />
                              <p className="text-xs text-muted-foreground">{name}</p>
                            </div>
                          </div>
                          {/* ⋯ menu on kanban card */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={e => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(req)}>
                                <Pencil className="h-4 w-4 mr-2" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(req.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {req.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{req.description}</p>}
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${priorityColor}`}>{(req as any).priority || "medium"}</span>
                          <span className="text-[10px] text-muted-foreground">{req.created_at ? formatDistanceToNow(new Date(req.created_at), { addSuffix: true }) : ""}</span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {transitions.map(t => (
                            <Button key={t.status} size="sm" variant="outline" className={`text-xs h-7 ${t.className}`} disabled={updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate({ id: req.id, status: t.status })}>
                              {t.label}
                            </Button>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center text-sm text-muted-foreground">Drop here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests?.map(req => {
                const typeInfo = REQUEST_TYPES.find(t => t.value === req.request_type);
                const priorityColor = PRIORITY_COLORS[(req as any).priority || "medium"];
                const statusColor = STATUS_COLORS[req.status || "open"];
                const { name, avatarUrl } = getMemberInfo(req.member_id);
                return (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MemberAvatar name={name} avatarUrl={avatarUrl} size="sm" />
                        <span className="font-medium text-sm">{name}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm">{getTypeLabel(req.request_type)}</span></TableCell>
                    <TableCell className="text-sm">{(req as any).title || "—"}</TableCell>
                    <TableCell><span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${priorityColor}`}>{(req as any).priority || "medium"}</span></TableCell>
                    <TableCell><span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColor}`}>{req.status?.replace(/_/g, " ") || "open"}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{req.created_at ? format(new Date(req.created_at), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(req)}>
                            <Pencil className="h-4 w-4 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(req.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={v => { setSheetOpen(v); if (!v) setEditingId(null); }}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>{editingId ? "Edit Request" : "Create Request"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            {!editingId && (
              <div>
                <Label>Member</Label>
                <Select value={formData.member_id} onValueChange={v => setFormData(p => ({ ...p, member_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {allMembers.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Request Type</Label>
              <Select value={formData.request_type} onValueChange={v => setFormData(p => ({ ...p, request_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {serviceRequestTypes.length > 0
                    ? serviceRequestTypes.map(t => <SelectItem key={t.internal_name} value={t.internal_name}>{t.label}</SelectItem>)
                    : [
                        { v: "baby_dedication", l: "Baby Dedication" },
                        { v: "wedding_ceremony", l: "Wedding Ceremony" },
                        { v: "funeral_service", l: "Funeral Service" },
                        { v: "baptism", l: "Baptism" },
                        { v: "house_blessing", l: "House Blessing" },
                        { v: "counselling_session", l: "Counselling Session" },
                        { v: "hospital_visit", l: "Hospital Visit" },
                        { v: "prayer_request", l: "Prayer Request" },
                        { v: "prayer", l: "Prayer" },
                        { v: "counselling", l: "Counselling" },
                        { v: "visitation", l: "Visitation" },
                        { v: "financial_aid", l: "Financial Aid" },
                        { v: "medical_support", l: "Medical Support" },
                        { v: "bereavement", l: "Bereavement" },
                        { v: "general", l: "General" },
                      ].map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div><Label>Title</Label><Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={4} /></div>
            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={v => setFormData(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingId && (
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">New</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Resolved</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={formData.is_confidential} onCheckedChange={c => setFormData(p => ({ ...p, is_confidential: c }))} />
              <Label>Confidential</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => saveMutation.mutate()} disabled={(!editingId && !formData.member_id) || !formData.description || saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingId ? "Update Request" : "Create Request"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this request permanently?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
