import { Lock } from 'lucide-react';

interface ReadOnlyBannerProps {
  section?: string;
}

export function ReadOnlyBanner({ section }: ReadOnlyBannerProps) {
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
