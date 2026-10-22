import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashSessionToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    const memberId = typeof body?.memberId === "string" ? body.memberId : "";
    const tenantId = typeof body?.tenantId === "string" ? body.tenantId : "";
    const sessionToken = typeof body?.sessionToken === "string" ? body.sessionToken : "";
    if (!memberId || !tenantId || !sessionToken || memberId.length > 128 || tenantId.length > 128 || sessionToken.length > 256) {
      return json({ error: "invalid_request" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "server_configuration_error" }, 500);

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Only the SHA-256 digest reaches the database; raw tokens remain client-side.
    const sessionTokenHash = await hashSessionToken(sessionToken);
    const { data: session, error: sessionError } = await supabase
      .from("member_sessions")
      .select("id, member_id, tenant_id, expires_at")
      .eq("member_id", memberId)
      .eq("tenant_id", tenantId)
      .eq("session_token", sessionTokenHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (sessionError || !session) return json({ error: "invalid_session" }, 401);

    const [{ data: member, error: memberError }, { data: tenant, error: tenantError }] = await Promise.all([
      supabase
        .from("members")
        .select("id, tenant_id, first_name, last_name, email, phone, avatar_url, date_of_birth, gender, created_at, member_type, status, membership_status")
        .eq("id", session.member_id)
        .eq("tenant_id", session.tenant_id)
        .maybeSingle(),
      supabase
        .from("tenants")
        .select("id, name, logo, church_code, slug, enabled_modules")
        .eq("id", session.tenant_id)
        .maybeSingle(),
    ]);

    if (
      memberError || tenantError || !member || !tenant ||
      member.tenant_id !== session.tenant_id ||
      String(member.status || "").trim().toLowerCase() !== "active" ||
      String(member.membership_status || "").trim().toLowerCase() !== "active" ||
      !tenant.slug
    ) {
      return json({ error: "invalid_session" }, 401);
    }

    await supabase
      .from("members")
      .update({ portal_last_seen: new Date().toISOString() })
      .eq("id", member.id)
      .eq("tenant_id", tenant.id);

    return json({ member, tenant, expiresAt: session.expires_at });
  } catch (error) {
    console.error("member-session-context failed", error instanceof Error ? error.message : "unknown_error");
    return json({ error: "server_error" }, 500);
  }
});
