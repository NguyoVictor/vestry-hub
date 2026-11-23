import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useChurch } from '@/contexts/ChurchContext';

// 'none' comes from custom roles (T16). Effective levels are computed on the
// server (public.my_permission_levels): per-person override, else the most
// generous level among the person's custom roles, else 'default'. The same
// rule backs private.can_write_permission, so the UI and the database agree.
export type PermissionLevel = 'default' | 'read_only' | 'full_access' | 'none';

export const PERMISSION_KEYS = [
  'member_management', 'financial_records', 'event_management', 'communication_tools',
  'reports_analytics', 'attendance', 'groups_ministries', 'church_settings',
] as const;

export const PERMISSION_PATHS: Record<string, string[]> = {
  member_management:   ['/members', '/families', '/childrens-ministry', '/visitors', '/follow-up-tasks', '/new-converts'],
  financial_records:   ['/giving-records', '/church-expenses', '/budget-management', '/payroll', '/fund-accounting', '/accounts-payable', '/general-ledger', '/payouts', '/give-online', '/pledge-campaigns'],
  event_management:    ['/services', '/events', '/volunteering', '/member-requests', '/board-meetings', '/facility-booking'],
  communication_tools: ['/communications', '/announcements', '/member-messaging', '/appointments', '/testimonies', '/surveys'],
  reports_analytics:   ['/reports'],
  attendance:          ['/settings/attendance'],
  groups_ministries:   ['/groups', '/house-fellowships'],
  church_settings:     ['/settings', '/branches'],
};

// Personal pages that stay reachable even with no access to Church Settings.
const ALWAYS_ALLOWED = ['/settings/preferences', '/settings/notifications'];

/** The permission area a page belongs to (most specific prefix wins), or null. */
export function permissionKeyForPath(pathname: string): string | null {
  if (ALWAYS_ALLOWED.some(p => pathname === p || pathname.startsWith(`${p}/`))) return null;
  let best: { key: string; len: number } | null = null;
  for (const [key, prefixes] of Object.entries(PERMISSION_PATHS)) {
    for (const p of prefixes) {
      if ((pathname === p || pathname.startsWith(`${p}/`)) && (!best || p.length > best.len)) best = { key, len: p.length };
    }
  }
  return best?.key ?? null;
}

interface LevelsReply { is_admin: boolean; levels: Record<string, PermissionLevel>; roles: string[] }

export function usePermissions() {
  const { tenantId, userId, userRole } = useChurch();

  const isAdmin = userRole === 'super_admin' || userRole === 'church_admin';

  const { data, isLoading } = useQuery({
    queryKey: ['my-permission-levels', tenantId, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_permission_levels', { p_tenant_id: tenantId! });
      if (error) throw error;
      return data as unknown as LevelsReply;
    },
    enabled: !!userId && !!tenantId && !isAdmin,
    staleTime: 60_000,
  });

  const getLevel = (key: string): PermissionLevel => {
    if (isAdmin) return 'full_access';
    return data?.levels?.[key] ?? 'default';
  };

  // 'none' is also read-only for any page that still renders.
  const isReadOnly = (key: string): boolean => {
    const level = getLevel(key);
    return level === 'read_only' || level === 'none';
  };

  const isNoAccess = (key: string): boolean => getLevel(key) === 'none';

  const isFullAccess = (key: string): boolean => {
    if (isAdmin) return true;
    const level = getLevel(key);
    return level === 'full_access' || level === 'default';
  };

  const permissions = Object.entries(data?.levels ?? {}).map(([permission_key, level]) => ({ permission_key, level }));

  return {
    getLevel,
    isReadOnly,
    isNoAccess,
    isFullAccess,
    isLoading,
    isAdmin,
    permissions,
    roles: data?.roles ?? [],
  };
}
