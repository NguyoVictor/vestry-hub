import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
async function tokenDigest(raw: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return "sha256:" + Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, "0")).join("");
}
const fields = ["first_name", "last_name", "phone", "date_of_birth", "gender", "marital_status", "address", "city"] as const;
const allowed = new Set<string>(fields);
function cleanProfile(value: unknown): Record<string, string | null> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length === 0 || Object.keys(obj).some(key => !allowed.has(key))) return null;
  const cleaned: Record<string, string | null> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== null && typeof val !== "string") return null;
    if (typeof val === "string" && (val.length > 500 || /[\u0000-\u001F]/.test(val.trim()))) return null;
    const text = typeof val === "string" ? val.trim() : "";
    if (["first_name", "last_name"].includes(key) && !text) return null;
    if (key === "date_of_birth" && text && !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    if (key === "gender" && text && !["male", "female", "other"].includes(text)) return null;
    if (key === "marital_status" && text && !["single", "married", "divorced", "widowed"].includes(text)) return null;
    cleaned[key] = text || null;
  }
  return cleaned;
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  try {
    const body = await req.json().catch(() => null);
    const { memberId, tenantId, sessionToken, action, profile } = body ?? {};
    if ([memberId, tenantId, sessionToken].some(x => typeof x !== "string" || !x || x.length > 256)) return reply({ error: "invalid_request" }, 400);
    if (action !== "update_profile" && action !== "leave_church" && action !== "get_profile") return reply({ error: "invalid_action" }, 400);
    const update = action === "update_profile" ? cleanProfile(profile) : null;
    if (action === "update_profile" && !update) return reply({ error: "invalid_profile" }, 400);
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return reply({ error: "server_configuration_error" }, 500);
    // The protected members table trigger requires the verified member-session digest
    // in the PostgREST request headers. Never forward the raw bearer token.
    const sessionDigest = await tokenDigest(sessionToken);
    const db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-member-session": sessionDigest } },
    });
    const { data: session, error: sessionError } = await db.from("member_sessions")
      .select("member_id, tenant_id, expires_at").eq("member_id", memberId).eq("tenant_id", tenantId)
      .eq("session_token", sessionDigest).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (sessionError || !session) return reply({ error: "invalid_session" }, 401);
    const [{ data: member, error: memberError }, { data: tenant, error: tenantError }] = await Promise.all([
      db.from("members").select("id,tenant_id,status,membership_status").eq("id", session.member_id).eq("tenant_id", session.tenant_id).maybeSingle(),
      db.from("tenants").select("id,slug").eq("id", session.tenant_id).maybeSingle(),
    ]);
    if (memberError || tenantError || !member || !tenant?.slug || member.tenant_id !== tenant.id ||
        String(member.status || "").toLowerCase() !== "active" || String(member.membership_status || "").toLowerCase() !== "active") {
      return reply({ error: "invalid_session" }, 401);
    }
    if (action === "get_profile") {
      const { data, error } = await db.from("members")
        .select("first_name,last_name,phone,date_of_birth,gender,marital_status,address,city")
        .eq("id", session.member_id).eq("tenant_id", session.tenant_id).single();
      return error || !data ? reply({ error: "profile_fetch_failed" }, 500) : reply({ profile: data });
    }
    if (action === "update_profile") {
      const { data, error } = await db.from("members").update(update!)
        .eq("id", session.member_id).eq("tenant_id", session.tenant_id)
        .select("id,first_name,last_name,phone,date_of_birth,gender,marital_status,address,city").single();
      if (error || !data) return reply({ error: "profile_update_failed" }, 500);
      return reply({ ok: true, profile: data });
    }
    const { data: changed, error: updateError } = await db.from("members").update({ status: "inactive" })
      .eq("id", session.member_id).eq("tenant_id", session.tenant_id).select("id").single();
    if (updateError || !changed) return reply({ error: "membership_update_failed" }, 500);
    const { error: revokeError } = await db.from("member_sessions").delete()
      .eq("member_id", session.member_id).eq("tenant_id", session.tenant_id);
    if (revokeError) console.error("Membership was changed but session deletion failed", revokeError.message);
    return reply({ ok: true });
  } catch (e) {
    console.error("member-profile-update failed", e instanceof Error ? e.message : "unknown");
    return reply({ error: "server_error" }, 500);
  }
});
