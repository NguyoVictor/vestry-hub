import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json();
    // Pesapal IPN payload: { OrderTrackingId, OrderMerchantReference, OrderNotificationType, OrderStatus }
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = body;

    if (!OrderTrackingId) {
      return new Response('Missing OrderTrackingId', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Map Pesapal status to our payment_status
    const statusMap: Record<string, string> = {
      COMPLETED: 'confirmed',
      FAILED: 'failed',
      INVALID: 'failed',
      REVERSED: 'voided',
    };
    const paymentStatus = statusMap[OrderNotificationType] ?? 'pending';

    // Update giving record by pesapal_transaction_id
    const { error } = await supabase
      .from('giving_records')
      .update({ payment_status: paymentStatus })
      .eq('pesapal_transaction_id', OrderTrackingId);

    if (error) throw error;

    // Pesapal expects a specific IPN acknowledgement response
    return new Response(
      JSON.stringify({ orderNotificationType: OrderNotificationType, orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: '200' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('pesapal-webhook error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
