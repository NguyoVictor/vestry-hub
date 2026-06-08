/**
 * Comprehensive placeholder replacement utility for email templates
 */

export interface PlaceholderData {
  // Member data
  member_name?: string;
  first_name?: string;
  last_name?: string;
  member_email?: string;
  member_phone?: string;
  member_since?: string;
  
  // Church data
  church_name?: string;
  branch_name?: string;
  church_address?: string;
  church_phone?: string;
  church_email?: string;
  church_website?: string;
  
  // Event data (optional)
  event_name?: string;
  event_date?: string;
  event_time?: string;
  event_location?: string;
  
  // Giving data (optional)
  amount?: string;
  giving_type?: string;
  receipt_number?: string;
  giving_date?: string;
  
  // System data
  current_date?: string;
  current_year?: string;
  unsubscribe_link?: string;
}

export function replacePlaceholders(text: string, data: PlaceholderData): string {
  let result = text;
  
  // Define all possible placeholders with their values
  const placeholders = {
    // Member placeholders
    '{{member_name}}': data.member_name || '',
    '{{first_name}}': data.first_name || '',
    '{{last_name}}': data.last_name || '',
    '{{member_email}}': data.member_email || '',
    '{{member_phone}}': data.member_phone || '',
    '{{member_since}}': data.member_since || '',
    
    // Church placeholders
    '{{church_name}}': data.church_name || '',
    '{{branch_name}}': data.branch_name || '',
    '{{church_address}}': data.church_address || '',
    '{{church_phone}}': data.church_phone || '',
    '{{church_email}}': data.church_email || '',
    '{{church_website}}': data.church_website || '',
    
    // Event placeholders
    '{{event_name}}': data.event_name || '',
    '{{event_date}}': data.event_date || '',
    '{{event_time}}': data.event_time || '',
    '{{event_location}}': data.event_location || '',
    
    // Giving placeholders
    '{{amount}}': data.amount || '',
    '{{giving_type}}': data.giving_type || '',
    '{{receipt_number}}': data.receipt_number || '',
    '{{giving_date}}': data.giving_date || '',
    
    // System placeholders
    '{{current_date}}': data.current_date || new Date().toLocaleDateString(),
    '{{current_year}}': data.current_year || new Date().getFullYear().toString(),
    '{{unsubscribe_link}}': data.unsubscribe_link || '',
  };
  
  // Replace all placeholders
  Object.entries(placeholders).forEach(([placeholder, value]) => {
    const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
    result = result.replace(regex, value);
  });
  
  return result;
}

export async function getMemberPlaceholderData(
  supabaseClient: any,
  tenantId: string,
  memberEmail: string
): Promise<PlaceholderData> {
  // Get member details
  const { data: member } = await supabaseClient
    .from('members')
    .select('first_name, last_name, email, phone, created_at, date_of_birth')
    .eq('email', memberEmail)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  // Get church details
  const { data: church } = await supabaseClient
    .from('tenants')
    .select('name, contact_email, church_code, address, phone, website')
    .eq('id', tenantId)
    .maybeSingle();

  // Get branch details (first branch for now)
  const { data: branch } = await supabaseClient
    .from('branches')
    .select('name')
    .eq('tenant_id', tenantId)
    .limit(1)
    .maybeSingle();

  const firstName = member?.first_name || '';
  const lastName = member?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Member';

  return {
    // Member data
    member_name: fullName,
    first_name: firstName,
    last_name: lastName,
    member_email: memberEmail,
    member_phone: member?.phone || '',
    member_since: member?.created_at ? new Date(member.created_at).toLocaleDateString() : '',
    
    // Church data
    church_name: church?.name || 'Your Church',
    branch_name: branch?.name || '',
    church_address: church?.address || '',
    church_phone: church?.phone || '',
    church_email: church?.contact_email || '',
    church_website: church?.website || '',
    
    // System data
    current_date: new Date().toLocaleDateString(),
    current_year: new Date().getFullYear().toString(),
    unsubscribe_link: `${Deno.env.get("SUPABASE_URL")}/unsubscribe?email=${encodeURIComponent(memberEmail)}&tenant=${tenantId}`,
  };
}