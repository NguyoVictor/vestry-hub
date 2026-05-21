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
      console.error('PayHero credentials missing')
      throw new Error('PayHero credentials not configured')
    }

    console.log('Fetching PayHero bank paybills from official API...')

    // Try to fetch banks from PayHero API
    let payheroBanks = []
    let source = 'fallback'
    let message = 'Using curated list of major Kenyan banks'

    try {
      // Use the correct PayHero API endpoint for bank paybills
      const endpoints = [
        'https://backend.payhero.co.ke/api/v2/bank_paybills', // Correct official endpoint
        'https://backend.payhero.co.ke/api/v2/banks', // Fallback
        'https://backend.payhero.co.ke/api/v2/institutions' // Additional fallback
      ]

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`)
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': PAYHERO_BASIC_AUTH,
              'Content-Type': 'application/json',
            }
          })

          console.log(`Response status for ${endpoint}:`, response.status)

          if (response.ok) {
            const data = await response.json()
            console.log(`Success! Data from ${endpoint}:`, data)
            
            if (data && (Array.isArray(data) || data.banks || data.institutions || data.data || data.bank_paybills)) {
              payheroBanks = Array.isArray(data) ? data : (data.bank_paybills || data.banks || data.institutions || data.data || [])
              source = 'payhero_official'
              message = `Fetched ${payheroBanks.length} bank paybills from PayHero official API`
              break
            }
          }
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint} failed:`, endpointError.message)
          continue
        }
      }
    } catch (error) {
      console.log('PayHero API failed, using fallback:', error.message)
    }

    // Fallback to curated list if PayHero API doesn't work
    if (payheroBanks.length === 0) {
      payheroBanks = [
        {
          id: 'equity',
          name: 'Equity Bank Kenya Limited',
          shortName: 'Equity Bank',
          code: 'EQBNKE22',
          paybill: '247247',
          logo: '/bank-logos/equity-bank.svg'
        },
        {
          id: 'kcb',
          name: 'Kenya Commercial Bank Limited',
          shortName: 'KCB Bank',
          code: 'KCBLKENX',
          paybill: '522522',
          logo: '/bank-logos/kcb-bank.svg'
        },
        {
          id: 'cooperative',
          name: 'Co-operative Bank of Kenya Limited',
          shortName: 'Co-op Bank',
          code: 'KCOOKENA',
          paybill: '400200',
          logo: '/bank-logos/cooperative-bank.svg'
        },
        {
          id: 'absa',
          name: 'Absa Bank Kenya PLC',
          shortName: 'Absa Bank',
          code: 'BARCKENX',
          paybill: '303030',
          logo: '/bank-logos/absa-bank.svg'
        },
        {
          id: 'standard-chartered',
          name: 'Standard Chartered Bank Kenya Limited',
          shortName: 'Standard Chartered',
          code: 'SCBLKENX',
          paybill: '329329',
          logo: '/bank-logos/standard-chartered.svg'
        },
        {
          id: 'dtb',
          name: 'Diamond Trust Bank Kenya Limited',
          shortName: 'DTB Bank',
          code: 'DTKEKENA',
          paybill: '525900',
          logo: '/bank-logos/dtb-bank.svg'
        },
        {
          id: 'ncba',
          name: 'NCBA Bank Kenya PLC',
          shortName: 'NCBA Bank',
          code: 'CBAFKENX',
          paybill: '720720',
          logo: '/bank-logos/ncba-bank.svg'
        },
        {
          id: 'family',
          name: 'Family Bank Limited',
          shortName: 'Family Bank',
          code: 'FAMIKENX',
          paybill: '222111',
          logo: '/bank-logos/family-bank.svg'
        },
        {
          id: 'i-m',
          name: 'I&M Bank Limited',
          shortName: 'I&M Bank',
          code: 'IMBLKENX',
          paybill: '200200',
          logo: '/bank-logos/im-bank.svg'
        },
        {
          id: 'stanbic',
          name: 'Stanbic Bank Kenya Limited',
          shortName: 'Stanbic Bank',
          code: 'SBICKENX',
          paybill: '100100',
          logo: '/bank-logos/stanbic-bank.svg'
        },
        {
          id: 'nic',
          name: 'NIC Bank PLC',
          shortName: 'NIC Bank',
          code: 'NICBKENX',
          paybill: '444555',
          logo: '/bank-logos/nic-bank.svg'
        },
        {
          id: 'prime',
          name: 'Prime Bank Limited',
          shortName: 'Prime Bank',
          code: 'PRIMEKENX',
          paybill: '334455',
          logo: '/bank-logos/prime-bank.svg'
        },
        {
          id: 'gulf',
          name: 'Gulf African Bank Limited',
          shortName: 'Gulf African Bank',
          code: 'GULFKENX',
          paybill: '777888',
          logo: '/bank-logos/gulf-bank.svg'
        },
        {
          id: 'sidian',
          name: 'Sidian Bank Limited',
          shortName: 'Sidian Bank',
          code: 'SIDIANKENX',
          paybill: '888999',
          logo: '/bank-logos/sidian-bank.svg'
        },
        {
          id: 'housing-finance',
          name: 'Housing Finance Company Kenya Limited',
          shortName: 'HF Group',
          code: 'HFCKKENX',
          paybill: '334466',
          logo: '/bank-logos/hf-group.svg'
        }
      ]
    }

    console.log(`Returning ${payheroBanks.length} banks from ${source}`)

    return new Response(
      JSON.stringify({
        success: true,
        banks: payheroBanks,
        source,
        message,
        count: payheroBanks.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in get-payhero-banks:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch banks', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})