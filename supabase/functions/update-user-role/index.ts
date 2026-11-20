import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { BUILTIN_ROLES, decide } from "./policy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bearer = /^Bearer\s+([^\s]+)$/i.exec(req.headers.get("Authorization")?.trim() ?? "");
    if (!bearer) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Same caller verification as send-invitation (no anon-key dependency).
    const { data: authData, error: authError } = await adminClient.auth.getUser(bearer[1]);
    const user = authData?.user;
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { action, targetUserId, role: requestedRole, status: requestedStatus } = body ?? {};
    if (!targetUserId || typeof targetUserId !== "string") {
      return new Response(JSON.stringify({ error: "targetUserId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: caller } = await adminClient
      .from("users").select("id, tenant_id, role, status").eq("id", user.id).maybeSingle();
    const { data: targetUser } = await adminClient
      .from("users").select("id, tenant_id, role, status").eq("id", targetUserId).maybeSingle();

    let customRoleOk = false;
    if (typeof requestedRole === "string" && requestedRole && caller?.tenant_id
        && !(BUILTIN_ROLES as readonly string[]).includes(requestedRole)) {
      const { data: customRole } = await adminClient
        .from("custom_roles").select("id")
        .eq("tenant_id", caller!.tenant_id).eq("name", requestedRole).eq("is_active", true)
        .maybeSingle();
      customRoleOk = !!customRole;
    }

    // Phase 5: all authorization decisions live in policy.ts (unit-tested).
    const decision = decide(caller, targetUser, { action, role: requestedRole, status: requestedStatus },
      () => customRoleOk);
    if (!decision.ok) {
      return new Response(JSON.stringify({ error: decision.error }), {
        status: decision.code,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const role = decision.role;
    const status = decision.status;

    if (action === "update_role") {
      // Protect last super_admin
      if (targetUser!.role === "super_admin") {
        const { count } = await adminClient
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", caller!.tenant_id)
          .eq("role", "super_admin");
        if ((count ?? 0) <= 1) {
          return new Response(JSON.stringify({ error: "Cannot change role of the last super admin" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { error: updateError } = await adminClient
        .from("users")
        .update({ role, status: status ?? "active" })
        .eq("id", targetUserId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "deactivate") {
      // Protect last super_admin from deactivation
      if (targetUser!.role === "super_admin") {
        const { count } = await adminClient
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", caller!.tenant_id)
          .eq("role", "super_admin")
          .neq("status", "inactive");
        if ((count ?? 0) <= 1) {
          return new Response(JSON.stringify({ error: "Cannot deactivate the last super admin" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { error: updateError } = await adminClient
        .from("users")
        .update({ status: "inactive" })
        .eq("id", targetUserId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reactivate") {
      const { error: updateError } = await adminClient
        .from("users")
        .update(role ? { status: "active", role, invitation_sent: true } : { status: "active", invitation_sent: true })
        .eq("id", targetUserId);

      if (updateError) throw updateError;

      const { data: reactivatedUser } = await adminClient
        .from("users")
        .select("tenant_id, first_name, last_name")
        .eq("id", targetUserId)
        .single();

      if (reactivatedUser) {
        const { data: existingThread } = await adminClient
          .from("conversations")
          .select("id")
          .eq("staff_user_id", targetUserId)
          .eq("is_staff_directory", true)
          .eq("tenant_id", reactivatedUser.tenant_id)
          .maybeSingle();

        if (!existingThread) {
          const displayName = (reactivatedUser.first_name || "").trim()
            || `${reactivatedUser.first_name || ""} ${reactivatedUser.last_name || ""}`.trim()
            || "Team member";
          const welcomeMsg = `Hi! I'm ${displayName}. Feel free to reach out with any questions, prayer requests, or concerns. 🙏`;
          const { data: newConv } = await adminClient
            .from("conversations")
            .insert({
              tenant_id: reactivatedUser.tenant_id,
              type: "direct",
              is_staff_directory: true,
              staff_user_id: targetUserId,
              name: displayName,
              created_by: targetUserId,
              status: "open",
              last_message_preview: welcomeMsg.slice(0, 100),
              last_message_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (newConv) {
            await adminClient.from("conversation_participants").insert({
              conversation_id: newConv.id,
              user_id: targetUserId,
              unread_count: 0,
              joined_at: new Date().toISOString(),
            });
            await adminClient.from("messages").insert({
              tenant_id: reactivatedUser.tenant_id,
              conversation_id: newConv.id,
              sender_id: targetUserId,
              body: welcomeMsg,
              status: "sent",
            });
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'update_role', 'deactivate', or 'reactivate'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
