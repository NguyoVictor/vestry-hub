import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, Settings, Trophy, Gamepad2, Info, ChevronDown, Users, X, Search, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ClassicSessionSettingsProps {
  quiz: { id: string; title: string; questions: any[]; num_questions?: number | null };
  onBack: () => void;
  onStart: (settings: SessionSettings) => void;
}

interface SessionSettings {
  assignedClass: string | null;
  sessionAttempts: "unlimited" | 1 | 2 | 3;
  questionTimer: string;
  strikeAndShield: boolean;
  anonymizeNames: boolean;
  skipQuestions: boolean;
  redemptionQuestions: boolean;
  rotatingQuestionSet: string;
  showAnswerAfterEach: "on" | "validate_only" | "off";
  showAllAnswersAfterSession: "on" | "questions_only" | "off";
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  seriousTheme: boolean;
  leaderboard: boolean;
  powerUps: boolean;
  liveReactions: boolean;
  playMusic: boolean;
  showMemes: boolean;
}

type TabId = "general" | "mastery" | "gamification";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "general",      label: "General",      icon: Settings },
  { id: "mastery",      label: "Mastery",       icon: Trophy },
  { id: "gamification", label: "Gamification",  icon: Gamepad2 },
];

// ── Toggle row ─────────────────────────────────────────────────────────────────
function ToggleRow({ label, description, checked, onChange, info }: {
  label: string; description?: string; checked: boolean;
  onChange: (v: boolean) => void; info?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-slate-800">{label}</span>
          {info && (
            <div className="group relative">
              <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
              <div className="absolute left-5 top-0 z-50 hidden group-hover:block w-52 rounded-lg bg-slate-800 text-white text-xs p-2.5 shadow-xl leading-relaxed">{info}</div>
            </div>
          )}
        </div>
        {description && <p className="text-xs text-slate-400 mt-0.5 leading-snug">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-emerald-500 shrink-0" />
    </div>
  );
}

// ── Three-way toggle ───────────────────────────────────────────────────────────
function ThreeWay<T extends string>({ label, options, value, onChange }: {
  label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-100 last:border-0">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <div className="flex items-center rounded-full border border-slate-200 overflow-hidden">
        {options.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", value === opt.value ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Session attempts row ───────────────────────────────────────────────────────
function SessionAttemptsRow({ value, onChange }: { value: "unlimited" | 1 | 2 | 3; onChange: (v: "unlimited" | 1 | 2 | 3) => void }) {
  const opts: ("unlimited" | 1 | 2 | 3)[] = ["unlimited", 1, 2, 3];
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-100">
      <span className="text-sm font-medium text-slate-800">Session attempts</span>
      <div className="flex items-center gap-1.5">
        {opts.map(opt => (
          <button key={opt} onClick={() => onChange(opt)} className={cn("px-3 py-1.5 text-xs font-medium rounded-full border transition-colors", value === opt ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400")}>
            {opt === "unlimited" ? "Unlimited" : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Import Class Modal ─────────────────────────────────────────────────────────
function ImportClassModal({ open, onClose, onImport, tenantId }: {
  open: boolean; onClose: () => void;
  onImport: (className: string) => void;
  tenantId: string;
}) {
  const [source, setSource] = useState<"members" | "childrens">("members");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: members = [] } = useQuery({
    queryKey: ["members-import-class", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.MEMBERS).select("id, first_name, last_name, email, status").eq("tenant_id", tenantId).order("first_name");
      return data ?? [];
    },
    staleTime: 300_000,
    enabled: open && source === "members",
  });

  const filtered = members.filter((m: any) => {
    const q = search.toLowerCase();
    return `${m.first_name ?? ""} ${m.last_name ?? ""}`.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q);
  });

  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleImport = () => {
    const label = source === "members" ? `Members (${selected.size})` : `Children's Ministry (${selected.size})`;
    onImport(label);
    onClose();
    toast.success(`Imported ${selected.size} participants`);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
          <DialogTitle className="text-base font-semibold">Import Class</DialogTitle>
          <p className="text-xs text-slate-400 mt-0.5">Choose participants from your church system</p>
        </DialogHeader>

        {/* Source selector */}
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="flex gap-2">
            {([
              { id: "members", label: "Members" },
              { id: "childrens", label: "Children's Ministry" },
            ] as const).map(s => (
              <button key={s.id} onClick={() => { setSource(s.id); setSelected(new Set()); setSearch(""); }} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", source === s.id ? "bg-slate-800 text-white border-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
                <Users className="h-3.5 w-3.5" />{s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {source === "childrens" ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
              <Users className="h-8 w-8 opacity-30" />
              <p className="text-sm">Children's Ministry coming soon</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No members found</div>
          ) : filtered.map((m: any) => {
            const name = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "—";
            const sel = selected.has(m.id);
            return (
              <button key={m.id} onClick={() => toggle(m.id)} className={cn("w-full flex items-center gap-3 px-5 py-3 text-left transition-colors", sel ? "bg-orange-50" : "hover:bg-slate-50")}>
                <div className={cn("h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors", sel ? "border-orange-500 bg-orange-500" : "border-slate-300")}>
                  {sel && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600 text-xs font-semibold shrink-0">
                  {(name[0] ?? "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
                  <p className="text-xs text-slate-400 truncate">{m.email ?? "—"}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">{selected.size} selected</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleImport} disabled={selected.size === 0} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors disabled:opacity-50">
              Import ({selected.size})
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main ClassicSessionSettings ───────────────────────────────────────────────
export function ClassicSessionSettings({ quiz, onBack, onStart }: ClassicSessionSettingsProps) {
  const { tenantId } = useChurch();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [importOpen, setImportOpen] = useState(false);
  const [assignedClass, setAssignedClass] = useState<string | null>(null);

  const [settings, setSettings] = useState<SessionSettings>({
    assignedClass: null,
    sessionAttempts: "unlimited",
    questionTimer: "off",
    strikeAndShield: false,
    anonymizeNames: false,
    skipQuestions: false,
    redemptionQuestions: true,
    rotatingQuestionSet: "off",
    showAnswerAfterEach: "on",
    showAllAnswersAfterSession: "on",
    shuffleQuestions: true,
    shuffleAnswers: true,
    seriousTheme: false,
    leaderboard: true,
    powerUps: true,
    liveReactions: true,
    playMusic: false,
    showMemes: false,
  });

  const set = (patch: Partial<SessionSettings>) => setSettings(s => ({ ...s, ...patch }));
  // Count questions: prefer array length, fall back to num_questions field
  const qCount = Array.isArray(quiz.questions) && quiz.questions.length > 0
    ? quiz.questions.length
    : (quiz.num_questions ?? 0);

  return (
    <div className="min-h-screen bg-[#5c1a4a] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#4a1239]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Live</span>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500">
                <span className="text-[10px] text-white font-bold">Q</span>
              </div>
              <span className="text-sm font-semibold text-white truncate max-w-[200px]">{quiz.title}</span>
            </div>
            <span className="text-xs text-white/50">• {qCount} questions</span>
          </div>
        </div>
        <button
          onClick={() => onStart(settings)}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-white text-slate-800 text-sm font-bold hover:bg-slate-100 transition-colors shadow-md"
        >
          <Play className="h-4 w-4 fill-slate-800" />Start
        </button>
      </div>

      {/* Hero section */}
      <div className="flex items-start gap-6 px-8 py-6">
        <div className="flex-1">
          <h1 className="font-fredoka text-4xl font-bold text-white mb-1">Classic</h1>
          <p className="text-white/70 text-sm">Students answer at their own pace and you see results on a live leaderboard</p>
        </div>
        {/* Mini quiz illustration */}
        <div className="shrink-0 w-32 h-20 rounded-xl bg-[#7c2d5e] flex items-center justify-center overflow-hidden">
          <div className="flex gap-1.5">
            {["A","B","C","D"].map((l, i) => (
              <div key={l} className={`flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs font-bold ${i === 2 ? "bg-orange-500" : "bg-[#9d3d7a]"}`}>{l}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings card */}
      <div className="flex-1 mx-4 mb-4 bg-white rounded-2xl overflow-hidden shadow-xl">
        {/* Assignment Details */}
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Assignment Details</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Assign to a class</p>
              <p className="text-xs text-slate-400 mt-0.5">Get real student names and monitor student progress</p>
            </div>
            <div className="flex items-center gap-2">
              {assignedClass && (
                <div className="flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-medium text-orange-700">
                  <Users className="h-3 w-3" />{assignedClass}
                  <button onClick={() => setAssignedClass(null)} className="ml-1 text-orange-400 hover:text-orange-600"><X className="h-3 w-3" /></button>
                </div>
              )}
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Users className="h-4 w-4" />Import Class
              </button>
            </div>
          </div>
        </div>

        {/* Primary Settings */}
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Primary Settings</h3>
          <SessionAttemptsRow value={settings.sessionAttempts} onChange={v => set({ sessionAttempts: v })} />
          <div className="flex items-center justify-between py-3.5 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-800">Question timer</span>
            <Select value={settings.questionTimer} onValueChange={v => set({ questionTimer: v })}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="5">5 seconds</SelectItem>
                <SelectItem value="10">10 seconds</SelectItem>
                <SelectItem value="15">15 seconds</SelectItem>
                <SelectItem value="20">20 seconds</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="45">45 seconds</SelectItem>
                <SelectItem value="60">60 seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ToggleRow label="Strike & Shield" description="Students can Strike to reduce peer scores or Shield to defend their own." checked={settings.strikeAndShield} onChange={v => set({ strikeAndShield: v })} info="Strike reduces another student's score. Shield protects your own score from strikes." />
        </div>

        {/* More Settings */}
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">More settings</h3>

          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-slate-200 mb-4">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                  <Icon className="h-3.5 w-3.5" />{tab.label}
                </button>
              );
            })}
          </div>

          {/* General tab */}
          {activeTab === "general" && (
            <div className="space-y-0">
              <div className="rounded-xl border border-slate-200 px-4 mb-4">
                <h4 className="text-sm font-semibold text-slate-700 pt-3 pb-1">General</h4>
                <div className="flex items-center justify-between py-3.5 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-800">Question timer</span>
                  <Select value={settings.questionTimer} onValueChange={v => set({ questionTimer: v })}>
                    <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="5">5s</SelectItem>
                      <SelectItem value="10">10s</SelectItem>
                      <SelectItem value="15">15s</SelectItem>
                      <SelectItem value="20">20s</SelectItem>
                      <SelectItem value="30">30s</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ToggleRow label="Anonymize student names" checked={settings.anonymizeNames} onChange={v => set({ anonymizeNames: v })} info="Hides real names and shows random nicknames on the leaderboard." />
                <ToggleRow label="Skip questions & attempt later" checked={settings.skipQuestions} onChange={v => set({ skipQuestions: v })} info="Allows students to skip a question and come back to it." />
              </div>

              <div className="rounded-xl border border-slate-200 px-4 mb-4">
                <h4 className="text-sm font-semibold text-slate-700 pt-3 pb-1">Anti-cheating</h4>
                <ThreeWay label="Show all answers after session" options={[{value:"on",label:"On"},{value:"questions_only",label:"Questions only"},{value:"off",label:"Off"}]} value={settings.showAllAnswersAfterSession} onChange={v => set({ showAllAnswersAfterSession: v as any })} />
                <ToggleRow label="Shuffle questions" checked={settings.shuffleQuestions} onChange={v => set({ shuffleQuestions: v })} />
                <ToggleRow label="Shuffle answers" checked={settings.shuffleAnswers} onChange={v => set({ shuffleAnswers: v })} />
              </div>
            </div>
          )}

          {/* Mastery tab */}
          {activeTab === "mastery" && (
            <div className="rounded-xl border border-slate-200 px-4">
              <h4 className="text-sm font-semibold text-slate-700 pt-3 pb-1">Mastery</h4>
              <SessionAttemptsRow value={settings.sessionAttempts} onChange={v => set({ sessionAttempts: v })} />
              <ToggleRow label="Redemption questions" description="Allow students to reattempt a few incorrect questions." checked={settings.redemptionQuestions} onChange={v => set({ redemptionQuestions: v })} />
              <div className="flex items-center justify-between py-3.5 border-b border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">Rotating Question Set</p>
                  <p className="text-xs text-slate-400 mt-0.5">Students get a fresh set from your question bank on every retry.</p>
                </div>
                <Select value={settings.rotatingQuestionSet} onValueChange={v => set({ rotatingQuestionSet: v })}>
                  <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="5">5 questions</SelectItem>
                    <SelectItem value="10">10 questions</SelectItem>
                    <SelectItem value="all">All questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ThreeWay label="Show answer after each question" options={[{value:"on",label:"On"},{value:"validate_only",label:"Validate only"},{value:"off",label:"Off"}]} value={settings.showAnswerAfterEach} onChange={v => set({ showAnswerAfterEach: v as any })} />
            </div>
          )}

          {/* Gamification tab */}
          {activeTab === "gamification" && (
            <div className="rounded-xl border border-slate-200 px-4">
              <h4 className="text-sm font-semibold text-slate-700 pt-3 pb-1">Gamification</h4>
              <ToggleRow label="Serious theme" description="Focused environment without gamifications" checked={settings.seriousTheme} onChange={v => set({ seriousTheme: v })} />
              <ToggleRow label="Leaderboard" checked={settings.leaderboard} onChange={v => set({ leaderboard: v })} />
              <ToggleRow label="Power-Ups" description="Students get fun abilities and unlock bonus points" checked={settings.powerUps} onChange={v => set({ powerUps: v })} />
              <ToggleRow label="Live Reactions" checked={settings.liveReactions} onChange={v => set({ liveReactions: v })} />
              <ToggleRow label="Play music" checked={settings.playMusic} onChange={v => set({ playMusic: v })} />
              <ToggleRow label="Strike & Shield" description="Students can Strike to reduce peer scores or Shield to defend their own." checked={settings.strikeAndShield} onChange={v => set({ strikeAndShield: v })} info="Strike reduces another student's score. Shield protects your own score from strikes." />
              <ToggleRow label="Show memes" checked={settings.showMemes} onChange={v => set({ showMemes: v })} />
            </div>
          )}

          {/* Start button */}
          <button
            onClick={() => onStart(settings)}
            className="w-full mt-5 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors shadow-md"
          >
            <Play className="h-4 w-4 fill-white" />Start
          </button>
        </div>
      </div>

      {/* Import Class Modal */}
      <ImportClassModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={name => { setAssignedClass(name); set({ assignedClass: name }); }}
        tenantId={tenantId}
      />
    </div>
  );
}

export default ClassicSessionSettings;
