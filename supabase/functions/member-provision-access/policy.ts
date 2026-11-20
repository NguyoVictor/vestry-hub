// Phase 5 (E4): who may provision member portal access. Mirrors the database
// rule private.can_write_permission(<church>, 'member_management') used for
// creating members, so a staff member who may add a member may also set up
// their portal access (no "member saved, access forbidden" split).
export interface Operator { tenant_id: string | null; role: string | null; status: string | null }

export function mayProvision(operator: Operator | null, tenantId: string, memberManagementLevel: string | null): boolean {
  if (!operator || operator.status !== "active" || operator.tenant_id !== tenantId) return false;
  const role = (operator.role ?? "").toLowerCase();
  if (role === "member" || role === "") return false;
  if (role === "super_admin" || role === "church_admin") return true;
  return (memberManagementLevel ?? "default") !== "read_only";
}
