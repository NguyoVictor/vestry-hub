import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  indigo: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600" },
  amber: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600" },
  violet: { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-600" },
  red: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600" },
  cyan: { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600" },
};

interface Trend { value: number; direction: "up" | "down" | "neutral"; label: string; }

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: Trend;
  icon: LucideIcon;
  color: "indigo" | "emerald" | "amber" | "violet" | "red" | "cyan";
  chart?: React.ReactNode;
  valueClassName?: string;
}

export function AnalyticsCard({ title, value, subtitle, trend, icon: Icon, color, chart, valueClassName }: AnalyticsCardProps) {
  const colors = COLOR_MAP[color] || COLOR_MAP.indigo;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-lg", colors.bg)}>
            <Icon className={cn("h-5 w-5", colors.text)} />
          </div>
          {trend && (
            <span className={cn("inline-flex items-center text-xs font-medium gap-0.5",
              trend.direction === "up" ? "text-emerald-600" :
              trend.direction === "down" ? "text-red-500" : "text-muted-foreground"
            )}>
              {trend.direction === "up" ? <ArrowUpRight className="h-3 w-3" /> :
               trend.direction === "down" ? <ArrowDownRight className="h-3 w-3" /> :
               <Minus className="h-3 w-3" />}
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        <p className={cn("text-2xl font-bold text-foreground", valueClassName)}>{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend.label}</p>}
        {chart && <div className="mt-3 h-10">{chart}</div>}
      </CardContent>
    </Card>
  );
}
