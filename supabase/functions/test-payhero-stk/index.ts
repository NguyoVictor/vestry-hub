import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGING_REF = "xwbajophstetbnnemsyq";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function runTest(
  name: string,
  url: string,
  auth: string,
  method: "GET" | "POST",
  requestData?: Record<string, unknown>,
) {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      ...(requestData ? { body: JSON.stringify(requestData) } : {}),
    });

    // Providers may return non-JSON responses for errors.
    const rawResponse = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(rawResponse);
    } catch {
      data = { message: rawResponse.slice(0, 500) };
    }

    // Never return credentials or authorization headers in test results.
    return {
      name,
      status: response.status,
      success: response.ok,
      data,
    };
  } catch (error: unknown) {
    console.error(`${name} failed:`, errorMessage(error));
    return {
      name,
      status: "error",
      success: false,
      error: errorMessage(error),
    };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const authKey = Deno.env.get("PAYHERO_BASIC_AUTH") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  // Disabled by default. This code makes real HTTP requests to a payment provider.
  // Explicitly enable only after confirming the account, number and channel are
  // sandbox/test-only. Never enable it on production.
  if (
    Deno.env.get("PAYHERO_TEST_ENABLED") !== "true" ||
    supabaseUrl !== `https://${STAGING_REF}.supabase.co`
  ) {
    return json({ error: "payment_tests_disabled" }, 403);
  }

  if (!authKey || !serviceRoleKey || !anonKey) {
    return json({ error: "missing_server_configuration" }, 503);
  }

  const bearer = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!bearer) return json({ error: "unauthorized" }, 401);

  try {
    // Authenticate the actual user, rather than trusting the public API key.
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await userClient.auth.getUser(bearer);
    if (authError || !user) return json({ error: "unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: caller, error: callerError } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (callerError || caller?.role !== "super_admin") {
      return json({ error: "forbidden" }, 403);
    }

    // Intentionally require a separate confirmation in every request.
    const body = await req.json().catch(() => ({}));
    if (body?.confirmSandboxOnly !== true) {
      return json({ error: "sandbox_confirmation_required" }, 400);
    }

    const callbackUrl = `${supabaseUrl}/functions/v1/payment-webhook`;
    const tests: unknown[] = [];

    const stkData = {
      amount: 10,
      phone_number: "254700000000", // Replace only with a verified sandbox test number.
      channel_id: 1, // Replace only with a verified sandbox channel.
      provider: "mpesa",
      external_reference: `test-${Date.now()}`,
      callback_url: callbackUrl,
    };

    tests.push(await runTest(
      "STK Push Request",
      "https://backend.payhero.co.ke/api/v2/payments",
      authKey,
      "POST",
      stkData,
    ));

    tests.push(await runTest(
      "Alternative STK Endpoint",
      "https://backend.payhero.co.ke/api/v2/stk-push",
      authKey,
      "POST",
      {
        amount: 10,
        phone_number: "254700000000",
        reference: `test-${Date.now()}`,
      },
    ));

    tests.push(await runTest(
      "Account Profile",
      "https://backend.payhero.co.ke/api/v2/profile",
      authKey,
      "GET",
    ));

    tests.push(await runTest(
      "Account Info",
      "https://backend.payhero.co.ke/api/v2/account",
      authKey,
      "GET",
    ));

    return json({
      success: true,
      message: "PayHero API diagnostic requests completed; individual test results may indicate failures.",
      tests,
      environment: { has_basic_auth: true, project: STAGING_REF },
    });
  } catch (error: unknown) {
    console.error("test-payhero-stk failed:", errorMessage(error));
    return json({ error: "server_error" }, 500);
  }
});
