import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Bug, ExternalLink, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
  level: string;
  metadata?: { value?: string };
}

async function fetchSentryIssues(): Promise<SentryIssue[]> {
  const { data, error } = await supabase.functions.invoke("fetch-sentry-issues");
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.message ?? data.error);
  return data as SentryIssue[];
}

const levelColors: Record<string, string> = {
  error: "bg-destructive/10 text-destructive",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  fatal: "bg-destructive text-destructive-foreground",
};

export function SentryMonitor() {
  const { data: issues, isLoading, isError, error } = useQuery({
    queryKey: ["sentry_issues"],
    queryFn: fetchSentryIssues,
    staleTime: 300000,
    retry: false,
  });

  const now = Date.now();
  const oneDayAgo = now - 86400000;
  const sevenDaysAgo = now - 7 * 86400000;

  const errors24h = issues?.filter(i => new Date(i.lastSeen).getTime() > oneDayAgo).length ?? 0;
  const errors7d = issues?.filter(i => new Date(i.lastSeen).getTime() > sevenDaysAgo).length ?? 0;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />Error & Performance Monitor
          {!isLoading && !isError && (
            <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-600">
              <Wifi className="h-3.5 w-3.5" />Connected
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : isError ? (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">Unable to reach Sentry API</p>
              <p className="text-sm text-muted-foreground">
                {(error as Error)?.message || "Unknown error"} — check that the Sentry secrets are set on the Edge Function.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Errors (24h)", value: errors24h, color: errors24h > 0 ? "text-destructive" : "text-emerald-600" },
                { label: "Errors (7d)", value: errors7d, color: errors7d > 0 ? "text-amber-600" : "text-emerald-600" },
                { label: "Open Issues", value: issues?.length ?? 0, color: "text-foreground" },
                { label: "Affected Users", value: issues?.reduce((s, i) => s + (i.userCount || 0), 0) ?? 0, color: "text-foreground" },
              ].map(s => (
                <div key={s.label} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {!issues?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bug className="mx-auto h-10 w-10 mb-2 opacity-30" />
                <p>No open issues. Everything looks clean.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">Recent Issues</p>
                {issues.slice(0, 10).map(issue => (
                  <div key={issue.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <Badge className={`text-[10px] ${levelColors[issue.level] ?? levelColors.error}`}>{issue.level}</Badge>
                        <span className="text-sm font-medium text-foreground truncate">{issue.title}</span>
                      </div>
                      {issue.metadata?.value && (
                        <p className="text-xs text-muted-foreground truncate">{issue.metadata.value}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{issue.count} occurrences</span>
                        {issue.userCount > 0 && <span>{issue.userCount} user{issue.userCount !== 1 ? "s" : ""} affected</span>}
                        <span>{formatDistanceToNow(new Date(issue.lastSeen), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <a
                      href={issue.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      title="View in Sentry"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
