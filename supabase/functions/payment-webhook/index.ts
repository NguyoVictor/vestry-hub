import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function sha256Json(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })

  const webhookSecret = Deno.env.get('CHURCH_DARAJA_WEBHOOK_SECRET') || ''
  const callbackToken = new URL(req.url).searchParams.get('token') || ''
  if (!webhookSecret || callbackToken !== webhookSecret) return new Response('unauthorized', { status: 401 })

  try {
    const body = await req.json()
    const stkCallback = body?.Body?.stkCallback
    if (!stkCallback?.CheckoutRequestID || typeof stkCallback.ResultCode !== 'number') {
      return new Response('OK', { status: 200 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const items: Array<{ Name?: string; Value?: unknown }> = stkCallback.CallbackMetadata?.Item || []
    const receipt = items.find((item) => item.Name === 'MpesaReceiptNumber')?.Value
    const payloadHash = await sha256Json(body)

    const { data: applied, error: applyError } = await supabase.rpc('apply_mpesa_stk_callback', {
      p_checkout_request_id: stkCallback.CheckoutRequestID,
      p_result_code: stkCallback.ResultCode,
      p_result_desc: stkCallback.ResultDesc || null,
      p_mpesa_receipt: receipt ? String(receipt) : null,
      p_payload_hash: payloadHash,
    })

    if (applyError) {
      console.error('apply_mpesa_stk_callback failed:', applyError.message)
      return new Response('OK', { status: 200 })
    }

    // Realtime broadcast is only a non-authoritative UX signal. The RPC above owns payment state.
    if (applied?.giving_record_id) {
      const { data: record } = await supabase
        .from('giving_records')
        .select('tenant_id, member_id, id, amount, payment_status, mpesa_receipt')
        .eq('id', applied.giving_record_id)
        .single()

      if (record) {
        try {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/realtime/v1/api/broadcast`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
            },
            body: JSON.stringify({
              messages: [{
                topic: `realtime:payment_updates_${record.tenant_id}`,
                event: 'payment_update',
                private: false,
                payload: {
                  status: record.payment_status,
                  CheckoutRequestID: stkCallback.CheckoutRequestID,
                  member_id: record.member_id,
                  amount: record.amount,
                  mpesa_receipt: record.mpesa_receipt,
                },
              }],
            }),
          })
        } catch (broadcastError) {
          console.error('Broadcast error (non-fatal):', broadcastError instanceof Error ? broadcastError.message : broadcastError)
        }
      }
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error instanceof Error ? error.message : error)
    return new Response('OK', { status: 200 })
  }
})
