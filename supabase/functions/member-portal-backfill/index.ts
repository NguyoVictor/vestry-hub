// B3 (Gate B prerequisite): give pre-existing members portal access without
// sending any email, using the SAME reviewed provisioning code as
// member-provision-access (Phase 2). Dry run by default.
//   POST { tenantId?, dryRun = true, limit = 25 }
//   church admin → own church only; platform super admin → named church.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { provisionMemberPortalAccess } from "../_shared/member-portal-provisioning.ts";
import { backfillScope, clampLimit } from "./policy.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Content-Type": "application/json",
};
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  const bearer = /^Bearer\s+([^\s]+)$/i.exec(req.headers.get("Authorization")?.trim() ?? "");
  if (!bearer) return reply({ error: "unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply({ error: "server_configuration_error" }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: auth, error: authError } = await db.auth.getUser(bearer[1]);
  if (authError || !auth.user) return reply({ error: "unauthorized" }, 401);
  const { data: actor } = await db.from("users").select("tenant_id, role, status, is_super_admin").eq("id", auth.user.id).maybeSingle();
  const body = await req.json().catch(() => ({}));
  const scope = backfillScope(actor, body?.tenantId);
  if (!scope.ok) return reply({ error: scope.error }, scope.code);
  const dryRun = body?.dryRun !== false;
  const limit = clampLimit(body?.limit);

  // Candidates: members of this church with an email and no portal link yet.
  const { data: linked, error: lErr } = await db.from("member_auth_memberships").select("member_id").eq("tenant_id", scope.tenantId);
  if (lErr) return reply({ error: "lookup_failed" }, 503);
  const linkedIds = new Set((linked ?? []).map((r: { member_id: string }) => String(r.member_id)));
  const { data: members, error: mErr } = await db.from("members").select("id, email").eq("tenant_id", scope.tenantId).not("email", "is", null);
  if (mErr) return reply({ error: "lookup_failed" }, 503);
  const candidates = (members ?? []).filter((m: { id: string; email: string | null }) => (m.email ?? "").trim() && !linkedIds.has(String(m.id)));

  if (dryRun) return reply({ ok: true, dryRun: true, tenantId: scope.tenantId, alreadyLinked: linkedIds.size, candidates: candidates.length });

  const results: Record<string, number> = {};
  for (const m of candidates.slice(0, limit)) {
    const r = await provisionMemberPortalAccess(db, scope.tenantId, String(m.id));
    const key = r.ok ? r.status : `error:${r.error}`;
    results[key] = (results[key] ?? 0) + 1;
  }
  return reply({ ok: true, dryRun: false, tenantId: scope.tenantId, processed: Math.min(limit, candidates.length), remaining: Math.max(0, candidates.length - limit), results });
});
