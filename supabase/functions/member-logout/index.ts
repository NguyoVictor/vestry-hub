import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Staging: authenticate revocation through the opaque token itself.
// Do not accept an unauthenticated memberId-only logout operation.
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
async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return `sha256:${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("")}`;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const body = await req.json().catch(() => null);
    const memberId = typeof body?.memberId === "string" ? body.memberId : "";
    const tenantId = typeof body?.tenantId === "string" ? body.tenantId : "";
    const sessionToken = typeof body?.sessionToken === "string" ? body.sessionToken : "";
    if (!memberId || !tenantId || !sessionToken || memberId.length > 128 ||
        tenantId.length > 128 || sessionToken.length > 256) {
      return json({ error: "invalid_request" }, 400);
    }
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "server_configuration_error" }, 500);
    const db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await db.from("member_sessions")
      .delete()
      .eq("member_id", memberId)
      .eq("tenant_id", tenantId)
      .eq("session_token", await hashToken(sessionToken));
    if (error) {
      console.error("member-logout: delete failed", error.code);
      return json({ error: "server_error" }, 500);
    }
    // Idempotent: do not reveal if a particular session existed.
    return json({ ok: true });
  } catch (error) {
    console.error("member-logout failed", error instanceof Error ? error.message : "unknown_error");
    return json({ error: "server_error" }, 500);
  }
});
