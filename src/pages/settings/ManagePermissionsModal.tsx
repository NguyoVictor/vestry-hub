import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown } from "lucide-react";

// ─── Feature list (shared with FeaturePermissions) ────────────────────────────
export const FEATURES: { key: string; label: string }[] = [
  { key: "assets",           label: "Assets" },
  { key: "branches",         label: "Branches" },
  { key: "childrens_church", label: "Children's Church" },
  { key: "communications",   label: "Communications" },
  { key: "counselling",      label: "Counselling" },
  { key: "events",           label: "Events" },
  { key: "expenses",         label: "Expenses" },
  { key: "follow_up_tasks",  label: "Follow Up Tasks" },
  { key: "giving",           label: "Giving" },
  { key: "groups",           label: "Groups" },
  { key: "members",          label: "Members" },
  { key: "new_converts",     label: "New Converts" },
  { key: "pledges",          label: "Pledges" },
  { key: "reports",          label: "Reports" },
  { key: "sermons",          label: "Sermons" },
  { key: "services",         label: "Services" },
  { key: "settings",         label: "Settings" },
  { key: "surveys",          label: "Surveys" },
  { key: "training",         label: "Training" },
  { key: "visitors",         label: "Visitors" },
  { key: "volunteering",     label: "Volunteering" },
];

// ─── Role-default lookup (mirrors FeaturePermissions DEFAULTS) ────────────────
type AccessLevel = "full" | "read" | "none";
type OverrideLevel = "default" | "full" | "read" | "none";

const ROLE_DEFAULTS: Record<string, Record<string, AccessLevel>> = {
  super_admin:      Object.fromEntries(FEATURES.map(f => [f.key, "full"])),
  sr_pastor:        Object.fromEntries(FEATURES.map(f => [f.key, "full"])),
  church_admin:     Object.fromEntries(FEATURES.map(f => [f.key, "full"])),
  pastor: {
    assets:"full", branches:"none", childrens_church:"full", communications:"full",
    counselling:"full", events:"full", expenses:"full", follow_up_tasks:"full",
    giving:"full", groups:"full", members:"full", new_converts:"full",
    pledges:"full", reports:"full", sermons:"full", services:"full",
    settings:"read", surveys:"full", training:"full", visitors:"full", volunteering:"full",
  },
  asst_pastor: {
    assets:"full", branches:"read", childrens_church:"full", communications:"full",
    counselling:"full", events:"full", expenses:"read", follow_up_tasks:"full",
    giving:"full", groups:"full", members:"full", new_converts:"full",
    pledges:"full", reports:"full", sermons:"full", services:"full",
    settings:"read", surveys:"full", training:"full", visitors:"full", volunteering:"full",
  },
  assistant_pastor: {
    assets:"full", branches:"read", childrens_church:"full", communications:"full",
    counselling:"full", events:"full", expenses:"read", follow_up_tasks:"full",
    giving:"full", groups:"full", members:"full", new_converts:"full",
    pledges:"full", reports:"full", sermons:"full", services:"full",
    settings:"read", surveys:"full", training:"full", visitors:"full", volunteering:"full",
  },
  branch_admin: {
    assets:"full", branches:"read", childrens_church:"full", communications:"full",
    counselling:"read", events:"full", expenses:"read", follow_up_tasks:"full",
    giving:"read", groups:"full", members:"full", new_converts:"full",
    pledges:"read", reports:"read", sermons:"read", services:"full",
    settings:"none", surveys:"read", training:"read", visitors:"full", volunteering:"full",
  },
  department_head: {
    assets:"read", branches:"none", childrens_church:"read", communications:"read",
    counselling:"none", events:"read", expenses:"none", follow_up_tasks:"read",
    giving:"none", groups:"full", members:"read", new_converts:"read",
    pledges:"none", reports:"read", sermons:"read", services:"read",
    settings:"none", surveys:"read", training:"read", visitors:"read", volunteering:"read",
  },
  leader: {
    assets:"read", branches:"none", childrens_church:"read", communications:"read",
    counselling:"none", events:"read", expenses:"none", follow_up_tasks:"read",
    giving:"none", groups:"full", members:"read", new_converts:"read",
    pledges:"none", reports:"read", sermons:"read", services:"read",
    settings:"none", surveys:"read", training:"read", visitors:"read", volunteering:"read",
  },
  accountant: {
    assets:"read", branches:"none", childrens_church:"none", communications:"none",
    counselling:"none", events:"none", expenses:"full", follow_up_tasks:"none",
    giving:"full", groups:"none", members:"read", new_converts:"none",
    pledges:"full", reports:"full", sermons:"none", services:"none",
    settings:"none", surveys:"none", training:"none", visitors:"none", volunteering:"none",
  },
  volunteer: {
    assets:"none", branches:"none", childrens_church:"none", communications:"none",
    counselling:"none", events:"read", expenses:"none", follow_up_tasks:"none",
    giving:"none", groups:"read", members:"read", new_converts:"none",
    pledges:"none", reports:"none", sermons:"none", services:"none",
    settings:"none", surveys:"none", training:"none", visitors:"none", volunteering:"none",
  },
  member: Object.fromEntries(FEATURES.map(f => [f.key, "none"])),
};

function getRoleDefault(role: string, feature: string): AccessLevel {
  return ROLE_DEFAULTS[role]?.[feature] ?? "none";
}

// ─── Styled badges ────────────────────────────────────────────────────────────
const LEVEL_BADGE: Record<AccessLevel, string> = {
  full: "bg-orange-100 text-orange-600 border-orange-200",
  read: "bg-blue-50 text-blue-600 border-blue-200",
  none: "bg-slate-100 text-slate-400 border-slate-200",
};

const OVERRIDE_STYLES: Record<OverrideLevel, string> = {
  default:  "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
  full:     "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100",
  read:     "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100",
  none:     "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200",
};

const OVERRIDE_OPTIONS: { value: OverrideLevel; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "full",    label: "Full" },
  { value: "read",    label: "Read Only" },
  { value: "none",    label: "No Access" },
];

function OverrideSelect({
  value,
  onChange,
}: {
  value: OverrideLevel;
  onChange: (v: OverrideLevel) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = OVERRIDE_OPTIONS.find(o => o.value === value)?.label ?? "Default";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${OVERRIDE_STYLES[value]}`}
      >
        {label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full mt-1 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden min-w-[120px]">
            {OVERRIDE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${value === opt.value ? "font-semibold text-orange-600" : "text-slate-700 dark:text-slate-200"}`}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface MpoRow { feature: string; access_level: OverrideLevel; }

export interface ManageTarget {
  overrideId: string;
  memberId: string;
  memberName: string;
  role: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  target: ManageTarget | null;
  onSaved: () => void;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function ManagePermissionsModal({ open, onClose, tenantId, target, onSaved }: Props) {
  const qc = useQueryClient();
  const [local, setLocal] = useState<Record<string, OverrideLevel>>({});
  const [dirty, setDirty] = useState(false);

  // Fetch existing overrides for this member
  const { data: saved = [] } = useQuery<MpoRow[]>({
    queryKey: ["mpo", tenantId, target?.memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.MEMBER_PERMISSION_OVERRIDES)
        .select("feature, access_level")
        .eq("tenant_id", tenantId)
        .eq("member_id", target!.memberId);
      if (error) throw error;
      return (data ?? []) as MpoRow[];
    },
    enabled: open && !!target?.memberId,
    staleTime: 60_000,
  });

  // Seed local state when modal opens or saved data changes
  useEffect(() => {
    if (!open) return;
    const map: Record<string, OverrideLevel> = {};
    for (const feat of FEATURES) map[feat.key] = "default";
    for (const row of saved) map[row.feature] = row.access_level;
    setLocal(map);
    setDirty(false);
  }, [open, saved]);

  const handleChange = (feature: string, value: OverrideLevel) => {
    setLocal(prev => ({ ...prev, [feature]: value }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!target) return;
      // Only upsert non-default values; delete rows that are back to default
      const toUpsert = FEATURES
        .filter(f => local[f.key] !== "default")
        .map(f => ({
          tenant_id: tenantId,
          member_id: target.memberId,
          feature: f.key,
          access_level: local[f.key],
        }));

      const toDelete = FEATURES
        .filter(f => local[f.key] === "default")
        .map(f => f.key);

      if (toUpsert.length > 0) {
        const { error } = await supabase
          .from(TABLES.MEMBER_PERMISSION_OVERRIDES)
          .upsert(toUpsert as never, { onConflict: "tenant_id,member_id,feature" });
        if (error) throw error;
      }

      if (toDelete.length > 0) {
        const { error } = await supabase
          .from(TABLES.MEMBER_PERMISSION_OVERRIDES)
          .delete()
          .eq("tenant_id", tenantId)
          .eq("member_id", target.memberId)
          .in("feature", toDelete);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mpo", tenantId, target?.memberId] });
      qc.invalidateQueries({ queryKey: ["mpo-summary", tenantId] });
      toast.success(`Permissions updated for ${target?.memberName}`);
      onSaved();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save permissions."),
  });

  if (!target) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base font-bold uppercase tracking-wide">
            Manage Permissions: {target.memberName}
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Override default role permissions for this member. Select 'Default' to use role-based permissions.
          </p>
        </DialogHeader>

        {/* Permissions table */}
        <div className="flex-1 overflow-y-auto min-h-0 rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Feature</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role Default</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Override</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feat, idx) => {
                const roleDefault = getRoleDefault(target.role, feat.key);
                const overrideVal = local[feat.key] ?? "default";
                return (
                  <tr
                    key={feat.key}
                    className={`border-b border-slate-100 dark:border-slate-800 ${idx % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50/40 dark:bg-slate-800/40"}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                      {feat.label}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${LEVEL_BADGE[roleDefault]}`}>
                        {roleDefault}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <OverrideSelect
                        value={overrideVal}
                        onChange={v => handleChange(feat.key, v)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !dirty}
          >
            {saveMutation.isPending ? "Saving..." : "Save Permissions"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
