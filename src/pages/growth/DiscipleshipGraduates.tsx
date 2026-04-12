import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { toast } from "sonner";
import { Trophy, GraduationCap, Calendar, Phone, CalendarPlus } from "lucide-react";
import { format, startOfMonth, startOfYear } from "date-fns";

const DiscipleshipGraduates = () => {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleConvert, setScheduleConvert] = useState<any | null>(null);
  const [ceremonyDate, setCeremonyDate] = useState("");

  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const yearStart = startOfYear(now).toISOString();

  const { data: graduates = [], isLoading } = useQuery({
    queryKey: ["graduates", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.NEW_CONVERTS)
        .select("*")
        .eq(COLS.TENANT_ID, tenantId!)
        .not("graduated_at", "is", null)
        .order("graduated_at", { ascending: false }) as any;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const totalGraduates = graduates.length;
  const thisMonth = graduates.filter((g: any) => g.graduated_at >= monthStart).length;
  const thisYear = graduates.filter((g: any) => g.graduated_at >= yearStart).length;

  const filtered = graduates.filter((g: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${g.first_name} ${g.last_name || ""}`.toLowerCase();
    return name.includes(q) || (g.phone || "").includes(q);
  });

  const scheduleGraduationMut = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      const { error } = await supabase
        .from(TABLES.NEW_CONVERTS)
        .update({ graduation_date: date, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graduates"] });
      toast.success("Graduation ceremony date scheduled");
      setScheduleOpen(false);
      setScheduleConvert(null);
      setCeremonyDate("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statCards = [
    { label: "Total Graduates", value: totalGraduates, icon: Trophy, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "This Month", value: thisMonth, icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { label: "This Year", value: thisYear, icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  ];

  return (
    <>
      <Helmet><title>Discipleship Graduates — Vestry</title></Helmet>
      <PageHeader
        title="Discipleship Graduates"
        subtitle="Celebrate those who have completed the full discipleship journey"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`rounded-lg p-2.5 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                {isLoading ? <Skeleton className="h-7 w-10 mb-1" /> : <p className="text-2xl font-bold">{value}</p>}
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search graduates by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Graduates list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">
                {search ? "No graduates match your search" : "No graduates yet"}
              </p>
              {!search && (
                <p className="text-sm text-muted-foreground mt-1">
                  Graduates appear here when all 5 discipleship milestones are completed.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((g: any) => {
                const fullName = `${g.first_name} ${g.last_name || ""}`.trim();
                return (
                  <div key={g.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <MemberAvatar name={fullName} />
                      <div>
                        <p className="font-semibold">{fullName}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {g.graduated_at && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              Graduated {format(new Date(g.graduated_at), "dd MMM yyyy")}
                            </span>
                          )}
                          {g.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />{g.phone}
                            </span>
                          )}
                        </div>
                        {g.graduation_date && (
                          <span className="text-xs text-indigo-600 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            Ceremony: {format(new Date(g.graduation_date), "dd MMM yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => { setScheduleConvert(g); setCeremonyDate(g.graduation_date || ""); setScheduleOpen(true); }}
                    >
                      <CalendarPlus className="h-4 w-4 mr-1.5" />
                      {g.graduation_date ? "Reschedule" : "Schedule Graduation"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Graduation Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={v => { setScheduleOpen(v); if (!v) { setScheduleConvert(null); setCeremonyDate(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule Graduation Ceremony</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {scheduleConvert && (
              <p className="text-sm text-muted-foreground">
                Setting ceremony date for <strong>{scheduleConvert.first_name} {scheduleConvert.last_name || ""}</strong>
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Ceremony Date</Label>
              <Input
                type="date"
                value={ceremonyDate}
                onChange={e => setCeremonyDate(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setScheduleOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => scheduleConvert && scheduleGraduationMut.mutate({ id: scheduleConvert.id, date: ceremonyDate })}
                disabled={scheduleGraduationMut.isPending || !ceremonyDate}
              >
                {scheduleGraduationMut.isPending ? "Saving..." : "Save Date"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DiscipleshipGraduates;
