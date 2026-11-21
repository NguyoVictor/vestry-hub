// Who may run the member portal backfill (B3), and for which church. Pure.
export interface Actor { tenant_id: string | null; role: string | null; status: string | null; is_super_admin: boolean | null }
export type Scope = { ok: true; tenantId: string } | { ok: false; code: 400 | 403; error: string };

export function backfillScope(actor: Actor | null, requestedTenantId: unknown): Scope {
  if (!actor || actor.status !== "active") return { ok: false, code: 403, error: "forbidden" };
  const requested = typeof requestedTenantId === "string" ? requestedTenantId.trim() : "";
  if (actor.is_super_admin === true) {
    if (!requested) return { ok: false, code: 400, error: "tenantId required" };
    return { ok: true, tenantId: requested };
  }
  const role = (actor.role ?? "").toLowerCase();
  if (role !== "super_admin" && role !== "church_admin") return { ok: false, code: 403, error: "forbidden" };
  if (!actor.tenant_id || (requested && requested !== actor.tenant_id)) return { ok: false, code: 403, error: "forbidden" };
  return { ok: true, tenantId: actor.tenant_id };
}

export function clampLimit(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(1, Math.min(50, Math.floor(n))) : 25;
}
