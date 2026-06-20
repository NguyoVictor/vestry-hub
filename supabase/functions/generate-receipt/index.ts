import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const { giving_record_id } = await req.json();
    if (!giving_record_id) {
      return new Response(JSON.stringify({ error: 'giving_record_id is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch giving record with member and tenant info
    const { data: record, error: recErr } = await supabase
      .from('giving_records')
      .select(`
        *,
        member:users!giving_records_member_id_fkey(first_name, last_name, email),
        tenant:tenants!giving_records_tenant_id_fkey(name, church_code, logo_url, contact_email)
      `)
      .eq('id', giving_record_id)
      .single();
    if (recErr) throw recErr;

    const member = record.member as { first_name: string; last_name: string; email: string } | null;
    const tenant = record.tenant as { name: string; church_code: string; logo_url: string | null; contact_email: string | null } | null;

    const memberName = member ? `${member.first_name} ${member.last_name}` : 'Anonymous';
    const churchName = tenant?.name ?? 'Church';
    const receiptNumber = `RCP-${giving_record_id.slice(0, 8).toUpperCase()}`;
    const amount = new Intl.NumberFormat('en-KE', { style: 'currency', currency: record.currency ?? 'KES' }).format(Number(record.amount));
    const date = new Date(record.given_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });

    // Generate HTML receipt
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Giving Receipt</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; color: #1A1A2E; }
  .header { text-align: center; border-bottom: 2px solid #3D1C8E; padding-bottom: 16px; margin-bottom: 24px; }
  .church-name { font-size: 24px; font-weight: bold; color: #3D1C8E; }
  .receipt-title { font-size: 14px; color: #666; margin-top: 4px; }
  .receipt-number { font-size: 12px; color: #888; }
  .amount-box { background: #3D1C8E; color: white; text-align: center; padding: 20px; border-radius: 8px; margin: 24px 0; }
  .amount { font-size: 36px; font-weight: bold; }
  .amount-label { font-size: 12px; opacity: 0.8; margin-top: 4px; }
  .details { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .detail-row { display: flex; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f3f4f6; }
  .detail-row:last-child { border-bottom: none; }
  .detail-label { color: #666; font-size: 13px; }
  .detail-value { font-weight: 600; font-size: 13px; }
  .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #888; }
  .thank-you { text-align: center; font-size: 16px; color: #3D1C8E; font-weight: bold; margin: 24px 0; }
</style>
</head>
<body>
  <div class="header">
    <div class="church-name">${churchName}</div>
    <div class="receipt-title">Official Giving Receipt</div>
    <div class="receipt-number">${receiptNumber}</div>
  </div>
  <div class="amount-box">
    <div class="amount">${amount}</div>
    <div class="amount-label">${record.giving_type?.replace(/_/g, ' ').toUpperCase()}</div>
  </div>
  <div class="details">
    <div class="detail-row"><span class="detail-label">Donor</span><span class="detail-value">${memberName}</span></div>
    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${date}</span></div>
    <div class="detail-row"><span class="detail-label">Payment Method</span><span class="detail-value">${record.payment_method?.replace(/_/g, ' ')}</span></div>
    <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${record.payment_status}</span></div>
    <div class="detail-row"><span class="detail-label">Receipt No.</span><span class="detail-value">${receiptNumber}</span></div>
  </div>
  <div class="thank-you">Thank you for your generous giving!</div>
  <div class="footer">
    <p>${churchName} &bull; ${tenant?.contact_email ?? ''}</p>
    <p>This receipt is valid for tax purposes.</p>
  </div>
</body>
</html>`;

    // Store HTML as receipt in storage
    const fileName = `receipts/${giving_record_id}.html`;
    const { error: uploadErr } = await supabase.storage
      .from('giving-receipts')
      .upload(fileName, new Blob([html], { type: 'text/html' }), { upsert: true });
    if (uploadErr) throw uploadErr;

    // Get signed URL (valid 1 hour)
    const { data: urlData, error: urlErr } = await supabase.storage
      .from('giving-receipts')
      .createSignedUrl(fileName, 3600);
    if (urlErr) throw urlErr;

    // Update giving record with receipt URL
    await supabase.from('giving_records').update({ receipt_url: urlData.signedUrl }).eq('id', giving_record_id);

    return new Response(JSON.stringify({ receipt_url: urlData.signedUrl }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('generate-receipt error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
