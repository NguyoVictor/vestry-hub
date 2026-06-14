import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { TABLES, COLS } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Clock, MapPin, Bell, QrCode, UserCheck, Settings,
} from "lucide-react";

// ─── Shared card components ───────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
        <Icon className="h-5 w-5 text-orange-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange, disabled }: {
  label: string; description: string; checked: boolean;
  onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className={`text-sm font-medium ${disabled ? "text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
          {label}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-[state=checked]:bg-orange-500 shrink-0"
      />
    </div>
  );
}

// Smooth expand/collapse
function Expandable({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
      <div className="pt-2">{children}</div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AttendanceSettings() {
  const { tenantId } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings') || isReadOnly('attendance');
  const qc = useQueryClient();

  // Card 1 — Check-in Window
  const [checkinWindowEnabled, setCheckinWindowEnabled] = useState(false);
  const [minutesBefore,        setMinutesBefore]        = useState("30");
  const [minutesAfter,         setMinutesAfter]         = useState("60");

  // Card 2 — Location Verification
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationRadius,  setLocationRadius]  = useState("500");

  // Card 3 — Absence Alerts
  const [absenceAlertsEnabled, setAbsenceAlertsEnabled] = useState(false);
  const [absenceThreshold,     setAbsenceThreshold]     = useState("3");
  const [alertRecipients,      setAlertRecipients]      = useState("admins_only");

  // Card 4 — Check-in Methods
  const [qrCheckinEnabled, setQrCheckinEnabled] = useState(true);

  // Card 5 — Default Settings
  const [defaultStatus, setDefaultStatus] = useState("present");

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-attendance", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TENANTS)
        .select(`
          checkin_window_enabled, checkin_minutes_before, checkin_minutes_after,
          location_verification_enabled, location_radius_meters,
          absence_alerts_enabled, absence_threshold, absence_alert_recipients,
          qr_checkin_enabled, default_attendance_status
        `)
        .eq(COLS.ID, tenantId)
        .single();
      if (error) throw error;
      return data as {
        checkin_window_enabled: boolean;
        checkin_minutes_before: number;
        checkin_minutes_after: number;
        location_verification_enabled: boolean;
        location_radius_meters: number;
        absence_alerts_enabled: boolean;
        absence_threshold: number;
        absence_alert_recipients: string;
        qr_checkin_enabled: boolean;
        default_attendance_status: string;
      };
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!tenant) return;
    setCheckinWindowEnabled(tenant.checkin_window_enabled ?? false);
    setMinutesBefore(String(tenant.checkin_minutes_before ?? 30));
    setMinutesAfter(String(tenant.checkin_minutes_after ?? 60));
    setLocationEnabled(tenant.location_verification_enabled ?? false);
    setLocationRadius(String(tenant.location_radius_meters ?? 500));
    setAbsenceAlertsEnabled(tenant.absence_alerts_enabled ?? false);
    setAbsenceThreshold(String(tenant.absence_threshold ?? 3));
    setAlertRecipients(tenant.absence_alert_recipients ?? "admins_only");
    setQrCheckinEnabled(tenant.qr_checkin_enabled ?? true);
    setDefaultStatus(tenant.default_attendance_status ?? "present");
  }, [tenant]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      const { error } = await supabase
        .from(TABLES.TENANTS)
        .update({
          checkin_window_enabled: checkinWindowEnabled,
          checkin_minutes_before: parseInt(minutesBefore) || 30,
          checkin_minutes_after: parseInt(minutesAfter) || 60,
          location_verification_enabled: locationEnabled,
          location_radius_meters: parseInt(locationRadius) || 500,
          absence_alerts_enabled: absenceAlertsEnabled,
          absence_threshold: parseInt(absenceThreshold) || 3,
          absence_alert_recipients: alertRecipients,
          qr_checkin_enabled: qrCheckinEnabled,
          default_attendance_status: defaultStatus,
          updated_at: new Date().toISOString(),
        } as never)
        .eq(COLS.ID, tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-attendance", tenantId] });
      toast.success("Attendance settings saved");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save."),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Attendance Settings — Vestry</title></Helmet>

      {/* Read-only banner */}
      {readOnly && <ReadOnlyBanner section="Attendance Settings" />}

      <div className="max-w-2xl space-y-5 pb-24">

        {/* ── Card 1: Check-in Window ── */}
        <Card>
          <CardHeader
            icon={Clock}
            title="Check-in Window"
            subtitle="Configure when members can check in relative to service start time"
          />
          <ToggleRow
            label="Enable Check-In Window"
            description="Restrict check-ins to a specific time window around service start"
            checked={checkinWindowEnabled}
            onChange={setCheckinWindowEnabled}
            disabled={readOnly}
          />
          <Expandable open={checkinWindowEnabled}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Minutes Before Service</Label>
                <Input
                  type="number"
                  min="0"
                  max="240"
                  value={minutesBefore}
                  onChange={e => setMinutesBefore(e.target.value)}
                  disabled={readOnly}
                />
                <p className="text-xs text-slate-400">Allow check-in this many minutes before service starts</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Minutes After Service Start</Label>
                <Input
                  type="number"
                  min="0"
                  max="240"
                  value={minutesAfter}
                  onChange={e => setMinutesAfter(e.target.value)}
                  disabled={readOnly}
                />
                <p className="text-xs text-slate-400">Allow check-in this many minutes after service starts</p>
              </div>
            </div>
          </Expandable>
        </Card>

        {/* ── Card 2: Location Verification ── */}
        <Card>
          <CardHeader
            icon={MapPin}
            title="Location Verification"
            subtitle="Require members to be at the church location to check in"
          />
          <ToggleRow
            label="Require Location"
            description="Members must be within range of the church to check in"
            checked={locationEnabled}
            onChange={setLocationEnabled}
            disabled={readOnly}
          />
          <Expandable open={locationEnabled}>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Location Radius (meters)</Label>
              <Input
                type="number"
                min="50"
                max="10000"
                value={locationRadius}
                onChange={e => setLocationRadius(e.target.value)}
                className="max-w-xs"
                disabled={readOnly}
              />
              <p className="text-xs text-slate-400">
                Members must be within this distance from the church to check in
              </p>
            </div>
            <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">How it works</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Uses the browser's built-in Geolocation API. When a member checks in, the browser requests their GPS coordinates and compares them against the church's saved location. Make sure your church coordinates are set in General Settings.
              </p>
            </div>
          </Expandable>
        </Card>

        {/* ── Card 3: Automated Absence Alerts ── */}
        <Card>
          <CardHeader
            icon={Bell}
            title="Automated Absence Alerts"
            subtitle="Get notified when members miss services for extended periods"
          />
          <ToggleRow
            label="Enable Absence Alerts"
            description="Receive notifications when members are absent for multiple weeks"
            checked={absenceAlertsEnabled}
            onChange={setAbsenceAlertsEnabled}
            disabled={readOnly}
          />
          <Expandable open={absenceAlertsEnabled}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Consecutive Absences Threshold</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={absenceThreshold}
                  onChange={e => setAbsenceThreshold(e.target.value)}
                  className="max-w-xs"
                  disabled={readOnly}
                />
                <p className="text-xs text-slate-400">Send alert after this many consecutive missed services</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Alert Recipients</Label>
                <Select value={alertRecipients} onValueChange={setAlertRecipients} disabled={readOnly}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="senior_pastor_only">Senior Pastor Only</SelectItem>
                    <SelectItem value="admins_only">Admins Only</SelectItem>
                    <SelectItem value="pastor_and_admins">Pastor &amp; Admins</SelectItem>
                    <SelectItem value="small_group_leaders">Small Group Leaders</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">
                  Who receives the absence notification in the app (bell icon)
                </p>
              </div>
            </div>
          </Expandable>
        </Card>

        {/* ── Card 4: Check-in Methods ── */}
        <Card>
          <CardHeader
            icon={QrCode}
            title="Check-in Methods"
            subtitle="Configure how members can check in to services"
          />

          {/* QR Code — active */}
          <ToggleRow
            label="QR Code Check-in"
            description="Allow members to check in by scanning a QR code"
            checked={qrCheckinEnabled}
            onChange={setQrCheckinEnabled}
            disabled={readOnly}
          />

          {/* Self Check-in Kiosk — greyed out / coming soon */}
          <div className="flex items-start justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-400">Self Check-in Kiosk</p>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Allow members to check themselves in at a kiosk</p>
            </div>
            <div title="This feature is coming soon">
              <Switch
                checked={false}
                onCheckedChange={() => {}}
                disabled
                className="opacity-40 cursor-not-allowed"
              />
            </div>
          </div>
        </Card>

        {/* ── Card 5: Default Settings ── */}
        <Card>
          <CardHeader
            icon={UserCheck}
            title="Default Settings"
            subtitle="Configure default attendance behavior"
          />
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Default Attendance Status</Label>
            <Select value={defaultStatus} onValueChange={setDefaultStatus} disabled={readOnly}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="excused">Excused</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">Default status when marking attendance manually</p>
          </div>
        </Card>
      </div>

      {/* Sticky save */}
      <div className="fixed bottom-6 right-6 z-10">
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || readOnly}
        >
          <Settings className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save Attendance Settings"}
        </Button>
      </div>
    </>
  );
}
