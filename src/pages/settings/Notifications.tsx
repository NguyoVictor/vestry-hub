import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Mail, Bell, UserPlus, DollarSign, BarChart3, CalendarDays, MessageSquare, Eye, Shield } from "lucide-react";
import { TABLES } from "@/lib/schema";
import { useState, useEffect } from "react";

const EMAIL_PREFS = [
  { key: "email_new_member", label: "New Member Joined", desc: "Get notified when a new member joins your church", icon: UserPlus },
  { key: "email_new_donation", label: "New Donation Received", desc: "Get notified for every donation made", icon: DollarSign },
  { key: "email_weekly_summary", label: "Weekly Giving Summary", desc: "Receive a weekly summary of all giving", icon: BarChart3 },
  { key: "email_new_event", label: "New Event Created", desc: "Get notified when a new event is scheduled", icon: CalendarDays },
  { key: "email_member_request", label: "Member Request Submitted", desc: "Get notified when a member submits a request", icon: MessageSquare },
  { key: "email_new_visitor", label: "New Visitor Logged", desc: "Get notified when a visitor is recorded", icon: Eye },
  { key: "email_weekly_digest", label: "Weekly Activity Digest", desc: "A weekly email summary of church activity", icon: Mail },
];

const INAPP_PREFS = [
  { key: "inapp_new_member", label: "New Member Joined", desc: "In-app notification for new members", icon: UserPlus },
  { key: "inapp_new_donation", label: "New Donation Received", desc: "In-app notification for donations", icon: DollarSign },
  { key: "inapp_weekly_summary", label: "Weekly Giving Summary", desc: "In-app weekly giving summary", icon: BarChart3 },
  { key: "inapp_new_event", label: "New Event Created", desc: "In-app notification for events", icon: CalendarDays },
  { key: "inapp_member_request", label: "Member Request Submitted", desc: "In-app notification for requests", icon: MessageSquare },
  { key: "inapp_new_visitor", label: "New Visitor Logged", desc: "In-app notification for visitors", icon: Eye },
  { key: "inapp_weekly_digest", label: "Weekly Activity Digest", desc: "In-app weekly activity digest", icon: Mail },
];

type PrefsState = Record<string, boolean>;

const Notifications = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const [prefs, setPrefs] = useState<PrefsState>({});

  const { data, isLoading } = useQuery({
    queryKey: ["notification-prefs", church.userId, church.tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.NOTIFICATION_PREFERENCES)
        .select("*")
        .eq("user_id", church.userId)
        .eq("tenant_id", church.tenantId)
        .single();
      return data as any;
    },
  });

  useEffect(() => {
    if (data) {
      const p: PrefsState = {};
      [...EMAIL_PREFS, ...INAPP_PREFS].forEach(({ key }) => { p[key] = data[key] ?? true; });
      setPrefs(p);
    } else if (!isLoading) {
      const defaults: PrefsState = {};
      EMAIL_PREFS.forEach(({ key }) => { defaults[key] = true; });
      INAPP_PREFS.forEach(({ key }) => { defaults[key] = key.includes("weekly") ? false : true; });
      setPrefs(defaults);
    }
  }, [data, isLoading]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      const payload = { user_id: church.userId, tenant_id: church.tenantId, ...prefs };
      const { error } = await supabase.from(TABLES.NOTIFICATION_PREFERENCES).upsert(payload as any, { onConflict: "user_id,tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-prefs"] });
      toast.success("Preferences saved");
    },
    onError: () => toast.error("Failed to save preferences"),
  });

  const toggle = (key: string, value: boolean) => { if (!readOnly) setPrefs(p => ({ ...p, [key]: value })); };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  const renderSection = (title: string, icon: React.ReactNode, items: typeof EMAIL_PREFS) => (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle></CardHeader>
      <CardContent className="divide-y divide-border">
        {items.map(({ key, label, desc, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
            <Switch checked={prefs[key] ?? true} onCheckedChange={(v) => toggle(key, v)} disabled={readOnly} />
          </div>
        ))}
        {/* Security alert — always on */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Security Alert</p>
              <p className="text-xs text-muted-foreground">Get notified of suspicious login activity</p>
            </div>
          </div>
          <Switch checked disabled />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Helmet><title>Notifications — Vestry</title></Helmet>
      
      {/* Read-only banner */}
      {readOnly && <ReadOnlyBanner section="Notification Preferences" />}
      
      <PageHeader title="Notification Preferences" subtitle="Choose what updates you want to be notified about" />

      <div className="max-w-3xl space-y-6">
        {renderSection("Email Notifications", <Mail className="h-4 w-4" />, EMAIL_PREFS)}
        {renderSection("In-App Notifications", <Bell className="h-4 w-4" />, INAPP_PREFS)}

        <Button className="w-full" disabled={saveMutation.isPending || readOnly} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </>
  );
};

export default Notifications;
