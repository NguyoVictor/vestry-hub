import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function sha256Json(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const accepted = () => new Response(
  JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
  { status: 200, headers: { 'Content-Type': 'application/json' } },
)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })

  const webhookSecret = Deno.env.get('CHURCH_DARAJA_WEBHOOK_SECRET') || ''
  const callbackToken = new URL(req.url).searchParams.get('token') || ''
  if (!webhookSecret || callbackToken !== webhookSecret) return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  try {
    const body = await req.json()
    const {
      TransID,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
    } = body

    const amount = Number(TransAmount)
    if (!TransID || !BusinessShortCode || !Number.isFinite(amount) || amount <= 0) return accepted()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: credentials, error: credentialError } = await supabase
      .from('tenant_payment_credentials')
      .select('tenant_id')
      .eq('daraja_shortcode', String(BusinessShortCode))
      .single()

    if (credentialError || !credentials?.tenant_id) {
      console.error('No protected tenant payment credential matches BusinessShortCode')
      return accepted()
    }

    const donorName = [FirstName, MiddleName, LastName].filter(Boolean).join(' ') || 'Anonymous'
    const payloadHash = await sha256Json(body)

    const { error: recordError } = await supabase.rpc('record_mpesa_c2b_payment', {
      p_tenant_id: credentials.tenant_id,
      p_trans_id: String(TransID),
      p_business_shortcode: String(BusinessShortCode),
      p_amount: amount,
      p_phone: MSISDN ? String(MSISDN) : null,
      p_donor_name: donorName,
      p_bill_ref: BillRefNumber ? String(BillRefNumber) : null,
      p_payload_hash: payloadHash,
    })

    if (recordError) console.error('record_mpesa_c2b_payment failed:', recordError.message)
    return accepted()
  } catch (error) {
    console.error('C2B webhook error:', error instanceof Error ? error.message : error)
    return accepted()
  }
})
