import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log("Starting monthly credits reset...");

    // Get all active subscriptions that need reset (current_period_end has passed)
    const { data: subscriptions, error: fetchError } = await supabase
      .from("tenant_subscriptions")
      .select("*")
      .eq("status", "active")
      .lt("current_period_end", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions to reset`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No subscriptions need reset",
        reset_count: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reset credits and update billing periods for each subscription
    const resetPromises = subscriptions.map(async (subscription) => {
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const { error: updateError } = await supabase
        .from("tenant_subscriptions")
        .update({
          sms_used: 0,
          email_used: 0,
          ai_used: 0,
          current_period_start: currentPeriodStart.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);

      if (updateError) {
        console.error(`Error updating subscription ${subscription.id}:`, updateError);
        return { success: false, tenant_id: subscription.tenant_id, error: updateError.message };
      }

      console.log(`Reset credits for tenant ${subscription.tenant_id}`);
      return { success: true, tenant_id: subscription.tenant_id };
    });

    const results = await Promise.all(resetPromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Credits reset completed: ${successCount} success, ${failureCount} failures`);

    return new Response(JSON.stringify({
      success: true,
      message: `Monthly credits reset completed`,
      reset_count: successCount,
      failure_count: failureCount,
      results: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in reset-monthly-credits:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});