// Pure authorization rules for update-user-role (Phase 5). No I/O, so they can
// be unit-tested with node --experimental-strip-types.
//
// Mirrors the database rule private.can_manage_permissions(): only ACTIVE
// super_admin / church_admin of the SAME church manage staff users. Elevated
// roles (super_admin, church_admin) can only be granted, changed or
// deactivated by a super_admin — a church_admin can never promote anyone
// (including a second account of their own) to owner level.

export const BUILTIN_ROLES = [
  "super_admin", "church_admin", "general_overseer", "senior_pastor",
  "pastor", "assistant_pastor", "accountant", "leader", "studio_operator",
  "staff_leader", "member", "staff", "volunteer", "guest",
] as const;
export const ELEVATED_ROLES = new Set(["super_admin", "church_admin"]);
export const MANAGER_ROLES = new Set(["super_admin", "church_admin"]);
export type Action = "update_role" | "deactivate" | "reactivate";

export interface Actor { id: string; tenant_id: string | null; role: string | null; status: string | null }
export interface Target { id: string; tenant_id: string | null; role: string | null; status: string | null }
export interface Request { action: unknown; role?: unknown; status?: unknown }

export type Decision =
  | { ok: true; action: Action; role: string | null; status: "active" | "inactive" | null }
  | { ok: false; code: 400 | 403 | 404; error: string };

const lower = (v: string | null | undefined) => (v ?? "").toLowerCase();

export function decide(
  caller: Actor | null,
  target: Target | null,
  req: Request,
  isCustomRole: (role: string) => boolean,
): Decision {
  if (!caller || lower(caller.status) !== "active" || !MANAGER_ROLES.has(lower(caller.role))) {
    return { ok: false, code: 403, error: "Forbidden: church administrator required" };
  }
  if (!target || !caller.tenant_id || target.tenant_id !== caller.tenant_id) {
    return { ok: false, code: 404, error: "Target user not found in your church" };
  }
  if (target.id === caller.id) {
    return { ok: false, code: 400, error: "Cannot modify your own role/status" };
  }
  const action = req.action;
  if (action !== "update_role" && action !== "deactivate" && action !== "reactivate") {
    return { ok: false, code: 400, error: "Unknown action" };
  }
  const callerIsOwner = lower(caller.role) === "super_admin";
  if (ELEVATED_ROLES.has(lower(target.role)) && !callerIsOwner) {
    return { ok: false, code: 403, error: "Only a super admin can change an administrator" };
  }

  let role: string | null = null;
  if (action === "update_role" || (action === "reactivate" && req.role != null && req.role !== "")) {
    if (typeof req.role !== "string" || !req.role.trim()) {
      return { ok: false, code: 400, error: "Role is required" };
    }
    role = req.role.trim();
    const known = (BUILTIN_ROLES as readonly string[]).includes(role) || isCustomRole(role);
    if (!known) return { ok: false, code: 400, error: "Invalid role" };
    if (ELEVATED_ROLES.has(role) && !callerIsOwner) {
      return { ok: false, code: 403, error: "Only a super admin can grant administrator roles" };
    }
  }

  let status: "active" | "inactive" | null = null;
  if (action === "update_role") {
    const s = req.status ?? "active";
    if (s !== "active" && s !== "inactive") return { ok: false, code: 400, error: "Invalid status" };
    status = s;
  }
  return { ok: true, action, role, status };
}
