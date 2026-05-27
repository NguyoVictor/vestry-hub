import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { amount, phone_number, tenant_id, member_id, donor_name, giving_type, notes } = await req.json()

    if (!amount || !phone_number || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields', required: ['amount', 'phone_number', 'tenant_id'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch tenant's Daraja credentials
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('daraja_consumer_key, daraja_consumer_secret, daraja_passkey, daraja_transaction_type, payhero_channel_number, payhero_connected, name')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Church not found', details: tenantError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tenant.payhero_connected) {
      return new Response(
        JSON.stringify({ error: 'Payments not configured', details: 'Church admin needs to set up M-Pesa payments in Settings → Payments.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tenant.daraja_consumer_key) {
      return new Response(
        JSON.stringify({ error: 'Daraja credentials not configured', details: 'Contact church admin to complete M-Pesa setup.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== Daraja STK Push Processing ===')
    console.log('Church:', tenant.name, '| Transaction Type:', tenant.daraja_transaction_type)

    // Generate access token
    const auth = btoa(`${tenant.daraja_consumer_key}:${tenant.daraja_consumer_secret}`)
    const tokenResponse = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { 'Authorization': `Basic ${auth}` }
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Daraja access token')
    }

    const { access_token } = await tokenResponse.json()

    // Format phone number
    const cleanPhone = phone_number.replace(/\D/g, '')
    const formattedPhone = cleanPhone.startsWith('254') ? cleanPhone : `254${cleanPhone.substring(1)}`

    // Generate unique transaction reference
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14)
    const externalReference = `VH${tenant_id.substring(0, 4)}${timestamp}`

    // Create giving record data but don't insert yet
    const givingRecord = {
      tenant_id,
      member_id: member_id || null,
      amount: parseFloat(amount),
      donor_name: donor_name || 'Anonymous',
      giving_type: giving_type || 'offering',
      payment_method: 'mpesa',
      payment_status: 'pending',
      external_reference: externalReference,
      notes: notes || null,
      given_at: new Date().toISOString().split('T')[0],
      currency: 'KES'
    }

    // STK Push request
    const stkPayload = {
      BusinessShortCode: tenant.payhero_channel_number,
      Password: btoa(`${tenant.payhero_channel_number}${tenant.daraja_passkey}${timestamp}`),
      Timestamp: timestamp,
      TransactionType: tenant.daraja_transaction_type,
      Amount: Math.round(parseFloat(amount)),
      PartyA: formattedPhone,
      PartyB: tenant.payhero_channel_number,
      PhoneNumber: formattedPhone,
      CallBackURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
      AccountReference: `Donation-${tenant.name}`,
      TransactionDesc: `Donation to ${tenant.name}`
    }

    console.log('STK Push payload:', { ...stkPayload, Password: '[HIDDEN]' })

    const stkResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPayload)
    })

    const stkData = await stkResponse.json()
    console.log('STK Push response:', stkData)

    if (!stkResponse.ok || stkData.errorCode) {
      // STK Push failed - do NOT create giving record
      return new Response(
        JSON.stringify({ 
          error: 'STK Push failed',
          details: stkData.errorMessage || stkData.ResponseDescription || 'Unknown error'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // STK Push successful - NOW create the giving record
    const { data: createdRecord, error: recordError } = await supabase
      .from('giving_records')
      .insert({
        tenant_id,
        member_id: member_id || null,
        amount: parseFloat(amount),
        donor_name: donor_name || 'Anonymous',
        giving_type: giving_type || 'offering',
        payment_method: 'mpesa',
        payment_status: 'pending',
        external_reference: stkData.CheckoutRequestID,
        checkout_request_id: stkData.CheckoutRequestID,
        notes: notes || null,
        given_at: new Date().toISOString().split('T')[0],
        currency: 'KES'
      })
      .select()
      .single()

    if (recordError) {
      console.error('Insert error:', JSON.stringify(recordError))
      throw new Error(`Failed to create record: ${recordError.message}`)
    }

    console.log('Record created:', createdRecord?.id, 'external_reference:', createdRecord?.external_reference)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push sent successfully',
        CheckoutRequestID: stkData.CheckoutRequestID,
        checkout_request_id: stkData.CheckoutRequestID,
        external_reference: stkData.CheckoutRequestID,
        giving_record_id: createdRecord.id,
        instructions: 'Please check your phone for M-Pesa prompt and enter your PIN to complete the donation.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-stk-push:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})