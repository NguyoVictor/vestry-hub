import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart2, Calendar, ClipboardList, CheckCircle2, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function MemberSurveys() {
  const member = useMemberPortal();
  const navigate = useNavigate();

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ["member-surveys", member.churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.SURVEYS)
        .select("id, title, description, questions, closing_date, is_anonymous, created_at")
        .eq("tenant_id", member.churchId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      return (data || []).filter(s => !s.closing_date || new Date(s.closing_date) >= new Date());
    },
    staleTime: 300_000,
  });

  const { data: myResponses = [] } = useQuery({
    queryKey: ["member-survey-responses", member.memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.SURVEY_RESPONSES)
        .select("survey_id")
        .eq("member_id", member.memberId);
      return (data || []).map((r: any) => r.survey_id);
    },
    staleTime: 60_000,
  });

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate("/member")}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <p className="text-xs font-medium text-slate-500">{member.churchName}</p>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4 text-purple-500" />Surveys
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : surveys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <BarChart2 className="h-12 w-12 text-slate-300" />
          <p className="text-base font-semibold text-slate-600">No active surveys at this time</p>
          <p className="text-sm text-slate-400">Check back soon for new surveys from {member.churchName}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {surveys.map(survey => {
            const questionCount = Array.isArray(survey.questions) ? survey.questions.length : 0;
            const completed = myResponses.includes(survey.id);

            return (
              <div
                key={survey.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white leading-snug">{survey.title}</h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {completed && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Completed
                      </Badge>
                    )}
                    {survey.is_anonymous && (
                      <Badge variant="outline" className="text-xs text-slate-500">
                        <EyeOff className="h-3 w-3 mr-1" />Anonymous
                      </Badge>
                    )}
                  </div>
                </div>

                {survey.description && (
                  <p className="text-sm text-slate-500 line-clamp-2">{survey.description}</p>
                )}

                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5" />{questionCount} question{questionCount !== 1 ? "s" : ""}
                  </span>
                  {survey.closing_date && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <Calendar className="h-3.5 w-3.5" />Closes {format(new Date(survey.closing_date), "dd MMM yyyy")}
                    </span>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => navigate(`/survey/${survey.id}`)}
                  disabled={completed}
                  className={cn(
                    "w-full rounded-full h-9",
                    completed
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-orange-500 hover:bg-orange-600 text-white"
                  )}
                >
                  {completed ? "Already Completed ✓" : "Take Survey"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
