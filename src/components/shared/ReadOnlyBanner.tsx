import { Lock } from 'lucide-react';

const AREA_LABELS: Record<string, string> = {
  member_management: 'Member Management', financial_records: 'Financial Records',
  event_management: 'Event Management', communication_tools: 'Communication Tools',
  reports_analytics: 'Reports & Analytics', attendance: 'Attendance',
  groups_ministries: 'Groups & Ministries', church_settings: 'Church Settings',
};

interface ReadOnlyBannerProps {
  section?: string;
  /** Permission area key; used as the label when `section` is not given. */
  permission?: string;
}

export function ReadOnlyBanner({ section: sectionProp, permission }: ReadOnlyBannerProps) {
  const section = sectionProp ?? (permission ? AREA_LABELS[permission] ?? permission : undefined);
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
      <Lock className="h-4 w-4 shrink-0" />
      <p className="text-sm font-medium">
        Read Only Access{section ? ` — ${section}` : ''}.
        Contact your church admin to enable editing.
      </p>
    </div>
  );
}
