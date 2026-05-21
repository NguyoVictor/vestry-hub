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
    
    if (!PAYHERO_BASIC_AUTH) {
      throw new Error('PayHero credentials not configured')
    }

    // Try PayHero's banks API first
    try {
      console.log('Attempting to fetch banks from PayHero API...')
      
      const payHeroResponse = await fetch('https://backend.payhero.co.ke/api/v2/banks', {
        method: 'GET',
        headers: {
          'Authorization': PAYHERO_BASIC_AUTH,
          'Content-Type': 'application/json',
        }
      })

      console.log('PayHero banks API response status:', payHeroResponse.status)

      if (payHeroResponse.ok) {
        const banks = await payHeroResponse.json()
        console.log('Successfully fetched banks from PayHero:', banks)
        
        return new Response(JSON.stringify({ 
          success: true, 
          banks,
          source: 'payhero_api'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        console.log('PayHero banks API failed, trying institutions endpoint...')
        
        // Try alternative institutions endpoint
        const institutionsResponse = await fetch('https://backend.payhero.co.ke/api/v2/institutions', {
          method: 'GET',
          headers: {
            'Authorization': PAYHERO_BASIC_AUTH,
            'Content-Type': 'application/json',
          }
        })

        if (institutionsResponse.ok) {
          const institutions = await institutionsResponse.json()
          console.log('Successfully fetched institutions from PayHero:', institutions)
          
          return new Response(JSON.stringify({ 
            success: true, 
            banks: institutions,
            source: 'payhero_institutions'
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }
    } catch (error) {
      console.log('PayHero API error:', error.message)
    }

    // Fallback to curated list of major Kenyan banks
    console.log('Using fallback bank list')
    
    const fallbackBanks = [
      { 
        code: "01", 
        name: "Kenya Commercial Bank (KCB)", 
        shortName: "KCB", 
        logo: "/bank-logos/kcb.png",
        type: "commercial"
      },
      { 
        code: "02", 
        name: "Equity Bank Kenya", 
        shortName: "Equity", 
        logo: "/bank-logos/equity.png",
        type: "commercial"
      },
      { 
        code: "03", 
        name: "Co-operative Bank of Kenya", 
        shortName: "Co-op Bank", 
        logo: "/bank-logos/coop.png",
        type: "commercial"
      },
      { 
        code: "04", 
        name: "NCBA Bank Kenya", 
        shortName: "NCBA", 
        logo: "/bank-logos/ncba.png",
        type: "commercial"
      },
      { 
        code: "05", 
        name: "Absa Bank Kenya", 
        shortName: "Absa", 
        logo: "/bank-logos/absa.png",
        type: "commercial"
      },
      { 
        code: "06", 
        name: "Standard Chartered Bank Kenya", 
        shortName: "Standard Chartered", 
        logo: "/bank-logos/sc.png",
        type: "commercial"
      },
      { 
        code: "07", 
        name: "Diamond Trust Bank Kenya", 
        shortName: "DTB", 
        logo: "/bank-logos/dtb.png",
        type: "commercial"
      },
      { 
        code: "08", 
        name: "I&M Bank Limited", 
        shortName: "I&M Bank", 
        logo: "/bank-logos/im.png",
        type: "commercial"
      },
      { 
        code: "09", 
        name: "Stanbic Bank Kenya", 
        shortName: "Stanbic", 
        logo: "/bank-logos/stanbic.png",
        type: "commercial"
      },
      { 
        code: "10", 
        name: "Family Bank Limited", 
        shortName: "Family Bank", 
        logo: "/bank-logos/family.png",
        type: "commercial"
      },
      { 
        code: "11", 
        name: "National Bank of Kenya", 
        shortName: "National Bank", 
        logo: "/bank-logos/national.png",
        type: "commercial"
      },
      { 
        code: "12", 
        name: "Prime Bank Limited", 
        shortName: "Prime Bank", 
        logo: "/bank-logos/prime.png",
        type: "commercial"
      },
      { 
        code: "13", 
        name: "Gulf African Bank", 
        shortName: "Gulf African", 
        logo: "/bank-logos/gulf.png",
        type: "commercial"
      },
      { 
        code: "14", 
        name: "Sidian Bank Limited", 
        shortName: "Sidian Bank", 
        logo: "/bank-logos/sidian.png",
        type: "commercial"
      },
      { 
        code: "15", 
        name: "Citibank N.A. Kenya", 
        shortName: "Citibank", 
        logo: "/bank-logos/citi.png",
        type: "international"
      }
    ]

    return new Response(JSON.stringify({ 
      success: true, 
      banks: fallbackBanks,
      source: 'fallback',
      message: 'Using curated list of major Kenyan banks'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in get-supported-banks:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch supported banks',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})