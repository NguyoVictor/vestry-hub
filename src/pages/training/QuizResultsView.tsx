import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import { getTheme, ordinal } from "@/lib/quiz-game";
import { cn } from "@/lib/utils";
import { Download, RotateCcw, X } from "lucide-react";

// ── Performance message ───────────────────────────────────────────────────────
function perfMessage(accuracy: number): string {
  if (accuracy >= 90) return "Outstanding! God's wisdom shines through you! ✨";
  if (accuracy >= 70) return "Well done! Keep growing in knowledge! 🌱";
  if (accuracy >= 50) return "Good effort! Review and try again! 📖";
  return "Keep studying the Word! You'll improve! 🙏";
}

// ── Admin Results View ────────────────────────────────────────────────────────
function AdminResultsView({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate();

  const { data: session } = useQuery({
    queryKey: ["results-session", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.QUIZ_SESSIONS).select("*, quizzes(*)").eq("id", sessionId).single();
      return data as any;
    },
    staleTime: 60_000,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["results-participants", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.QUIZ_PARTICIPANTS).select("*").eq("session_id", sessionId).eq("is_host", false).order("score", { ascending: false });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: answers = [] } = useQuery({
    queryKey: ["results-answers", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.QUIZ_ANSWERS).select("*").eq("session_id", sessionId);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const quiz = session?.quizzes;
  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
  const theme = getTheme(session?.theme ?? "classic");

  const totalAnswers = (answers as any[]).length;
  const correctAnswers = (answers as any[]).filter(a => a.is_correct).length;
  const classAccuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  // Per-question accuracy
  const questionStats = questions.map((_: any, i: number) => {
    const qAnswers = (answers as any[]).filter(a => a.question_index === i);
    const correct = qAnswers.filter(a => a.is_correct).length;
    return { index: i, total: qAnswers.length, correct, accuracy: qAnswers.length > 0 ? Math.round((correct / qAnswers.length) * 100) : 0 };
  });

  const downloadCSV = () => {
    const rows = [["Rank", "Name", "Score", "Coins", "Correct", "Total"]];
    (participants as any[]).forEach((p, i) => {
      const pAnswers = (answers as any[]).filter(a => a.participant_id === p.id);
      const correct = pAnswers.filter(a => a.is_correct).length;
      rows.push([String(i + 1), p.display_name, String(p.score), String(p.coins), String(correct), String(pAnswers.length)]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `quiz-results-${sessionId}.csv`; a.click();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/20">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500">
            <span className="text-white text-xs font-bold">V</span>
          </div>
          <span className="text-white font-bold">Vestry Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadCSV} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">
            <Download className="h-4 w-4" />Download Results
          </button>
          <button onClick={() => navigate("/training")} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">
            <X className="h-4 w-4" />End
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-w-3xl mx-auto w-full">
        {/* Title */}
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }} className="text-6xl mb-3">🎉</motion.div>
          <h1 className="font-fredoka text-4xl font-bold text-white mb-1">Quiz Complete!</h1>
          <p className="text-white/60">{quiz?.title}</p>
        </div>

        {/* Class accuracy */}
        <div className="rounded-2xl bg-black/40 border border-white/10 p-5 text-center">
          <p className="text-white/60 text-sm mb-1">Class Accuracy</p>
          <p className="font-fredoka text-5xl font-bold text-white">{classAccuracy}%</p>
          <p className="text-white/40 text-xs mt-1">{correctAnswers} correct out of {totalAnswers} answers</p>
        </div>

        {/* Final leaderboard */}
        <div className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10">
            <p className="text-white font-semibold">Final Leaderboard</p>
          </div>
          <div className="divide-y divide-white/5">
            {(participants as any[]).map((p, i) => (
              <div key={p.id} className={cn("flex items-center gap-3 px-5 py-3", i === 0 && "bg-amber-500/10")}>
                <span className="text-white/60 font-bold w-8 text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span>
                <span className="text-xl">{p.avatar_emoji}</span>
                <span className="text-white flex-1 font-medium truncate">{p.display_name}</span>
                <span className="text-white font-bold">{p.score}</span>
                <span className="text-amber-400 text-sm">🪙{p.coins}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-question accuracy */}
        {questionStats.length > 0 && (
          <div className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10">
              <p className="text-white font-semibold">Question Accuracy</p>
            </div>
            <div className="divide-y divide-white/5">
              {questionStats.map((qs: any) => (
                <div key={qs.index} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-white/60 text-sm w-6">Q{qs.index + 1}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${qs.accuracy}%` }} />
                  </div>
                  <span className="text-white/60 text-sm w-12 text-right">{qs.accuracy}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => navigate("/training")} className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors">
          Back to Training
        </button>
      </div>
    </div>
  );
}

// ── Participant Results View ───────────────────────────────────────────────────
function ParticipantResultsView({ sessionId, participantId }: { sessionId: string; participantId: string }) {
  const navigate = useNavigate();

  const { data: participant } = useQuery({
    queryKey: ["p-results-participant", participantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.QUIZ_PARTICIPANTS).select("*").eq("id", participantId).single();
      return data as any;
    },
    staleTime: 60_000,
  });

  const { data: answers = [] } = useQuery({
    queryKey: ["p-results-answers", sessionId, participantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.QUIZ_ANSWERS).select("*").eq("session_id", sessionId).eq("participant_id", participantId);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: session } = useQuery({
    queryKey: ["p-results-session", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.QUIZ_SESSIONS).select("theme, settings").eq("id", sessionId).single();
      return data as any;
    },
    staleTime: 60_000,
  });

  const theme = getTheme(session?.theme ?? "classic");
  const totalAnswers = (answers as any[]).length;
  const correctAnswers = (answers as any[]).filter((a: any) => a.is_correct).length;
  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
  const rank = participant?.rank ?? 1;
  const score = participant?.score ?? 0;
  const coins = participant?.coins ?? 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8" style={{ background: theme.bg }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-5"
      >
        {/* Avatar + completion */}
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.2 }} className="text-7xl mb-3">
            {participant?.avatar_emoji ?? "🦊"}
          </motion.div>
          <h1 className="font-fredoka text-3xl font-bold text-white mb-1">🎉 Quiz Complete!</h1>
          <p className="text-white/60 text-sm">{participant?.display_name}</p>
        </div>

        {/* Rank card */}
        <div className="rounded-2xl bg-black/40 border border-white/10 p-5 text-center">
          <p className="text-white/60 text-sm mb-1">You finished</p>
          <p className="font-fredoka text-5xl font-bold text-white">{ordinal(rank)}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Score", value: score, icon: "🏆" },
            { label: "Coins", value: coins, icon: "🪙" },
            { label: "Accuracy", value: `${accuracy}%`, icon: "🎯" },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-black/30 border border-white/10 p-3 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="text-white font-bold text-lg">{s.value}</p>
              <p className="text-white/40 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Performance message */}
        <div className="rounded-2xl bg-white/5 border border-white/10 px-5 py-4 text-center">
          <p className="text-white/80 text-sm leading-relaxed">{perfMessage(accuracy)}</p>
        </div>

        <button onClick={() => navigate("/")} className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors">
          Done
        </button>
      </motion.div>
    </div>
  );
}

// ── Router: detect admin vs participant ───────────────────────────────────────
export default function QuizResultsView() {
  const { sessionId, participantId } = useParams<{ sessionId: string; participantId?: string }>();

  if (!sessionId) return null;

  // If participantId is in URL → participant view, else admin view
  if (participantId) {
    return <ParticipantResultsView sessionId={sessionId} participantId={participantId} />;
  }
  return <AdminResultsView sessionId={sessionId} />;
}
