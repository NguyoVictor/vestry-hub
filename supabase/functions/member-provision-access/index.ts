import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { provisionMemberPortalAccess } from "../_shared/member-portal-provisioning.ts";

// Finding 1: provisions/associates a member's portal Auth identity. Sends NO
// invitation, activation or magic-link email. Members sign in later with the
// church access code + email OTP (member-otp-request / member-login).

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Content-Type": "application/json",
};
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const UUID_RE = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const PROVISIONING_ADMIN_ROLES = new Set(["super_admin", "church_admin", "admin"]);

const ERROR_STATUS: Record<string, number> = {
  member_not_found: 404,
  member_email_missing: 422,
  invalid_member_email: 422,
  email_mismatch: 409,
  member_linked_to_other_identity: 409,
  identity_linked_to_other_member: 409,
  provisioning_unavailable: 503,
  identity_creation_failed: 502,
  association_failed: 500,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);

  const bearer = req.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!bearer) return reply({ error: "unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return reply({ error: "server_configuration_error" }, 500);

  try {
    const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identity, error: identityError } = await authClient.auth.getUser(bearer);
    if (identityError || !identity.user) return reply({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const memberId = typeof body?.memberId === "string" ? body.memberId.trim() : "";
    const tenantId = typeof body?.tenantId === "string" ? body.tenantId.trim() : "";
    if (!UUID_RE.test(memberId) || !UUID_RE.test(tenantId)) return reply({ error: "invalid_request" }, 400);

    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    // Authorization comes from server-stored staff profile, never user metadata.
    const { data: operator } = await db.from("users")
      .select("id, tenant_id, role, status")
      .eq("id", identity.user.id).eq("tenant_id", tenantId).maybeSingle();
    if (!operator || operator.status !== "active" || !PROVISIONING_ADMIN_ROLES.has(String(operator.role))) {
      return reply({ error: "forbidden" }, 403);
    }

    const result = await provisionMemberPortalAccess(db, tenantId, memberId);
    if (!result.ok) {
      console.error("member-provision-access: provisioning failed", result.error);
      return reply({ ok: false, error: result.error }, ERROR_STATUS[result.error] ?? 500);
    }
    return reply({ ok: true, status: result.status });
  } catch (error) {
    console.error("member-provision-access failed", error instanceof Error ? error.name : "unknown");
    return reply({ ok: false, error: "server_error" }, 500);
  }
});
