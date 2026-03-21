import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { navigationGroups } from "@/config/navigation";

const CORE_PATHS = ["/dashboard", "/settings"];

const MODULE_DESCRIPTIONS: Record<string, string> = {
  "/members": "Manage your full membership database",
  "/groups": "Organize members into ministry groups",
  "/house-fellowships": "Track and manage home cell groups",
  "/families": "Link members as family units",
  "/visitors": "Log and follow up with church visitors",
  "/follow-up-tasks": "Assign and track member follow-ups",
  "/new-converts": "Manage discipleship for new believers",
  "/give-online": "Accept digital offerings and tithes",
  "/giving-records": "View and export donation history",
  "/pledge-campaigns": "Run fundraising pledge drives",
  "/church-expenses": "Log and approve church expenditure",
  "/budget-management": "Plan and track annual budgets",
  "/payroll": "Manage staff salaries and payslips",
  "/fund-accounting": "Track restricted and unrestricted funds",
  "/accounts-payable": "Manage vendor invoices and payments",
  "/general-ledger": "Full double-entry accounting ledger",
  "/payouts": "View payout history",
  "/services": "Schedule and track weekly services",
  "/events": "Create and manage church events",
  "/volunteering": "Coordinate volunteer rosters",
  "/member-requests": "Receive and respond to member needs",
  "/board-meetings": "Schedule meetings and track minutes",
  "/facility-booking": "Manage facility booking requests",
  "/security-centre": "Monitor access logs and sessions",
  "/incident-management": "Log and resolve security incidents",
  "/communications": "Broadcast messages to members",
  "/announcements": "Post church-wide announcements",
  "/member-messaging": "Direct messaging between staff and members",
  "/testimonies": "Collect and publish member testimonies",
  "/surveys": "Create and distribute church surveys",
  "/graphics-studio": "Upload and manage design assets",
  "/ai-tools": "AI-powered content generation",
  "/church-studio": "Audio and video sermon library",
  "/bible-explorer": "Searchable Bible with notes",
  "/song-library": "Worship song and lyrics database",
  "/church-media": "Photo and video gallery",
  "/asset-management": "Track physical church assets",
  "/sermon-preparation": "Draft and organize sermon outlines",
  "/sermons": "Published sermon archive",
  "/livestreaming": "Embed live stream links",
  "/discipleship": "Track spiritual growth journeys",
  "/discipleship-resources": "Upload discipleship materials",
  "/outreach": "Log and measure outreach activities",
  "/resources-store": "Sell books and church resources",
  "/training": "Staff training and course management",
  "/reports": "Church-wide data and insights",
  "/branches": "Manage multiple church locations",
};

const ServicesModules = () => {
  const church = useChurch();
  const qc = useQueryClient();

  const { data: enabledModules, isLoading } = useQuery({
    queryKey: ["tenant-modules", church.tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("enabled_modules").eq("id", church.tenantId).single();
      const mods = (data as any)?.enabled_modules;
      return Array.isArray(mods) && mods.length > 0 ? mods as string[] : null; // null means all enabled
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ path, enabled }: { path: string; enabled: boolean }) => {
      // Get current modules
      const { data: current } = await supabase.from("tenants").select("enabled_modules").eq("id", church.tenantId).single();
      let mods: string[] = (current as any)?.enabled_modules || [];
      
      // If empty (all enabled), populate with all paths
      if (!Array.isArray(mods) || mods.length === 0) {
        mods = navigationGroups.flatMap(g => g.items.map(i => i.path));
      }

      if (enabled) {
        if (!mods.includes(path)) mods = [...mods, path];
      } else {
        mods = mods.filter(m => m !== path);
      }

      const { error } = await supabase.from("tenants").update({ enabled_modules: mods } as any).eq("id", church.tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-modules", church.tenantId] });
      toast.success("Module updated");
    },
    onError: () => toast.error("Failed to update module"),
  });

  const isEnabled = (path: string) => {
    if (CORE_PATHS.includes(path)) return true;
    if (!enabledModules) return true; // null = all enabled
    return enabledModules.includes(path);
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" />{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <>
      <Helmet><title>Services & Modules — Vestry</title></Helmet>
      <PageHeader title="Services & Modules" subtitle="Enable or disable features for your church" />

      <div className="max-w-3xl space-y-6">
        {navigationGroups.filter(g => g.label !== "Overview").map(group => (
          <Card key={group.label}>
            <CardHeader className="pb-2"><CardTitle className="text-base">{group.label}</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border">
              {group.items.filter(i => i.path !== "/dashboard").map(item => {
                const isCore = CORE_PATHS.includes(item.path);
                const enabled = isEnabled(item.path);
                return (
                  <div key={item.path} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <item.icon className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.title}</span>
                          {isCore && <Badge variant="secondary" className="text-xs">Core</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{MODULE_DESCRIPTIONS[item.path] || ""}</p>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      disabled={isCore || toggleMutation.isPending}
                      onCheckedChange={(checked) => toggleMutation.mutate({ path: item.path, enabled: checked })}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
};

export default ServicesModules;
