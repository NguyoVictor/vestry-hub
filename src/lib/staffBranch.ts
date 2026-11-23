// T14 — a staff member's branch (none = all branches). Stored in
// public.staff_branch_assignments; only church admins can change it.
import { supabase } from "@/integrations/supabase/client";

export async function saveStaffBranch(tenantId: string, userId: string, branchId: string | null): Promise<void> {
  if (branchId) {
    const { error } = await supabase.from("staff_branch_assignments")
      .upsert({ user_id: userId, tenant_id: tenantId, branch_id: branchId }, { onConflict: "user_id" });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("staff_branch_assignments").delete().eq("user_id", userId).eq("tenant_id", tenantId);
    if (error) throw error;
  }
}

/** After adding a staff member by email: find their account in this church and set the branch. Returns false if not found. */
export async function saveStaffBranchByEmail(tenantId: string, email: string | null | undefined, branchId: string | null): Promise<boolean> {
  if (!email || !branchId) return true;
  const { data } = await supabase.from("users").select("id").eq("tenant_id", tenantId).ilike("email", email.trim()).maybeSingle();
  if (!data?.id) return false;
  await saveStaffBranch(tenantId, data.id, branchId);
  return true;
}

export async function loadStaffBranches(tenantId: string): Promise<Record<string, string>> {
  const { data } = await supabase.from("staff_branch_assignments").select("user_id, branch_id").eq("tenant_id", tenantId);
  return Object.fromEntries((data ?? []).map(r => [r.user_id, r.branch_id]));
}
