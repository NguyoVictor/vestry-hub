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

    console.log('=== PayHero STK Push Test ===')
    console.log('PAYHERO_BASIC_AUTH exists:', !!PAYHERO_BASIC_AUTH)

    const tests = []

    // Test 1: Try STK Push endpoint (this is likely the correct PayHero API)
    try {
      console.log('=== Test 1: STK Push Request ===')
      const stkData = {
        amount: 10,
        phone_number: '254700000000', // Test phone number
        channel_id: 1, // This might be configured in PayHero dashboard
        provider: 'mpesa',
        external_reference: 'test-' + Date.now(),
        callback_url: 'https://crjdsxxkspvdwknrmijs.supabase.co/functions/v1/payment-webhook'
      }
      
      console.log('Sending STK Push data:', stkData)
      
      const stkResponse = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
        method: 'POST',
        headers: {
          'Authorization': PAYHERO_BASIC_AUTH!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkData)
      })
      
      console.log('STK Push status:', stkResponse.status)
      console.log('STK Push headers:', Object.fromEntries(stkResponse.headers.entries()))
      
      const stkResponseData = await stkResponse.json()
      console.log('STK Push response:', stkResponseData)
      
      tests.push({
        name: 'STK Push Request',
        status: stkResponse.status,
        success: stkResponse.ok,
        data: stkResponseData,
        request: stkData
      })
    } catch (error) {
      console.error('STK Push failed:', error)
      tests.push({
        name: 'STK Push Request',
        status: 'error',
        success: false,
        error: error.message
      })
    }

    // Test 2: Try different STK endpoint
    try {
      console.log('=== Test 2: Alternative STK Endpoint ===')
      const stkData = {
        amount: 10,
        phone_number: '254700000000',
        reference: 'test-' + Date.now()
      }
      
      const stkResponse = await fetch('https://backend.payhero.co.ke/api/v2/stk-push', {
        method: 'POST',
        headers: {
          'Authorization': PAYHERO_BASIC_AUTH!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkData)
      })
      
      console.log('Alternative STK status:', stkResponse.status)
      const stkResponseData = await stkResponse.json()
      console.log('Alternative STK response:', stkResponseData)
      
      tests.push({
        name: 'Alternative STK Endpoint',
        status: stkResponse.status,
        success: stkResponse.ok,
        data: stkResponseData,
        request: stkData
      })
    } catch (error) {
      console.error('Alternative STK failed:', error)
      tests.push({
        name: 'Alternative STK Endpoint',
        status: 'error',
        success: false,
        error: error.message
      })
    }

    // Test 3: Check account/profile endpoint
    try {
      console.log('=== Test 3: Account Profile ===')
      const profileResponse = await fetch('https://backend.payhero.co.ke/api/v2/profile', {
        method: 'GET',
        headers: {
          'Authorization': PAYHERO_BASIC_AUTH!,
          'Content-Type': 'application/json',
        }
      })
      
      console.log('Profile status:', profileResponse.status)
      const profileData = await profileResponse.json()
      console.log('Profile response:', profileData)
      
      tests.push({
        name: 'Account Profile',
        status: profileResponse.status,
        success: profileResponse.ok,
        data: profileData
      })
    } catch (error) {
      console.error('Profile check failed:', error)
      tests.push({
        name: 'Account Profile',
        status: 'error',
        success: false,
        error: error.message
      })
    }

    // Test 4: Check account balance/info
    try {
      console.log('=== Test 4: Account Info ===')
      const accountResponse = await fetch('https://backend.payhero.co.ke/api/v2/account', {
        method: 'GET',
        headers: {
          'Authorization': PAYHERO_BASIC_AUTH!,
          'Content-Type': 'application/json',
        }
      })
      
      console.log('Account status:', accountResponse.status)
      const accountData = await accountResponse.json()
      console.log('Account response:', accountData)
      
      tests.push({
        name: 'Account Info',
        status: accountResponse.status,
        success: accountResponse.ok,
        data: accountData
      })
    } catch (error) {
      console.error('Account check failed:', error)
      tests.push({
        name: 'Account Info',
        status: 'error',
        success: false,
        error: error.message
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'PayHero STK Push tests completed',
        tests,
        conclusion: 'PayHero likely does not have channel registration API. Channels are probably configured in dashboard, and API is used for STK Push payments only.',
        environment: {
          has_basic_auth: !!PAYHERO_BASIC_AUTH,
          basic_auth_format: PAYHERO_BASIC_AUTH ? 'Basic ' + PAYHERO_BASIC_AUTH.substring(6, 20) + '...' : 'missing'
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in test-payhero-stk:', error)
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