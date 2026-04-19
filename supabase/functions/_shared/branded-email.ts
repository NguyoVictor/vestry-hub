import { createClient } from "jsr:@supabase/supabase-js@2";

export interface BrandedEmailOptions {
  tenantId: string;
  churchName: string;
  subject: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  supabaseClient: ReturnType<typeof createClient>;
}

interface EmailBranding {
  logo_url: string | null;
  sender_photo_url: string | null;
  sender_name: string | null;
  email_signature: string | null;
  primary_color: string;
  button_color: string;
  text_color: string;
  footer_text: string | null;
}

export async function buildBrandedEmail(opts: BrandedEmailOptions): Promise<string> {
  const { tenantId, churchName, subject, bodyHtml, ctaLabel, ctaUrl, supabaseClient } = opts;

  let branding: EmailBranding | null = null;
  try {
    const { data } = await supabaseClient
      .from("email_branding")
      .select("logo_url,sender_photo_url,sender_name,email_signature,primary_color,button_color,text_color,footer_text")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    branding = data as EmailBranding | null;
  } catch (_) { /* fall back to defaults */ }

  const primaryColor = branding?.primary_color  ?? "#4F46E5";
  const buttonColor  = branding?.button_color   ?? "#F97316";
  const textColor    = branding?.text_color     ?? "#1F2937";
  const logoUrl      = branding?.logo_url       ?? null;
  const senderPhoto  = branding?.sender_photo_url ?? null;
  const senderName   = branding?.sender_name    ?? null;
  const signature    = branding?.email_signature ?? null;
  const footerText   = branding?.footer_text    ??
    `${churchName} | You are receiving this because you are a member of ${churchName}.`;

  const headerHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${churchName}" style="max-height:60px;max-width:200px;object-fit:contain;" />`
    : `<span style="font-size:22px;font-weight:700;color:#ffffff;">${churchName}</span>`;

  const ctaHtml = ctaLabel && ctaUrl
    ? `<div style="margin:24px 0;">
        <a href="${ctaUrl}" style="display:inline-block;background:${buttonColor};color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${ctaLabel}</a>
       </div>`
    : "";

  const signatureHtml = (senderPhoto || senderName || signature)
    ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;align-items:flex-start;gap:12px;">
        ${senderPhoto ? `<img src="${senderPhoto}" alt="${senderName ?? ""}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;" />` : ""}
        <div>
          ${senderName ? `<p style="margin:0 0 4px;font-weight:600;font-size:14px;color:${textColor};">${senderName}</p>` : ""}
          ${signature ? `<div style="font-size:13px;color:#64748b;">${signature.replace(/\n/g, "<br/>")}</div>` : ""}
        </div>
       </div>`
    : "";

  const footerHtml = `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;">${footerText.replace(/\n/g, "<br/>")}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${primaryColor};padding:28px 32px;text-align:center;">
            ${headerHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:${textColor};font-size:15px;line-height:1.7;">
            ${bodyHtml}
            ${ctaHtml}
            ${signatureHtml}
            ${footerHtml}
          </td>
        </tr>
      </table>
      <p style="margin-top:16px;font-size:11px;color:#94a3b8;text-align:center;">Powered by Vestry Hub</p>
    </td></tr>
  </table>
</body>
</html>`;
}
