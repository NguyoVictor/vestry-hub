import { useState } from "react";
import { X, Upload, Sparkles, ChevronRight, FileText, ChevronLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ResourceTypeCard from "./ResourceTypeCard";
import QuizBuilder from "./QuizBuilder";

type ModalStep = "create-type" | "ai-config" | "categories-curriculum" | "quiz-builder";

const GRADE_LEVELS = [
  "Kindergarten", "1st grade", "2nd grade", "3rd grade", "4th grade", "5th grade",
  "6th grade", "7th grade", "8th grade", "9th grade", "10th grade", "11th grade",
  "12th grade", "University", "Professional Development", "Vocational Training",
];

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese", "Dutch",
  "Russian", "Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Swahili",
];

const DOK_LEVELS: { level: 1 | 2 | 3; label: string; tooltip: string }[] = [
  { level: 1, label: "Level 1", tooltip: "Recall" },
  { level: 2, label: "Level 2", tooltip: "Skill/Concept" },
  { level: 3, label: "Level 3", tooltip: "Strategic Thinking" },
];

const QUESTION_COUNTS: ("auto" | number)[] = ["auto", 10, 15, 20, 30];

interface CreateResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateResourceModal({ isOpen, onClose }: CreateResourceModalProps) {
  const [modalStep, setModalStep] = useState<ModalStep>("create-type");
  const [aiTopic, setAiTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [dokLevel, setDokLevel] = useState<1 | 2 | 3>(1);
  const [numQuestions, setNumQuestions] = useState<"auto" | number>("auto");
  const [outputLang, setOutputLang] = useState("English");

  if (!isOpen) return null;

  function handleReset() {
    setModalStep("create-type");
    setAiTopic("");
    setGradeLevel("");
    setDokLevel(1);
    setNumQuestions("auto");
    setOutputLang("English");
  }

  function handleClose() {
    handleReset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={handleClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          {/* Back button — only shown when not on first step */}
          {modalStep !== "create-type" ? (
            <button
              onClick={() => {
                if (modalStep === "ai-config") setModalStep("create-type");
                else if (modalStep === "categories-curriculum") setModalStep("create-type");
                else if (modalStep === "quiz-builder") setModalStep("create-type");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Go Back
            </button>
          ) : (
            <div className="w-24" /> /* spacer to keep title centered */
          )}

          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center flex-1">
            {modalStep === "create-type" && "How would you like to get started?"}
            {modalStep === "ai-config" && "Create with prompt or text"}
            {modalStep === "categories-curriculum" && "Create with Categories or Curriculum"}
            {modalStep === "quiz-builder" && "Create Assessment"}
          </h2>

          {/* X — always closes modal entirely */}
          <button
            onClick={handleClose}
            className="w-24 flex justify-end p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* ── Step 1: How to Get Started ── */}
          {modalStep === "create-type" && (
            <div className="space-y-6">
              {/* Upload Zone */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center bg-slate-50 dark:bg-slate-900/50">
                <Upload className="h-10 w-10 mx-auto mb-3 text-slate-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Upload lesson slides, worksheets or any document
                </p>
                <p className="text-xs text-slate-500 mb-4">File size upto 50 MB and less than 100 pages</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" /> Device
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
                    </svg>
                    Google Drive
                  </Button>
                  <Input placeholder="Paste any link here..." className="max-w-xs" />
                </div>
              </div>

              {/* Option Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Generate with AI */}
                <button
                  onClick={() => setModalStep("ai-config")}
                  className="group relative p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:shadow-lg hover:scale-105 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-indigo-500" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Create with prompt or text</h3>
                  </div>
                  <Input
                    placeholder="Enter a topic..."
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm"
                  />
                </button>

                {/* Create with Categories or Curriculum */}
                <button
                  onClick={() => setModalStep("categories-curriculum")}
                  className="group relative p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:shadow-lg hover:scale-105 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-emerald-500" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Create with Categories or Curriculum</h3>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 absolute bottom-4 right-4" />
                </button>

                {/* Start from Scratch */}
                <button
                  onClick={() => setModalStep("quiz-builder")}
                  className="group relative p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:shadow-lg hover:scale-105 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Start from scratch</h3>
                  </div>
                  <p className="text-xs text-slate-500">Build your resource step by step</p>
                  <ChevronRight className="h-4 w-4 text-slate-400 absolute bottom-4 right-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: AI Configuration ── */}
          {modalStep === "ai-config" && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Topic input */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Enter a topic or paste content..."
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  rows={6}
                  className="resize-none text-base"
                />
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Customise your assessment</h3>

                {/* Grade level */}
                <div className="grid grid-cols-[140px_1fr] gap-4 items-center mb-5">
                  <Label className="text-sm text-slate-600 dark:text-slate-400">Grade level</Label>
                  <Select value={gradeLevel} onValueChange={setGradeLevel}>
                    <SelectTrigger><SelectValue placeholder="Select a grade" /></SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* DOK Level */}
                <div className="grid grid-cols-[140px_1fr] gap-4 items-center mb-5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-sm text-slate-600 dark:text-slate-400">Depth of knowledge (DOK)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-sm p-4">
                          <p className="font-semibold mb-2">A framework for understanding the complexity of tasks:</p>
                          <p className="text-xs mb-2"><strong>DOK Level 1 – Recall:</strong> Simple recall of facts, terms, or basic concepts.</p>
                          <p className="text-xs mb-2"><strong>DOK Level 2 – Skill/Concept:</strong> Applies knowledge or procedures to solve problems.</p>
                          <p className="text-xs"><strong>DOK Level 3 – Strategic Thinking:</strong> Involves deep understanding, reasoning, and complex decision-making.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex gap-2">
                    {DOK_LEVELS.map(({ level, label, tooltip }) => (
                      <TooltipProvider key={level}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setDokLevel(level)}
                              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                                ${dokLevel === level
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                                  : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                                }`}
                            >
                              {label}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">{tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>

                {/* Number of questions */}
                <div className="grid grid-cols-[140px_1fr] gap-4 items-center mb-5">
                  <Label className="text-sm text-slate-600 dark:text-slate-400">Number of questions</Label>
                  <div className="flex gap-2 flex-wrap">
                    {QUESTION_COUNTS.map(count => (
                      <button
                        key={count}
                        onClick={() => setNumQuestions(count)}
                        className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all capitalize
                          ${numQuestions === count
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                            : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                          }`}
                      >
                        {count === "auto" ? "Automatic" : count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Output language */}
                <div className="grid grid-cols-[140px_1fr] gap-4 items-center mb-5">
                  <Label className="text-sm text-slate-600 dark:text-slate-400">Output language</Label>
                  <Select value={outputLang} onValueChange={setOutputLang}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Next button */}
              <div className="flex justify-end pt-4">
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
                  onClick={() => setModalStep("quiz-builder")}
                  disabled={!aiTopic.trim()}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* ── Step: Categories or Curriculum ── */}
          {modalStep === "categories-curriculum" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* Categories card */}
              <button
                onClick={() => setModalStep("quiz-builder")}
                className="group relative p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:shadow-lg hover:scale-105 transition-all text-left min-h-[180px] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Categories</h3>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">All subjects and grades</p>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  {["Faith", "Leadership", "Worship", "Pastoral Care", "Youth"].map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>

              {/* Curriculum card */}
              <button
                onClick={() => setModalStep("quiz-builder")}
                className="group relative p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:shadow-lg hover:scale-105 transition-all text-left min-h-[180px] flex flex-col justify-between overflow-hidden"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Curriculum</h3>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">Structured learning paths</p>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  {["New Members", "Discipleship", "Ministry Training", "Bible Study"].map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            </div>
          )}

          {/* ── Step: Quiz Builder ── */}
          {modalStep === "quiz-builder" && (
            <QuizBuilder aiTopic={aiTopic} onClose={handleClose} />
          )}
        </div>
      </div>
    </div>
  );
}
