import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, Music, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChurchMediaItem } from "@/types/media";

interface MediaLightboxProps {
  items: ChurchMediaItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  currentIndex: number;
  canDownload?: boolean;
}

export function MediaLightbox({
  items,
  isOpen,
  onClose,
  onNavigate,
  currentIndex,
  canDownload = true,
}: MediaLightboxProps) {
  const thumbsRef = useRef<HTMLDivElement>(null);
  const item = items[currentIndex];

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < items.length - 1) onNavigate(currentIndex + 1);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, currentIndex, items.length, onNavigate, onClose]);

  // Auto-scroll thumbnail strip
  useEffect(() => {
    if (!thumbsRef.current) return;
    const thumb = thumbsRef.current.children[currentIndex] as HTMLElement;
    if (thumb) thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentIndex]);

  const handleDownload = async () => {
    if (!item) return;
    try {
      const res = await fetch(item.file_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.file_name || item.title || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(item.file_url, "_blank");
    }
  };

  const imageItems = items.filter(i => i.media_type === "image");
  const showThumbs = imageItems.length > 1 && item?.media_type === "image";

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col"
          onClick={onClose}
        >
          {/* Top bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-white font-medium text-sm truncate max-w-xs">
                {item.title || item.file_name || "Media"}
              </p>
              {item.media_categories && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0"
                  style={{
                    backgroundColor: `${item.media_categories.color}30`,
                    color: item.media_categories.color,
                  }}
                >
                  {item.media_categories.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white/60 text-xs">
                {currentIndex + 1} of {items.length}
              </span>
              {canDownload && item.download_enabled && (
                <button
                  onClick={handleDownload}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>

          {/* Main content */}
          <div
            className="flex-1 flex items-center justify-center relative px-16"
            onClick={e => e.stopPropagation()}
          >
            {/* Prev button */}
            {currentIndex > 0 && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onNavigate(currentIndex - 1)}
                className="absolute left-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
              >
                <ChevronLeft className="h-5 w-5" />
              </motion.button>
            )}

            {/* Media */}
            <AnimatePresence mode="wait">
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="flex items-center justify-center max-h-[80vh] max-w-[85vw]"
              >
                {item.media_type === "image" && (
                  <img
                    src={item.file_url}
                    alt={item.title || ""}
                    className="max-h-[80vh] max-w-[85vw] object-contain rounded-lg"
                  />
                )}
                {item.media_type === "video" && (
                  <video
                    src={item.file_url}
                    controls
                    autoPlay
                    className="max-h-[80vh] max-w-[85vw] rounded-lg bg-black"
                  />
                )}
                {item.media_type === "audio" && (
                  <div className="max-w-md w-full bg-white/10 rounded-2xl p-8 text-center">
                    <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                      <Music className="h-10 w-10 text-white/70" />
                    </div>
                    <p className="text-white font-semibold text-xl mb-2">{item.title || item.file_name}</p>
                    {item.media_categories && (
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-4"
                        style={{
                          backgroundColor: `${item.media_categories.color}30`,
                          color: item.media_categories.color,
                        }}
                      >
                        {item.media_categories.name}
                      </span>
                    )}
                    <audio
                      controls
                      autoPlay
                      src={item.file_url}
                      className="w-full mt-4"
                      style={{ accentColor: "var(--primary)" }}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Next button */}
            {currentIndex < items.length - 1 && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onNavigate(currentIndex + 1)}
                className="absolute right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
              >
                <ChevronRight className="h-5 w-5" />
              </motion.button>
            )}
          </div>

          {/* Thumbnail strip (images only) */}
          {showThumbs && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent pb-4 pt-8"
              onClick={e => e.stopPropagation()}
            >
              <div
                ref={thumbsRef}
                className="flex gap-2 overflow-x-auto scrollbar-none px-4 justify-center"
              >
                {items.map((img, i) => (
                  img.media_type === "image" && (
                    <button
                      key={img.id}
                      onClick={() => onNavigate(i)}
                      className={cn(
                        "h-16 w-16 rounded-lg overflow-hidden shrink-0 transition-all",
                        i === currentIndex
                          ? "ring-2 ring-white ring-offset-2 ring-offset-black opacity-100"
                          : "opacity-50 hover:opacity-100"
                      )}
                    >
                      <img src={img.file_url} alt="" className="h-full w-full object-cover" />
                    </button>
                  )
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
