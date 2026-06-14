import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  LayoutGrid, Save, Info, ChevronDown, ChevronRight,
  Users, CalendarCheck, DollarSign, MessageSquare, Calendar,
  Heart, UserCheck, Film, Settings, Baby,
} from "lucide-react";

// ─── Module definitions ───────────────────────────────────────────────────────
interface SubFeature { key: string; label: string; isCore?: boolean }
interface Module {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  isCore?: boolean;
  subFeatures?: SubFeature[];
}

const MODULES: Module[] = [
  {
    key: "members_groups",
    label: "Members & Groups",
    description: "Manage your congregation, families, and groups",
    icon: Users,
    isCore: true,
    subFeatures: [
      { key: "members",          label: "Members",          isCore: true },
      { key: "visitors",         label: "Visitors",         isCore: true },
      { key: "groups",           label: "Groups",           isCore: true },
      { key: "house_fellowships",label: "House Fellowships",isCore: true },
      { key: "families",         label: "Families",         isCore: true },
    ],
  },
  {
    key: "attendance",
    label: "Attendance",
    description: "Track service attendance and demographics",
    icon: CalendarCheck,
  },
  {
    key: "giving_finance",
    label: "Giving & Finance",
    description: "Tithes, offerings, expenses, budgets, and payroll",
    icon: DollarSign,
    subFeatures: [
      { key: "give_online",       label: "Give Online" },
      { key: "giving_records",    label: "Giving Records" },
      { key: "pledge_campaigns",  label: "Pledge Campaigns" },
      { key: "church_expenses",   label: "Church Expenses" },
      { key: "budget_management", label: "Budget Management" },
      { key: "payroll",           label: "Payroll" },
      { key: "fund_accounting",   label: "Fund Accounting" },
      { key: "accounts_payable",  label: "Accounts Payable" },
      { key: "general_ledger",    label: "General Ledger" },
      { key: "payouts",           label: "Payouts" },
    ],
  },
  {
    key: "communications",
    label: "Communications",
    description: "Email, SMS, WhatsApp, and announcements",
    icon: MessageSquare,
    subFeatures: [
      { key: "broadcasts",        label: "Broadcasts" },
      { key: "announcements",     label: "Announcements" },
      { key: "member_messaging",  label: "Member Messaging" },
    ],
  },
  {
    key: "events",
    label: "Events",
    description: "Plan and manage church events",
    icon: Calendar,
  },
  {
    key: "discipleship",
    label: "Discipleship & Follow-up",
    description: "New converts, visitors, and follow-up tasks",
    icon: Heart,
    subFeatures: [
      { key: "visitors",              label: "Visitors" },
      { key: "follow_up_tasks",       label: "Follow-Up Tasks" },
      { key: "new_converts",          label: "New Converts" },
      { key: "discipleship_dashboard",label: "Discipleship Dashboard" },
      { key: "graduates",             label: "Graduates" },
    ],
  },
  {
    key: "volunteering",
    label: "Volunteering",
    description: "Coordinate volunteer teams and schedules",
    icon: UserCheck,
  },
  {
    key: "resources_media",
    label: "Resources & Media",
    description: "Sermons, livestream, worship songs, and assets",
    icon: Film,
    subFeatures: [
      { key: "sermons_messages",  label: "Sermons & Messages" },
      { key: "live_streaming",    label: "Live Streaming" },
      { key: "bible_explorer",    label: "Bible Explorer" },
      { key: "sermon_preparation",label: "Sermon Preparation" },
      { key: "church_media",      label: "Church Media" },
      { key: "song_library",      label: "Song Library" },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    description: "Counselling, facility booking, security, and board meetings",
    icon: Settings,
    subFeatures: [
      { key: "board_meetings",        label: "Board Meetings" },
      { key: "facility_event_booking",label: "Facility & Event Booking" },
      { key: "security_centre",       label: "Security Centre" },
      { key: "incident_management",   label: "Incident Management" },
      { key: "counselling",           label: "Counselling" },
      { key: "service_requests",      label: "Service Requests" },
    ],
  },
  {
    key: "childrens_ministry",
    label: "Children's Ministry",
    description: "Children's church check-in and management",
    icon: Baby,
  },
];

const MODULE_KEYS = MODULES.map(m => m.key);
const ALL_SUB_KEYS = MODULES.flatMap(m => m.subFeatures?.map(s => s.key) ?? []);

function defaultState(): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  MODULE_KEYS.forEach(k => { state[k] = true; });
  ALL_SUB_KEYS.forEach(k => { state[k] = true; });
  return state;
}

export default function Modules() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const [state, setState] = useState<Record<string, boolean>>(defaultState());
  // Track sub-feature states before parent was disabled (for restore)
  const [prevSubStates, setPrevSubStates] = useState<Record<string, Record<string, boolean>>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ members_groups: true });

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TENANTS)
        .select("enabled_modules")
        .eq(COLS.ID, tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  useEffect(() => {
    if (!tenant) return;
    const saved = tenant.enabled_modules as Record<string, boolean> | null;
    if (saved && typeof saved === "object") {
      setState({ ...defaultState(), ...saved });
    }
  }, [tenant]);

  function toggleModule(moduleKey: string, module: Module) {
    const newVal = !state[moduleKey];
    setState(s => {
      const next = { ...s, [moduleKey]: newVal };
      if (!newVal && module.subFeatures) {
        // Save current sub states before disabling
        const subSnapshot: Record<string, boolean> = {};
        module.subFeatures.forEach(sf => { subSnapshot[sf.key] = s[sf.key] ?? true; });
        setPrevSubStates(p => ({ ...p, [moduleKey]: subSnapshot }));
        // Disable all sub-features
        module.subFeatures.forEach(sf => { next[sf.key] = false; });
      } else if (newVal && module.subFeatures) {
        // Restore previous sub states
        const prev = prevSubStates[moduleKey];
        if (prev) {
          module.subFeatures.forEach(sf => { next[sf.key] = prev[sf.key] ?? true; });
        } else {
          module.subFeatures.forEach(sf => { next[sf.key] = true; });
        }
      }
      return next;
    });
  }

  function toggleSub(key: string) {
    setState(s => ({ ...s, [key]: !s[key] }));
  }

  function toggleExpand(key: string) {
    setExpanded(e => ({ ...e, [key]: !e[key] }));
  }

  const activeModuleCount = MODULE_KEYS.filter(k => state[k]).length;

  const save = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      const { error } = await supabase
        .from(TABLES.TENANTS)
        .update({ enabled_modules: state, updated_at: new Date().toISOString() })
        .eq(COLS.ID, tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings", tenantId] });
      toast.success("Module settings saved");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-3xl">
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Modules — Vestry</title></Helmet>

      {readOnly && <ReadOnlyBanner section="Church Settings" />}

      <div className="max-w-3xl pb-24">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">

          {/* Card header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-start gap-3">
              <LayoutGrid className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Active Modules</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose which features to show in your dashboard. Expand each module to control individual sub-features.
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1.5">
                  {activeModuleCount} of {MODULE_KEYS.length} modules active
                </p>
              </div>
            </div>
          </div>

          {/* Module rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {MODULES.map(module => {
              const Icon = module.icon;
              const isOn = !!state[module.key];
              const isExpanded = !!expanded[module.key];
              const hasSubFeatures = !!module.subFeatures?.length;

              return (
                <div key={module.key}>
                  {/* Parent row */}
                  <div className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    {/* Icon */}
                    <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-orange-500" />
                    </div>

                    {/* Expand chevron (only for expandable modules) */}
                    {hasSubFeatures ? (
                      <button
                        onClick={() => toggleExpand(module.key)}
                        className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                      >
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />
                        }
                      </button>
                    ) : (
                      <div className="w-4 shrink-0" />
                    )}

                    {/* Name + description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{module.label}</p>
                        {module.isCore && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                            Core
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{module.description}</p>
                    </div>

                    {/* Toggle */}
                    <Switch
                      checked={isOn}
                      onCheckedChange={() => toggleModule(module.key, module)}
                      disabled={module.isCore || readOnly}
                      className="shrink-0"
                    />
                  </div>

                  {/* Sub-features (expanded) */}
                  {hasSubFeatures && isExpanded && (
                    <div className={`bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 ${!isOn ? "opacity-50 pointer-events-none" : ""}`}>
                      {module.subFeatures!.map(sf => (
                        <div
                          key={sf.key}
                          className="flex items-center gap-3 pl-16 pr-5 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          {/* Core sub-feature: filled orange dot; regular: hollow dot */}
                          {sf.isCore ? (
                            <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                              <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          ) : (
                            <div className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0 ml-1.5" />
                          )}
                          <p className="flex-1 text-sm text-slate-700 dark:text-slate-300">{sf.label}</p>
                          {sf.isCore ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                              Core
                            </span>
                          ) : (
                            <Switch
                              checked={!!state[sf.key]}
                              onCheckedChange={() => toggleSub(sf.key)}
                              disabled={!isOn || readOnly}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex items-start gap-2">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400">
              Disabling a module or sub-feature only hides it from your navigation and dashboard. Your data is always preserved and will reappear when you re-enable it.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Save */}
      <div className="fixed bottom-6 right-6 z-10">
        <PermissionButton
          readOnly={readOnly}
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          <Save className="h-4 w-4" />
          {save.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </>
  );
}
