// Safaricom Daraja STK push callback (provider choice, 20261124110000).
// verify_jwt = false (Safaricom cannot send a Supabase token). Each church's
// callback URL carries ?c=<tenant_id>&t=<secret token>; the token is checked
// against that church's stored hash. Safaricom sends no signature, so before a
// gift is marked paid the result is re-checked with Safaricom (STK query, the
// church's own credentials) and the paid amount must equal the gift.
// Always answers 200 {ResultCode:0} once the URL is authentic so Safaricom
// does not retry; a bad token gets 401.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseStkCallback, stkQuery, type DarajaConfig } from "../_shared/daraja.ts";
import { amountMatches, nextStatus } from "../_shared/intasend.ts";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const accepted = () => json({ ResultCode: 0, ResultDesc: "Accepted" });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "not_configured" }, 503);
  const params = new URL(req.url).searchParams;
  const church = params.get("c") ?? "", token = params.get("t") ?? "";
  if (!/^[0-9a-zA-Z-]{8,64}$/.test(church)) return json({ error: "unknown church" }, 404);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: tokenOk } = await db.rpc("daraja_callback_ok", { p_tenant_id: church, p_token: token });
  if (tokenOk !== true) return json({ error: "unauthorized" }, 401);

  const cb = parseStkCallback(await req.json().catch(() => null));
  if (!cb) return accepted();
  const state = `RESULT_${Number.isFinite(cb.resultCode) ? cb.resultCode : "X"}`;
  const log = async (outcome: string, detail: string, apiRef: string | null) => {
    await db.from("payment_events").upsert(
      { provider: "daraja", invoice_id: cb.checkoutRequestId, state, api_ref: apiRef, tenant_id: church, outcome, detail: detail.slice(0, 500) },
      { onConflict: "provider,invoice_id,state", ignoreDuplicates: true },
    );
  };

  const { data: gift } = await db.from("giving_records")
    .select("id, tenant_id, amount, payment_status")
    .eq("checkout_request_id", cb.checkoutRequestId).eq("tenant_id", church).eq("payment_provider", "daraja").maybeSingle();
  if (!gift) { await log("unmatched", "no Daraja gift with this CheckoutRequestID for this church", null); return accepted(); }

  if (cb.resultCode !== 0) {
    const target = nextStatus(gift.payment_status, "failed");
    if (target) {
      await db.from("giving_records").update({ payment_status: target, notes: `M-Pesa: ${cb.resultDesc}`.slice(0, 500) })
        .eq("id", gift.id).eq("payment_status", gift.payment_status);
    }
    await log(target ? "applied" : "ignored", `result ${cb.resultCode}: ${cb.resultDesc}`, gift.id);
    return accepted();
  }

  const target = nextStatus(gift.payment_status, "confirmed");
  if (!target) { await log("ignored", `no transition from ${gift.payment_status}`, gift.id); return accepted(); }
  if (cb.amount == null || !amountMatches(gift.amount, cb.amount, "KES")) {
    await log("rejected", `amount ${cb.amount ?? "?"} does not match gift ${gift.amount}`, gift.id);
    return accepted();
  }
  const { data: cfg } = await db.rpc("daraja_config_for_tenant", { p_tenant_id: church });
  if (!cfg) { await log("rejected", "church has no Daraja credentials", gift.id); return accepted(); }
  const q = await stkQuery(cfg as DarajaConfig, cb.checkoutRequestId);
  if (!q.ok) { await log("rejected", `Safaricom did not confirm: ${q.detail}`, gift.id); return accepted(); }

  const update: Record<string, unknown> = { payment_status: "confirmed" };
  if (cb.receipt) update.mpesa_receipt = cb.receipt;
  const { error } = await db.from("giving_records").update(update).eq("id", gift.id).eq("payment_status", gift.payment_status);
  if (error) { console.error("daraja-callback: update failed", error.code); return json({ error: "update_failed" }, 500); }
  await log("applied", `${gift.payment_status} → confirmed`, gift.id);
  return accepted();
});
