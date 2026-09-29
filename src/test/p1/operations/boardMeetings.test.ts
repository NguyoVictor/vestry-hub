import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const allMigrations = () => readdirSync(resolve(process.cwd(), 'supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .map((name) => source(`supabase/migrations/${name}`))
  .join('\n');

describe('P1 Board Meetings + Jitsi contract', () => {
  it('keeps board meeting CRUD and attendee replacement tenant scoped', () => {
    const board = source('src/pages/operations/BoardMeetings.tsx');

    expect(board).toMatch(/board_meetings"\)\.update\(payload\)\.eq\("id", editingId\)[\s\S]*?\.eq\("tenant_id", tenantId!?\)/);
    expect(board).toMatch(/meeting_attendees"\)\.delete\(\)\.eq\("meeting_id", editingId\)[\s\S]*?\.eq\("tenant_id", tenantId!?\)/);
    expect(board).toContain('tenant_id: tenantId');
    expect(board).toMatch(/meeting_attendees"\)\.delete\(\)\.eq\("meeting_id", id\)[\s\S]*?\.eq\("tenant_id", tenantId!?\)/);
    expect(board).toMatch(/meeting_action_items"\)\.delete\(\)\.eq\("meeting_id", id\)[\s\S]*?\.eq\("tenant_id", tenantId!?\)/);
    expect(board).toMatch(/board_meetings"\)\.delete\(\)\.eq\("id", id\)[\s\S]*?\.eq\("tenant_id", tenantId!?\)/);
    expect(board).toMatch(/board_meetings"\)\.update\(\{ status \} as any\)\.eq\("id", id\)[\s\S]*?\.eq\("tenant_id", tenantId!?\)/);
  });

  it('tenant-scopes minutes, attendance, decisions, and action-item reads/writes', () => {
    const minutes = source('src/pages/operations/MeetingMinutes.tsx');

    expect(minutes).toMatch(/MEETING_ATTENDEES\)[\s\S]*?\.eq\("meeting_id", meetingId!\)[\s\S]*?\.eq\("tenant_id", tenantId\)/);
    expect(minutes).toMatch(/MEETING_ACTION_ITEMS\)[\s\S]*?\.eq\("meeting_id", meetingId!\)[\s\S]*?\.eq\("tenant_id", tenantId\)/);
    expect(minutes).toMatch(/MEETING_ATTENDEES\)[\s\S]*?\.update\(\{ is_present:[\s\S]*?\.eq\("id", a\.id\)[\s\S]*?\.eq\("tenant_id", tenantId\)/);
    expect(minutes).toMatch(/MEETING_DECISIONS\)\.delete\(\)\.in\("id", deletedDecisionIds\)[\s\S]*?\.eq\("tenant_id", tenantId\)/);
    expect(minutes).toMatch(/MEETING_ACTION_ITEMS\)\.delete\(\)\.in\("id", deletedActionIds\)[\s\S]*?\.eq\("tenant_id", tenantId\)/);
    expect(minutes).toContain('tenant_id: tenantId');
    expect(minutes).toMatch(/MEETING_ACTION_ITEMS\)\.update\([\s\S]*?\.eq\("id", a\.id\)[\s\S]*?\.eq\("tenant_id", tenantId\)/);
  });

  it('blocks ordinary members at the database boundary while preserving read-only staff reads', () => {
    const migrations = allMigrations();

    expect(migrations).toContain('create or replace function private.can_read_board_meetings');
    expect(migrations).toMatch(/can_read_board_meetings[\s\S]*?from public\.users u[\s\S]*?not in \('member', 'guest'\)/);
    expect(migrations).toContain('create or replace function private.can_manage_board_meetings');
    expect(migrations).toContain("private.can_manage_events(p_tenant_id)");
    expect(migrations).toContain('board_meetings_staff_read');
    expect(migrations).toContain('using (private.can_read_board_meetings(tenant_id))');
    expect(migrations).toContain('meeting_attendees_meeting_tenant_fkey');
    expect(migrations).toContain('meeting_minutes_meeting_tenant_fkey');
    expect(migrations).toContain('meeting_decisions_meeting_tenant_fkey');
    expect(migrations).toContain('meeting_action_items_meeting_tenant_fkey');
  });

  it('keeps Jitsi board rooms deterministic and inside the staff board surface', () => {
    const board = source('src/pages/operations/BoardMeetings.tsx');
    const room = source('src/components/meetings/MeetingRoomLayout.tsx');

    expect(board).toContain('roomName={`vestryhub-bm-${meeting.id}`}');
    expect(board).toContain('roomName={`vestryhub-bm-${m.id}`}');
    expect(room).toContain('`https://jitsi.riot.im/vestryhub-bm-${meetingId}`');
    expect(room).toContain('config.prejoinPageEnabled=false');
    expect(room).toContain('config.lobby.enabled=false');
  });
});
