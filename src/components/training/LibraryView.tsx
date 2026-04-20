import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import {
  Pencil, Clock, Share2, LayoutList, FolderOpen, Users, Info,
  Search, ChevronDown, Globe, Plus, FileText, Sparkles,
  BookCheck, Trash2, Eye, MoreVertical,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import AddResourceDropdown from "./AddResourceDropdown";

interface LibraryViewProps {
  onCreateAssessment: () => void;
}

interface Quiz {
  id: string;
  title: string;
  status: string;
  grade_level: string | null;
  question_types: string[] | null;
  num_questions: number | null;
  language: string | null;
  source_file_name: string | null;
  questions: any[];
  created_at: string;
  updated_at: string;
}

const CREATION_TILES = [
  { icon: FileText,  color: "bg-pink-100 text-pink-600",    label: "Import from",   bold: "Worksheet",       key: "worksheet" },
  { icon: Sparkles,  color: "bg-indigo-100 text-indigo-600",label: "Generate from", bold: "Study materials", key: "study" },
  { icon: Globe,     color: "bg-emerald-100 text-emerald-600",label:"Generate from",bold: "Website",         key: "website" },
  { icon: FileText,  color: "bg-amber-100 text-amber-600",  label: "Generate from", bold: "Topic/Scripture", key: "topic" },
  { icon: Plus,      color: "bg-slate-100 text-slate-600",  label: "Or",            bold: "Create from scratch", key: "scratch" },
];

function ActivityTypeDropdown() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const types = ["Assessments", "Presentations", "Interactive videos", "Passages"];

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition-colors bg-white dark:bg-slate-800">
        Activity type <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-3">
          {types.map(t => (
            <label key={t} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
              <input type="checkbox" checked={checked.includes(t)} onChange={() => setChecked(c => c.includes(t) ? c.filter(x => x !== t) : [...c, t])} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function QuizCard({ quiz, onDelete }: { quiz: Quiz; onDelete: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const qCount = Array.isArray(quiz.questions) ? quiz.questions.length : (quiz.num_questions ?? 0);
  const types = quiz.question_types?.join(", ") ?? "MCQ";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 shrink-0">
            <BookCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{quiz.title}</p>
            <p className="text-xs text-slate-400 truncate">{quiz.source_file_name ?? "Assessment"}</p>
          </div>
        </div>
        <div className="relative shrink-0">
          <button onClick={() => setMenuOpen(o => !o)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                <Eye className="h-3.5 w-3.5" />Preview
              </button>
              <button onClick={() => { setMenuOpen(false); onDelete(quiz.id); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          {quiz.status === "published" ? "Published" : "Draft"}
        </span>
        {quiz.grade_level && (
          <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700">{quiz.grade_level}</span>
        )}
        <span className="text-[10px] text-slate-400">{qCount} question{qCount !== 1 ? "s" : ""}</span>
        <span className="text-[10px] text-slate-400">·</span>
        <span className="text-[10px] text-slate-400">{types}</span>
      </div>

      <p className="text-[10px] text-slate-400">{quiz.created_at ? format(new Date(quiz.created_at), "dd MMM yyyy · HH:mm") : "—"}</p>
    </div>
  );
}

function CreationTile({ tile, onClick }: { tile: typeof CREATION_TILES[0]; onClick: () => void }) {
  const Icon = tile.icon;
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:shadow-sm transition-all text-left">
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", tile.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-none mb-0.5">{tile.label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{tile.bold}</p>
      </div>
    </button>
  );
}

export default function LibraryView({ onCreateAssessment }: LibraryViewProps) {
  const { tenantId, userId } = useChurch();
  const qc = useQueryClient();
  const [activeNav, setActiveNav] = useState("Created");
  const [activeTab, setActiveTab] = useState("created");
  const [librarySearch, setLibrarySearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");

  const MAX_QUIZZES = 20;

  // Fetch all quizzes for this tenant/user
  const { data: allQuizzes = [], isLoading } = useQuery<Quiz[]>({
    queryKey: ["quizzes", tenantId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.QUIZZES)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Quiz[];
    },
    staleTime: 30_000,
  });

  const published = allQuizzes.filter(q => q.status === "published");
  const drafts     = allQuizzes.filter(q => q.status === "draft");
  const archived   = allQuizzes.filter(q => q.status === "archived");

  const activeQuizzes = activeTab === "created"  ? published
                      : activeTab === "draft"    ? drafts
                      : activeTab === "archived" ? archived
                      : published;

  const filtered = activeQuizzes.filter(q =>
    !librarySearch || q.title.toLowerCase().includes(librarySearch.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from(TABLES.QUIZZES).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["quizzes", tenantId, userId] });
    toast.success("Quiz deleted.");
  };

  const usedCount = published.length;
  const usedPct   = Math.min(100, (usedCount / MAX_QUIZZES) * 100);

  const NAV_ITEMS = [
    { icon: Pencil,     label: "Created",        count: `${usedCount}/${MAX_QUIZZES}` },
    { icon: Clock,      label: "Previously used", count: null },
    { icon: Share2,     label: "Shared with me",  count: null },
    { icon: LayoutList, label: "All activities",  count: null },
  ];

  const COLLECTION_ITEMS = [
    { icon: FolderOpen, label: "Collections", count: 0 },
    { icon: Users,      label: "Teams",       count: 0 },
  ];

  return (
    <div className="flex h-full min-h-[600px] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">

      {/* ── Left Sidebar ── */}
      <div className="w-60 shrink-0 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="px-4 pt-5 pb-3">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Library</h2>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, count }) => (
            <button key={label} onClick={() => setActiveNav(label)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left", activeNav === label ? "bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800")}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {count && <span className="text-xs text-slate-400">{count}</span>}
            </button>
          ))}
          <div className="h-px bg-slate-200 dark:bg-slate-700 my-2 mx-1" />
          {COLLECTION_ITEMS.map(({ icon: Icon, label, count }) => (
            <button key={label} onClick={() => setActiveNav(label)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left", activeNav === label ? "bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800")}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              <span className="text-xs text-slate-400">{count}</span>
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{usedCount}/{MAX_QUIZZES} activities created</span>
            <Info className="h-3.5 w-3.5 shrink-0" />
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${usedPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top search */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search by activity name" value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Created by me</h3>
            <AddResourceDropdown onAssessment={onCreateAssessment} />
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {[
              { key: "created",  label: `Created (${published.length}/${MAX_QUIZZES})` },
              { key: "draft",    label: `Draft (${drafts.length})` },
              { key: "archived", label: `Archived (${archived.length})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors border", activeTab === tab.key ? "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 shadow-sm" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300")}>
                {tab.label}
              </button>
            ))}
            <div className="flex-1" />
            <ActivityTypeDropdown />
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-36 rounded-xl bg-slate-100 animate-pulse" />)}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(quiz => (
                <QuizCard key={quiz.id} quiz={quiz} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-10 gap-5">
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {activeTab === "draft" ? "📝 No drafts yet" : activeTab === "archived" ? "📦 No archived quizzes" : "✏️ Let's create your first activity!"}
              </p>
              {activeTab === "created" && (
                <>
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="text" placeholder="Search for an activity" value={activitySearch} onChange={e => setActivitySearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Or create one using <span className="font-bold text-slate-800 dark:text-slate-100">Groq AI</span></p>
                  <div className="w-full max-w-2xl grid grid-cols-2 gap-3">
                    {CREATION_TILES.slice(0, 2).map(tile => <CreationTile key={tile.key} tile={tile} onClick={onCreateAssessment} />)}
                  </div>
                  <div className="w-full max-w-2xl grid grid-cols-3 gap-3">
                    {CREATION_TILES.slice(2).map(tile => <CreationTile key={tile.key} tile={tile} onClick={onCreateAssessment} />)}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
