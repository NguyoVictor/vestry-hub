import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<string, string> = {
  tithe: "bg-primary/10 text-primary border-primary/20",
  offering: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
  building_fund: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  welfare: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400",
  missions: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400",
  special: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400",
  expense: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  payroll: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
  other: "bg-muted text-muted-foreground border-border",
};

const LABELS: Record<string, string> = {
  tithe: "Tithe", offering: "Offering", building_fund: "Building Fund", welfare: "Welfare",
  missions: "Missions", special: "Special", expense: "Expense", payroll: "Payroll", other: "Other",
  salaries: "Salaries", utilities: "Utilities", rent: "Rent", equipment: "Equipment",
  maintenance: "Maintenance", events: "Events", outreach: "Outreach", supplies: "Supplies", transport: "Transport",
};

export const TransactionBadge = ({ type }: { type: string }) => (
  <Badge variant="outline" className={cn("text-xs", TYPE_STYLES[type] || TYPE_STYLES.other)}>
    {LABELS[type] || type?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "Other"}
  </Badge>
);
