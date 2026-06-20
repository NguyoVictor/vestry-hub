import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json();
    // Intasend webhook payload: { invoice: { invoice_id, state, ... }, ... }
    const invoice = body?.invoice ?? body;
    const { invoice_id, state, api_ref } = invoice;

    if (!invoice_id && !api_ref) {
      return new Response('Missing invoice_id', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Map Intasend state to our payment_status
    const statusMap: Record<string, string> = {
      COMPLETE: 'confirmed',
      FAILED: 'failed',
      CANCELLED: 'failed',
      PENDING: 'pending',
    };
    const paymentStatus = statusMap[state?.toUpperCase()] ?? 'pending';

    // Update by pesapal_transaction_id (we store intasend payment_id there too)
    const ref = invoice_id ?? api_ref;
    const { error } = await supabase
      .from('giving_records')
      .update({ payment_status: paymentStatus })
      .eq('pesapal_transaction_id', ref);

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('intasend-webhook error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
