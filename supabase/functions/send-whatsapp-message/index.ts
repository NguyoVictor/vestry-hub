import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tenant_id, recipient_phone, recipient_member_id, template_name, template_variables } = await req.json();

    if (!tenant_id || !recipient_phone || !template_name) {
      return new Response(JSON.stringify({ error: "tenant_id, recipient_phone, and template_name are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Fetch tenant WhatsApp credentials
    const { data: tenant } = await supabase
      .from("tenants")
      .select("whatsapp_connected, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_provider, name")
      .eq("id", tenant_id)
      .maybeSingle();

    if (!tenant?.whatsapp_connected || !tenant.whatsapp_phone_number_id || !tenant.whatsapp_access_token) {
      return new Response(JSON.stringify({ error: "WhatsApp not connected. Configure in Settings." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch template
    const { data: template } = await supabase
      .from("whatsapp_templates")
      .select("body, variables")
      .eq("tenant_id", tenant_id)
      .eq("name", template_name)
      .maybeSingle();

    if (!template) {
      return new Response(JSON.stringify({ error: `Template '${template_name}' not found` }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits
    const { data: credits } = await supabase
      .from("whatsapp_credits")
      .select("total_credits, used_credits")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    const remaining = (credits?.total_credits ?? 0) - (credits?.used_credits ?? 0);
    if (remaining <= 0) {
      return new Response(JSON.stringify({ error: "Insufficient WhatsApp credits" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Meta API payload
    const variables: string[] = Array.isArray(template_variables) ? template_variables : Object.values(template_variables ?? {});
    const components = variables.length > 0 ? [{
      type: "body",
      parameters: variables.map((v: string) => ({ type: "text", text: v })),
    }] : [];

    const metaPayload = {
      messaging_product: "whatsapp",
      to: recipient_phone.replace(/\D/g, ""),
      type: "template",
      template: {
        name: template_name,
        language: { code: "en" },
        components,
      },
    };

    const metaRes = await fetch(
      `https://graph.facebook.com/v18.0/${tenant.whatsapp_phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tenant.whatsapp_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metaPayload),
      }
    );

    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      // Log failed message
      await supabase.from("whatsapp_messages").insert({
        tenant_id, recipient_phone, recipient_member_id: recipient_member_id ?? null,
        template_name, template_variables: template_variables ?? {},
        status: "failed", error_message: JSON.stringify(metaData?.error ?? metaData),
        sent_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ error: "Meta API error", detail: metaData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageId = metaData?.messages?.[0]?.id ?? null;

    // Log successful message
    await supabase.from("whatsapp_messages").insert({
      tenant_id, recipient_phone, recipient_member_id: recipient_member_id ?? null,
      template_name, template_variables: template_variables ?? {},
      status: "sent", message_id: messageId,
      sent_at: new Date().toISOString(),
    });

    // Deduct 1 credit
    await supabase.from("whatsapp_credits").upsert({
      tenant_id,
      used_credits: (credits?.used_credits ?? 0) + 1,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: "tenant_id" });

    const newBalance = remaining - 1;
    await supabase.from("whatsapp_credit_transactions").insert({
      tenant_id, description: `Message sent via template: ${template_name}`,
      credits_change: -1, balance_after: newBalance,
    });

    return new Response(JSON.stringify({ ok: true, message_id: messageId, credits_remaining: newBalance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
