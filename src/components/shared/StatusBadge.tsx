import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  inactive: "bg-muted text-muted-foreground",
  invited: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  todo: "bg-muted text-muted-foreground",
  overdue: "bg-destructive/10 text-destructive",
  visitor: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  convert: "bg-primary/10 text-primary",
  not_contacted: "bg-muted text-muted-foreground",
  contacted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  follow_up_scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  converted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  not_interested: "bg-destructive/10 text-destructive",
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-destructive/10 text-destructive",
  not_baptized: "bg-muted text-muted-foreground",
  scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const labels: Record<string, string> = {
  not_contacted: "Not Contacted",
  follow_up_scheduled: "Follow-up Scheduled",
  not_interested: "Not Interested",
  in_progress: "In Progress",
  not_baptized: "Not Baptized",
  todo: "To Do",
};

export const StatusBadge = ({ status, className }: { status: string; className?: string }) => (
  <Badge variant="secondary" className={cn("font-medium capitalize border-0", statusColors[status] || "bg-muted text-muted-foreground", className)}>
    {labels[status] || status.replace(/_/g, " ")}
  </Badge>
);
