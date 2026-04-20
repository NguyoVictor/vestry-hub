import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, MessageSquare, FlaskConical, Plus, History, Phone, CheckCircle2, CalendarClock, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SmsRecord {
  id: string;
  message: string;
  recipient_count: number;
  delivered_count: number;
  failed_count: number;
  status: string;
  cost: number;
  currency: string;
  is_test: boolean;
  sent_at: string | null;
  created_at: string;
}

interface SmsSettings {
  is_configured: boolean;
  at_username: string | null;
  at_api_key: string | null;
}

interface MetricsSms {
  message: string;
  recipient_count: number;
  delivered_count: number;
  failed_count: number;
  cost: number;
  currency: string;
  status: string;
  sent_at: string | null;
}

const STATUS_PILL: Record<string, string> = {
  sent:      "bg-blue-100 text-blue-700 border-blue-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  failed:    "bg-red-100 text-red-700 border-red-200",
  scheduled: "bg-purple-100 text-purple-700 border-purple-200",
  partial:   "bg-amber-100 text-amber-700 border-amber-200",
};

export function SmsTab() {
  const { tenantId, name: churchName, userPhone } = useChurch() as any;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sendingTest, setSendingTest] = useState(false);
  const [metricsItem, setMetricsItem] = useState<MetricsSms | null>(null);

  // Check if SMS is configured
  const { data: smsSettings, isLoading: settingsLoading } = useQuery<SmsSettings | null>({
    queryKey: ["sms-settings", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.SMS_SETTINGS).select("is_configured, at_username, at_api_key").eq("tenant_id", tenantId).maybeSingle();
      return data as SmsSettings | null;
    },
    staleTime: 300_000,
  });

  const isConfigured = smsSettings?.is_configured === true;

  // Stats
  const { data: smsStats } = useQuery({
    queryKey: ["sms-stats", tenantId],
    queryFn: async () => {
      const [totalRes, deliveredRes, phonesRes, scheduledRes] = await Promise.all([
        supabase.from(TABLES.SMS_HISTORY).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from(TABLES.SMS_HISTORY).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["sent", "delivered"]),
        supabase.from(TABLES.MEMBERS).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).not("phone", "is", null),
        supabase.from(TABLES.SMS_HISTORY).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "scheduled"),
      ]);
      return { total: totalRes.count ?? 0, delivered: deliveredRes.count ?? 0, withPhone: phonesRes.count ?? 0, scheduled: scheduledRes.count ?? 0 };
    },
    staleTime: 300_000,
    enabled: isConfigured,
  });

  // History
  const { data: history = [], isLoading: historyLoading } = useQuery<SmsRecord[]>({
    queryKey: ["sms-history", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.SMS_HISTORY).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      return (data ?? []) as SmsRecord[];
    },
    staleTime: 300_000,
    enabled: isConfigured,
  });

  const handleSendTest = async () => {
    const phone = userPhone;
    if (!phone) { toast.error("Please add a phone number to your profile to send a test SMS."); return; }
    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke("africastalking-sms", {
        body: { tenant_id: tenantId, is_test: true, admin_phone: phone, church_name: churchName },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["sms-history", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["sms-stats", tenantId] });
      toast.success(`✅ Test SMS sent to ${phone}`);
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "❌ Failed to send test SMS.");
    } finally {
      setSendingTest(false);
    }
  };

  if (settingsLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-5">
      {/* No credentials banner */}
      {!isConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-amber-800">
            <span className="font-medium">SMS not configured.</span> Add your Africa's Talking credentials in{" "}
            <button onClick={() => navigate("/settings/communications-settings")} className="text-orange-600 font-medium hover:underline">
              Settings → Communications → SMS →
            </button>
          </div>
        </div>
      )}

      {/* Top buttons */}
      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handleSendTest} disabled={sendingTest || !isConfigured} className="gap-1.5">
          <FlaskConical className="h-4 w-4" />
          {sendingTest ? "Sending..." : "Send Test SMS"}
        </Button>
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5" disabled={!isConfigured}
          onClick={() => navigate("/communications/compose?channel=sms")}>
          <Plus className="h-4 w-4" /> Compose Message
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: MessageSquare, color: "bg-blue-50 text-blue-500", value: smsStats?.total ?? 0, label: "Total SMS Sent" },
          { icon: CheckCircle2, color: "bg-emerald-50 text-emerald-500", value: smsStats?.delivered ?? 0, label: "Successfully Delivered" },
          { icon: Phone, color: "bg-violet-50 text-violet-500", value: smsStats?.withPhone ?? 0, label: "Members with Phone" },
          { icon: CalendarClock, color: "bg-amber-50 text-amber-500", value: smsStats?.scheduled ?? 0, label: "Scheduled SMS" },
        ].map(({ icon: Icon, color, value, label }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg mb-2 ${color}`}><Icon className="h-4 w-4" /></div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* SMS History */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50">
            <History className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">SMS History</p>
            <p className="text-xs text-slate-500">View all sent messages and their status</p>
          </div>
        </div>

        {historyLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <MessageSquare className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No SMS sent yet</p>
            <p className="text-xs">Compose your first SMS to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {history.map(sms => {
              const pill = STATUS_PILL[sms.status] ?? STATUS_PILL.sent;
              const sentAt = sms.sent_at ?? sms.created_at;
              return (
                <div key={sms.id} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-base">💬</span>
                      {sms.is_test && <span className="text-base">✏</span>}
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{sms.message.slice(0, 60)}{sms.message.length > 60 ? "…" : ""}</p>
                    </div>
                    <p className="text-xs text-slate-400 truncate mb-1.5">{sms.message.slice(0, 120)}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span>👥 {sms.recipient_count} recipients</span>
                      <span>🕐 {sentAt ? format(new Date(sentAt), "dd MMM yyyy · HH:mm") : "—"}</span>
                      <button onClick={() => setMetricsItem({ message: sms.message, recipient_count: sms.recipient_count, delivered_count: sms.delivered_count, failed_count: sms.failed_count, cost: sms.cost, currency: sms.currency, status: sms.status, sent_at: sentAt })}
                        className="text-orange-500 hover:text-orange-600 font-medium">📊 View Metrics</button>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${pill}`}>{sms.status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Metrics Modal */}
      {metricsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setMetricsItem(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4 pr-6">SMS Metrics</h3>
            <div className="space-y-3">
              {[
                { label: "Total Recipients", value: metricsItem.recipient_count },
                { label: "Successfully Delivered", value: metricsItem.delivered_count },
                { label: "Failed", value: metricsItem.failed_count },
                { label: "Cost", value: `${metricsItem.currency} ${metricsItem.cost?.toFixed(4) ?? "0.0000"}` },
                { label: "Status", value: metricsItem.status },
                { label: "Sent at", value: metricsItem.sent_at ? format(new Date(metricsItem.sent_at), "dd MMM yyyy · HH:mm") : "—" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <span className="text-sm text-slate-500">{row.label}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize">{String(row.value)}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => setMetricsItem(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
