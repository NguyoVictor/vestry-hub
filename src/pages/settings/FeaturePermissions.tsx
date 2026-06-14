import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronDown, Save } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type AccessLevel = "full" | "read" | "none";

interface PermRow { tenant_id: string; feature: string; role: string; access_level: AccessLevel; }

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES: { key: string; label: string; desc: string }[] = [
  { key: "assets",          label: "Assets",           desc: "Manage church assets and inventory" },
  { key: "branches",        label: "Branches",         desc: "Manage church branches" },
  { key: "childrens_church",label: "Children's Church",desc: "Manage children's church" },
  { key: "communications",  label: "Communications",   desc: "Send emails and messages" },
  { key: "counselling",     label: "Counselling",      desc: "Manage counselling appointments" },
  { key: "events",          label: "Events",           desc: "Manage church events and registrations" },
  { key: "expenses",        label: "Expenses",         desc: "Manage church finances and budgets" },
  { key: "follow_up_tasks", label: "Follow Up Tasks",  desc: "Manage follow-up tasks" },
  { key: "giving",          label: "Giving",           desc: "Manage tithes, offerings, and donations" },
  { key: "groups",          label: "Groups",           desc: "Manage small groups and teams" },
  { key: "members",         label: "Members",          desc: "Manage church members and profiles" },
  { key: "new_converts",    label: "New Converts",     desc: "Manage new convert discipleship" },
  { key: "pledges",         label: "Pledges",          desc: "Manage pledge campaigns" },
  { key: "reports",         label: "Reports",          desc: "View and generate reports" },
  { key: "sermons",         label: "Sermons",          desc: "Manage sermons and messages" },
  { key: "services",        label: "Services",         desc: "Manage church services" },
  { key: "settings",        label: "Settings",         desc: "Access church settings" },
  { key: "surveys",         label: "Surveys",          desc: "Create and manage surveys" },
  { key: "training",        label: "Training",         desc: "Manage training courses" },
  { key: "visitors",        label: "Visitors",         desc: "Manage visitor records" },
  { key: "volunteering",    label: "Volunteering",     desc: "Manage volunteer opportunities" },
];

// ─── Roles (excluding Admin which is always Full) ─────────────────────────────
const ROLES: { key: string; label: string }[] = [
  { key: "sr_pastor",     label: "Sr. Pastor" },
  { key: "pastor",        label: "Pastor" },
  { key: "asst_pastor",   label: "Asst. Pastor" },
  { key: "branch_admin",  label: "Branch Admin" },
  { key: "leader",        label: "Leader" },
  { key: "accountant",    label: "Accountant" },
  { key: "volunteer",     label: "Volunteer" },
];

// ─── Default permissions ──────────────────────────────────────────────────────
const DEFAULTS: Record<string, Record<string, AccessLevel>> = {
  sr_pastor:    Object.fromEntries(FEATURES.map(f => [f.key, "full" as AccessLevel])),
  pastor: {
    assets: "full", branches: "none", childrens_church: "full", communications: "full",
    counselling: "full", events: "full", expenses: "full", follow_up_tasks: "full",
    giving: "full", groups: "full", members: "full", new_converts: "full",
    pledges: "full", reports: "full", sermons: "full", services: "full",
    settings: "read", surveys: "full", training: "full", visitors: "full", volunteering: "full",
  },
  asst_pastor: {
    assets: "full", branches: "read", childrens_church: "full", communications: "full",
    counselling: "full", events: "full", expenses: "read", follow_up_tasks: "full",
    giving: "full", groups: "full", members: "full", new_converts: "full",
    pledges: "full", reports: "full", sermons: "full", services: "full",
    settings: "read", surveys: "full", training: "full", visitors: "full", volunteering: "full",
  },
  branch_admin: {
    assets: "full", branches: "read", childrens_church: "full", communications: "full",
    counselling: "read", events: "full", expenses: "read", follow_up_tasks: "full",
    giving: "read", groups: "full", members: "full", new_converts: "full",
    pledges: "read", reports: "read", sermons: "read", services: "full",
    settings: "none", surveys: "read", training: "read", visitors: "full", volunteering: "full",
  },
  leader: {
    assets: "read", branches: "none", childrens_church: "read", communications: "read",
    counselling: "none", events: "read", expenses: "none", follow_up_tasks: "read",
    giving: "none", groups: "full", members: "read", new_converts: "read",
    pledges: "none", reports: "read", sermons: "read", services: "read",
    settings: "none", surveys: "read", training: "read", visitors: "read", volunteering: "read",
  },
  accountant: {
    assets: "read", branches: "none", childrens_church: "none", communications: "none",
    counselling: "none", events: "none", expenses: "full", follow_up_tasks: "none",
    giving: "full", groups: "none", members: "read", new_converts: "none",
    pledges: "full", reports: "full", sermons: "none", services: "none",
    settings: "none", surveys: "none", training: "none", visitors: "none", volunteering: "none",
  },
  volunteer: {
    assets: "none", branches: "none", childrens_church: "none", communications: "none",
    counselling: "none", events: "read", expenses: "none", follow_up_tasks: "none",
    giving: "none", groups: "read", members: "read", new_converts: "none",
    pledges: "none", reports: "none", sermons: "none", services: "none",
    settings: "none", surveys: "none", training: "none", visitors: "none", volunteering: "none",
  },
};

// ─── Access level pill ────────────────────────────────────────────────────────
const LEVEL_STYLES: Record<AccessLevel, string> = {
  full: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  read: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  none: "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200",
};

const LEVEL_OPTIONS: AccessLevel[] = ["full", "read", "none"];

function AccessPill({
  value,
  onChange,
  disabled,
}: {
  value: AccessLevel;
  onChange?: (v: AccessLevel) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (disabled) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none">
        Full
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${LEVEL_STYLES[value]}`}
      >
        <span className="capitalize">{value}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full mt-1 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden min-w-[80px]">
            {LEVEL_OPTIONS.map(opt => (
              <button
                key={opt}
                type="button"
                className={`w-full text-left px-3 py-1.5 text-xs font-medium capitalize hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${value === opt ? "font-semibold" : ""}`}
                onClick={() => { onChange?.(opt); setOpen(false); }}
              >
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-xs ${LEVEL_STYLES[opt]}`}>
                  {opt}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function FeaturePermissions() {
  const { tenantId } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const qc = useQueryClient();

  // Local state: map of "feature:role" → AccessLevel
  const [local, setLocal] = useState<Record<string, AccessLevel>>({});
  const [dirty, setDirty] = useState(false);

  // Fetch saved permissions
  const { data: saved = [], isLoading } = useQuery<PermRow[]>({
    queryKey: ["feature-permissions", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FEATURE_PERMISSIONS)
        .select("tenant_id, feature, role, access_level")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return (data ?? []) as PermRow[];
    },
    staleTime: 300_000,
  });

  // Seed local state from DB once on first load (only when not dirty)
  useEffect(() => {
    if (dirty || saved.length === 0) return;
    const map: Record<string, AccessLevel> = {};
    for (const row of saved) {
      map[`${row.feature}:${row.role}`] = row.access_level;
    }
    setLocal(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  // Effective values: local overrides defaults
  const effective = useMemo<Record<string, AccessLevel>>(() => {
    const base: Record<string, AccessLevel> = {};
    for (const role of ROLES) {
      for (const feat of FEATURES) {
        base[`${feat.key}:${role.key}`] = DEFAULTS[role.key]?.[feat.key] ?? "none";
      }
    }
    // Apply saved DB values
    for (const row of saved) {
      base[`${row.feature}:${row.role}`] = row.access_level;
    }
    // Apply local changes
    return { ...base, ...local };
  }, [saved, local]);

  const handleChange = (feature: string, role: string, value: AccessLevel) => {
    setLocal(prev => ({ ...prev, [`${feature}:${role}`]: value }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      const rows = ROLES.flatMap(role =>
        FEATURES.map(feat => ({
          tenant_id: tenantId,
          feature: feat.key,
          role: role.key,
          access_level: effective[`${feat.key}:${role.key}`] ?? "none",
        }))
      );
      const { error } = await supabase
        .from(TABLES.FEATURE_PERMISSIONS)
        .upsert(rows as never, { onConflict: "tenant_id,feature,role" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-permissions", tenantId] });
      setDirty(false);
      toast.success("Permissions saved successfully!");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save permissions."),
  });

  return (
    <div className="pt-2 space-y-4">
      {/* Scrollable table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm border-collapse">
          {/* Header */}
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              {/* Feature column — sticky */}
              <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900 text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[160px] border-r border-slate-200 dark:border-slate-700">
                Feature
              </th>
              {/* Admin — greyed */}
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide min-w-[72px]">
                Admin
              </th>
              {/* Other roles */}
              {ROLES.map(r => (
                <th key={r.key} className="px-3 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide min-w-[88px] whitespace-nowrap">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {FEATURES.map((feat, idx) => (
              <tr
                key={feat.key}
                className={`border-b border-slate-100 dark:border-slate-800 ${idx % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50/50 dark:bg-slate-800/50"}`}
              >
                {/* Feature name — sticky */}
                <td className={`sticky left-0 z-10 px-4 py-3 border-r border-slate-200 dark:border-slate-700 ${idx % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50/50 dark:bg-slate-800/50"}`}>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">{feat.label}</p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{feat.desc}</p>
                </td>

                {/* Admin — always Full, greyed out */}
                <td className="px-3 py-3 text-center">
                  <AccessPill value="full" disabled />
                </td>

                {/* Other roles */}
                {ROLES.map(role => (
                  <td key={role.key} className="px-3 py-3 text-center">
                    <AccessPill
                      value={effective[`${feat.key}:${role.key}`] ?? "none"}
                      onChange={v => handleChange(feat.key, role.key, v)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !dirty}
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
