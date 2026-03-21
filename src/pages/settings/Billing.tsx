import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, CreditCard, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PLANS = [
  { name: "Free", price: "$0/mo", features: ["100 members", "1 branch", "500 emails one-time", "2GB storage", "Manual giving only"] },
  { name: "Foundation", price: "$15/mo", features: ["500 members", "2,500 emails/mo", "5GB storage", "Online giving"] },
  { name: "Growth", price: "$39/mo", popular: true, features: ["Unlimited members", "5,000 emails/mo", "20GB storage", "150 AI credits/mo", "Priority support"] },
  { name: "Enterprise", price: "Custom", features: ["Unlimited everything", "Dedicated support", "SLA guarantee", "Custom integrations"] },
];

const Billing = () => {
  const church = useChurch();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-billing", church.tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("subscription_plan, subscription_tier, subscription_status").eq("id", church.tenantId).single();
      return data as any;
    },
  });

  const { data: memberCount } = useQuery({
    queryKey: ["billing-member-count", church.tenantId],
    queryFn: async () => {
      const { count } = await supabase.from("members").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: staffCount } = useQuery({
    queryKey: ["billing-staff-count", church.tenantId],
    queryFn: async () => {
      const { count } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("tenant_id", church.tenantId);
      return count || 0;
    },
  });

  const plan = tenant?.subscription_plan || "free";
  const planLimits = plan === "free" ? { members: 100, storage: 1, staff: 3 } :
    plan === "foundation" ? { members: 500, storage: 5, staff: 10 } :
    { members: 99999, storage: 20, staff: 99999 };

  const memberPct = Math.min(((memberCount || 0) / planLimits.members) * 100, 100);
  const storagePct = (0.2 / planLimits.storage) * 100;
  const staffPct = Math.min(((staffCount || 0) / planLimits.staff) * 100, 100);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <>
      <Helmet><title>Billing & Subscription — Vestry</title></Helmet>
      <PageHeader title="Billing & Subscription" subtitle="Manage your plan and usage" />

      <div className="max-w-3xl space-y-6">
        {/* Current Plan */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground capitalize">{plan} Plan</p>
                <Badge variant={plan === "free" ? "secondary" : "default"} className="mt-1 capitalize">{plan}</Badge>
                <ul className="mt-4 space-y-1">
                  {PLANS.find(p => p.name.toLowerCase() === plan)?.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3 w-3 text-emerald-500" />{f}
                    </li>
                  ))}
                </ul>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button><ArrowUpRight className="mr-2 h-4 w-4" />Upgrade Plan</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Choose a Plan</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {PLANS.map(p => (
                      <div key={p.name} className={cn("rounded-lg border p-4", p.popular && "border-primary ring-1 ring-primary")}>
                        {p.popular && <Badge className="mb-2">Most Popular</Badge>}
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-xl font-bold mt-1">{p.price}</p>
                        <ul className="mt-3 space-y-1">
                          {p.features.map(f => <li key={f} className="text-xs text-muted-foreground flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" />{f}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-4">🚧 Payments launching soon</p>
                  <div className="flex gap-2 mt-2">
                    <Input placeholder="your@email.com" className="flex-1" />
                    <Button variant="secondary">Notify Me</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader><CardTitle className="text-base">Usage</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {[
              { label: "Members", current: memberCount || 0, limit: planLimits.members, pct: memberPct },
              { label: "Storage", current: "0.2 GB", limit: `${planLimits.storage} GB`, pct: storagePct },
              { label: "Staff Accounts", current: staffCount || 0, limit: planLimits.staff, pct: staffPct },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.current} / {item.limit === 99999 ? "∞" : item.limit}</span>
                </div>
                <Progress value={item.pct} className={cn("h-2", item.pct >= 95 ? "[&>div]:bg-destructive" : item.pct >= 80 ? "[&>div]:bg-amber-500" : "")} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader><CardTitle className="text-base">Billing History</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-8 text-center">
              <CreditCard className="mb-2 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No billing history yet</p>
              <p className="text-xs text-muted-foreground mt-1">Your invoices will appear here once you upgrade.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Billing;
