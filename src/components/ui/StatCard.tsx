import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type TrendDirection = "up" | "down" | "neutral";
type CardColor = "orange" | "emerald" | "blue" | "amber" | "red" | "purple" | "slate";

interface StatCardProps {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Metric label */
  label: string;
  /** Numeric or string value to display */
  value: number | string;
  /** Optional sub-label below the value */
  sublabel?: string;
  /** Trend direction */
  trend?: TrendDirection;
  /** Trend percentage or label, e.g. "+12%" or "vs last month" */
  trendValue?: string;
  /** Color theme for the icon background */
  color?: CardColor;
  /** Whether to animate the number counting up on mount */
  animate?: boolean;
  /** Optional click handler */
  onClick?: () => void;
  className?: string;
}

const COLOR_MAP: Record<CardColor, { icon: string; bg: string }> = {
  orange:  { icon: "text-orange-500",  bg: "bg-orange-50" },
  emerald: { icon: "text-emerald-500", bg: "bg-emerald-50" },
  blue:    { icon: "text-blue-500",    bg: "bg-blue-50" },
  amber:   { icon: "text-amber-500",   bg: "bg-amber-50" },
  red:     { icon: "text-red-500",     bg: "bg-red-50" },
  purple:  { icon: "text-purple-500",  bg: "bg-purple-50" },
  slate:   { icon: "text-slate-500",   bg: "bg-slate-100" },
};

const TREND_MAP: Record<TrendDirection, { icon: LucideIcon; color: string }> = {
  up:      { icon: TrendingUp,   color: "text-emerald-600" },
  down:    { icon: TrendingDown, color: "text-red-500" },
  neutral: { icon: Minus,        color: "text-slate-400" },
};

/** Animated number counter — counts from 0 to `target` over `duration` ms */
function AnimatedNumber({ target, duration = 800 }: { target: number; duration?: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) =>
    Number.isInteger(target) ? Math.round(v).toLocaleString() : v.toFixed(1)
  );
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(motionVal, target, { duration: duration / 1000, ease: "easeOut" });
    const unsubscribe = rounded.on("change", (v) => {
      if (displayRef.current) displayRef.current.textContent = v;
    });
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [target]);

  return <span ref={displayRef}>0</span>;
}

/**
 * Stat card with animated number counter, trend indicator, and icon.
 *
 * @example
 * <StatCard
 *   icon={Users}
 *   label="Total Members"
 *   value={248}
 *   trend="up"
 *   trendValue="+12% this month"
 *   color="orange"
 * />
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  trend,
  trendValue,
  color = "orange",
  animate: shouldAnimate = true,
  onClick,
  className,
}: StatCardProps) {
  const colors = COLOR_MAP[color];
  const isNumeric = typeof value === "number";

  const TrendIcon = trend ? TREND_MAP[trend].icon : null;
  const trendColor = trend ? TREND_MAP[trend].color : "";

  return (
    <motion.div
      whileHover={onClick ? { y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" } : undefined}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border border-slate-200 shadow-sm p-5 font-jakarta",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Icon */}
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", colors.bg)}>
          <Icon className={cn("h-5 w-5", colors.icon)} />
        </div>

        {/* Trend badge */}
        {trend && trendValue && TrendIcon && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900 leading-none">
          {isNumeric && shouldAnimate ? (
            <AnimatedNumber target={value as number} />
          ) : (
            isNumeric ? (value as number).toLocaleString() : value
          )}
        </p>
        <p className="text-sm text-slate-500 mt-1.5">{label}</p>
        {sublabel && (
          <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>
        )}
      </div>
    </motion.div>
  );
}
