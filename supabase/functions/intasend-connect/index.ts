// Connect a church's OWN IntaSend account (one account per church, user
// decision 2026-11-23). verify_jwt = true. Caller must be an active church
// admin (super_admin / church_admin) of that church, or the platform admin.
//   POST { action: "connect", tenant_id, publishable_key, secret_key }
//     → keys checked with IntaSend (GET /wallets/), secret stored in Vault,
//       M-Pesa giving switched on; returns the church's webhook URL and a new
//       challenge (shown ONCE — paste both into IntaSend → Settings → Webhooks).
//   POST { action: "new_challenge", tenant_id } → a fresh challenge (shown once).
//   POST { action: "disconnect", tenant_id } → secret deleted, giving off.
//   POST { action: "recheck", tenant_id, gift_id } → re-asks IntaSend about ONE pending
//     M-Pesa gift of this church (missed / rejected confirmation) and confirms it
//     with the same checks as the webhook, or returns the non-sensitive reason.
// Keys are never logged or returned.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { intasendGet, intasendPost, keyPairEnv, newChallenge, verifyStatusReply } from "../_shared/intasend.ts";

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
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply({ error: "server_configuration_error" }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: auth, error: authError } = await db.auth.getUser(bearer[1]);
  if (authError || !auth.user) return reply({ error: "unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));
  const tenantId = typeof body?.tenant_id === "string" ? body.tenant_id : "";
  const action = String(body?.action ?? "");
  if (!tenantId) return reply({ error: "tenant_id required" }, 400);

  const { data: actor } = await db.from("users").select("id, tenant_id, role, status, is_super_admin").eq("id", auth.user.id).maybeSingle();
  const isPlatform = !!actor?.is_super_admin && actor?.status === "active";
  const isChurchAdmin = !!actor && actor.status === "active" && actor.tenant_id === tenantId
    && ["super_admin", "church_admin"].includes(String(actor.role ?? "").toLowerCase());
  if (!isPlatform && !isChurchAdmin) return reply({ error: "Only an administrator of this church can connect IntaSend." }, 403);

  const webhookUrl = `${url}/functions/v1/intasend-webhook?church=${encodeURIComponent(tenantId)}`;

  if (action === "disconnect") {
    const { error } = await db.rpc("intasend_clear_credentials", { p_tenant_id: tenantId });
    if (error) { console.error("intasend-connect: clear failed", error.code); return reply({ error: "Could not disconnect." }, 500); }
    return reply({ ok: true, connected: false });
  }

  if (action === "recheck") {
    const giftId = typeof body?.gift_id === "string" ? body.gift_id : "";
    const { data: gift } = await db.from("giving_records")
      .select("id, tenant_id, amount, payment_status, intasend_invoice_id, payment_provider")
      .eq("id", giftId).eq("tenant_id", tenantId).maybeSingle();
    if (!gift || gift.payment_provider !== "intasend" || !gift.intasend_invoice_id) return reply({ error: "M-Pesa gift not found for this church." }, 404);
    if (gift.payment_status === "confirmed") return reply({ ok: true, payment_status: "confirmed", detail: "already confirmed" });
    const { data: secret } = await db.rpc("intasend_secret_for_tenant", { p_tenant_id: tenantId });
    if (typeof secret !== "string" || !secret) return reply({ error: "IntaSend is not connected for this church." }, 409);
    const status = await intasendPost("/payment/status/", secret, { invoice_id: gift.intasend_invoice_id });
    const verdict = verifyStatusReply(status.status, status.json, gift.id, gift.amount);
    const state = String(((status.json?.invoice ?? status.json ?? {}) as Record<string, unknown>).state ?? "").toUpperCase() || "UNKNOWN";
    if (!verdict.ok) {
      await db.from("payment_events").upsert({ provider: "intasend", invoice_id: gift.intasend_invoice_id, state: `RECHECK_${state}`,
        api_ref: gift.id, tenant_id: tenantId, outcome: "rejected", detail: `recheck: ${verdict.reason}`.slice(0, 500) },
        { onConflict: "provider,invoice_id,state", ignoreDuplicates: false });
      return reply({ ok: false, payment_status: gift.payment_status, detail: verdict.reason });
    }
    const update: Record<string, unknown> = { payment_status: "confirmed" };
    if (verdict.receipt) update.mpesa_receipt = verdict.receipt;
    const { data: changed, error } = await db.from("giving_records").update(update)
      .eq("id", gift.id).eq("payment_status", gift.payment_status).select("id");
    if (error) return reply({ error: "Could not update the gift." }, 500);
    await db.from("payment_events").upsert({ provider: "intasend", invoice_id: gift.intasend_invoice_id, state: "RECHECK_COMPLETE",
      api_ref: gift.id, tenant_id: tenantId, outcome: "applied", detail: `recheck: ${gift.payment_status} → confirmed` },
      { onConflict: "provider,invoice_id,state", ignoreDuplicates: false });
    return reply({ ok: true, payment_status: changed?.length ? "confirmed" : gift.payment_status, receipt: verdict.receipt });
  }

  if (action === "new_challenge") {
    const challenge = newChallenge();
    const { error } = await db.rpc("intasend_set_challenge", { p_tenant_id: tenantId, p_challenge: challenge });
    if (error) return reply({ error: "IntaSend is not connected for this church." }, 409);
    return reply({ ok: true, webhook_url: webhookUrl, challenge });
  }

  if (action !== "connect") return reply({ error: "unknown action" }, 400);
  const keys = keyPairEnv(body?.secret_key, body?.publishable_key);
  if (!keys.ok) return reply({ error: keys.error }, 400);
  const secret = String(body.secret_key).trim();
  const publishable = String(body.publishable_key).trim();

  // Prove the secret key works before storing it (lists the account's wallets).
  const check = await intasendGet("/wallets/?currency=KES", secret);
  if (check.status === 401 || check.status === 403) return reply({ error: "IntaSend rejected these keys. Check that you copied the full secret key." }, 400);
  if (check.status >= 300) {
    console.error("intasend-connect: wallet check failed", check.status);
    return reply({ error: "Could not reach IntaSend to check the keys. Try again shortly." }, 502);
  }

  const challenge = newChallenge();
  const { error } = await db.rpc("intasend_store_credentials", {
    p_tenant_id: tenantId, p_secret_key: secret, p_publishable_key: publishable, p_env: keys.env,
    p_challenge: challenge, p_actor: auth.user.id,
  });
  if (error) { console.error("intasend-connect: store failed", error.code); return reply({ error: "Could not save the keys." }, 500); }
  return reply({ ok: true, connected: true, env: keys.env, webhook_url: webhookUrl, challenge });
});
