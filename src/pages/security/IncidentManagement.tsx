import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Plus, Clock, CheckCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const INCIDENT_TYPES = ["theft", "vandalism", "trespassing", "physical_altercation", "medical_emergency", "fire", "unauthorized_access", "suspicious_person", "child_safety", "data_breach", "other"];
const SEVERITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["open", "investigating", "resolved"];

const severityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  critical: "bg-destructive/10 text-destructive animate-pulse",
};

const statusColors: Record<string, string> = {
  open: "bg-destructive/10 text-destructive",
  investigating: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function IncidentManagement() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ incident_type: "other", description: "", persons_involved: "", status: "open" as string });

  const { data: incidents, isLoading } = useQuery({
    queryKey: ["incidents", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("incidents")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createIncident = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("incidents").insert({
        tenant_id: tenantId,
        incident_type: form.incident_type,
        description: form.description,
        persons_involved: form.persons_involved || null,
        status: form.status as any,
        reported_by: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Incident reported");
      setShowCreate(false);
      setForm({ incident_type: "other", description: "", persons_involved: "", status: "open" });
    },
    onError: () => toast.error("Failed to report incident"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "resolved") updates.resolution_notes = "Resolved";
      const { error } = await supabase.from("incidents").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Status updated");
    },
  });

  const openCount = incidents?.filter(i => (i.status as string) !== "resolved").length || 0;
  const thisMonth = incidents?.filter(i => {
    const d = new Date(i.incident_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length || 0;

  return (
    <div>
      <PageHeader title="Incident Management" subtitle="Log, track and resolve church security incidents" action={<Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Report Incident</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Open Incidents</p><p className="text-3xl font-bold text-destructive">{openCount}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">This Month</p><p className="text-3xl font-bold">{thisMonth}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Total Incidents</p><p className="text-3xl font-bold">{incidents?.length || 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All Incidents</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !incidents?.length ? (
            <div className="text-center py-12">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-lg font-medium">No incidents reported</p>
              <p className="text-muted-foreground text-sm">Report your first incident to start tracking.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell><Badge variant="secondary">{incident.incident_type.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">{incident.description}</TableCell>
                    <TableCell className="text-sm">{format(new Date(incident.incident_date), "dd MMM yyyy")}</TableCell>
                    <TableCell><Badge className={statusColors[(incident.status as string) || "open"]}>{(incident.status as string) || "open"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(incident.status as string) !== "resolved" && (
                          <>
                            {(incident.status as string) === "open" && (
                              <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: incident.id, status: "investigating" })}>Investigate</Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: incident.id, status: "resolved" })}>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />Resolve
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Report Incident</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Incident Type</Label>
              <Select value={form.incident_type} onValueChange={(v) => setForm(f => ({ ...f, incident_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INCIDENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Full description of the incident..." rows={5} />
            </div>
            <div>
              <Label>People Involved</Label>
              <Textarea value={form.persons_involved} onChange={(e) => setForm(f => ({ ...f, persons_involved: e.target.value }))} placeholder="Names and roles of people involved..." rows={3} />
            </div>
            <Button className="w-full" disabled={!form.description || createIncident.isPending} onClick={() => createIncident.mutate()}>
              {createIncident.isPending ? "Reporting..." : "Report Incident"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
