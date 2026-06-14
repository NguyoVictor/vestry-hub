import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useChurch } from '@/contexts/ChurchContext';

type PermissionLevel = 'default' | 'read_only' | 'full_access';

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

export function usePermissions() {
  const { tenantId, userId, userRole } = useChurch();

  const isAdmin = userRole === 'super_admin' || userRole === 'church_admin';

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['user-fine-perms', userId],
    queryFn: async () => {
      if (isAdmin) return [];
      const { data } = await supabase
        .from('user_fine_permissions')
        .select('permission_key, level')
        .eq('user_id', userId!)
        .eq('tenant_id', tenantId);
      return (data ?? []) as { permission_key: string; level: PermissionLevel }[];
    },
    enabled: !!userId && !!tenantId && !isAdmin,
    staleTime: 60_000,
  });

  const getLevel = (key: string): PermissionLevel => {
    if (isAdmin) return 'full_access';
    const perm = permissions.find(p => p.permission_key === key);
    return (perm?.level as PermissionLevel) ?? 'default';
  };

  const isReadOnly = (key: string): boolean => getLevel(key) === 'read_only';

  const isFullAccess = (key: string): boolean => {
    if (isAdmin) return true;
    const level = getLevel(key);
    return level === 'full_access' || level === 'default';
  };

  return {
    getLevel,
    isReadOnly,
    isFullAccess,
    isLoading,
    isAdmin,
    permissions,
  };
}
