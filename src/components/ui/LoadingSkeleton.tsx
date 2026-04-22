import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SkeletonVariant = "card" | "stat" | "table" | "list" | "form" | "page-header";

interface LoadingSkeletonProps {
  variant: SkeletonVariant;
  /** Number of repeated items (for table/list variants) */
  count?: number;
  className?: string;
}

/**
 * Pre-built shimmer skeleton layouts for common loading states.
 * Always use this instead of blank white space while data is loading.
 *
 * @example
 * {isLoading ? <LoadingSkeleton variant="table" count={5} /> : <MyTable data={data} />}
 */
export function LoadingSkeleton({ variant, count = 5, className }: LoadingSkeletonProps) {
  switch (variant) {
    // ── Single card ──────────────────────────────────────────────────────────
    case "card":
      return (
        <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3", className)}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      );

    // ── Stat card ────────────────────────────────────────────────────────────
    case "stat":
      return (
        <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4", className)}>
          <div className="flex items-start justify-between">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      );

    // ── Table rows ───────────────────────────────────────────────────────────
    case "table":
      return (
        <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", className)}>
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex gap-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          {/* Rows */}
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3.5 border-b border-slate-100 last:border-0"
            >
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      );

    // ── List items ───────────────────────────────────────────────────────────
    case "list":
      return (
        <div className={cn("space-y-3", className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3"
            >
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      );

    // ── Form fields ──────────────────────────────────────────────────────────
    case "form":
      return (
        <div className={cn("space-y-5", className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      );

    // ── Page header ──────────────────────────────────────────────────────────
    case "page-header":
      return (
        <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
      );

    default:
      return <Skeleton className={cn("h-10 w-full", className)} />;
  }
}

/**
 * Grid of stat card skeletons — convenience wrapper for dashboard pages.
 *
 * @example
 * {isLoading ? <StatCardSkeletons count={4} /> : <StatsRow data={stats} />}
 */
export function StatCardSkeletons({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <LoadingSkeleton key={i} variant="stat" />
      ))}
    </div>
  );
}
