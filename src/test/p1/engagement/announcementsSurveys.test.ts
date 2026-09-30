import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const allMigrations = () => readdirSync(resolve(process.cwd(), 'supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .map((name) => source(`supabase/migrations/${name}`))
  .join('\n');

describe('P1 A5 Announcements + Surveys contract', () => {
  it('tenant-scopes announcement admin mutations and blocks read-only writes in nested surfaces', () => {
    const page = source('src/pages/communications/Announcements.tsx');
    const feed = source('src/components/announcements/AnnouncementFeedAdmin.tsx');
    const drawer = source('src/components/announcements/PostAnnouncementDrawer.tsx');
    const card = source('src/components/announcements/AnnouncementCardAdmin.tsx');

    expect(page).toContain('readOnly={readOnly}');
    expect(feed).toContain('readOnly: boolean');
    expect(feed).toContain('if (readOnly) throw new Error("Read-only access");');
    expect(feed).toMatch(/ANNOUNCEMENTS\)[\s\S]*?\.update\([\s\S]*?\.eq\("id", id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(feed).toMatch(/ANNOUNCEMENTS\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\("id", id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(drawer).toContain('readOnly: boolean');
    expect(drawer).toContain('if (readOnly) throw new Error("Read-only access");');
    expect(drawer).toMatch(/\.update\([\s\S]*?\.eq\("id", editData\.id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(card).toContain('readOnly: boolean');
  });

  it('keeps announcement audience, reactions, comments and read receipts enforced at the database boundary', () => {
    const member = source('src/pages/member/MemberAnnouncements.tsx');
    const receipt = source('src/hooks/useReadReceipt.ts');
    const card = source('src/components/announcements/AnnouncementCardMember.tsx');
    const migrations = allMigrations();

    expect(member).toContain('.eq(COLS.TENANT_ID, member.tenantId)');
    expect(receipt).toContain('tenant_id: member.tenantId');
    expect(card).toContain('useReadReceipt(announcement.id');
    expect(migrations).toContain('create or replace function private.member_can_view_announcement');
    expect(migrations).toContain("a.audience = 'specific_group'");
    expect(migrations).toContain("a.audience = 'leaders_only'");
    expect(migrations).toContain('announcement_reactions_announcement_tenant_fkey');
    expect(migrations).toContain('announcement_comments_announcement_tenant_fkey');
    expect(migrations).toContain('announcement_read_receipts_announcement_tenant_fkey');
    expect(migrations).toContain('announcement_attachments_announcement_tenant_fkey');
    expect(migrations).toMatch(/announcement_reactions_member_insert[\s\S]*?a\.tenant_id=tenant_id[\s\S]*?a\.reactions_enabled/);
    expect(migrations).toMatch(/announcement_comments_member_insert[\s\S]*?a\.tenant_id=tenant_id[\s\S]*?a\.comments_enabled/);
  });

  it('uses staff-only read/write helpers instead of generic tenant membership for engagement admin data', () => {
    const migrations = allMigrations();

    expect(migrations).toContain('create or replace function private.can_read_engagement_staff');
    expect(migrations).toMatch(/can_read_engagement_staff[\s\S]*?from public\.users u[\s\S]*?not in \('member','guest'\)/);
    expect(migrations).toContain('create or replace function private.can_manage_engagement_staff');
    expect(migrations).toContain("private.can_write_permission(p_tenant_id, 'communication_tools')");
    expect(migrations).toContain('using (private.can_read_engagement_staff(tenant_id))');
    expect(migrations).toContain('using (private.can_manage_engagement_staff(tenant_id))');
  });

  it('enforces survey audience and canonical question/response persistence', () => {
    const surveys = source('src/pages/communications/Surveys.tsx');
    const member = source('src/pages/member/MemberSurveys.tsx');
    const take = source('src/pages/public/SurveyTake.tsx');
    const responses = source('src/pages/communications/SurveyResponses.tsx');
    const migrations = allMigrations();

    expect(surveys).toContain('questions: questions as unknown as Json');
    expect(surveys).toMatch(/\.update\([\s\S]*?\.eq\("id", editingSurvey\.id\)[\s\S]*?\.eq\("tenant_id", tenantId\)/);
    expect(surveys).toMatch(/\.update\(\{ is_published: published \}[\s\S]*?\.eq\("id", id\)[\s\S]*?\.eq\("tenant_id", tenantId\)/);
    expect(surveys).toMatch(/\.delete\(\)\.eq\("id", id\)[\s\S]*?\.eq\("tenant_id", tenantId\)/);
    expect(member).toContain('.eq("tenant_id", member.churchId)');
    expect(take).toContain('submit_survey_response');
    expect(take).toContain('p_responses: answers as any');
    expect(take).toContain('const questions: Question[] = Array.isArray(survey.questions) ? survey.questions : []');
    expect(responses).toContain('const questions: any[] = Array.isArray(survey.questions) ? survey.questions : []');
    expect(migrations).toContain('create or replace function private.member_can_view_survey');
    expect(migrations).toMatch(/s\.target_audience\s*=\s*'group'/);
    expect(migrations).toContain('survey_responses_survey_tenant_fkey');
    expect(migrations).toContain('survey_responses_member_tenant_fkey');
  });

  it('removes exposed security-definer counter RPC warnings', () => {
    const migrations = allMigrations();

    expect(migrations).toContain('create or replace function private.increment_announcement_type_usage');
    expect(migrations).toContain('create or replace function private.increment_survey_view_count');
    expect(migrations).toMatch(/create or replace function public\.increment_announcement_type_usage[\s\S]*?security invoker/);
    expect(migrations).toMatch(/create or replace function public\.increment_survey_view_count[\s\S]*?security invoker/);
  });
});
