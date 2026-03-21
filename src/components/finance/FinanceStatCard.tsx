import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyFull } from "@/lib/format";
import { useChurch } from "@/contexts/ChurchContext";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinanceStatCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  color?: string;
  trend?: { value: number; label: string };
  subtitle?: string;
  isCurrency?: boolean;
}

export const FinanceStatCard = ({ title, amount, icon: Icon, color = "text-primary", trend, subtitle, isCurrency = true }: FinanceStatCardProps) => {
  const { currency } = useChurch();
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{isCurrency ? formatCurrencyFull(amount, currency) : amount.toLocaleString()}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn("p-2 rounded-lg bg-primary/10", color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {trend.value > 0 ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : trend.value < 0 ? <TrendingDown className="h-3 w-3 text-destructive" /> : <Minus className="h-3 w-3 text-muted-foreground" />}
            <span className={cn(trend.value > 0 ? "text-emerald-600" : trend.value < 0 ? "text-destructive" : "text-muted-foreground")}>
              {trend.value > 0 ? "+" : ""}{trend.value}% {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
