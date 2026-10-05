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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const { memberId, tenantId, sessionToken } = await req.json();
    if (!memberId || !tenantId || !sessionToken) return json({ error: "missing_fields" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: session, error: sessionError } = await supabase
      .from("member_sessions")
      .select("id, member_id, tenant_id, expires_at")
      .eq("member_id", String(memberId))
      .eq("tenant_id", String(tenantId))
      .eq("session_token", String(sessionToken))
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (sessionError || !session) return json({ error: "invalid_session" }, 401);

    const [{ data: member }, { data: tenant }] = await Promise.all([
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
      !member ||
      !tenant ||
      member.tenant_id !== session.tenant_id ||
      member.status?.toLowerCase() === "inactive" ||
      member.membership_status === "Pending Approval" ||
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
