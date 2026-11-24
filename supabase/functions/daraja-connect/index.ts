// Connect a church's OWN Safaricom paybill / till through Daraja (provider
// choice, 20261124110000). verify_jwt = true. Caller must be an active church
// admin (super_admin / church_admin) of that church, or the platform admin.
//   POST { action: "connect", tenant_id, env: "sandbox"|"production",
//          account_type: "paybill"|"till", shortcode, till_number?,
//          consumer_key, consumer_secret, passkey }
//     → credentials proven with a Daraja OAuth token, stored in Vault, a new
//       per-church callback token created, Daraja made the active provider.
//   POST { action: "disconnect", tenant_id }
//   POST { action: "recheck", tenant_id, gift_id } → asks Safaricom (STK query)
//     whether one pending Daraja gift succeeded and confirms it if so.
// Credentials are never logged or returned.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { darajaToken, newCallbackToken, stkQuery, type DarajaConfig } from "../_shared/daraja.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Content-Type": "application/json",
};
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });
const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

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
  const tenantId = clean(body?.tenant_id);
  const action = clean(body?.action);
  if (!tenantId) return reply({ error: "tenant_id required" }, 400);

  const { data: actor } = await db.from("users").select("id, tenant_id, role, status, is_super_admin").eq("id", auth.user.id).maybeSingle();
  const isPlatform = !!actor?.is_super_admin && actor?.status === "active";
  const isChurchAdmin = !!actor && actor.status === "active" && actor.tenant_id === tenantId
    && ["super_admin", "church_admin"].includes(String(actor.role ?? "").toLowerCase());
  if (!isPlatform && !isChurchAdmin) return reply({ error: "Only an administrator of this church can connect M-Pesa." }, 403);

  if (action === "disconnect") {
    const { error } = await db.rpc("daraja_clear_credentials", { p_tenant_id: tenantId });
    if (error) { console.error("daraja-connect: clear failed", error.code); return reply({ error: "Could not disconnect." }, 500); }
    return reply({ ok: true, connected: false });
  }

  if (action === "recheck") {
    const giftId = clean(body?.gift_id);
    const { data: gift } = await db.from("giving_records")
      .select("id, tenant_id, amount, payment_status, checkout_request_id, payment_provider")
      .eq("id", giftId).eq("tenant_id", tenantId).maybeSingle();
    if (!gift || gift.payment_provider !== "daraja" || !gift.checkout_request_id) return reply({ error: "M-Pesa gift not found for this church." }, 404);
    if (gift.payment_status === "confirmed") return reply({ ok: true, payment_status: "confirmed", detail: "already confirmed" });
    const { data: cfg } = await db.rpc("daraja_config_for_tenant", { p_tenant_id: tenantId });
    if (!cfg) return reply({ error: "Daraja is not connected for this church." }, 409);
    const q = await stkQuery(cfg as DarajaConfig, gift.checkout_request_id);
    await db.from("payment_events").upsert({ provider: "daraja", invoice_id: gift.checkout_request_id, state: `RECHECK_${q.resultCode ?? "UNKNOWN"}`,
      api_ref: gift.id, tenant_id: tenantId, outcome: q.ok ? "applied" : "rejected", detail: `recheck: ${q.detail}` },
      { onConflict: "provider,invoice_id,state", ignoreDuplicates: false });
    if (!q.ok) return reply({ ok: false, payment_status: gift.payment_status, detail: q.detail });
    const { data: changed } = await db.from("giving_records").update({ payment_status: "confirmed" })
      .eq("id", gift.id).eq("payment_status", gift.payment_status).select("id");
    return reply({ ok: true, payment_status: changed?.length ? "confirmed" : gift.payment_status });
  }

  if (action !== "connect") return reply({ error: "unknown action" }, 400);
  const env = clean(body?.env);
  const accountType = clean(body?.account_type);
  const shortcode = clean(body?.shortcode);
  const tillNumber = clean(body?.till_number);
  const consumerKey = clean(body?.consumer_key), consumerSecret = clean(body?.consumer_secret), passkey = clean(body?.passkey);
  if (env !== "sandbox" && env !== "production") return reply({ error: "Choose Sandbox or Live (production)." }, 400);
  if (accountType !== "paybill" && accountType !== "till") return reply({ error: "Choose Paybill or Till." }, 400);
  if (!/^[0-9]{5,8}$/.test(shortcode)) return reply({ error: accountType === "till" ? "Enter the store (head office) number — 5 to 8 digits." : "Enter the paybill number — 5 to 8 digits." }, 400);
  if (accountType === "till" && !/^[0-9]{5,8}$/.test(tillNumber)) return reply({ error: "Enter the till number — 5 to 8 digits." }, 400);
  if (consumerKey.length < 10 || consumerSecret.length < 10 || passkey.length < 10) return reply({ error: "Enter the consumer key, consumer secret and passkey from your Daraja app." }, 400);

  // Prove the credentials work before storing them.
  const t = await darajaToken({ consumer_key: consumerKey, consumer_secret: consumerSecret, env });
  if (!t.token) {
    if (t.status === 400 || t.status === 401) return reply({ error: "Safaricom rejected the consumer key / secret. Check they are from a Daraja app for this environment." }, 400);
    console.error("daraja-connect: oauth check failed", t.status);
    return reply({ error: "Could not reach Safaricom to check the credentials. Try again shortly." }, 502);
  }

  const { error } = await db.rpc("daraja_store_credentials", {
    p_tenant_id: tenantId, p_consumer_key: consumerKey, p_consumer_secret: consumerSecret, p_passkey: passkey,
    p_shortcode: shortcode, p_till_number: accountType === "till" ? tillNumber : "",
    p_transaction_type: accountType === "till" ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline",
    p_env: env, p_callback_token: newCallbackToken(), p_actor: auth.user.id,
  });
  if (error) { console.error("daraja-connect: store failed", error.code); return reply({ error: "Could not save the credentials." }, 500); }
  return reply({ ok: true, connected: true, env, account_type: accountType });
});
