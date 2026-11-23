// T14 — per-branch figures that are really recorded per branch (server-side).
import { supabase } from "@/integrations/supabase/client";

export interface BranchOverview {
  branch_id: string;
  staff: { id: string; name: string; role: string; status: string }[];
  staff_count: number;
  services_this_month: number;
  upcoming_events: number;
}

export async function fetchBranchOverview(tenantId: string): Promise<Record<string, BranchOverview>> {
  const { data, error } = await supabase.rpc("branch_overview", { p_tenant_id: tenantId });
  if (error) throw error;
  return Object.fromEntries(((data ?? []) as unknown as BranchOverview[]).map(b => [b.branch_id, b]));
}
