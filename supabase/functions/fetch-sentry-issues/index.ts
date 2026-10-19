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

async function requirePlatformSuperAdmin(req: Request) {
  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("unauthorized");
  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) throw new Error("unauthorized");
  const { data: actor } = await service.from("users").select("is_super_admin, status").eq("id", data.user.id).maybeSingle();
  if (!actor || actor.status !== "active" || actor.is_super_admin !== true) throw new Error("forbidden");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await requirePlatformSuperAdmin(req);

    const authToken = Deno.env.get("SENTRY_AUTH_TOKEN");
    const org = Deno.env.get("SENTRY_ORG");
    const project = Deno.env.get("SENTRY_PROJECT");
    const baseUrl = Deno.env.get("SENTRY_BASE_URL") ?? "https://de.sentry.io";
    if (!authToken || !org || !project) return json({ error: "config_error" }, 503);

    const url = `${baseUrl}/api/0/organizations/${org}/issues/?project=${project}&query=is:unresolved&limit=20`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } });
    if (!res.ok) return json({ error: "sentry_api_error", status: res.status }, 502);
    return json(await res.json());
  } catch (error) {
    const forbidden = String(error).includes("forbidden");
    const unauthorized = String(error).includes("unauthorized");
    if (forbidden || unauthorized) return json({ error: forbidden ? "forbidden" : "unauthorized" }, forbidden ? 403 : 401);
    console.error("fetch-sentry-issues failed", error instanceof Error ? error.message : "unknown_error");
    return json({ error: "server_error" }, 500);
  }
});
