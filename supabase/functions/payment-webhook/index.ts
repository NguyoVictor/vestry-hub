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
    console.log('PayHero webhook received:', JSON.stringify(payload, null, 2))

    // PayHero webhook can have different formats, handle both
    const {
      status,
      reference,
      CheckoutRequestID,
      ExternalReference,
      external_reference,
      amount,
      phone_number,
      ResultCode,
      ResultDesc,
      MpesaReceiptNumber,
      transaction_id,
      payment_status,
      mpesa_receipt_number
    } = payload

    // Use the correct external reference field
    const externalRef = ExternalReference || external_reference || reference

    console.log('Processing webhook for external reference:', externalRef)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Find the giving record by external_reference (primary) or checkout_request_id (fallback)
    let { data: givingRecord, error: findError } = await supabase
      .from('giving_records')
      .select('*')
      .eq('external_reference', externalRef)
      .single()

    // If not found by external_reference, try checkout_request_id
    if (findError && CheckoutRequestID) {
      console.log('Trying to find by checkout_request_id:', CheckoutRequestID)
      const { data: altRecord, error: altError } = await supabase
        .from('giving_records')
        .select('*')
        .eq('checkout_request_id', CheckoutRequestID)
        .single()
      
      if (!altError && altRecord) {
        givingRecord = altRecord
        findError = null
      }
    }

    if (findError || !givingRecord) {
      console.error('Giving record not found for external reference:', externalRef, 'Error:', findError)
      // Still return 200 to PayHero to prevent retries
      return new Response('OK', { status: 200 })
    }

    console.log('Found giving record:', givingRecord.id)

    // Determine payment status based on PayHero response
    let finalStatus = 'failed'
    
    if (payment_status) {
      // New PayHero format
      finalStatus = payment_status === 'success' || payment_status === 'completed' ? 'confirmed' : 'failed'
    } else if (ResultCode !== undefined) {
      // Legacy M-Pesa format
      finalStatus = ResultCode === 0 || ResultCode === '0' ? 'confirmed' : 'failed'
    } else if (status) {
      // Generic status field
      finalStatus = status === 'success' || status === 'completed' || status === 'confirmed' ? 'confirmed' : 'failed'
    }

    console.log('Payment status determined:', finalStatus)

    // Update giving record
    const updateData: any = {
      status: finalStatus,
      updated_at: new Date().toISOString()
    }

    // Add receipt number if available
    const receiptNumber = MpesaReceiptNumber || mpesa_receipt_number
    if (finalStatus === 'confirmed' && receiptNumber) {
      updateData.mpesa_receipt = receiptNumber
    }

    // Add PayHero transaction ID if available
    if (transaction_id) {
      updateData.payhero_transaction_id = transaction_id
    }

    // Add result description for failed payments
    if (finalStatus === 'failed' && ResultDesc) {
      updateData.notes = `Payment failed: ${ResultDesc}`
    }

    console.log('Updating giving record with:', updateData)

    const { error: updateError } = await supabase
      .from('giving_records')
      .update(updateData)
      .eq('id', givingRecord.id)

    if (updateError) {
      console.error('Failed to update giving record:', updateError)
    } else {
      console.log('Successfully updated giving record')
    }

    // If this is a successful pledge payment, update pledge commitment
    if (finalStatus === 'confirmed' && givingRecord.campaign_id) {
      console.log('Processing pledge payment for campaign:', givingRecord.campaign_id)
      
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
          const newPaidAmount = (commitment.paid_amount || 0) + parseFloat(givingRecord.amount)
          const newStatus = newPaidAmount >= commitment.pledged_amount ? 'fulfilled' : 'active'

          await supabase
            .from('pledge_commitments')
            .update({
              paid_amount: newPaidAmount,
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', pledgePayment.commitment_id)

          console.log('Updated pledge commitment:', pledgePayment.commitment_id)
        }
      }
    }

    // Broadcast real-time update for frontend polling resolution
    const channelName = `payment_updates_${givingRecord.tenant_id}`
    try {
      await supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'payment_update',
        payload: {
          giving_record_id: givingRecord.id,
          external_reference: externalRef,
          status: finalStatus,
          mpesa_receipt: receiptNumber,
          amount: givingRecord.amount,
          timestamp: new Date().toISOString()
        }
      })
      console.log('Broadcasted real-time update')
    } catch (broadcastError) {
      console.error('Failed to broadcast update:', broadcastError)
    }

    console.log(`Payment ${finalStatus} processed successfully:`, {
      external_reference: externalRef,
      amount: givingRecord.amount,
      mpesa_receipt: receiptNumber,
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