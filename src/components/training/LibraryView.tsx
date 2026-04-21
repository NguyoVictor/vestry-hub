import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Pencil, Clock, Share2, LayoutList, FolderOpen, Users, Info,
  Search, ChevronDown, Globe, Plus, FileText, Sparkles,
  Play, Share, MoreVertical, Eye, BookmarkPlus, Copy, Archive,
  UserPlus, Users2, Timer, ArrowRight, X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import AddResourceDropdown from "./AddResourceDropdown";
import { SessionModeSelector } from "./SessionModeSelector";

interface LibraryViewProps { onCreateAssessment: () => void; }
interface Quiz {
  id: string; title: string; status: string; grade_level: string | null;
  question_types: string[] | null; num_questions: number | null;
  language: string | null; source_file_name: string | null;
  questions: any[]; created_at: string; updated_at: string;
}

const CREATION_TILES = [
  { icon: FileText,  color: "bg-pink-100 text-pink-600",     label: "Import from",   bold: "Worksheet",       key: "worksheet" },
  { icon: Sparkles,  color: "bg-indigo-100 text-indigo-600", label: "Generate from", bold: "Study materials", key: "study" },
  { icon: Globe,     color: "bg-emerald-100 text-emerald-600",label:"Generate from", bold: "Website",         key: "website" },
  { icon: FileText,  color: "bg-amber-100 text-amber-600",   label: "Generate from", bold: "Topic/Scripture", key: "topic" },
  { icon: Plus,      color: "bg-slate-100 text-slate-600",   label: "Or",            bold: "Create from scratch", key: "scratch" },
];

// ── Popover helper ─────────────────────────────────────────────────────────────
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return { open, setOpen, ref };
}

// ── Activity type filter ───────────────────────────────────────────────────────
function ActivityTypeDropdown() {
  const { open, setOpen, ref } = usePopover();
  const [checked, setChecked] = useState<string[]>([]);
  const types = ["Assessments", "Presentations", "Interactive videos", "Passages"];
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:border-slate-400 transition-colors bg-white dark:bg-slate-800">
        Activity type <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-2">
          {types.map(t => (
            <label key={t} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
              <input type="checkbox" checked={checked.includes(t)} onChange={() => setChecked(c => c.includes(t) ? c.filter(x => x !== t) : [...c, t])} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm text-slate-800 dark:text-slate-100">{t}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Quiz row ───────────────────────────────────────────────────────────────────
function QuizRow({
  quiz, selected, onSelect, onArchive, onStartNow,
}: {
  quiz: Quiz; selected: boolean;
  onSelect: (id: string) => void;
  onArchive: (id: string) => void;
  onStartNow: (quiz: Quiz) => void;
}) {
  const playPopover  = usePopover();
  const sharePopover = usePopover();
  const morePopover  = usePopover();

  const qCount = Array.isArray(quiz.questions) ? quiz.questions.length : (quiz.num_questions ?? 0);
  const types  = quiz.question_types?.join(", ") ?? "Other";
  const grade  = quiz.grade_level ?? "";
  const createdAgo = quiz.created_at
    ? formatDistanceToNow(new Date(quiz.created_at), { addSuffix: false }) + " ago"
    : "—";

  return (
    <div className={cn("flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors", selected && "bg-slate-50 dark:bg-slate-700/30")}>
      <input type="checkbox" checked={selected} onChange={() => onSelect(quiz.id)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0" />
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 dark:bg-slate-700 shrink-0">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
          <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z" fill="currentColor" opacity="0.7" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{quiz.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-emerald-500 shrink-0" fill="currentColor">
            <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.5 6.5l-4 4a.75.75 0 01-1.06 0l-2-2a.75.75 0 011.06-1.06L7 8.94l3.47-3.47a.75.75 0 011.06 1.06z" />
          </svg>
          <span className="text-xs text-slate-500 dark:text-slate-400">· {qCount} Qs · {types} · {grade}</span>
        </div>
      </div>
      <span className="text-sm text-slate-500 dark:text-slate-400 shrink-0 w-32 text-right">{createdAgo}</span>

      {/* ── Action buttons — always visible ── */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Play */}
        <div className="relative" ref={playPopover.ref}>
          <button
            onClick={() => { playPopover.setOpen(o => !o); sharePopover.setOpen(false); morePopover.setOpen(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors bg-white dark:bg-slate-800"
          >
            <Play className="h-3.5 w-3.5" />Play
          </button>
          {playPopover.open && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[60] py-1.5">
              <button onClick={() => { playPopover.setOpen(false); onStartNow(quiz); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">                <Play className="h-4 w-4" />Start now
              </button>
              <button onClick={() => { playPopover.setOpen(false); toast.info("Assign — coming soon"); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Timer className="h-4 w-4" />Assign
              </button>
              <button onClick={() => { playPopover.setOpen(false); toast.info("Preview — coming soon"); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Eye className="h-4 w-4" />Preview
              </button>
            </div>
          )}
        </div>

        {/* Share */}
        <div className="relative" ref={sharePopover.ref}>
          <button
            onClick={() => { sharePopover.setOpen(o => !o); playPopover.setOpen(false); morePopover.setOpen(false); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors bg-white dark:bg-slate-800"
          >
            <Share className="h-4 w-4" />
          </button>
          {sharePopover.open && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[60] py-1.5">
              <button onClick={() => { sharePopover.setOpen(false); toast.info("Share with teacher — coming soon"); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <UserPlus className="h-4 w-4" />Share with teacher
              </button>
              <button onClick={() => { sharePopover.setOpen(false); toast.info("Share with team — coming soon"); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Users2 className="h-4 w-4" />Share with team
              </button>
            </div>
          )}
        </div>

        {/* More */}
        <div className="relative" ref={morePopover.ref}>
          <button
            onClick={() => { morePopover.setOpen(o => !o); playPopover.setOpen(false); sharePopover.setOpen(false); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors bg-white dark:bg-slate-800"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {morePopover.open && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[60] py-1.5">
              <button onClick={() => { morePopover.setOpen(false); toast.success("Saved!"); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <BookmarkPlus className="h-4 w-4" />Save
              </button>
              <button onClick={() => { morePopover.setOpen(false); toast.info("Copy and edit — coming soon"); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Copy className="h-4 w-4" />Copy and edit
              </button>
              <button onClick={() => { morePopover.setOpen(false); onArchive(quiz.id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Archive className="h-4 w-4" />Archive
              </button>
            </div>
          )}
        </div>
      </div>
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

// ── Main LibraryView ───────────────────────────────────────────────────────────
export default function LibraryView({ onCreateAssessment }: LibraryViewProps) {
  const { tenantId, userId } = useChurch();
  const qc = useQueryClient();
  const [activeNav, setActiveNav]   = useState("Created");
  const [activeTab, setActiveTab]   = useState("created");
  const [librarySearch, setLibrarySearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [sortAsc, setSortAsc]       = useState(false);
  // Step 1: Play → Start Now → opens host modal
  const [hostModalQuiz, setHostModalQuiz] = useState<Quiz | null>(null);
  // Step 2: Host modal → Student Paced → opens session mode selector
  const [startNowQuiz, setStartNowQuiz] = useState<Quiz | null>(null);

  const MAX_QUIZZES = 20;

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
  const drafts    = allQuizzes.filter(q => q.status === "draft");
  const archived  = allQuizzes.filter(q => q.status === "archived");

  const activeList = activeTab === "created"  ? published
                   : activeTab === "draft"    ? drafts
                   : activeTab === "archived" ? archived
                   : published;

  const filtered = activeList
    .filter(q => !librarySearch || q.title.toLowerCase().includes(librarySearch.toLowerCase()))
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortAsc ? diff : -diff;
    });

  const handleArchive = async (id: string) => {
    const { error } = await supabase.from(TABLES.QUIZZES).update({ status: "archived" } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["quizzes", tenantId, userId] });
    toast.success("Moved to Archive.");
  };

  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => setSelected(s => s.size === filtered.length ? new Set() : new Set(filtered.map(q => q.id)));

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
    <>
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
        <div className="px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search by activity name" value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Created by me</h3>
            <AddResourceDropdown onAssessment={onCreateAssessment} />
          </div>

          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {[
              { key: "created",  label: `Created (${published.length}/${MAX_QUIZZES})` },
              { key: "draft",    label: `Draft (${drafts.length})` },
              { key: "archived", label: `Archived (${archived.length})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors border", activeTab === tab.key ? "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 shadow-sm font-semibold" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300")}>
                {tab.label}
              </button>
            ))}
            <div className="flex-1" />
            <ActivityTypeDropdown />
          </div>

          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />)}</div>
          ) : filtered.length > 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-visible">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0" />
                <button className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 flex-1">
                  Activity details
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 ml-0.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 7l3-3 3 3M5 9l3 3 3-3" /></svg>
                </button>
                <button onClick={() => setSortAsc(a => !a)} className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 w-32 justify-end">
                  Creation time <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", sortAsc && "rotate-180")} />
                </button>
                <div className="w-44 shrink-0" />
              </div>
              {filtered.map(quiz => (
                <QuizRow
                  key={quiz.id}
                  quiz={quiz}
                  selected={selected.has(quiz.id)}
                  onSelect={toggleSelect}
                  onArchive={handleArchive}
                  onStartNow={q => setHostModalQuiz(q)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-5">
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

    {/* Step 2: "How would you like to host?" modal */}
    <Dialog open={!!hostModalQuiz} onOpenChange={v => !v && setHostModalQuiz(null)}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <DialogTitle className="text-xl font-bold text-slate-800">
            How would you like to host the session?
          </DialogTitle>
          <button onClick={() => setHostModalQuiz(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 px-6 pb-6">
          {/* Student Paced */}
          <button
            onClick={() => {
              const quiz = hostModalQuiz;
              setHostModalQuiz(null);
              setStartNowQuiz(quiz);
            }}
            className="group flex flex-col rounded-xl border-2 border-slate-200 overflow-hidden hover:border-indigo-400 hover:shadow-lg transition-all text-left"
          >
            <div className="h-36 bg-gradient-to-br from-purple-700 to-purple-900 flex items-center justify-center overflow-hidden">
              <svg viewBox="0 0 120 100" className="h-28 w-28" fill="none">
                <circle cx="60" cy="30" r="18" fill="#fff" opacity="0.9"/>
                <rect x="30" y="52" width="60" height="40" rx="8" fill="#6D28D9" opacity="0.8"/>
                <rect x="38" y="42" width="44" height="28" rx="4" fill="#fff" opacity="0.15"/>
                <rect x="42" y="46" width="36" height="20" rx="3" fill="#A78BFA" opacity="0.6"/>
                <circle cx="60" cy="30" r="10" fill="#DDD6FE"/>
                <circle cx="56" cy="28" r="2" fill="#7c3aed"/>
                <circle cx="64" cy="28" r="2" fill="#7c3aed"/>
                <path d="M56 33 Q60 36 64 33" stroke="#7c3aed" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                <path d="M48 22 Q48 14 60 14 Q72 14 72 22" fill="#6d28d9"/>
                <rect x="47" y="21" width="26" height="4" rx="2" fill="#5b21b6"/>
              </svg>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-base font-bold text-slate-800">Student paced</p>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </div>
              <p className="text-sm text-slate-500 leading-snug">Students work at their own pace</p>
            </div>
          </button>

          {/* Teacher Led */}
          <button
            onClick={() => {
              setHostModalQuiz(null);
              toast.info("Teacher Led mode — coming soon!");
            }}
            className="group flex flex-col rounded-xl border-2 border-slate-200 overflow-hidden hover:border-indigo-400 hover:shadow-lg transition-all text-left"
          >
            <div className="h-36 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center overflow-hidden">
              <svg viewBox="0 0 120 100" className="h-28 w-28" fill="none">
                <rect x="20" y="15" width="80" height="55" rx="6" fill="#fff" opacity="0.15"/>
                <rect x="24" y="19" width="72" height="47" rx="4" fill="#BFDBFE" opacity="0.5"/>
                <rect x="30" y="25" width="35" height="10" rx="2" fill="#3B82F6"/>
                <rect x="30" y="40" width="25" height="7" rx="2" fill="#93C5FD"/>
                <rect x="30" y="52" width="30" height="7" rx="2" fill="#93C5FD"/>
                <circle cx="88" cy="72" r="13" fill="#F97316" opacity="0.9"/>
                <circle cx="88" cy="67" r="7" fill="#fff" opacity="0.9"/>
                <rect x="80" y="77" width="16" height="12" rx="4" fill="#fff" opacity="0.7"/>
                <circle cx="52" cy="80" r="11" fill="#fff" opacity="0.8"/>
                <circle cx="52" cy="75" r="6" fill="#BFDBFE"/>
                <rect x="45" y="84" width="14" height="9" rx="3" fill="#BFDBFE" opacity="0.7"/>
              </svg>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-base font-bold text-slate-800">Teacher led</p>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </div>
              <p className="text-sm text-slate-500 leading-snug">You lead the session, students answer on their devices</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Step 3: Session Mode Selector — fullscreen overlay */}
    {startNowQuiz && (
      <div className="fixed inset-0 z-[100]">
        <SessionModeSelector
          quizTitle={startNowQuiz.title}
          quiz={startNowQuiz}
          onBack={() => setStartNowQuiz(null)}
          onSelect={(mode) => {
            toast.success(`Starting "${startNowQuiz.title}" in ${mode} mode!`);
            setStartNowQuiz(null);
          }}
        />
      </div>
    )}
    </>
  );
}
