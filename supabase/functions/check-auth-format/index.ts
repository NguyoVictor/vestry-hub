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
    
    console.log('=== PAYHERO_BASIC_AUTH Format Check ===')
    
    const authInfo = {
      exists: !!PAYHERO_BASIC_AUTH,
      length: PAYHERO_BASIC_AUTH?.length || 0,
      startsWithBasic: PAYHERO_BASIC_AUTH?.startsWith('Basic ') || false,
      firstChars: PAYHERO_BASIC_AUTH?.substring(0, 10) || 'N/A',
      lastChars: PAYHERO_BASIC_AUTH?.substring(-10) || 'N/A'
    }
    
    console.log('Auth format info:', authInfo)
    
    return new Response(
      JSON.stringify({
        success: true,
        auth_format: authInfo,
        usage_examples: {
          direct_usage: 'Authorization: PAYHERO_BASIC_AUTH',
          with_basic_prefix: 'Authorization: `Basic ${PAYHERO_BASIC_AUTH}`'
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error checking auth format:', error)
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