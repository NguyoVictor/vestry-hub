import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, MessageSquare, TrendingDown, BarChart3, RefreshCw, Lock, ExternalLink, CreditCard } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface SmsSettings { is_configured: boolean; }

interface BalanceData { balance: number; currency: string; cached: boolean; error?: string; }

export function SmsCredits() {
  const { tenantId } = useChurch();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Check configured
  const { data: smsSettings, isLoading: settingsLoading } = useQuery<SmsSettings | null>({
    queryKey: ["sms-settings", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.SMS_SETTINGS).select("is_configured").eq("tenant_id", tenantId).maybeSingle();
      return data as SmsSettings | null;
    },
    staleTime: 300_000,
  });

  const isConfigured = smsSettings?.is_configured === true;

  // Monthly usage stats
  const { data: monthlyStats } = useQuery({
    queryKey: ["sms-monthly-stats", tenantId],
    queryFn: async () => {
      const now = new Date();
      const from = startOfMonth(now).toISOString();
      const to = endOfMonth(now).toISOString();
      const { data } = await supabase.from(TABLES.SMS_HISTORY).select("recipient_count, cost, currency").eq("tenant_id", tenantId).gte("sent_at", from).lte("sent_at", to);
      const rows = data ?? [];
      const totalSent = rows.reduce((s, r) => s + (r.recipient_count ?? 0), 0);
      const totalCost = rows.reduce((s, r) => s + (parseFloat(r.cost) || 0), 0);
      const avgCost = totalSent > 0 ? totalCost / totalSent : 0;
      const currency = rows[0]?.currency ?? "KES";
      return { totalSent, totalCost, avgCost, currency };
    },
    staleTime: 300_000,
    enabled: isConfigured,
  });

  const fetchBalance = async () => {
    setBalanceLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("africastalking-balance", { body: { tenant_id: tenantId } });
      if (error) throw error;
      setBalance(data);
      setLastFetched(new Date());
    } catch (err: unknown) {
      setBalance({ balance: 0, currency: "KES", cached: false, error: (err as Error)?.message });
    } finally {
      setBalanceLoading(false);
    }
  };

  // Auto-fetch on mount and every 5 minutes
  useEffect(() => {
    if (!isConfigured) return;
    fetchBalance();
    const interval = setInterval(fetchBalance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isConfigured, tenantId]);

  if (settingsLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  // Not configured — locked state
  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Lock className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">SMS Not Configured</p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">Configure your Africa's Talking credentials in Settings to view and manage your SMS credits.</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => navigate("/settings/communications-settings")}>
          Go to SMS Settings →
        </Button>
      </div>
    );
  }

  // Balance status
  const bal = balance?.balance ?? 0;
  const LOW_THRESHOLD = 500; // KES — could be fetched from notification settings
  const balanceStatus = bal === 0 ? "empty" : bal < LOW_THRESHOLD ? "critical" : bal < LOW_THRESHOLD * 2 ? "low" : "healthy";
  const balanceStatusConfig = {
    healthy: { label: "✅ Balance is healthy", color: "text-emerald-600", border: "border-emerald-200", bar: "bg-emerald-500" },
    low:     { label: "⚠ Balance getting low", color: "text-amber-600", border: "border-amber-300", bar: "bg-amber-500" },
    critical:{ label: "🔴 Low Balance!", color: "text-red-600", border: "border-red-300", bar: "bg-red-500" },
    empty:   { label: "❌ No Credits — SMS Disabled", color: "text-red-700", border: "border-red-400", bar: "bg-red-600" },
  }[balanceStatus];

  const barPct = Math.min(100, (bal / (LOW_THRESHOLD * 3)) * 100);

  return (
    <div className="space-y-5">
      {/* CARD 1: Balance */}
      <div className={cn("bg-white dark:bg-slate-800 rounded-xl border shadow-sm p-5", balanceStatusConfig.border)}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
              <Wallet className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Available Balance</p>
              <p className="text-xs text-slate-500">Africa's Talking account balance</p>
            </div>
          </div>
          <button onClick={fetchBalance} disabled={balanceLoading} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors">
            <RefreshCw className={cn("h-3.5 w-3.5", balanceLoading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {balanceLoading && !balance ? (
          <Skeleton className="h-10 w-40 mb-3" />
        ) : balance?.error ? (
          <p className="text-sm text-red-500 mb-3">Failed to fetch balance: {balance.error}</p>
        ) : (
          <>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1">
              {balance?.currency ?? "KES"} {bal.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={cn("text-sm font-medium mb-3", balanceStatusConfig.color)}>{balanceStatusConfig.label}</p>
            {lastFetched && <p className="text-xs text-slate-400 mb-3">Updated {format(lastFetched, "HH:mm:ss")}</p>}
            {/* Progress bar */}
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", balanceStatusConfig.bar)} style={{ width: `${barPct}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Low balance alert threshold: {balance?.currency ?? "KES"} {LOW_THRESHOLD.toLocaleString()}</p>
          </>
        )}
      </div>

      {/* CARD 2: Usage stats */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Usage Statistics — {format(new Date(), "MMMM yyyy")}</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: MessageSquare, color: "bg-blue-50 text-blue-500", value: monthlyStats?.totalSent ?? 0, label: "SMS Sent This Month" },
            { icon: TrendingDown, color: "bg-red-50 text-red-500", value: `${monthlyStats?.currency ?? "KES"} ${(monthlyStats?.totalCost ?? 0).toFixed(2)}`, label: "Credits Used This Month" },
            { icon: BarChart3, color: "bg-violet-50 text-violet-500", value: `${monthlyStats?.currency ?? "KES"} ${(monthlyStats?.avgCost ?? 0).toFixed(4)}`, label: "Avg Cost Per SMS" },
          ].map(({ icon: Icon, color, value, label }) => (
            <div key={label} className="rounded-xl border border-slate-100 p-4 text-center">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg mx-auto mb-2", color)}><Icon className="h-4 w-4" /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CARD 3: Top Up — Coming Soon */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 flex flex-col items-center text-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
          <CreditCard className="h-6 w-6 text-orange-500" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Top Up Balance</p>
          <p className="text-sm text-slate-400 mt-0.5">Direct in-app top-up coming soon</p>
        </div>
        <p className="text-sm text-slate-500 max-w-md leading-relaxed">
          We are working on enabling direct M-Pesa payments through Africa's Talking so you can top up your SMS credits without leaving the app. In the meantime, top up directly on your Africa's Talking dashboard.
        </p>
        <Button variant="outline" className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50" asChild>
          <a href="https://account.africastalking.com" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open Africa's Talking Dashboard ↗
          </a>
        </Button>
      </div>
    </div>
  );
}
