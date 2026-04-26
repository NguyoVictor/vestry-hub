import { motion } from "framer-motion";
import { AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import { Button } from "@/components/ui/button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface StorageBarProps {
  usedBytes: number;
  limitBytes: number;
  planName: string;
  onUpgrade: () => void;
  compact?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StorageBar({
  usedBytes,
  limitBytes,
  planName,
  onUpgrade,
  compact = false,
  className,
}: StorageBarProps) {
  const percentage = limitBytes > 0 ? Math.min((usedBytes / limitBytes) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isOverLimit = percentage >= 100;

  const barColor = isOverLimit
    ? "bg-red-600"
    : percentage >= 90
    ? "bg-red-500"
    : percentage >= 70
    ? "bg-amber-500"
    : "bg-violet-500";

  // ── Compact variant ──────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 min-w-0", className)}>
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-[60px]">
          <motion.div
            className={cn("h-full rounded-full", barColor)}
            initial={{ width: "0%" }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.3 }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          {formatBytes(usedBytes)} / {formatBytes(limitBytes)}
        </span>
        {(isNearLimit || isOverLimit) && (
          <button
            onClick={onUpgrade}
            className="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 shrink-0 underline"
          >
            Upgrade
          </button>
        )}
      </div>
    );
  }

  // ── Full variant ─────────────────────────────────────────────────────────
  return (
    <div className={cn("space-y-2 font-jakarta", className)}>
      {/* Over-limit banner */}
      {isOverLimit && (
        <BlurFadeIn>
          <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                Storage limit reached. New uploads are blocked.
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                Upgrade your plan to continue uploading media.
              </p>
            </div>
            <Button
              size="sm"
              onClick={onUpgrade}
              className="bg-red-500 hover:bg-red-600 text-white shrink-0"
            >
              Upgrade Storage
            </Button>
          </div>
        </BlurFadeIn>
      )}

      {/* Near-limit warning chip */}
      {isNearLimit && !isOverLimit && (
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
          <TrendingUp className="h-3.5 w-3.5" />
          ⚠ You're using {Math.round(percentage)}% of your storage — running low
        </div>
      )}

      {/* Row 1: label + plan badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          Storage
        </span>
        <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-400">
          {planName} Plan
        </span>
      </div>

      {/* Row 2: progress bar */}
      {!isOverLimit && (
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full transition-colors duration-500", barColor)}
            initial={{ width: "0%" }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.3 }}
          />
        </div>
      )}

      {/* Row 3: usage text + upgrade button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatBytes(usedBytes)} of {formatBytes(limitBytes)} used
        </span>
        {(isNearLimit || isOverLimit) && !isOverLimit && (
          <button
            onClick={onUpgrade}
            className="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 underline"
          >
            Upgrade
          </button>
        )}
      </div>
    </div>
  );
}
