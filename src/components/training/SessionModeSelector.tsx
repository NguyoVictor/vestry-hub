import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClassicSessionSettings } from "./ClassicSessionSettings";

interface SessionModeSelectorProps {
  quizTitle?: string;
  quiz?: { id: string; title: string; questions: any[]; num_questions?: number | null };
  onBack?: () => void;
  onSelect?: (mode: string) => void;
}

// ── Classic card illustration ──────────────────────────────────────────────────
function ClassicIllustration({ hovered }: { hovered: boolean }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[55%] flex flex-col items-center justify-end pb-4 pointer-events-none">
      {/* Screen / quiz interface mockup */}
      <div className="w-[85%] rounded-xl bg-[#6b1f5e]/60 p-3 mb-2">
        <div className="h-2.5 w-3/4 rounded bg-[#8b2f7e]/60 mb-2" />
        <div className="h-2 w-1/2 rounded bg-[#8b2f7e]/40 mb-3" />
        {/* Answer buttons A B C D */}
        <div className="flex gap-2 justify-center">
          {["A", "B", "C", "D"].map((letter, i) => (
            <motion.div
              key={letter}
              animate={hovered && i === 2 ? { scale: 1.15, backgroundColor: "#f97316" } : { scale: 1, backgroundColor: i === 2 ? "#ea580c" : "#7c3aed" }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white text-xs font-bold shadow-md"
            >
              {letter}
            </motion.div>
          ))}
        </div>
      </div>
      {/* Player avatar */}
      <motion.div
        animate={hovered ? { y: -4 } : { y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-[#7c3aed] shadow-lg overflow-hidden"
      >
        {/* Simple avatar face */}
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <circle cx="20" cy="20" r="20" fill="#c084fc" />
          <circle cx="20" cy="16" r="8" fill="#f3e8ff" />
          <circle cx="20" cy="38" r="12" fill="#f3e8ff" />
          <circle cx="16" cy="15" r="2" fill="#7c3aed" />
          <circle cx="24" cy="15" r="2" fill="#7c3aed" />
          <path d="M16 20 Q20 23 24 20" stroke="#7c3aed" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Helmet */}
          <path d="M12 16 Q12 8 20 8 Q28 8 28 16" fill="#7c3aed" />
          <rect x="11" y="15" width="18" height="3" rx="1.5" fill="#6d28d9" />
        </svg>
      </motion.div>
    </div>
  );
}

// ── Mastery Peak illustration ──────────────────────────────────────────────────
function MasteryPeakIllustration({ hovered }: { hovered: boolean }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[60%] pointer-events-none overflow-hidden rounded-b-[1.5rem]">
      {/* Mountain background */}
      <svg viewBox="0 0 300 180" className="absolute bottom-0 w-full" preserveAspectRatio="xMidYMax meet">
        {/* Back mountain */}
        <polygon points="150,10 280,180 20,180" fill="#5eead4" opacity="0.5" />
        {/* Snow cap */}
        <polygon points="150,10 175,55 125,55" fill="white" opacity="0.9" />
        {/* Main mountain */}
        <polygon points="150,20 260,180 40,180" fill="#2dd4bf" opacity="0.8" />
        {/* Snow */}
        <polygon points="150,20 170,60 130,60" fill="white" />
        {/* Flag */}
        <line x1="150" y1="20" x2="150" y2="5" stroke="#ef4444" strokeWidth="2" />
        <polygon points="150,5 165,10 150,15" fill="#ef4444" />
        {/* Dashed path lines */}
        <path d="M80,160 Q100,130 120,110 Q135,95 150,80" stroke="#374151" strokeWidth="1.5" strokeDasharray="4,3" fill="none" opacity="0.5" />
        <path d="M220,160 Q200,130 180,110 Q165,95 150,80" stroke="#374151" strokeWidth="1.5" strokeDasharray="4,3" fill="none" opacity="0.5" />
        {/* Orange triangle obstacles */}
        <polygon points="70,165 80,145 90,165" fill="#f97316" opacity="0.8" />
        <polygon points="200,170 210,152 220,170" fill="#f97316" opacity="0.8" />
        <polygon points="240,155 248,140 256,155" fill="#f97316" opacity="0.7" />
      </svg>
      {/* Climber avatars */}
      {[
        { x: "28%", y: "62%", color: "#a78bfa", delay: 0 },
        { x: "45%", y: "48%", color: "#34d399", delay: 0.1 },
        { x: "62%", y: "55%", color: "#f472b6", delay: 0.2 },
        { x: "72%", y: "68%", color: "#60a5fa", delay: 0.15 },
      ].map((avatar, i) => (
        <motion.div
          key={i}
          animate={hovered ? { y: -6, scale: 1.1 } : { y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: avatar.delay }}
          className="absolute flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-md overflow-hidden"
          style={{ left: avatar.x, top: avatar.y, backgroundColor: avatar.color }}
        >
          <svg viewBox="0 0 32 32" className="h-full w-full">
            <circle cx="16" cy="13" r="6" fill="white" opacity="0.9" />
            <circle cx="16" cy="28" r="9" fill="white" opacity="0.7" />
            <path d="M10 12 Q10 6 16 6 Q22 6 22 12" fill={avatar.color} />
            <rect x="9" y="11" width="14" height="2.5" rx="1.25" fill={avatar.color} opacity="0.8" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

// ── Test Mode illustration ─────────────────────────────────────────────────────
function TestModeIllustration() {
  return (
    <div className="absolute left-4 bottom-3 pointer-events-none">
      <svg viewBox="0 0 80 80" className="h-20 w-20">
        <circle cx="40" cy="30" r="18" fill="#a78bfa" />
        <circle cx="40" cy="26" r="10" fill="#f3e8ff" />
        <circle cx="36" cy="25" r="2" fill="#7c3aed" />
        <circle cx="44" cy="25" r="2" fill="#7c3aed" />
        <path d="M36 30 Q40 33 44 30" stroke="#7c3aed" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M22 12 Q22 4 40 4 Q58 4 58 12" fill="#6d28d9" />
        <rect x="21" y="11" width="38" height="5" rx="2.5" fill="#5b21b6" />
        {/* Desk */}
        <rect x="15" y="52" width="50" height="5" rx="2" fill="#7c3aed" opacity="0.6" />
        <rect x="20" y="57" width="4" height="15" rx="2" fill="#7c3aed" opacity="0.4" />
        <rect x="56" y="57" width="4" height="15" rx="2" fill="#7c3aed" opacity="0.4" />
        {/* Paper on desk */}
        <rect x="28" y="42" width="24" height="12" rx="2" fill="white" opacity="0.9" />
        <line x1="31" y1="46" x2="49" y2="46" stroke="#7c3aed" strokeWidth="1.5" opacity="0.5" />
        <line x1="31" y1="49" x2="45" y2="49" stroke="#7c3aed" strokeWidth="1.5" opacity="0.5" />
        {/* Pencil */}
        <rect x="48" y="40" width="3" height="14" rx="1" fill="#f59e0b" transform="rotate(-20 50 47)" />
      </svg>
    </div>
  );
}

// ── Team Mode illustration ─────────────────────────────────────────────────────
function TeamModeIllustration() {
  return (
    <div className="absolute right-3 bottom-2 pointer-events-none">
      <svg viewBox="0 0 90 70" className="h-16 w-20">
        {/* Three team members */}
        {[
          { cx: 20, color: "#60a5fa" },
          { cx: 45, color: "#34d399" },
          { cx: 70, color: "#f472b6" },
        ].map((m, i) => (
          <g key={i}>
            <circle cx={m.cx} cy="22" r="12" fill={m.color} />
            <circle cx={m.cx} cy="18" r="7" fill="white" opacity="0.9" />
            <circle cx={m.cx - 2} cy="17" r="1.5" fill={m.color} />
            <circle cx={m.cx + 2} cy="17" r="1.5" fill={m.color} />
            <path d={`M${m.cx - 3} 21 Q${m.cx} 24 ${m.cx + 3} 21`} stroke={m.color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d={`M${m.cx - 5} 12 Q${m.cx - 5} 6 ${m.cx} 6 Q${m.cx + 5} 6 ${m.cx + 5} 12`} fill={m.color} opacity="0.8" />
            <rect x={m.cx - 6} y="11" width="12" height="2.5" rx="1.25" fill={m.color} opacity="0.7" />
            <ellipse cx={m.cx} cy="50" rx="10" ry="16" fill={m.color} opacity="0.6" />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Card components ────────────────────────────────────────────────────────────

// Classic — zoom in on hover, description fades in
function ClassicCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      className="relative rounded-[1.5rem] overflow-hidden cursor-pointer select-none"
      style={{ backgroundColor: "#6b1f5e" }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      <div className="relative h-full min-h-[220px] p-6 flex flex-col items-center">
        {/* Title */}
        <h2 className="font-fredoka text-3xl font-semibold text-white text-center mt-2 z-10 relative">
          Classic
        </h2>
        {/* Description — fades in on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
              className="text-white/90 text-sm text-center mt-2 z-10 relative max-w-[200px] leading-snug"
            >
              Students answer at their own pace and you see results on a live leaderboard
            </motion.p>
          )}
        </AnimatePresence>
        {/* Illustration */}
        <ClassicIllustration hovered={hovered} />
      </div>
    </motion.div>
  );
}

// Mastery Peak — zoom in on hover, description fades in
function MasteryPeakCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      className="relative rounded-[1.5rem] overflow-hidden cursor-pointer select-none"
      style={{ backgroundColor: "#99f6e4" }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      <div className="relative h-full min-h-[220px] p-6 flex flex-col items-center">
        {/* Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm z-20">
          <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" />
          Students love this
        </div>
        {/* Title */}
        <h2 className="font-fredoka text-3xl font-semibold text-[#0f766e] text-center mt-2 z-10 relative">
          Mastery Peak
        </h2>
        {/* Description — fades in on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
              className="text-[#0f766e] text-sm text-center mt-2 z-10 relative max-w-[200px] leading-snug"
            >
              Students repeat questions to achieve mastery, having fun with mountain climbing and minigames
            </motion.p>
          )}
        </AnimatePresence>
        {/* Illustration */}
        <MasteryPeakIllustration hovered={hovered} />
      </div>
    </motion.div>
  );
}

// Test Mode — illustration flies UP, description appears in its place
function TestModeCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      className="relative rounded-[1.5rem] overflow-hidden cursor-pointer select-none"
      style={{ backgroundColor: "#1e40af" }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
    >
      <div className="relative h-full min-h-[110px] flex items-center px-5 py-4">
        {/* Illustration — flies up on hover */}
        <motion.div
          animate={hovered ? { y: -80, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="shrink-0"
        >
          <TestModeIllustration />
        </motion.div>

        {/* Title — slides left when hovered */}
        <motion.h2
          animate={hovered ? { x: 0, opacity: 0 } : { x: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="font-fredoka text-2xl font-semibold text-white ml-16 z-10 relative"
        >
          Test mode
        </motion.h2>

        {/* Description — flies in from bottom when hovered */}
        <AnimatePresence>
          {hovered && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center text-white text-sm font-semibold text-center px-6 leading-snug"
            >
              Students take a formal assessment in a focused environment
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Team Mode — illustration flies UP, description appears in its place
function TeamModeCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      className="relative rounded-[1.5rem] overflow-hidden cursor-pointer select-none"
      style={{ backgroundColor: "#9f1239" }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
    >
      <div className="relative h-full min-h-[110px] flex items-center px-5 py-4">
        {/* Title */}
        <motion.h2
          animate={hovered ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="font-fredoka text-2xl font-semibold text-white z-10 relative flex-1 text-center"
        >
          Team mode
        </motion.h2>

        {/* Illustration — flies up on hover */}
        <motion.div
          animate={hovered ? { y: -80, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="shrink-0"
        >
          <TeamModeIllustration />
        </motion.div>

        {/* Description — flies in from bottom when hovered */}
        <AnimatePresence>
          {hovered && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center text-white text-sm font-semibold text-center px-6 leading-snug"
            >
              Students work together in teams to answer questions
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Main SessionModeSelector ───────────────────────────────────────────────────
export function SessionModeSelector({ quizTitle, quiz, onBack, onSelect }: SessionModeSelectorProps) {
  const [showClassic, setShowClassic] = useState(false);

  const handleSelect = (mode: string) => {
    if (mode === "classic") { setShowClassic(true); return; }
    onSelect?.(mode);
  };

  // Resolve the real quiz data — use passed quiz object, fall back to title only
  const resolvedQuiz = {
    id: quiz?.id ?? "quiz",
    title: quiz?.title ?? quizTitle ?? "Quiz",
    questions: Array.isArray(quiz?.questions) ? quiz.questions : [],
    num_questions: quiz?.num_questions ?? null,
  };

  // Classic settings — inline, no redirect
  if (showClassic) {
    return (
      <ClassicSessionSettings
        quiz={resolvedQuiz}
        onBack={() => setShowClassic(false)}
        onStart={() => { onSelect?.("classic"); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Select a session mode
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-2 gap-4"
          >
            {/* Row 1: Classic + Mastery Peak — tall cards */}
            <div className="h-[280px]">
              <ClassicCard onClick={() => handleSelect("classic")} />
            </div>
            <div className="h-[280px]">
              <MasteryPeakCard onClick={() => handleSelect("mastery-peak")} />
            </div>

            {/* Row 2: Test Mode + Team Mode — shorter cards */}
            <div className="h-[110px]">
              <TestModeCard onClick={() => handleSelect("test-mode")} />
            </div>
            <div className="h-[110px]">
              <TeamModeCard onClick={() => handleSelect("team-mode")} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default SessionModeSelector;
