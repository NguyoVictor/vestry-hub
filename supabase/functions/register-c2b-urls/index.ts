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
    const { tenant_id } = await req.json()
    if (!tenant_id) return new Response(JSON.stringify({ error: 'Missing tenant_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    try {
      await authorizeTenantActor(req, supabase, tenant_id)
    } catch (error) {
      const forbidden = String(error).includes('forbidden')
      return new Response(JSON.stringify({ error: forbidden ? 'forbidden' : 'unauthorized' }), { status: forbidden ? 403 : 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const [{ data: tenant, error: tenantError }, { data: credentials, error: credentialError }] = await Promise.all([
      supabase.from('tenants').select('id, name, c2b_registered').eq('id', tenant_id).single(),
      supabase.from('tenant_payment_credentials').select('daraja_consumer_key, daraja_consumer_secret, daraja_shortcode').eq('tenant_id', tenant_id).single(),
    ])
    if (tenantError || !tenant) return new Response(JSON.stringify({ error: 'Church not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (tenant.c2b_registered) return new Response(JSON.stringify({ error: 'C2B URLs already registered for this church' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (credentialError || !credentials?.daraja_consumer_key || !credentials.daraja_consumer_secret || !credentials.daraja_shortcode) {
      return new Response(JSON.stringify({ error: 'Missing protected Daraja credentials or shortcode' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const webhookSecret = Deno.env.get('CHURCH_DARAJA_WEBHOOK_SECRET')
    if (!webhookSecret) return new Response(JSON.stringify({ error: 'Church payment callback secret is not configured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const callbackUrl = new URL(`${Deno.env.get('SUPABASE_URL')}/functions/v1/c2b-webhook`)
    callbackUrl.searchParams.set('token', webhookSecret)
    const darajaBaseUrl = Deno.env.get('DARAJA_ENV') === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'
    const auth = btoa(`${credentials.daraja_consumer_key}:${credentials.daraja_consumer_secret}`)
    const tokenResponse = await fetch(`${darajaBaseUrl}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${auth}` } })
    if (!tokenResponse.ok) throw new Error('Failed to get Daraja access token')
    const { access_token } = await tokenResponse.json()

    const c2bPayload = {
      ShortCode: credentials.daraja_shortcode,
      ResponseType: 'Completed',
      ConfirmationURL: callbackUrl.toString(),
      ValidationURL: callbackUrl.toString(),
    }
    const c2bResponse = await fetch(`${darajaBaseUrl}/mpesa/c2b/v1/registerurl`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(c2bPayload),
    })
    const c2bData = await c2bResponse.json()
    if (!c2bResponse.ok || c2bData.errorCode) return new Response(JSON.stringify({ error: 'C2B URL registration failed', details: c2bData.errorMessage || c2bData.ResponseDescription || 'Unknown error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { error: updateError } = await supabase.from('tenants').update({ c2b_registered: true }).eq('id', tenant_id)
    if (updateError) throw new Error('Failed to update registration status')

    return new Response(JSON.stringify({ success: true, message: 'C2B URLs registered successfully', short_code: credentials.daraja_shortcode }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('register-c2b-urls failed:', error instanceof Error ? error.message : error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
