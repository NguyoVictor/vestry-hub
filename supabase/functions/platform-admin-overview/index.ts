import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

async function requirePlatformSuperAdmin(req: Request, service: any) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("unauthorized");
  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) throw new Error("unauthorized");
  const { data: actor } = await service
    .from("users")
    .select("id, is_super_admin, status")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!actor || actor.status !== "active" || actor.is_super_admin !== true) throw new Error("forbidden");
  return actor;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    try {
      await requirePlatformSuperAdmin(req, service);
    } catch (error) {
      const forbidden = String(error).includes("forbidden");
      return json({ error: forbidden ? "forbidden" : "unauthorized" }, forbidden ? 403 : 401);
    }

    const { action = "overview" } = await req.json().catch(() => ({ action: "overview" }));
    const [{ data: tenants, error: tenantError }, { data: subscriptions, error: subError }] = await Promise.all([
      service.from("tenants").select("id, name, slug, created_at").order("created_at", { ascending: false }),
      service.from("tenant_subscriptions").select("tenant_id, plan, status, storage_limit_gb, storage_addons_gb, storage_used_gb, pending_plan, current_period_end, updated_at"),
    ]);
    if (tenantError) throw tenantError;
    if (subError) throw subError;

    const byTenant = new Map((subscriptions ?? []).map((s: any) => [String(s.tenant_id), s]));
    const churches = (tenants ?? []).map((tenant: any) => ({
      ...tenant,
      subscription: byTenant.get(String(tenant.id)) ?? null,
    }));

    if (action === "churches") return json({ churches });
    if (action === "subscriptions") {
      return json({
        subscriptions: churches.map((c: any) => ({ tenant_id: c.id, tenant_name: c.name, ...c.subscription }))
          .filter((row: any) => row.plan || row.status || row.pending_plan),
      });
    }

    const { data: attempts } = await service
      .from("subscription_payment_attempts")
      .select("id, tenant_id, product_code, expected_amount, status, mpesa_receipt, created_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(10);

    const totalStorageUsedGb = (subscriptions ?? []).reduce((sum: number, s: any) => sum + Number(s.storage_used_gb || 0), 0);
    const totalStorageLimitGb = (subscriptions ?? []).reduce((sum: number, s: any) => sum + Number(s.storage_limit_gb || 0) + Number(s.storage_addons_gb || 0), 0);
    const activeSubscriptions = (subscriptions ?? []).filter((s: any) => String(s.status).toLowerCase() === "active").length;
    const pendingPlanChanges = (subscriptions ?? []).filter((s: any) => Boolean(s.pending_plan)).length;

    return json({
      totalChurches: churches.length,
      activeSubscriptions,
      pendingPlanChanges,
      totalStorageUsedGb,
      totalStorageLimitGb,
      recentPayments: attempts ?? [],
    });
  } catch (error) {
    console.error("platform-admin-overview failed", error instanceof Error ? error.message : "unknown_error");
    return json({ error: "server_error" }, 500);
  }
});
