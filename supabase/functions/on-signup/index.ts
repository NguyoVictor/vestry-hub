import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const { type, record } = payload;

    // Only handle new user signups
    if (type !== 'INSERT' || !record?.id) {
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const userId = record.id as string;
    const email = record.email as string;
    const fullName = (record.raw_user_meta_data?.full_name as string) ?? '';
    const [firstName, ...rest] = fullName.split(' ');
    const lastName = rest.join(' ') || 'User';

    // Check if user row already exists
    const { data: existing } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, message: 'User already exists' }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Generate church code
    const churchCode = Math.random().toString(36).substring(2, 6).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    const tenantId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create tenant
    const { error: tenantErr } = await supabase.from('tenants').insert({
      id: tenantId,
      church_code: churchCode,
      name: `${firstName || 'My'}'s Church`,
      slug: churchCode.toLowerCase(),
      subscription_plan: 'free',
      subscription_status: 'trial',
      subscription_tier: 'free',
      onboarding_completed: false,
      onboarding_step: 0,
      created_at: now,
      updated_at: now,
    });
    if (tenantErr) throw tenantErr;

    // Create user profile — role must be a valid user_role_enum value
    const { error: userErr } = await supabase.from('users').insert({
      id: userId,
      tenant_id: tenantId,
      first_name: firstName || 'Admin',
      last_name: lastName,
      email,
      role: 'super_admin',
      status: 'active',
      join_date: now.slice(0, 10),
      created_at: now,
      updated_at: now,
    });
    if (userErr) throw userErr;

    return new Response(JSON.stringify({ ok: true, tenant_id: tenantId }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('on-signup error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
