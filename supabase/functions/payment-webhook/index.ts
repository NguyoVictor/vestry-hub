import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Parse PayHero webhook payload
    const payload = await req.json()
    console.log('PayHero webhook received:', payload)

    const {
      status,
      reference,
      CheckoutRequestID,
      ExternalReference,
      amount,
      phone_number,
      ResultCode,
      ResultDesc,
      MpesaReceiptNumber
    } = payload

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Find the giving record by checkout_request_id or external_reference
    let { data: givingRecord, error: findError } = await supabase
      .from('giving_records')
      .select('*')
      .or(`checkout_request_id.eq.${CheckoutRequestID},external_reference.eq.${ExternalReference}`)
      .single()

    if (findError || !givingRecord) {
      console.error('Giving record not found:', findError)
      // Still return 200 to PayHero to prevent retries
      return new Response('OK', { status: 200 })
    }

    // Determine payment status based on ResultCode
    const isSuccess = ResultCode === 0 || ResultCode === '0'
    const paymentStatus = isSuccess ? 'confirmed' : 'failed'

    // Update giving record
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    }

    if (isSuccess && MpesaReceiptNumber) {
      updateData.mpesa_receipt = MpesaReceiptNumber
    }

    const { error: updateError } = await supabase
      .from('giving_records')
      .update(updateData)
      .eq('id', givingRecord.id)

    if (updateError) {
      console.error('Failed to update giving record:', updateError)
    }

    // If this is a successful pledge payment, update pledge commitment
    if (isSuccess && givingRecord.campaign_id) {
      // Find the pledge payment record
      const { data: pledgePayment } = await supabase
        .from('pledge_payments')
        .select('commitment_id')
        .eq('giving_record_id', givingRecord.id)
        .single()

      if (pledgePayment) {
        // Update pledge payment status
        await supabase
          .from('pledge_payments')
          .update({
            payment_status: 'confirmed',
            paid_at: new Date().toISOString()
          })
          .eq('giving_record_id', givingRecord.id)

        // Update pledge commitment paid amount
        const { data: commitment } = await supabase
          .from('pledge_commitments')
          .select('paid_amount, pledged_amount')
          .eq('id', pledgePayment.commitment_id)
          .single()

        if (commitment) {
          const newPaidAmount = (commitment.paid_amount || 0) + parseFloat(amount)
          const newStatus = newPaidAmount >= commitment.pledged_amount ? 'fulfilled' : 'active'

          await supabase
            .from('pledge_commitments')
            .update({
              paid_amount: newPaidAmount,
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', pledgePayment.commitment_id)
        }
      }
    }

    // Broadcast real-time update for frontend polling resolution
    const channelName = `payment_updates_${givingRecord.tenant_id}`
    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'payment_update',
      payload: {
        giving_record_id: givingRecord.id,
        checkout_request_id: CheckoutRequestID,
        external_reference: ExternalReference,
        status: paymentStatus,
        mpesa_receipt: MpesaReceiptNumber,
        amount: amount,
        timestamp: new Date().toISOString()
      }
    })

    console.log(`Payment ${paymentStatus}:`, {
      reference,
      amount,
      mpesa_receipt: MpesaReceiptNumber,
      result_desc: ResultDesc
    })

    // Always return 200 OK to PayHero to prevent retries
    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Error in payment webhook:', error)
    // Still return 200 to prevent PayHero retries
    return new Response('OK', { status: 200 })
  }
})