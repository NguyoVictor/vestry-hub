import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function metadataValue(items: any[], name: string) {
  return items?.find((item) => item?.Name === name)?.Value ?? null;
}

Deno.serve(async (req: Request) => {
  const webhookSecret = Deno.env.get("PLATFORM_DARAJA_WEBHOOK_SECRET") || "";
  const callbackToken = new URL(req.url).searchParams.get("token") || "";
  if (!webhookSecret || callbackToken !== webhookSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  try {
    const payload = await req.json();
    const callback = payload?.Body?.stkCallback;
    if (!callback?.CheckoutRequestID) {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { "Content-Type": "application/json" } });
    }

    const items = callback.CallbackMetadata?.Item || [];
    const amount = metadataValue(items, "Amount");
    const receipt = metadataValue(items, "MpesaReceiptNumber");
    const phone = metadataValue(items, "PhoneNumber");

    const { data, error } = await supabase.rpc("apply_subscription_payment_callback", {
      p_checkout_request_id: callback.CheckoutRequestID,
      p_result_code: Number(callback.ResultCode ?? -1),
      p_result_desc: String(callback.ResultDesc || ""),
      p_amount: amount == null ? null : Number(amount),
      p_receipt: receipt == null ? null : String(receipt),
      p_phone: phone == null ? null : String(phone),
      p_raw_callback: payload,
    });

    if (error) console.error("subscription callback apply failed", error.message);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted", application: data || null }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("subscription webhook error", String(error));
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { "Content-Type": "application/json" } });
  }
});
