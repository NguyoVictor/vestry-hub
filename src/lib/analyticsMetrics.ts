import { supabase } from '@/integrations/supabase/client';

export type CanonicalAnalyticsMetrics = {
  snapshot: {
    active_members: number;
    active_groups: number;
  };
  range: {
    from: string;
    to: string;
    new_members: number;
    confirmed_giving: number;
    approved_expenses: number;
    net_surplus: number;
    published_events: number;
    attendance_total: number;
    visitors: number;
    converted_visitors: number;
    visitor_conversion_rate: number;
    volunteer_assignments: number;
    volunteer_hours: number;
    engagement_actions: number;
    engagement: {
      announcement_reactions: number;
      announcement_comments: number;
      announcement_reads: number;
      survey_responses: number;
      completed_appointments: number;
      published_testimonies: number;
    };
  };
  dashboard: {
    as_of: string;
    giving_today: number;
    giving_current_month: number;
    upcoming_events_7d: number;
  };
};

export async function fetchCanonicalAnalyticsMetrics(
  tenantId: string,
  fromDate: string,
  toDate: string,
  asOfDate = toDate,
): Promise<CanonicalAnalyticsMetrics> {
  const { data, error } = await (supabase as any).rpc('get_canonical_analytics_metrics', {
    p_tenant_id: tenantId,
    p_from_date: fromDate,
    p_to_date: toDate,
    p_as_of_date: asOfDate,
  });

  if (error) throw error;
  return data as CanonicalAnalyticsMetrics;
}
