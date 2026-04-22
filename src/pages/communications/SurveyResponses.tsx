import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Users, CheckCircle2, Clock, EyeOff, Search } from "lucide-react";
import { format } from "date-fns";
import { TABLES } from "@/lib/schema";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatSeconds(s: number | null) {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Bar Chart Row ────────────────────────────────────────────────────────────
function BarRow({ label, count, total, highlight }: { label: string; count: number; total: number; highlight?: boolean }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-32 truncate text-slate-600 dark:text-slate-400 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-5 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", highlight ? "bg-orange-500" : "bg-indigo-400")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right text-slate-500 shrink-0">{count} ({pct}%)</span>
    </div>
  );
}

// ─── Question Analytics Card ──────────────────────────────────────────────────
function QuestionAnalytics({ question, index, answers }: { question: any; index: number; answers: any[] }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const PER_PAGE = 10;

  const qAnswers = answers.filter(a => a.question_index === index);
  const count = qAnswers.length;

  const renderChart = () => {
    if (["multiple_choice", "dropdown"].includes(question.type)) {
      const opts = question.options || [];
      const tally: Record<string, number> = {};
      qAnswers.forEach(a => {
        const val = typeof a.answer_value === "string"
          ? a.answer_value
          : (a.answer_value?.text || a.answer_text);
        if (val) tally[val] = (tally[val] || 0) + 1;
      });
      const maxCount = Math.max(...Object.values(tally), 1);
      return (
        <div className="space-y-2 mt-3">
          {opts.map((opt: string) => (
            <BarRow key={opt} label={opt} count={tally[opt] || 0} total={count} highlight={(tally[opt] || 0) === maxCount} />
          ))}
        </div>
      );
    }

    if (question.type === "checkbox") {
      const opts = question.options || [];
      const tally: Record<string, number> = {};
      qAnswers.forEach(a => {
        const vals: string[] = Array.isArray(a.answer_value) ? a.answer_value : (a.answer_options || []);
        vals.forEach((v: string) => { tally[v] = (tally[v] || 0) + 1; });
      });
      return (
        <div className="space-y-2 mt-3">
          <p className="text-xs text-slate-400">Note: totals may exceed 100% (multi-select)</p>
          {opts.map((opt: string) => (
            <BarRow key={opt} label={opt} count={tally[opt] || 0} total={count} />
          ))}
        </div>
      );
    }

    if (question.type === "rating") {
      const ratings = qAnswers.map(a => Number(a.answer_value?.rating ?? a.answer_rating)).filter(Boolean);
      const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";
      const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratings.forEach(r => { if (r >= 1 && r <= 5) dist[r]++; });
      return (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-orange-500">{avg}</span>
            <div>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <span key={s} className={cn("text-xl", Number(avg) >= s ? "text-orange-400" : "text-slate-200")}>★</span>
                ))}
              </div>
              <p className="text-xs text-slate-400">{ratings.length} ratings</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {[5,4,3,2,1].map(s => (
              <BarRow key={s} label={`${s} star${s > 1 ? "s" : ""}`} count={dist[s]} total={ratings.length} highlight={s === Math.round(Number(avg))} />
            ))}
          </div>
          {question.min_label && question.max_label && (
            <div className="flex justify-between text-xs text-slate-400">
              <span>1 — {question.min_label}</span>
              <span>5 — {question.max_label}</span>
            </div>
          )}
        </div>
      );
    }

    if (question.type === "yes_no") {
      const yes = qAnswers.filter(a => a.answer_value?.boolean === true || a.answer_boolean === true).length;
      const no = count - yes;
      const yesPct = count > 0 ? Math.round((yes / count) * 100) : 0;
      const noPct = 100 - yesPct;
      return (
        <div className="mt-3 space-y-2">
          <div className="flex gap-4">
            <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{yes}</p>
              <p className="text-sm text-emerald-600">Yes ({yesPct}%)</p>
            </div>
            <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{no}</p>
              <p className="text-sm text-red-500">No ({noPct}%)</p>
            </div>
          </div>
        </div>
      );
    }

    if (question.type === "number") {
      const nums = qAnswers.map(a => Number(a.answer_value?.number ?? a.answer_text)).filter(n => !isNaN(n));
      const avg = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : "—";
      const min = nums.length ? Math.min(...nums) : "—";
      const max = nums.length ? Math.max(...nums) : "—";
      return (
        <div className="mt-3 flex gap-4">
          {[["Average", avg], ["Min", min], ["Max", max]].map(([label, val]) => (
            <div key={label} className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-slate-800 dark:text-white">{val}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      );
    }

    // short_text / long_text / date / file_upload / number fallback
    const texts = qAnswers
      .map(a => {
        const v = a.answer_value;
        if (typeof v === "string") return v;
        if (v && typeof v === "object") return v.text || v.number || v.date || null;
        return a.answer_text || null;
      })
      .filter(Boolean);

    const filtered = search ? texts.filter((t: string) => t.toLowerCase().includes(search.toLowerCase())) : texts;
    const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    const totalPages = Math.ceil(filtered.length / PER_PAGE);

    return (
      <div className="mt-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search responses..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        {paged.map((t: string, i: number) => (
          <div key={i} className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
            {t}
          </div>
        ))}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>{filtered.length} responses</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <span className="px-2 py-1">{page + 1}/{totalPages}</span>
              <Button size="sm" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <span className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Q{index + 1}</span>
            <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{question.text}</p>
            {question.description && <p className="text-xs text-slate-400 mt-0.5">{question.description}</p>}
          </div>
          <Badge variant="outline" className="text-xs shrink-0">{count} response{count !== 1 ? "s" : ""}</Badge>
        </div>
        {renderChart()}
      </CardContent>
    </Card>
  );
}

// ─── Full Response Modal ──────────────────────────────────────────────────────
function ResponseModal({ response, survey, answers, onClose }: { response: any; survey: any; answers: any[]; onClose: () => void }) {
  const questions: any[] = Array.isArray(survey.questions) ? survey.questions : [];
  const myAnswers = answers.filter(a => a.response_id === response.id);

  const getAnswer = (qi: number) => {
    const a = myAnswers.find(a => a.question_index === qi);
    if (!a) return "—";
    const v = a.answer_value;
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === "object" && v !== null) {
      return v.text || v.rating || (v.boolean !== undefined ? (v.boolean ? "Yes" : "No") : JSON.stringify(v));
    }
    return a.answer_text || String(v || "—");
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Response Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            {survey.is_anonymous ? (
              <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center">
                <EyeOff className="h-4 w-4 text-slate-400" />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                {response.member_name ? getInitials(response.member_name) : "?"}
              </div>
            )}
            <div>
              <p className="text-sm font-medium">
                {survey.is_anonymous
                  ? "Anonymous Respondent"
                  : response.member_name || "External Respondent"}
              </p>
              <p className="text-xs text-slate-400">
                {response.completed_at ? format(new Date(response.completed_at), "dd MMM yyyy, HH:mm") : "—"}
              </p>
            </div>
          </div>

          {questions.map((q: any, i: number) => (
            <div key={i} className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Q{i + 1}</p>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{q.text}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">{getAnswer(i)}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SurveyResponsesPage() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const { tenantId } = useChurch();
  const [activeTab, setActiveTab] = useState<"summary" | "individual">("summary");
  const [viewingResponse, setViewingResponse] = useState<any | null>(null);

  const { data: survey, isLoading: surveyLoading } = useQuery({
    queryKey: ["survey", surveyId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.SURVEYS).select("*").eq("id", surveyId!).single();
      return data;
    },
    staleTime: 300_000,
  });

  const { data: responses = [], isLoading: responsesLoading } = useQuery({
    queryKey: ["survey-responses", surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.SURVEY_RESPONSES)
        .select("*")
        .eq("survey_id", surveyId!)
        .order("submitted_at", { ascending: false });
      if (error) console.error("Responses fetch error:", error);
      const rows = data || [];

      // Resolve member names for non-anonymous responses that have a member_id
      const memberIds = [...new Set(rows.map((r: any) => r.member_id).filter(Boolean))];
      let memberMap: Record<string, string> = {};
      if (memberIds.length) {
        const { data: members } = await supabase
          .from(TABLES.MEMBERS)
          .select("id, first_name, last_name")
          .in("id", memberIds);
        (members || []).forEach((m: any) => {
          memberMap[m.id] = `${m.first_name || ""} ${m.last_name || ""}`.trim();
        });
      }

      return rows.map((r: any) => ({
        ...r,
        member_name: r.member_id ? (memberMap[r.member_id] || "Unknown Member") : null,
      }));
    },
    staleTime: 60_000,
  });

  const { data: answers = [] } = useQuery({
    queryKey: ["survey-answers", surveyId],
    queryFn: async () => {
      // Fetch all answers for this survey via the response join — no stale closure
      const { data, error } = await supabase
        .from(TABLES.SURVEY_ANSWERS)
        .select("*")
        .in(
          "response_id",
          // subquery: get all response IDs for this survey
          (await supabase
            .from(TABLES.SURVEY_RESPONSES)
            .select("id")
            .eq("survey_id", surveyId!)
          ).data?.map((r: any) => r.id) || []
        );
      if (error) console.error("Answers fetch error:", error);
      return data || [];
    },
    staleTime: 60_000,
  });

  const exportCSV = () => {
    if (!survey || !responses.length) return;
    const questions: any[] = Array.isArray(survey.questions) ? survey.questions : [];
    const headers = ["Respondent", "Submitted At", "Time Taken", "Complete", ...questions.map((q: any, i: number) => `Q${i + 1}: ${q.text}`)];

    const rows = responses.map((r: any) => {
      const myAnswers = answers.filter((a: any) => a.response_id === r.id);
      const getAns = (qi: number) => {
        const a = myAnswers.find((a: any) => a.question_index === qi);
        if (!a) return "";
        const v = a.answer_value;
        if (Array.isArray(v)) return v.join("; ");
        if (typeof v === "object" && v !== null) return v.text || v.rating || (v.boolean !== undefined ? (v.boolean ? "Yes" : "No") : "");
        return a.answer_text || String(v || "");
      };
      return [
        survey.is_anonymous ? "Anonymous" : (r.member_name || "Unknown"),
        r.submitted_at ? format(new Date(r.submitted_at), "yyyy-MM-dd HH:mm") : "",
        formatSeconds(r.time_taken_seconds),
        r.is_complete ? "Yes" : "No",
        ...questions.map((_: any, i: number) => getAns(i)),
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${survey.title}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (surveyLoading) return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
    </div>
  );

  if (!survey) return (
    <div className="p-6 text-center text-slate-400">Survey not found.</div>
  );

  const questions: any[] = Array.isArray(survey.questions) ? survey.questions : [];
  const total = responses.length;
  const completed = responses.filter((r: any) => r.is_complete).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const avgTime = (() => {
    const times = responses.map((r: any) => r.time_taken_seconds).filter(Boolean);
    if (!times.length) return null;
    return Math.round(times.reduce((a: number, b: number) => a + b, 0) / times.length);
  })();
  const anonCount = responses.filter((r: any) => !r.member_id).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/surveys")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{survey.title}</h1>
            {survey.description && <p className="text-sm text-slate-500 mt-0.5">{survey.description}</p>}
          </div>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!responses.length}>
          <Download className="h-4 w-4 mr-1.5" />Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Responses", value: total, icon: Users, color: "text-indigo-500 bg-indigo-50" },
          { label: "Completion Rate", value: `${completionRate}%`, icon: CheckCircle2, color: "text-emerald-500 bg-emerald-50" },
          { label: "Avg. Time", value: formatSeconds(avgTime), icon: Clock, color: "text-amber-500 bg-amber-50" },
          { label: "Anonymous", value: anonCount, icon: EyeOff, color: "text-slate-500 bg-slate-100" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", color)}><Icon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {(["summary", "individual"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
              activeTab === tab
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab === "summary" ? "Summary" : "Individual Responses"}
          </button>
        ))}
      </div>

      {/* Summary tab */}
      {activeTab === "summary" && (
        <div className="space-y-4">
          {responsesLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)
          ) : questions.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-slate-400">No questions in this survey.</CardContent></Card>
          ) : (
            questions.map((q: any, i: number) => (
              <QuestionAnalytics key={i} question={q} index={i} answers={answers} />
            ))
          )}
        </div>
      )}

      {/* Individual tab */}
      {activeTab === "individual" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Respondent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Time Taken</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {responses.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">No responses yet.</td></tr>
                ) : responses.map((r: any) => (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {survey.is_anonymous || !r.member_name ? (
                          <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center">
                            <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                          </div>
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                            {getInitials(r.member_name)}
                          </div>
                        )}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {survey.is_anonymous
                            ? "Anonymous"
                            : r.member_name || "External Respondent"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {r.submitted_at ? format(new Date(r.submitted_at), "dd MMM yyyy, HH:mm") : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{formatSeconds(r.time_taken_seconds)}</td>
                    <td className="px-4 py-3.5">
                      <Badge className={r.is_complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                        {r.is_complete ? "Complete" : "Partial"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Button size="sm" variant="outline" onClick={() => setViewingResponse(r)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {viewingResponse && (
        <ResponseModal
          response={viewingResponse}
          survey={survey}
          answers={answers}
          onClose={() => setViewingResponse(null)}
        />
      )}
    </div>
  );
}
