import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy, Palette, Maximize2, Minimize2, Volume2, VolumeX,
  Sparkles, Users, Play, Pause, X, Check, ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_THEMES, getTheme, ANSWER_COLORS, type ThemeId } from "@/lib/quiz-game";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Session {
  id: string; quiz_id: string; join_code: string; join_url: string;
  status: string; theme: string; confetti_enabled: boolean; music_enabled: boolean;
  current_question_index: number; settings: any;
}
interface Participant {
  id: string; display_name: string; avatar_emoji: string;
  score: number; rank: number; coins: number; streak: number; is_host: boolean;
}
interface Quiz {
  id: string; title: string; questions: any[]; num_questions: number | null;
}

// ── Themes panel ──────────────────────────────────────────────────────────────
function ThemesPanel({ current, onSelect, onClose }: { current: string; onSelect: (id: ThemeId) => void; onClose: () => void }) {
  return (
    <div className="absolute top-12 right-0 z-50 w-52 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-2 overflow-hidden">
      {GAME_THEMES.map(t => (
        <button key={t.id} onClick={() => { onSelect(t.id); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors">
          <div className="h-6 w-6 rounded-full shrink-0 border border-white/20" style={{ background: t.preview }} />
          <span className="text-sm text-white flex-1 text-left">{t.name}</span>
          {current === t.id && <div className="h-2 w-2 rounded-full bg-white shrink-0" />}
        </button>
      ))}
    </div>
  );
}

// ── Countdown overlay ─────────────────────────────────────────────────────────
function CountdownOverlay({ count }: { count: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="text-white font-fredoka font-bold"
          style={{ fontSize: count === 0 ? "6rem" : "10rem" }}
        >
          {count === 0 ? "GO!" : count}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Admin Active View — question broadcast ────────────────────────────────────
function AdminActiveView({ session, quiz, participants, sessionId, qc }: {
  session: Session; quiz: Quiz | undefined; participants: Participant[];
  sessionId: string; qc: ReturnType<typeof useQueryClient>;
}) {
  const navigate = useNavigate();
  const [qIdx, setQIdx] = useState(session.current_question_index ?? 0);
  const [activeTab, setActiveTab] = useState<"leaderboard" | "questions">("leaderboard");

  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
  const question = questions[qIdx] as any;
  const totalQ = questions.length;

  // Real-time answer count
  const { data: answers = [] } = useQuery({
    queryKey: ["host-answers", sessionId, qIdx],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.QUIZ_ANSWERS).select("participant_id, is_correct").eq("session_id", sessionId).eq("question_index", qIdx);
      return data ?? [];
    },
    staleTime: 2_000,
    refetchInterval: 2_000,
  });

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase.channel(`host-answers-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quiz_answers", filter: `session_id=eq.${sessionId}` }, () => {
        qc.invalidateQueries({ queryKey: ["host-answers", sessionId, qIdx] });
        qc.invalidateQueries({ queryKey: ["quiz-participants", sessionId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, qIdx, qc]);

  const answeredCount = answers.length;
  const correctCount = answers.filter((a: any) => a.is_correct).length;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const broadcastNextQuestion = async () => {
    // Reveal answers first
    await supabase.from(TABLES.QUIZ_EVENTS).insert({ session_id: sessionId, event_type: "question_end", payload: { question_index: qIdx } } as any);
    await new Promise(r => setTimeout(r, 2000));
    // Show leaderboard
    await supabase.from(TABLES.QUIZ_EVENTS).insert({ session_id: sessionId, event_type: "leaderboard_show", payload: {} } as any);
    await new Promise(r => setTimeout(r, 3000));

    const nextIdx = qIdx + 1;
    if (nextIdx >= totalQ) {
      // End quiz
      await supabase.from(TABLES.QUIZ_SESSIONS).update({ status: "ended", ended_at: new Date().toISOString() } as any).eq("id", sessionId);
      await supabase.from(TABLES.QUIZ_EVENTS).insert({ session_id: sessionId, event_type: "quiz_end", payload: {} } as any);
      navigate(`/training/host/${sessionId}/results`);
    } else {
      setQIdx(nextIdx);
      await supabase.from(TABLES.QUIZ_SESSIONS).update({ current_question_index: nextIdx } as any).eq("id", sessionId);
      await supabase.from(TABLES.QUIZ_EVENTS).insert({ session_id: sessionId, event_type: "next_question", payload: { question_index: nextIdx } } as any);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Join code top center */}
      <div className="flex items-center justify-center py-3 shrink-0">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 border border-white/10">
          <span className="text-white font-mono font-bold text-xl tracking-widest">{session.join_code}</span>
          <button onClick={() => { navigator.clipboard.writeText(session.join_code); }} className="text-white/40 hover:text-white transition-colors">
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Accuracy bar */}
      <div className="px-6 mb-4 shrink-0">
        <div className="relative h-10 rounded-full bg-black/30 border border-white/10 overflow-hidden flex items-center justify-center">
          <div className="absolute left-0 top-0 h-full bg-emerald-500/40 transition-all" style={{ width: `${accuracy}%` }} />
          <div className="absolute right-0 top-0 h-full bg-red-500/40 transition-all" style={{ width: `${100 - accuracy}%` }} />
          <span className="relative text-white font-bold text-sm z-10">{accuracy}% Class accuracy</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-1 mb-4 shrink-0">
        {(["leaderboard","questions"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-5 py-2 rounded-full text-sm font-medium transition-colors capitalize", activeTab === tab ? "bg-white/20 text-white" : "text-white/50 hover:text-white")}>
            {tab === "leaderboard" ? "Leaderboard" : "Questions"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {activeTab === "leaderboard" && (
          <div className="max-w-2xl mx-auto rounded-2xl bg-black/50 backdrop-blur-sm border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
              <Users className="h-4 w-4 text-white/60" />
              <span className="text-white/80 text-sm font-medium">{participants.length} participant{participants.length !== 1 ? "s" : ""}</span>
              <span className="ml-auto text-white/40 text-xs">{answeredCount}/{participants.length} answered</span>
            </div>
            <div className="divide-y divide-white/5">
              <div className="grid grid-cols-[40px_1fr_80px_60px_24px] gap-3 px-5 py-2 text-white/40 text-xs font-semibold uppercase tracking-wide">
                <span>Rank</span><span>Name</span><span className="text-right">Score</span><span className="text-right">Coins</span><span />
              </div>
              {participants.length === 0 ? (
                <div className="px-5 py-8 text-center text-white/40 text-sm">No participants yet</div>
              ) : participants.map((p, i) => {
                const hasAnswered = answers.some((a: any) => a.participant_id === p.id);
                return (
                  <div key={p.id} className="grid grid-cols-[40px_1fr_80px_60px_24px] gap-3 px-5 py-3 items-center hover:bg-white/5 transition-colors">
                    <span className="text-white/60 text-sm font-bold">{i + 1}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl">{p.avatar_emoji}</span>
                      <span className="text-white text-sm font-medium truncate">{p.display_name}</span>
                    </div>
                    <span className="text-white text-sm font-bold text-right">{p.score}</span>
                    <span className="text-amber-400 text-sm text-right">🪙{p.coins}</span>
                    <span className={cn("text-xs", hasAnswered ? "text-emerald-400" : "text-white/20")}>
                      {hasAnswered ? "✓" : "·"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "questions" && question && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="rounded-2xl bg-black/50 border border-white/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/60 text-sm">Question {qIdx + 1} of {totalQ}</span>
                <span className="text-white/40 text-xs">{answeredCount}/{participants.length} answered</span>
              </div>
              <p className="text-white font-semibold text-lg mb-4">{question.text}</p>
              {question.options && (
                <div className="grid grid-cols-2 gap-3">
                  {question.options.map((opt: string, i: number) => (
                    <div key={i} className={cn("rounded-xl p-3 text-white text-sm font-medium text-center", i === question.correctIndex ? "bg-emerald-500/30 border border-emerald-400" : "bg-white/10 border border-white/10")}>
                      {opt}
                      {i === question.correctIndex && <span className="ml-2 text-emerald-400">✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Next question button */}
      <div className="px-6 py-4 shrink-0 flex justify-center">
        <button onClick={broadcastNextQuestion} className="flex items-center gap-2 px-8 py-3 rounded-xl font-fredoka font-bold text-white text-lg shadow-xl transition-all hover:scale-105 active:scale-95" style={{ background: "linear-gradient(135deg, #ff006e, #ff4d9e)" }}>
          {qIdx + 1 >= totalQ ? "End Quiz" : "Next Question"}
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ── Main QuizHostView ─────────────────────────────────────────────────────────
export default function QuizHostView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { tenantId } = useChurch();
  const qc = useQueryClient();

  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [confettiOn, setConfettiOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [endConfirm, setEndConfirm] = useState(false);
  const [autoStart, setAutoStart] = useState(false);

  // Fetch session
  const { data: session, isLoading: sessionLoading } = useQuery<Session>({
    queryKey: ["quiz-session", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.QUIZ_SESSIONS).select("*").eq("id", sessionId!).single();
      if (error) throw error;
      return data as Session;
    },
    staleTime: 5_000,
    enabled: !!sessionId,
  });

  // Fetch quiz
  const { data: quiz } = useQuery<Quiz>({
    queryKey: ["quiz-for-session", session?.quiz_id],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.QUIZZES).select("*").eq("id", session!.quiz_id).single();
      if (error) throw error;
      return data as Quiz;
    },
    enabled: !!session?.quiz_id,
    staleTime: 300_000,
  });

  // Fetch participants (real-time)
  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ["quiz-participants", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.QUIZ_PARTICIPANTS).select("*").eq("session_id", sessionId!).eq("is_host", false).order("score", { ascending: false });
      return (data ?? []) as Participant[];
    },
    staleTime: 2_000,
    enabled: !!sessionId,
  });

  // Real-time subscription for new participants
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase.channel(`host-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quiz_participants", filter: `session_id=eq.${sessionId}` }, () => {
        qc.invalidateQueries({ queryKey: ["quiz-participants", sessionId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, qc]);

  const theme = getTheme(session?.theme ?? "classic");
  const qCount = Array.isArray(quiz?.questions) ? quiz.questions.length : (quiz?.num_questions ?? 0);
  const joinUrl = session?.join_url ?? "";
  const joinCode = session?.join_code ?? "------";
  const baseUrl = import.meta.env.VITE_BASE_URL ?? window.location.origin;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleThemeChange = async (themeId: ThemeId) => {
    await supabase.from(TABLES.QUIZ_SESSIONS).update({ theme: themeId } as any).eq("id", sessionId!);
    qc.invalidateQueries({ queryKey: ["quiz-session", sessionId] });
    // Broadcast theme change to participants
    await supabase.from(TABLES.QUIZ_EVENTS).insert({ session_id: sessionId!, event_type: "theme_change", payload: { theme: themeId } } as any);
  };

  const handleStart = async () => {
    // Countdown 3-2-1-GO
    for (let i = 3; i >= 0; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, i === 0 ? 800 : 1000));
    }
    setCountdown(null);
    // Update session status
    await supabase.from(TABLES.QUIZ_SESSIONS).update({ status: "active", started_at: new Date().toISOString() } as any).eq("id", sessionId!);
    // Broadcast start event
    await supabase.from(TABLES.QUIZ_EVENTS).insert({ session_id: sessionId!, event_type: "countdown_start", payload: { count: 3 } } as any);
    qc.invalidateQueries({ queryKey: ["quiz-session", sessionId] });
  };

  const handleEnd = async () => {
    await supabase.from(TABLES.QUIZ_SESSIONS).update({ status: "ended", ended_at: new Date().toISOString() } as any).eq("id", sessionId!);
    await supabase.from(TABLES.QUIZ_EVENTS).insert({ session_id: sessionId!, event_type: "quiz_end", payload: {} } as any);
    navigate("/training");
    toast.success("Quiz session ended.");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: theme.bg }}>
        <div className="text-white text-lg font-fredoka animate-pulse">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: theme.bg }}>
      {/* Countdown overlay */}
      {countdown !== null && <CountdownOverlay count={countdown} />}

      {/* End confirmation */}
      {endConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-900 rounded-2xl p-6 w-80 text-center shadow-2xl border border-slate-700">
            <p className="text-white font-semibold text-lg mb-1">End this quiz session?</p>
            <p className="text-slate-400 text-sm mb-5">All progress will be saved.</p>
            <div className="flex gap-3">
              <button onClick={() => setEndConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-white text-sm hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleEnd} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">End Quiz</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top nav ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/30 backdrop-blur-sm shrink-0 z-10">
        {/* Left: Vestry Hub + quiz info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500">
              <span className="text-white text-xs font-bold">V</span>
            </div>
            <span className="text-white font-bold text-sm">Vestry Hub</span>
          </div>
          {quiz && (
            <>
              <div className="h-4 w-px bg-white/20" />
              <span className="text-white/80 text-sm truncate max-w-[200px]">{quiz.title}</span>
              <span className="text-white/40 text-xs">• {qCount} questions</span>
            </>
          )}
        </div>

        {/* Right: icon buttons */}
        <div className="flex items-center gap-2">
          {/* Themes */}
          <div className="relative">
            <button onClick={() => setThemePanelOpen(o => !o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors">
              <Palette className="h-4 w-4" />Themes
            </button>
            {themePanelOpen && (
              <ThemesPanel current={session?.theme ?? "classic"} onSelect={handleThemeChange} onClose={() => setThemePanelOpen(false)} />
            )}
          </div>

          {/* Confetti toggle */}
          <button onClick={() => setConfettiOn(o => !o)} className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title={confettiOn ? "Confetti ON" : "Confetti OFF"}>
            <Sparkles className="h-4 w-4" />
            {!confettiOn && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-6 h-0.5 bg-white/80 rotate-45 rounded-full" /></div>}
          </button>

          {/* Sound toggle */}
          <button onClick={() => setMusicOn(o => !o)} className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title={musicOn ? "Sound ON" : "Sound OFF"}>
            {musicOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* End */}
          <button onClick={() => setEndConfirm(true)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
            End
          </button>
        </div>
      </div>

      {/* ── Waiting room ── */}
      {(session?.status === "waiting" || !session?.status) && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-8">
          {/* Join card + QR */}
          <div className="flex items-start gap-4">
            {/* Join instructions */}
            <div className="rounded-2xl bg-black/50 backdrop-blur-sm border border-white/10 p-5 min-w-[340px]">
              <div className="flex items-center gap-4 pb-4 border-b border-white/10 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white text-xs font-bold shrink-0">1</div>
                <div className="flex-1">
                  <p className="text-white/60 text-xs mb-0.5">Join using any device</p>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-xl tracking-tight">{baseUrl.replace(/^https?:\/\//, "")}/join</span>
                    <button onClick={() => copyToClipboard(`${baseUrl}/join/${joinCode}`, "Join link")} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white text-xs font-bold shrink-0">2</div>
                <div className="flex-1">
                  <p className="text-white/60 text-xs mb-0.5">Enter the join code</p>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-4xl tracking-[0.2em] font-mono">{joinCode}</span>
                    <button onClick={() => copyToClipboard(joinCode, "Join code")} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="rounded-2xl bg-white p-4 flex flex-col items-center gap-2 shadow-xl">
              <QRCodeSVG value={joinUrl || `${baseUrl}/join/${joinCode}`} size={120} />
              <p className="text-slate-600 text-xs font-medium">Share Via</p>
              <button onClick={() => copyToClipboard(joinUrl, "QR link")} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors">
                <Copy className="h-3 w-3" />Copy link
              </button>
            </div>
          </div>

          {/* Auto start + START + participant count */}
          <div className="flex items-center gap-4">
            <button onClick={() => setAutoStart(o => !o)} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors", autoStart ? "border-white/40 bg-white/10 text-white" : "border-white/20 text-white/60 hover:text-white hover:border-white/40")}>
              <span className="text-base">🕐</span>Auto start your quiz
              <div className={cn("flex h-6 w-10 items-center rounded-full border transition-colors px-0.5", autoStart ? "bg-orange-500 border-orange-500 justify-end" : "bg-white/10 border-white/20 justify-start")}>
                <div className="h-5 w-5 rounded-full bg-white shadow-sm" />
              </div>
            </button>

            <button
              onClick={handleStart}
              className="px-12 py-3 rounded-xl font-fredoka font-bold text-xl text-white shadow-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #ff006e, #ff4d9e)" }}
            >
              START
            </button>

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white">
              <Users className="h-5 w-5" />
              <span className="text-xl font-bold">{participants.length}</span>
            </div>
          </div>

          {/* Participant avatars */}
          {participants.length > 0 && (
            <div className="flex flex-wrap gap-4 justify-center max-w-2xl">
              {participants.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 border border-white/20 text-2xl">
                    {p.avatar_emoji}
                  </div>
                  <span className="text-white/80 text-xs max-w-[60px] truncate text-center">{p.display_name}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Active session — question broadcast + leaderboard ── */}
      {session?.status === "active" && (
        <AdminActiveView
          session={session}
          quiz={quiz}
          participants={participants}
          sessionId={sessionId!}
          qc={qc}
        />
      )}
    </div>
  );
}
