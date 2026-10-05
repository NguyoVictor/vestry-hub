import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getAuthenticatedTenantActor } from "../_shared/authorize-tenant-actor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function normalizePhone(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("254")) return digits;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

function darajaTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { product_code, phone } = await req.json();
    if (!product_code || !phone) return json({ error: "product_code and phone are required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let actor;
    try {
      actor = await getAuthenticatedTenantActor(req, supabase);
    } catch (error) {
      return json({ error: String(error).includes("forbidden") ? "forbidden" : "unauthorized" }, String(error).includes("forbidden") ? 403 : 401);
    }

    const tenantId = actor.tenantId;
    const { data: product, error: productError } = await supabase
      .from("subscription_catalog")
      .select("product_code, product_type, plan_key, addon_key, name, amount_kes, entitlements, sort_order, active")
      .eq("product_code", product_code)
      .eq("active", true)
      .maybeSingle();
    if (productError || !product) return json({ error: "Unknown subscription product" }, 400);

    const { data: subscription } = await supabase
      .from("tenant_subscriptions")
      .select("plan, current_period_end")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!subscription) return json({ error: "Subscription record not found" }, 409);

    if (product.product_type === "plan") {
      const { data: currentProduct } = await supabase
        .from("subscription_catalog")
        .select("sort_order")
        .eq("product_code", `plan_${subscription.plan}`)
        .maybeSingle();
      const currentSort = Number(currentProduct?.sort_order ?? 0);
      const targetSort = Number(product.sort_order ?? 0);

      if (targetSort < currentSort) {
        const effectiveAt = subscription.current_period_end || new Date().toISOString();
        await supabase.from("tenant_subscriptions").update({
          pending_plan: product.plan_key,
          downgrade_effective_at: effectiveAt,
          updated_at: new Date().toISOString(),
        }).eq("tenant_id", tenantId);
        return json({ ok: true, scheduled_downgrade: true, pending_plan: product.plan_key, effective_at: effectiveAt });
      }
      if (targetSort === currentSort) return json({ ok: true, unchanged: true, plan: subscription.plan });
    }

    if (Number(product.amount_kes) <= 0) return json({ error: "This product does not require an STK payment" }, 400);

    const normalizedPhone = normalizePhone(phone);
    if (!/^254\d{9}$/.test(normalizedPhone)) return json({ error: "Enter a valid Kenyan mobile number" }, 400);

    const { data: attempt, error: attemptError } = await supabase
      .from("subscription_payment_attempts")
      .insert({
        tenant_id: tenantId,
        product_code: product.product_code,
        expected_amount: product.amount_kes,
        phone: normalizedPhone,
        status: "pending",
      })
      .select("id")
      .single();
    if (attemptError || !attempt) return json({ error: "Unable to create payment attempt" }, 500);

    const consumerKey = Deno.env.get("PLATFORM_DARAJA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("PLATFORM_DARAJA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("PLATFORM_DARAJA_SHORTCODE");
    const passkey = Deno.env.get("PLATFORM_DARAJA_PASSKEY");
    const callbackUrl = Deno.env.get("PLATFORM_DARAJA_CALLBACK_URL");
    const webhookSecret = Deno.env.get("PLATFORM_DARAJA_WEBHOOK_SECRET");
    const baseUrl = Deno.env.get("PLATFORM_DARAJA_BASE_URL") || "https://api.safaricom.co.ke";
    if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl || !webhookSecret) {
      await supabase.from("subscription_payment_attempts").update({ status: "failed", result_desc: "platform_daraja_not_configured", completed_at: new Date().toISOString() }).eq("id", attempt.id);
      return json({ error: "Subscription payments are not configured" }, 503);
    }

    const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}` },
    });
    if (!tokenRes.ok) {
      await supabase.from("subscription_payment_attempts").update({ status: "failed", result_desc: "daraja_oauth_failed", completed_at: new Date().toISOString() }).eq("id", attempt.id);
      return json({ error: "Unable to connect to M-Pesa" }, 502);
    }
    const tokenData = await tokenRes.json();
    const callbackTokenUrl = new URL(callbackUrl);
    callbackTokenUrl.searchParams.set("token", webhookSecret);
    const timestamp = darajaTimestamp();
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: product.amount_kes,
        PartyA: normalizedPhone,
        PartyB: shortcode,
        PhoneNumber: normalizedPhone,
        CallBackURL: callbackTokenUrl.toString(),
        AccountReference: `Vestry${String(attempt.id).replace(/-/g, "").slice(0, 6)}`,
        TransactionDesc: product.name,
      }),
    });
    const stkData = await stkRes.json().catch(() => ({}));
    if (!stkRes.ok || !stkData.CheckoutRequestID) {
      await supabase.from("subscription_payment_attempts").update({
        status: "failed", result_desc: stkData.errorMessage || stkData.ResponseDescription || "stk_initiation_failed",
        updated_at: new Date().toISOString(), completed_at: new Date().toISOString(),
      }).eq("id", attempt.id);
      return json({ error: "M-Pesa STK request failed" }, 502);
    }

    await supabase.from("subscription_payment_attempts").update({
      merchant_request_id: stkData.MerchantRequestID || null,
      checkout_request_id: stkData.CheckoutRequestID,
      result_desc: stkData.ResponseDescription || null,
      updated_at: new Date().toISOString(),
    }).eq("id", attempt.id);

    return json({
      ok: true,
      attempt_id: attempt.id,
      checkout_request_id: stkData.CheckoutRequestID,
      product_code: product.product_code,
      amount_kes: product.amount_kes,
      customer_message: stkData.CustomerMessage || "Check your phone to complete the M-Pesa payment.",
    }, 202);
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});
