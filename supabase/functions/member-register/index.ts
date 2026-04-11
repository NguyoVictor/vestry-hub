import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      churchCode, firstName, lastName, email, phone,
      gender, dateOfBirth, address, city, occupation,
      maritalStatus, memberType, howHeard, registrationSource,
      ageGroup, preferredContact, prayerRequest,
    } = await req.json();

    if (!churchCode || !firstName || !lastName || !phone) {
      return new Response(JSON.stringify({ error: "missing_required_fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up tenant by church_code
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, logo, church_code, slug")
      .eq("church_code", churchCode.trim().toUpperCase())
      .single();

    if (!tenant) {
      return new Response(JSON.stringify({ error: "invalid_code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];

    // ── VISITOR FLOW ──────────────────────────────────────────────────────────
    if (memberType === "visitor") {
      const { data: visitor, error: visitorErr } = await supabase
        .from("visitors")
        .insert({
          tenant_id: tenant.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email ? email.trim().toLowerCase() : null,
          phone: phone.trim(),
          city: city || null,
          gender: gender || null,
          visit_date: today,
          how_heard: howHeard || null,
          how_heard_detail: preferredContact || null,
          follow_up_status: "new",
          service_attended: registrationSource === "qr_scan" ? "qr_scan" : "form",
          notes: [
            ageGroup ? `Age group: ${ageGroup}` : null,
            prayerRequest ? `Prayer request: ${prayerRequest}` : null,
          ].filter(Boolean).join("\n") || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (visitorErr) throw visitorErr;

      const sourceLabel = registrationSource === "qr_scan" ? "QR code" : "registration form";
      await supabase.from("activity_log").insert({
        tenant_id: tenant.id,
        action_type: "new_visitor",
        description: `${firstName} ${lastName} visited via ${sourceLabel}`,
        entity_id: visitor.id,
        entity_type: "visitor",
      });

      return new Response(
        JSON.stringify({
          type: "visitor",
          visitor,
          churchCode: tenant.church_code,
          churchName: tenant.name,
          churchLogo: tenant.logo,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── MEMBER FLOW ───────────────────────────────────────────────────────────
    // Check for duplicate email
    if (email) {
      const { data: existing } = await supabase
        .from("members")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("email", email.trim().toLowerCase())
        .single();
      if (existing) {
        return new Response(JSON.stringify({ error: "already_registered" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: member, error: insertError } = await supabase
      .from("members")
      .insert({
        tenant_id: tenant.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email ? email.trim().toLowerCase() : null,
        phone: phone.trim(),
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        street: address || null,
        city: city || null,
        occupation: occupation || null,
        marital_status: maritalStatus || null,
        status: "active",
        member_type: "member",
        membership_status: "Pending Approval",
        registration_source: registrationSource === "qr_scan" ? "qr_scan" : "admin",
        join_date: today,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        membership_number: `M-${Date.now()}`,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const sourceLabel = registrationSource === "qr_scan" ? "QR code" : "registration form";
    await supabase.from("activity_log").insert({
      tenant_id: tenant.id,
      action_type: "new_member",
      description: `${firstName} ${lastName} registered via ${sourceLabel} (Pending Approval)`,
      entity_id: member.id,
      entity_type: "member",
    });

    return new Response(
      JSON.stringify({
        type: "member",
        member,
        churchCode: tenant.church_code,
        churchName: tenant.name,
        churchLogo: tenant.logo,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error", message: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
