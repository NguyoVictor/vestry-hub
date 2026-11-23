import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));
import { permissionKeyForPath } from '@/hooks/usePermissions';

describe('T16 page → permission area mapping', () => {
  it('maps pages to their area', () => {
    expect(permissionKeyForPath('/giving-records')).toBe('financial_records');
    expect(permissionKeyForPath('/payroll/123')).toBe('financial_records');
    expect(permissionKeyForPath('/members')).toBe('member_management');
    expect(permissionKeyForPath('/groups/abc')).toBe('groups_ministries');
    expect(permissionKeyForPath('/settings/general')).toBe('church_settings');
  });
  it('uses the most specific prefix', () => {
    expect(permissionKeyForPath('/settings/attendance')).toBe('attendance');
  });
  it('keeps personal settings and ungoverned pages reachable', () => {
    expect(permissionKeyForPath('/settings/preferences')).toBeNull();
    expect(permissionKeyForPath('/settings/notifications')).toBeNull();
    expect(permissionKeyForPath('/dashboard')).toBeNull();
    expect(permissionKeyForPath('/membersX')).toBeNull();
  });
});
