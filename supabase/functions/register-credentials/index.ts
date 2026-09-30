import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authorizeTenantActor } from '../_shared/authorize-tenant-actor.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { consumer_key, consumer_secret, passkey, short_code, transaction_type, tenant_id } = await req.json()
    if (!consumer_key || !consumer_secret || !passkey || !short_code || !transaction_type || !tenant_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    try {
      await authorizeTenantActor(req, supabase, tenant_id)
    } catch (error) {
      const forbidden = String(error).includes('forbidden')
      return new Response(JSON.stringify({ error: forbidden ? 'forbidden' : 'unauthorized' }), { status: forbidden ? 403 : 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const safaricomBase = Deno.env.get('DARAJA_ENV') === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'
    const auth = btoa(`${consumer_key}:${consumer_secret}`)
    const tokenResponse = await fetch(`${safaricomBase}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    })
    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error('Invalid Daraja credentials')

    const { error: credentialError } = await supabase.from('tenant_payment_credentials').upsert({
      tenant_id,
      daraja_consumer_key: consumer_key,
      daraja_consumer_secret: consumer_secret,
      daraja_passkey: passkey,
      daraja_transaction_type: transaction_type,
      daraja_shortcode: String(short_code),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' })
    if (credentialError) throw new Error(`Credential storage failed: ${credentialError.message}`)

    // Keep only non-secret presentation/setup state on tenants.
    const { error: tenantError } = await supabase.from('tenants').update({
      payhero_channel_number: String(short_code),
      payhero_channel_type: transaction_type === 'CustomerPayBillOnline' ? 'paybill' : 'till',
      payhero_connected: true,
      payhero_channel_id: null,
    }).eq('id', tenant_id)
    if (tenantError) throw new Error(`Tenant payment state update failed: ${tenantError.message}`)

    return new Response(JSON.stringify({ success: true, message: 'Daraja credentials validated and stored securely' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('register-credentials failed:', error instanceof Error ? error.message : error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to save credentials' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
