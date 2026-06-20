import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const envVars = {
      SUPABASE_URL: !!Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      RESEND_API_KEY: !!Deno.env.get("RESEND_API_KEY"),
      RESEND_API_KEY_LENGTH: Deno.env.get("RESEND_API_KEY")?.length || 0,
      RESEND_API_KEY_PREFIX: Deno.env.get("RESEND_API_KEY")?.substring(0, 10) || "none",
    };
    
    console.log("Environment variables check:", envVars);
    
    return new Response(JSON.stringify({
      success: true,
      environment: envVars,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});