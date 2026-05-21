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

    console.log('=== PayHero Channel Registration (New Approach) ===')
    console.log('PAYHERO_BASIC_AUTH exists:', !!PAYHERO_BASIC_AUTH)
    console.log('SUPABASE_URL exists:', !!SUPABASE_URL)
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!SUPABASE_SERVICE_ROLE_KEY)

    if (!PAYHERO_BASIC_AUTH) {
      console.error('PayHero credentials missing')
      throw new Error('PayHero credentials not configured')
    }

    const requestBody = await req.json()
    console.log('Request body received:', requestBody)

    const { channel_type, account_number, business_name, tenant_id, paybill_number, beneficiary } = requestBody

    // Validate required fields
    if (!tenant_id || !channel_type) {
      console.error('Missing required fields: tenant_id, channel_type')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required fields: tenant_id, channel_type',
          details: 'Both tenant_id and channel_type are required'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate channel type
    if (!['bank', 'paybill', 'till'].includes(channel_type)) {
      console.error('Invalid channel_type:', channel_type)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid channel type',
          details: 'Channel type must be: bank, paybill, or till'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate channel-specific required fields
    if (!account_number || account_number.trim().length < 3) {
      console.error('Invalid account_number:', account_number)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `${channel_type === 'bank' ? 'Account number' : channel_type === 'till' ? 'Till number' : 'Paybill number'} is required`,
          details: `Please provide a valid ${channel_type === 'bank' ? 'account number' : channel_type === 'till' ? 'till number' : 'paybill number'} (minimum 3 characters)`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate beneficiary name (required for all channel types)
    if (!beneficiary || beneficiary.trim().length < 2) {
      console.error('Invalid beneficiary:', beneficiary)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Beneficiary name is required',
          details: 'Please provide the account holder or business name (minimum 2 characters)'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // LIVE PAYHERO API INTEGRATION
    console.log('Attempting LIVE PayHero API integration...')
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    
    // Prepare PayHero API payload with EXACT field mapping per PayHero docs
    // CRITICAL: PayHero expects specific data types and field names
    const shortCode = account_number ? account_number.toString() : null // STRING as required
    const channelType = channel_type ? channel_type.toLowerCase() : null
    const description = beneficiary ? beneficiary.trim() : null // Maps to Beneficiary Name from UI
    const accountNumber = paybill_number ? paybill_number.trim() : '' // Optional account number field
    
    if (!shortCode || !channelType || !description) {
      console.error('Missing required values for PayHero API:', { 
        shortCode, 
        channelType, 
        description,
        accountNumber,
        original: { account_number, channel_type, beneficiary, paybill_number }
      })
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid data for PayHero API',
          details: `Missing required values: short_code=${shortCode}, channel_type=${channelType}, description=${description}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // PayHero API payload with EXACT field names and types from docs
    const payheroPayload = {
      channel_type: channelType,        // 'till', 'paybill', or 'bank' (string)
      short_code: shortCode,           // Till/Paybill number (STRING not integer!)
      description: description,        // Beneficiary Name (required string)
      account_id: 8849,              // Master account ID (integer)
      account_number: accountNumber   // Optional account number (string)
    }
    
    console.log('PayHero API payload (snake_case with correct types):', payheroPayload)
    console.log('Payload validation:', {
      channel_type: typeof payheroPayload.channel_type + ' = "' + payheroPayload.channel_type + '"',
      account_id: typeof payheroPayload.account_id + ' = ' + payheroPayload.account_id,
      short_code: typeof payheroPayload.short_code + ' = "' + payheroPayload.short_code + '" (STRING as required by PayHero)',
      description: typeof payheroPayload.description + ' = "' + payheroPayload.description + '"',
      account_number: typeof payheroPayload.account_number + ' = "' + payheroPayload.account_number + '"'
    })
    
    // Call PayHero API to register payment channel
    const payheroResponse = await fetch('https://backend.payhero.co.ke/api/v2/payment_channels', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${PAYHERO_BASIC_AUTH}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payheroPayload)
    })
    
    console.log('PayHero API response status:', payheroResponse.status)
    
    const payheroData = await payheroResponse.json()
    console.log('PayHero API response data:', payheroData)
    
    if (!payheroResponse.ok) {
      console.error('PayHero API error:', payheroData)
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'PayHero API error',
          details: payheroData.error_message || payheroData.message || 'PayHero API returned an error',
          payhero_error: payheroData,
          status_code: payheroResponse.status
        }),
        { status: payheroResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('🎉 PayHero API SUCCESS! Response:', payheroData)
    
    // Extract the DYNAMIC channel_id from PayHero response
    // PayHero generates a new ID each time (e.g., 8423, 8424, 8425)
    const dynamicChannelId = payheroData.channel_id || payheroData.id || payheroData.ChannelId
    if (!dynamicChannelId) {
      console.error('❌ CRITICAL: No dynamic channel_id in PayHero response:', payheroData)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'PayHero registration incomplete',
          details: 'No channel_id received from PayHero API - registration failed',
          payhero_response: payheroData
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('✅ DYNAMIC PayHero Channel ID captured:', dynamicChannelId)
    console.log('🔥 Channel Details:', {
      dynamic_id: dynamicChannelId,
      channel_type: channelType,
      short_code: shortCode,
      description: description,
      account_number: accountNumber
    })
    
    // CRITICAL: Save the DYNAMIC channel_id to database for Member portal access
    const updateData = {
      payhero_channel_id: dynamicChannelId.toString(), // DYNAMIC PayHero channel ID (e.g., 8425)
      payhero_channel_type: channelType,
      payhero_channel_number: shortCode,
      payhero_business_name: description, // Beneficiary name
      payhero_connected: true, // Enable Member portal STK push
      payhero_manual_setup: false, // Live integration complete
      payhero_setup_details: JSON.stringify({
        channel_type: channelType,
        short_code: shortCode,
        description: description,
        account_number: accountNumber,
        setup_date: new Date().toISOString(),
        dynamic_channel_id: dynamicChannelId,
        payhero_response: payheroData
      }),
      updated_at: new Date().toISOString()
    }
    
    console.log('💾 CRITICAL: Saving DYNAMIC channel_id to database:', {
      tenant_id: tenant_id,
      dynamic_channel_id: dynamicChannelId,
      update_data: updateData
    })
    
    // Execute database update with verification
    const { data: updateResult, error: updateError } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', tenant_id)
      .select('payhero_connected, payhero_channel_id, payhero_channel_type')
      .single()
    
    if (updateError) {
      console.error('❌ CRITICAL: Database update failed:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Database sync failed',
          details: `Failed to save channel_id ${dynamicChannelId} to database: ${updateError.message}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('✅ Database update successful:', updateResult)
    
    // VERIFY the dynamic channel_id was properly saved
    if (!updateResult?.payhero_connected || updateResult?.payhero_channel_id !== dynamicChannelId.toString()) {
      console.error('❌ CRITICAL: Database verification failed:', {
        expected_channel_id: dynamicChannelId.toString(),
        actual_channel_id: updateResult?.payhero_channel_id,
        payhero_connected: updateResult?.payhero_connected
      })
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Database verification failed',
          details: `Channel ID ${dynamicChannelId} was not properly saved to database`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('🚀 SUCCESS: Admin-Member bridge established!')
    console.log('📋 Final verification:', {
      tenant_id: tenant_id,
      dynamic_channel_id: dynamicChannelId,
      database_saved: updateResult.payhero_channel_id,
      member_portal_ready: updateResult.payhero_connected
    })
    
    return new Response(
      JSON.stringify({
        success: true,
        setup_type: 'live',
        channel_id: dynamicChannelId.toString(),
        channel_type: channelType,
        short_code: shortCode,
        description: description,
        account_number: accountNumber,
        message: '🎉 Payment channel connected! Members can now receive STK pushes instantly!',
        payhero_data: payheroData,
        database_verification: updateResult,
        next_steps: [
          '✅ Dynamic PayHero channel registered successfully',
          `🔗 Channel ID ${dynamicChannelId} saved to database`,
          '🚀 Member portal is now LIVE for STK pushes',
          '📱 Members can donate immediately with M-Pesa'
        ]
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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