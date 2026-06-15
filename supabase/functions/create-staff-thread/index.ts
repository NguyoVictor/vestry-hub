import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { userId, tenantId, firstName, lastName } = await req.json();
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    // Check if thread already exists (same person returning)
    const { data: existingThread } = await adminClient
      .from('conversations')
      .select('id')
      .eq('staff_user_id', userId)
      .eq('is_staff_directory', true)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (existingThread) {
      return new Response(
        JSON.stringify({ ok: true, existing: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const welcomeName = `${firstName || ''} ${lastName || ''}`.trim() || 'Staff';
    const welcomeMsg = `Hi! I'm ${welcomeName}. Feel free to reach out with any questions, prayer requests, or concerns. 🙏`;
    // Create staff directory thread
    const { data: newConv, error: convError } = await adminClient
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        type: 'direct',
        is_staff_directory: true,
        staff_user_id: userId,
        created_by: userId,
        status: 'open',
        last_message_preview: welcomeMsg.slice(0, 100),
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (convError || !newConv) throw convError || new Error('Failed to create conversation');
    // Add admin to conversation_participants
    await adminClient.from('conversation_participants').insert({
      conversation_id: newConv.id,
      user_id: userId,
      unread_count: 0,
      joined_at: new Date().toISOString(),
    });
    // Insert welcome message
    await adminClient.from('messages').insert({
      tenant_id: tenantId,
      conversation_id: newConv.id,
      sender_id: userId,
      body: welcomeMsg,
      status: 'sent',
    });
    return new Response(
      JSON.stringify({ ok: true, existing: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
