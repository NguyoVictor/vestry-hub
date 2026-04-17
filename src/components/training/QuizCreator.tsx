import { useState, useRef } from "react";
import {
  ArrowLeft, Settings, Wand2, Search, Plus, X, Clock, Star,
  Image, Video, GripVertical, Trash2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import QuizSettingsModal, { QuizSettings } from "./QuizSettingsModal";
import LibraryView from "./LibraryView";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [findPanelOpen, setFindPanelOpen] = useState(false);
  const [findSearch, setFindSearch] = useState("");
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [searchPanelQuery, setSearchPanelQuery] = useState("");

  // Only one panel open at a time
  function toggleFindPanel() {
    setFindPanelOpen(p => { if (!p) setSearchPanelOpen(false); return !p; });
  }
  function toggleSearchPanel() {
    setSearchPanelOpen(p => { if (!p) setFindPanelOpen(false); return !p; });
  }

  const anyPanelOpen = findPanelOpen || searchPanelOpen;
  const [quizSettings, setQuizSettings] = useState<QuizSettings>({
    title: "Untitled Quiz",
    subject: "",
    grade: "",
    language: "English",
    visibility: "public",
    teachingGoals: [],
    coverImagePath: "",
    coverImageUrl: "",
  });
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

        {/* Editable title — click opens Settings modal */}
        {editingTitle ? (
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={e => { if (e.key === "Enter") setEditingTitle(false); }}
            autoFocus
            className="border border-orange-400 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 min-w-[180px]"
          />
        ) : (
          <button
            onClick={() => { setQuizSettings(s => ({ ...s, title })); setSettingsOpen(true); }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:border-orange-400 transition-colors"
          >
            {title}
          </button>
        )}

        <div className="flex-1" />

        {/* Right actions */}
        <button
          onClick={() => { setQuizSettings(s => ({ ...s, title })); setSettingsOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
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

      {/* ── Body: main content + slide-in panel ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Main scrollable content */}
        <div className="flex-1 overflow-y-auto relative transition-all duration-300">          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

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
            className="fixed z-[55] bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none max-w-[180px]"
            style={{ left: tooltipPos.x + 10, top: tooltipPos.y - 40 }}
          >
            <p className="font-semibold mb-0.5">{hoveredType.label}</p>
            <p className="text-slate-300">{hoveredType.preview}</p>
          </div>
        )}
        </div>

        {/* ── Floating icon buttons — fixed, shift left when any panel open ── */}
        <div
          className="fixed top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[51] transition-all duration-300"
          style={{ right: anyPanelOpen ? "396px" : "16px" }}
        >
          {/* Wand — AI generate panel */}
          <button
            onClick={toggleFindPanel}
            className={`h-10 w-10 rounded-xl border shadow-md flex items-center justify-center transition-all
              ${findPanelOpen
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:border-indigo-400"
              }`}
          >
            <Wand2 className="h-5 w-5" />
          </button>
          {/* Search — Find questions panel */}
          <button
            onClick={toggleSearchPanel}
            className={`h-10 w-10 rounded-xl border shadow-md flex items-center justify-center transition-all
              ${searchPanelOpen
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:border-indigo-400"
              }`}
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        {/* ── Slide-in: AI Generate panel (wand) ── */}
        <div
          className="shrink-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
          style={{ width: findPanelOpen ? 380 : 0, opacity: findPanelOpen ? 1 : 0 }}
        >
          {findPanelOpen && (
            <>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex-1 text-sm">Find questions</h3>
                <button
                  onClick={() => setIsLibraryOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add from library
                </button>
                <button onClick={() => setFindPanelOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 py-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="text" placeholder="Search for questions on any topic" value={findSearch} onChange={e => setFindSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
                <div className="w-40 h-32 relative">
                  <div className="absolute inset-0 flex items-end justify-center gap-2">
                    <div className="w-20 h-24 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex flex-col gap-1.5 p-2">
                      <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-600" />
                      <div className="h-2 w-3/4 rounded bg-slate-200 dark:bg-slate-600" />
                      <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-600" />
                      <div className="h-2 w-1/2 rounded bg-slate-200 dark:bg-slate-600" />
                    </div>
                    <div className="w-16 h-20 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 flex flex-col gap-1.5 p-2 mb-2">
                      <div className="h-2 w-full rounded bg-orange-200 dark:bg-orange-700" />
                      <div className="h-2 w-3/4 rounded bg-orange-200 dark:bg-orange-700" />
                      <div className="h-6 w-full rounded bg-orange-300 dark:bg-orange-600 mt-1 flex items-center justify-center">
                        <Search className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed">Find lesson slides, questions, interactive videos on any topic</p>
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs text-slate-400">or</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                  <Wand2 className="h-4 w-4" /> Generate with AI
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Slide-in: Find Questions panel (search icon) ── */}
        <div
          className="shrink-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
          style={{ width: searchPanelOpen ? 380 : 0, opacity: searchPanelOpen ? 1 : 0 }}
        >
          {searchPanelOpen && (
            <>
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-4 shrink-0">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex-1 text-base">Find questions</h3>
                <button
                  onClick={() => setIsLibraryOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
                  <Plus className="h-3.5 w-3.5" /> Add from library
                </button>
                <button
                  onClick={() => setSearchPanelOpen(false)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-500"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>

              {/* Search input */}
              <div className="px-4 pb-4 shrink-0">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search for questions on any topic"
                    value={searchPanelQuery}
                    onChange={e => setSearchPanelQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-400"
                  />
                  {searchPanelQuery && (
                    <button onClick={() => setSearchPanelQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="mx-4 h-px bg-slate-200 dark:bg-slate-700 shrink-0" />

              {/* Search in my library row */}
              <div className="px-4 py-1 shrink-0">
                <button
                  onClick={() => setIsLibraryOpen(true)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <svg className="h-5 w-5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">Search in my library</span>
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Empty area — light grey fill */}
              <div className="flex-1 bg-slate-50 dark:bg-slate-900/20" />
            </>
          )}
        </div>
      </div>

      {/* ── Library Overlay ── */}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-[60] flex">
          {/* Dark backdrop */}
          <div className="flex-1 bg-black/50" onClick={() => setIsLibraryOpen(false)} />
          {/* Panel */}
          <div className="w-full md:w-3/4 bg-white dark:bg-slate-800 rounded-l-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <button onClick={() => setIsLibraryOpen(false)} className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <X className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Library</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <LibraryView onCreateAssessment={() => setIsLibraryOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Quiz Settings Modal ── */}
      <QuizSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={quizSettings}
        onSave={saved => {
          setQuizSettings(saved);
          setTitle(saved.title || "Untitled Quiz");
        }}
      />
    </div>
  );
}
