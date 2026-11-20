import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// A church code is not authentication. Require a verified Supabase Auth JWT.
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

    const authClient = createClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(jwt);
    if (authError || !user || !user.email || !user.email_confirmed_at) {
      console.warn("member-login: denied", authError ? "auth_get_user_error" : "unverified_identity");
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
    // Denials log only a reason category (never email, code or ids) so a 403
    // can be diagnosed from function logs without exposing member data.
    if (tenantError || !tenant) {
      console.warn("member-login: denied", tenantError ? "tenant_lookup_error" : "church_code_not_found");
      return json({ error: "invalid_credentials_or_membership" }, 403);
    }

    // Identity email is read from Auth, not from a body provided by the browser.
    // Finding 1: status / membership_status must NOT block an otherwise valid
    // member. Access requires the provisioned member_auth_memberships link
    // between THIS verified Auth identity and a member of THIS church.
    const { data: links, error: linkError } = await db.from("member_auth_memberships")
      .select("member_id")
      .eq("auth_user_id", user.id)
      .eq("tenant_id", tenant.id);
    if (linkError) return json({ error: "server_error" }, 500);
    const linkedIds = (links ?? []).map((row: { member_id: string }) => row.member_id);
    if (linkedIds.length === 0) {
      console.warn("member-login: denied", "no_portal_link_in_church");
      return json({ error: "invalid_credentials_or_membership" }, 403);
    }

    const { data: candidates, error: memberError } = await db.from("members")
      .select("id, tenant_id, first_name, last_name, email, phone, avatar_url, status, member_type, membership_status, created_at")
      .eq("tenant_id", tenant.id)
      .in("id", linkedIds);
    const verifiedEmail = user.email.trim().toLowerCase();
    const matches = (candidates ?? []).filter((row: { tenant_id: string; email: string | null }) =>
      row.tenant_id === tenant.id && String(row.email || "").trim().toLowerCase() === verifiedEmail);
    if (memberError || matches.length !== 1) {
      console.warn("member-login: denied", memberError ? "member_lookup_error" : `email_match_count_${matches.length}`);
      return json({ error: "invalid_credentials_or_membership" }, 403);
    }
    const member = matches[0];

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

    const seenAt = new Date().toISOString();
    await db.from("members")
      .update({ portal_last_seen: seenAt })
      .eq("id", member.id).eq("tenant_id", tenant.id);
    await db.from("member_auth_memberships")
      .update({ last_used_at: seenAt })
      .eq("member_id", member.id).eq("auth_user_id", user.id);

    return json({ member, tenant, sessionToken, expiresAt });
  } catch (error) {
    console.error("member-login failed", error instanceof Error ? error.message : "unknown_error");
    return json({ error: "server_error" }, 500);
  }
});
