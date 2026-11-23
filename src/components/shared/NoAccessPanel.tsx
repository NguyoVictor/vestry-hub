import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const AREA_LABELS: Record<string, string> = {
  member_management: "Member Management",
  financial_records: "Financial Records",
  event_management: "Event Management",
  communication_tools: "Communication Tools",
  reports_analytics: "Reports & Analytics",
  attendance: "Attendance",
  groups_ministries: "Groups & Ministries",
  church_settings: "Church Settings",
};

/** Shown instead of a page when the person's roles give "no access" to its area (T16). */
export function NoAccessPanel({ areaKey }: { areaKey: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center" data-testid="no-access-panel">
      <div className="rounded-full bg-slate-100 p-4"><Lock className="h-8 w-8 text-slate-500" /></div>
      <h1 className="text-xl font-semibold text-slate-900">You don't have access to {AREA_LABELS[areaKey] ?? "this area"}</h1>
      <p className="max-w-md text-sm text-slate-500">Your roles in this church don't include this area. Ask a church administrator if you need access.</p>
      <Button asChild variant="outline"><Link to="/dashboard">Go to dashboard</Link></Button>
    </div>
  );
}
