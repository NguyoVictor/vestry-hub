import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { HandHeart, Users, CheckCircle2 } from "lucide-react";

export default function MemberVolunteer() {
  const member = useMemberPortal();
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["member-volunteer-roles-list", member.churchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.VOLUNTEER_ROLES)
        .select("*")
        .eq(COLS.TENANT_ID, member.churchId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000,
  });

  const { data: mySignups = [] } = useQuery({
    queryKey: ["member-my-signups", member.memberId, member.churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.VOLUNTEERS)
        .select("role_id")
        .eq("member_id", member.memberId)
        .eq(COLS.TENANT_ID, member.churchId);
      return (data || []).map((v: any) => v.role_id);
    },
    staleTime: 60000,
  });

  const { data: volunteerCounts = {} } = useQuery({
    queryKey: ["member-volunteer-counts", member.churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.VOLUNTEERS)
        .select("role_id")
        .eq(COLS.TENANT_ID, member.churchId)
        .eq("status", "confirmed");
      const counts: Record<string, number> = {};
      (data || []).forEach((v: any) => {
        counts[v.role_id] = (counts[v.role_id] || 0) + 1;
      });
      return counts;
    },
    staleTime: 60000,
  });

  const signupMut = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from(TABLES.VOLUNTEERS).insert({
        tenant_id: member.churchId,
        member_id: member.memberId,
        role_id: roleId,
        status: "confirmed",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-my-signups"] });
      queryClient.invalidateQueries({ queryKey: ["member-volunteer-counts"] });
      toast.success("You've signed up to volunteer!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to sign up"),
  });

  const withdrawMut = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from(TABLES.VOLUNTEERS)
        .delete()
        .eq("member_id", member.memberId)
        .eq("role_id", roleId)
        .eq(COLS.TENANT_ID, member.churchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-my-signups"] });
      queryClient.invalidateQueries({ queryKey: ["member-volunteer-counts"] });
      toast.success("Withdrawn from volunteer role");
    },
    onError: (err: any) => toast.error(err.message || "Failed to withdraw"),
  });

  return (
    <>
      <Helmet><title>Volunteer — Vestry</title></Helmet>
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Volunteer</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign up to serve in a ministry role</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <HandHeart className="h-12 w-12 text-slate-300 mb-3" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">No volunteer roles yet</p>
            <p className="text-sm text-muted-foreground mt-1">Check back soon — your church will post opportunities here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roles.map((role: any) => {
              const isSignedUp = (mySignups as string[]).includes(role.id);
              const count = (volunteerCounts as Record<string, number>)[role.id] || 0;
              const isFull = role.max_volunteers && count >= role.max_volunteers;

              return (
                <div key={role.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                        <HandHeart className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{role.name}</p>
                        {role.department && (
                          <Badge variant="secondary" className="text-xs mt-0.5">{role.department}</Badge>
                        )}
                      </div>
                    </div>
                    {isSignedUp && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 shrink-0 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Signed up
                      </Badge>
                    )}
                  </div>

                  {role.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{role.description}</p>
                  )}

                  {role.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {role.required_skills.map((skill: string) => (
                        <span key={skill} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {count} volunteer{count !== 1 ? "s" : ""}
                      {role.max_volunteers ? ` / ${role.max_volunteers} max` : ""}
                    </span>

                    {isSignedUp ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={() => withdrawMut.mutate(role.id)}
                        disabled={withdrawMut.isPending}
                      >
                        Withdraw
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => signupMut.mutate(role.id)}
                        disabled={signupMut.isPending || !!isFull}
                      >
                        {isFull ? "Full" : "Sign Up"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
