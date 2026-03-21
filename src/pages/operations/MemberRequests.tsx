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
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { Plus, MessageSquare, Clock, CheckCircle2, AlertTriangle, List, LayoutGrid } from "lucide-react";

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
  closed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function MemberRequestsPage() {
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    member_id: "", request_type: "general", title: "",
    description: "", priority: "medium", assigned_to: "",
    is_confidential: false,
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["member_requests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("member_requests")
        .select("*").eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: members } = useQuery({
    queryKey: ["users", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, first_name, last_name").eq("tenant_id", tenantId);
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("member_requests").insert({
        tenant_id: tenantId,
        member_id: formData.member_id,
        request_type: formData.request_type,
        description: formData.description,
        assigned_to: formData.assigned_to || null,
        title: formData.title,
        priority: formData.priority,
        is_confidential: formData.is_confidential,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member_requests", tenantId] });
      toast.success("Request created");
      setSheetOpen(false);
    },
    onError: () => toast.error("Failed to create request"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "closed") {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = userId;
      }
      const { error } = await supabase.from("member_requests").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member_requests", tenantId] });
      toast.success("Status updated");
    },
  });

  const getMemberName = (id: string) => {
    const m = members?.find(m => m.id === id);
    return m ? `${m.first_name} ${m.last_name}` : "Unknown";
  };

  const openCount = requests?.filter(r => r.status === "open").length || 0;
  const inProgressCount = requests?.filter(r => r.status === "in_progress").length || 0;
  const closedThisMonth = requests?.filter(r => {
    if (r.status !== "closed" || !r.resolved_at) return false;
    return new Date(r.resolved_at).getMonth() === new Date().getMonth();
  }).length || 0;

  const kanbanColumns = [
    { key: "open", label: "New", color: "text-muted-foreground" },
    { key: "in_progress", label: "In Progress", color: "text-blue-600" },
    { key: "closed", label: "Resolved", color: "text-emerald-600" },
  ];

  return (
    <>
      <Helmet><title>Member Requests — Vestry</title></Helmet>
      <PageHeader
        title="Member Requests"
        subtitle="Receive and respond to needs from your congregation"
        action={
          <div className="flex gap-2">
            <div className="flex border rounded-md overflow-hidden">
              <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" onClick={() => setView("kanban")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={view === "table" ? "default" : "ghost"} size="sm" onClick={() => setView("table")}>
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => setSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Create Request
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><MessageSquare className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{requests?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Requests</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{openCount}</p>
              <p className="text-sm text-muted-foreground">Open</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Clock className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{inProgressCount}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{closedThisMonth}</p>
              <p className="text-sm text-muted-foreground">Resolved This Month</p>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : view === "kanban" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {kanbanColumns.map(col => {
            const items = requests?.filter(r => r.status === col.key) || [];
            return (
              <div key={col.key}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className={`font-semibold ${col.color}`}>{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
                <div className="space-y-3">
                  {items.map(req => {
                    const typeInfo = REQUEST_TYPES.find(t => t.value === req.request_type);
                    const priorityColor = PRIORITY_COLORS[(req as any).priority || "medium"];
                    return (
                      <Card key={req.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailId(req.id)}>
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-lg">{typeInfo?.icon || "❓"}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm line-clamp-1">{(req as any).title || req.request_type}</h4>
                            <p className="text-xs text-muted-foreground">{getMemberName(req.member_id)}</p>
                          </div>
                        </div>
                        {req.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{req.description}</p>}
                        <div className="flex items-center justify-between">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${priorityColor}`}>
                            {(req as any).priority || "medium"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {req.created_at ? formatDistanceToNow(new Date(req.created_at), { addSuffix: true }) : ""}
                          </span>
                        </div>
                        {col.key !== "closed" && (
                          <div className="flex gap-1.5 mt-3">
                            {col.key === "open" && (
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: req.id, status: "in_progress" }); }}>
                                Start
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="text-xs h-7 text-emerald-600" onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: req.id, status: "closed" }); }}>
                              Resolve
                            </Button>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                  {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No requests</p>}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests?.map(req => {
                const typeInfo = REQUEST_TYPES.find(t => t.value === req.request_type);
                const priorityColor = PRIORITY_COLORS[(req as any).priority || "medium"];
                const statusColor = STATUS_COLORS[req.status || "open"];
                return (
                  <TableRow key={req.id} className="cursor-pointer" onClick={() => setDetailId(req.id)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MemberAvatar name={getMemberName(req.member_id)} size="sm" />
                        <span className="font-medium text-foreground text-sm">{getMemberName(req.member_id)}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm">{typeInfo?.icon} {typeInfo?.label || req.request_type}</span></TableCell>
                    <TableCell className="text-sm text-foreground">{(req as any).title || "—"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${priorityColor}`}>{(req as any).priority || "medium"}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColor}`}>{req.status || "open"}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{req.created_at ? format(new Date(req.created_at), "dd MMM yyyy") : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Request Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Create Request</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Member</Label>
              <Select value={formData.member_id} onValueChange={v => setFormData(p => ({ ...p, member_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members?.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Request Type</Label>
              <Select value={formData.request_type} onValueChange={v => setFormData(p => ({ ...p, request_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Brief title" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={4} />
            </div>
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
            <div>
              <Label>Assign To</Label>
              <Select value={formData.assigned_to} onValueChange={v => setFormData(p => ({ ...p, assigned_to: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {members?.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.is_confidential} onCheckedChange={c => setFormData(p => ({ ...p, is_confidential: c }))} />
              <Label>Confidential</Label>
            </div>
            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!formData.member_id || !formData.description || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Request"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
