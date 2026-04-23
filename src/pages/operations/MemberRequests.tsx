import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";
import { formatDistanceToNow, format } from "date-fns";
import {
  Plus, MessageSquare, Clock, CheckCircle2, AlertTriangle,
  List, LayoutGrid, MoreHorizontal, Pencil, Trash2, InboxIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  low:    { label: "Low",    className: "bg-slate-100 text-slate-500 dark:bg-slate-800",                dot: "bg-slate-400" },
  medium: { label: "Medium", className: "bg-amber-50 text-amber-600 dark:bg-amber-900/20",              dot: "bg-amber-400" },
  high:   { label: "High",   className: "bg-orange-50 text-orange-600 dark:bg-orange-900/20",           dot: "bg-orange-500" },
  urgent: { label: "Urgent", className: "bg-red-50 text-red-600 dark:bg-red-900/20 font-semibold",      dot: "bg-red-500" },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open:        { label: "New",         className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  in_progress: { label: "In Progress", className: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
  completed:   { label: "Resolved",    className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
  cancelled:   { label: "Cancelled",   className: "bg-slate-100 text-slate-400" },
};

const KANBAN_COLS = [
  { key: "open",        label: "New",         accent: "border-t-slate-300",  countClass: "bg-slate-100 text-slate-600" },
  { key: "in_progress", label: "In Progress", accent: "border-t-blue-400",   countClass: "bg-blue-50 text-blue-600" },
  { key: "completed",   label: "Resolved",    accent: "border-t-emerald-400", countClass: "bg-emerald-50 text-emerald-600" },
];

const TRANSITIONS: Record<string, { label: string; status: string }[]> = {
  open:        [{ label: "Start", status: "in_progress" }, { label: "Resolve", status: "completed" }],
  in_progress: [{ label: "Reopen", status: "open" },       { label: "Resolve", status: "completed" }],
  completed:   [{ label: "Reopen", status: "open" },       { label: "In Progress", status: "in_progress" }],
};

const emptyForm = { member_id: "", request_type: "", title: "", description: "", priority: "medium", is_confidential: false, status: "open" };

// ─── Message Member Modal (inline, uses existing messaging infra) ─────────────
function MessageMemberModal({ open, onClose, memberId, memberName, tenantId, userId, userName }: {
  open: boolean; onClose: () => void;
  memberId: string; memberName: string;
  tenantId: string; userId: string; userName: string;
}) {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      // 1. Find existing direct conversation between admin and this member
      const { data: myParticipations } = await (supabase as any)
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      const { data: memberParticipations } = await (supabase as any)
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", memberId);

      const myConvIds = new Set((myParticipations || []).map((r: any) => r.conversation_id));
      const memberConvIds = (memberParticipations || []).map((r: any) => r.conversation_id);

      // Find a direct conversation both are in
      const sharedConvId = memberConvIds.find((id: string) => myConvIds.has(id));

      let convId = sharedConvId;

      // 2. If no shared conversation, create one
      if (!convId) {
        const { data: newConv, error: convErr } = await (supabase as any)
          .from("conversations")
          .insert({
            tenant_id: tenantId,
            type: "direct",
            created_by: userId,
            status: "open",
          })
          .select("id")
          .single();

        if (convErr) throw convErr;
        convId = newConv.id;

        // Add both participants
        await (supabase as any).from("conversation_participants").insert([
          { conversation_id: convId, user_id: userId },
          { conversation_id: convId, user_id: memberId },
        ]);
      }

      // 3. Insert the message with correct schema (body, not content)
      const { error: msgErr } = await (supabase as any).from("messages").insert({
        tenant_id: tenantId,
        conversation_id: convId,
        sender_id: userId,
        body: message.trim(),
        is_read: false,
      });
      if (msgErr) throw msgErr;

      // 4. Update conversation preview
      await (supabase as any).from("conversations").update({
        last_message_preview: message.trim().slice(0, 100),
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", convId);

      // 5. Increment unread count for the member (recipient)
      await (supabase as any).rpc("increment_unread_count", {
        p_conversation_id: convId,
        p_user_id: memberId,
      });

      qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
      toast.success(`Message sent to ${memberName}`);
      setMessage("");
      onClose();
    } catch (err: any) {
      console.error("Message send error:", err);
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Message Member</h3>
            <p className="text-sm text-slate-500 mt-0.5">Sending to {memberName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type your message..."
          rows={4}
          className="resize-none"
          onKeyDown={e => e.key === "Enter" && e.metaKey && handleSend()}
        />
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!message.trim() || sending} onClick={handleSend}
            className="bg-orange-500 hover:bg-orange-600 text-white">
            {sending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Request Card (Kanban) ────────────────────────────────────────────────────
function RequestCard({ req, getTypeLabel, getMemberInfo, onEdit, onDelete, onStatusChange, onMessage }: any) {
  const priority = PRIORITY_CONFIG[req.priority || "medium"];
  const { name, avatarUrl } = getMemberInfo(req.member_id);

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData("id", req.id); e.dataTransfer.effectAllowed = "move"; }}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("h-2 w-2 rounded-full shrink-0 mt-0.5", priority.dot)} />
          <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">{req.title || getTypeLabel(req.request_type)}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-sm">
            <DropdownMenuItem onClick={() => onEdit(req)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(req.id)}>
              <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Type badge */}
      <Badge variant="secondary" className="text-[11px] mb-2 capitalize">{getTypeLabel(req.request_type)}</Badge>

      {/* Description */}
      {req.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">{req.description}</p>
      )}

      {/* Member + date */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <MemberAvatar name={name} avatarUrl={avatarUrl} size="sm" />
          <span className="text-xs text-slate-500 truncate max-w-[100px]">{name}</span>
        </div>
        <span className="text-[11px] text-slate-400">
          {req.created_at ? formatDistanceToNow(new Date(req.created_at), { addSuffix: true }) : ""}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 flex-wrap">
        <Button size="sm" variant="outline"
          className="h-7 text-xs gap-1 text-slate-500 hover:text-orange-500 hover:border-orange-300"
          onClick={() => onMessage(req.member_id, name)}>
          <MessageSquare className="h-3 w-3" />Message
        </Button>
        {(TRANSITIONS[req.status] || []).map(t => (
          <Button key={t.status} size="sm" variant="outline"
            className={cn("h-7 text-xs",
              t.status === "completed" ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50" :
              t.status === "in_progress" ? "text-blue-600 border-blue-200 hover:bg-blue-50" :
              "text-slate-500"
            )}
            onClick={() => onStatusChange(req.id, t.status)}>
            {t.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MemberRequestsPage() {
  const { tenantId, userId, userFirstName, userLastName } = useChurch();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [messagingTarget, setMessagingTarget] = useState<{ id: string; name: string } | null>(null);
  const userName = userFirstName ? `${userFirstName} ${userLastName || ""}`.trim() : "Admin";

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["member_requests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("member_requests")
        .select("*").eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: serviceRequestTypes = [] } = useQuery<{ internal_name: string; label: string }[]>({
    queryKey: ["service-request-types-admin", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("service_request_types")
        .select("internal_name, label").eq("tenant_id", tenantId)
        .eq("is_active", true).order("sort_order", { ascending: true });
      return (data ?? []) as { internal_name: string; label: string }[];
    },
    staleTime: 300_000,
  });

  const { data: memberRecords = [] } = useQuery({
    queryKey: ["members-slim", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, first_name, last_name, avatar_url").eq("tenant_id", tenantId);
      return data || [];
    },
    staleTime: 300_000,
  });

  const { data: userRecords = [] } = useQuery({
    queryKey: ["users", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, first_name, last_name").eq("tenant_id", tenantId);
      return data || [];
    },
    staleTime: 300_000,
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const getTypeLabel = (value: string) => {
    const found = serviceRequestTypes.find(t => t.internal_name === value);
    return found ? found.label : value?.replace(/_/g, " ") || "—";
  };

  const getMemberInfo = (id: string) => {
    const m = (memberRecords as any[]).find(m => m.id === id);
    if (m?.first_name) return { name: `${m.first_name} ${m.last_name || ""}`.trim(), avatarUrl: m.avatar_url };
    const u = (userRecords as any[]).find(u => u.id === id);
    if (u?.first_name) return { name: `${u.first_name} ${u.last_name || ""}`.trim(), avatarUrl: null };
    return { name: "Unknown", avatarUrl: null };
  };

  const allMembers = [
    ...(memberRecords as any[]).filter(m => m.first_name),
    ...(userRecords as any[]).filter(u => !(memberRecords as any[]).find((m: any) => m.id === u.id)),
  ];

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("member_requests").update({
          request_type: formData.request_type, title: formData.title,
          description: formData.description, priority: formData.priority,
          is_confidential: formData.is_confidential, status: formData.status,
        } as any).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("member_requests").insert({
          tenant_id: tenantId, member_id: formData.member_id,
          request_type: formData.request_type, title: formData.title,
          description: formData.description, priority: formData.priority,
          is_confidential: formData.is_confidential, status: "open",
        } as any);
        if (error) throw error;
        logActivity({ churchId: tenantId!, actionType: "new_request", description: `New ${formData.request_type.replace(/_/g, " ")} request created`, entityType: "member_request", entityName: formData.title });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member_requests", tenantId] });
      toast.success(editingId ? "Request updated" : "Request created");
      setSheetOpen(false); setEditingId(null); setFormData({ ...emptyForm });
    },
    onError: () => toast.error("Failed to save request"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("member_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["member_requests", tenantId] }); setDeleteId(null); toast.success("Request deleted"); },
    onError: () => toast.error("Failed to delete"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "completed") { updates.resolved_at = new Date().toISOString(); updates.resolved_by = userId; }
      else { updates.resolved_at = null; updates.resolved_by = null; }
      const { error } = await supabase.from("member_requests").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["member_requests", tenantId] });
      toast.success(status === "completed" ? "Request resolved" : "Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const openCreate = () => { setEditingId(null); setFormData({ ...emptyForm }); setSheetOpen(true); };
  const openEdit = (req: any) => {
    setEditingId(req.id);
    setFormData({ member_id: req.member_id || "", request_type: req.request_type || "", title: req.title || "", description: req.description || "", priority: req.priority || "medium", is_confidential: req.is_confidential || false, status: req.status || "open" });
    setSheetOpen(true);
  };

  const onDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("id");
    const req = requests.find((r: any) => r.id === id);
    if (req && (req as any).status !== targetStatus) updateStatus.mutate({ id, status: targetStatus });
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const openCount = requests.filter((r: any) => r.status === "open").length;
  const inProgressCount = requests.filter((r: any) => r.status === "in_progress").length;
  const completedThisMonth = requests.filter((r: any) => r.status === "completed" && r.resolved_at && new Date(r.resolved_at).getMonth() === new Date().getMonth()).length;

  return (
    <>
      <Helmet><title>Member Requests — Vestry</title></Helmet>
      <PageHeader
        title="Member Requests"
        subtitle="Receive and respond to needs from your congregation"
        action={
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
              <button onClick={() => setView("kanban")}
                className={cn("p-1.5 rounded-md transition-all", view === "kanban" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600")}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button onClick={() => setView("table")}
                className={cn("p-1.5 rounded-md transition-all", view === "table" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600")}>
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5">
              <Plus className="h-4 w-4" />Create Request
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: InboxIcon,     color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20",  val: requests.length,    label: "Total Requests" },
          { icon: AlertTriangle, color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",     val: openCount,          label: "Open" },
          { icon: Clock,         color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",        val: inProgressCount,    label: "In Progress" },
          { icon: CheckCircle2,  color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20", val: completedThisMonth, label: "Resolved This Month" },
        ].map(({ icon: Icon, color, val, label }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", color.split(" ").slice(1).join(" "))}>
                <Icon className={cn("h-5 w-5", color.split(" ")[0])} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{val}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : view === "kanban" ? (
        /* ── Kanban ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {KANBAN_COLS.map(col => {
            const items = requests.filter((r: any) => r.status === col.key);
            return (
              <div key={col.key}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(e, col.key)}
                className="flex flex-col gap-3 min-h-[300px]"
              >
                {/* Column header */}
                <div className={cn("flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-t-2 shadow-sm", col.accent)}>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{col.label}</span>
                  <span className={cn("ml-auto text-xs font-semibold px-2 py-0.5 rounded-full", col.countClass)}>{items.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-3 flex-1">
                  {items.map((req: any) => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      getTypeLabel={getTypeLabel}
                      getMemberInfo={getMemberInfo}
                      onEdit={openEdit}
                      onDelete={(id: string) => setDeleteId(id)}
                      onStatusChange={(id: string, status: string) => updateStatus.mutate({ id, status })}
                      onMessage={(id: string, name: string) => setMessagingTarget({ id, name })}
                    />
                  ))}
                  {items.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
                      <p className="text-xs text-slate-400">Drop here or no requests</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table ── */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                {["Member","Type","Title","Priority","Status","Date",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-400">No requests yet.</td></tr>
              ) : requests.map((req: any) => {
                const { name, avatarUrl } = getMemberInfo(req.member_id);
                const priority = PRIORITY_CONFIG[req.priority || "medium"];
                const status = STATUS_CONFIG[req.status || "open"];
                return (
                  <tr key={req.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <MemberAvatar name={name} avatarUrl={avatarUrl} size="sm" />
                        <span className="font-medium text-slate-800 dark:text-white">{name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="secondary" className="text-xs capitalize">{getTypeLabel(req.request_type)}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{req.title || "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", priority.className)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", priority.dot)} />{priority.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", status.className)}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs">
                      {req.created_at ? format(new Date(req.created_at), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-slate-500 hover:text-orange-500"
                          onClick={() => setMessagingTarget({ id: req.member_id, name })}>
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-sm">
                            <DropdownMenuItem onClick={() => openEdit(req)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                            {(TRANSITIONS[req.status] || []).map(t => (
                              <DropdownMenuItem key={t.status} onClick={() => updateStatus.mutate({ id: req.id, status: t.status })}>
                                {t.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(req.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={v => { setSheetOpen(v); if (!v) setEditingId(null); }}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit Request" : "Create Request"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 mt-6">
            {!editingId && (
              <div className="space-y-1.5">
                <Label>Member *</Label>
                <Select value={formData.member_id} onValueChange={v => setFormData(p => ({ ...p, member_id: v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {allMembers.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Request Type *</Label>
              <Select value={formData.request_type} onValueChange={v => setFormData(p => ({ ...p, request_type: v }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {serviceRequestTypes.map(t => (
                    <SelectItem key={t.internal_name} value={t.internal_name}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Brief title for this request" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={4} placeholder="Describe the request in detail..." />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={v => setFormData(p => ({ ...p, priority: v }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingId && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">New</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Resolved</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium">Confidential</p>
                <p className="text-xs text-slate-500">Only admins can view this request</p>
              </div>
              <Switch checked={formData.is_confidential} onCheckedChange={c => setFormData(p => ({ ...p, is_confidential: c }))} />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => saveMutation.mutate()}
                disabled={(!editingId && !formData.member_id) || !formData.request_type || saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingId ? "Update Request" : "Create Request"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this request?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Message member modal */}
      {messagingTarget && (
        <MessageMemberModal
          open={!!messagingTarget}
          onClose={() => setMessagingTarget(null)}
          memberId={messagingTarget.id}
          memberName={messagingTarget.name}
          tenantId={tenantId!}
          userId={userId!}
          userName={userName || "Admin"}
        />
      )}
    </>
  );
}
