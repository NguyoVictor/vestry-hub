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
    // Get PayHero credentials from Supabase secrets
    const PAYHERO_BASIC_AUTH = Deno.env.get('PAYHERO_BASIC_AUTH')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!PAYHERO_BASIC_AUTH) {
      throw new Error('PayHero credentials not configured')
    }

    // Parse request body
    const { 
      amount, 
      phone_number, 
      channel_id, 
      external_reference, 
      customer_name, 
      giving_category, 
      tenant_id, 
      type,
      member_id,
      campaign_id,
      commitment_id
    } = await req.json()

    // Validate required fields
    if (!amount || !phone_number || !channel_id || !customer_name || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number (ensure it starts with 254)
    let formattedPhone = phone_number.replace(/^\+/, '').replace(/^0/, '254')
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone
    }

    // Generate external reference if not provided
    const timestamp = Date.now()
    const finalExternalReference = external_reference || `${type?.toUpperCase() || 'GIVE'}-${tenant_id}-${timestamp}`

    // PayHero STK Push API call
    const payHeroResponse = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': PAYHERO_BASIC_AUTH,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: parseFloat(amount),
        phone_number: formattedPhone,
        channel_id: parseInt(channel_id),
        provider: "m-pesa",
        external_reference: finalExternalReference,
        customer_name: customer_name,
        callback_url: `${SUPABASE_URL}/functions/v1/payment-webhook`
      })
    })

    const payHeroData = await payHeroResponse.json()

    if (!payHeroResponse.ok || !payHeroData.success) {
      console.error('PayHero API Error:', payHeroData)
      
      // Handle specific PayHero error cases
      let userFriendlyMessage = 'Payment initiation failed'
      if (payHeroData.error_message) {
        if (payHeroData.error_message.includes('insufficient balance')) {
          userFriendlyMessage = 'Payment service temporarily unavailable. Please try again later or contact support.'
        } else if (payHeroData.error_message.includes('invalid phone')) {
          userFriendlyMessage = 'Invalid phone number. Please check and try again.'
        } else if (payHeroData.error_message.includes('channel')) {
          userFriendlyMessage = 'Payment channel unavailable. Please try again later.'
        } else {
          userFriendlyMessage = payHeroData.error_message
        }
      }
      
      return new Response(
        JSON.stringify({ 
          error: userFriendlyMessage,
          details: payHeroData.error_message || payHeroData.message || 'Unknown error',
          error_code: payHeroData.error_code || 'PAYMENT_FAILED'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key for database operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Create giving record with pending status
    const givingRecord = {
      tenant_id,
      member_id,
      amount: parseFloat(amount),
      giving_type: giving_category || 'tithe',
      payment_method: 'mpesa',
      payment_status: 'pending',
      payhero_reference: payHeroData.reference,
      checkout_request_id: payHeroData.CheckoutRequestID,
      external_reference: finalExternalReference,
      phone_number: formattedPhone,
      donor_name: customer_name,
      campaign_id: campaign_id || null,
      given_at: new Date().toISOString()
    }

    const { data: insertedRecord, error: insertError } = await supabase
      .from('giving_records')
      .insert(givingRecord)
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create giving record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If this is a pledge payment, create pledge_payments record
    if (type === 'pledge' && commitment_id) {
      const { error: pledgePaymentError } = await supabase
        .from('pledge_payments')
        .insert({
          commitment_id,
          giving_record_id: insertedRecord.id,
          amount: parseFloat(amount),
          payment_status: 'pending'
        })

      if (pledgePaymentError) {
        console.error('Pledge payment insert error:', pledgePaymentError)
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        reference: payHeroData.reference,
        checkout_request_id: payHeroData.CheckoutRequestID,
        giving_record_id: insertedRecord.id,
        external_reference: finalExternalReference,
        message: 'STK Push sent successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in initiate-payment:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})