import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email } = await req.json();
    const testEmail = email || "test@example.com";
    
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    console.log("Testing Resend API with key:", RESEND_API_KEY?.substring(0, 10));
    
    const payload = {
      from: "Test Church <support@vestryhub.com>",
      to: [testEmail],
      subject: "Test Email from Vestry Hub",
      html: "<p>This is a test email to check Resend configuration.</p>"
    };
    
    console.log("Sending test email to:", testEmail);
    console.log("Payload:", JSON.stringify(payload, null, 2));
    
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    console.log("Resend response status:", response.status);
    console.log("Resend response headers:", Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log("Resend response body:", responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }
    
    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      response: responseData,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ 
      error: err.message,
      stack: err.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});