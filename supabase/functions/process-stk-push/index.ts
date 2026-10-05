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
    const numericAmount = Number(amount)

    if (!tenant_id || !phone_number || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required fields', required: ['amount', 'phone_number', 'tenant_id'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const [{ data: tenant, error: tenantError }, { data: credentials, error: credentialsError }] = await Promise.all([
      supabase.from('tenants').select('id, name, payhero_connected').eq('id', tenant_id).single(),
      supabase
        .from('tenant_payment_credentials')
        .select('daraja_consumer_key, daraja_consumer_secret, daraja_passkey, daraja_transaction_type, daraja_shortcode')
        .eq('tenant_id', tenant_id)
        .single(),
    ])

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Church not found', details: tenantError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (credentialsError || !credentials?.daraja_consumer_key || !credentials.daraja_consumer_secret || !credentials.daraja_passkey || !credentials.daraja_shortcode) {
      return new Response(
        JSON.stringify({ error: 'Daraja credentials not configured', details: 'Contact church admin to complete M-Pesa setup.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (tenant.payhero_connected === false) {
      return new Response(
        JSON.stringify({ error: 'Payments not configured', details: 'Church admin needs to set up M-Pesa payments in Settings -> Payments.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const webhookSecret = Deno.env.get('CHURCH_DARAJA_WEBHOOK_SECRET')
    if (!webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Church payment callbacks are not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const callbackUrl = new URL(`${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`)
    callbackUrl.searchParams.set('token', webhookSecret)

    const darajaBaseUrl = Deno.env.get('DARAJA_ENV') === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'

    const auth = btoa(`${credentials.daraja_consumer_key}:${credentials.daraja_consumer_secret}`)
    const tokenResponse = await fetch(`${darajaBaseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    })
    if (!tokenResponse.ok) throw new Error('Failed to get Daraja access token')
    const { access_token } = await tokenResponse.json()

    const cleanPhone = String(phone_number).replace(/\D/g, '')
    const formattedPhone = cleanPhone.startsWith('254') ? cleanPhone : `254${cleanPhone.replace(/^0/, '')}`
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14)
    const shortcode = credentials.daraja_shortcode
    const transactionType = credentials.daraja_transaction_type || 'CustomerPayBillOnline'

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: btoa(`${shortcode}${credentials.daraja_passkey}${timestamp}`),
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: Math.round(numericAmount),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl.toString(),
      AccountReference: `Donation-${tenant.name}`,
      TransactionDesc: `Donation to ${tenant.name}`,
    }

    const stkResponse = await fetch(`${darajaBaseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(stkPayload),
    })
    const stkData = await stkResponse.json()

    if (!stkResponse.ok || stkData.errorCode || !stkData.CheckoutRequestID) {
      return new Response(
        JSON.stringify({ error: 'STK Push failed', details: stkData.errorMessage || stkData.ResponseDescription || 'Unknown error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: createdRecord, error: recordError } = await supabase
      .from('giving_records')
      .insert({
        tenant_id,
        member_id: member_id || null,
        amount: numericAmount,
        donor_name: donor_name || 'Anonymous',
        giving_type: giving_type || 'offering',
        payment_method: 'mpesa',
        payment_status: 'pending',
        external_reference: stkData.CheckoutRequestID,
        checkout_request_id: stkData.CheckoutRequestID,
        notes: notes || null,
        given_at: new Date().toISOString().split('T')[0],
        currency: 'KES',
      })
      .select('id')
      .single()

    if (recordError || !createdRecord) throw new Error(`Failed to create record: ${recordError?.message || 'unknown error'}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push sent successfully',
        CheckoutRequestID: stkData.CheckoutRequestID,
        checkout_request_id: stkData.CheckoutRequestID,
        external_reference: stkData.CheckoutRequestID,
        giving_record_id: createdRecord.id,
        instructions: 'Please check your phone for M-Pesa prompt and enter your PIN to complete the donation.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error in process-stk-push:', error instanceof Error ? error.message : error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
