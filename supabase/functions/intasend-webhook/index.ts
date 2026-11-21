// IntaSend collection webhook (Phase 9). verify_jwt = false (IntaSend cannot
// send a Supabase token) — authentication is the dashboard-configured
// `challenge` string in the JSON body, compared in constant time.
// Before a gift is marked confirmed, the invoice is re-checked with the
// IntaSend status API and the amount/currency must match. Events can arrive
// out of order: one log row per (invoice, state); a confirmed gift is never
// downgraded. Matched/ignored events return 200 so IntaSend does not disable
// the endpoint; a bad challenge returns 401.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { amountMatches, challengeMatches, intasendPost, mapState, nextStatus } from "../_shared/intasend.ts";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const challenge = Deno.env.get("INTASEND_WEBHOOK_CHALLENGE");
  const secret = Deno.env.get("INTASEND_SECRET_KEY");
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!challenge || !secret || !url || !serviceKey) return json({ error: "not_configured" }, 503);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !challengeMatches(body.challenge, challenge)) return json({ error: "unauthorized" }, 401);
  if (body.topic && body.topic !== "collection_event") return json({ ok: true, ignored: "topic" });

  const invoiceId = typeof body.invoice_id === "string" ? body.invoice_id : "";
  const state = String(body.state ?? "").toUpperCase();
  const apiRef = typeof body.api_ref === "string" ? body.api_ref : "";
  if (!invoiceId || !state) return json({ ok: true, ignored: "malformed" });

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const log = async (outcome: string, detail: string, tenantId?: string | null) => {
    await db.from("payment_events").upsert(
      { provider: "intasend", invoice_id: invoiceId, state, api_ref: apiRef || null, tenant_id: tenantId ?? null, outcome, detail },
      { onConflict: "provider,invoice_id,state", ignoreDuplicates: true },
    );
  };

  // Match the gift by BOTH our reference (api_ref = gift id) and the invoice id.
  const { data: gift } = await db.from("giving_records")
    .select("id, tenant_id, amount, payment_status, intasend_invoice_id")
    .eq("id", apiRef).eq("intasend_invoice_id", invoiceId).maybeSingle();
  if (!gift) { await log("unmatched", "no gift with this api_ref + invoice_id"); return json({ ok: true, ignored: "unmatched" }); }

  const incoming = mapState(state);
  if (!incoming) { await log("ignored", `state ${state} needs staff review`, gift.tenant_id); return json({ ok: true, ignored: "state" }); }
  const target = nextStatus(gift.payment_status, incoming);
  if (!target) { await log("ignored", `no transition from ${gift.payment_status}`, gift.tenant_id); return json({ ok: true, ignored: "transition" }); }

  let receipt: string | null = null;
  if (target === "confirmed") {
    // Never trust the webhook alone for money: confirm with the status API.
    const status = await intasendPost("/payment/status/", secret, { invoice_id: invoiceId });
    const inv = (status.json?.invoice ?? {}) as Record<string, unknown>;
    if (String(inv.state ?? "").toUpperCase() !== "COMPLETE" || String(inv.api_ref ?? "") !== gift.id
        || !amountMatches(gift.amount, inv.value, inv.currency)) {
      await log("rejected", "status API did not confirm COMPLETE with matching api_ref/amount/currency", gift.tenant_id);
      return json({ ok: true, ignored: "unverified" });
    }
    receipt = typeof inv.provider_ref === "string" ? inv.provider_ref : (typeof body.mpesa_reference === "string" ? body.mpesa_reference : null);
  }

  const update: Record<string, unknown> = { payment_status: target };
  if (receipt) update.mpesa_receipt = receipt;
  if (target === "failed" && typeof body.failed_reason === "string") update.notes = `M-Pesa: ${body.failed_reason}`.slice(0, 500);
  const { error } = await db.from("giving_records").update(update).eq("id", gift.id).eq("payment_status", gift.payment_status);
  if (error) { console.error("intasend-webhook: update failed", error.code); return json({ error: "update_failed" }, 500); }
  await log("applied", `${gift.payment_status} → ${target}`, gift.tenant_id);
  return json({ ok: true });
});
