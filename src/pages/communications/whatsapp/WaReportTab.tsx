import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/shared/ReadOnlyBanner";
import { PermissionButton } from "@/components/shared/PermissionButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Download } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

export function WaReportTab({ tenantId }: { tenantId: string }) {
  const { isReadOnly } = usePermissions();
  const reportsReadOnly = isReadOnly('reports_analytics');
  const [days, setDays] = useState(30);

  const since = subDays(new Date(), days).toISOString();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["wa-report-messages", tenantId, days],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.WHATSAPP_MESSAGES).select("*").eq("tenant_id", tenantId).gte("created_at", since).order("created_at", { ascending: false });
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const total = messages.length;
  const delivered = messages.filter((m: any) => m.status === "delivered" || m.status === "read").length;
  const read = messages.filter((m: any) => m.status === "read").length;
  const failed = messages.filter((m: any) => m.status === "failed").length;

  const pct = (n: number) => total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "0%";

  // Template usage
  const templateUsage: Record<string, number> = {};
  messages.forEach((m: any) => { templateUsage[m.template_name] = (templateUsage[m.template_name] ?? 0) + 1; });
  const topTemplates = Object.entries(templateUsage).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const exportCsv = () => {
    const rows = [["Recipient", "Template", "Status", "Sent At"]];
    messages.forEach((m: any) => rows.push([m.recipient_phone, m.template_name, m.status, m.sent_at ?? ""]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "wa_report.csv"; a.click();
  };

  return (
    <div className="space-y-5">
      {reportsReadOnly && <ReadOnlyBanner permission="reports_analytics" />}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50"><BarChart3 className="h-4 w-4 text-orange-500" /></div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">WhatsApp Report</p>
            <p className="text-xs text-slate-500">Message delivery and engagement analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)} className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors", days === d ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-700")}>{d} Days</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Sent", value: total, pct: "100%", color: "bg-blue-50 text-blue-600" },
          { label: "Delivered", value: delivered, pct: pct(delivered), color: "bg-emerald-50 text-emerald-600" },
          { label: "Read", value: read, pct: pct(read), color: "bg-purple-50 text-purple-600" },
          { label: "Failed", value: failed, pct: pct(failed), color: "bg-red-50 text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mt-1.5", s.color)}>{s.pct}</span>
          </div>
        ))}
      </div>

      {/* Most used templates */}
      {topTemplates.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Most Used Templates</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Template</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Times Used</th>
              </tr>
            </thead>
            <tbody>
              {topTemplates.map(([name, count]) => (
                <tr key={name} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 text-sm text-slate-700 capitalize">{name.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-sm text-slate-700 text-right font-semibold">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent message log */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recent Message Log</p>
          <PermissionButton readOnly={reportsReadOnly} variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />Export CSV
          </PermissionButton>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <BarChart3 className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No WhatsApp messages sent in the last {days} days</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200">
                {["Recipient", "Template", "Status", "Sent At"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {messages.slice(0, 20).map((m: any) => {
                const pill = { sent: "bg-blue-100 text-blue-700", delivered: "bg-emerald-100 text-emerald-700", read: "bg-purple-100 text-purple-700", failed: "bg-red-100 text-red-700" }[m.status] ?? "bg-slate-100 text-slate-600";
                return (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2.5 text-sm text-slate-700">{m.recipient_phone}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 capitalize">{m.template_name.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2.5"><span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", pill)}>{m.status}</span></td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{m.sent_at ? format(new Date(m.sent_at), "dd MMM yyyy · HH:mm") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
