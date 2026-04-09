import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, WifiOff } from "lucide-react";

const POSTHOG_DASHBOARD_URL = import.meta.env.VITE_POSTHOG_DASHBOARD_URL;

export function PostHogDashboard() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5" />Live Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!POSTHOG_DASHBOARD_URL ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-muted-foreground">
            <WifiOff className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">PostHog dashboard not configured</p>
              <p className="text-sm">
                Add <code className="text-xs bg-muted px-1 rounded">VITE_POSTHOG_DASHBOARD_URL</code> to your{" "}
                <code className="text-xs bg-muted px-1 rounded">.env</code> file with your PostHog shareable dashboard URL to see live analytics here.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden border">
            <iframe
              src={POSTHOG_DASHBOARD_URL}
              className="w-full"
              style={{ height: "600px", border: "none" }}
              title="PostHog Live Analytics Dashboard"
              allow="fullscreen"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
