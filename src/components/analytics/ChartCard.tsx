import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart2 } from "lucide-react";
import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  height?: number;
}

export function ChartCard({ title, subtitle, actions, children, loading, height = 280 }: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="w-full rounded-lg" style={{ height }} />
        ) : (
          <div style={{ minHeight: height }}>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ChartEmpty({ height = 280 }: { height?: number }) {
  return (
    <div className="flex flex-col items-center justify-center text-muted-foreground" style={{ height }}>
      <BarChart2 className="h-10 w-10 mb-2 text-slate-300" />
      <p className="text-sm">No data for the selected period</p>
    </div>
  );
}
