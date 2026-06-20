import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to get caller identity
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get caller's profile
    const { data: caller } = await adminClient
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!caller || !["super_admin", "church_admin", "staff_leader"].includes(caller.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, targetUserId, role, status } = body;

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "targetUserId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify target user is in the same tenant
    const { data: targetUser } = await adminClient
      .from("users")
      .select("tenant_id, role")
      .eq("id", targetUserId)
      .single();

    if (!targetUser || targetUser.tenant_id !== caller.tenant_id) {
      return new Response(JSON.stringify({ error: "Target user not found in your church" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-modification
    if (targetUserId === user.id) {
      return new Response(JSON.stringify({ error: "Cannot modify your own role/status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const validRoles = [
        "super_admin", "church_admin", "general_overseer", "senior_pastor",
        "pastor", "assistant_pastor", "accountant", "leader", "studio_operator",
        "staff_leader", "member", "staff", "volunteer", "guest"
      ];

      if (!role) {
        return new Response(JSON.stringify({ error: "Role is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!validRoles.includes(role)) {
        // Check if it's a valid custom role for this tenant
        const { data: customRole } = await adminClient
          .from("custom_roles")
          .select("id")
          .eq("tenant_id", caller.tenant_id)
          .eq("name", role)
          .eq("is_active", true)
          .maybeSingle();

        if (!customRole) {
          return new Response(JSON.stringify({ error: "Invalid role" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Protect last super_admin
      if (targetUser.role === "super_admin") {
        const { count } = await adminClient
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", caller.tenant_id)
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
        .update({ role: role, status: status ?? "active" })
        .eq("id", targetUserId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "deactivate") {
      // Protect last super_admin from deactivation
      if (targetUser.role === "super_admin") {
        const { count } = await adminClient
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", caller.tenant_id)
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
        .update({ status: "active", role, invitation_sent: true })
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
