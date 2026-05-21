import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const PAYHERO_USERNAME = Deno.env.get('PAYHERO_USERNAME')
    const PAYHERO_PASSWORD = Deno.env.get('PAYHERO_PASSWORD')

    console.log('=== PayHero API Test Debug ===')
    console.log('PAYHERO_BASIC_AUTH exists:', !!PAYHERO_BASIC_AUTH)
    console.log('PAYHERO_USERNAME exists:', !!PAYHERO_USERNAME)
    console.log('PAYHERO_PASSWORD exists:', !!PAYHERO_PASSWORD)

    if (PAYHERO_BASIC_AUTH) {
      console.log('PAYHERO_BASIC_AUTH length:', PAYHERO_BASIC_AUTH.length)
      console.log('PAYHERO_BASIC_AUTH starts with "Basic":', PAYHERO_BASIC_AUTH.startsWith('Basic'))
    }

    const tests = []

    // Test 1: Check PayHero API status/health
    try {
      console.log('=== Test 1: PayHero API Health Check ===')
      const healthResponse = await fetch('https://backend.payhero.co.ke/api/v2/health', {
        method: 'GET',
        headers: {
          'Authorization': PAYHERO_BASIC_AUTH!,
          'Content-Type': 'application/json',
        }
      })
      
      console.log('Health check status:', healthResponse.status)
      const healthData = await healthResponse.text()
      console.log('Health check response:', healthData)
      
      tests.push({
        name: 'Health Check',
        status: healthResponse.status,
        success: healthResponse.ok,
        data: healthData
      })
    } catch (error) {
      console.error('Health check failed:', error)
      tests.push({
        name: 'Health Check',
        status: 'error',
        success: false,
        error: error.message
      })
    }

    // Test 2: Try to get payment channels (if endpoint exists)
    try {
      console.log('=== Test 2: Get Payment Channels ===')
      const channelsResponse = await fetch('https://backend.payhero.co.ke/api/v2/payment_channels', {
        method: 'GET',
        headers: {
          'Authorization': PAYHERO_BASIC_AUTH!,
          'Content-Type': 'application/json',
        }
      })
      
      console.log('Get channels status:', channelsResponse.status)
      const channelsData = await channelsResponse.json()
      console.log('Get channels response:', channelsData)
      
      tests.push({
        name: 'Get Payment Channels',
        status: channelsResponse.status,
        success: channelsResponse.ok,
        data: channelsData
      })
    } catch (error) {
      console.error('Get channels failed:', error)
      tests.push({
        name: 'Get Payment Channels',
        status: 'error',
        success: false,
        error: error.message
      })
    }

    // Test 3: Try the exact same request that's failing
    try {
      console.log('=== Test 3: Register Bank Channel (Exact Request) ===')
      const channelData = {
        channel_type: 'bank',
        account_number: '0110183972349',
        business_name: 'Equity Bank Kenya',
        bank_account: '0110183972349',
        bank_name: 'Equity Bank Kenya'
      }
      
      console.log('Sending channel data:', channelData)
      
      const registerResponse = await fetch('https://backend.payhero.co.ke/api/v2/payment_channels', {
        method: 'POST',
        headers: {
          'Authorization': PAYHERO_BASIC_AUTH!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(channelData)
      })
      
      console.log('Register channel status:', registerResponse.status)
      console.log('Register channel headers:', Object.fromEntries(registerResponse.headers.entries()))
      
      const registerData = await registerResponse.json()
      console.log('Register channel response:', registerData)
      
      tests.push({
        name: 'Register Bank Channel',
        status: registerResponse.status,
        success: registerResponse.ok,
        data: registerData,
        request: channelData
      })
    } catch (error) {
      console.error('Register channel failed:', error)
      tests.push({
        name: 'Register Bank Channel',
        status: 'error',
        success: false,
        error: error.message
      })
    }

    // Test 3.1: Try different endpoint - maybe it's /channels instead of /payment_channels
    try {
      console.log('=== Test 3.1: Try /channels endpoint ===')
      const channelData = {
        channel_type: 'bank',
        account_number: '0110183972349',
        business_name: 'Equity Bank Kenya'
      }
      
      const registerResponse = await fetch('https://backend.payhero.co.ke/api/v2/channels', {
        method: 'POST',
        headers: {
          'Authorization': PAYHERO_BASIC_AUTH!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(channelData)
      })
      
      console.log('Channels endpoint status:', registerResponse.status)
      const registerData = await registerResponse.json()
      console.log('Channels endpoint response:', registerData)
      
      tests.push({
        name: 'Register Channel (/channels)',
        status: registerResponse.status,
        success: registerResponse.ok,
        data: registerData,
        request: channelData
      })
    } catch (error) {
      console.error('Channels endpoint failed:', error)
      tests.push({
        name: 'Register Channel (/channels)',
        status: 'error',
        success: false,
        error: error.message
      })
    }

    // Test 3.2: Try simplified request format
    try {
      console.log('=== Test 3.2: Simplified Request Format ===')
      const channelData = {
        type: 'bank',
        account: '0110183972349',
        name: 'Equity Bank Kenya'
      }
      
      const registerResponse = await fetch('https://backend.payhero.co.ke/api/v2/payment_channels', {
        method: 'POST',
        headers: {
          'Authorization': PAYHERO_BASIC_AUTH!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(channelData)
      })
      
      console.log('Simplified request status:', registerResponse.status)
      const registerData = await registerResponse.json()
      console.log('Simplified request response:', registerData)
      
      tests.push({
        name: 'Simplified Request Format',
        status: registerResponse.status,
        success: registerResponse.ok,
        data: registerData,
        request: channelData
      })
    } catch (error) {
      console.error('Simplified request failed:', error)
      tests.push({
        name: 'Simplified Request Format',
        status: 'error',
        success: false,
        error: error.message
      })
    }

    // Test 4: Try different channel types
    try {
      console.log('=== Test 4: Register Paybill Channel ===')
      const paybillData = {
        channel_type: 'paybill',
        account_number: '123456',
        business_name: 'Test Church',
        paybill_number: '123456'
      }
      
      console.log('Sending paybill data:', paybillData)
      
      const paybillResponse = await fetch('https://backend.payhero.co.ke/api/v2/payment_channels', {
        method: 'POST',
        headers: {
          'Authorization': PAYHERO_BASIC_AUTH!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paybillData)
      })
      
      console.log('Register paybill status:', paybillResponse.status)
      const paybillResponseData = await paybillResponse.json()
      console.log('Register paybill response:', paybillResponseData)
      
      tests.push({
        name: 'Register Paybill Channel',
        status: paybillResponse.status,
        success: paybillResponse.ok,
        data: paybillResponseData,
        request: paybillData
      })
    } catch (error) {
      console.error('Register paybill failed:', error)
      tests.push({
        name: 'Register Paybill Channel',
        status: 'error',
        success: false,
        error: error.message
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'PayHero API tests completed',
        tests,
        environment: {
          has_basic_auth: !!PAYHERO_BASIC_AUTH,
          has_username: !!PAYHERO_USERNAME,
          has_password: !!PAYHERO_PASSWORD,
          basic_auth_format: PAYHERO_BASIC_AUTH ? 'Basic ' + PAYHERO_BASIC_AUTH.substring(6, 20) + '...' : 'missing'
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in test-payhero-api:', error)
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