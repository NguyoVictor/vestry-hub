import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { prompt, model, tenant_id } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check AI usage limits if tenant_id is provided
    if (tenant_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data: subscription } = await supabase
        .from("tenant_subscriptions")
        .select("ai_credits, ai_addons, ai_used")
        .eq("tenant_id", tenant_id)
        .maybeSingle();

      if (subscription) {
        const aiLimit = (subscription.ai_credits || 0) + (subscription.ai_addons || 0);
        const aiUsed = subscription.ai_used || 0;
        
        if (aiUsed >= aiLimit) {
          return new Response(JSON.stringify({ 
            error: "AI credit limit reached. Top up to continue.",
            limit_reached: true 
          }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: model || "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return new Response(
        JSON.stringify({ error: `Groq API error: ${groqRes.status}`, detail: errText }),
        {
          status: groqRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await groqRes.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Increment AI usage after successful call
    if (tenant_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data: subscription } = await supabase
        .from("tenant_subscriptions")
        .select("ai_used")
        .eq("tenant_id", tenant_id)
        .maybeSingle();

      if (subscription) {
        await supabase
          .from("tenant_subscriptions")
          .update({ 
            ai_used: (subscription.ai_used || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq("tenant_id", tenant_id);
      }
    }

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
