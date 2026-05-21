import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const PAYHERO_BASIC_AUTH = Deno.env.get('PAYHERO_BASIC_AUTH')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('=== PayHero STK Push Processing ===')

    if (!PAYHERO_BASIC_AUTH) {
      console.error('PayHero credentials missing')
      throw new Error('PayHero credentials not configured')
    }

    const requestBody = await req.json()
    console.log('STK Push request received:', requestBody)

    const { 
      amount, 
      phone_number, 
      tenant_id, 
      donor_name, 
      giving_type, 
      notes,
      fund_id,
      campaign_id 
    } = requestBody

    if (!amount || !phone_number || !tenant_id) {
      console.error('Missing required fields:', { amount, phone_number, tenant_id })
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['amount', 'phone_number', 'tenant_id']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get tenant's PayHero channel information
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('payhero_channel_id, payhero_connected, name, payhero_channel_type')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      console.error('Failed to fetch tenant:', tenantError)
      return new Response(
        JSON.stringify({ 
          error: 'Church not found',
          details: tenantError?.message || 'Invalid tenant ID'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tenant.payhero_connected || !tenant.payhero_channel_id) {
      console.error('❌ CRITICAL: PayHero not configured for church:', {
        church_name: tenant.name,
        payhero_connected: tenant.payhero_connected,
        payhero_channel_id: tenant.payhero_channel_id,
        tenant_id: tenant_id
      })
      
      // Check if it's manual setup in progress
      const { data: manualSetupData } = await supabase
        .from('tenants')
        .select('payhero_manual_setup, payhero_setup_details')
        .eq('id', tenant_id)
        .single()
      
      if (manualSetupData?.payhero_manual_setup) {
        return new Response(
          JSON.stringify({ 
            error: 'Payment setup in progress',
            details: 'PayHero integration is being configured. Please contact church admin or try again later.',
            setup_status: 'manual_setup_pending'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Payments not configured',
          details: 'Church admin needs to set up M-Pesa payments in Settings → Payments before members can donate.',
          setup_status: 'not_configured',
          instructions: 'Please contact your church admin to complete payment setup.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ PayHero channel verified for STK push:', {
      church_name: tenant.name,
      channel_id: tenant.payhero_channel_id,
      channel_type: tenant.payhero_channel_type || 'unknown',
      connected: tenant.payhero_connected
    })

    // Generate unique external reference for tracking
    const externalReference = `vestry_${tenant_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create giving record first (pending status)
    const givingRecord = {
      tenant_id,
      amount: parseFloat(amount),
      donor_name: donor_name || 'Anonymous',
      giving_type: giving_type || 'offering',
      payment_method: 'mpesa',
      payment_status: 'pending', // Use payment_status instead of status
      external_reference: externalReference,
      notes: notes || null,
      fund_id: fund_id || null,
      campaign_id: campaign_id || null,
      given_at: new Date().toISOString(),
      currency: 'KES'
    }

    console.log('Creating giving record:', givingRecord)

    const { data: createdRecord, error: recordError } = await supabase
      .from('giving_records')
      .insert(givingRecord)
      .select()
      .single()

    if (recordError) {
      console.error('Failed to create giving record:', recordError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create donation record',
          details: recordError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Giving record created:', createdRecord)

    // Prepare PayHero STK Push request with DYNAMIC channel_id from database
    const stkData = {
      amount: parseFloat(amount),
      phone_number: phone_number.startsWith('254') ? phone_number : `254${phone_number.substring(1)}`,
      channel_id: parseInt(tenant.payhero_channel_id), // Use DYNAMIC channel_id from database
      provider: 'mpesa',
      external_reference: externalReference,
      callback_url: `${SUPABASE_URL}/functions/v1/payment-webhook`,
      description: `Donation to ${tenant.name}`,
      customer_name: donor_name || 'Anonymous Donor'
    }

    console.log('🚀 STK Push with DYNAMIC channel_id:', {
      channel_id: tenant.payhero_channel_id,
      channel_type: tenant.payhero_channel_type || 'unknown',
      amount: stkData.amount,
      phone: stkData.phone_number,
      church: tenant.name
    })

    console.log('PayHero STK Push payload:', stkData)

    // Send STK Push to PayHero
    const payHeroResponse = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': PAYHERO_BASIC_AUTH,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkData)
    })

    console.log('PayHero STK response status:', payHeroResponse.status)

    const payHeroData = await payHeroResponse.json()
    console.log('PayHero STK response data:', payHeroData)

    if (!payHeroResponse.ok) {
      console.error('PayHero STK Push failed:', {
        status: payHeroResponse.status,
        data: payHeroData
      })

      // Update giving record to failed
      await supabase
        .from('giving_records')
        .update({ 
          payment_status: 'failed',
          notes: `PayHero error: ${payHeroData.message || payHeroData.error || 'Unknown error'}`
        })
        .eq('id', createdRecord.id)

      let errorMessage = 'Payment request failed'
      if (payHeroData.message) {
        if (payHeroData.message.includes('channel')) {
          errorMessage = 'Payment channel configuration error. Please contact church admin.'
        } else if (payHeroData.message.includes('phone')) {
          errorMessage = 'Invalid phone number. Please check and try again.'
        } else if (payHeroData.message.includes('amount')) {
          errorMessage = 'Invalid amount. Please check and try again.'
        } else {
          errorMessage = payHeroData.message
        }
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: payHeroData.message || payHeroData.error || 'Unknown error',
          payhero_status: payHeroResponse.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('STK Push initiated successfully')

    // Update giving record with PayHero transaction details
    const updateData = {
      payhero_transaction_id: payHeroData.transaction_id || payHeroData.id,
      payment_status: 'processing'
    }

    await supabase
      .from('giving_records')
      .update(updateData)
      .eq('id', createdRecord.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push sent successfully',
        transaction_id: payHeroData.transaction_id || payHeroData.id,
        external_reference: externalReference,
        giving_record_id: createdRecord.id,
        instructions: 'Please check your phone for M-Pesa prompt and enter your PIN to complete the donation.'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in process-stk-push:', error)
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