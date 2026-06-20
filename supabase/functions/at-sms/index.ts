import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action, tenantId, to, message } = body;

    // Fetch tenant credentials
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("at_username, at_api_key, at_sender_id")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) throw new Error("Tenant not found");
    if (!tenant.at_username || !tenant.at_api_key) throw new Error("Africa's Talking credentials not configured");

    if (action === "check_balance") {
      const res = await fetch(
        `https://api.africastalking.com/version1/user?username=${encodeURIComponent(tenant.at_username)}`,
        {
          method: "GET",
          headers: {
            "apiKey": tenant.at_api_key,
            "Accept": "application/json",
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.errorMessage ?? `HTTP ${res.status}`);
      return new Response(
        JSON.stringify({ balance: data?.UserData?.balance ?? "Unknown" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send_sms") {
      if (!to || !message) throw new Error("Missing 'to' or 'message'");
      const params = new URLSearchParams({
        username: tenant.at_username,
        to,
        message,
        ...(tenant.at_sender_id ? { senderId: tenant.at_sender_id } : {}),
      });
      const res = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          "apiKey": tenant.at_api_key,
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: params.toString(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.errorMessage ?? `HTTP ${res.status}`);
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
