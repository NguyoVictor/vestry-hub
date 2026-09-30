import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentTenantBaseDomain, resolveTenantSlug } from "@/lib/tenantHost";

export interface ResolvedTenant {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  church_code: string | null;
}

export function useResolvedTenant() {
  const baseDomain = currentTenantBaseDomain();
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const hostSlug = useMemo(() => resolveTenantSlug(hostname, baseDomain), [hostname, baseDomain]);

  const query = useQuery({
    queryKey: ["resolved-tenant-host", hostSlug],
    queryFn: async () => {
      if (!hostSlug) return null;
      const { data, error } = await supabase
        .from("tenants")
        .select("id, slug, name, logo, church_code")
        .eq("slug", hostSlug)
        .maybeSingle();
      if (error) throw error;
      return data as ResolvedTenant | null;
    },
    enabled: !!hostSlug,
    staleTime: 60_000,
    retry: false,
  });

  return {
    baseDomain,
    hostname,
    hostSlug,
    isTenantHost: !!hostSlug,
    tenant: query.data ?? null,
    status: !hostSlug ? "unbound" as const : query.isLoading ? "loading" as const : query.data ? "resolved" as const : "not-found" as const,
    error: query.error,
  };
}
