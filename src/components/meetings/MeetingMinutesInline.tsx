/**
 * MeetingMinutesInline
 *
 * Renders MeetingMinutesPage with meetingId passed as a prop (no MemoryRouter needed).
 * The `inline` flag hides the back button and suppresses navigate() calls.
 */
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const MeetingMinutesPage = lazy(() => import('@/pages/operations/MeetingMinutes'));

interface Props {
  meetingId: string;
}

export function MeetingMinutesInline({ meetingId }: Props) {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    }>
      <MeetingMinutesPage meetingIdProp={meetingId} inline={true} />
    </Suspense>
  );
}
