import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import { getTheme } from "@/lib/quiz-game";

// ── Countdown overlay ─────────────────────────────────────────────────────────
function CountdownOverlay({ count }: { count: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 2.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.3, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="text-white font-fredoka font-bold text-center"
          style={{ fontSize: count === 0 ? "5rem" : "9rem" }}
        >
          {count === 0 ? "GO!" : count}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function QuizWaitingRoom() {
  const { sessionId, participantId } = useParams<{ sessionId: string; participantId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [countdown, setCountdown] = useState<number | null>(null);

  // Fetch session
  const { data: session } = useQuery({
    queryKey: ["waiting-session", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.QUIZ_SESSIONS).select("*").eq("id", sessionId!).single();
      return data;
    },
    staleTime: 5_000,
    enabled: !!sessionId,
  });

  // Fetch participant
  const { data: participant } = useQuery({
    queryKey: ["waiting-participant", participantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.QUIZ_PARTICIPANTS).select("*").eq("id", participantId!).single();
      return data;
    },
    staleTime: 30_000,
    enabled: !!participantId,
  });

  // Listen for quiz_events (countdown_start, quiz_end)
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase.channel(`waiting-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quiz_events", filter: `session_id=eq.${sessionId}` }, (payload) => {
        const evt = payload.new as any;
        if (evt.event_type === "countdown_start") {
          // Run countdown 3-2-1-0
          let count = 3;
          setCountdown(count);
          const interval = setInterval(() => {
            count--;
            if (count < 0) {
              clearInterval(interval);
              setCountdown(null);
              navigate(`/quiz/play/${sessionId}/${participantId}`);
            } else {
              setCountdown(count);
            }
          }, 1000);
        }
        if (evt.event_type === "quiz_end") {
          navigate("/");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, participantId, navigate]);

  const theme = getTheme(session?.theme ?? "classic");
  const joinCode = session?.join_code ?? "------";

  const REACTIONS = ["😮","🔥","💯","👏","🤔","😅","✝️","🙏"];
  const POWER_UPS = [
    { icon: "🔄", label: "Shuffle", desc: "Skip a question" },
    { icon: "⚡", label: "Streak Boost", desc: "2x points" },
    { icon: "🎁", label: "Mystery Box", desc: "Random bonus" },
    { icon: "🤝", label: "Share", desc: "Send a hint emoji" },
  ];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: theme.bg }}>
      {countdown !== null && <CountdownOverlay count={countdown} />}

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/20 shrink-0">
        {/* Power-ups */}
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs font-medium">Your power-ups</span>
          {POWER_UPS.map(p => (
            <button key={p.label} title={p.desc} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors">
              {p.icon} {p.label}
            </button>
          ))}
          <span className="text-white/40 text-xs ml-1">3 shuffles remaining</span>
        </div>
        {/* Right: code + settings */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/10">
            <span className="text-white font-mono font-bold text-sm tracking-widest">{joinCode.replace(/(\d{3})(\d{3})/, "$1 $2")}</span>
          </div>
        </div>
      </div>

      {/* Center: avatar on podium */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        {/* Waiting text */}
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white/80 text-base font-medium mb-4"
        >
          Waiting for the host to start...
        </motion.p>

        {/* Avatar */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2"
        >
          <div className="text-7xl">{participant?.avatar_emoji ?? "🦊"}</div>
        </motion.div>

        {/* Podium */}
        <div className="relative mt-2">
          <div className="w-48 h-8 rounded-full bg-pink-600/80 flex items-center justify-center overflow-hidden">
            <span className="text-white text-sm font-semibold truncate px-4">{participant?.display_name ?? "Player"}</span>
          </div>
          <div className="w-48 h-3 rounded-b-full bg-pink-800/60 mx-auto" />
        </div>

        {/* Coins */}
        <div className="flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-black/30 border border-white/10">
          <span className="text-amber-400 text-lg">🪙</span>
          <span className="text-white font-bold text-lg">500</span>
        </div>

        {/* Pro tip */}
        <p className="text-white/40 text-xs mt-2">Pro tip: Correct answers = more coins 🪙</p>
      </div>

      {/* Bottom: reactions */}
      <div className="flex items-center justify-center gap-2 px-4 py-4 bg-black/20 shrink-0">
        {REACTIONS.map(r => (
          <button key={r} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-xl transition-colors hover:scale-110 active:scale-95">
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
