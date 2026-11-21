// M-Pesa STK push for giving, via IntaSend (Phase 9; replaces PayHero/Daraja).
// Same request/response contract the giving pages already use:
//   POST { amount, phone_number, tenant_id, member_id?, donor_name?, giving_type?, campaign_id?, notes? }
//   → { success, message, CheckoutRequestID, checkout_request_id, giving_record_id }
// Caller must be active STAFF of the church, or a portal MEMBER of the church
// giving as themselves. A PENDING gift is written first; only the verified
// IntaSend webhook can confirm it. Secrets come from function secrets only.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { intasendPost, normalizeKenyanPhone, validateAmount } from "../_shared/intasend.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Content-Type": "application/json",
};
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });
// giving_type_enum: tithe, offering, pledge_payment, special_donation ("pledge" from the pledge page → pledge_payment)
const GIVING_TYPES = new Set(["tithe", "offering", "pledge_payment", "special_donation"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ success: false, error: "method_not_allowed" }, 405);
  const bearer = /^Bearer\s+([^\s]+)$/i.exec(req.headers.get("Authorization")?.trim() ?? "");
  if (!bearer) return reply({ success: false, error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secret = Deno.env.get("INTASEND_SECRET_KEY");
  if (!url || !serviceKey) return reply({ success: false, error: "server_configuration_error" }, 500);
  if (!secret) return reply({ success: false, error: "M-Pesa payments are not configured yet." }, 503);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: auth, error: authError } = await db.auth.getUser(bearer[1]);
  if (authError || !auth.user) return reply({ success: false, error: "unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));
  const tenantId = typeof body?.tenant_id === "string" ? body.tenant_id : "";
  if (!tenantId) return reply({ success: false, error: "tenant_id required" }, 400);

  // Caller: staff of this church, or a portal member of this church (as themselves).
  const { data: staff } = await db.from("users").select("id, tenant_id, status, role").eq("id", auth.user.id).maybeSingle();
  let memberId: string | null = null;
  let recordedBy: string | null = null;
  if (staff && staff.tenant_id === tenantId && staff.status === "active" && staff.role !== "member") {
    recordedBy = staff.id;
    memberId = typeof body?.member_id === "string" && body.member_id ? body.member_id : null;
    if (memberId) {
      const { data: m } = await db.from("members").select("id").eq("id", memberId).eq("tenant_id", tenantId).maybeSingle();
      if (!m) memberId = null; // staff giving on behalf of a non-member / themselves
    }
  } else {
    const { data: link } = await db.from("member_auth_memberships").select("member_id")
      .eq("auth_user_id", auth.user.id).eq("tenant_id", tenantId).maybeSingle();
    if (!link) return reply({ success: false, error: "forbidden" }, 403);
    memberId = String(link.member_id); // members always give as themselves
  }

  const { data: tenant } = await db.from("tenants").select("id, intasend_enabled, intasend_wallet_id").eq("id", tenantId).maybeSingle();
  if (!tenant) return reply({ success: false, error: "Church not found." }, 404);
  if (!tenant.intasend_enabled) return reply({ success: false, error: "M-Pesa giving is not enabled for this church yet." }, 409);

  const amountCheck = validateAmount(body?.amount);
  if (!amountCheck.ok) return reply({ success: false, error: amountCheck.error }, 400);
  const phone = normalizeKenyanPhone(body?.phone_number);
  if (!phone) return reply({ success: false, error: "Enter a valid Safaricom number, e.g. 0712 345 678." }, 400);
  const requestedType = String(body?.giving_type) === "pledge" ? "pledge_payment" : String(body?.giving_type);
  const givingType = GIVING_TYPES.has(requestedType) ? requestedType : "offering";
  let campaignId: string | null = null;
  if (typeof body?.campaign_id === "string" && body.campaign_id) {
    const { data: c } = await db.from("pledge_campaigns").select("id").eq("id", body.campaign_id).eq("tenant_id", tenantId).maybeSingle();
    if (!c) return reply({ success: false, error: "Campaign not found." }, 404);
    campaignId = c.id;
  }

  // 1) Pending gift first (api_ref = gift id), so every STK push is traceable.
  const { data: gift, error: giftError } = await db.from("giving_records").insert({
    tenant_id: tenantId, member_id: memberId, amount: amountCheck.amount, currency: "KES",
    giving_type: givingType, payment_method: "mpesa", payment_status: "pending", payment_provider: "intasend",
    donor_name: typeof body?.donor_name === "string" ? body.donor_name.slice(0, 120) : null,
    phone_number: phone, campaign_id: campaignId, notes: typeof body?.notes === "string" ? body.notes.slice(0, 500) : null,
    recorded_by: recordedBy, given_at: new Date().toISOString(),
  }).select("id").single();
  if (giftError || !gift) {
    console.error("process-stk-push: gift insert failed", giftError?.code);
    return reply({ success: false, error: "Could not start the payment." }, 500);
  }

  // 2) STK push.
  const stk = await intasendPost("/payment/mpesa-stk-push/", secret, {
    amount: amountCheck.amount, phone_number: phone, api_ref: gift.id,
    ...(tenant.intasend_wallet_id ? { wallet_id: tenant.intasend_wallet_id } : {}),
  });
  const invoice = (stk.json?.invoice ?? null) as Record<string, unknown> | null;
  const invoiceId = invoice && typeof invoice.invoice_id === "string" ? invoice.invoice_id : null;
  if (stk.status >= 300 || !invoiceId) {
    await db.from("giving_records").update({ payment_status: "failed", notes: "M-Pesa request was not accepted" }).eq("id", gift.id);
    console.error("process-stk-push: IntaSend rejected", stk.status);
    return reply({ success: false, error: "M-Pesa could not send the payment prompt. Check the number and try again." }, 502);
  }
  await db.from("giving_records").update({ intasend_invoice_id: invoiceId, checkout_request_id: invoiceId, external_reference: invoiceId }).eq("id", gift.id);

  return reply({
    success: true, message: "Check your phone and enter your M-Pesa PIN.",
    CheckoutRequestID: invoiceId, checkout_request_id: invoiceId, giving_record_id: gift.id,
  });
});
