import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FCM_PROJECT_ID = "vestry-hub";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tenant_id, recipient_user_ids, title, body, priority, data } = await req.json();

    if (!tenant_id || !title || !body) {
      return new Response(JSON.stringify({ error: "tenant_id, title, and body are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");
    if (!FCM_SERVER_KEY) {
      return new Response(JSON.stringify({ error: "FCM_SERVER_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Fetch FCM tokens for the recipients
    let query = supabase.from("device_tokens").select("token, user_id").eq("tenant_id", tenant_id);
    if (recipient_user_ids && Array.isArray(recipient_user_ids) && recipient_user_ids.length > 0) {
      query = query.in("user_id", recipient_user_ids);
    }
    const { data: tokenRows } = await query;
    const tokens: string[] = (tokenRows ?? []).map((r: any) => r.token).filter(Boolean);

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0, note: "no_tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isUrgent = priority === "urgent";
    let successCount = 0;
    let failCount = 0;
    const invalidTokens: string[] = [];

    // Send one message per token (FCM v1 API requires individual sends or multicast)
    for (const token of tokens) {
      const message = {
        message: {
          token,
          notification: { title, body: body.slice(0, 200) },
          android: {
            priority: isUrgent ? "high" : "normal",
            notification: { color: "#F97316", sound: "default" },
          },
          apns: {
            headers: { "apns-priority": isUrgent ? "10" : "5" },
            payload: { aps: { sound: "default", badge: 1 } },
          },
          webpush: {
            notification: {
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              requireInteraction: isUrgent,
            },
          },
          data: {
            ...(data ?? {}),
            priority: priority ?? "normal",
          },
        },
      };

      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FCM_SERVER_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        }
      );

      if (res.ok) {
        successCount++;
      } else {
        const errData = await res.json().catch(() => ({}));
        const errCode = errData?.error?.details?.[0]?.errorCode ?? errData?.error?.status ?? "";
        if (errCode === "UNREGISTERED" || errCode === "INVALID_ARGUMENT") {
          invalidTokens.push(token);
        }
        failCount++;
      }
    }

    // Clean up invalid/expired tokens
    if (invalidTokens.length > 0) {
      await supabase.from("device_tokens").delete().in("token", invalidTokens);
    }

    return new Response(JSON.stringify({ ok: true, sent: successCount, failed: failCount, invalid_cleaned: invalidTokens.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
