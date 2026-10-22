import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// STAGING: member-login must receive a valid Supabase Auth access token
// from a successfully verified email OTP. A church code is NOT authentication.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!jwt) return json({ error: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !publicKey) return json({ error: "server_configuration_error" }, 500);

    // Never use a public key as evidence of a user's identity.
    const authClient = createClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(jwt);
    if (authError || !user || !user.email || !user.email_confirmed_at) {
      return json({ error: "unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    const churchCode = typeof body?.churchCode === "string" ? body.churchCode.trim().toUpperCase() : "";
    if (!/^[A-Z0-9-]{4,32}$/.test(churchCode)) return json({ error: "invalid_request" }, 400);

    const db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: tenant, error: tenantError } = await db.from("tenants")
      .select("id, name, logo, church_code, slug, enabled_modules")
      .or(`church_code.eq.${churchCode},invite_code.eq.${churchCode}`)
      .maybeSingle();
    if (tenantError || !tenant) return json({ error: "invalid_credentials_or_membership" }, 403);

    // Match the email taken from verified Auth identity, never an email in the request body.
    const { data: member, error: memberError } = await db.from("members")
      .select("id, tenant_id, first_name, last_name, email, phone, avatar_url, status, member_type, membership_status, created_at")
      .eq("tenant_id", tenant.id)
      .ilike("email", user.email.trim())
      .maybeSingle();
    if (memberError || !member || member.tenant_id !== tenant.id) {
      return json({ error: "invalid_credentials_or_membership" }, 403);
    }
    if (String(member.status || "").trim().toLowerCase() !== "active" ||
        String(member.membership_status || "").trim().toLowerCase() !== "active") {
      return json({ error: "membership_not_active" }, 403);
    }

    // Only issue a session after verified email + tenant-specific membership checks.
    const sessionToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
    const tokenHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sessionToken));
    const sessionTokenHash = `sha256:${Array.from(new Uint8Array(tokenHash), b => b.toString(16).padStart(2, "0")).join("")}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: sessionError } = await db.from("member_sessions").insert({
      member_id: member.id,
      tenant_id: tenant.id,
      session_token: sessionTokenHash,
      expires_at: expiresAt,
    });
    if (sessionError) {
      console.error("member-login: session insert failed", sessionError.code);
      return json({ error: "session_creation_failed" }, 500);
    }

    await db.from("members")
      .update({ portal_last_seen: new Date().toISOString() })
      .eq("id", member.id).eq("tenant_id", tenant.id);

    return json({ member, tenant, sessionToken, expiresAt });
  } catch (error) {
    console.error("member-login failed", error instanceof Error ? error.message : "unknown_error");
    return json({ error: "server_error" }, 500);
  }
});
