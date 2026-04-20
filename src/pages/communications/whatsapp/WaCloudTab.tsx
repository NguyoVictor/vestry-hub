import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Phone, Zap, CreditCard, Plus, CheckCircle2, AlertTriangle, ExternalLink, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const WA_GREEN = "#25D366";

export function WaCloudTab({ tenantId, onSendMessage }: { tenantId: string; onSendMessage: () => void }) {
  const [connecting, setConnecting] = useState(false);

  // Check if connected
  const { data: tenant } = useQuery({
    queryKey: ["tenant-wa-status", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("whatsapp_connected, whatsapp_phone_number").eq("id", tenantId).maybeSingle();
      return data as { whatsapp_connected: boolean | null; whatsapp_phone_number: string | null } | null;
    },
    staleTime: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["wa-stats", tenantId],
    queryFn: async () => {
      const [membersRes, templatesRes, creditsRes] = await Promise.all([
        supabase.from(TABLES.MEMBERS).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).not("phone", "is", null),
        supabase.from(TABLES.WHATSAPP_TEMPLATES).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from(TABLES.WHATSAPP_CREDITS).select("total_credits, used_credits").eq("tenant_id", tenantId).maybeSingle(),
      ]);
      const remaining = (creditsRes.data?.total_credits ?? 0) - (creditsRes.data?.used_credits ?? 0);
      return { membersWithPhone: membersRes.count ?? 0, templates: templatesRes.count ?? 0, credits: remaining };
    },
    staleTime: 300_000,
    enabled: tenant?.whatsapp_connected === true,
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["wa-messages", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.WHATSAPP_MESSAGES).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    staleTime: 300_000,
    enabled: tenant?.whatsapp_connected === true,
  });

  const isConnected = tenant?.whatsapp_connected === true;

  const handleConnect = () => {
    const metaAppId = import.meta.env.VITE_META_APP_ID;
    const metaConfigId = import.meta.env.VITE_META_CONFIG_ID;
    if (!metaAppId || !metaConfigId) {
      alert("Meta App ID and Config ID not configured. Add them to .env");
      return;
    }
    setConnecting(true);
    // Open Meta Embedded Signup
    window.open(`https://www.facebook.com/v18.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${window.location.origin}/whatsapp/callback&config_id=${metaConfigId}`, "_blank", "width=600,height=800");
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: MessageCircle, color: `bg-[${WA_GREEN}]/10`, iconColor: WA_GREEN, title: "WhatsApp", subtitle: "Cloud API" },
          { icon: Phone, color: "bg-violet-50", iconColor: "#8B5CF6", value: stats?.membersWithPhone ?? 0, label: "Members with Phone" },
          { icon: Zap, color: "bg-blue-50", iconColor: "#3B82F6", value: stats?.templates ?? 0, label: "Approved Templates" },
          { icon: CreditCard, color: "bg-orange-50", iconColor: "#F97316", value: stats?.credits ?? 0, label: "Credits Available" },
        ].map((item, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg mb-2", item.color)}>
              <item.icon className="h-4 w-4" style={{ color: item.iconColor }} />
            </div>
            {i === 0 ? (
              <><p className="text-base font-bold text-slate-800 dark:text-slate-100">{item.title}</p><p className="text-xs text-slate-500">{item.subtitle}</p></>
            ) : (
              <><p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{item.value}</p><p className="text-xs text-slate-500 mt-0.5">{item.label}</p></>
            )}
          </div>
        ))}
      </div>

      {/* Connect or Connected */}
      {!isConnected ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 flex flex-col items-center text-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${WA_GREEN}20` }}>
            <MessageCircle className="h-8 w-8" style={{ color: WA_GREEN }} />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Connect Your WhatsApp Business Account</p>
            <p className="text-sm text-slate-500 mt-1 max-w-md">Connect your church's own WhatsApp Business number through Meta's secure Embedded Signup. Each church uses their own number.</p>
          </div>
          <Button className="text-white gap-2" style={{ backgroundColor: WA_GREEN }} onClick={handleConnect} disabled={connecting}>
            <MessageCircle className="h-4 w-4" />
            {connecting ? "Opening..." : "Connect WhatsApp Business"}
          </Button>
          <p className="text-xs text-slate-400 max-w-md">You will need a Meta Business Account and a phone number that is not already registered on WhatsApp</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 shadow-sm p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">Connected ✅</p>
              <p className="text-xs text-slate-500">{tenant?.whatsapp_phone_number ?? "Phone number connected"}</p>
            </div>
          </div>
          <Button variant="outline" size="sm">Disconnect</Button>
        </div>
      )}

      {/* Send Message */}
      {isConnected && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50">
                  <MessageCircle className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Send WhatsApp Message</p>
                  <p className="text-xs text-slate-500">Send template-based messages via WhatsApp Business Cloud API</p>
                </div>
              </div>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5" onClick={onSendMessage}>
                <Plus className="h-4 w-4" />Send Message
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <p className="text-xs font-semibold text-slate-700">Template-Based Messaging</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">WhatsApp Business API requires pre-approved message templates. Select from your approved templates to send messages.</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-xs font-semibold text-slate-700">Delivery Tracking</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Track message delivery status including sent, delivered, and read receipts via webhook integration.</p>
              </div>
            </div>
          </div>

          {/* Recent Messages */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50">
                  <Clock className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recent Messages</p>
                  <p className="text-xs text-slate-500">View your recently sent WhatsApp messages</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />Refresh
              </Button>
            </div>
            {isLoading ? (
              <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <MessageCircle className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No messages sent yet</p>
                <p className="text-xs">Send your first WhatsApp message to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {messages.map((msg: any) => {
                  const statusPill = { sent: "bg-blue-100 text-blue-700 border-blue-200", delivered: "bg-emerald-100 text-emerald-700 border-emerald-200", read: "bg-purple-100 text-purple-700 border-purple-200", failed: "bg-red-100 text-red-700 border-red-200" }[msg.status] ?? "bg-slate-100 text-slate-600 border-slate-200";
                  return (
                    <div key={msg.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{msg.recipient_phone}</p>
                        <p className="text-xs text-slate-400">{msg.template_name.replace(/_/g, " ")}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border capitalize", statusPill)}>{msg.status}</span>
                        <span className="text-xs text-slate-400">{msg.sent_at ? format(new Date(msg.sent_at), "dd MMM") : "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
