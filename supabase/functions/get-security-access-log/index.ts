import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { authorizeTenantActor } from "../_shared/authorize-tenant-actor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
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

    const { data: tenantUsers, error: usersError } = await service
      .from("users")
      .select("id, first_name, last_name, email, role, status")
      .eq("tenant_id", String(tenant_id));
    if (usersError) throw usersError;

    const userIds = (tenantUsers ?? []).map((u) => String(u.id));
    let events: unknown[] = [];
    if (userIds.length > 0) {
      const { data, error } = await service
        .from("login_events")
        .select("id, user_id, ip_address, user_agent, location, status, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      events = data ?? [];
    }

    return json({ users: tenantUsers ?? [], events });
  } catch (error) {
    console.error("get-security-access-log failed", error instanceof Error ? error.message : "unknown_error");
    return json({ error: "server_error" }, 500);
  }
});
