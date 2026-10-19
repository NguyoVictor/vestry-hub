import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const { tenant_id, user_id, token, device_type = "web", member_session_token } = await req.json();
    if (!tenant_id || !user_id || !token) return json({ error: "missing_fields" }, 400);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });
    let authorized = false;
    if (member_session_token) {
      const { data: session } = await supabase.from("member_sessions").select("member_id, tenant_id, expires_at").eq("member_id", String(user_id)).eq("tenant_id", String(tenant_id)).eq("session_token", String(member_session_token)).gt("expires_at", new Date().toISOString()).maybeSingle();
      if (session) {
        const { data: member } = await supabase.from("members").select("id, tenant_id, status, membership_status").eq("id", String(user_id)).eq("tenant_id", String(tenant_id)).maybeSingle();
        authorized = Boolean(member && member.status?.toLowerCase() !== "inactive" && member.membership_status !== "Pending Approval");
      }
    } else {
      const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
      const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (jwt) {
        const { data } = await supabase.auth.getUser(jwt);
        if (data.user) {
          const { data: actor } = await supabase.from("users").select("id, tenant_id, status").eq("id", data.user.id).eq("tenant_id", String(tenant_id)).eq("status", "active").maybeSingle();
          authorized = Boolean(actor && String(actor.id) === String(user_id));
        }
      }
    }
    if (!authorized) return json({ error: "unauthorized" }, 401);
    const { error } = await supabase.from("device_tokens").upsert({ user_id: String(user_id), tenant_id: String(tenant_id), token: String(token), device_type: String(device_type), user_agent: req.headers.get("user-agent"), last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "user_id,token" });
    if (error) { console.error("register-device-token failed", error.message); return json({ error: "registration_failed" }, 500); }
    return json({ ok: true });
  } catch (error) { console.error("register-device-token failed", error instanceof Error ? error.message : "unknown_error"); return json({ error: "server_error" }, 500); }
});
