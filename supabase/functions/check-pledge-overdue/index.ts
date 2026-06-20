import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Cron: runs daily — flags pledges overdue by more than 7 days
Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

    // Find pledges that are pending/partial and whose campaign end_date is past cutoff
    const { data: overduePledges, error } = await supabase
      .from('pledges')
      .select('id, campaign_id, pledge_campaigns!inner(end_date)')
      .in('status', ['pending', 'partial'])
      .not('campaign_id', 'is', null);

    if (error) throw error;

    const toFlag = (overduePledges ?? []).filter((p: Record<string, unknown>) => {
      const campaign = p.pledge_campaigns as { end_date: string | null } | null;
      return campaign?.end_date && campaign.end_date < cutoff;
    });

    if (toFlag.length > 0) {
      const ids = toFlag.map((p: Record<string, unknown>) => p.id as string);
      const { error: updateErr } = await supabase
        .from('pledges')
        .update({ status: 'overdue' })
        .in('id', ids);
      if (updateErr) throw updateErr;
    }

    console.log(`check-pledge-overdue: flagged ${toFlag.length} pledges as overdue`);
    return new Response(JSON.stringify({ ok: true, flagged: toFlag.length }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('check-pledge-overdue error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
