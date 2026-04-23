import { useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export function GalleryLightbox({ images, initialIndex = 0, open, onClose }: GalleryLightboxProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => { setCurrent(initialIndex); }, [initialIndex, open]);

  const go = useCallback((dir: number) => {
    setDirection(dir);
    setCurrent(c => Math.max(0, Math.min(images.length - 1, c + dir)));
  }, [images.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, go, onClose]);

  if (!open || !images.length) return null;

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "60%" : "-60%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-60%" : "60%", opacity: 0 }),
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center"
          onClick={onClose}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Main image */}
          <div
            className="relative flex items-center justify-center w-full flex-1 overflow-hidden px-16"
            onClick={e => e.stopPropagation()}
            onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              if (touchStartX.current === null) return;
              const diff = touchStartX.current - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 50) go(diff > 0 ? 1 : -1);
              touchStartX.current = null;
            }}
          >
            <AnimatePresence custom={direction} mode="wait">
              <motion.img
                key={current}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeOut" }}
                src={images[current]}
                alt={`Image ${current + 1}`}
                className="max-w-[90vw] max-h-[75vh] object-contain rounded-lg select-none"
                draggable={false}
              />
            </AnimatePresence>

            {/* Nav arrows */}
            {current > 0 && (
              <button
                className="absolute left-2 h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                onClick={() => go(-1)}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {current < images.length - 1 && (
              <button
                className="absolute right-2 h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                onClick={() => go(1)}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Counter + thumbnail strip */}
          <div className="w-full px-4 pb-4 flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            <span className="text-white/70 text-sm bg-white/10 px-3 py-1 rounded-full">
              {current + 1} / {images.length}
            </span>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto max-w-full pb-1">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                    className={`shrink-0 h-14 w-14 rounded-md overflow-hidden transition-all ${
                      i === current ? "ring-2 ring-white opacity-100" : "opacity-50 hover:opacity-75"
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
