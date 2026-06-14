import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle, Copy, Link } from "lucide-react";

const APP_BASE_URL = window.location.origin;

export default function RegistrationSettings() {
  const { tenantId } = useChurch();
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-registration", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TENANTS)
        .select("id, registration_enabled")
        .eq(COLS.ID, tenantId)
        .single();
      if (error) throw error;
      return data as { id: string; registration_enabled: boolean };
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (readOnly) return;
      const { error } = await supabase
        .from(TABLES.TENANTS)
        .update({ registration_enabled: enabled } as never)
        .eq(COLS.ID, tenantId);
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      qc.invalidateQueries({ queryKey: ["tenant-registration", tenantId] });
      toast.success(enabled ? "Registration enabled." : "Registration disabled.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const registrationUrl = `${APP_BASE_URL}/member-registration/${tenantId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(registrationUrl);
    toast.success("Link copied!");
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  const isEnabled = tenant?.registration_enabled ?? true;

  return (
    <>
      <Helmet><title>Registration — Vestry</title></Helmet>

      {readOnly && <ReadOnlyBanner section="Registration Settings" />}

      <div className="max-w-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
            <UserCircle className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Member Self Registration
            </h2>
            <p className="text-xs text-slate-500">
              Control how members can register themselves through your public registration links
            </p>
          </div>
        </div>

        {/* Card 1 — Enable toggle */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Enable Member Self-Registration
            </p>
            <p className="text-xs text-slate-500 mt-0.5 max-w-md">
              When enabled, new members can register themselves using your public registration link or QR code
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={v => toggleMutation.mutate(v)}
            disabled={toggleMutation.isPending || readOnly}
            className="data-[state=checked]:bg-orange-500 shrink-0"
          />
        </div>

        {/* Card 2 — Registration link */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Registration Link
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Share this link with potential members to allow them to register:
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={registrationUrl}
              className="text-xs text-slate-600 bg-slate-50 dark:bg-slate-900 font-mono"
            />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={handleCopy}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
          {!isEnabled && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ Registration is currently disabled. The link will show a "Registration is closed" message.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
