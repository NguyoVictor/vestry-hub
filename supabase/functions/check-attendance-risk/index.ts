import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Cron: runs weekly — flags members absent from 3+ consecutive services of the same type
Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get all tenants
    const { data: tenants, error: tenantErr } = await supabase.from('tenants').select('id');
    if (tenantErr) throw tenantErr;

    let totalFlagged = 0;

    for (const tenant of tenants ?? []) {
      const tenantId = tenant.id as string;

      // Get last 3 sessions per service type for this tenant
      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select('id, service_id, services!inner(service_type)')
        .eq('tenant_id', tenantId)
        .order('session_date', { ascending: false })
        .limit(30);

      if (!sessions?.length) continue;

      // Group sessions by service_type, take last 3
      const byType: Record<string, string[]> = {};
      for (const s of sessions) {
        const svc = s.services as { service_type: string } | null;
        const type = svc?.service_type ?? 'unknown';
        if (!byType[type]) byType[type] = [];
        if (byType[type].length < 3) byType[type].push(s.id as string);
      }

      // Get all active members for this tenant
      const { data: members } = await supabase
        .from('users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      if (!members?.length) continue;

      for (const member of members) {
        const memberId = member.id as string;

        for (const [_type, sessionIds] of Object.entries(byType)) {
          if (sessionIds.length < 3) continue;

          // Check if member was present in any of the last 3 sessions
          const { count } = await supabase
            .from('attendance_records')
            .select('id', { count: 'exact', head: true })
            .eq('member_id', memberId)
            .in('session_id', sessionIds)
            .eq('status', 'present');

          if ((count ?? 0) === 0) {
            // Member absent from all 3 — create at-risk notification
            await supabase.from('notifications').insert({
              id: crypto.randomUUID(),
              tenant_id: tenantId,
              user_id: memberId,
              title: 'At-Risk Member',
              body: 'This member has been absent from the last 3 consecutive services.',
              type: 'attendance_risk',
              is_read: false,
              created_at: new Date().toISOString(),
            }).onConflict('id').ignore();
            totalFlagged++;
          }
        }
      }
    }

    console.log(`check-attendance-risk: flagged ${totalFlagged} at-risk members`);
    return new Response(JSON.stringify({ ok: true, flagged: totalFlagged }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('check-attendance-risk error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
