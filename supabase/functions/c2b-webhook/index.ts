import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Allow Safaricom callbacks without authentication
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  }

  try {
    const body = await req.json()
    console.log('C2B Webhook received:', JSON.stringify(body))

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Extract C2B payment data
    const {
      TransactionType,
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      MSISDN,
      FirstName,
      MiddleName,
      LastName
    } = body

    console.log(`C2B Payment: TransID=${TransID}, Amount=${TransAmount}, ShortCode=${BusinessShortCode}, Phone=${MSISDN}`)

    // Find tenant by BusinessShortCode matching payhero_channel_number
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('payhero_channel_number', BusinessShortCode)
      .single()

    if (tenantError || !tenant) {
      console.error('Tenant not found for BusinessShortCode:', BusinessShortCode, tenantError)
      // Still return success to Safaricom to avoid retries
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found tenant:', tenant.name, 'for payment')

    // Build donor name from provided names
    const donorNameParts = [FirstName, MiddleName, LastName].filter(Boolean)
    const donorName = donorNameParts.length > 0 ? donorNameParts.join(' ') : 'Anonymous'

    // Insert giving record
    const givingRecord = {
      tenant_id: tenant.id,
      member_id: null, // No member account needed for C2B
      donor_name: donorName,
      phone_number: MSISDN || null,
      amount: parseFloat(TransAmount) || 0,
      currency: 'KES',
      payment_method: 'mpesa',
      payment_status: 'confirmed',
      giving_type: 'offering', // Default type
      mpesa_receipt: TransID,
      external_reference: TransID,
      notes: BillRefNumber || null,
      given_at: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    }

    console.log('Creating giving record:', givingRecord)

    const { data: createdRecord, error: recordError } = await supabase
      .from('giving_records')
      .insert(givingRecord)
      .select()
      .single()

    if (recordError) {
      console.error('Failed to create giving record:', recordError)
      // Still return success to avoid Safaricom retries
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('C2B giving record created successfully:', createdRecord.id)

    // Always return success response to Safaricom
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('C2B Webhook error:', error)
    // Always return success to prevent Safaricom retries
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
})