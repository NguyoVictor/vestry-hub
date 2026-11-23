// Live quiz — player screen (T2). One page for the whole game; state comes
// from quiz_player_state (polled) which never includes the correct answer
// before the host reveals it. Answers are scored on the server.
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { toUserFacingError } from "@/lib/userFacingError";
import { ANSWER_STYLES, liveQuiz, loadToken, type PlayerTicket } from "@/lib/liveQuiz";

export default function QuizPlayView() {
  const { sessionId = "", participantId = "" } = useParams();
  const qc = useQueryClient();
  const [token] = useState(() => loadToken(sessionId, participantId));
  const ticket: PlayerTicket | null = token ? { session_id: sessionId, participant_id: participantId, token } : null;
  const [picked, setPicked] = useState<{ q: number; choice: number } | null>(null);
  const [now, setNow] = useState(Date.now());

  const { data: s, error } = useQuery({
    queryKey: ["quiz-player", sessionId, participantId],
    queryFn: () => liveQuiz.playerState(ticket!),
    enabled: !!ticket,
    refetchInterval: (q) => (q.state.data?.phase === "ended" ? false : 1000),
  });

  const fetchedAt = useRef(Date.now());
  useEffect(() => { fetchedAt.current = Date.now(); }, [s]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const secondsLeft = s ? Math.max(0, Math.ceil(s.seconds_left - (now - fetchedAt.current) / 1000)) : 0;

  const submit = useMutation({
    mutationFn: (v: { q: number; choice: number }) => liveQuiz.submit(ticket!, v.q, v.choice),
    onMutate: (v) => setPicked(v),
    onSuccess: (r) => {
      if (!r.accepted && r.reason !== "already_answered") setPicked(null);
      qc.invalidateQueries({ queryKey: ["quiz-player", sessionId, participantId] });
    },
    onError: () => setPicked(null),
  });

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white">
      <Helmet><title>Live Quiz — Vestry</title></Helmet>
      {s && (
        <header className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="font-semibold">{s.me.avatar_emoji} {s.me.display_name}</span>
          <span className="tabular-nums" data-testid="my-score">{s.me.score} pts</span>
        </header>
      )}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-10 text-center">{children}</main>
    </div>
  );

  if (!ticket) {
    return shell(<>
      <p>This device is not signed in to that game.</p>
      <Link to="/join" className="underline">Join with a PIN</Link>
    </>);
  }
  if (error) return shell(<><p>{toUserFacingError(error, "Could not load the game.")}</p><Link to="/join" className="underline">Join another game</Link></>);
  if (!s) return shell(<Loader2 className="h-8 w-8 animate-spin" />);

  const answeredThis = s.my_answer ?? (picked && picked.q === s.question_index ? { choice: picked.choice, is_correct: null, points: null } : null);

  if (s.phase === "lobby") {
    return shell(<>
      <p className="text-2xl font-bold">You're in!</p>
      <p className="text-white/80">Waiting for the host to start… ({s.players} player{s.players === 1 ? "" : "s"})</p>
      <p className="text-sm text-white/60">{s.quiz_title}</p>
    </>);
  }

  if (s.phase === "question" && s.question) {
    if (answeredThis) {
      return shell(<>
        <p className="text-2xl font-bold" data-testid="answer-locked">Answer locked in</p>
        <p className="text-white/80">Waiting for the others… {secondsLeft > 0 && `${secondsLeft}s`}</p>
      </>);
    }
    return shell(<>
      <p className="text-white/70">Question {s.question_index + 1} of {s.total_questions} · <span className="tabular-nums" data-testid="player-timer">{secondsLeft}s</span></p>
      <h1 className="text-2xl font-bold max-w-xl" data-testid="player-question">{s.question.text}</h1>
      <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
        {s.question.options.map((o, i) => (
          <button key={i} type="button" disabled={submit.isPending || secondsLeft <= 0}
            onClick={() => submit.mutate({ q: s.question_index, choice: i })}
            className={`flex min-h-20 items-center gap-3 rounded-xl px-4 py-4 text-left text-lg font-semibold ${ANSWER_STYLES[i].bg} disabled:opacity-60`}
            data-testid="player-option">
            <span aria-hidden>{ANSWER_STYLES[i].shape}</span><span>{o}</span>
          </button>
        ))}
      </div>
    </>);
  }

  if ((s.phase === "reveal" || s.phase === "leaderboard") && s.question) {
    const right = s.my_answer?.is_correct === true;
    return shell(<>
      {!s.my_answer ? (
        <p className="text-2xl font-bold" data-testid="result">Time's up — no answer</p>
      ) : right ? (
        <><CheckCircle2 className="h-16 w-16 text-green-400" /><p className="text-2xl font-bold" data-testid="result">Correct! +{s.my_answer.points}</p></>
      ) : (
        <><XCircle className="h-16 w-16 text-red-400" /><p className="text-2xl font-bold" data-testid="result">Not this time</p></>
      )}
      {s.correct_index !== null && <p className="text-white/80">Answer: <span className="font-semibold">{s.question.options[s.correct_index]}</span></p>}
      <p className="text-white/80">You are #{s.me.rank} of {s.players}{s.me.streak > 1 ? ` · 🔥 ${s.me.streak} in a row` : ""}</p>
    </>);
  }

  // ended
  return shell(<>
    <p className="text-3xl font-bold">Game over</p>
    <p className="text-xl" data-testid="final-rank">You finished #{s.me.rank} of {s.players} with {s.me.score} points</p>
    <ol className="w-full max-w-sm space-y-2 text-left">
      {s.top.map(r => (
        <li key={r.id} className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2">
          <span className="w-6 font-bold">{r.rank}</span><span>{r.avatar_emoji}</span>
          <span className="flex-1 truncate">{r.display_name}</span><span className="tabular-nums">{r.score}</span>
        </li>
      ))}
    </ol>
    <Link to="/join" className="underline">Join another game</Link>
  </>);
}
