import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authToken = Deno.env.get("SENTRY_AUTH_TOKEN");
    const org = Deno.env.get("SENTRY_ORG");
    const project = Deno.env.get("SENTRY_PROJECT");
    const baseUrl = Deno.env.get("SENTRY_BASE_URL") ?? "https://de.sentry.io";

    if (!authToken || !org || !project) {
      return json({ error: "config_error", message: "SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT secrets must be set" }, 500);
    }

    const url = `${baseUrl}/api/0/organizations/${org}/issues/?project=${project}&query=is:unresolved&limit=20`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return json({ error: "sentry_api_error", status: res.status, message: body }, 502);
    }

    const issues = await res.json();
    return json(issues);

  } catch (err) {
    return json({ error: "server_error", message: String(err) }, 500);
  }
});
