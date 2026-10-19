import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/shared/ReadOnlyBanner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ADMIN_MODULES,
  normalizeModuleConfig,
  type AdminModuleKey,
  type CanonicalModuleConfig,
} from "@/config/modules";
import { TABLES, COLS } from "@/lib/schema";
import { toUserFacingError } from "@/lib/userFacingError";

export default function Modules() {
  const church = useChurch();
  const { tenantId } = church;
  const queryClient = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly("church_settings");
  const [config, setConfig] = useState<CanonicalModuleConfig>(church.enabledModules);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-module-config", tenantId],
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
    if (tenant) setConfig(normalizeModuleConfig(tenant.enabled_modules));
  }, [tenant]);

  const toggle = (key: AdminModuleKey) => {
    const definition = ADMIN_MODULES.find(module => module.key === key);
    if (readOnly || definition?.core) return;
    setConfig(current => ({
      ...current,
      admin: { ...current.admin, [key]: !current.admin[key] },
    }));
  };

  const save = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      const { error } = await supabase
        .from(TABLES.TENANTS)
        .update({ enabled_modules: config, updated_at: new Date().toISOString() })
        .eq(COLS.ID, tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      church.updateEnabledModules?.(config);
      queryClient.invalidateQueries({ queryKey: ["tenant-module-config", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenant-settings", tenantId] });
      toast.success("Module settings saved");
    },
    onError: (error: Error) => toast.error(toUserFacingError(error, "Failed to save module settings")),
  });

  if (isLoading) {
    return <div className="space-y-3 max-w-3xl">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  const activeCount = ADMIN_MODULES.filter(module => config.admin[module.key]).length;

  return (
    <>
      <Helmet><title>Modules — Vestry</title></Helmet>
      {readOnly && <ReadOnlyBanner section="Church Settings" />}

      <div className="max-w-3xl pb-24">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-800">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-start gap-3">
              <LayoutGrid className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Active Modules</h2>
                <p className="text-xs text-slate-500 mt-0.5">One configuration controls Admin navigation, Member Portal availability, and direct-route access.</p>
                <p className="text-xs text-slate-400 mt-1">{activeCount} of {ADMIN_MODULES.length} modules enabled</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {ADMIN_MODULES.map(module => {
              const enabled = config.admin[module.key];
              return (
                <div key={module.key} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{module.label}</p>
                      {module.core && <span className="text-[10px] uppercase tracking-wide text-slate-400">Core</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{module.description}</p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => toggle(module.key)}
                    disabled={readOnly || module.core}
                    aria-label={`Toggle ${module.label}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-10">
        <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg" onClick={() => save.mutate()} disabled={save.isPending || readOnly}>
          <Save className="h-4 w-4" />
          {save.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </>
  );
}
