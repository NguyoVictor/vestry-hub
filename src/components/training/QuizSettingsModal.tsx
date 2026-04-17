import { useState, useRef, useEffect } from "react";
import {
  X, Settings, Pencil, BookOpen, GraduationCap, Languages,
  Save, Plus, ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const SUBJECTS = [
  "Bible Study", "Theology", "Church History", "Christian Living",
  "Youth Ministry", "Children's Ministry", "Leadership", "Other",
];

const GRADES = [
  "Kindergarten", "1st grade", "2nd grade", "3rd grade", "4th grade", "5th grade",
  "6th grade", "7th grade", "8th grade", "9th grade", "10th grade", "11th grade",
  "12th grade", "University", "Professional Development", "Vocational Training",
];

const LANGUAGES = [
  "English", "Swahili", "French", "Portuguese", "Spanish",
];

const VISIBILITY_OPTIONS = [
  {
    value: "public",
    label: "Publicly visible",
    desc: "This resource will be publicly visible in the Assessment library",
  },
  {
    value: "restricted",
    label: "Restricted",
    desc: "This resource will be visible only by you and the people you share this with",
  },
  {
    value: "organization",
    label: "Everyone in my organization",
    desc: "This resource will be visible only to members in your organization",
  },
];

const TEACHING_GOALS = ["Teach", "Review", "Practice", "Other"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface QuizSettings {
  title: string;
  subject: string;
  grade: string;
  language: string;
  visibility: "public" | "restricted" | "organization";
  teachingGoals: string[];
  coverImagePath: string;
  coverImageUrl: string;
}

interface QuizSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: QuizSettings;
  onSave: (s: QuizSettings) => void;
}

export default function QuizSettingsModal({ isOpen, onClose, settings, onSave }: QuizSettingsModalProps) {
  const [form, setForm] = useState<QuizSettings>({ ...settings });
  const [uploading, setUploading] = useState(false);
  const [hovering, setHovering] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync when settings prop changes (e.g. title updated externally)
  useEffect(() => { setForm({ ...settings }); }, [settings, isOpen]);

  if (!isOpen) return null;

  function setField<K extends keyof QuizSettings>(k: K, v: QuizSettings[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function toggleGoal(goal: string) {
    setForm(f => ({
      ...f,
      teachingGoals: f.teachingGoals.includes(goal)
        ? f.teachingGoals.filter(g => g !== goal)
        : [...f.teachingGoals, goal],
    }));
  }

  async function handleImageUpload(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, or WebP images allowed"); return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("quiz-covers").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("quiz-covers").getPublicUrl(path);
      setForm(f => ({ ...f, coverImagePath: path, coverImageUrl: data.publicUrl }));
      toast.success("Cover image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function removeCover() {
    if (form.coverImagePath) {
      await supabase.storage.from("quiz-covers").remove([form.coverImagePath]);
    }
    setForm(f => ({ ...f, coverImagePath: "", coverImageUrl: "" }));
  }

  function handleSave() {
    if (!form.title.trim()) { toast.error("Quiz name is required"); return; }
    onSave(form);
    onClose();
    toast.success("Quiz settings saved");
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <Settings className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex-1">Quiz settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-6">

            {/* ── Left column ── */}
            <div className="space-y-5">

              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Name</Label>
                <div className="relative">
                  <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={form.title}
                    onChange={e => setField("title", e.target.value.slice(0, 64))}
                    placeholder="Untitled Quiz"
                    maxLength={64}
                    className="pl-9 pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    {form.title.length}/64
                  </span>
                </div>
              </div>

              {/* Subject + Grade */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Subject</Label>
                  <Select value={form.subject} onValueChange={v => setField("subject", v)}>
                    <SelectTrigger className="gap-2">
                      <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
                      <SelectValue placeholder="Select relevant subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Grade</Label>
                  <Select value={form.grade} onValueChange={v => setField("grade", v)}>
                    <SelectTrigger className="gap-2">
                      <GraduationCap className="h-4 w-4 text-slate-400 shrink-0" />
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Language</Label>
                <Select value={form.language} onValueChange={v => setField("language", v)}>
                  <SelectTrigger className="gap-2">
                    <Languages className="h-4 w-4 text-slate-400 shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Visibility */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Visibility</Label>
                <div className="space-y-2">
                  {VISIBILITY_OPTIONS.map(opt => {
                    const selected = form.visibility === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setField("visibility", opt.value as QuizSettings["visibility"])}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all
                          ${selected
                            ? "border-orange-400 bg-orange-50 dark:bg-orange-900/10"
                            : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
                          }`}
                      >
                        <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors
                          ${selected ? "border-orange-500" : "border-slate-300"}`}>
                          {selected && <div className="h-2 w-2 rounded-full bg-orange-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{opt.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Teaching goal */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Teaching goal <span className="font-normal text-slate-400">(optional)</span></Label>
                <div className="flex gap-2 flex-wrap">
                  {TEACHING_GOALS.map(goal => {
                    const active = form.teachingGoals.includes(goal);
                    return (
                      <button
                        key={goal}
                        onClick={() => toggleGoal(goal)}
                        className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all
                          ${active
                            ? "border-orange-400 bg-orange-500 text-white"
                            : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-orange-300"
                          }`}
                      >
                        {goal}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Right column — Cover image ── */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cover image</Label>
              <div
                className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden cursor-pointer"
                style={{ minHeight: 220 }}
                onClick={() => !form.coverImageUrl && fileRef.current?.click()}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
              >
                {form.coverImageUrl ? (
                  <>
                    <img src={form.coverImageUrl} alt="Cover" className="w-full h-full object-cover absolute inset-0" />
                    {hovering && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                          className="px-3 py-1.5 rounded-lg bg-white text-slate-800 text-xs font-semibold hover:bg-slate-100 transition-colors"
                        >
                          Change image
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); removeCover(); }}
                          className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12 gap-2">
                    {uploading ? (
                      <div className="h-8 w-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <Plus className="h-5 w-5 text-slate-500" />
                        </div>
                        <p className="text-sm text-slate-500">Add cover image</p>
                        <p className="text-xs text-slate-400">JPG, PNG or WebP · max 5MB</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
            onClick={handleSave}
          >
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}
