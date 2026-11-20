// Phase 4 (Findings 7, 9, 25) schema + storage contract. Checks the columns
// each repaired flow WRITES against the generated schema (regenerated from
// staging xwbajophstetbnnemsyq after migration 20261120120000), the buckets
// the code uploads to against that migration, and that the ambiguous embeds
// (duplicate simple + composite tenant FKs → PostgREST HTTP 300) are pinned.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
const types = read('src/integrations/supabase/types.ts');
const migration = read('supabase/migrations/20261120120000_p4_storage_incidents_settings.sql');

function rowColumns(table: string): Set<string> {
  const publicStart = types.indexOf('public: {');
  const start = types.indexOf(`\n      ${table}: {\n        Row: {`, publicStart);
  if (start < 0) throw new Error(`table ${table} not in generated types`);
  const rowStart = types.indexOf('Row: {', start);
  const rowEnd = types.indexOf('\n        }', rowStart);
  return new Set([...types.slice(rowStart, rowEnd).matchAll(/^\s{10}(\w+)\??:/gm)].map((m) => m[1]));
}
const objectKeys = (src: string, marker: string) => {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error(`marker not found: ${marker}`);
  const body = src.slice(i + marker.length, src.indexOf('};', i));
  return [...body.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]);
};
const expectColumns = (table: string, cols: string[]) => {
  const have = rowColumns(table);
  for (const c of cols) expect(have.has(c), `${table}.${c} must exist`).toBe(true);
};

describe('Phase 4 contract (Findings 7, 9, 25)', () => {
  it('Finding 25: every column General Settings saves exists on tenants (incl. timezone)', () => {
    const src = read('src/pages/settings/GeneralSettings.tsx').replace(/\r/g, '');
    const keys = objectKeys(src, 'const payload: Record<string, any> = {');
    expect(keys).toContain('timezone');
    expectColumns('tenants', keys);
  });

  it('Finding 25: a failed logo upload stops the save instead of reporting success', () => {
    const src = read('src/pages/settings/GeneralSettings.tsx').replace(/\r/g, '');
    expect(src).toMatch(/if \(upErr\) throw new Error\(`Logo upload failed/);
    expect(src).not.toMatch(/if \(!upErr\) \{/);
  });

  it('Finding 9: every column the incident form writes exists; status history table exists', () => {
    const src = read('src/pages/security/IncidentManagement.tsx');
    const keys = objectKeys(src, 'const payload = {');
    expectColumns('incidents', [...keys, 'incident_number', 'attachment_paths', 'created_at']);
    expectColumns('incident_status_logs', ['id', 'incident_id', 'tenant_id', 'old_status', 'new_status', 'note', 'changed_at']);
    expect(types).toMatch(/incident_status_enum:[^\n]*"closed"/);
  });

  it('Finding 9: attachment failures are reported separately; private attachments open via signed URL', () => {
    const src = read('src/pages/security/IncidentManagement.tsx');
    expect(src).toMatch(/could not be uploaded: \$\{error\.message\}/);
    expect(src).toMatch(/from\("incident-attachments"\)\.createSignedUrl\(path, 60\)/);
  });

  it('Findings 7/9/25: every bucket the code uploads to is created by the migration with the right visibility', () => {
    expect(migration).toMatch(/\('facility-thumbnails', 'facility-thumbnails', true,/);
    expect(migration).toMatch(/\('incident-attachments', 'incident-attachments', false,/);
    expect(migration).toMatch(/\('church-logos', 'church-logos', true,/);
    // Writes are scoped to the uploader's tenant folder, never "any authenticated".
    for (const b of ['facility-thumbnails', 'incident-attachments', 'church-logos']) {
      const policies = [...migration.matchAll(new RegExp(`bucket_id = '${b}'[^;]*;`, 'g'))].map((m) => m[0]);
      expect(policies.length).toBeGreaterThanOrEqual(3);
      for (const p of policies) expect(p).toMatch(/storage\.foldername\(name\)\)\[1\]/);
    }
    expect(migration).not.toMatch(/church_logos[^;]*actor_has_tenant/);
  });

  it('Finding 7-B: ambiguous embeds are pinned to the simple FK (HTTP 300 otherwise)', () => {
    const pinned: Array<[string, string]> = [
      ['src/pages/operations/FacilityBooking.tsx', 'facility_images!facility_images_facility_id_fkey('],
      ['src/pages/member/MemberFacilityBooking.tsx', 'facility_images!facility_images_facility_id_fkey('],
      ['src/pages/public/PublicBookingPage.tsx', 'facility_images!facility_images_facility_id_fkey('],
      ['src/components/announcements/AnnouncementFeedAdmin.tsx', 'announcement_types!announcements_category_id_fkey('],
      ['src/pages/member/MemberAnnouncements.tsx', 'announcement_types!announcements_category_id_fkey('],
      ['src/pages/communications/Testimonies.tsx', 'members!testimonies_member_id_fkey('],
      ['src/pages/member/MemberTestimonies.tsx', 'testimony_reactions!testimony_reactions_testimony_id_fkey('],
      ['src/pages/member/MemberGroups.tsx', 'groups!group_members_group_id_fkey('],
      ['src/pages/people/MemberProfile.tsx', 'groups!group_members_group_id_fkey('],
      ['src/pages/member/MemberHome.tsx', 'volunteer_roles!volunteers_role_id_fkey('],
      ['src/pages/people/GroupDetail.tsx', 'members!join_requests_member_id_fkey('],
    ];
    for (const [f, s] of pinned) expect(read(f), f).toContain(s);
  });

  it('Finding 7-B: a failed facility load is shown as an error, not "No facilities found"', () => {
    const src = read('src/pages/operations/FacilityBooking.tsx');
    expect(src).toMatch(/\) : facError \? \(/);
    expect(src).toMatch(/Thumbnail upload failed: \$\{tErr\.message\}/);
  });
});
