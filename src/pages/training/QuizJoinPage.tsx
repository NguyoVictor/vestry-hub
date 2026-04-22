import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Palette, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_THEMES, randomAvatar, randomFunName, getTheme, type ThemeId } from "@/lib/quiz-game";
import { toast } from "sonner";

// ── Pulsing cross loading screen ──────────────────────────────────────────────
function LoadingScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6">
      {/* Pulsing cross */}
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative flex items-center justify-center"
      >
        {/* Vertical bar */}
        <div className="absolute w-4 h-16 rounded-full bg-orange-500" />
        {/* Horizontal bar */}
        <div className="absolute h-4 w-16 rounded-full bg-orange-500" />
        {/* Glow */}
        <div className="absolute w-24 h-24 rounded-full bg-orange-500/20 blur-xl" />
      </motion.div>
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-white/60 text-sm font-medium tracking-widest uppercase"
      >
        Vestry Hub
      </motion.p>
    </div>
  );
}

// ── Theme selector panel ───────────────────────────────────────────────────────
function ThemeSelector({ current, onSelect, onClose }: { current: string; onSelect: (id: ThemeId) => void; onClose: () => void }) {
  return (
    <div className="absolute top-12 left-0 z-50 w-48 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-2">
      {GAME_THEMES.map(t => (
        <button key={t.id} onClick={() => { onSelect(t.id); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors">
          <div className="h-5 w-5 rounded-full shrink-0 border border-white/20" style={{ background: t.preview }} />
          <span className="text-sm text-white flex-1 text-left">{t.name}</span>
          {current === t.id && <div className="h-2 w-2 rounded-full bg-white shrink-0" />}
        </button>
      ))}
    </div>
  );
}

// ── Main QuizJoinPage ─────────────────────────────────────────────────────────
export default function QuizJoinPage() {
  const { joinCode } = useParams<{ joinCode: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeId>("classic");
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [displayName, setDisplayName] = useState(randomFunName());
  const [soundEffects, setSoundEffects] = useState(true);
  const [readAloud, setReadAloud] = useState(false);
  const [joining, setJoining] = useState(false);

  // Fetch session by join code
  const { data: session, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ["join-session", joinCode],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.QUIZ_SESSIONS).select("id, join_code, status, theme, tenant_id").eq("join_code", joinCode!).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Session not found");
      return data;
    },
    enabled: !!joinCode && !loading,
    staleTime: 10_000,
  });

  const themeConfig = getTheme(theme);

  const handleJoin = async () => {
    if (!displayName.trim()) { toast.error("Please enter your name."); return; }
    if (!session) { toast.error("Session not found."); return; }
    setJoining(true);
    try {
      const avatar = randomAvatar();
      const { data: participant, error } = await supabase.from(TABLES.QUIZ_PARTICIPANTS).insert({
        session_id: session.id,
        display_name: displayName.trim(),
        avatar_emoji: avatar,
        is_host: false,
        tenant_id: (session as any).tenant_id,
      } as any).select("id").single();
      if (error) throw error;
      // Navigate to waiting room
      navigate(`/quiz/waiting/${session.id}/${participant.id}`);
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to join.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <LoadingScreen onDone={() => setLoading(false)} />;

  if (sessionError || (!sessionLoading && !session)) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 text-center px-6">
        <span className="text-5xl">❌</span>
        <p className="text-white text-xl font-bold">Session not found</p>
        <p className="text-white/60 text-sm">The join code "{joinCode}" is invalid or the session has ended.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden transition-colors duration-500" style={{ background: themeConfig.bg }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/20 shrink-0">
        <div className="relative">
          <button onClick={() => setThemePanelOpen(o => !o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors">
            <Palette className="h-3.5 w-3.5" />Theme
          </button>
          {themePanelOpen && <ThemeSelector current={theme} onSelect={setTheme} onClose={() => setThemePanelOpen(false)} />}
        </div>
        {/* Join code top-right */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border border-white/10">
          <span className="text-white font-mono font-bold text-sm tracking-widest">{joinCode?.replace(/(\d{3})(\d{3})/, "$1 $2")}</span>
        </div>
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Name card */}
          <div className="rounded-2xl bg-black/50 backdrop-blur-sm border border-white/10 p-6 mb-4">
            <p className="text-white/60 text-xs font-medium mb-2">Your Vestry Hub name is...</p>
            <div className="flex items-center gap-2 mb-4">
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="flex-1 rounded-xl bg-white text-slate-800 font-semibold text-base px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Enter your name..."
                maxLength={30}
              />
              <button onClick={() => setDisplayName(randomFunName())} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleJoin}
              disabled={joining || !displayName.trim() || sessionLoading}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base transition-colors disabled:opacity-50 shadow-lg"
            >
              {joining ? "Joining..." : "Start"}
            </button>
          </div>

          {/* Settings card */}
          <div className="rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 p-5">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">Settings</p>
            <div className="flex items-center justify-between py-2.5 border-b border-white/10">
              <div className="flex items-center gap-2 text-white text-sm">
                <span>🔊</span>Sound effects
              </div>
              <Switch checked={soundEffects} onCheckedChange={setSoundEffects} className="data-[state=checked]:bg-emerald-500" />
            </div>
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2 text-white text-sm">
                <span>📖</span>Read text aloud
              </div>
              <Switch checked={readAloud} onCheckedChange={setReadAloud} className="data-[state=checked]:bg-emerald-500" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
