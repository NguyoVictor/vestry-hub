import { useState } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { HandHeart, Plus, HelpCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-600",
};

const REQUEST_TYPES = ["prayer", "counselling", "visitation", "financial_aid", "medical_support", "bereavement", "general"];

const defaultForm = { request_type: "prayer", title: "", description: "", priority: "medium", is_confidential: false };

export default function MemberRequests() {
  const member = useMemberPortal();
  const queryClient = useQueryClient();
  const [sheet, setSheet] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...defaultForm });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["member-requests", member.memberId],
    queryFn: async () => {
      const { data } = await supabase.from("member_requests").select("*").eq("member_id", member.memberId).order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 60000,
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setSheet(true);
  };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ request_type: r.request_type, title: r.title || "", description: r.description || "", priority: r.priority || "medium", is_confidential: r.is_confidential || false });
    setSheet(true);
  };

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
        await supabase.from("activity_log").insert({ tenant_id: member.churchId, action_type: "new_request", description: `New ${form.request_type} request submitted`, entity_id: member.memberId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-requests", member.memberId] });
      setSheet(false);
      setEditingId(null);
      setForm({ ...defaultForm });
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
      setDeleteId(null);
      toast.success("Request deleted");
    },
    onError: () => toast.error("Failed to delete request"),
  });

  return (
    <>
      <Helmet><title>My Requests — Vestry</title></Helmet>
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Requests</h1>
          <Button className="rounded-full gap-1.5" onClick={openCreate}><Plus className="h-4 w-4" />Submit</Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <HandHeart className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No requests yet</p>
            <p className="text-sm mt-1">Submit a prayer request, counselling request, or any other need</p>
            <Button className="mt-4 rounded-full" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Submit a Request</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r: any) => {
              const canEdit = r.status === "open";
              return (
                <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <HelpCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{r.title}</p>
                        <Badge className={`text-xs capitalize border-0 ${STATUS_COLORS[r.status] || ""}`}>{r.status?.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{r.request_type?.replace(/_/g, " ")} · {format(new Date(r.created_at), "dd MMM yyyy")}</p>
                    </div>
                    {/* ⋯ menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit ? (
                          <>
                            <DropdownMenuItem onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(r.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                            Cannot edit — admin is already handling this request
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {r.description && <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Sheet */}
      <Sheet open={sheet} onOpenChange={v => { setSheet(v); if (!v) setEditingId(null); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>{editingId ? "Edit Request" : "Submit a Request"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label>Request Type</Label>
              <Select value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v }))}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={100} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Please describe your request in detail..." />
              {form.description.length > 0 && form.description.length < 10 && (
                <p className="text-xs text-muted-foreground">{10 - form.description.length} more characters needed</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_confidential} onCheckedChange={v => setForm(f => ({ ...f, is_confidential: v }))} />
              <Label>Keep this request confidential</Label>
            </div>
            <Button className="w-full h-11 rounded-full" onClick={() => saveMut.mutate()} disabled={!form.title || form.description.length < 10 || saveMut.isPending}>
              {saveMut.isPending ? "Saving..." : editingId ? "Update Request" : "Submit Request"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this request?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to withdraw this request? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteId && deleteMut.mutate(deleteId)} disabled={deleteMut.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
