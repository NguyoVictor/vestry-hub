import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { consumer_key, consumer_secret, passkey, short_code, transaction_type, tenant_id } = await req.json()

    if (!consumer_key || !consumer_secret || !passkey || !short_code || !transaction_type || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate credentials by getting an OAuth token from Safaricom
    // NOTE: Switch to https://api.safaricom.co.ke for production
    const safaricomBase = 'https://sandbox.safaricom.co.ke'
    const auth = btoa(`${consumer_key}:${consumer_secret}`)

    const tokenResponse = await fetch(`${safaricomBase}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${auth}` }
    })

    const tokenData = await tokenResponse.json()
    console.log('Safaricom token response:', JSON.stringify(tokenData))

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(`Invalid Daraja credentials: ${JSON.stringify(tokenData)}`)
    }

    // Credentials are valid — save to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error } = await supabase
      .from('tenants')
      .update({
        daraja_consumer_key: consumer_key,
        daraja_consumer_secret: consumer_secret,
        daraja_passkey: passkey,
        daraja_transaction_type: transaction_type,
        payhero_channel_number: short_code,
        payhero_channel_type: transaction_type === 'CustomerPayBillOnline' ? 'paybill' : 'till',
        payhero_connected: true,
        payhero_channel_id: null
      })
      .eq('id', tenant_id)

    if (error) throw new Error(`Database update failed: ${error.message}`)

    console.log('✅ Daraja credentials validated and saved for tenant:', tenant_id)

    return new Response(
      JSON.stringify({ success: true, message: 'Daraja credentials validated and saved' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in register-credentials:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
