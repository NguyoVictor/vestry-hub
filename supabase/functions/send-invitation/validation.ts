/** Pure invitation validation. No Supabase client, secrets, or side effects. */
export const INVITABLE_STAFF_ROLES = [
  "church_admin", "general_overseer", "senior_pastor", "pastor",
  "assistant_pastor", "accountant", "leader", "studio_operator",
  "member", "staff", "volunteer", "guest",
] as const;

export type InvitableRole = (typeof INVITABLE_STAFF_ROLES)[number];

export interface StaffActor {
  tenant_id: string;
  role: string | null;
  status: string | null;
  is_super_admin: boolean | null;
}

export interface StaffInvite {
  email: string;
  role: InvitableRole;
  tenantId: string;
  firstName: string;
  lastName: string;
}

export type InviteValidation =
  | { ok: true; value: StaffInvite }
  | { ok: false; error: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateStaffInvite(input: unknown): InviteValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid invitation request" };
  }

  const request = input as Record<string, unknown>;
  const tenantId = typeof request.tenant_id === "string" ? request.tenant_id.trim() : "";
  const email = typeof request.email === "string" ? request.email.trim().toLowerCase() : "";
  const role = typeof request.role === "string" ? request.role.trim() : "";
  const firstName = typeof request.first_name === "string" ? request.first_name.trim() : "";
  const lastName = typeof request.last_name === "string" ? request.last_name.trim() : "";

  if (!uuidPattern.test(tenantId)) return { ok: false, error: "Invalid tenant ID" };
  if (email.length > 254 || !emailPattern.test(email)) {
    return { ok: false, error: "Valid email is required" };
  }
  if (!(INVITABLE_STAFF_ROLES as readonly string[]).includes(role)) {
    return { ok: false, error: "Unsupported invitation role" };
  }
  if (firstName.length > 100 || lastName.length > 100) {
    return { ok: false, error: "Name is too long" };
  }

  return {
    ok: true,
    value: { email, role: role as InvitableRole, tenantId, firstName, lastName },
  };
}

export function mayInviteStaff(actor: StaffActor | null, tenantId: string): boolean {
  if (!actor || actor.status !== "active") return false;
  if (actor.is_super_admin === true) return true; // Privileged platform administrator, server-verified.
  return actor.tenant_id === tenantId &&
    (actor.role === "super_admin" || actor.role === "church_admin");
}
