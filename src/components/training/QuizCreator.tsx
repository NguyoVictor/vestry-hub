import { useState, useRef } from "react";
import {
  ArrowLeft, Settings, Wand2, Search, Plus, X, Clock, Star,
  Image, Video, CheckSquare, List, ToggleLeft, PenLine,
  FileText, GripVertical, ChevronDown, Trash2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type QuestionType =
  | "multiple_choice" | "multi_select" | "true_false" | "fill_blanks"
  | "open_ended" | "passage" | "drag_drop" | "dropdown" | "categorize"
  | "reorder" | "match" | "hot_text" | "labeling" | "hotspot"
  | "draw" | "video_response" | "audio_response" | "poll" | "word_cloud" | "slide";

interface AnswerOption { id: string; text: string }
interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: AnswerOption[];
  correctIds: string[];
  imageUrl?: string;
  timeLimit: number;
  points: number;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Question type definitions ────────────────────────────────────────────────
interface QTypeDef {
  type: QuestionType;
  label: string;
  icon: string;
  color: string;
  isNew?: boolean;
  preview: string;
}

const SECTIONS: { title: string; types: QTypeDef[] }[] = [
  {
    title: "Basic",
    types: [
      { type: "multiple_choice", label: "Multiple choice",   icon: "☑",  color: "bg-indigo-500",  preview: "One correct answer from options" },
      { type: "multi_select",    label: "Multi-select",      icon: "✔✔", color: "bg-teal-500",    preview: "Multiple correct answers" },
      { type: "true_false",      label: "True or false",     icon: "⊘",  color: "bg-pink-500",    preview: "True or False answer" },
      { type: "fill_blanks",     label: "Fill in the blanks",icon: "✏",  color: "bg-orange-500",  preview: "Complete the missing word(s)" },
      { type: "open_ended",      label: "Open ended",        icon: "≡",  color: "bg-slate-500",   preview: "Free text response" },
      { type: "passage",         label: "Passage",           icon: "📄", color: "bg-red-500",     preview: "Read a passage then answer" },
    ],
  },
  {
    title: "Interactive & higher order",
    types: [
      { type: "drag_drop",   label: "Drag and drop", icon: "✋", color: "bg-green-500",   preview: "Drag items to correct positions" },
      { type: "dropdown",    label: "Dropdown",      icon: "▼",  color: "bg-emerald-500", preview: "Select from a dropdown list" },
      { type: "categorize",  label: "Categorize",    icon: "⊞",  color: "bg-yellow-500",  preview: "Sort items into categories" },
      { type: "reorder",     label: "Reorder",       icon: "↕",  color: "bg-lime-500",    preview: "Arrange items in correct order" },
      { type: "match",       label: "Match",         icon: "⇄",  color: "bg-cyan-500",    preview: "Match pairs of items" },
      { type: "hot_text",    label: "Hot text",      icon: "T",  color: "bg-purple-500",  preview: "Click the correct word(s) in text", isNew: true },
    ],
  },
  {
    title: "Visual learning",
    types: [
      { type: "labeling", label: "Labeling", icon: "🏷", color: "bg-red-400",    preview: "Label parts of an image" },
      { type: "hotspot",  label: "Hotspot",  icon: "🎯", color: "bg-orange-400", preview: "Click the correct area on an image" },
    ],
  },
  {
    title: "Open ended",
    types: [
      { type: "draw",           label: "Draw",           icon: "✏", color: "bg-blue-500",   preview: "Draw or sketch an answer" },
      { type: "video_response", label: "Video response", icon: "🎥", color: "bg-blue-600",   preview: "Record a video answer" },
      { type: "audio_response", label: "Audio response", icon: "🔊", color: "bg-indigo-400", preview: "Record an audio answer" },
      { type: "poll",           label: "Poll",           icon: "📊", color: "bg-slate-500",  preview: "Gather opinions, no correct answer" },
      { type: "word_cloud",     label: "Word cloud",     icon: "☁", color: "bg-sky-500",    preview: "Collect words to form a cloud" },
    ],
  },
  {
    title: "Other",
    types: [
      { type: "slide", label: "Slide", icon: "🖥", color: "bg-slate-400", preview: "Add an informational slide" },
    ],
  },
];

// ─── Default options per type ─────────────────────────────────────────────────
function defaultOptions(type: QuestionType): AnswerOption[] {
  if (type === "true_false") return [{ id: uid(), text: "True" }, { id: uid(), text: "False" }];
  if (["multiple_choice", "multi_select", "dropdown"].includes(type))
    return [uid(), uid(), uid(), uid()].map(id => ({ id, text: "" }));
  return [];
}

// ─── Question Editor ──────────────────────────────────────────────────────────
function QuestionEditor({ question, onChange, onDelete }: {
  question: Question;
  onChange: (q: Question) => void;
  onDelete: () => void;
}) {
  function setField<K extends keyof Question>(k: K, v: Question[K]) {
    onChange({ ...question, [k]: v });
  }
  function updateOption(id: string, text: string) {
    onChange({ ...question, options: question.options.map(o => o.id === id ? { ...o, text } : o) });
  }
  function addOption() {
    onChange({ ...question, options: [...question.options, { id: uid(), text: "" }] });
  }
  function removeOption(id: string) {
    onChange({ ...question, options: question.options.filter(o => o.id !== id) });
  }
  function toggleCorrect(id: string) {
    const isMulti = question.type === "multi_select";
    const already = question.correctIds.includes(id);
    if (isMulti) {
      setField("correctIds", already ? question.correctIds.filter(x => x !== id) : [...question.correctIds, id]);
    } else {
      setField("correctIds", [id]);
    }
  }

  const showOptions = ["multiple_choice", "multi_select", "true_false", "dropdown", "poll"].includes(question.type);
  const isTextOnly = ["open_ended", "draw", "video_response", "audio_response", "word_cloud", "slide", "passage"].includes(question.type);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 overflow-hidden">
      {/* Question header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
        <GripVertical className="h-4 w-4 text-slate-400 cursor-grab" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex-1">
          {SECTIONS.flatMap(s => s.types).find(t => t.type === question.type)?.label || question.type}
        </span>
        <div className="flex items-center gap-2">
          {/* Time limit */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            <select
              value={question.timeLimit}
              onChange={e => setField("timeLimit", Number(e.target.value))}
              className="bg-transparent text-xs border-0 focus:outline-none cursor-pointer"
            >
              {[10, 15, 20, 30, 45, 60, 90, 120].map(s => (
                <option key={s} value={s}>{s}s</option>
              ))}
            </select>
          </div>
          {/* Points */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Star className="h-3.5 w-3.5" />
            <input
              type="number"
              value={question.points}
              onChange={e => setField("points", Number(e.target.value))}
              className="w-10 bg-transparent text-xs border-0 focus:outline-none"
              min={0}
            />
            <span>pts</span>
          </div>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Question text */}
        <Textarea
          placeholder="Type your question here..."
          value={question.text}
          onChange={e => setField("text", e.target.value)}
          rows={2}
          className="resize-none text-base font-medium border-0 border-b border-slate-200 dark:border-slate-700 rounded-none px-0 focus-visible:ring-0 bg-transparent"
        />

        {/* Media buttons */}
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded border border-slate-200 dark:border-slate-600 hover:border-indigo-300">
            <Image className="h-3.5 w-3.5" /> Add image
          </button>
          <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded border border-slate-200 dark:border-slate-600 hover:border-indigo-300">
            <Video className="h-3.5 w-3.5" /> Add video
          </button>
        </div>

        {/* Answer options */}
        {showOptions && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">Answer options</p>
            {question.options.map((opt, i) => {
              const isCorrect = question.correctIds.includes(opt.id);
              const labels = ["A", "B", "C", "D", "E", "F"];
              return (
                <div key={opt.id} className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-colors ${isCorrect ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10" : "border-slate-200 dark:border-slate-600"}`}>
                  <button
                    onClick={() => toggleCorrect(opt.id)}
                    title="Mark as correct"
                    className={`shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${isCorrect ? "border-emerald-500 bg-emerald-500" : "border-slate-300 hover:border-emerald-400"}`}
                  >
                    {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </button>
                  <span className="text-xs font-bold text-slate-400 w-4 shrink-0">{labels[i]}</span>
                  <Input
                    value={opt.text}
                    onChange={e => updateOption(opt.id, e.target.value)}
                    placeholder={question.type === "true_false" ? opt.text : `Option ${labels[i]}`}
                    disabled={question.type === "true_false"}
                    className="flex-1 h-7 text-sm border-0 bg-transparent focus-visible:ring-0 p-0"
                  />
                  {question.type !== "true_false" && question.options.length > 2 && (
                    <button onClick={() => removeOption(opt.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            {question.type !== "true_false" && question.options.length < 6 && (
              <button onClick={addOption} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors mt-1">
                <Plus className="h-3.5 w-3.5" /> Add option
              </button>
            )}
          </div>
        )}

        {isTextOnly && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-600 text-center text-sm text-slate-400">
            {question.type === "slide" ? "Add content to your slide" : "Students will type / draw / record their response"}
          </div>
        )}

        {question.type === "fill_blanks" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Use <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">___</code> in the question text to mark blank positions</p>
            <Input placeholder="Correct answer for blank 1" className="text-sm" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Quiz Creator ────────────────────────────────────────────────────────
interface QuizCreatorProps {
  onBack: () => void;
}

export default function QuizCreator({ onBack }: QuizCreatorProps) {
  const [title, setTitle] = useState("Untitled Quiz");
  const [editingTitle, setEditingTitle] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredType, setHoveredType] = useState<QTypeDef | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const titleRef = useRef<HTMLInputElement>(null);

  const hasQuestions = questions.length > 0;

  function addQuestion(type: QuestionType) {
    const opts = defaultOptions(type);
    const q: Question = {
      id: uid(), type, text: "", options: opts,
      correctIds: opts.length > 0 ? [opts[0].id] : [],
      timeLimit: 30, points: 10,
    };
    setQuestions(qs => [...qs, q]);
  }

  function updateQuestion(id: string, q: Question) {
    setQuestions(qs => qs.map(x => x.id === id ? q : x));
  }

  function deleteQuestion(id: string) {
    setQuestions(qs => qs.filter(x => x.id !== id));
  }

  function handlePublish() {
    if (!hasQuestions) { toast.error("Add at least one question before publishing"); return; }
    if (!title.trim()) { toast.error("Give your quiz a title"); return; }
    toast.success(`"${title}" published!`);
    onBack();
  }

  const filteredSections = SECTIONS.map(s => ({
    ...s,
    types: s.types.filter(t => t.label.toLowerCase().includes(searchTerm.toLowerCase())),
  })).filter(s => s.types.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-slate-900 flex flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
        {/* Back */}
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </button>

        {/* Editable title */}
        {editingTitle ? (
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={e => { if (e.key === "Enter") setEditingTitle(false); }}
            autoFocus
            className="border border-indigo-400 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 min-w-[180px]"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:border-indigo-400 transition-colors"
          >
            {title}
          </button>
        )}

        <div className="flex-1" />

        {/* Right actions */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <Settings className="h-4 w-4" /> Settings
        </button>
        <button
          disabled={!hasQuestions}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${hasQuestions
              ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
            }`}
        >
          ▷ {hasQuestions ? "Preview" : "Add at least one question"}
        </button>
        <button
          onClick={handlePublish}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
        >
          Publish
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

          {/* Added questions */}
          {questions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Questions ({questions.length})
              </h2>
              {questions.map(q => (
                <QuestionEditor
                  key={q.id}
                  question={q}
                  onChange={updated => updateQuestion(q.id, updated)}
                  onDelete={() => deleteQuestion(q.id)}
                />
              ))}
            </div>
          )}

          {/* Question type picker card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
            {/* Search */}
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search for quizzes on any topic..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <button className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors whitespace-nowrap">
                Search quizzes →
              </button>
            </div>

            {/* Section heading */}
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Question types</h3>
              <span className="text-xs text-slate-400">👆 Hover to preview</span>
            </div>

            {/* Sections */}
            {filteredSections.map(section => (
              <div key={section.title}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{section.title}</p>
                <div className="grid grid-cols-3 gap-2">
                  {section.types.map(qtype => (
                    <button
                      key={qtype.type}
                      onClick={() => addQuestion(qtype.type)}
                      onMouseEnter={e => {
                        setHoveredType(qtype);
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setTooltipPos({ x: rect.left, y: rect.top });
                      }}
                      onMouseLeave={() => setHoveredType(null)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:shadow-sm hover:scale-105 transition-all text-left group"
                    >
                      <span className={`${qtype.color} h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm shrink-0 shadow-sm`}>
                        {qtype.icon}
                      </span>
                      <span className="text-sm text-slate-700 dark:text-slate-300 leading-tight flex-1">{qtype.label}</span>
                      {qtype.isNew && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">NEW</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Import */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Import existing files</p>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <span className="text-base">⊞</span> Spreadsheet
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <span className="text-base">📋</span> Google Forms
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Hover preview tooltip ── */}
        {hoveredType && (
          <div
            className="fixed z-50 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none max-w-[180px]"
            style={{ left: tooltipPos.x + 10, top: tooltipPos.y - 40 }}
          >
            <p className="font-semibold mb-0.5">{hoveredType.label}</p>
            <p className="text-slate-300">{hoveredType.preview}</p>
          </div>
        )}
      </div>

      {/* ── Right floating panel ── */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        <button className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-400 transition-colors">
          <Wand2 className="h-5 w-5" />
        </button>
        <button className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-400 transition-colors">
          <Search className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
