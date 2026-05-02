import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Loading skeleton components for different UI elements
 * Validates: Requirements 11.6 (loading skeletons during data fetching)
 */

interface SkeletonProps {
  className?: string;
}

export const SongCardSkeleton: React.FC<SkeletonProps> = ({ className }) => (
  <motion.div
    className={cn(
      'bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3',
      className
    )}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    {/* Cover art skeleton */}
    <Skeleton className="w-full aspect-square rounded-lg" />
    
    {/* Title skeleton */}
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    
    {/* Metadata skeleton */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-3 w-8" />
      <Skeleton className="h-3 w-12" />
    </div>
  </motion.div>
);

export const SongRowSkeleton: React.FC<SkeletonProps> = ({ className }) => (
  <motion.tr
    className={className}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <td className="px-4 py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </td>
    <td className="px-4 py-3">
      <Skeleton className="h-3 w-16" />
    </td>
    <td className="px-4 py-3">
      <Skeleton className="h-3 w-12" />
    </td>
    <td className="px-4 py-3">
      <Skeleton className="h-3 w-20" />
    </td>
    <td className="px-4 py-3">
      <Skeleton className="h-8 w-8 rounded" />
    </td>
  </motion.tr>
);

interface GridSkeletonProps {
  count?: number;
  className?: string;
}

export const SongGridSkeleton: React.FC<GridSkeletonProps> = ({ 
  count = 12, 
  className 
}) => (
  <div className={cn(
    'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
    className
  )}>
    {Array.from({ length: count }).map((_, index) => (
      <SongCardSkeleton key={`grid-skeleton-${index}`} />
    ))}
  </div>
);

export const SongListSkeleton: React.FC<GridSkeletonProps> = ({ 
  count = 10, 
  className 
}) => (
  <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm', className)}>
    <table className="w-full">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          <th className="px-4 py-3 text-left">
            <Skeleton className="h-3 w-16" />
          </th>
          <th className="px-4 py-3 text-left">
            <Skeleton className="h-3 w-12" />
          </th>
          <th className="px-4 py-3 text-left">
            <Skeleton className="h-3 w-10" />
          </th>
          <th className="px-4 py-3 text-left">
            <Skeleton className="h-3 w-16" />
          </th>
          <th className="px-4 py-3 text-left">
            <Skeleton className="h-3 w-8" />
          </th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: count }).map((_, index) => (
          <SongRowSkeleton key={`list-skeleton-${index}`} />
        ))}
      </tbody>
    </table>
  </div>
);

export const CommandPaletteSkeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={cn('space-y-3', className)}>
    {/* Search input skeleton */}
    <Skeleton className="h-10 w-full rounded-lg" />
    
    {/* Results skeleton */}
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={`search-skeleton-${index}`} className="flex items-center gap-3 p-2">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const SetlistSkeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={cn('space-y-4', className)}>
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-20" />
    </div>
    
    {/* Setlist items skeleton */}
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`setlist-skeleton-${index}`} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-8 rounded" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-6" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Progressive loading skeleton that shows different states
 */
interface ProgressiveSkeletonProps {
  stage: 'initial' | 'essential' | 'supplementary' | 'complete';
  className?: string;
}

export const ProgressiveSkeleton: React.FC<ProgressiveSkeletonProps> = ({
  stage,
  className
}) => {
  if (stage === 'complete') return null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Always show essential structure */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Show more detail as loading progresses */}
      {stage !== 'initial' && (
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      )}

      {/* Show supplementary details last */}
      {stage === 'supplementary' && (
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      )}
    </div>
  );
};