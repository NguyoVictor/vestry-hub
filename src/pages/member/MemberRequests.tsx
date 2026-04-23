import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Plus, MoreHorizontal, Pencil, Trash2, InboxIcon, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open:        { label: "Open",        className: "bg-amber-50 text-amber-600 border border-amber-200" },
  in_progress: { label: "In Progress", className: "bg-blue-50 text-blue-600 border border-blue-200" },
  completed:   { label: "Resolved",    className: "bg-emerald-50 text-emerald-600 border border-emerald-200" },
  cancelled:   { label: "Cancelled",   className: "bg-slate-100 text-slate-500 border border-slate-200" },
};

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-300", medium: "bg-amber-400", high: "bg-orange-500", urgent: "bg-red-500",
};

const defaultForm = { request_type: "", title: "", description: "", priority: "medium", is_confidential: false };

export default function MemberRequests() {
  const member = useMemberPortal();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...defaultForm });

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["member-requests", member.memberId],
    queryFn: async () => {
      const { data } = await supabase.from("member_requests")
        .select("*").eq("member_id", member.memberId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: requestTypes = [] } = useQuery<{ internal_name: string; label: string }[]>({
    queryKey: ["service-request-types-member", member.churchId],
    queryFn: async () => {
      const { data } = await supabase.from("service_request_types")
        .select("internal_name, label").eq("tenant_id", member.churchId)
        .eq("is_active", true).order("sort_order", { ascending: true });
      return (data ?? []) as { internal_name: string; label: string }[];
    },
    staleTime: 300_000,
  });

  const getTypeLabel = (v: string) => requestTypes.find(t => t.internal_name === v)?.label || v?.replace(/_/g, " ") || "—";

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("member_requests").update({
          request_type: form.request_type, title: form.title,
          description: form.description, priority: form.priority, is_confidential: form.is_confidential,
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("member_requests").insert({
          request_type: form.request_type, title: form.title, description: form.description,
          priority: form.priority, is_confidential: form.is_confidential,
          member_id: member.memberId, tenant_id: member.churchId, status: "open",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-requests", member.memberId] });
      setModalOpen(false); setEditingId(null); setForm({ ...defaultForm });
      toast.success(editingId ? "Request updated" : "Request submitted successfully");
    },
    onError: () => toast.error("Failed to save request"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("member_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-requests", member.memberId] });
      setDeleteId(null); toast.success("Request withdrawn");
    },
    onError: () => toast.error("Failed to withdraw request"),
  });

  const openCreate = () => { setEditingId(null); setForm({ ...defaultForm }); setModalOpen(true); };
  const openEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ request_type: r.request_type, title: r.title || "", description: r.description || "", priority: r.priority || "medium", is_confidential: r.is_confidential || false });
    setModalOpen(true);
  };

  return (
    <>
      <Helmet><title>My Requests — Vestry</title></Helmet>
      <div className="max-w-2xl mx-auto pb-8 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/member")}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-500">{member.churchName}</p>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">My Requests</h1>
          </div>
          <Button size="sm" onClick={openCreate}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full gap-1.5">
            <Plus className="h-3.5 w-3.5" />Submit a Request
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <InboxIcon className="h-8 w-8 text-slate-300" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No requests yet</p>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">Submit a prayer request, counselling request, or any other need to your church.</p>
            </div>
            <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white rounded-full gap-1.5">
              <Plus className="h-4 w-4" />Submit a Request
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r: any) => {
              const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.open;
              const canEdit = r.status === "open";
              return (
                <div key={r.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", PRIORITY_DOT[r.priority || "medium"])} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">{r.title || getTypeLabel(r.request_type)}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-[11px] capitalize">{getTypeLabel(r.request_type)}</Badge>
                          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", status.className)}>{status.label}</span>
                          {r.is_confidential && (
                            <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
                              <Lock className="h-2.5 w-2.5" />Confidential
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-sm">
                        {canEdit ? (
                          <>
                            <DropdownMenuItem onClick={() => openEdit(r)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(r.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" />Withdraw
                            </DropdownMenuItem>
                          </>
                        ) : r.status === "in_progress" ? (
                          <DropdownMenuItem disabled className="text-xs text-slate-400">
                            Cannot withdraw — request is in progress
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem disabled className="text-xs text-slate-400">
                            Cannot edit — already handled
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Description */}
                  {r.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{r.description}</p>
                  )}

                  {/* Footer */}
                  <p className="text-xs text-slate-400">
                    Submitted {r.created_at ? format(new Date(r.created_at), "dd MMM yyyy") : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={v => { setModalOpen(v); if (!v) setEditingId(null); }}>
        <DialogContent className="max-w-md rounded-2xl p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-semibold">
              {editingId ? "Edit Request" : "Submit a Request"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label>Request Type *</Label>
              <Select value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select request type" /></SelectTrigger>
                <SelectContent>
                  {requestTypes.map(t => (
                    <SelectItem key={t.internal_name} value={t.internal_name}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Brief title for your request" className="h-10" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4} placeholder="Please describe your request in detail..." />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium">Keep Confidential</p>
                <p className="text-xs text-slate-400">Only church admins will see this</p>
              </div>
              <Switch checked={form.is_confidential} onCheckedChange={v => setForm(f => ({ ...f, is_confidential: v }))} />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => saveMut.mutate()}
              disabled={!form.request_type || !form.title || form.description.length < 5 || saveMut.isPending}>
              {saveMut.isPending ? "Saving..." : editingId ? "Update Request" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this request?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove your request.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMut.mutate(deleteId)} disabled={deleteMut.isPending}>
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
