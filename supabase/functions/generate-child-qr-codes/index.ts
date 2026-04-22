import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomSuffix(len = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { serviceId, memberId } = await req.json();
    if (!serviceId || !memberId) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get service details
    const { data: service } = await supabase
      .from("services")
      .select("id, name, service_date, tenant_id")
      .eq("id", serviceId)
      .single();

    if (!service) {
      return new Response(JSON.stringify({ error: "service_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Find children where this member is guardian
    const { data: children } = await supabase
      .from("children")
      .select("id, first_name, last_name, class_id")
      .eq("tenant_id", service.tenant_id)
      .eq("active", true)
      .or(`guardian_primary_id.eq.${memberId},guardian_secondary_id.eq.${memberId}`);

    if (!children || children.length === 0) {
      return new Response(
        JSON.stringify({ qrCodes: [], childrenCount: 0, message: "No children linked to this member" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Generate QR codes for each child
    const expiresAt = new Date(service.service_date + "T23:59:59").toISOString();
    const qrCodes = [];

    for (const child of children) {
      // Check if QR already exists for this child + service
      const { data: existing } = await supabase
        .from("children_qr_codes")
        .select("id, qr_data")
        .eq("child_id", child.id)
        .eq("service_id", serviceId)
        .maybeSingle();

      let qrData: string;

      if (existing) {
        qrData = existing.qr_data;
      } else {
        qrData = `VSTRY-${service.tenant_id}-${child.id}-${serviceId}-${randomSuffix()}`;
        await supabase.from("children_qr_codes").insert({
          tenant_id: service.tenant_id,
          child_id: child.id,
          service_id: serviceId,
          qr_data: qrData,
          sent_at: new Date().toISOString(),
          expires_at: expiresAt,
        });
      }

      qrCodes.push({ childId: child.id, childName: `${child.first_name} ${child.last_name}`, qrData });

      // 4. Send in-app notification to the member
      await supabase.from("notifications").insert({
        tenant_id: service.tenant_id,
        user_id: memberId,
        type: "children_qr_ready",
        title: `📱 ${child.first_name}'s Check-in QR Code Ready`,
        body: `${child.first_name}'s QR code for ${service.name} on ${service.service_date} is ready. View it in the Children section.`,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ qrCodes, childrenCount: children.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error", message: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
