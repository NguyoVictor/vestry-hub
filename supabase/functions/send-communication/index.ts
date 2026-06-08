import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildBrandedEmail } from "../_shared/branded-email.ts";
import { replacePlaceholders, getMemberPlaceholderData, type PlaceholderData } from "../_shared/placeholder-replacer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const {
      tenant_id,
      channel,
      subject,
      body,
      recipients,          // [{ email, name, first_name, last_name }]
      attachments,         // [{ name, url }] - optional
      is_test,             // boolean — if true, send a branded test email
      admin_email,         // required when is_test = true
      admin_first_name,    // optional, for personalisation
      schedule_at,         // ISO string — if set, save as scheduled (not sent immediately)
      event_data,          // optional event data for event-specific emails
      giving_data,         // optional giving data for giving-specific emails
    } = payload;

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Check email usage limits for bulk emails (not test emails)
    if (!is_test && recipients && Array.isArray(recipients) && recipients.length > 0) {
      const { data: subscription } = await supabase
        .from("tenant_subscriptions")
        .select("email_credits, email_addons, email_used")
        .eq("tenant_id", tenant_id)
        .maybeSingle();

      if (subscription) {
        const emailLimit = (subscription.email_credits || 0) + (subscription.email_addons || 0);
        const emailUsed = subscription.email_used || 0;
        
        if (emailUsed + recipients.length > emailLimit) {
          return new Response(JSON.stringify({ 
            error: "Email credit limit reached. Top up to continue.",
            limit_reached: true 
          }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Fetch tenant name
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenant_id)
      .maybeSingle();
    const churchName: string = tenant?.name ?? "Your Church";

    // ── TEST EMAIL ────────────────────────────────────────────────────────────
    if (is_test) {
      if (!admin_email) {
        return new Response(JSON.stringify({ error: "admin_email is required for test emails" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const firstName = admin_first_name ?? "Admin";
      const testSubject = "✏ Test Email - Vestry Hub";
      const bodyHtml = `
        <p>Hello ${firstName},</p>
        <p>This is a test email from <strong>Vestry Hub</strong> to verify your email configuration is working correctly.</p>
        <p>If you received this email, your communication system is properly configured!</p>
        <p>Best regards,<br/><strong>${churchName}</strong></p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="font-size:12px;color:#94a3b8;">Sent from ${churchName} via Vestry Hub</p>
      `;

      const html = await buildBrandedEmail({
        tenantId: tenant_id,
        churchName,
        subject: testSubject,
        bodyHtml,
        supabaseClient: supabase,
      });

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${churchName} <support@vestryhub.com>`,
          to: [admin_email],
          subject: testSubject,
          html,
          ...(attachments && attachments.length > 0 && {
            attachments: attachments.map(att => ({
              filename: att.name,
              path: att.url
            }))
          })
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend error: ${err}`);
      }

      // Log to communications table
      await supabase.from("communications").insert({
        tenant_id,
        channel: "email",
        subject: testSubject,
        body: `Hello ${firstName}, This is a test email from Vestry Hub...`,
        recipient_count: 1,
        status: "sent",
        sent_at: new Date().toISOString(),
        is_test: true,
      }).select().maybeSingle();

      return new Response(JSON.stringify({ ok: true, sent_to: admin_email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── BULK EMAIL ────────────────────────────────────────────────────────────
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "recipients array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subject || !body) {
      return new Response(JSON.stringify({ error: "subject and body are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If scheduled, save to communications table and return
    if (schedule_at) {
      await supabase.from("communications").insert({
        tenant_id,
        channel: channel ?? "email",
        subject,
        body,
        recipient_count: recipients.length,
        status: "scheduled",
        scheduled_at: schedule_at,
        is_test: false,
      });
      return new Response(JSON.stringify({ ok: true, scheduled: true, recipient_count: recipients.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get church details for placeholders
    const { data: churchDetails } = await supabase
      .from("tenants")
      .select("name, contact_email, church_code, logo")
      .eq("id", tenant_id)
      .maybeSingle();

    // Send immediately — personalise per recipient
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      if (!recipient.email) { failCount++; continue; }

      // Get comprehensive placeholder data for this member
      const memberPlaceholderData = await getMemberPlaceholderData(supabase, tenant_id, recipient.email);
      
      // Add any event-specific data
      const placeholderData: PlaceholderData = {
        ...memberPlaceholderData,
        ...(event_data && {
          event_name: event_data.name,
          event_date: event_data.date,
          event_time: event_data.time,
          event_location: event_data.location,
        }),
        ...(giving_data && {
          amount: giving_data.amount,
          giving_type: giving_data.type,
          receipt_number: giving_data.receipt_number,
          giving_date: giving_data.date,
        }),
      };

      // Replace all placeholders in subject and body
      const personalizedSubject = replacePlaceholders(subject, placeholderData);
      const personalizedBody = replacePlaceholders(body, placeholderData).replace(/\n/g, "<br/>");

      const html = await buildBrandedEmail({
        tenantId: tenant_id,
        churchName,
        subject: personalizedSubject,
        bodyHtml: `<p>${personalizedBody}</p>`,
        supabaseClient: supabase,
      });

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${churchName} <support@vestryhub.com>`,
          to: [recipient.email],
          subject: personalizedSubject,
          html,
          ...(attachments && attachments.length > 0 && {
            attachments: attachments.map(att => ({
              filename: att.name,
              path: att.url
            }))
          })
        }),
      });

      if (res.ok) successCount++;
      else failCount++;
    }

    // Log to communications table
    await supabase.from("communications").insert({
      tenant_id,
      channel: channel ?? "email",
      subject,
      body,
      recipient_count: recipients.length,
      status: failCount === recipients.length ? "failed" : "sent",
      sent_at: new Date().toISOString(),
      is_test: false,
    });

    // Increment email usage after successful sends
    if (successCount > 0) {
      const { data: subscription } = await supabase
        .from("tenant_subscriptions")
        .select("email_used")
        .eq("tenant_id", tenant_id)
        .maybeSingle();

      if (subscription) {
        await supabase
          .from("tenant_subscriptions")
          .update({ 
            email_used: (subscription.email_used || 0) + successCount,
            updated_at: new Date().toISOString()
          })
          .eq("tenant_id", tenant_id);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: successCount, failed: failCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
