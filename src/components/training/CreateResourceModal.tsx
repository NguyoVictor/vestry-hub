import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Upload, Sparkles, ChevronRight, FileText, ChevronLeft, Info, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import QuizBuilder from "./QuizBuilder";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type ModalStep =
  | "create-type"
  | "customize-assessment"
  | "generating"
  | "quiz-editor"
  | "ai-config"
  | "categories-curriculum"
  | "quiz-builder";

interface GeneratedQuestion {
  type: string;
  text: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  modelAnswer?: string;
  passage?: string;
  dok?: string;
  points?: number;
  timeLimit?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const GRADE_LEVELS = [
  "Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade",
  "5th Grade", "6th Grade", "7th Grade", "8th Grade", "9th Grade",
  "10th Grade", "11th Grade", "12th Grade", "University",
  "Professional Development", "Vocational Training",
];

const LANGUAGES = ["English", "Swahili", "French", "Spanish", "Portuguese"];

const DOK_LEVELS = [
  { level: "Level 1", tooltip: "Recall — simple facts and basic concepts" },
  { level: "Level 2", tooltip: "Skill/Concept — apply knowledge to solve problems" },
  { level: "Level 3", tooltip: "Strategic Thinking — deep reasoning and complex decisions" },
];

const QUESTION_COUNTS: ("auto" | number)[] = ["auto", 10, 15, 20, 30];
const QUESTION_TYPES = ["MCQ", "Fill in the blank", "Open", "Passage"];

const LOADING_MESSAGES = [
  "Understanding Document...",
  "Analysing Document...",
  "Refining Questions...",
  "Almost there...",
];

// ── File type icon ─────────────────────────────────────────────────────────────
function FileIcon({ ext }: { ext: string }) {
  const colors: Record<string, string> = { pdf: "bg-red-500", docx: "bg-blue-500", txt: "bg-slate-500", pptx: "bg-orange-500" };
  const color = colors[ext.toLowerCase()] ?? "bg-slate-500";
  return (
    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg text-white text-xs font-bold shrink-0", color)}>
      {ext.toUpperCase().slice(0, 3)}
    </div>
  );
}

// ── Loading Screen ─────────────────────────────────────────────────────────────
function GeneratingScreen({ onClose }: { onClose: () => void }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % LOADING_MESSAGES.length);
        setFade(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 relative">
      <button onClick={onClose} className="absolute top-0 right-0 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
        <X className="h-5 w-5 text-slate-500" />
      </button>
      {/* Constant sparkle icon */}
      <div className="flex h-16 w-16 items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" className="h-14 w-14" style={{ color: "#06B6D4" }}>
          <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="currentColor" />
        </svg>
      </div>
      {/* Cycling message */}
      <p className={cn("text-sm font-medium text-slate-600 transition-opacity duration-300", fade ? "opacity-100" : "opacity-0")}>
        {LOADING_MESSAGES[msgIdx]}
      </p>
      {/* Skeleton bars */}
      <div className="w-full max-w-sm space-y-3">
        <div className="h-3 rounded-full bg-cyan-100 animate-pulse" style={{ width: "80%" }} />
        <div className="h-3 rounded-full bg-cyan-100 animate-pulse" style={{ width: "65%" }} />
        <div className="h-3 rounded-full bg-cyan-100 animate-pulse" style={{ width: "72%" }} />
      </div>
    </div>
  );
}

// ── Quiz Editor ────────────────────────────────────────────────────────────────
function QuizEditor({ questions: initialQuestions, settings, onPublish, onBack, tenantId, userId }: {
  questions: GeneratedQuestion[];
  settings: AssessmentSettings;
  onPublish: () => void;
  onBack: () => void;
  tenantId: string;
  userId: string;
}) {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(initialQuestions);
  const [title, setTitle] = useState("Untitled Quiz");
  const [editingTitle, setEditingTitle] = useState(false);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const totalPoints = questions.reduce((s, q) => s + (q.points ?? 1), 0);
  const estimatedMins = Math.ceil(questions.reduce((s, q) => s + (q.timeLimit ?? 30), 0) / 60);

  const updateQuestion = (idx: number, patch: Partial<GeneratedQuestion>) => {
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const deleteQuestion = (idx: number) => {
    setQuestions(qs => qs.filter((_, i) => i !== idx));
  };

  const addQuestion = () => {
    setQuestions(qs => [...qs, { type: "MCQ", text: "", options: ["", "", "", ""], correctIndex: 0, points: 1, timeLimit: 30 }]);
  };

  const saveToSupabase = async (status: "draft" | "published") => {
    setSaving(true);
    try {
      const { error } = await supabase.from(TABLES.QUIZZES).insert({
        tenant_id: tenantId,
        user_id: userId,
        title,
        questions: questions as any,
        status,
        grade_level: settings.gradeLevel,
        dok_levels: settings.dokLevels,
        question_types: settings.questionTypes,
        num_questions: questions.length,
        language: settings.language,
        allow_doc_reading: settings.allowDocReading,
        source_file_name: settings.fileName,
      } as any);
      if (error) throw error;
      // Invalidate library query so it refreshes immediately
      qc.invalidateQueries({ queryKey: ["quizzes", tenantId, userId] });
      toast.success(status === "published" ? "✅ Quiz published!" : "✅ Draft saved.");
      onPublish();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save quiz.");
    } finally {
      setSaving(false);
    }
  };

  const TYPE_COLORS: Record<string, string> = {
    "MCQ": "bg-indigo-100 text-indigo-700",
    "Fill in the blank": "bg-orange-100 text-orange-700",
    "Open": "bg-slate-100 text-slate-700",
    "Passage": "bg-red-100 text-red-700",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-10">
        <button onClick={() => { saveToSupabase("draft"); onBack(); }} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>
        {editingTitle ? (
          <input value={title} onChange={e => setTitle(e.target.value)} onBlur={() => setEditingTitle(false)} onKeyDown={e => e.key === "Enter" && setEditingTitle(false)} autoFocus className="border border-orange-400 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-[200px]" />
        ) : (
          <button onClick={() => setEditingTitle(true)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 hover:border-orange-400 transition-colors truncate max-w-xs">{title}</button>
        )}
        <div className="flex items-center gap-3 text-xs text-slate-500 ml-2">
          <span>{questions.length} Questions</span>
          <span>·</span>
          <span>{totalPoints} Points</span>
          <span>·</span>
          <span>{estimatedMins} mins</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1"><Sparkles className="h-3.5 w-3.5" />AI actions</Button>
          <Button variant="outline" size="sm" className="text-xs">Add answer explanations</Button>
          <Button variant="outline" size="sm" className="text-xs">Translate quiz</Button>
          <Button variant="outline" size="sm" className="text-xs gap-1"><Search className="h-3.5 w-3.5" />Create question</Button>
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs gap-1" onClick={() => saveToSupabase("published")} disabled={saving}>
            {saving ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Questions list */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {questions.map((q, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Question header */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-500">{idx + 1}</span>
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", TYPE_COLORS[q.type] ?? "bg-slate-100 text-slate-600")}>
                  {q.type}
                </span>
                <span className="text-xs text-slate-400">{q.timeLimit ?? 30}s</span>
                <span className="text-xs text-slate-400">{q.points ?? 1} pt{(q.points ?? 1) !== 1 ? "s" : ""}</span>
                <div className="flex-1" />
                <button onClick={() => deleteQuestion(idx)} className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50">Delete</button>
                <button className="text-xs text-slate-400 hover:text-indigo-500 transition-colors px-2 py-1 rounded hover:bg-indigo-50">Edit</button>
              </div>

              <div className="p-5 space-y-4">
                {/* Passage */}
                {q.passage && (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 leading-relaxed">
                    {q.passage}
                  </div>
                )}
                {/* Question text */}
                <textarea
                  value={q.text}
                  onChange={e => updateQuestion(idx, { text: e.target.value })}
                  className="w-full text-sm font-medium text-slate-800 border-0 border-b border-slate-200 pb-2 focus:outline-none focus:border-orange-400 bg-transparent resize-none"
                  rows={2}
                />

                {/* MCQ / Passage options */}
                {(q.type === "MCQ" || q.type === "Passage") && q.options && (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const isCorrect = oi === q.correctIndex;
                      return (
                        <div key={oi} className={cn("flex items-center gap-3 p-2.5 rounded-lg border-2 transition-colors", isCorrect ? "border-emerald-400 bg-emerald-50" : "border-slate-200")}>
                          <button onClick={() => updateQuestion(idx, { correctIndex: oi })} className={cn("h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors", isCorrect ? "border-emerald-500 bg-emerald-500" : "border-slate-300 hover:border-emerald-400")}>
                            {isCorrect && <div className="h-2 w-2 bg-white rounded-full" />}
                          </button>
                          <span className="text-xs font-bold text-slate-400 w-4">{["A", "B", "C", "D"][oi]}</span>
                          <input value={opt} onChange={e => { const newOpts = [...(q.options ?? [])]; newOpts[oi] = e.target.value; updateQuestion(idx, { options: newOpts }); }} className="flex-1 text-sm border-0 bg-transparent focus:outline-none" />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Fill in the blank */}
                {q.type === "Fill in the blank" && (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-slate-500 mb-1">Correct answer:</p>
                    <input value={q.correctAnswer ?? ""} onChange={e => updateQuestion(idx, { correctAnswer: e.target.value })} className="text-sm font-medium text-emerald-700 border-0 bg-transparent focus:outline-none w-full" />
                  </div>
                )}

                {/* Open */}
                {q.type === "Open" && (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-slate-500 mb-1">Model answer:</p>
                    <textarea value={q.modelAnswer ?? ""} onChange={e => updateQuestion(idx, { modelAnswer: e.target.value })} className="text-sm text-slate-700 border-0 bg-transparent focus:outline-none w-full resize-none" rows={3} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Add question */}
          <button onClick={addQuestion} className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:border-orange-400 hover:text-orange-500 transition-colors flex items-center justify-center gap-2">
            + Add question
          </button>
        </div>

        {/* Right sidebar */}
        <div className="w-72 shrink-0 border-l border-slate-200 bg-white flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Find questions</p>
            <Button size="sm" variant="outline" className="text-xs gap-1"><Sparkles className="h-3 w-3" />Generate with AI</Button>
          </div>
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input placeholder="Search for questions on any topic" className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-4 gap-3 text-center">
            <div className="h-20 w-20 rounded-xl bg-slate-100 flex items-center justify-center">
              <Search className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">Find lesson slides, questions, interactive videos on any topic</p>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs border-indigo-400 text-indigo-600 hover:bg-indigo-50">
              <Sparkles className="h-3.5 w-3.5" />Generate with AI
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Assessment Settings type ───────────────────────────────────────────────────
interface AssessmentSettings {
  gradeLevel: string;
  dokLevels: string[];
  questionTypes: string[];
  numQuestions: "auto" | number;
  language: string;
  allowDocReading: boolean;
  fileName: string;
  fileExt: string;
}

// ── Customize Assessment Step ─────────────────────────────────────────────────
function CustomizeAssessmentStep({ settings, onChange, onBack, onGenerate, uploading }: {
  settings: AssessmentSettings;
  onChange: (s: Partial<AssessmentSettings>) => void;
  onBack: () => void;
  onGenerate: () => void;
  uploading: boolean;
}) {
  const toggleDok = (level: string) => {
    const next = settings.dokLevels.includes(level)
      ? settings.dokLevels.filter(l => l !== level)
      : [...settings.dokLevels, level];
    onChange({ dokLevels: next.length > 0 ? next : [level] });
  };

  const toggleType = (type: string) => {
    const next = settings.questionTypes.includes(type)
      ? settings.questionTypes.filter(t => t !== type)
      : [...settings.questionTypes, type];
    onChange({ questionTypes: next.length > 0 ? next : [type] });
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* File info */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
        <FileIcon ext={settings.fileExt} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{settings.fileName}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0" onClick={onBack}>
          <Upload className="h-3.5 w-3.5" />Upload new document
        </Button>
      </div>

      {/* AI notice */}
      <div className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" style={{ color: "#06B6D4" }}>
          <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="currentColor" />
        </svg>
        <p className="text-sm text-cyan-800">We will generate new questions based on uploaded content.</p>
      </div>

      {/* Customization */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customize your assessment</p>

        {/* Grade level */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <Label className="text-sm text-slate-700">Grade level</Label>
          <Select value={settings.gradeLevel} onValueChange={v => onChange({ gradeLevel: v })}>
            <SelectTrigger className="w-52 h-8 text-sm"><SelectValue placeholder="Select grade" /></SelectTrigger>
            <SelectContent className="max-h-60">
              {GRADE_LEVELS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* DOK */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm text-slate-700">Depth of knowledge (DOK)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-slate-400 cursor-help" /></TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs p-3">
                  <p className="text-xs font-semibold mb-1">DOK Framework:</p>
                  {DOK_LEVELS.map(d => <p key={d.level} className="text-xs mb-0.5"><strong>{d.level}:</strong> {d.tooltip}</p>)}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-2">
            {DOK_LEVELS.map(d => (
              <button key={d.level} onClick={() => toggleDok(d.level)} className={cn("px-3 py-1.5 rounded-full border text-xs font-medium transition-all", settings.dokLevels.includes(d.level) ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 text-slate-600 hover:border-slate-500")}>
                {d.level}
              </button>
            ))}
          </div>
        </div>

        {/* Question type */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <Label className="text-sm text-slate-700">Question type</Label>
          <div className="flex gap-2 flex-wrap justify-end">
            {QUESTION_TYPES.map(t => {
              const sel = settings.questionTypes.includes(t);
              return (
                <button key={t} onClick={() => toggleType(t)} className={cn("flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition-all", sel ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 text-slate-600 hover:border-slate-500")}>
                  {sel ? "✓" : "+"} {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Number of questions */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <Label className="text-sm text-slate-700">Number of questions</Label>
          <div className="flex gap-2">
            {QUESTION_COUNTS.map(c => (
              <button key={c} onClick={() => onChange({ numQuestions: c })} className={cn("px-3 py-1.5 rounded-full border text-xs font-medium transition-all capitalize", settings.numQuestions === c ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 text-slate-600 hover:border-slate-500")}>
                {c === "auto" ? "Automatic" : c}
              </button>
            ))}
          </div>
        </div>

        {/* Output language */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <Label className="text-sm text-slate-700">Output language</Label>
          <Select value={settings.language} onValueChange={v => onChange({ language: v })}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Allow doc reading */}
        <div className="flex items-start justify-between py-3">
          <div>
            <Label className="text-sm text-slate-700">Allow students to read this document while answering</Label>
            <p className="text-xs text-slate-400 mt-0.5 max-w-sm">This quiz would be converted into a multi-part passage question type where students can read the document and answer the questions.</p>
          </div>
          <Switch checked={settings.allowDocReading} onCheckedChange={v => onChange({ allowDocReading: v })} className="data-[state=checked]:bg-orange-500 shrink-0 ml-4" />
        </div>
      </div>

      {/* Create Resource button */}
      <div className="flex justify-end pt-2">
        <Button className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white gap-2 px-6" onClick={onGenerate} disabled={uploading}>
          {uploading ? "Uploading..." : "Create Resource →"}
        </Button>
      </div>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
interface CreateResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartFromScratch: () => void;
}

export default function CreateResourceModal({ isOpen, onClose, onStartFromScratch }: CreateResourceModalProps) {
  const { tenantId, userId } = useChurch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalStep, setModalStep] = useState<ModalStep>("create-type");
  const [aiTopic, setAiTopic] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);

  const [settings, setSettings] = useState<AssessmentSettings>({
    gradeLevel: "University",
    dokLevels: ["Level 1"],
    questionTypes: ["MCQ"],
    numQuestions: "auto",
    language: "English",
    allowDocReading: false,
    fileName: "",
    fileExt: "",
  });

  const [uploadedFilePath, setUploadedFilePath] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setModalStep("create-type");
    setAiTopic("");
    setSettings({ gradeLevel: "University", dokLevels: ["Level 1"], questionTypes: ["MCQ"], numQuestions: "auto", language: "English", allowDocReading: false, fileName: "", fileExt: "" });
    setUploadedFilePath("");
    setUploadedFile(null);
    setGeneratedQuestions([]);
  };

  const handleClose = () => { handleReset(); onClose(); };

  const handleFileSelect = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = ["pdf", "docx", "txt", "pptx"];
    if (!allowed.includes(ext)) { toast.error("Unsupported file type. Use PDF, DOCX, TXT, or PPTX."); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("File too large. Maximum 50MB."); return; }

    setSettings(s => ({ ...s, fileName: file.name, fileExt: ext }));
    setModalStep("customize-assessment");

    // Upload to Supabase storage in background
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `temp/${tenantId}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from("quiz-documents")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;
      setUploadedFilePath(path);
      // Also store the file object for fallback
      setUploadedFile(file);
    } catch (err: unknown) {
      // Upload failed — store file object as fallback (will send as base64)
      setUploadedFile(file);
      console.warn("Storage upload failed, will use base64 fallback:", (err as Error)?.message);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedFile && !uploadedFilePath) {
      toast.error("Please upload a file first.");
      return;
    }
    setModalStep("generating");
    try {
      let body: Record<string, any> = {
        tenant_id: tenantId,
        file_name: settings.fileName,
        file_type: settings.fileExt,
        grade_level: settings.gradeLevel,
        dok_levels: settings.dokLevels,
        question_types: settings.questionTypes,
        num_questions: settings.numQuestions,
        language: settings.language,
        allow_doc_reading: settings.allowDocReading,
      };

      if (uploadedFilePath) {
        // Use storage path
        body.file_path = uploadedFilePath;
      } else if (uploadedFile) {
        // Fallback: send file as base64
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        body.file_base64 = btoa(binary);
        body.file_path = null;
      }

      const { data, error } = await supabase.functions.invoke("generate-quiz", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedQuestions(data.questions ?? []);
      setModalStep("quiz-editor");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to generate quiz. Please try again.");
      setModalStep("customize-assessment");
    }
  };

  // Full-screen steps
  if (modalStep === "generating") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50">
        <GeneratingScreen onClose={handleClose} />
      </div>
    );
  }

  if (modalStep === "quiz-editor") {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col overflow-hidden">
        <QuizEditor
          questions={generatedQuestions}
          settings={settings}
          onPublish={handleClose}
          onBack={() => { handleClose(); }}
          tenantId={tenantId}
          userId={userId}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={handleClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          {modalStep !== "create-type" ? (
            <button onClick={() => { if (modalStep === "customize-assessment") setModalStep("create-type"); else setModalStep("create-type"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              <ChevronLeft className="h-4 w-4" />Go Back
            </button>
          ) : <div className="w-24" />}
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center flex-1">
            {modalStep === "create-type" && "How would you like to get started?"}
            {modalStep === "customize-assessment" && "Customize your assessment"}
            {modalStep === "ai-config" && "Create with prompt or text"}
            {modalStep === "categories-curriculum" && "Create with Categories or Curriculum"}
            {modalStep === "quiz-builder" && "Create Assessment"}
          </h2>
          <button onClick={handleClose} className="w-24 flex justify-end p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* ── Step 1: How to Get Started ── */}
          {modalStep === "create-type" && (
            <div className="space-y-6">
              {/* Upload Zone */}
              <div
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:border-orange-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-slate-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Upload lesson slides, worksheets or any document</p>
                <p className="text-xs text-slate-500 mb-4">File size upto 50 MB and less than 100 pages</p>
                <div className="flex items-center justify-center gap-3 flex-wrap" onClick={e => e.stopPropagation()}>
                  <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" />Device
                  </Button>
                  <Button variant="outline" className="gap-2" disabled>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/></svg>
                    Google Drive
                  </Button>
                  <Input placeholder="Paste any link here..." className="max-w-xs" onClick={e => e.stopPropagation()} />
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.pptx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              </div>

              {/* Option Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => setModalStep("ai-config")} className="group relative p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:shadow-lg hover:scale-105 transition-all text-left">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-indigo-500" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Create with prompt or text</h3>
                  </div>
                  <Input placeholder="Enter a topic..." value={aiTopic} onChange={e => setAiTopic(e.target.value)} onClick={e => e.stopPropagation()} className="text-sm" />
                </button>
                <button onClick={() => setModalStep("categories-curriculum")} className="group relative p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:shadow-lg hover:scale-105 transition-all text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-emerald-500" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Create with Categories or Curriculum</h3>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 absolute bottom-4 right-4" />
                </button>
                <button onClick={() => { handleClose(); onStartFromScratch(); }} className="group relative p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:shadow-lg hover:scale-105 transition-all text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Start from scratch</h3>
                  </div>
                  <p className="text-xs text-slate-500">Build your resource step by step</p>
                  <ChevronRight className="h-4 w-4 text-slate-400 absolute bottom-4 right-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Customize Assessment ── */}
          {modalStep === "customize-assessment" && (
            <CustomizeAssessmentStep
              settings={settings}
              onChange={patch => setSettings(s => ({ ...s, ...patch }))}
              onBack={() => setModalStep("create-type")}
              onGenerate={handleGenerate}
              uploading={uploading}
            />
          )}

          {/* ── AI Config ── */}
          {modalStep === "ai-config" && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <Textarea placeholder="Enter a topic or paste content..." value={aiTopic} onChange={e => setAiTopic(e.target.value)} rows={6} className="resize-none text-base" />
              <div className="flex justify-end">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8" onClick={() => setModalStep("quiz-builder")} disabled={!aiTopic.trim()}>Next</Button>
              </div>
            </div>
          )}

          {/* ── Categories ── */}
          {modalStep === "categories-curriculum" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <button onClick={() => setModalStep("quiz-builder")} className="group relative p-6 rounded-xl border-2 border-slate-200 bg-white hover:border-indigo-400 hover:shadow-lg hover:scale-105 transition-all text-left min-h-[180px] flex flex-col justify-between">
                <div><h3 className="font-semibold text-slate-800">Categories</h3><p className="text-sm text-slate-500">All subjects and grades</p></div>
                <div className="flex gap-2 flex-wrap mt-4">{["Faith", "Leadership", "Worship", "Pastoral Care"].map(t => <span key={t} className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">{t}</span>)}</div>
              </button>
              <button onClick={() => setModalStep("quiz-builder")} className="group relative p-6 rounded-xl border-2 border-slate-200 bg-white hover:border-indigo-400 hover:shadow-lg hover:scale-105 transition-all text-left min-h-[180px] flex flex-col justify-between">
                <div><h3 className="font-semibold text-slate-800">Curriculum</h3><p className="text-sm text-slate-500">Structured learning paths</p></div>
                <div className="flex gap-2 flex-wrap mt-4">{["New Members", "Discipleship", "Ministry Training"].map(t => <span key={t} className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">{t}</span>)}</div>
              </button>
            </div>
          )}

          {/* ── Quiz Builder ── */}
          {modalStep === "quiz-builder" && (
            <QuizBuilder aiTopic={aiTopic} onClose={handleClose} />
          )}
        </div>
      </div>
    </div>
  );
}
