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

    if (!PAYHERO_BASIC_AUTH) {
      throw new Error('PayHero credentials not configured')
    }

    const { channel_type, account_number, business_name, tenant_id } = await req.json()

    if (!channel_type || !account_number || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PayHero payment channel registration
    const channelData: any = {
      channel_type,
      account_number,
      business_name: business_name || 'Church Account'
    }

    // Add channel-specific fields
    if (channel_type === 'paybill') {
      channelData.paybill_number = account_number
    } else if (channel_type === 'till') {
      channelData.till_number = account_number
    } else if (channel_type === 'bank') {
      channelData.bank_account = account_number
    }

    const payHeroResponse = await fetch('https://backend.payhero.co.ke/api/v2/payment_channels', {
      method: 'POST',
      headers: {
        'Authorization': PAYHERO_BASIC_AUTH,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(channelData)
    })

    const payHeroData = await payHeroResponse.json()

    if (!payHeroResponse.ok) {
      console.error('PayHero channel registration error:', payHeroData)
      return new Response(
        JSON.stringify({ 
          error: 'Channel registration failed', 
          details: payHeroData.message || 'Unknown error' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update tenant with PayHero channel information
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        payhero_channel_id: payHeroData.channel_id,
        payhero_channel_type: channel_type,
        payhero_channel_number: account_number,
        payhero_connected: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant_id)

    if (updateError) {
      console.error('Failed to update tenant:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to save channel information' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        channel_id: payHeroData.channel_id,
        channel_type,
        account_number,
        message: 'Payment channel registered successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in register-payment-channel:', error)
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