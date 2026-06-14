import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, MessageSquare, Settings, Eye, EyeOff, RefreshCw, ExternalLink } from "lucide-react";

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, subtitle, action }: {
  icon: React.ElementType; title: string; subtitle: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
          <Icon className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange, disabled, readOnly }: {
  label: string; description: string; checked: boolean;
  onChange: (v: boolean) => void; disabled?: boolean; readOnly?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-t border-slate-100 dark:border-slate-700 first:border-t-0">
      <div>
        <p className={`text-sm font-medium ${disabled || readOnly ? "text-slate-400" : "text-slate-700 dark:text-slate-200"}`}>{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled || readOnly}
        className="data-[state=checked]:bg-orange-500 shrink-0"
      />
    </div>
  );
}

function GroupLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="text-xs font-semibold text-orange-500 uppercase tracking-wider whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-orange-100 dark:bg-orange-900/30" />
    </div>
  );
}

function Expandable({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
      <div className="pt-2 space-y-3">{children}</div>
    </div>
  );
}

// ─── Notification keys ────────────────────────────────────────────────────────
type NotifKey =
  | "notif_event_cancellation" | "notif_event_reminder_1d" | "notif_event_reminder_3d"
  | "notif_event_reminder_7d" | "notif_service_reminder"
  | "notif_donation_confirmation" | "notif_pledge_reminder" | "notif_recurring_donation"
  | "notif_task_assigned" | "notif_task_due_soon" | "notif_task_overdue" | "notif_volunteer_assignment"
  | "notif_appt_confirmation" | "notif_appt_reminder" | "notif_appt_status_change"
  | "notif_group_announcement" | "notif_group_meeting_reminder"
  | "notif_anniversary" | "notif_birthday" | "notif_welcome"
  | "notif_asset_approval" | "notif_asset_return"
  | "notif_service_request"
  | "notif_followup_assignment" | "notif_milestone";

const ALL_NOTIF_KEYS: NotifKey[] = [
  "notif_event_cancellation","notif_event_reminder_1d","notif_event_reminder_3d",
  "notif_event_reminder_7d","notif_service_reminder",
  "notif_donation_confirmation","notif_pledge_reminder","notif_recurring_donation",
  "notif_task_assigned","notif_task_due_soon","notif_task_overdue","notif_volunteer_assignment",
  "notif_appt_confirmation","notif_appt_reminder","notif_appt_status_change",
  "notif_group_announcement","notif_group_meeting_reminder",
  "notif_anniversary","notif_birthday","notif_welcome",
  "notif_asset_approval","notif_asset_return",
  "notif_service_request",
  "notif_followup_assignment","notif_milestone",
];

type NotifState = Record<NotifKey, boolean>;
const DEFAULT_NOTIFS: NotifState = Object.fromEntries(ALL_NOTIF_KEYS.map(k => [k, true])) as NotifState;

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NotificationsSettings() {
  const { tenantId } = useChurch();
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');

  // Card 1
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBlocked, setPushBlocked] = useState(false);

  // Card 2
  const [notifs, setNotifs] = useState<NotifState>(DEFAULT_NOTIFS);

  // Card 3 — Africa's Talking
  const [atEnabled,         setAtEnabled]         = useState(false);
  const [atUsername,        setAtUsername]         = useState("");
  const [atApiKey,          setAtApiKey]           = useState("");
  const [atSenderId,        setAtSenderId]         = useState("");
  const [atLowBalanceAlert, setAtLowBalanceAlert]  = useState(false);
  const [atThreshold,       setAtThreshold]        = useState("500");
  const [showApiKey,        setShowApiKey]         = useState(false);
  const [atBalance,         setAtBalance]          = useState<string | null>(null);
  const [testingConn,       setTestingConn]        = useState(false);

  // Check browser permission on mount
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") setPushEnabled(true);
    if (Notification.permission === "denied")  setPushBlocked(true);
  }, []);

  const handlePushToggle = async (val: boolean) => {
    if (!val) { setPushEnabled(false); return; }
    if (!("Notification" in window)) {
      toast.warning("Your browser does not support push notifications");
      return;
    }
    if (Notification.permission === "denied") {
      toast.info("Notifications blocked. You can enable them in your browser settings.");
      setPushBlocked(true);
      return;
    }
    const result = await Notification.requestPermission();
    if (result === "granted") {
      setPushEnabled(true);
      setPushBlocked(false);
      toast.success("Push notifications enabled");
    } else {
      setPushEnabled(false);
      setPushBlocked(result === "denied");
      toast.info("Notifications blocked. You can enable them in your browser settings.");
    }
  };

  const setNotif = (key: NotifKey, val: boolean) =>
    setNotifs(prev => ({ ...prev, [key]: val }));

  // Fetch saved settings
  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-notifications", tenantId],
    queryFn: async () => {
      const cols = [
        "push_notifications_enabled",
        ...ALL_NOTIF_KEYS,
        "at_sms_enabled","at_username","sender_id",
        "at_low_balance_alert","at_low_balance_threshold",
      ].join(",");
      const { data, error } = await supabase
        .from(TABLES.TENANTS)
        .select(cols)
        .eq(COLS.ID, tenantId)
        .single();
      if (error) throw error;
      return data as Record<string, boolean | string | number | null>;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!tenant) return;
    if (tenant.push_notifications_enabled) setPushEnabled(true);
    const n: Partial<NotifState> = {};
    for (const k of ALL_NOTIF_KEYS) n[k] = tenant[k] !== false;
    setNotifs({ ...DEFAULT_NOTIFS, ...n });
    setAtEnabled(!!tenant.at_sms_enabled);
    setAtUsername((tenant.at_username as string) ?? "");
    setAtSenderId((tenant.sender_id as string) ?? "");
    setAtLowBalanceAlert(!!tenant.at_low_balance_alert);
    setAtThreshold(String(tenant.at_low_balance_threshold ?? 500));
    // Note: at_api_key is NOT fetched — never re-expose after save
  }, [tenant]);

  // Test connection via Edge Function (API key never leaves server after save)
  const handleTestConnection = async () => {
    if (!atUsername) { toast.error("Enter username first."); return; }
    if (!atApiKey && !tenant?.at_api_key) { toast.error("Enter API key first."); return; }
    setTestingConn(true);
    try {
      // If user typed a new key, save it first then test
      if (atApiKey) {
        await supabase.from(TABLES.TENANTS)
          .update({ at_api_key: atApiKey, at_username: atUsername } as never)
          .eq(COLS.ID, tenantId);
      }
      const { data, error } = await supabase.functions.invoke("at-sms", {
        body: { action: "check_balance", tenantId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAtBalance(data.balance);
      toast.success("Connection successful!");
    } catch (err: unknown) {
      toast.error(`Connection failed: ${(err as Error).message}`);
    } finally {
      setTestingConn(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      const payload: Record<string, unknown> = {
        push_notifications_enabled: pushEnabled,
        ...notifs,
        at_sms_enabled: atEnabled,
        at_username: atUsername || null,
        sender_id: atSenderId || null,
        at_low_balance_alert: atLowBalanceAlert,
        at_low_balance_threshold: parseInt(atThreshold) || 500,
        updated_at: new Date().toISOString(),
      };
      // Only update api_key if user typed a new one
      if (atApiKey) payload.at_api_key = atApiKey;
      const { error } = await supabase
        .from(TABLES.TENANTS)
        .update(payload as never)
        .eq(COLS.ID, tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-notifications", tenantId] });
      setAtApiKey(""); // clear from state after save
      toast.success("Notification settings saved");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save."),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Notifications — Vestry</title></Helmet>

      {readOnly && <ReadOnlyBanner section="Notification Settings" />}

      <div className="max-w-2xl space-y-5 pb-24">

        {/* ── Card 1: Push Notifications ── */}
        <Card>
          <CardHeader
            icon={Bell}
            title="Push Notifications"
            subtitle="Receive real-time alerts for events, tasks, and important updates"
          />
          <ToggleRow
            label="Enable Push Notifications"
            description="Get notified about events and tasks"
            checked={pushEnabled}
            onChange={handlePushToggle}
            readOnly={readOnly}
          />
          {pushBlocked && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ Notifications are blocked in your browser. To enable, update your browser site settings.
            </p>
          )}
        </Card>

        {/* ── Card 2: Push Notification Preferences ── */}
        <Card>
          <CardHeader
            icon={Bell}
            title="Push Notification Preferences"
            subtitle="Configure which push notifications are enabled for your church members"
          />

          <GroupLabel label="Events & Services" />
          <ToggleRow label="Event Cancellation" description="Notify when events are cancelled or changed" checked={notifs.notif_event_cancellation} onChange={v => setNotif("notif_event_cancellation", v)} readOnly={readOnly} />
          <ToggleRow label="Event Reminder (1 day)" description="Notify members 1 day before events" checked={notifs.notif_event_reminder_1d} onChange={v => setNotif("notif_event_reminder_1d", v)} readOnly={readOnly} />
          <ToggleRow label="Event Reminder (3 days)" description="Notify members 3 days before events" checked={notifs.notif_event_reminder_3d} onChange={v => setNotif("notif_event_reminder_3d", v)} readOnly={readOnly} />
          <ToggleRow label="Event Reminder (7 days)" description="Notify members 7 days before events" checked={notifs.notif_event_reminder_7d} onChange={v => setNotif("notif_event_reminder_7d", v)} readOnly={readOnly} />
          <ToggleRow label="Service Reminder" description="Remind members about upcoming services" checked={notifs.notif_service_reminder} onChange={v => setNotif("notif_service_reminder", v)} readOnly={readOnly} />

          <GroupLabel label="Giving & Finance" />
          <ToggleRow label="Donation Confirmation" description="Confirm successful donations" checked={notifs.notif_donation_confirmation} onChange={v => setNotif("notif_donation_confirmation", v)} readOnly={readOnly} />
          <ToggleRow label="Pledge Payment Reminder" description="Remind about outstanding pledges" checked={notifs.notif_pledge_reminder} onChange={v => setNotif("notif_pledge_reminder", v)} readOnly={readOnly} />
          <ToggleRow label="Recurring Donation Processed" description="Notify when recurring donations are processed" checked={notifs.notif_recurring_donation} onChange={v => setNotif("notif_recurring_donation", v)} readOnly={readOnly} />

          <GroupLabel label="Tasks & Assignments" />
          <ToggleRow label="Task Assigned" description="Notify when a new task is assigned" checked={notifs.notif_task_assigned} onChange={v => setNotif("notif_task_assigned", v)} readOnly={readOnly} />
          <ToggleRow label="Task Due Soon" description="Remind about upcoming task deadlines" checked={notifs.notif_task_due_soon} onChange={v => setNotif("notif_task_due_soon", v)} readOnly={readOnly} />
          <ToggleRow label="Task Overdue" description="Alert about overdue tasks" checked={notifs.notif_task_overdue} onChange={v => setNotif("notif_task_overdue", v)} readOnly={readOnly} />
          <ToggleRow label="Volunteer Assignment" description="Notify about volunteer opportunity assignments" checked={notifs.notif_volunteer_assignment} onChange={v => setNotif("notif_volunteer_assignment", v)} readOnly={readOnly} />

          <GroupLabel label="Appointments" />
          <ToggleRow label="Appointment Confirmation" description="Confirm counselling appointments" checked={notifs.notif_appt_confirmation} onChange={v => setNotif("notif_appt_confirmation", v)} readOnly={readOnly} />
          <ToggleRow label="Appointment Reminder" description="Remind about upcoming appointments" checked={notifs.notif_appt_reminder} onChange={v => setNotif("notif_appt_reminder", v)} readOnly={readOnly} />
          <ToggleRow label="Appointment Status Change" description="Notify when appointment status changes" checked={notifs.notif_appt_status_change} onChange={v => setNotif("notif_appt_status_change", v)} readOnly={readOnly} />

          <GroupLabel label="Groups" />
          <ToggleRow label="Group Announcement" description="Notify about new group announcements" checked={notifs.notif_group_announcement} onChange={v => setNotif("notif_group_announcement", v)} readOnly={readOnly} />
          <ToggleRow label="Group Meeting Reminder" description="Remind about group meetings" checked={notifs.notif_group_meeting_reminder} onChange={v => setNotif("notif_group_meeting_reminder", v)} readOnly={readOnly} />

          <GroupLabel label="Personal" />
          <ToggleRow label="Anniversary Greeting" description="Send anniversary greetings" checked={notifs.notif_anniversary} onChange={v => setNotif("notif_anniversary", v)} readOnly={readOnly} />
          <ToggleRow label="Birthday Wishes" description="Send birthday greetings" checked={notifs.notif_birthday} onChange={v => setNotif("notif_birthday", v)} readOnly={readOnly} />
          <ToggleRow label="Welcome Message" description="Welcome new members" checked={notifs.notif_welcome} onChange={v => setNotif("notif_welcome", v)} readOnly={readOnly} />

          <GroupLabel label="Asset Management" />
          <ToggleRow label="Asset Release Approval" description="Notify about asset release decisions" checked={notifs.notif_asset_approval} onChange={v => setNotif("notif_asset_approval", v)} readOnly={readOnly} />
          <ToggleRow label="Asset Return Reminder" description="Remind about asset return dates" checked={notifs.notif_asset_return} onChange={v => setNotif("notif_asset_return", v)} readOnly={readOnly} />

          <GroupLabel label="Service Requests" />
          <ToggleRow label="Service Request Status" description="Notify about service request updates" checked={notifs.notif_service_request} onChange={v => setNotif("notif_service_request", v)} readOnly={readOnly} />

          <GroupLabel label="Discipleship" />
          <ToggleRow label="Follow-up Assignment" description="Notify about new follow-up assignments" checked={notifs.notif_followup_assignment} onChange={v => setNotif("notif_followup_assignment", v)} readOnly={readOnly} />
          <ToggleRow label="Milestone Completion" description="Celebrate discipleship milestones" checked={notifs.notif_milestone} onChange={v => setNotif("notif_milestone", v)} readOnly={readOnly} />
        </Card>

        {/* ── Card 3: Africa's Talking SMS ── */}
        <Card>
          <CardHeader
            icon={MessageSquare}
            title="Africa's Talking SMS Configuration"
            subtitle="Configure your Africa's Talking account for SMS sending"
            action={
              <a
                href="https://africastalking.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 rounded-lg px-2.5 py-1.5 hover:bg-orange-50 transition-colors shrink-0 whitespace-nowrap"
              >
                Africa's Talking Console
                <ExternalLink className="h-3 w-3" />
              </a>
            }
          />

          <ToggleRow
            label="Use Your Own Africa's Talking Account"
            description="SMS will be sent using your Africa's Talking account (no platform credits used)"
            checked={atEnabled}
            onChange={setAtEnabled}
            readOnly={readOnly}
          />

          <Expandable open={atEnabled}>
            {/* Credentials section header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Africa's Talking Credentials
              </p>
              <a
                href="https://africastalking.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1"
              >
                Open Africa's Talking Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Username <span className="text-red-500">*</span></Label>
              <Input
                placeholder="your_username"
                value={atUsername}
                onChange={e => setAtUsername(e.target.value)}
              />
              <p className="text-xs text-slate-400">Found on your Africa's Talking dashboard</p>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">API Key <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  placeholder={tenant?.at_api_key ? "••••••••••••••••••••" : "Your Africa's Talking API Key"}
                  value={atApiKey}
                  onChange={e => setAtApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">Keep this secret. Never share publicly.</p>
            </div>

            {/* Sender ID */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Sender ID <span className="text-xs text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g. CHURCHNAME"
                value={atSenderId}
                onChange={e => setAtSenderId(e.target.value)}
                maxLength={11}
              />
              <p className="text-xs text-slate-400">Your registered sender ID. Leave blank to use default shortcode.</p>
            </div>

            {/* Test Connection + Balance */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testingConn || !atUsername}
                className="gap-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testingConn ? "animate-spin" : ""}`} />
                {testingConn ? "Testing..." : "Test Connection"}
              </Button>
              {atBalance !== null && (
                <div className="flex items-center gap-2 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                  <span className="text-slate-500 text-xs">Account Balance:</span>
                  <span className="font-semibold text-emerald-600 text-xs">{atBalance}</span>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    className="text-slate-400 hover:text-slate-600 ml-1"
                    title="Refresh balance"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Low Balance Alert */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <ToggleRow
                label="Low Balance Alert"
                description="Get an in-app notification when your SMS balance falls below a set amount"
                checked={atLowBalanceAlert}
                onChange={setAtLowBalanceAlert}
                readOnly={readOnly}
              />
              <Expandable open={atLowBalanceAlert}>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Alert Threshold (KES)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={atThreshold}
                    onChange={e => setAtThreshold(e.target.value)}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-slate-400">
                    Admins will be notified in-app when balance drops below this amount
                  </p>
                </div>
              </Expandable>
            </div>
          </Expandable>
        </Card>
      </div>

      {/* Sticky save */}
      <div className="fixed bottom-6 right-6 z-10">
        <PermissionButton
          readOnly={readOnly}
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Settings className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </PermissionButton>
      </div>
    </>
  );
}
