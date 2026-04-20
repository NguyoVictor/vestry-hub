import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory cache: { [tenant_id]: { balance, currency, fetchedAt } }
const cache = new Map<string, { balance: number; currency: string; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache
    const cached = cache.get(tenant_id);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return new Response(JSON.stringify({ balance: cached.balance, currency: cached.currency, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: settings } = await supabase
      .from("sms_settings")
      .select("at_username, at_api_key, is_configured")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (!settings?.is_configured || !settings.at_username || !settings.at_api_key) {
      return new Response(JSON.stringify({ error: "SMS not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`https://api.africastalking.com/version1/user?username=${settings.at_username}`, {
      headers: { "apiKey": settings.at_api_key, "Accept": "application/json" },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AT balance error: ${err}`);
    }

    const data = await res.json();
    const balanceStr: string = data?.UserData?.balance ?? "KES 0";
    const parts = balanceStr.split(" ");
    const currency = parts[0] ?? "KES";
    const balance = parseFloat(parts[1]?.replace(/,/g, "") ?? "0") || 0;

    // Cache result
    cache.set(tenant_id, { balance, currency, fetchedAt: Date.now() });

    return new Response(JSON.stringify({ balance, currency, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
