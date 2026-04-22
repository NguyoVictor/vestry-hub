import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import { getTheme, ANSWER_COLORS, calcPoints } from "@/lib/quiz-game";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Question {
  type: string; text: string; options?: string[];
  correctIndex?: number; correctAnswer?: string;
  modelAnswer?: string; passage?: string;
  points?: number; timeLimit?: number; dok?: string;
}

// ── Timer bar ─────────────────────────────────────────────────────────────────
function TimerBar({ duration, onExpire }: { duration: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(duration);
  useEffect(() => {
    if (duration <= 0) return;
    const interval = setInterval(() => {
      setRemaining(r => {
        if (r <= 0.1) { clearInterval(interval); onExpire(); return 0; }
        return r - 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [duration, onExpire]);
  const pct = duration > 0 ? (remaining / duration) * 100 : 100;
  const color = pct > 50 ? "#22c55e" : pct > 25 ? "#f59e0b" : "#ef4444";
  return (
    <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
      <motion.div className="h-full rounded-full transition-colors" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

// ── Answer card ───────────────────────────────────────────────────────────────
function AnswerCard({ index, text, selected, correct, revealed, locked, onClick }: {
  index: number; text: string; selected: boolean; correct: boolean;
  revealed: boolean; locked: boolean; onClick: () => void;
}) {
  const bg = ANSWER_COLORS[index] ?? "#7cb342";
  const isCorrect = revealed && correct;
  const isWrong = revealed && selected && !correct;
  const isDimmed = revealed && !correct && !selected;

  return (
    <motion.button
      whileHover={!locked && !revealed ? { scale: 1.02 } : {}}
      whileTap={!locked && !revealed ? { scale: 0.97 } : {}}
      onClick={!locked && !revealed ? onClick : undefined}
      className={cn(
        "relative flex items-center justify-center rounded-2xl p-5 text-white font-semibold text-lg text-center min-h-[100px] transition-all duration-300 shadow-lg",
        locked && !revealed && "cursor-not-allowed",
        isDimmed && "opacity-40",
      )}
      style={{
        backgroundColor: isCorrect ? "#16a34a" : isWrong ? "#dc2626" : bg,
        border: selected && !revealed ? "3px solid white" : "3px solid transparent",
        boxShadow: isCorrect ? "0 0 24px rgba(22,163,74,0.6)" : undefined,
      }}
    >
      {/* Number badge */}
      <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs font-bold">
        {index + 1}
      </div>
      {/* Correct/wrong icon */}
      {revealed && (isCorrect || isWrong) && (
        <div className="absolute top-2 left-2 text-xl">
          {isCorrect ? "✅" : "❌"}
        </div>
      )}
      <span className="leading-snug">{text}</span>
    </motion.button>
  );
}

// ── Main QuizPlayView ─────────────────────────────────────────────────────────
export default function QuizPlayView() {
  const { sessionId, participantId } = useParams<{ sessionId: string; participantId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);
  const answerStartTime = useRef<number>(Date.now());

  // Fetch session + quiz
  const { data: session } = useQuery({
    queryKey: ["play-session", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.QUIZ_SESSIONS).select("*, quizzes(*)").eq("id", sessionId!).single();
      return data as any;
    },
    staleTime: 10_000,
    enabled: !!sessionId,
  });

  const { data: participant } = useQuery({
    queryKey: ["play-participant", participantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.QUIZ_PARTICIPANTS).select("*").eq("id", participantId!).single();
      return data as any;
    },
    staleTime: 30_000,
    enabled: !!participantId,
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ["play-leaderboard", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.QUIZ_PARTICIPANTS).select("id, display_name, avatar_emoji, score, rank").eq("session_id", sessionId!).eq("is_host", false).order("score", { ascending: false }).limit(5);
      return data ?? [];
    },
    staleTime: 5_000,
    enabled: !!sessionId && showLeaderboard,
  });

  // Listen for quiz events (next_question, quiz_end)
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase.channel(`play-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quiz_events", filter: `session_id=eq.${sessionId}` }, (payload) => {
        const evt = payload.new as any;
        if (evt.event_type === "next_question") {
          const nextIdx = evt.payload?.question_index ?? 0;
          setCurrentQIdx(nextIdx);
          setSelectedAnswer(null);
          setRevealed(false);
          setLocked(false);
          setFeedback(null);
          setTimerExpired(false);
          setShowLeaderboard(false);
          answerStartTime.current = Date.now();
        }
        if (evt.event_type === "question_end") {
          setRevealed(true);
        }
        if (evt.event_type === "leaderboard_show") {
          setShowLeaderboard(true);
        }
        if (evt.event_type === "quiz_end") {
          navigate(`/quiz/results/${sessionId}/${participantId}`);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, participantId, navigate]);

  const quiz = session?.quizzes;
  const questions: Question[] = Array.isArray(quiz?.questions) ? quiz.questions : [];
  const question = questions[currentQIdx];
  const theme = getTheme(session?.theme ?? "classic");
  const settings = session?.settings ?? {};
  const timerMode = settings.questionTimer ?? "off";
  const timerDuration = timerMode === "off" ? 0 : 30;

  const handleTimerExpire = useCallback(() => {
    if (!revealed && !locked) {
      setTimerExpired(true);
      if (timerMode === "lock") {
        setLocked(true);
        setRevealed(true);
      }
    }
  }, [revealed, locked, timerMode]);

  const handleAnswer = async (optionIndex: number) => {
    if (locked || revealed || selectedAnswer !== null) return;
    setSelectedAnswer(optionIndex);
    const timeTaken = Date.now() - answerStartTime.current;

    const isCorrect = question?.correctIndex === optionIndex;
    const pts = isCorrect ? calcPoints(timeTaken, timerDuration * 1000, question?.points ? question.points * 100 : 1000) : 0;
    setPointsEarned(pts);
    setFeedback(isCorrect ? "correct" : "wrong");

    // Save answer
    await supabase.from(TABLES.QUIZ_ANSWERS).insert({
      session_id: sessionId!,
      participant_id: participantId!,
      question_index: currentQIdx,
      answer_given: question?.options?.[optionIndex] ?? String(optionIndex),
      is_correct: isCorrect,
      time_taken_ms: timeTaken,
      points_earned: pts,
    } as any);

    // Update participant score
    if (pts > 0) {
      await supabase.from(TABLES.QUIZ_PARTICIPANTS).update({
        score: (participant?.score ?? 0) + pts,
        coins: (participant?.coins ?? 0) + Math.floor(pts / 100),
        streak: isCorrect ? (participant?.streak ?? 0) + 1 : 0,
      } as any).eq("id", participantId!);
      qc.invalidateQueries({ queryKey: ["play-participant", participantId] });
    }

    // Broadcast answer submitted
    await supabase.from(TABLES.QUIZ_EVENTS).insert({
      session_id: sessionId!,
      event_type: "answer_submitted",
      payload: { participant_id: participantId, question_index: currentQIdx, is_correct: isCorrect },
    } as any);

    // Auto-reveal after short delay
    setTimeout(() => setRevealed(true), 500);
  };

  if (!session || !question) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: theme.bg }}>
        <div className="text-white text-lg animate-pulse font-fredoka">Loading question...</div>
      </div>
    );
  }

  const myRank = participant?.rank ?? 1;
  const myScore = participant?.score ?? 0;
  const myCoins = participant?.coins ?? 0;
  const myStreak = participant?.streak ?? 0;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: theme.bg }}>
      {/* Feedback overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn("fixed inset-0 z-40 flex flex-col items-center justify-center pointer-events-none", feedback === "correct" ? "bg-emerald-500/20" : "bg-red-500/20")}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="text-center"
            >
              <div className="text-7xl mb-2">{feedback === "correct" ? "✅" : "❌"}</div>
              {feedback === "correct" && pointsEarned > 0 && (
                <div className="text-white font-fredoka font-bold text-3xl">+{pointsEarned} points!</div>
              )}
              {myStreak > 1 && feedback === "correct" && (
                <div className="text-amber-400 font-bold text-xl mt-1">🔥 Streak x{myStreak}!</div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Between-question leaderboard */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 px-6"
          >
            <h2 className="font-fredoka text-3xl font-bold text-white mb-6">🏆 Leaderboard</h2>
            <div className="w-full max-w-sm space-y-3">
              {(leaderboard as any[]).map((p, i) => (
                <div key={p.id} className={cn("flex items-center gap-3 rounded-xl px-4 py-3", p.id === participantId ? "bg-orange-500/30 border border-orange-400" : "bg-white/10")}>
                  <span className="text-white font-bold w-6 text-center">{i + 1}</span>
                  <span className="text-xl">{p.avatar_emoji}</span>
                  <span className="text-white flex-1 font-medium truncate">{p.display_name}</span>
                  <span className="text-white font-bold">{p.score}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/30 border border-white/10">
            <span className="text-amber-400">🏆</span>
            <span className="text-white font-bold text-sm">{myRank === 1 ? "1st" : myRank === 2 ? "2nd" : myRank === 3 ? "3rd" : `${myRank}th`}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/30 border border-white/10">
            <span className="text-amber-400">🪙</span>
            <span className="text-white font-bold text-sm">{myCoins}</span>
          </div>
          {myStreak > 1 && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500/30 border border-orange-400/40">
              <span>🔥</span>
              <span className="text-orange-300 font-bold text-sm">{myStreak}</span>
            </div>
          )}
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/10">
          <span className="text-white font-mono font-bold text-sm tracking-widest">{session?.join_code}</span>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-hidden">
        {/* Progress + timer */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-xs font-medium">{currentQIdx + 1} / {questions.length}</span>
            {timerMode !== "off" && !revealed && (
              <span className="text-white/60 text-xs">⏱</span>
            )}
          </div>
          {timerMode !== "off" && !revealed && (
            <TimerBar key={currentQIdx} duration={timerDuration} onExpire={handleTimerExpire} />
          )}
        </div>

        {/* Passage (if applicable) */}
        {question.passage && (
          <div className="rounded-xl bg-black/30 border border-white/10 p-4 text-white/80 text-sm leading-relaxed max-h-32 overflow-y-auto">
            {question.passage}
          </div>
        )}

        {/* Question text */}
        <div className="rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 px-6 py-5 text-center">
          <p className="text-white font-semibold text-lg leading-snug">{question.text}</p>
        </div>

        {/* Answer cards */}
        {(question.type === "MCQ" || question.type === "Passage" || !question.type) && question.options && (
          <div className="grid grid-cols-2 gap-3 flex-1">
            {question.options.map((opt, i) => (
              <AnswerCard
                key={i}
                index={i}
                text={opt}
                selected={selectedAnswer === i}
                correct={question.correctIndex === i}
                revealed={revealed}
                locked={locked || (timerExpired && timerMode === "lock")}
                onClick={() => handleAnswer(i)}
              />
            ))}
          </div>
        )}

        {/* Fill in the blank */}
        {question.type === "Fill in the blank" && (
          <div className="flex flex-col items-center gap-3 flex-1 justify-center">
            {!revealed ? (
              <FillBlankInput
                onSubmit={async (val) => {
                  const isCorrect = val.toLowerCase().trim() === (question.correctAnswer ?? "").toLowerCase().trim();
                  setSelectedAnswer(isCorrect ? 0 : -1);
                  setFeedback(isCorrect ? "correct" : "wrong");
                  const pts = isCorrect ? calcPoints(Date.now() - answerStartTime.current, timerDuration * 1000, (question.points ?? 1) * 100) : 0;
                  setPointsEarned(pts);
                  await supabase.from(TABLES.QUIZ_ANSWERS).insert({ session_id: sessionId!, participant_id: participantId!, question_index: currentQIdx, answer_given: val, is_correct: isCorrect, time_taken_ms: Date.now() - answerStartTime.current, points_earned: pts } as any);
                  setTimeout(() => setRevealed(true), 500);
                }}
              />
            ) : (
              <div className="rounded-xl bg-emerald-500/20 border border-emerald-400 px-6 py-4 text-center">
                <p className="text-white/60 text-sm mb-1">Correct answer:</p>
                <p className="text-emerald-400 font-bold text-xl">{question.correctAnswer}</p>
              </div>
            )}
          </div>
        )}

        {/* Open ended */}
        {question.type === "Open" && (
          <div className="flex flex-col gap-3 flex-1 justify-center">
            {!revealed ? (
              <OpenEndedInput onSubmit={async (val) => {
                await supabase.from(TABLES.QUIZ_ANSWERS).insert({ session_id: sessionId!, participant_id: participantId!, question_index: currentQIdx, answer_given: val, is_correct: false, time_taken_ms: Date.now() - answerStartTime.current, points_earned: 0 } as any);
                setRevealed(true);
              }} />
            ) : (
              <div className="rounded-xl bg-blue-500/20 border border-blue-400 px-6 py-4">
                <p className="text-white/60 text-sm mb-1">Model answer:</p>
                <p className="text-white text-sm leading-relaxed">{question.modelAnswer}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom: participant info + power-ups */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/20 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{participant?.avatar_emoji ?? "🦊"}</span>
          <span className="text-white text-sm font-medium">{participant?.display_name ?? "Player"}</span>
        </div>
        <div className="flex items-center gap-2">
          {["🔄","⚡","🎁","🤝"].map(p => (
            <button key={p} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-lg transition-colors">{p}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Fill blank input ───────────────────────────────────────────────────────────
function FillBlankInput({ onSubmit }: { onSubmit: (val: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
      <input value={val} onChange={e => setVal(e.target.value)} placeholder="Type your answer..." className="w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 px-4 py-3 text-center text-lg focus:outline-none focus:ring-2 focus:ring-orange-400" onKeyDown={e => e.key === "Enter" && val.trim() && onSubmit(val.trim())} />
      <button onClick={() => val.trim() && onSubmit(val.trim())} className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors">Submit</button>
    </div>
  );
}

// ── Open ended input ───────────────────────────────────────────────────────────
function OpenEndedInput({ onSubmit }: { onSubmit: (val: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
      <textarea value={val} onChange={e => setVal(e.target.value)} placeholder="Write your answer..." rows={4} className="w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
      <button onClick={() => val.trim() && onSubmit(val.trim())} className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors">Submit Answer</button>
    </div>
  );
}
