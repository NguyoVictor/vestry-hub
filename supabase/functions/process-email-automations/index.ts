import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { replacePlaceholders, getMemberPlaceholderData } from "../_shared/placeholder-replacer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailAutomation {
  id: string;
  tenant_id: string;
  automation_key: string;
  name: string;
  frequency: string;
  audience: string;
  template_id: string | null;
  config: Record<string, any>;
  last_sent_at: string | null;
  next_send_at: string | null;
}

interface Member {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  date_of_birth: string | null;
  status: string | null;
  tenant_id: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

// Calculate next send date based on frequency
function calculateNextSendDate(frequency: string, config: Record<string, any> = {}): Date {
  const now = new Date();
  
  switch (frequency?.toLowerCase()) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
    case 'monthly':
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    case '1 day before':
    case '1 day before event':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Check daily for events
    case '2 days before':
    case '2 days before event':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Check daily for events
    case '1 week before':
    case '1 week before event':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Check daily for events
    case 'immediately':
      return now; // For trigger-based automations
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to daily
  }
}

// Get audience members based on automation type and config
async function getAudienceMembers(
  supabase: any, 
  automation: EmailAutomation, 
  specificMemberId?: string
): Promise<Member[]> {
  const { tenant_id, automation_key, audience, config } = automation;
  
  // If specific member ID provided (for triggers), get just that member
  if (specificMemberId) {
    const { data } = await supabase
      .from('members')
      .select('id, first_name, last_name, email, date_of_birth, status, tenant_id')
      .eq('tenant_id', tenant_id)
      .eq('id', specificMemberId)
      .maybeSingle();
    return data ? [data] : [];
  }

  let query = supabase
    .from('members')
    .select('id, first_name, last_name, email, date_of_birth, status, tenant_id')
    .eq('tenant_id', tenant_id)
    .not('email', 'is', null);

  // Apply audience filters based on automation type
  switch (automation_key) {
    case 'birthday_greetings':
      const today = new Date();
      const { data: allBirthdayMembers } = await supabase
        .from('members')
        .select('id, first_name, last_name, email, date_of_birth, status, tenant_id')
        .eq('tenant_id', tenant_id)
        .not('email', 'is', null)
        .not('date_of_birth', 'is', null);

      const birthdayToday = (allBirthdayMembers || []).filter(m => {
        if (!m.date_of_birth) return false;
        const parts = m.date_of_birth.split('-');
        const dobMonth = parseInt(parts[1], 10);
        const dobDay = parseInt(parts[2], 10);
        const todayMonth = today.getUTCMonth() + 1;
        const todayDay = today.getUTCDate();
        return dobMonth === todayMonth && dobDay === todayDay;
      });

      const audienceType = automation.audience || 'Members Only';
      return audienceType === 'Members Only'
        ? birthdayToday.filter(m => m.status !== 'Visitor')
        : birthdayToday;

    case 'visitor_welcome':
    case 'visitor_service_reminders':
      query = query.eq('status', 'Visitor');
      
      if (automation_key === 'visitor_service_reminders') {
        // Get visitors from last N weeks
        const weeksAgo = config.duration_weeks || 4;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (weeksAgo * 7));
        query = query.gte('created_at', cutoffDate.toISOString());
      }
      break;

    case 'new_convert_milestones':
      query = query.eq('status', 'New Convert');
      break;

    case 'task_reminders':
      // This would need to join with follow_up_tasks table
      // For now, get assigned workers (members with specific roles)
      query = query.in('status', ['Active', 'Leader', 'Minister']);
      break;

    case 'ministerial_assignment_reminders':
      // Get ministers/leaders
      query = query.in('status', ['Minister', 'Leader', 'Pastor']);
      break;

    case 'event_reminders':
      // This would need to join with event registrations
      // For now, get all active members
      query = query.eq('status', 'Active');
      break;

    default:
      // Custom automations - apply audience filter
      switch (audience) {
        case 'All Visitors':
          query = query.eq('status', 'Visitor');
          break;
        case 'New Visitors':
          query = query.eq('status', 'Visitor');
          // Could add date filter for "new" visitors
          break;
        case 'New Converts':
          query = query.eq('status', 'New Convert');
          break;
        case 'All (Members & Visitors)':
          // No additional filter
          break;
        case 'Members Only':
        default:
          query = query.neq('status', 'Visitor');
          break;
      }
  }

  const { data } = await query;
  console.log(`Automation ${automation.automation_key} found ${data?.length ?? 0} members`);
  return (data || []) as Member[];
}

// Process a single automation
async function processAutomation(
  supabase: any, 
  automation: EmailAutomation, 
  specificMemberId?: string
): Promise<{ success: boolean; sent: number; error?: string }> {
  try {
    console.log(`Processing automation: ${automation.automation_key} for tenant: ${automation.tenant_id}`);

    // Get audience members
    const members = await getAudienceMembers(supabase, automation, specificMemberId);
    
    if (members.length === 0) {
      console.log(`No audience members found for automation: ${automation.automation_key}`);
      return { success: true, sent: 0 };
    }

    // Get email template
    let template: EmailTemplate | null = null;
    if (automation.template_id) {
      const { data: templateData } = await supabase
        .from('email_templates')
        .select('id, name, subject, body')
        .eq('id', automation.template_id)
        .eq('tenant_id', automation.tenant_id)
        .maybeSingle();
      template = templateData;
    }

    // If no custom template, use default based on automation type
    if (!template) {
      template = getDefaultTemplate(automation.automation_key);
    }

    if (!template) {
      console.log(`No template found for automation: ${automation.automation_key}`);
      return { success: false, error: 'No template available' };
    }

    // Get church details for placeholders
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, contact_email')
      .eq('id', automation.tenant_id)
      .maybeSingle();
    const churchName = tenant?.name || 'Your Church';

    // Prepare recipients with comprehensive placeholder data
    const recipients = [];
    for (const member of members.filter(m => m.email)) {
      const placeholderData = await getMemberPlaceholderData(supabase, automation.tenant_id, member.email!);
      
      recipients.push({
        email: member.email!,
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Member',
        placeholderData
      });
    }

    if (recipients.length === 0) {
      console.log(`No recipients with email addresses for automation: ${automation.automation_key}`);
      return { success: true, sent: 0 };
    }

    // Replace placeholders in template using first recipient's data for preview
    const samplePlaceholderData = recipients[0].placeholderData;
    const personalizedSubject = replacePlaceholders(template.subject, samplePlaceholderData);
    const personalizedBody = replacePlaceholders(template.body, samplePlaceholderData);

    // Call send-communication function
    const sendRes = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-communication`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          tenant_id: automation.tenant_id,
          channel: 'email',
          subject: template.subject, // Send original template, let send-communication handle personalization
          body: template.body,       // Send original template, let send-communication handle personalization
          recipients: recipients.map(r => ({
            email: r.email,
            first_name: r.first_name,
            last_name: r.last_name,
            name: r.name
          }))
        })
      }
    );

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error(`Failed to send emails for automation ${automation.automation_key}:`, errText);
      return { success: false, error: errText };
    }

    // Update automation record with last_sent_at and next_send_at
    const now = new Date().toISOString();
    const nextSend = calculateNextSendDate(automation.frequency, automation.config).toISOString();

    await supabase
      .from('email_automations')
      .update({
        last_sent_at: now,
        next_send_at: nextSend
      })
      .eq('id', automation.id);

    console.log(`Successfully sent ${recipients.length} emails for automation: ${automation.automation_key}`);
    return { success: true, sent: recipients.length };

  } catch (error) {
    console.error(`Error processing automation ${automation.automation_key}:`, error);
    return { success: false, error: String(error) };
  }
}

// Get default template for system automations
function getDefaultTemplate(automationKey: string): EmailTemplate | null {
  const templates: Record<string, EmailTemplate> = {
    visitor_welcome: {
      id: 'default_visitor_welcome',
      name: 'Visitor Welcome',
      subject: 'Welcome to {{church_name}}!',
      body: 'Dear {{first_name}},\n\nThank you for visiting {{church_name}}! We are so glad you joined us on {{current_date}} and hope you felt welcomed.\n\nWe would love to get to know you better. Please feel free to reach out to us at {{church_email}} if you have any questions.\n\nBlessings,\n{{church_name}} Team\n\n{{unsubscribe_link}}'
    },
    birthday_greetings: {
      id: 'default_birthday',
      name: 'Birthday Greeting',
      subject: 'Happy Birthday, {{first_name}}! 🎂',
      body: 'Dear {{first_name}},\n\nWishing you a wonderful birthday filled with joy, blessings, and God\'s love!\n\nMay this new year of life bring you closer to Him and all the desires of your heart.\n\nYou have been a valued member of {{church_name}} since {{member_since}}, and we are grateful for your presence in our community.\n\nHappy Birthday!\n\nWith love,\n{{church_name}}\n\n{{unsubscribe_link}}'
    },
    visitor_service_reminders: {
      id: 'default_visitor_reminder',
      name: 'Service Reminder',
      subject: 'You\'re Always Welcome at {{church_name}}',
      body: 'Dear {{first_name}},\n\nWe hope you\'re doing well! We wanted to remind you that you\'re always welcome at {{church_name}}.\n\nOur service times are:\n- Sunday: 9:00 AM & 11:00 AM\n- Wednesday: 7:00 PM\n\nWe would love to see you again! If you have any questions, please contact us at {{church_email}}.\n\nBlessings,\n{{church_name}}\n\n{{unsubscribe_link}}'
    },
    new_convert_milestones: {
      id: 'default_convert_milestone',
      name: 'New Convert Milestone',
      subject: 'Celebrating Your Journey with Christ',
      body: 'Dear {{first_name}},\n\nWe are so excited about your decision to follow Christ! This is just the beginning of an amazing journey.\n\nSince you joined {{church_name}} on {{member_since}}, we\'ve been praying for your spiritual growth and development.\n\nWe\'re here to support you every step of the way. Please don\'t hesitate to reach out to us at {{church_email}} if you have any questions.\n\nBlessings,\n{{church_name}}\n\n{{unsubscribe_link}}'
    },
    task_reminders: {
      id: 'default_task_reminder',
      name: 'Task Reminder',
      subject: 'Reminder: Follow-up Tasks',
      body: 'Dear {{first_name}},\n\nThis is a friendly reminder that you have follow-up tasks that need your attention.\n\nPlease log in to your dashboard to view and complete your assigned tasks.\n\nThank you for your faithful service to {{church_name}}!\n\nIf you need assistance, please contact us at {{church_email}}.\n\nBlessings,\n{{church_name}}\n\n{{unsubscribe_link}}'
    },
    ministerial_assignment_reminders: {
      id: 'default_ministerial_reminder',
      name: 'Ministry Assignment Reminder',
      subject: 'Upcoming Ministry Assignment',
      body: 'Dear {{first_name}},\n\nThis is a reminder about your upcoming ministry assignment at {{church_name}}.\n\nPlease review your schedule and prepare accordingly. If you have any questions, please contact the ministry coordinator at {{church_email}}.\n\nThank you for your faithful service!\n\nBlessings,\n{{church_name}}\n\n{{unsubscribe_link}}'
    },
    event_reminders: {
      id: 'default_event_reminder',
      name: 'Event Reminder',
      subject: 'Reminder: {{event_name}}',
      body: 'Dear {{first_name}},\n\nThis is a reminder about {{event_name}} that you registered for.\n\nEvent Details:\n- Date: {{event_date}}\n- Time: {{event_time}}\n- Location: {{event_location}}\n\nWe\'re looking forward to seeing you there!\n\nIf you have any questions, please don\'t hesitate to contact us at {{church_email}}.\n\nBlessings,\n{{church_name}}\n\n{{unsubscribe_link}}'
    }
  };

  return templates[automationKey] || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Parse request body for trigger-based calls
    let triggerData: { automation_key?: string; member_id?: string; tenant_id?: string; test?: boolean } = {};
    try {
      const body = await req.text();
      if (body) {
        triggerData = JSON.parse(body);
      }
    } catch {
      // Ignore parsing errors for cron calls
    }

    const now = new Date().toISOString();
    let processedCount = 0;
    let totalSent = 0;

    // If this is a trigger-based call (specific automation + member)
    if (triggerData.automation_key && triggerData.member_id && triggerData.tenant_id) {
      console.log(`Processing trigger: ${triggerData.automation_key} for member: ${triggerData.member_id}`);
      
      const { data: automation } = await supabase
        .from('email_automations')
        .select('*')
        .eq('tenant_id', triggerData.tenant_id)
        .eq('automation_key', triggerData.automation_key)
        .eq('is_active', true)
        .maybeSingle();

      if (automation) {
        const result = await processAutomation(supabase, automation, triggerData.member_id);
        if (result.success) {
          totalSent += result.sent;
          processedCount = 1;
        }
      }
    } else {
      // Regular cron job or test mode - process automations
      console.log(triggerData.test ? 'Processing test automations...' : 'Processing scheduled automations...');
      
      let automationsQuery = supabase
        .from('email_automations')
        .select('*')
        .eq('is_active', true);

      // If not test mode, only get due automations
      if (!triggerData.test) {
        automationsQuery = automationsQuery.or(`next_send_at.is.null,next_send_at.lte.${now}`);
      }

      const { data: automations } = await automationsQuery;

      if (automations && automations.length > 0) {
        console.log(`Found ${automations.length} automations to process`);

        for (const automation of automations) {
          console.log(`Processing: ${automation.automation_key}, members found will be logged`);
          const result = await processAutomation(supabase, automation);
          if (result.success) {
            totalSent += result.sent;
            processedCount++;
          }
        }
      }
    }

    console.log(`Processed ${processedCount} automations, sent ${totalSent} emails`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount, 
        sent: totalSent,
        timestamp: now
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in process-email-automations:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});