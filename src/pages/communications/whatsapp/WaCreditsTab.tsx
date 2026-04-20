import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Credit pricing in USD
const CREDIT_PACKAGES = [
  { credits: 100, usd: 2.50, popular: false },
  { credits: 500, usd: 10.00, popular: true },
  { credits: 1000, usd: 18.00, popular: false },
];

export function WaCreditsTab({ tenantId }: { tenantId: string }) {
  const { symbol, code } = useCurrency();
  const qc = useQueryClient();

  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ["wa-credits", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.WHATSAPP_CREDITS).select("*").eq("tenant_id", tenantId).maybeSingle();
      if (!data) {
        // Seed free trial credits
        const { data: seeded } = await supabase.from(TABLES.WHATSAPP_CREDITS).insert({ tenant_id: tenantId, total_credits: 20, used_credits: 0, free_trial_credits: 20 } as any).select().single();
        return seeded;
      }
      return data as { total_credits: number; used_credits: number; free_trial_credits: number };
    },
    staleTime: 300_000,
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["wa-credit-tx", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.WHATSAPP_CREDIT_TRANSACTIONS).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const total = credits?.total_credits ?? 0;
  const used = credits?.used_credits ?? 0;
  const remaining = total - used;
  const isTrial = (credits?.free_trial_credits ?? 0) > 0 && total <= 20;
  const usedPct = total > 0 ? Math.min(100, (used / total) * 100) : 0;

  // Approximate USD to local currency (rough conversion — in production use a real FX API)
  const usdToLocal = (usd: number) => {
    const rates: Record<string, number> = { KES: 130, NGN: 1600, ZAR: 18, UGX: 3700, TZS: 2600, GHS: 12, USD: 1, GBP: 0.79, EUR: 0.92 };
    const rate = rates[code] ?? 1;
    return (usd * rate).toFixed(2);
  };

  return (
    <div className="space-y-5">
      {/* Usage */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Credits Used</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{used} / {total}</span>
            {isTrial && <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">20 free trial</span>}
          </div>
        </div>
        {creditsLoading ? <Skeleton className="h-3 w-full" /> : (
          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${usedPct}%` }} />
          </div>
        )}
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-slate-500">{remaining} remaining</p>
          <p className="text-xs text-slate-400">{usedPct.toFixed(0)}% used</p>
        </div>
      </div>

      {/* Buy more */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Buy More Credits</p>
        <div className="grid grid-cols-3 gap-4">
          {CREDIT_PACKAGES.map(pkg => (
            <div key={pkg.credits} className={cn("relative rounded-xl border p-4 text-center hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer", pkg.popular ? "border-orange-400 bg-orange-50/50" : "border-slate-200 bg-white dark:bg-slate-800")}>
              {pkg.popular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-orange-500 text-white px-2.5 py-0.5 text-[10px] font-semibold">⭐ Popular</span>}
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{pkg.credits}</p>
              <p className="text-xs text-slate-500 mb-2">credits</p>
              <p className="text-base font-semibold text-orange-600">{symbol} {usdToLocal(pkg.usd)}</p>
              <p className="text-xs text-slate-400">${pkg.usd.toFixed(2)} USD</p>
              <p className="text-[10px] text-slate-400 mt-0.5">${(pkg.usd / pkg.credits).toFixed(4)}/credit</p>
              <Button size="sm" variant={pkg.popular ? "default" : "outline"} className={cn("w-full mt-3 text-xs", pkg.popular && "bg-orange-500 hover:bg-orange-600 text-white")}
                onClick={() => toast.info("Top-up coming soon. Visit your WhatsApp Business dashboard to add credits.")}>
                Select
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3 text-center">Actual message count depends on message length and destination network. Prices based on Meta standard rates.</p>
      </div>

      {/* Credit history */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Credit History</p>
        </div>
        {txLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
            <CreditCard className="h-8 w-8 opacity-30" />
            <p className="text-sm">No credit transactions yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200">
                {["Date", "Description", "Credits", "Balance"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx: any) => (
                <tr key={tx.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-2.5 text-xs text-slate-400">{tx.created_at ? format(new Date(tx.created_at), "dd MMM yyyy") : "—"}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-700">{tx.description}</td>
                  <td className={cn("px-4 py-2.5 text-sm font-semibold", tx.credits_change < 0 ? "text-red-500" : "text-emerald-600")}>
                    {tx.credits_change > 0 ? "+" : ""}{tx.credits_change}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-slate-700 font-medium">{tx.balance_after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
