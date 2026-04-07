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
      maritalStatus, memberType,
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

    // 1. Look up tenant by church_code
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

    // 2. Check if already registered (by email if provided, or phone)
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

    // 3. Insert member
    const type = memberType === "visitor" ? "visitor" : "member";
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
        status: type === "visitor" ? "visitor" : "active",
        member_type: type,
        membership_status: "Pending Approval",
        registration_source: "qr_scan",
        join_date: new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        membership_number: `M-${Date.now()}`,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 4. Log activity
    await supabase.from("activity_log").insert({
      tenant_id: tenant.id,
      action_type: type === "visitor" ? "new_visitor" : "new_member",
      description: `${firstName} ${lastName} registered via QR code`,
      entity_id: member.id,
      entity_type: "member",
    });

    return new Response(
      JSON.stringify({
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
