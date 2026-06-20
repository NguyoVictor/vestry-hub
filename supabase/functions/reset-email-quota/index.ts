import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Cron: runs on the 1st of each month — resets monthly_sent counters for non-free plans
Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get all tenants that are NOT on the free plan (free uses lifetime_sent, not monthly)
    const { data: tenants, error: tenantErr } = await supabase
      .from('tenants')
      .select('id, subscription_plan')
      .neq('subscription_plan', 'free');
    if (tenantErr) throw tenantErr;

    if (!tenants?.length) {
      return new Response(JSON.stringify({ ok: true, reset: 0 }), { headers: { 'Content-Type': 'application/json' } });
    }

    const tenantIds = tenants.map((t: { id: string }) => t.id);

    // Calculate next reset date (1st of next month)
    const now = new Date();
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    // Reset monthly_sent to 0 for all qualifying tenants
    const { error: resetErr } = await supabase
      .from('email_quotas')
      .update({
        monthly_sent: 0,
        quota_reset_at: nextReset,
        updated_at: now.toISOString(),
      })
      .in('tenant_id', tenantIds);
    if (resetErr) throw resetErr;

    console.log(`reset-email-quota: reset ${tenantIds.length} tenant quotas`);
    return new Response(
      JSON.stringify({ ok: true, reset: tenantIds.length, next_reset: nextReset }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('reset-email-quota error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
