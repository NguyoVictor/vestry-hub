// Live quiz — host screen (T2). Shown on the church projector. State comes
// from quiz_host_state (polled); every transition goes through
// quiz_host_control, which the database validates (and restricts to staff of
// this church with the training/ministries permission).
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Crown, Loader2, Play, SkipForward, Square, Trophy, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toUserFacingError } from "@/lib/userFacingError";
import { ANSWER_STYLES, liveQuiz, type HostState, type LeaderboardEntry } from "@/lib/liveQuiz";

function Board({ rows, title }: { rows: LeaderboardEntry[]; title: string }) {
  return (
    <div className="w-full max-w-2xl space-y-2">
      <h2 className="text-3xl font-bold text-center mb-4">{title}</h2>
      {rows.length === 0 && <p className="text-center text-white/70">No players yet.</p>}
      {rows.map(r => (
        <div key={r.id} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3" data-testid="leaderboard-row">
          <span className="w-8 text-xl font-bold">{r.rank}</span>
          <span className="text-2xl" aria-hidden>{r.avatar_emoji ?? "🙂"}</span>
          <span className="flex-1 truncate text-lg font-semibold">{r.display_name}</span>
          <span className="text-lg font-bold tabular-nums">{r.score}</span>
        </div>
      ))}
    </div>
  );
}

export default function QuizHostView() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const autoRevealed = useRef<number | null>(null);

  const { data: s, error, isLoading } = useQuery({
    queryKey: ["quiz-host", sessionId],
    queryFn: () => liveQuiz.hostState(sessionId),
    refetchInterval: (q) => (q.state.data?.phase === "ended" ? false : 1000),
    enabled: !!sessionId,
  });

  // Local clock between polls for a smooth countdown.
  const fetchedAt = useRef(Date.now());
  useEffect(() => { fetchedAt.current = Date.now(); }, [s]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const secondsLeft = s ? Math.max(0, Math.ceil(s.seconds_left - (now - fetchedAt.current) / 1000)) : 0;

  const control = useMutation({
    mutationFn: (action: "start" | "reveal" | "leaderboard" | "next" | "end") => liveQuiz.control(sessionId, action),
    onSuccess: (state: HostState) => qc.setQueryData(["quiz-host", sessionId], state),
    onError: (e: Error) => toast.error(toUserFacingError(e, e.message)),
  });

  // Reveal automatically when time is up or everyone has answered.
  useEffect(() => {
    if (!s || s.phase !== "question" || control.isPending) return;
    const everyone = s.participants.length > 0 && s.answered >= s.participants.length;
    if ((secondsLeft <= 0 || everyone) && autoRevealed.current !== s.question_index) {
      autoRevealed.current = s.question_index;
      control.mutate("reveal");
    }
  }, [s, secondsLeft, control]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
  if (error || !s) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-900 px-4 text-white">
        <p>{toUserFacingError(error, "This game could not be loaded.")}</p>
        <Button variant="secondary" onClick={() => navigate("/training/quizzes")}>Back to quizzes</Button>
      </div>
    );
  }

  const joinUrl = `${window.location.origin}/join/${s.join_code}`;
  const isLast = s.question_index >= s.total_questions - 1;
  const busy = control.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white">
      <Helmet><title>{s.quiz_title ?? "Live quiz"} — Host</title></Helmet>
      <header className="flex items-center justify-between gap-2 px-4 py-3 sm:px-8">
        <div className="min-w-0">
          <p className="truncate font-semibold">{s.quiz_title}</p>
          <p className="text-sm text-white/70">PIN <span className="font-mono font-bold tracking-widest" data-testid="game-pin">{s.join_code}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm"><Users className="h-4 w-4" />{s.participants.length}</span>
          {s.phase !== "ended" && (
            <Button size="sm" variant="secondary" onClick={() => control.mutate("end")} disabled={busy}><Square className="h-4 w-4 mr-1" />End game</Button>
          )}
        </div>
      </header>

      <main className="flex flex-col items-center gap-8 px-4 pb-12 pt-4 sm:px-8">
        {s.phase === "lobby" && (
          <>
            <div className="text-center space-y-3">
              <p className="text-lg text-white/80">Join at <span className="font-semibold">{window.location.host}/join</span> with PIN</p>
              <p className="font-mono text-6xl sm:text-8xl font-black tracking-[0.2em]">{s.join_code}</p>
              <Button size="sm" variant="ghost" className="text-white/80"
                onClick={() => { navigator.clipboard?.writeText(joinUrl).then(() => toast.success("Join link copied")).catch(() => {}); }}>
                <Copy className="h-4 w-4 mr-1" />Copy join link
              </Button>
            </div>
            <div className="flex max-w-3xl flex-wrap justify-center gap-2" aria-live="polite">
              {s.participants.map(p => (
                <span key={p.id} className="rounded-full bg-white/15 px-4 py-2 font-semibold" data-testid="lobby-player">{p.avatar_emoji} {p.display_name}</span>
              ))}
              {s.participants.length === 0 && <p className="text-white/70">Waiting for players…</p>}
            </div>
            <Button size="lg" className="bg-green-600 hover:bg-green-700" onClick={() => control.mutate("start")}
              disabled={busy || s.participants.length === 0}>
              <Play className="h-5 w-5 mr-2" />Start ({s.total_questions} question{s.total_questions === 1 ? "" : "s"})
            </Button>
          </>
        )}

        {(s.phase === "question" || s.phase === "reveal") && s.question && (
          <>
            <p className="text-white/70">Question {s.question_index + 1} of {s.total_questions}</p>
            <h1 className="max-w-4xl text-center text-3xl sm:text-5xl font-bold" data-testid="host-question">{s.question.text}</h1>
            <div className="flex items-center gap-8">
              {s.phase === "question" && <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/15 text-4xl font-black tabular-nums" data-testid="host-timer">{secondsLeft}</div>}
              <p className="text-xl"><span className="font-bold">{s.answered}</span> / {s.participants.length} answered</p>
            </div>
            <div className="grid w-full max-w-5xl gap-3 sm:grid-cols-2">
              {s.question.options.map((o, i) => {
                const correct = s.phase === "reveal" && i === s.question!.correct_index;
                const dim = s.phase === "reveal" && !correct;
                return (
                  <div key={i} className={`flex items-center gap-3 rounded-xl px-5 py-5 text-xl font-semibold ${ANSWER_STYLES[i].bg} ${dim ? "opacity-40" : ""}`}
                    data-testid={correct ? "host-correct-option" : "host-option"}>
                    <span aria-hidden>{ANSWER_STYLES[i].shape}</span>
                    <span className="flex-1">{o}</span>
                    {s.phase === "reveal" && <span className="tabular-nums">{s.answer_counts[i] ?? 0}</span>}
                    {correct && <span aria-label="correct answer">✓</span>}
                  </div>
                );
              })}
            </div>
            {s.phase === "question" ? (
              <Button variant="secondary" onClick={() => { autoRevealed.current = s.question_index; control.mutate("reveal"); }} disabled={busy}>Reveal answer now</Button>
            ) : (
              <Button size="lg" onClick={() => control.mutate("leaderboard")} disabled={busy}><Trophy className="h-5 w-5 mr-2" />Show leaderboard</Button>
            )}
          </>
        )}

        {s.phase === "leaderboard" && (
          <>
            <Board rows={s.participants.slice(0, 5)} title="Leaderboard" />
            <Button size="lg" onClick={() => control.mutate("next")} disabled={busy}>
              <SkipForward className="h-5 w-5 mr-2" />{isLast ? "Finish & show winners" : "Next question"}
            </Button>
          </>
        )}

        {s.phase === "ended" && (
          <>
            <Crown className="h-12 w-12 text-amber-300" aria-hidden />
            <Board rows={s.participants.slice(0, 10)} title="Final results" />
            <Button onClick={() => navigate("/training/quizzes")}>Back to quizzes</Button>
          </>
        )}
      </main>
    </div>
  );
}
