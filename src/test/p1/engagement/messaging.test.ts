import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const allMigrations = () => readdirSync(resolve(process.cwd(), 'supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .map((name) => source(`supabase/migrations/${name}`))
  .join('\n');

describe('P1 A7 Messaging contract', () => {
  it('enforces participant-only conversation, participant and message visibility', () => {
    const migrations = allMigrations();
    expect(migrations).toContain('create or replace function private.messaging_actor_id');
    expect(migrations).toContain('create or replace function private.messaging_is_participant');
    expect(migrations).toMatch(/conversations_participant_read[\s\S]*?messaging_can_view_conversation/);
    expect(migrations).toMatch(/conversation_participants_participant_read[\s\S]*?messaging_can_view_conversation/);
    expect(migrations).toMatch(/messages_participant_read[\s\S]*?messaging_is_participant/);
    expect(migrations).toContain('drop policy if exists messages_tenant_rls on public.messages');
  });

  it('binds sender identity, reply targets and reactions to the same tenant conversation', () => {
    const migrations = allMigrations();
    expect(migrations).toContain('guard_message_identity');
    expect(migrations).toMatch(/v_actor := private\.messaging_actor_id\(new\.tenant_id\)[\s\S]*?new\.sender_id := v_actor/);
    expect(migrations).toContain('messages_conversation_tenant_fkey');
    expect(migrations).toContain('messages_reply_conversation_tenant_fkey');
    expect(migrations).toContain('message_reactions_message_tenant_conversation_fkey');
    expect(migrations).toMatch(/message_reactions_participant_insert[\s\S]*?messaging_actor_id/);
  });

  it('moves unread counters and conversation metadata to database-controlled functions/triggers', () => {
    const staff = source('src/pages/communications/MemberMessaging.tsx');
    const member = source('src/pages/member/MemberMessages.tsx');
    const migrations = allMigrations();
    expect(staff).toContain("rpc('mark_messaging_conversation_read'");
    expect(member).toContain("rpc('mark_messaging_conversation_read'");
    expect(staff).not.toContain('batch_increment_unread_count');
    expect(member).not.toContain('batch_increment_unread_count');
    expect(migrations).toContain('messaging_message_after_insert');
    expect(migrations).toContain('create or replace function public.mark_messaging_conversation_read');
    expect(migrations).toMatch(/public\.mark_messaging_conversation_read[\s\S]*?security invoker/);
  });

  it('stores attachment object paths and uses signed URLs with participant-scoped storage policies', () => {
    const staff = source('src/pages/communications/MemberMessaging.tsx');
    const member = source('src/pages/member/MemberMessages.tsx');
    const migrations = allMigrations();
    expect(staff).toContain('createSignedUrl(msg.attachment_url');
    expect(member).toContain('createSignedUrl(msg.attachment_url');
    expect(staff).not.toContain('getPublicUrl(data.path)');
    expect(member).not.toContain('getPublicUrl(data.path)');
    expect(staff).toMatch(/const path = `\$\{tenantId\}\/\$\{conv\.id\}\/\$\{userId\}\//);
    expect(member).toMatch(/const path = `\$\{member\.churchId\}\/\$\{selectedConvId\}\/\$\{member\.userId\}\//);
    expect(migrations).toContain('message_attachments_participant_read');
    expect(migrations).toContain('message_attachments_actor_insert');
  });

  it('keeps realtime subscriptions conversation-filtered and server-authorized', () => {
    const staff = source('src/pages/communications/MemberMessaging.tsx');
    const member = source('src/pages/member/MemberMessages.tsx');
    expect(staff).toContain('filter: `conversation_id=eq.${conv.id}`');
    expect(member).toContain('filter: `conversation_id=eq.${selectedConvId}`');
    expect(staff).not.toContain('filter: `tenant_id=eq.${tenantId}` }, () =>');
    expect(member).not.toContain('filter: `tenant_id=eq.${member.churchId}`');
  });
  it('uses safe messaging directories instead of tenant-wide user/member lookups', () => {
    const staff = source('src/pages/communications/MemberMessaging.tsx');
    const member = source('src/pages/member/MemberMessages.tsx');
    const migrations = allMigrations();
    expect(staff).toContain('get_messaging_actor_directory');
    expect(member).toContain('get_messaging_actor_directory');
    expect(member).toContain('get_messaging_staff_directory');
    expect(migrations).toContain('create or replace function private.get_messaging_actor_directory');
    expect(migrations).toContain('create or replace function private.get_messaging_staff_directory');
  });

  it('adds member session headers to storage and enables realtime publication for messaging tables', () => {
    const client = source('src/integrations/supabase/client.ts');
    const migrations = allMigrations();
    expect(client).toContain('requestUrl.includes("/storage/v1/")');
    expect(migrations).toContain('alter publication supabase_realtime add table public.messages');
    expect(migrations).toContain('alter publication supabase_realtime add table public.message_reactions');
    expect(migrations).toContain('alter publication supabase_realtime add table public.conversation_participants');
  });

  it('keeps staff directory creation compatible with deployed server-managed threads', () => {
    const migrations = allMigrations();
    expect(migrations).toMatch(/new\.type='direct'[\s\S]*?not coalesce\(new\.is_staff_directory,false\)[\s\S]*?new\.staff_user_id is not null/);
  });

});
