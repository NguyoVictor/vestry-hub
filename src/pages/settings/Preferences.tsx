import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
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
import { Clock, CalendarDays, Hash, UserCheck, Settings } from "lucide-react";

// ─── Time options: 00:00 → 23:30 in 30-min steps ─────────────────────────────
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

// ─── Month options ────────────────────────────────────────────────────────────
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-5">
      {children}
    </div>
  );
}

function CardHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
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

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-t border-slate-100 dark:border-slate-700 first:border-t-0">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-orange-500 shrink-0"
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Preferences() {
  const { tenantId } = useChurch();
  const qc = useQueryClient();

  const [earlyRiserTime,       setEarlyRiserTime]       = useState("06:00");
  const [morningServiceTime,   setMorningServiceTime]   = useState("10:00");
  const [afternoonServiceTime, setAfternoonServiceTime] = useState("14:00");
  const [fiscalMonth,          setFiscalMonth]          = useState("1");
  const [memberIdPrefix,       setMemberIdPrefix]       = useState("MEM");
  const [autoGenerateIds,      setAutoGenerateIds]      = useState(true);
  const [enableCheckin,        setEnableCheckin]        = useState(true);
  const [allowSelfCheckout,    setAllowSelfCheckout]    = useState(true);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-preferences", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TENANTS)
        .select(`
          early_riser_time, morning_service_time, afternoon_service_time,
          fiscal_year_start_month, member_id_prefix, auto_generate_member_ids,
          enable_checkin, allow_self_checkout
        `)
        .eq(COLS.ID, tenantId)
        .single();
      if (error) throw error;
      return data as {
        early_riser_time: string;
        morning_service_time: string;
        afternoon_service_time: string;
        fiscal_year_start_month: number;
        member_id_prefix: string;
        auto_generate_member_ids: boolean;
        enable_checkin: boolean;
        allow_self_checkout: boolean;
      };
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!tenant) return;
    setEarlyRiserTime(tenant.early_riser_time ?? "06:00");
    setMorningServiceTime(tenant.morning_service_time ?? "10:00");
    setAfternoonServiceTime(tenant.afternoon_service_time ?? "14:00");
    setFiscalMonth(String(tenant.fiscal_year_start_month ?? 1));
    setMemberIdPrefix(tenant.member_id_prefix ?? "MEM");
    setAutoGenerateIds(tenant.auto_generate_member_ids ?? true);
    setEnableCheckin(tenant.enable_checkin ?? true);
    setAllowSelfCheckout(tenant.allow_self_checkout ?? true);
  }, [tenant]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from(TABLES.TENANTS)
        .update({
          early_riser_time: earlyRiserTime,
          morning_service_time: morningServiceTime,
          afternoon_service_time: afternoonServiceTime,
          fiscal_year_start_month: parseInt(fiscalMonth),
          member_id_prefix: memberIdPrefix.trim() || "MEM",
          auto_generate_member_ids: autoGenerateIds,
          enable_checkin: enableCheckin,
          allow_self_checkout: allowSelfCheckout,
          updated_at: new Date().toISOString(),
        } as never)
        .eq(COLS.ID, tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-preferences", tenantId] });
      toast.success("Preferences saved");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save preferences."),
  });

  const prefix = memberIdPrefix.trim() || "MEM";
  const idPreview = `${prefix}-00001`;

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Preferences — Vestry</title></Helmet>

      <div className="max-w-2xl space-y-5 pb-24">

        {/* ── Card 1: Default Service Times ── */}
        <Card>
          <CardHeader
            icon={Clock}
            title="Default Service Times"
            subtitle="Set your regular service schedule for automatic event creation"
          />

          {/* Early Riser */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Early Riser Service</Label>
            <Select value={earlyRiserTime} onValueChange={setEarlyRiserTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {TIME_OPTIONS.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">
              This time will be used as the default when creating Early Riser services
            </p>
          </div>

          {/* Morning Service */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Morning Service</Label>
            <Select value={morningServiceTime} onValueChange={setMorningServiceTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {TIME_OPTIONS.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">
              This time will be used as the default when creating Morning services
            </p>
          </div>

          {/* Afternoon Service */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Afternoon Service</Label>
            <Select value={afternoonServiceTime} onValueChange={setAfternoonServiceTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {TIME_OPTIONS.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">
              This time will be used as the default when creating Afternoon services
            </p>
          </div>
        </Card>

        {/* ── Card 2: Fiscal Year Start ── */}
        <Card>
          <CardHeader
            icon={CalendarDays}
            title="Fiscal Year Start"
            subtitle="Configure when your financial year begins for reporting"
          />
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Fiscal Year Start Month</Label>
            <Select value={fiscalMonth} onValueChange={setFiscalMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">
              Financial reports will use this as the start of your fiscal year
            </p>
          </div>
        </Card>

        {/* ── Card 3: Member ID Format ── */}
        <Card>
          <CardHeader
            icon={Hash}
            title="Member ID Format"
            subtitle="Customize how member IDs are generated and displayed"
          />
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Member ID Prefix</Label>
            <Input
              value={memberIdPrefix}
              onChange={e => setMemberIdPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="MEM"
              maxLength={6}
              className="max-w-xs"
            />
            <p className="text-xs text-slate-400">
              Example: <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">{idPreview}</span>
            </p>
          </div>

          <ToggleRow
            label="Auto-generate Member IDs"
            description="Automatically generate unique IDs when adding new members"
            checked={autoGenerateIds}
            onChange={setAutoGenerateIds}
          />
        </Card>

        {/* ── Card 4: Check In Settings ── */}
        <Card>
          <CardHeader
            icon={UserCheck}
            title="Check in Settings"
            subtitle="Configure attendance tracking and check-in behavior"
          />
          <ToggleRow
            label="Enable Check-In System"
            description="Allow members to check in to services and events"
            checked={enableCheckin}
            onChange={setEnableCheckin}
          />
          <ToggleRow
            label="Allow Self Checkout"
            description="Allow members to check themselves out when leaving"
            checked={allowSelfCheckout}
            onChange={setAllowSelfCheckout}
          />
        </Card>
      </div>

      {/* Sticky save button */}
      <div className="fixed bottom-6 right-6 z-10">
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Settings className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </>
  );
}
