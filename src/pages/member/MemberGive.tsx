import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatCurrencyFull } from "@/lib/format";
import { Heart, CheckCircle2, Download, RefreshCw } from "lucide-react";

const QUICK_AMOUNTS = [500, 1000, 2500, 5000];
const CATEGORIES = ["tithe", "offering", "building_fund", "welfare", "missions", "other"];

export default function MemberGive() {
  const member = useMemberPortal();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("offering");
  const [frequency, setFrequency] = useState("one_time");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [dedication, setDedication] = useState("");
  const [success, setSuccess] = useState<any>(null);

  const { data: givingHistory = [], isLoading } = useQuery({
    queryKey: ["member-giving", member.memberId],
    queryFn: async () => {
      const { data } = await supabase.from("donations").select("*").eq("member_id", member.memberId).order("donation_date", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const give = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("donations").insert({
        church_id: member.churchId,
        member_id: member.memberId,
        amount: Number(amount),
        giving_type: category,
        payment_method: paymentMethod,
        donation_date: new Date().toISOString().split("T")[0],
        notes: dedication || null,
        currency: "KES",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["member-giving", member.memberId] });
      setSuccess(data);
      setAmount(""); setDedication("");
    },
    onError: () => toast.error("Failed to record giving"),
  });

  if (success) {
    return (
      <>
        <Helmet><title>Give Online — Vestry</title></Helmet>
        <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 p-4">
          <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center animate-bounce">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold">Thank you for your generosity! 🙏</h2>
          <p className="text-muted-foreground">{formatCurrencyFull(Number(success.amount), "KES")} · {success.giving_type?.replace(/_/g, " ")} · {format(new Date(success.donation_date), "dd MMM yyyy")}</p>
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1 rounded-full gap-2"><Download className="h-4 w-4" />Receipt</Button>
            <Button className="flex-1 rounded-full gap-2" onClick={() => setSuccess(null)}><RefreshCw className="h-4 w-4" />Give Again</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Give Online — Vestry</title></Helmet>
      <div className="max-w-md mx-auto space-y-5">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 mb-3">
            <Heart className="h-7 w-7 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold">Give to {member.churchName}</h1>
        </div>

        <Card className="rounded-2xl">
          <CardContent className="p-5 space-y-5">
            {/* Quick amounts */}
            <div>
              <Label className="text-sm mb-2 block">Amount</Label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {QUICK_AMOUNTS.map(a => (
                  <button key={a} onClick={() => setAmount(String(a))} className={`py-2 rounded-xl text-sm font-medium border transition-colors ${amount === String(a) ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                    {a.toLocaleString()}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Custom amount"
                className="h-12 text-lg text-center rounded-xl"
                min="1"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Giving Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <div className="grid grid-cols-3 gap-2">
                {[["one_time", "One-Time"], ["weekly", "Weekly"], ["monthly", "Monthly"]].map(([val, label]) => (
                  <button key={val} onClick={() => setFrequency(val)} className={`py-2 rounded-xl text-sm border transition-colors ${frequency === val ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 dark:border-slate-700"}`}>{label}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
              {paymentMethod === "cash" && <p className="text-xs text-muted-foreground">Bring your envelope on Sunday. Your giving will be recorded.</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Dedication / Note <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={dedication} onChange={e => setDedication(e.target.value)} placeholder="e.g. In memory of John" className="h-11 rounded-xl" />
            </div>

            <Button className="w-full h-12 rounded-full text-base" onClick={() => give.mutate()} disabled={!amount || Number(amount) <= 0 || give.isPending}>
              {give.isPending ? "Processing..." : `Give ${amount ? formatCurrencyFull(Number(amount), "KES") : ""}`}
            </Button>
          </CardContent>
        </Card>

        {/* Giving History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Giving</h2>
            <Link to="/member/giving-history" className="text-sm text-indigo-600">View All</Link>
          </div>
          {isLoading ? <Skeleton className="h-32 w-full rounded-2xl" /> : givingHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No giving history yet</p>
          ) : (
            <div className="space-y-2">
              {givingHistory.map((g: any) => (
                <div key={g.id} className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                  <div>
                    <p className="text-sm font-medium capitalize">{g.giving_type?.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(g.donation_date), "dd MMM yyyy")} · {g.payment_method}</p>
                  </div>
                  <span className="font-semibold text-emerald-600">{formatCurrencyFull(Number(g.amount), g.currency || "KES")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
