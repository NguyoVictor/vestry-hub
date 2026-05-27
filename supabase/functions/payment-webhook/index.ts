import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const body = await req.json()
    console.log('Webhook received:', JSON.stringify(body))

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const stkCallback = body?.Body?.stkCallback
    if (!stkCallback) {
      console.log('Not a Daraja STK callback, ignoring')
      return new Response('OK', { status: 200 })
    }

    const CheckoutRequestID = stkCallback.CheckoutRequestID
    const ResultCode = stkCallback.ResultCode
    const ResultDesc = stkCallback.ResultDesc

    console.log(`CheckoutRequestID: ${CheckoutRequestID}, ResultCode: ${ResultCode}, ResultDesc: ${ResultDesc}`)

    // Fetch record first — always UPDATE, never DELETE
    const { data: record } = await supabase
      .from('giving_records')
      .select('tenant_id, member_id, id, amount')
      .eq('external_reference', CheckoutRequestID)
      .single()

    if (!record) {
      console.error('No giving_records row found for CheckoutRequestID:', CheckoutRequestID)
      return new Response('OK', { status: 200 })
    }

    // ResultCode mapping:
    //   0    → confirmed  (payment successful)
    //   1032 → cancelled  (user cancelled the STK prompt)
    //   1037 → cancelled  (Safaricom timeout — same as cancelled from member's perspective)
    //   else → failed
    let payment_status: 'confirmed' | 'cancelled' | 'failed'
    let mpesa_receipt: string | null = null
    let void_reason: string | null = null

    if (ResultCode === 0) {
      payment_status = 'confirmed'
      const items: any[] = stkCallback.CallbackMetadata?.Item || []
      const receiptItem = items.find((i: any) => i.Name === 'MpesaReceiptNumber')
      mpesa_receipt = receiptItem?.Value || null
    } else if (ResultCode === 1032) {
      payment_status = 'cancelled'
      void_reason = 'user_cancelled'
    } else if (ResultCode === 1037) {
      payment_status = 'cancelled'
      void_reason = 'safaricom_timeout'
    } else {
      payment_status = 'failed'
      void_reason = ResultDesc || 'unknown_error'
    }

    // Always UPDATE — never delete so postgres_changes fires and history is preserved
    const updatePayload: Record<string, any> = { payment_status }
    if (mpesa_receipt) updatePayload.mpesa_receipt = mpesa_receipt
    if (void_reason) updatePayload.void_reason = void_reason

    const { error: updateError } = await supabase
      .from('giving_records')
      .update(updatePayload)
      .eq('external_reference', CheckoutRequestID)

    if (updateError) {
      console.error('Error updating giving record:', updateError)
    } else {
      console.log('Updated giving_records:', { payment_status, void_reason, mpesa_receipt })
    }

    // Secondary fast-path broadcast (postgres_changes is the reliable primary path)
    try {
      const broadcastRes = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/realtime/v1/api/broadcast`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
          },
          body: JSON.stringify({
            messages: [{
              topic: `realtime:payment_updates_${record.tenant_id}`,
              event: 'payment_update',
              private: false,
              payload: {
                status: payment_status,
                CheckoutRequestID,
                member_id: record.member_id,
                amount: record.amount,
                mpesa_receipt,
              },
            }]
          })
        }
      )
      console.log('Broadcast result:', broadcastRes.status, await broadcastRes.text())
    } catch (broadcastErr) {
      console.error('Broadcast error (non-fatal):', broadcastErr)
    }

    // Pledge payment logic — only for confirmed donations
    if (payment_status === 'confirmed') {
      const { data: givingRecord } = await supabase
        .from('giving_records')
        .select('id, campaign_id, amount')
        .eq('external_reference', CheckoutRequestID)
        .single()

      if (givingRecord?.campaign_id) {
        const { data: pledgePayment } = await supabase
          .from('pledge_payments')
          .select('commitment_id')
          .eq('giving_record_id', givingRecord.id)
          .single()

        if (pledgePayment) {
          await supabase
            .from('pledge_payments')
            .update({ payment_status: 'confirmed', paid_at: new Date().toISOString() })
            .eq('giving_record_id', givingRecord.id)

          const { data: commitment } = await supabase
            .from('pledge_commitments')
            .select('paid_amount, pledged_amount')
            .eq('id', pledgePayment.commitment_id)
            .single()

          if (commitment) {
            const newPaidAmount = (commitment.paid_amount || 0) + parseFloat(givingRecord.amount)
            const newStatus = newPaidAmount >= commitment.pledged_amount ? 'fulfilled' : 'active'
            await supabase
              .from('pledge_commitments')
              .update({ paid_amount: newPaidAmount, status: newStatus })
              .eq('id', pledgePayment.commitment_id)
          }
        }
      }
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('OK', { status: 200 })
  }
})
