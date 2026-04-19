import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email_type, church_name, recipient_name, additional_context } = await req.json();

    if (!email_type || !church_name) {
      return new Response(JSON.stringify({ error: "email_type and church_name are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientLine = recipient_name ? `The recipient's name is ${recipient_name}.` : "";
    const contextLine = additional_context ? `Additional context: ${additional_context}.` : "";

    const userPrompt = `Generate a ${email_type} email for a church called ${church_name}. ${recipientLine} ${contextLine} Make it warm, concise, and appropriate for a church audience. Use {{first_name}} for personalization where appropriate.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content: "You are a helpful church communications assistant. Generate a warm, professional, and faith-appropriate email for a church. Use the placeholder format {{first_name}} for personalization. Return only the email body text, no subject line, no preamble.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq error: ${res.status} — ${err}`);
    }

    const data = await res.json();
    const body: string = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ body }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
