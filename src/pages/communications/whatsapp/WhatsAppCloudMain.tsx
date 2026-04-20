import { useState } from "react";
import { useChurch } from "@/contexts/ChurchContext";
import { Button } from "@/components/ui/button";
import { MessageCircle, FileText, Zap, BarChart3, CreditCard, Paintbrush, Radio, RefreshCw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { WaCloudTab } from "./WaCloudTab";
import { WaTemplatesTab } from "./WaTemplatesTab";
import { WaAutomationTab } from "./WaAutomationTab";
import { WaReportTab } from "./WaReportTab";
import { WaCreditsTab } from "./WaCreditsTab";

const TABS = [
  { id: "cloud", label: "WhatsApp Cloud", icon: MessageCircle },
  { id: "templates", label: "WA Templates", icon: FileText },
  { id: "automation", label: "WA Automation", icon: Zap },
  { id: "report", label: "WA Report", icon: BarChart3 },
  { id: "credits", label: "WA Credits", icon: CreditCard },
  { id: "branding", label: "WA Branding", icon: Paintbrush },
  { id: "admin", label: "Admin Broadcast", icon: Radio },
];

export function WhatsAppCloud() {
  const { tenantId } = useChurch();
  const [activeTab, setActiveTab] = useState("cloud");
  const [sendMessageOpen, setSendMessageOpen] = useState(false);

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg p-1 flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors", activeTab === tab.id ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              <Icon className="h-3.5 w-3.5" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "cloud" && <WaCloudTab tenantId={tenantId} onSendMessage={() => setSendMessageOpen(true)} />}
      {activeTab === "templates" && <WaTemplatesTab tenantId={tenantId} />}
      {activeTab === "automation" && <WaAutomationTab tenantId={tenantId} />}
      {activeTab === "report" && <WaReportTab tenantId={tenantId} />}
      {activeTab === "credits" && <WaCreditsTab tenantId={tenantId} />}
      {activeTab === "branding" && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 flex flex-col items-center text-center gap-3">
          <Paintbrush className="h-10 w-10 text-slate-400" />
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">WA Branding</p>
          <p className="text-sm text-slate-500 max-w-md">Customize your WhatsApp Business profile appearance. Coming soon.</p>
        </div>
      )}
      {activeTab === "admin" && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 flex flex-col items-center text-center gap-3">
          <Radio className="h-10 w-10 text-slate-400" />
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Admin Broadcast</p>
          <p className="text-sm text-slate-500 max-w-md">Send urgent WhatsApp messages to all admins and staff. Coming soon.</p>
        </div>
      )}
    </div>
  );
}
