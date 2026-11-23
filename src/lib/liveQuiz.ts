// Live multiplayer quiz (T2). All game reads/writes go through the server
// functions in migration 20261123100000_t2_live_quiz_game.sql — players never
// receive the answer key and cannot write scores. Player identity is a random
// token returned by quiz_join (only its hash is stored server-side).
import { supabase } from "@/integrations/supabase/client";

export interface QuizQuestionDraft {
  text: string;
  options: string[];
  correct_index: number;
  time_limit: number;
  points: number;
}

export type QuizPhase = "lobby" | "question" | "reveal" | "leaderboard" | "ended";

export interface LeaderboardEntry {
  id: string;
  display_name: string;
  avatar_emoji: string | null;
  score: number;
  streak: number;
  rank: number;
  joined_at: string;
  correct: number;
  answered: number;
}

export interface PlayerState {
  status: string;
  phase: QuizPhase;
  quiz_title: string | null;
  question_index: number;
  total_questions: number;
  question: { text: string; options: string[]; time_limit: number; points: number } | null;
  seconds_left: number;
  my_answer: { choice: number; is_correct: boolean | null; points: number | null } | null;
  correct_index: number | null;
  me: { display_name: string; avatar_emoji: string | null; score: number; streak: number; rank: number | null };
  players: number;
  top: LeaderboardEntry[];
}

export interface HostState {
  session_id: string;
  join_code: string;
  status: string;
  phase: QuizPhase;
  quiz_title: string | null;
  question_index: number;
  total_questions: number;
  question: QuizQuestionDraft | null;
  avg_time_limit: number | null;
  seconds_left: number;
  answered: number;
  answer_counts: number[];
  participants: LeaderboardEntry[];
}

export interface PlayerTicket { session_id: string; participant_id: string; token: string }

export const QUIZ_LIMITS = {
  minQuestions: 1, maxQuestions: 50, minOptions: 2, maxOptions: 4,
  maxQuestionChars: 300, maxOptionChars: 120, minTime: 5, maxTime: 120, minPoints: 100, maxPoints: 2000,
  maxNickname: 24,
} as const;

export const ANSWER_STYLES = [
  { bg: "bg-red-600", shape: "▲" },
  { bg: "bg-blue-600", shape: "◆" },
  { bg: "bg-amber-500", shape: "●" },
  { bg: "bg-green-600", shape: "■" },
] as const;

export const AVATARS = ["🦊", "🐻", "🐼", "🦁", "🐯", "🐸", "🐵", "🐧", "🦉", "🐢", "🐙", "🦄"] as const;

export function blankQuestion(): QuizQuestionDraft {
  return { text: "", options: ["", "", "", ""], correct_index: 0, time_limit: 20, points: 1000 };
}

/** Drops empty trailing options and keeps correct_index pointing at the same answer. */
export function normalizeQuestion(q: QuizQuestionDraft): QuizQuestionDraft {
  const kept = q.options.map((o, i) => ({ o: o.trim(), i })).filter(x => x.o.length > 0);
  const correct = Math.max(0, kept.findIndex(x => x.i === q.correct_index));
  return {
    text: q.text.trim(),
    options: kept.map(x => x.o),
    correct_index: correct,
    time_limit: Math.round(Number(q.time_limit)),
    points: Math.round(Number(q.points)),
  };
}

/** Mirrors private.quiz_questions_valid; returns a user-facing problem or null. */
export function quizProblem(title: string, questions: QuizQuestionDraft[]): string | null {
  const L = QUIZ_LIMITS;
  if (!title.trim()) return "Give the quiz a title.";
  if (questions.length < L.minQuestions) return "Add at least one question.";
  if (questions.length > L.maxQuestions) return `A quiz can have at most ${L.maxQuestions} questions.`;
  for (let n = 0; n < questions.length; n++) {
    const raw = questions[n];
    const q = normalizeQuestion(raw);
    const label = `Question ${n + 1}`;
    if (!q.text) return `${label}: enter the question.`;
    if (q.text.length > L.maxQuestionChars) return `${label}: keep the question under ${L.maxQuestionChars} characters.`;
    if (q.options.length < L.minOptions) return `${label}: add at least ${L.minOptions} answers.`;
    if (q.options.length > L.maxOptions) return `${label}: at most ${L.maxOptions} answers.`;
    if (q.options.some(o => o.length > L.maxOptionChars)) return `${label}: keep answers under ${L.maxOptionChars} characters.`;
    if (!raw.options[raw.correct_index]?.trim()) return `${label}: mark a filled-in answer as correct.`;
    if (!(q.time_limit >= L.minTime && q.time_limit <= L.maxTime)) return `${label}: time limit must be ${L.minTime}–${L.maxTime} seconds.`;
    if (!(q.points >= L.minPoints && q.points <= L.maxPoints)) return `${label}: points must be ${L.minPoints}–${L.maxPoints}.`;
  }
  return null;
}

export function normalizePin(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

// ── Player ticket storage (per-viewer convenience; never required) ─────────
const ticketKey = (sessionId: string, participantId: string) => `vestry.quiz.${sessionId}.${participantId}`;

export function saveTicket(t: PlayerTicket): void {
  try { window.localStorage.setItem(ticketKey(t.session_id, t.participant_id), t.token); } catch { /* storage unavailable */ }
}

export function loadToken(sessionId: string, participantId: string): string | null {
  try { return window.localStorage.getItem(ticketKey(sessionId, participantId)); } catch { return null; }
}

// ── Server calls ───────────────────────────────────────────────────────────
// The generated types know these RPCs; results are jsonb, so cast at the edge.
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) =>
    Promise<{ data: unknown; error: { message: string } | null }>)(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const liveQuiz = {
  join: (code: string, displayName: string, avatar: string) =>
    rpc<PlayerTicket>("quiz_join", { p_code: code, p_display_name: displayName, p_avatar: avatar }),
  playerState: (t: PlayerTicket) =>
    rpc<PlayerState>("quiz_player_state", { p_session_id: t.session_id, p_participant_id: t.participant_id, p_token: t.token }),
  submit: (t: PlayerTicket, questionIndex: number, choice: number) =>
    rpc<{ accepted: boolean; reason: string | null }>("quiz_submit_answer", {
      p_session_id: t.session_id, p_participant_id: t.participant_id, p_token: t.token,
      p_question_index: questionIndex, p_choice: choice,
    }),
  createSession: (quizId: string) => rpc<{ session_id: string; join_code: string }>("quiz_host_create_session", { p_quiz_id: quizId }),
  hostState: (sessionId: string) => rpc<HostState>("quiz_host_state", { p_session_id: sessionId }),
  control: (sessionId: string, action: "start" | "reveal" | "leaderboard" | "next" | "end") =>
    rpc<HostState>("quiz_host_control", { p_session_id: sessionId, p_action: action }),
};
