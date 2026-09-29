import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrations = [
  '20260923085731_p1_people_schema_reconciliation.sql',
  '20260923085835_p1_people_fk_index_hardening.sql',
  '20260923090855_p1_people_member_session_policies.sql',
  '20260923091126_p1_people_member_directory_edge_cutover.sql',
  '20260923091326_p1_people_admin_only_privileges.sql',
  '20260923100304_p1_people_permission_parity.sql',
  '20260923101137_p1_permission_policy_cleanup.sql',
];

function migrationSource(name: string) {
  return readFileSync(resolve(process.cwd(), 'supabase/migrations', name), 'utf8');
}

describe('P1 People schema contract', () => {
  it('defines every canonical People table restored by P1', () => {
    const source = migrationSource(migrations[0]);
    const required = [
      'join_requests',
      'fellowship_attendance',
      'children',
      'children_classes',
      'children_checkins',
      'children_qr_codes',
      'children_ministry_settings',
    ];

    for (const table of required) {
      expect(source).toContain(`public.${table}`);
      expect(source).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it('uses tenant-consistent foreign keys for member self-service records', () => {
    const source = migrationSource(migrations[0]);

    expect(source).toContain('foreign key(group_id,tenant_id) references public.groups(id,tenant_id)');
    expect(source).toContain('foreign key(member_id,tenant_id) references public.members(id,tenant_id)');
    expect(source).toContain('foreign key(fellowship_id,tenant_id) references public.house_fellowships(id,tenant_id)');
    expect(source).toContain('foreign key(child_id,tenant_id) references public.children(id,tenant_id)');
  });

  it('limits anonymous People writes to explicit member-session flows', () => {
    const source = migrationSource(migrations[0]);
    const sessions = migrationSource(migrations[2]);
    const adminOnly = migrationSource(migrations[4]);

    expect(source).toContain('private.member_session_member_id(tenant_id)');
    expect(source).toContain('private.member_session_has_tenant(tenant_id)');
    expect(sessions).toContain('revoke insert,update,delete on table public.groups from anon');
    expect(sessions).toContain('revoke insert,update,delete on table public.house_fellowships from anon');
    expect(adminOnly).toContain('revoke all on table public.visitors from anon');
    expect(adminOnly).toContain('revoke all on table public.follow_up_tasks from anon');
    expect(adminOnly).toContain('revoke all on table public.new_converts from anon');
  });

  it('enforces read-only Admin permissions at the database write boundary', () => {
    const source = migrationSource(migrations[5]);

    expect(source).toContain("private.can_write_permission(p_tenant_id, 'member_management')");
    expect(source).toContain("private.can_write_permission(p_tenant_id, 'groups_ministries')");
    expect(source).toContain('with check (private.can_manage_people(tenant_id))');
    expect(source).toContain('with check (private.can_manage_groups(tenant_id))');
  });
});
