import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useChurch } from '@/contexts/ChurchContext';
import { PLANS } from '@/config/plans';
import { TABLES } from '@/lib/schema';

export function useSubscription() {
  const { tenantId } = useChurch();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.TENANT_SUBSCRIPTIONS)
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  const plan = PLANS[subscription?.plan as keyof typeof PLANS ?? 'free'];

  const { data: catalog = [] } = useQuery({
    queryKey: ['subscription-catalog'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('subscription_catalog')
        .select('product_code, product_type, plan_key, addon_key, name, amount_kes, billing_period, entitlements, sort_order')
        .eq('active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  const catalogByCode = Object.fromEntries(catalog.map((item: any) => [item.product_code, item]));

  // Get real member count
  const { data: memberCount = 0 } = useQuery({
    queryKey: ['member-count', tenantId],
    queryFn: async () => {
      const { count } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      return count ?? 0;
    },
    staleTime: 10_000,
  });

  // Get real staff count
  const { data: staffCount = 0 } = useQuery({
    queryKey: ['staff-count', tenantId],
    queryFn: async () => {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .neq('role', 'member')
        .eq('status', 'active'); // Count non-member users as staff
      return count ?? 0;
    },
    staleTime: 10_000,
  });

  // Effective limits (plan + addons)
  const limits = {
    members: (subscription?.member_limit ?? 100) + (subscription?.member_addons ?? 0),
    staff: subscription?.staff_limit ?? 3,
    branches: subscription?.branch_limit ?? 1,
    storage_gb: (subscription?.storage_limit_gb ?? 2) + (subscription?.storage_addons_gb ?? 0),
    sms: (subscription?.sms_credits ?? 0) + (subscription?.sms_addons ?? 0),
    email: (subscription?.email_credits ?? 100) + (subscription?.email_addons ?? 0),
    ai: (subscription?.ai_credits ?? 0) + (subscription?.ai_addons ?? 0),
  };

  // Usage
  const usage = {
    members: memberCount,
    staff: staffCount,
    storage_gb: subscription?.storage_used_gb ?? 0,
    sms: subscription?.sms_used ?? 0,
    email: subscription?.email_used ?? 0,
    ai: subscription?.ai_used ?? 0,
  };

  // Checkers
  const canAddMember = usage.members < limits.members;
  const canAddStaff = usage.staff < limits.staff;
  const canSendSms = usage.sms < limits.sms;
  const canSendEmail = usage.email < limits.email;
  const canUseAi = usage.ai < limits.ai;
  const hasMpesaGiving = plan.mpesa_giving;
  const hasSermonAi = plan.sermon_ai;

  return {
    subscription,
    plan,
    catalog,
    catalogByCode,
    limits,
    usage,
    isLoading,
    canAddMember,
    canAddStaff,
    canSendSms,
    canSendEmail,
    canUseAi,
    hasMpesaGiving,
    hasSermonAi
  };
}