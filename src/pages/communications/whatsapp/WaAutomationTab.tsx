import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, RefreshCw, UserPlus, Zap, Gift, Calendar, Heart, Bell, Star, Droplets, Handshake, ClipboardList, CalendarCheck, CalendarX } from "lucide-react";
import { cn } from "@/lib/utils";

const TRIGGERS = [
  { key: "visitor_welcome", label: "Visitor Welcome", icon: UserPlus, iconColor: "bg-purple-50 text-purple-500", desc: "When a new visitor registers", defaultTemplate: "visitor_welcome", defaultActive: true },
  { key: "new_member_welcome", label: "New Member Welcome", icon: Zap, iconColor: "bg-blue-50 text-blue-500", desc: "When a visitor becomes a full member", defaultTemplate: "member_welcome", defaultActive: true },
  { key: "birthday_greetings", label: "Birthday Greetings", icon: Gift, iconColor: "bg-pink-50 text-pink-500", desc: "On member birthdays", defaultTemplate: "birthday_greeting", defaultActive: false },
  { key: "event_reminders", label: "Event Reminders", icon: Calendar, iconColor: "bg-orange-50 text-orange-500", desc: "Before registered events", defaultTemplate: "event_reminder", defaultActive: false },
  { key: "giving_thank_you", label: "Giving Thank You", icon: Heart, iconColor: "bg-red-50 text-red-500", desc: "After a donation is recorded", defaultTemplate: "giving_thank_you", defaultActive: false },
  { key: "prayer_request_received", label: "Prayer Request Received", icon: Droplets, iconColor: "bg-sky-50 text-sky-500", desc: "When a prayer request is submitted", defaultTemplate: "prayer_request_received", defaultActive: false },
  { key: "appointment_confirmed", label: "Appointment Confirmed", icon: CalendarCheck, iconColor: "bg-emerald-50 text-emerald-500", desc: "When an appointment is booked", defaultTemplate: "appointment_confirmed", defaultActive: false },
  { key: "appointment_reminder", label: "Appointment Reminder", icon: Bell, iconColor: "bg-amber-50 text-amber-500", desc: "24 hours before an appointment", defaultTemplate: "appointment_reminder", defaultActive: false },
  { key: "appointment_cancelled", label: "Appointment Cancelled", icon: CalendarX, iconColor: "bg-red-50 text-red-500", desc: "When an appointment is cancelled", defaultTemplate: "appointment_cancelled", defaultActive: false },
  { key: "task_reminder", label: "Task Reminder", icon: ClipboardList, iconColor: "bg-orange-50 text-orange-500", desc: "When a task is assigned to a staff member", defaultTemplate: "task_reminder", defaultActive: false },
  { key: "pledge_reminder", label: "Pledge Reminder", icon: Handshake, iconColor: "bg-violet-50 text-violet-500", desc: "To remind members of pledge commitments", defaultTemplate: "pledge_reminder", defaultActive: false },
  { key: "membership_anniversary", label: "Membership Anniversary", icon: Star, iconColor: "bg-yellow-50 text-yellow-500", desc: "On membership anniversary date", defaultTemplate: "membership_anniversary", defaultActive: false },
  { key: "baptism_anniversary", label: "Baptism Anniversary", icon: Droplets, iconColor: "bg-sky-50 text-sky-500", desc: "On baptism anniversary date", defaultTemplate: "baptism_anniversary", defaultActive: false },
];

const TEMPLATE_NAMES = [
  "visitor_welcome", "member_welcome", "birthday_greeting", "event_reminder",
  "giving_thank_you", "prayer_request_received", "appointment_confirmed",
  "appointment_reminder", "appointment_cancelled", "task_reminder",
  "pledge_reminder", "membership_anniversary", "baptism_anniversary",
];

interface AutomationState { is_active: boolean; template_name: string; }

export function WaAutomationTab({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const [states, setStates] = useState<Record<string, AutomationState>>({});
  const [saving, setSaving] = useState(false);

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["wa-automations", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.WHATSAPP_AUTOMATIONS).select("*").eq("tenant_id", tenantId);
      const existing = data ?? [];
      const existingKeys = new Set(existing.map((a: any) => a.trigger_name));
      const missing = TRIGGERS.filter(t => !existingKeys.has(t.key));
      if (missing.length > 0) {
        const rows = missing.map(t => ({ tenant_id: tenantId, trigger_name: t.key, template_name: t.defaultTemplate, is_active: t.defaultActive }));
        await supabase.from(TABLES.WHATSAPP_AUTOMATIONS).insert(rows as any);
        const { data: fresh } = await supabase.from(TABLES.WHATSAPP_AUTOMATIONS).select("*").eq("tenant_id", tenantId);
        return fresh ?? [];
      }
      return existing;
    },
    staleTime: 300_000,
  });

  // Merge DB state with local pending changes
  const getState = (key: string): AutomationState => {
    if (states[key]) return states[key];
    const db = automations.find((a: any) => a.trigger_name === key);
    return { is_active: db?.is_active ?? false, template_name: db?.template_name ?? key };
  };

  const setField = (key: string, field: keyof AutomationState, value: any) => {
    setStates(prev => ({ ...prev, [key]: { ...getState(key), [field]: value } }));
  };

  const handleSave = async () => {
    if (Object.keys(states).length === 0) { toast.info("No changes to save."); return; }
    setSaving(true);
    try {
      for (const [key, state] of Object.entries(states)) {
        await supabase.from(TABLES.WHATSAPP_AUTOMATIONS).upsert({
          tenant_id: tenantId, trigger_name: key,
          is_active: state.is_active, template_name: state.template_name,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "tenant_id,trigger_name" });
      }
      qc.invalidateQueries({ queryKey: ["wa-automations", tenantId] });
      setStates({});
      toast.success("Automation settings saved successfully!");
    } catch (err: unknown) { toast.error((err as Error)?.message ?? "Failed to save."); }
    finally { setSaving(false); }
  };

  const activeCount = TRIGGERS.filter(t => getState(t.key).is_active).length;

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <span className="text-emerald-600 text-lg">⚡</span>
        <p className="text-sm text-emerald-800">
          <span className="font-medium">WhatsApp Automation</span> — Select which approved templates should be automatically sent when specific events occur. Variables are auto-filled with church and member data at send time.
        </p>
      </div>

      {/* Stats + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-slate-700">{activeCount} active automations</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Zap className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-sm font-medium text-slate-700">{TEMPLATE_NAMES.length} templates available</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setStates({}); qc.invalidateQueries({ queryKey: ["wa-automations", tenantId] }); }} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />Reset
          </Button>
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5" onClick={handleSave} disabled={saving || Object.keys(states).length === 0}>
            <Save className="h-4 w-4" />{saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Automation cards */}
      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : (
        <div className="space-y-4">
          {TRIGGERS.map(trigger => {
            const Icon = trigger.icon;
            const state = getState(trigger.key);
            return (
              <div key={trigger.key} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", trigger.iconColor)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{trigger.label}</p>
                        {state.is_active && <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Active</span>}
                      </div>
                      <p className="text-xs text-slate-500">{trigger.desc}</p>
                    </div>
                  </div>
                  {state.is_active && (
                    <div className="ml-12 space-y-1.5">
                      <p className="text-xs text-slate-500 font-medium">Template</p>
                      <Select value={state.template_name} onValueChange={v => setField(trigger.key, "template_name", v)}>
                        <SelectTrigger className="h-8 text-xs max-w-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_NAMES.map(n => <SelectItem key={n} value={n} className="text-xs capitalize">{n.replace(/_/g, " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <Switch checked={state.is_active} onCheckedChange={v => setField(trigger.key, "is_active", v)} className="data-[state=checked]:bg-orange-500 shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
