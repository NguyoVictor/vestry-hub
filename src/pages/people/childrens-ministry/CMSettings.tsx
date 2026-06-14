import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { PageTransition } from "@/components/ui/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Settings, Monitor, QrCode, Bell, Layers, Loader2, Eye, EyeOff } from "lucide-react";
import type { CMSettings as CMSettingsType } from "./types";

const DEFAULT_SETTINGS: Omit<CMSettingsType, "id" | "tenant_id"> = {
  kiosk_pin: "1234",
  kiosk_idle_timeout_minutes: 1,
  kiosk_auto_return_seconds: 3,
  auto_send_qr_on_confirm: true,
  send_qr_reminder: true,
  qr_reminder_days_before: 1,
  notify_checkin: true,
  notify_checkout: true,
  email_qr_to_parents: false,
  auto_assign_class_by_age: true,
};

export default function CMSettings() {
  const { tenantId } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('member_management');
  const qc = useQueryClient();
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [showPin, setShowPin] = useState(false);

  const { data: settings, isLoading } = useQuery<CMSettingsType | null>({
    queryKey: ["cm-settings", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.CHILDREN_MINISTRY_SETTINGS).select("*").eq("tenant_id", tenantId!).maybeSingle();
      return data as CMSettingsType | null;
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (settings) setForm({ kiosk_pin: settings.kiosk_pin, kiosk_idle_timeout_minutes: settings.kiosk_idle_timeout_minutes, kiosk_auto_return_seconds: settings.kiosk_auto_return_seconds, auto_send_qr_on_confirm: settings.auto_send_qr_on_confirm, send_qr_reminder: settings.send_qr_reminder, qr_reminder_days_before: settings.qr_reminder_days_before, notify_checkin: settings.notify_checkin, notify_checkout: settings.notify_checkout, email_qr_to_parents: settings.email_qr_to_parents, auto_assign_class_by_age: settings.auto_assign_class_by_age });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      if (settings) {
        const { error } = await supabase.from(TABLES.CHILDREN_MINISTRY_SETTINGS).update({ ...form, updated_at: new Date().toISOString() } as any).eq("tenant_id", tenantId!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.CHILDREN_MINISTRY_SETTINGS).insert({ ...form, tenant_id: tenantId! } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cm-settings"] }); toast.success("Settings saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (key: keyof typeof form, value: any) => setForm(f => ({ ...f, [key]: value }));

  if (isLoading) return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
    </div>
  );

  return (
    <>
      <Helmet><title>Settings — Children's Ministry</title></Helmet>
      <PageTransition>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure children's ministry preferences</p>
        </div>

        <div className="max-w-2xl space-y-5">
          {/* Kiosk Settings */}
          <SettingsCard icon={Monitor} title="Kiosk Settings" description="Configure the tablet check-in kiosk">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Admin PIN (4 digits)</Label>
                <div className="flex items-center gap-2 max-w-xs">
                  <Input type={showPin ? "text" : "password"} value={form.kiosk_pin} onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); set("kiosk_pin", v); }} maxLength={4} className="h-10 border-slate-200 focus:border-orange-500 text-sm font-mono tracking-widest" placeholder="1234" />
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400" onClick={() => setShowPin(s => !s)}>
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-400">Required to exit kiosk mode</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Idle timeout (minutes)</Label>
                  <Input type="number" min={1} max={60} value={form.kiosk_idle_timeout_minutes} onChange={e => set("kiosk_idle_timeout_minutes", Number(e.target.value))} className="h-10 border-slate-200 focus:border-orange-500 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Auto-return after check-in (seconds)</Label>
                  <Input type="number" min={1} max={30} value={form.kiosk_auto_return_seconds} onChange={e => set("kiosk_auto_return_seconds", Number(e.target.value))} className="h-10 border-slate-200 focus:border-orange-500 text-sm" />
                </div>
              </div>
            </div>
          </SettingsCard>

          {/* QR Code Settings */}
          <SettingsCard icon={QrCode} title="QR Code Settings" description="Control when QR codes are generated and sent">
            <div className="space-y-4">
              <ToggleRow label="Auto-send QR when parent confirms service" description="Generates and sends QR code immediately when a parent confirms attendance" checked={form.auto_send_qr_on_confirm} onChange={v => set("auto_send_qr_on_confirm", v)} />
              <ToggleRow label="Send reminder before service" description="Send QR code reminder email before the service" checked={form.send_qr_reminder} onChange={v => set("send_qr_reminder", v)} />
              {form.send_qr_reminder && (
                <div className="space-y-1.5 ml-8">
                  <Label className="text-xs font-medium text-slate-600">Days before service</Label>
                  <Input type="number" min={1} max={7} value={form.qr_reminder_days_before} onChange={e => set("qr_reminder_days_before", Number(e.target.value))} className="h-9 w-24 border-slate-200 focus:border-orange-500 text-sm" />
                </div>
              )}
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">QR code expiry:</span> End of service day (fixed)</p>
              </div>
            </div>
          </SettingsCard>

          {/* Notification Settings */}
          <SettingsCard icon={Bell} title="Notification Settings" description="Control parent notifications for check-in events">
            <div className="space-y-4">
              <ToggleRow label="Notify parent on check-in" description="Send in-app notification when child is checked in" checked={form.notify_checkin} onChange={v => set("notify_checkin", v)} />
              <ToggleRow label="Notify parent on check-out" description="Send in-app notification when child is checked out" checked={form.notify_checkout} onChange={v => set("notify_checkout", v)} />
              <ToggleRow label="Email QR codes to parents" description="Requires email to be configured in Communications settings" checked={form.email_qr_to_parents} onChange={v => set("email_qr_to_parents", v)} />
            </div>
          </SettingsCard>

          {/* Class Auto-assignment */}
          <SettingsCard icon={Layers} title="Class Auto-assignment" description="Automatically place children in age-appropriate classes">
            <ToggleRow label="Auto-assign class based on age" description="When registering a child, automatically select the class that matches their age" checked={form.auto_assign_class_by_age} onChange={v => set("auto_assign_class_by_age", v)} />
          </SettingsCard>

          <PermissionButton 
            permission="member_management"
            readOnly={readOnly}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold w-full sm:w-auto" 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Settings"}
          </PermissionButton>
        </div>
      </PageTransition>
    </>
  );
}

function SettingsCard({ icon: Icon, title, description, children }: { icon: any; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 shrink-0">
          <Icon className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="border-t border-slate-100 pt-4">{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0 mt-0.5" />
    </div>
  );
}
