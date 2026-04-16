import { useState } from "react";
import { X, Upload, Sparkles, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ResourceTypeCard from "./ResourceTypeCard";
import QuizBuilder from "./QuizBuilder";

type ModalStep = "create-type" | "resource-type" | "quiz-builder";

interface CreateResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateResourceModal({ isOpen, onClose }: CreateResourceModalProps) {
  const [modalStep, setModalStep] = useState<ModalStep>("create-type");
  const [aiTopic, setAiTopic] = useState("");

  if (!isOpen) return null;

  function handleReset() {
    setModalStep("create-type");
    setAiTopic("");
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
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {modalStep === "create-type" && "How would you like to get started?"}
            {modalStep === "resource-type" && "What would you like to create?"}
            {modalStep === "quiz-builder" && "Create Assessment"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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
                  onClick={() => setModalStep("quiz-builder")}
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
                  onClick={() => setModalStep("quiz-builder")}
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

          {/* ── Step 2: Quiz Builder ── */}
          {modalStep === "quiz-builder" && (
            <QuizBuilder aiTopic={aiTopic} onClose={handleClose} />
          )}
        </div>
      </div>
    </div>
  );
}
