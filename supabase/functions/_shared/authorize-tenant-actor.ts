import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function authorizeTenantActor(
  req: Request,
  serviceClient: SupabaseClient,
  tenantId: string,
): Promise<{ userId: string | null; serviceRole: boolean }> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("unauthorized");

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (serviceKey && token === serviceKey) return { userId: null, serviceRole: true };

  const { data, error } = await serviceClient.auth.getUser(token);
  if (error || !data.user) throw new Error("unauthorized");

  const { data: actor, error: actorError } = await serviceClient
    .from("users")
    .select("id, tenant_id, role, status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (actorError || !actor || String(actor.tenant_id) !== String(tenantId) || actor.status !== "active" || actor.role === "member") {
    throw new Error("forbidden");
  }

  return { userId: data.user.id, serviceRole: false };
}

export async function getAuthenticatedTenantActor(
  req: Request,
  serviceClient: SupabaseClient,
): Promise<{ userId: string; tenantId: string; role: string }> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("unauthorized");

  const { data, error } = await serviceClient.auth.getUser(token);
  if (error || !data.user) throw new Error("unauthorized");

  const { data: actor, error: actorError } = await serviceClient
    .from("users")
    .select("id, tenant_id, role, status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (actorError || !actor?.tenant_id || actor.status !== "active" || actor.role === "member") {
    throw new Error("forbidden");
  }

  return { userId: data.user.id, tenantId: String(actor.tenant_id), role: String(actor.role || "") };
}
