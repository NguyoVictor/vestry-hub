import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { authorizeTenantActor } from "../_shared/authorize-tenant-actor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const { tenant_id } = await req.json();
    if (!tenant_id) return json({ error: "tenant_id_required" }, 400);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    try {
      await authorizeTenantActor(req, service, String(tenant_id));
    } catch (error) {
      const forbidden = String(error).includes("forbidden");
      return json({ error: forbidden ? "forbidden" : "unauthorized" }, forbidden ? 403 : 401);
    }

    const { data: sessions, error } = await service.rpc("get_active_sessions_for_tenant", { p_tenant_id: String(tenant_id) });
    if (error) throw error;
    return json({ success: true, sessions: sessions || [] });
  } catch (error) {
    console.error("get-active-sessions failed", error instanceof Error ? error.message : "unknown_error");
    return json({ error: "server_error" }, 500);
  }
});
