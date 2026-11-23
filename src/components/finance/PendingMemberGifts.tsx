// G7b — gifts members recorded in the portal (cash / bank transfer / cheque)
// wait here until finance staff confirm or reject them. Decisions go through
// staff_review_member_gift (server checks 'financial_records' + first-wins).
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { Check, Clock, Loader2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrencyFull } from "@/lib/format";
import { toUserFacingError } from "@/lib/userFacingError";

interface PendingGift {
  id: string;
  member_id: string | null;
  amount: number;
  currency: string | null;
  giving_type: string;
  payment_method: string;
  given_at: string;
  external_reference: string | null;
  notes: string | null;
  created_at: string | null;
}

interface Props {
  tenantId: string;
  readOnly: boolean;
  getMemberName: (id: string | null) => string | null;
}

export function PendingMemberGifts({ tenantId, readOnly, getMemberName }: Props) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState<PendingGift | null>(null);
  const [reason, setReason] = useState("");

  const { data: gifts = [] } = useQuery({
    queryKey: ["giving-pending-member", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("giving_records")
        .select("id, member_id, amount, currency, giving_type, payment_method, given_at, external_reference, notes, created_at")
        .eq("tenant_id", tenantId).eq("submitted_by_member", true).eq("payment_status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PendingGift[];
    },
  });

  const review = useMutation({
    mutationFn: async (v: { id: string; decision: "confirm" | "reject"; note?: string }) => {
      const { error } = await supabase.rpc("staff_review_member_gift", { p_gift_id: v.id, p_decision: v.decision, p_note: v.note });
      if (error) throw error;
      return v;
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["giving-pending-member", tenantId] });
      qc.invalidateQueries({ queryKey: ["giving-records", tenantId] });
      toast.success(v.decision === "confirm" ? "Gift confirmed" : "Gift rejected");
      setRejecting(null);
      setReason("");
    },
    onError: (e: Error) => {
      toast.error(toUserFacingError(e, e.message));
      qc.invalidateQueries({ queryKey: ["giving-pending-member", tenantId] });
    },
  });

  if (gifts.length === 0) return null;

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/60" data-testid="pending-member-gifts">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-amber-600" />
            Awaiting confirmation <span className="rounded-full bg-amber-200 px-2 text-sm">{gifts.length}</span>
          </CardTitle>
          <p className="text-sm text-slate-600">Gifts members recorded in the member portal. Confirm them once the money is received.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {gifts.map(g => {
            const busy = review.isPending && review.variables?.id === g.id;
            return (
              <div key={g.id} className="flex flex-col gap-2 rounded-lg border bg-white p-3 sm:flex-row sm:items-center" data-testid="pending-gift-row">
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-semibold text-slate-900">
                    {getMemberName(g.member_id) ?? "Member"} · {formatCurrencyFull(Number(g.amount), g.currency ?? "KES")}
                  </p>
                  <p className="text-slate-600 capitalize">
                    {g.giving_type.replace(/_/g, " ")} · {g.payment_method.replace(/_/g, " ")} · given {format(new Date(g.given_at), "dd MMM yyyy")}
                    {g.external_reference && <> · ref <span className="normal-case font-mono">{g.external_reference}</span></>}
                  </p>
                  {g.notes && <p className="text-slate-500 break-words">“{g.notes}”</p>}
                </div>
                {!readOnly && (
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={busy}
                      onClick={() => review.mutate({ id: g.id, decision: "confirm" })} aria-label={`Confirm gift of ${g.amount}`}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}Confirm
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => { setRejecting(g); setReason(""); }}
                      aria-label={`Reject gift of ${g.amount}`}>
                      <X className="h-4 w-4 mr-1" />Reject
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!rejecting} onOpenChange={o => { if (!o) setRejecting(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject this gift?</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason (the member will see it)</Label>
            <Textarea id="reject-reason" value={reason} maxLength={300} onChange={e => setReason(e.target.value)}
              placeholder="e.g. We could not find this transfer in the bank statement." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!reason.trim() || review.isPending}
              onClick={() => rejecting && review.mutate({ id: rejecting.id, decision: "reject", note: reason.trim() })}>
              Reject gift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
