import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Meta requires webhook verification via GET request
// and delivery status updates via POST

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // ── Webhook verification (GET) ────────────────────────────────────────────
  if (req.method === "GET") {
    const mode      = url.searchParams.get("hub.mode");
    const token     = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const VERIFY_TOKEN = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") ?? "vestry_wa_webhook_2024";
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ── Delivery status updates (POST) ───────────────────────────────────────
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      const entries = body?.entry ?? [];
      for (const entry of entries) {
        for (const change of entry?.changes ?? []) {
          const value = change?.value;
          // Process status updates
          for (const statusUpdate of value?.statuses ?? []) {
            const messageId = statusUpdate.id;
            const status    = statusUpdate.status; // sent | delivered | read | failed
            const timestamp = statusUpdate.timestamp;
            const errors    = statusUpdate.errors;

            const updatePayload: Record<string, any> = { status };
            if (status === "delivered") updatePayload.delivered_at = new Date(parseInt(timestamp) * 1000).toISOString();
            if (status === "read")      updatePayload.read_at      = new Date(parseInt(timestamp) * 1000).toISOString();
            if (status === "failed" && errors?.length) updatePayload.error_message = errors[0]?.title ?? "Unknown error";

            await supabase.from("whatsapp_messages").update(updatePayload).eq("message_id", messageId);
          }
        }
      }

      // Meta requires 200 within 5 seconds
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Webhook error:", String(err));
      return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
