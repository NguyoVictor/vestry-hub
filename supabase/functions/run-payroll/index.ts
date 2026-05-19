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

    const { payroll_run_id, staff_ids, tenant_id, channel_id } = await req.json()

    if (!payroll_run_id || !staff_ids || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get staff details for payroll
    const { data: staffMembers, error: staffError } = await supabase
      .from('payroll_staff')
      .select('*')
      .in('id', staff_ids)
      .eq('tenant_id', tenant_id)

    if (staffError || !staffMembers) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch staff details' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = {
      mpesa_payments: [],
      bank_transfers: [],
      errors: []
    }

    // Process each staff member
    for (const staff of staffMembers) {
      try {
        const timestamp = Date.now()
        const external_reference = `PAY-${staff.id}-${timestamp}`

        if (staff.payment_method === 'mpesa' && staff.phone_number) {
          // Format phone number
          let formattedPhone = staff.phone_number.replace(/^\+/, '').replace(/^0/, '254')
          if (!formattedPhone.startsWith('254')) {
            formattedPhone = '254' + formattedPhone
          }

          // PayHero B2C API call
          const b2cResponse = await fetch('https://backend.payhero.co.ke/api/v2/withdraw', {
            method: 'POST',
            headers: {
              'Authorization': PAYHERO_BASIC_AUTH,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              external_reference,
              amount: parseFloat(staff.net_salary),
              phone_number: formattedPhone,
              network_code: "63902",
              callback_url: `${SUPABASE_URL}/functions/v1/payment-webhook`,
              channel: "mobile",
              channel_id: channel_id || 8272,
              payment_service: "b2c"
            })
          })

          const b2cData = await b2cResponse.json()

          // Create payout record
          const payoutData = {
            tenant_id,
            staff_id: staff.id,
            payroll_run_id,
            amount: parseFloat(staff.net_salary),
            payment_method: 'mpesa',
            phone_number: formattedPhone,
            external_reference,
            status: b2cResponse.ok ? 'processing' : 'failed',
            payhero_reference: b2cData.reference || null,
            created_at: new Date().toISOString()
          }

          await supabase.from('payouts').insert(payoutData)

          results.mpesa_payments.push({
            staff_id: staff.id,
            staff_name: `${staff.first_name} ${staff.last_name}`,
            amount: staff.net_salary,
            phone_number: formattedPhone,
            status: payoutData.status,
            reference: b2cData.reference
          })

        } else {
          // Bank transfer - mark as manual required
          const payoutData = {
            tenant_id,
            staff_id: staff.id,
            payroll_run_id,
            amount: parseFloat(staff.net_salary),
            payment_method: 'bank_transfer',
            bank_name: staff.bank_name,
            account_number: staff.account_number,
            status: 'manual_required',
            created_at: new Date().toISOString()
          }

          await supabase.from('payouts').insert(payoutData)

          results.bank_transfers.push({
            staff_id: staff.id,
            staff_name: `${staff.first_name} ${staff.last_name}`,
            amount: staff.net_salary,
            bank_name: staff.bank_name,
            account_number: staff.account_number,
            status: 'manual_required'
          })
        }

      } catch (error) {
        console.error(`Error processing staff ${staff.id}:`, error)
        results.errors.push({
          staff_id: staff.id,
          staff_name: `${staff.first_name} ${staff.last_name}`,
          error: error.message
        })
      }
    }

    // Update payroll run status
    await supabase
      .from('payroll_runs')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', payroll_run_id)

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total_staff: staffMembers.length,
          mpesa_payments: results.mpesa_payments.length,
          bank_transfers: results.bank_transfers.length,
          errors: results.errors.length
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in run-payroll:', error)
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