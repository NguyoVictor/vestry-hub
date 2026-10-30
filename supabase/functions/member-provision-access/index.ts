import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Content-Type": "application/json",
};
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  const bearer = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return reply({ error: "unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return reply({ error: "server_configuration_error" }, 500);

  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: identity, error: identityError } = await authClient.auth.getUser(bearer);
  if (identityError || !identity.user) return reply({ error: "unauthorized" }, 401);

  const { memberId, tenantId } = await req.json().catch(() => ({}));
  if (typeof memberId !== "string" || typeof tenantId !== "string" ||
      !/^[\da-f-]{36}$/i.test(memberId) || !/^[\da-f-]{36}$/i.test(tenantId)) {
    return reply({ error: "invalid_request" }, 400);
  }
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: operator } = await db.from("users")
    .select("id,tenant_id,role,status,is_super_admin")
    .eq("id", identity.user.id).eq("tenant_id", tenantId).maybeSingle();
  // Restrict provisioning to tenant administrators. No user metadata authorization.
  if (!operator || operator.status !== "active" || operator.role !== "super_admin") {
    return reply({ error: "forbidden" }, 403);
  }
  const { data: member } = await db.from("members")
    .select("id,tenant_id,email,status,membership_status")
    .eq("id", memberId).eq("tenant_id", tenantId).maybeSingle();
  if (!member || String(member.status).trim().toLowerCase() !== "active" ||
      !["active", "member"].includes(String(member.membership_status).trim().toLowerCase()) || !member.email) {
    return reply({ error: "member_not_eligible" }, 409);
  }
  const normalizedEmail = member.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return reply({ error: "invalid_member_email" }, 400);
  }
  const callback = new URL("/auth/callback", req.headers.get("Origin") || "https://vestryhub.com");
  // Use a fixed allowlist; do not accept arbitrary origins as email redirect destinations.
  const allowedOrigins = (Deno.env.get("MEMBER_AUTH_REDIRECT_ORIGINS") || "").split(",")
    .map(s => s.trim()).filter(Boolean);
  if (!allowedOrigins.includes(callback.origin)) return reply({ error: "redirect_origin_not_allowed" }, 400);
  callback.searchParams.set("tenant_id", tenantId);
  callback.searchParams.set("redirect_to", "/member/welcome");

  // Supabase's on_auth_user_created trigger creates a NEW CHURCH + super_admin
  // unless it receives a valid member_login_challenge_id in user metadata.
  // Always establish this tenant/member/email-bound challenge FIRST.
  const { data: challenge, error: challengeError } = await db.from("member_login_challenges")
    .insert({
      tenant_id: tenantId,
      member_id: memberId,
      email_normalized: normalizedEmail,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
    .select("id").single();
  if (challengeError || !challenge?.id) {
    console.error("member-provision-access: challenge creation failed", challengeError?.code || "unknown");
    return reply({ error: "activation_preparation_failed" }, 500);
  }

  const { error } = await db.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo: callback.toString(),
    data: { member_login_challenge_id: challenge.id },
  });
  if (error) {
    // The existing identity is not re-created or reassigned.
    await db.from("member_login_challenges").delete().eq("id", challenge.id);
  }
  if (error && error.code !== "email_exists" && !/already.*registered/i.test(error.message)) {
    console.error("member-provision-access: invite failure", error.code || "unknown");
    return reply({ error: "invitation_failed" }, 502);
  }
  // The same Auth identity can have multiple tenant-scoped memberships.
  return reply({ ok: true, status: error ? "identity_already_exists" : "invitation_sent" });
});
