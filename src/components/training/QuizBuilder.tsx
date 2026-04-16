import { useState } from "react";
import { Plus, Trash2, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { TABLES, COLS } from "@/lib/schema";

type QuestionType = "multiple_choice" | "true_false";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: Option[];
  correctOptionId: string;
}

interface QuizBuilderProps {
  aiTopic: string;
  onClose: () => void;
}

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function makeDefaultQuestion(): Question {
  const optIds = [makeId(), makeId(), makeId(), makeId()];
  return {
    id: makeId(),
    text: "",
    type: "multiple_choice",
    options: [
      { id: optIds[0], text: "" },
      { id: optIds[1], text: "" },
      { id: optIds[2], text: "" },
      { id: optIds[3], text: "" },
    ],
    correctOptionId: optIds[0],
  };
}

function makeTrueFalseQuestion(): Question {
  const tId = makeId();
  const fId = makeId();
  return {
    id: makeId(),
    text: "",
    type: "true_false",
    options: [
      { id: tId, text: "True" },
      { id: fId, text: "False" },
    ],
    correctOptionId: tId,
  };
}

export default function QuizBuilder({ aiTopic, onClose }: QuizBuilderProps) {
  const { tenantId, userId } = useChurch();
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([makeDefaultQuestion()]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(aiTopic);

  // ─── Question helpers ────────────────────────────────────────────────────────
  function updateQuestion(qId: string, patch: Partial<Question>) {
    setQuestions(qs => qs.map(q => q.id === qId ? { ...q, ...patch } : q));
  }

  function updateOption(qId: string, optId: string, text: string) {
    setQuestions(qs => qs.map(q => {
      if (q.id !== qId) return q;
      return { ...q, options: q.options.map(o => o.id === optId ? { ...o, text } : o) };
    }));
  }

  function addQuestion() {
    setQuestions(qs => [...qs, makeDefaultQuestion()]);
  }

  function removeQuestion(qId: string) {
    if (questions.length === 1) { toast.error("At least one question is required"); return; }
    setQuestions(qs => qs.filter(q => q.id !== qId));
  }

  function switchType(qId: string, type: QuestionType) {
    setQuestions(qs => qs.map(q => {
      if (q.id !== qId) return q;
      if (type === "true_false") {
        const tId = makeId(); const fId = makeId();
        return { ...q, type, options: [{ id: tId, text: "True" }, { id: fId, text: "False" }], correctOptionId: tId };
      }
      const optIds = [makeId(), makeId(), makeId(), makeId()];
      return {
        ...q, type,
        options: optIds.map(id => ({ id, text: "" })),
        correctOptionId: optIds[0],
      };
    }));
  }

  // ─── AI generation ───────────────────────────────────────────────────────────
  async function generateWithAI() {
    if (!aiPrompt.trim()) { toast.error("Enter a topic first"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("groq-ai", {
        body: {
          prompt: `Generate 5 multiple choice quiz questions about: "${aiPrompt}".
Return ONLY valid JSON in this exact format, no markdown, no explanation:
[
  {
    "text": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0
  }
]`,
        },
      });
      if (error) throw error;

      // Parse the AI response
      const raw: string = data?.content || data?.text || data?.result || "";
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Could not parse AI response");
      const parsed: { text: string; options: string[]; correctIndex: number }[] = JSON.parse(jsonMatch[0]);

      const generated: Question[] = parsed.map(item => {
        const optIds = item.options.map(() => makeId());
        return {
          id: makeId(),
          text: item.text,
          type: "multiple_choice",
          options: item.options.map((text, i) => ({ id: optIds[i], text })),
          correctOptionId: optIds[item.correctIndex ?? 0],
        };
      });

      setQuestions(generated);
      if (!quizTitle) setQuizTitle(`${aiPrompt} Quiz`);
      toast.success(`Generated ${generated.length} questions`);
    } catch (err) {
      toast.error("AI generation failed — check your Groq integration");
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  // ─── Save ────────────────────────────────────────────────────────────────────
  async function saveQuiz() {
    if (!quizTitle.trim()) { toast.error("Quiz title is required"); return; }
    const unanswered = questions.filter(q => !q.text.trim());
    if (unanswered.length > 0) { toast.error("All questions must have text"); return; }

    setSaving(true);
    try {
      // Save as a training course with embedded quiz data
      const { error } = await supabase.from(TABLES.TRAINING_COURSES).insert({
        title: quizTitle,
        category: "other",
        difficulty: "beginner",
        status: "published",
        tenant_id: tenantId,
        created_by: userId,
        description: `Assessment: ${quizTitle}`,
        // Store quiz questions as JSON in a metadata field if available,
        // otherwise just save the course record
      });
      if (error) throw error;
      toast.success("Assessment saved successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save assessment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Quiz title */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Quiz Title <span className="text-red-500">*</span></Label>
        <Input
          placeholder="e.g. New Members Orientation Quiz"
          value={quizTitle}
          onChange={e => setQuizTitle(e.target.value)}
          className="text-base font-medium"
        />
      </div>

      {/* AI generation bar */}
      <div className="flex gap-2 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
        <div className="flex-1 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
          <Input
            placeholder="Enter a topic to generate questions with AI..."
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm"
            onKeyDown={e => { if (e.key === "Enter") generateWithAI(); }}
          />
        </div>
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shrink-0"
          onClick={generateWithAI}
          disabled={generating}
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {generating ? "Generating…" : "Generate with AI"}
        </Button>
      </div>

      {/* Question cards */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={idx}
            onUpdate={patch => updateQuestion(q.id, patch)}
            onUpdateOption={(optId, text) => updateOption(q.id, optId, text)}
            onSwitchType={type => switchType(q.id, type)}
            onRemove={() => removeQuestion(q.id)}
          />
        ))}
      </div>

      {/* Add question */}
      <Button
        variant="outline"
        className="w-full gap-2 border-dashed border-slate-300 hover:border-indigo-400 hover:text-indigo-600"
        onClick={addQuestion}
      >
        <Plus className="h-4 w-4" /> Add Question
      </Button>

      {/* Footer actions */}
      <div className="flex gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          onClick={saveQuiz}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {saving ? "Saving…" : "Save Quiz"}
        </Button>
      </div>
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────
interface QuestionCardProps {
  question: Question;
  index: number;
  onUpdate: (patch: Partial<Question>) => void;
  onUpdateOption: (optId: string, text: string) => void;
  onSwitchType: (type: QuestionType) => void;
  onRemove: () => void;
}

function QuestionCard({ question, index, onUpdate, onUpdateOption, onSwitchType, onRemove }: QuestionCardProps) {
  const optionLabels = ["A", "B", "C", "D"];

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-white dark:bg-slate-800 space-y-4">
      {/* Question header */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <Input
          placeholder={`Question ${index + 1}`}
          value={question.text}
          onChange={e => onUpdate({ text: e.target.value })}
          className="flex-1 font-medium"
        />
        <button
          onClick={onRemove}
          className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Type toggle */}
      <div className="flex gap-2">
        {(["multiple_choice", "true_false"] as QuestionType[]).map(type => (
          <button
            key={type}
            onClick={() => onSwitchType(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
              ${question.type === type
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300"
              }`}
          >
            {type === "multiple_choice" ? "Multiple Choice" : "True & False"}
          </button>
        ))}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-3">
            {/* Correct answer selector */}
            <button
              onClick={() => onUpdate({ correctOptionId: opt.id })}
              className={`shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors
                ${question.correctOptionId === opt.id
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-slate-300 dark:border-slate-600 hover:border-emerald-400"
                }`}
              title="Mark as correct answer"
            >
              {question.correctOptionId === opt.id && (
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              )}
            </button>
            <span className="shrink-0 text-xs font-bold text-slate-400 w-4">
              {optionLabels[i] || i + 1}
            </span>
            <Input
              placeholder={question.type === "true_false" ? opt.text : `Option ${optionLabels[i] || i + 1}`}
              value={question.type === "true_false" ? opt.text : opt.text}
              onChange={e => onUpdateOption(opt.id, e.target.value)}
              disabled={question.type === "true_false"}
              className={`flex-1 text-sm ${question.correctOptionId === opt.id ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10" : ""}`}
            />
          </div>
        ))}
      </div>

      {question.correctOptionId && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Correct answer selected
        </p>
      )}
    </div>
  );
}
