import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
async function digest(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return "sha256:" + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  try {
    const body = await req.json().catch(() => null);
    const { memberId, tenantId, sessionToken, action, notificationId } = body ?? {};
    if ([memberId, tenantId, sessionToken].some(v => typeof v !== "string" || !v || v.length > 256)) return response({ error: "invalid_request" }, 400);
    if (!["notifications", "mark_one", "mark_all", "latest_media"].includes(action)) return response({ error: "invalid_action" }, 400);
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return response({ error: "server_configuration_error" }, 500);
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: session, error: sessionError } = await db.from("member_sessions")
      .select("member_id,tenant_id,expires_at")
      .eq("member_id", memberId).eq("tenant_id", tenantId)
      .eq("session_token", await digest(sessionToken))
      .gt("expires_at", new Date().toISOString()).maybeSingle();
    if (sessionError || !session) return response({ error: "invalid_session" }, 401);
    const [{ data: member, error: memberError }, { data: tenant, error: tenantError }] = await Promise.all([
      db.from("members").select("id,tenant_id,status,membership_status").eq("id", session.member_id).eq("tenant_id", session.tenant_id).maybeSingle(),
      db.from("tenants").select("id,slug").eq("id", session.tenant_id).maybeSingle(),
    ]);
    if (memberError || tenantError || !member || !tenant?.slug || member.tenant_id !== tenant.id ||
        String(member.status || "").toLowerCase() !== "active" || String(member.membership_status || "").toLowerCase() !== "active") return response({ error: "invalid_session" }, 401);
    if (action === "notifications") {
      const { data, error } = await db.from("notifications")
        .select("id,title,body,type,is_read,created_at")
        .eq("tenant_id", session.tenant_id).eq("user_id", session.member_id)
        .order("created_at", { ascending: false }).limit(20);
      return error ? response({ error: "query_failed" }, 500) : response({ notifications: data ?? [] });
    }
    if (action === "latest_media") {
      const { data, error } = await db.from("studio_media")
        .select("id,title,speaker,duration,thumbnail_url,media_url")
        .eq("tenant_id", session.tenant_id).eq("status", "published")
        .order("published_at", { ascending: false }).limit(1).maybeSingle();
      return error ? response({ error: "query_failed" }, 500) : response({ media: data });
    }
    let q = db.from("notifications").update({ is_read: true })
      .eq("tenant_id", session.tenant_id).eq("user_id", session.member_id);
    if (action === "mark_one") {
      if (typeof notificationId !== "string" || !notificationId || notificationId.length > 128) return response({ error: "invalid_request" }, 400);
      q = q.eq("id", notificationId);
    }
    const { error } = await q;
    return error ? response({ error: "update_failed" }, 500) : response({ ok: true });
  } catch (error) {
    console.error("member-portal-feed failure", error instanceof Error ? error.message : "unknown");
    return response({ error: "server_error" }, 500);
  }
});
