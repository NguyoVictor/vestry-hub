import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { ParticipantChip } from "./ParticipantChip";
import { CountUp } from "@/components/ui/animated";
import { Rocket, Users, Copy } from "lucide-react";
import { toast } from "sonner";

interface HostLobbyProps {
  gamePin: string;
  joinUrl: string;
  courseName?: string;
  quizName?: string;
  questionCount: number;
  avgTimePerQuestion: number;
  participants: Array<{
    id: string;
    display_name: string;
    avatar_emoji: string;
    joined_at: string;
  }>;
  onStart: () => void;
  canStart: boolean;
}

export function HostLobby({
  gamePin,
  joinUrl,
  courseName,
  quizName,
  questionCount,
  avgTimePerQuestion,
  participants,
  onStart,
  canStart
}: HostLobbyProps) {
  const baseUrl = window.location.origin;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  return (
    <div className="flex-1 grid grid-cols-[25%_50%_25%] gap-6 px-6 py-8">
      {/* Left Column - Session Info */}
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="text-5xl">{courseName ? "📚" : "🎯"}</div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {courseName || "Live Quiz"}
            </h2>
            <p className="text-white/60 text-lg">
              {quizName || "Interactive Session"}
            </p>
          </div>
        </div>

        <div className="h-px bg-white/20" />

        <div className="space-y-3 text-white/80">
          <div className="flex items-center justify-between">
            <span>Questions:</span>
            <span className="font-bold">{questionCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Time per question:</span>
            <span className="font-bold">{avgTimePerQuestion}s avg</span>
          </div>
        </div>

        <Button
          onClick={onStart}
          disabled={!canStart}
          className={`
            w-full h-14 text-lg font-bold transition-all duration-300
            ${canStart 
              ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl hover:scale-105" 
              : "bg-gray-500 opacity-50 cursor-not-allowed"
            }
          `}
        >
          <Rocket className="h-5 w-5 mr-2" />
          {canStart ? "START GAME" : "Waiting for players..."}
        </Button>

        {canStart && (
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(16,185,129,0.4)',
                '0 0 0 12px rgba(16,185,129,0)',
                '0 0 0 0 rgba(16,185,129,0)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-xl pointer-events-none"
          />
        )}
      </div>

      {/* Center Column - PIN + QR */}
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="text-center">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-3 font-semibold">
            GAME PIN
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl px-8 py-6 shadow-2xl"
          >
            <motion.div
              initial={{ rotateX: 90 }}
              animate={{ rotateX: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 20,
                staggerChildren: 0.08 
              }}
              className="font-black font-mono text-7xl text-slate-800 tracking-wider"
            >
              {gamePin.split('').map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ rotateX: 90 }}
                  animate={{ rotateX: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="inline-block"
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
          <p className="text-white text-sm mt-4">
            Go to <span className="font-mono font-bold">{baseUrl.replace(/^https?:\/\//, "")}/join</span>
          </p>
        </div>

        <div className="text-center">
          <div className="bg-white p-4 rounded-2xl shadow-xl">
            <QRCodeSVG 
              value={joinUrl || `${baseUrl}/join/${gamePin}`}
              size={160}
              bgColor="transparent"
              fgColor="#1e293b"
              level="M"
            />
          </div>
          <p className="text-white/50 text-xs mt-3">or scan to join</p>
        </div>
      </div>

      {/* Right Column - Participants */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold text-lg">Players</h3>
          <div className="bg-white/20 rounded-full px-3 py-1">
            <CountUp 
              to={participants.length}
              className="text-white font-mono font-bold text-sm"
            />
          </div>
        </div>

        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {participants.length === 0 ? (
            <div className="text-center py-8">
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-white/60 text-sm"
              >
                Waiting for players...
              </motion.div>
              <div className="flex justify-center gap-1 mt-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      y: [0, -12, 0],
                      opacity: [0.6, 1, 0.6]
                    }}
                    transition={{ 
                      duration: 0.8, 
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                    className="w-2 h-2 bg-white/40 rounded-full"
                  />
                ))}
              </div>
            </div>
          ) : (
            participants.map((participant) => (
              <ParticipantChip
                key={participant.id}
                name={participant.display_name}
                avatar={participant.avatar_emoji}
                joinedAt={participant.joined_at}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}