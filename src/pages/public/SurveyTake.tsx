import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, EyeOff, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TABLES } from "@/lib/schema";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question {
  type: string;
  text: string;
  description?: string;
  required: boolean;
  options?: string[];
  min_label?: string;
  max_label?: string;
}

// ─── Question Input ───────────────────────────────────────────────────────────
function QuestionInput({
  question, index, value, onChange,
}: {
  question: Question;
  index: number;
  value: any;
  onChange: (val: any) => void;
}) {
  if (question.type === "short_text") {
    return (
      <Input
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder="Your answer..."
        className="focus:border-orange-500 focus:ring-orange-500/10"
      />
    );
  }

  if (question.type === "long_text") {
    return (
      <Textarea
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder="Your answer..."
        rows={4}
        className="focus:border-orange-500 focus:ring-orange-500/10 resize-none"
      />
    );
  }

  if (question.type === "multiple_choice") {
    return (
      <div className="space-y-2">
        {(question.options || []).map((opt, i) => (
          <button
            key={i}
            onClick={() => onChange(opt)}
            className={cn(
              "w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all",
              value === opt
                ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                : "border-slate-200 dark:border-slate-700 hover:border-orange-300 text-slate-700 dark:text-slate-300"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "checkbox") {
    const selected: string[] = Array.isArray(value) ? value : [];
    const toggle = (opt: string) => {
      onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
    };
    return (
      <div className="space-y-2">
        {(question.options || []).map((opt, i) => (
          <button
            key={i}
            onClick={() => toggle(opt)}
            className={cn(
              "w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-3",
              selected.includes(opt)
                ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                : "border-slate-200 dark:border-slate-700 hover:border-orange-300 text-slate-700 dark:text-slate-300"
            )}
          >
            <div className={cn(
              "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0",
              selected.includes(opt) ? "border-orange-500 bg-orange-500" : "border-slate-300"
            )}>
              {selected.includes(opt) && <CheckCircle2 className="h-3 w-3 text-white" />}
            </div>
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "rating") {
    const [hovered, setHovered] = useState<number | null>(null);
    const current = Number(value) || 0;
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onChange(s)}
              className="text-3xl transition-transform hover:scale-110"
            >
              <span className={cn(
                "transition-colors",
                (hovered !== null ? s <= hovered : s <= current) ? "text-orange-400" : "text-slate-200 dark:text-slate-600"
              )}>★</span>
            </button>
          ))}
        </div>
        {(question.min_label || question.max_label) && (
          <div className="flex justify-between text-xs text-slate-400">
            <span>{question.min_label || "1"}</span>
            <span>{question.max_label || "5"}</span>
          </div>
        )}
      </div>
    );
  }

  if (question.type === "yes_no") {
    return (
      <div className="flex gap-3">
        {["Yes", "No"].map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt === "Yes")}
            className={cn(
              "flex-1 py-4 rounded-xl border-2 text-base font-semibold transition-all",
              value === (opt === "Yes")
                ? opt === "Yes"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-red-400 bg-red-50 text-red-600"
                : "border-slate-200 hover:border-orange-300 text-slate-600"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "dropdown") {
    return (
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="focus:border-orange-500">
          <SelectValue placeholder="Select an option..." />
        </SelectTrigger>
        <SelectContent>
          {(question.options || []).map((opt, i) => (
            <SelectItem key={i} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (question.type === "date") {
    return (
      <Input
        type="date"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className="focus:border-orange-500"
      />
    );
  }

  if (question.type === "number") {
    return (
      <Input
        type="number"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder="Enter a number..."
        className="focus:border-orange-500"
      />
    );
  }

  if (question.type === "file_upload") {
    return (
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
        <input
          type="file"
          className="hidden"
          id={`file-${index}`}
          onChange={async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
            const path = `${Date.now()}-${file.name}`;
            const { data, error } = await supabase.storage.from("survey-uploads").upload(path, file);
            if (error) { toast.error("Upload failed"); return; }
            onChange(data.path);
            toast.success("File uploaded");
          }}
        />
        <label htmlFor={`file-${index}`} className="cursor-pointer">
          {value ? (
            <p className="text-sm text-emerald-600 font-medium">✓ File uploaded</p>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-600">Click to upload a file</p>
              <p className="text-xs text-slate-400 mt-1">Max 10MB</p>
            </>
          )}
        </label>
      </div>
    );
  }

  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SurveyTakePage() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const startedAt = useRef(new Date());

  // Read member portal session — present when taken in-app, null when external link
  const memberSession = (() => {
    try { return JSON.parse(localStorage.getItem("member_session") || "null"); } catch { return null; }
  })();

  const { data: survey, isLoading } = useQuery({
    queryKey: ["public-survey", surveyId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.SURVEYS).select("*, tenants(name, logo)").eq("id", surveyId!).single();
      return data;
    },
    staleTime: 300_000,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const completedAt = new Date();
      const timeTaken = Math.round((completedAt.getTime() - startedAt.current.getTime()) / 1000);

      // Only link to member if survey is NOT anonymous AND member is logged in via portal
      const memberId = (!survey.is_anonymous && memberSession?.memberId) ? memberSession.memberId : null;
      const memberName = (!survey.is_anonymous && memberSession?.memberName) ? memberSession.memberName : null;

      // Insert response
      const { data: resp, error: respErr } = await supabase
        .from(TABLES.SURVEY_RESPONSES)
        .insert({
          survey_id: surveyId!,
          tenant_id: survey.tenant_id,
          member_id: memberId,
          member_name: memberName,
          started_at: startedAt.current.toISOString(),
          completed_at: completedAt.toISOString(),
          time_taken_seconds: timeTaken,
          is_complete: true,
          responses: answers as any,
        } as any)
        .select("id")
        .single();
      if (respErr) throw respErr;

      // Insert answers
      const questions: Question[] = Array.isArray(survey.questions) ? survey.questions : [];
      const answerRows = questions.map((q, i) => {
        const val = answers[i];
        return {
          response_id: resp.id,
          question_index: i,
          question_type: q.type,
          question_text: q.text,
          answer_value: val !== undefined ? val : null,
          answer_text: typeof val === "string" ? val : null,
          answer_options: Array.isArray(val) ? val : null,
          answer_rating: q.type === "rating" ? Number(val) || null : null,
          answer_boolean: q.type === "yes_no" ? (val === true || val === false ? val : null) : null,
        };
      });

      if (answerRows.length) {
        const { error: ansErr } = await supabase.from(TABLES.SURVEY_ANSWERS).insert(answerRows as any);
        if (ansErr) throw ansErr;
      }

      // Increment view_count
      await supabase.rpc("increment_survey_view_count" as any, { survey_id: surveyId });
    },
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error("Failed to submit. Please try again."),
  });

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-4">
        <Skeleton className="h-16 w-16 rounded-full mx-auto" />
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );

  if (!survey) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-600">Survey not found.</p>
      </div>
    </div>
  );

  const church = (survey as any).tenants;
  const questions: Question[] = Array.isArray(survey.questions) ? survey.questions : [];
  const isClosed = !survey.is_published || (survey.closing_date && new Date(survey.closing_date) < new Date());

  // Closed state
  if (isClosed) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center space-y-4">
        {church?.logo && <img src={church.logo} className="h-14 w-14 rounded-full mx-auto object-cover border-2 border-white shadow" alt={church.name} />}
        <h2 className="text-xl font-bold text-slate-800">{church?.name}</h2>
        <div className="py-4">
          <p className="text-lg font-semibold text-slate-700">This survey has closed</p>
          <p className="text-sm text-slate-400 mt-1">Thank you for your interest.</p>
        </div>
      </div>
    </div>
  );

  // Success state
  if (submitted) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center space-y-4">
        {church?.logo && <img src={church.logo} className="h-14 w-14 rounded-full mx-auto object-cover border-2 border-white shadow" alt={church.name} />}
        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Thank you for your response!</h2>
        <p className="text-sm text-slate-500">{church?.name}</p>
        <p className="text-sm text-slate-400">Your feedback helps us serve you better.</p>
      </div>
    </div>
  );

  const progress = questions.length > 0 ? Math.round(((currentQ + 1) / questions.length) * 100) : 0;
  const currentQuestion = questions[currentQ];

  const canProceed = () => {
    if (!currentQuestion?.required) return true;
    const val = answers[currentQ];
    if (val === undefined || val === null || val === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  };

  const handleSubmit = () => {
    // Validate all required
    const missing = questions.findIndex((q, i) => {
      if (!q.required) return false;
      const val = answers[i];
      return val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);
    });
    if (missing !== -1) {
      setCurrentQ(missing);
      toast.error(`Please answer question ${missing + 1}`);
      return;
    }
    submitMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-[680px] mx-auto space-y-5">
        {/* Church header */}
        <div className="text-center space-y-2">
          {church?.logo ? (
            <img src={church.logo} className="h-14 w-14 rounded-full mx-auto object-cover border-2 border-white shadow" alt={church.name} />
          ) : (
            <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
              <span className="text-orange-600 font-bold text-xl">{church?.name?.[0] || "C"}</span>
            </div>
          )}
          <p className="text-sm font-medium text-slate-500">{church?.name}</p>
        </div>

        {/* Survey card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {survey.is_anonymous && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-500 rounded-full px-2.5 py-1">
                <EyeOff className="h-3 w-3" />Anonymous Survey
              </span>
            )}
            {survey.closing_date && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-600 rounded-full px-2.5 py-1">
                <Calendar className="h-3 w-3" />Closes {format(new Date(survey.closing_date), "dd MMM yyyy")}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{survey.title}</h1>
          {survey.description && <p className="text-sm text-slate-500">{survey.description}</p>}
          <p className="text-xs text-slate-400">{questions.length} question{questions.length !== 1 ? "s" : ""}</p>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Question {currentQ + 1} of {questions.length}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Current question */}
        {currentQuestion && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <span className="text-xs font-bold text-orange-500 uppercase tracking-wide">Q{currentQ + 1}</span>
              <h2 className="text-base font-semibold text-slate-900 mt-0.5">
                {currentQuestion.text}
                {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
              </h2>
              {currentQuestion.description && (
                <p className="text-sm text-slate-400 mt-1">{currentQuestion.description}</p>
              )}
            </div>
            <QuestionInput
              question={currentQuestion}
              index={currentQ}
              value={answers[currentQ]}
              onChange={val => setAnswers(prev => ({ ...prev, [currentQ]: val }))}
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {currentQ > 0 && (
            <Button variant="outline" onClick={() => setCurrentQ(q => q - 1)} className="flex-1">
              <ChevronLeft className="h-4 w-4 mr-1" />Previous
            </Button>
          )}
          {currentQ < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQ(q => q + 1)}
              disabled={!canProceed()}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Survey"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
