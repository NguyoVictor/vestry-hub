// Branch detail (T14). Shows only what is really recorded per branch:
// assigned staff (staff_branch_assignments), services this month and
// upcoming events (services.branch_id / events.branch_id). Members, giving
// and groups carry no branch, so they are not split per branch.
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { setActiveBranch } from "@/components/layout/AppLayout";
import { TABLES, COLS } from "@/lib/schema";
import { fetchBranchOverview } from "@/lib/branchOverview";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { toast } from "sonner";
import { Users, CalendarDays, CalendarClock, MapPin, Phone, Mail, ArrowLeft, ArrowLeftRight } from "lucide-react";

export default function BranchDetail() {
  const { branchId } = useParams<{ branchId: string }>();
  const { tenantId } = useChurch();

  const { data: branch, isLoading } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.BRANCHES)
        .select("id, tenant_id, name, location, contact_email, contact_phone, is_active, created_at")
        .eq(COLS.ID, branchId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  const { data: overview = {} } = useQuery({
    queryKey: ["branch-overview", tenantId],
    queryFn: () => fetchBranchOverview(tenantId!),
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!branch) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Branch not found</p>
        <Button variant="outline" asChild className="mt-4"><Link to="/branches"><ArrowLeft className="h-4 w-4 mr-2" />Back to branches</Link></Button>
      </div>
    );
  }

  const o = overview[branch.id];
  const stats = [
    { label: "Staff assigned", value: o?.staff_count ?? 0, icon: Users },
    { label: "Services this month", value: o?.services_this_month ?? 0, icon: CalendarDays },
    { label: "Upcoming events", value: o?.upcoming_events ?? 0, icon: CalendarClock },
  ];

  return (
    <>
      <Helmet><title>{branch.name} — Vestry</title></Helmet>
      <PageHeader
        title={branch.name}
        subtitle={branch.location ?? undefined}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={branch.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>{branch.is_active ? "Active" : "Inactive"}</Badge>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setActiveBranch({ id: branch.id, name: branch.name }); toast.success(`Switched to ${branch.name}`); }}>
              <ArrowLeftRight className="h-4 w-4" />Switch to Branch
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link to="/branches"><ArrowLeft className="h-4 w-4" />Back</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats.map(({ label, value, icon: Icon }) => (
              <Card key={label} data-testid="branch-stat">
                <CardContent className="p-4">
                  <Icon className="h-4 w-4 text-indigo-600 mb-2" />
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Branch staff</CardTitle>
              <Button size="sm" variant="outline" asChild><Link to="/settings/users">Assign staff</Link></Button>
            </CardHeader>
            <CardContent>
              {!o?.staff.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">No staff assigned to this branch yet. Use Settings → Users → Edit user → Branch Assignment.</p>
              ) : (
                <ul className="space-y-3" data-testid="branch-staff-list">
                  {o.staff.map(s => (
                    <li key={s.id} className="flex items-center gap-3">
                      <MemberAvatar name={s.name || "Staff"} size="sm" />
                      <span className="flex-1 text-sm">{s.name || "Unnamed"}</span>
                      <Badge variant="outline" className="text-xs capitalize">{s.role.replace(/_/g, " ")}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Branch info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {branch.location && <div className="flex gap-2"><MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /><span>{branch.location}</span></div>}
              {branch.contact_phone && <div className="flex gap-2"><Phone className="h-4 w-4 text-muted-foreground shrink-0" /><span>{branch.contact_phone}</span></div>}
              {branch.contact_email && <div className="flex gap-2"><Mail className="h-4 w-4 text-muted-foreground shrink-0" /><span>{branch.contact_email}</span></div>}
              {!branch.location && !branch.contact_phone && !branch.contact_email && <p className="text-muted-foreground">No contact details yet.</p>}
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">Members, giving and groups are recorded for the whole church, not per branch.</p>
        </div>
      </div>
    </>
  );
}
