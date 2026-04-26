import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  title: string;
  category: string;
  color: string;
  className?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src, title, category, color, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn("rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 font-jakarta", className)}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3 mb-3">
        {/* Icon */}
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}26` }}
        >
          {/* Waveform bars when playing */}
          {isPlaying ? (
            <div className="flex items-end gap-0.5 h-5">
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full"
                  style={{ backgroundColor: color }}
                  animate={{ height: ["4px", "16px", "8px", "20px", "4px"] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15, ease: "easeInOut" }}
                />
              ))}
            </div>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill={color}>
              <path d="M9 3v10.55A4 4 0 1 0 11 17V7h4V3H9z" />
            </svg>
          )}
        </div>

        {/* Title + category */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{title}</p>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mt-0.5"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {category}
          </span>
        </div>

        {/* Duration */}
        {duration > 0 && (
          <span className="text-xs text-muted-foreground shrink-0">{formatTime(duration)}</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <motion.button
          onClick={togglePlay}
          whileTap={{ scale: 0.95 }}
          className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-white"
          style={{ backgroundColor: color }}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </motion.button>

        {/* Progress bar */}
        <div
          className="flex-1 h-1.5 rounded-full bg-muted cursor-pointer overflow-hidden"
          onClick={handleSeek}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color, width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Time */}
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
