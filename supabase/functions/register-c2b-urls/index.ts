import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { tenant_id } = await req.json()

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing tenant_id' }),
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
      .select('daraja_consumer_key, daraja_consumer_secret, payhero_channel_number, name, c2b_registered')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Church not found', details: tenantError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (tenant.c2b_registered) {
      return new Response(
        JSON.stringify({ error: 'C2B URLs already registered for this church' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tenant.daraja_consumer_key || !tenant.daraja_consumer_secret || !tenant.payhero_channel_number) {
      return new Response(
        JSON.stringify({ error: 'Missing Daraja credentials or channel number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== C2B URL Registration ===')
    console.log('Church:', tenant.name, '| ShortCode:', tenant.payhero_channel_number)

    // Dynamic Daraja base URL
    const DARAJA_BASE_URL = Deno.env.get('DARAJA_ENV') === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'

    // Generate OAuth access token
    const auth = btoa(`${tenant.daraja_consumer_key}:${tenant.daraja_consumer_secret}`)
    const tokenResponse = await fetch(`${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { 'Authorization': `Basic ${auth}` }
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Daraja access token')
    }

    const { access_token } = await tokenResponse.json()

    // Register C2B URLs with Safaricom
    const c2bPayload = {
      ShortCode: tenant.payhero_channel_number,
      ResponseType: "Completed",
      ConfirmationURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/c2b-webhook`,
      ValidationURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/c2b-webhook`
    }

    console.log('C2B Registration payload:', c2bPayload)

    const c2bResponse = await fetch(`${DARAJA_BASE_URL}/mpesa/c2b/v1/registerurl`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(c2bPayload)
    })

    const c2bData = await c2bResponse.json()
    console.log('C2B Registration response:', c2bData)

    if (!c2bResponse.ok || c2bData.errorCode) {
      return new Response(
        JSON.stringify({ 
          error: 'C2B URL registration failed',
          details: c2bData.errorMessage || c2bData.ResponseDescription || 'Unknown error'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update tenant to mark C2B as registered
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ c2b_registered: true })
      .eq('id', tenant_id)

    if (updateError) {
      console.error('Failed to update tenant c2b_registered status:', updateError)
      throw new Error('Failed to update registration status')
    }

    console.log('C2B URLs registered successfully for tenant:', tenant_id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'C2B URLs registered successfully',
        confirmation_url: c2bPayload.ConfirmationURL,
        validation_url: c2bPayload.ValidationURL,
        short_code: tenant.payhero_channel_number
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in register-c2b-urls:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})