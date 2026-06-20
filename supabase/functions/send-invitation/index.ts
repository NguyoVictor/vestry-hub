import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildBrandedEmail } from "../_shared/branded-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const payload = await req.json();
    const { email, role, church_name, invited_by, tenant_id, first_name, last_name } = payload;

    if (!email || !tenant_id) {
      return new Response(JSON.stringify({ error: "email and tenant_id are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });

    // Enforce staff limit at backend level
    const { count: currentStaffCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .neq('role', 'member')
      .eq('status', 'active');

    const { data: subscription } = await supabase
      .from('tenant_subscriptions')
      .select('staff_limit')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    const staffLimit = subscription?.staff_limit ?? 3;

    if ((currentStaffCount ?? 0) >= staffLimit) {
      return new Response(
        JSON.stringify({
          error: `Staff limit reached. Your plan allows ${staffLimit} admins. Remove an existing admin before adding a new one.`
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let newUserId: string | null = null;
    let alreadyRegistered = false;

    try {
      const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { tenant_id, role, invited_by, church_name, first_name: first_name || '', last_name: last_name || '' },
        redirectTo: `${Deno.env.get("SITE_URL") ?? "https://vestryhub.com"}/auth/invite`,
      });

      if (inviteErr) {
        if (inviteErr.status === 422 || inviteErr.message?.includes('already been registered')) {
          // User already has auth account — find their ID and add directly
          const { data: { users: allUsers } } = await supabase.auth.admin.listUsers();
          const existingAuthUser = allUsers?.find((u: any) => u.email === email);
          newUserId = existingAuthUser?.id ?? null;
          alreadyRegistered = true;
          console.warn("User already registered, adding directly:", email);
        } else {
          console.warn("Auth invite warning:", inviteErr.message);
        }
      } else {
        newUserId = inviteData?.user?.id ?? null;
      }
    } catch (authError) {
      console.warn("Auth invite skipped:", authError);
    }

    // Create users table record if we have a valid user ID
    if (newUserId) {
      const userRecord: any = {
        id: newUserId,
        tenant_id,
        email,
        role,
        status: 'active',
        invitation_sent: true,
      };

      if (first_name) userRecord.first_name = first_name;
      if (last_name !== undefined && last_name !== null) userRecord.last_name = last_name;

      await supabase.from('users').upsert(userRecord, { onConflict: 'id' });

      if (alreadyRegistered) {
        const { data: existingThread } = await supabase
          .from('conversations')
          .select('id')
          .eq('staff_user_id', newUserId)
          .eq('is_staff_directory', true)
          .eq('tenant_id', tenant_id)
          .maybeSingle();
        if (!existingThread) {
          const displayName = (first_name || '').trim() || `${first_name || ''} ${last_name || ''}`.trim() || 'Team member';
          const welcomeMsg = `Hi! I'm ${displayName}. Feel free to reach out with any questions, prayer requests, or concerns. 🙏`;
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              tenant_id,
              type: 'direct',
              is_staff_directory: true,
              staff_user_id: newUserId,
              name: displayName,
              created_by: newUserId,
              status: 'open',
              last_message_preview: welcomeMsg.slice(0, 100),
              last_message_at: new Date().toISOString(),
            })
            .select('id')
            .single();
          if (newConv) {
            await supabase.from('conversation_participants').insert({
              conversation_id: newConv.id,
              user_id: newUserId,
              unread_count: 0,
              joined_at: new Date().toISOString(),
            });
            await supabase.from('messages').insert({
              tenant_id,
              conversation_id: newConv.id,
              sender_id: newUserId,
              body: welcomeMsg,
              status: 'sent',
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, already_registered: alreadyRegistered }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
