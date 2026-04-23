import { useState } from "react";
import { Camera, Play } from "lucide-react";
import { GalleryLightbox } from "./GalleryLightbox";

interface PremiumGalleryProps {
  images: string[];
  videos?: string[];
  facilityName?: string;
}

export function PremiumGallery({ images, videos = [], facilityName = "" }: PremiumGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const open = (i: number) => { setLightboxIndex(i); setLightboxOpen(true); };

  const imgClass = "w-full h-full object-cover cursor-pointer transition-all duration-200 hover:brightness-90 hover:scale-[1.01]";
  const cellClass = "overflow-hidden rounded-lg bg-slate-100";

  if (!images.length && !videos.length) {
    return (
      <div className="flex flex-col items-center justify-center h-36 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 gap-2">
        <Camera className="h-8 w-8" />
        <span className="text-sm">No photos added yet</span>
      </div>
    );
  }

  const count = images.length;
  const extra = count > 5 ? count - 5 : 0;

  return (
    <>
      <div className="space-y-1">
        {/* 1 image */}
        {count === 1 && (
          <div className={`${cellClass} h-56`}>
            <img src={images[0]} alt={facilityName} className={imgClass} onClick={() => open(0)} loading="lazy" />
          </div>
        )}

        {/* 2 images */}
        {count === 2 && (
          <div className="grid grid-cols-2 gap-1 h-48">
            {images.map((src, i) => (
              <div key={i} className={cellClass}>
                <img src={src} alt="" className={imgClass} onClick={() => open(i)} loading="lazy" />
              </div>
            ))}
          </div>
        )}

        {/* 3 images */}
        {count === 3 && (
          <div className="space-y-1">
            <div className={`${cellClass} h-44`}>
              <img src={images[0]} alt="" className={imgClass} onClick={() => open(0)} loading="lazy" />
            </div>
            <div className="grid grid-cols-2 gap-1 h-32">
              {images.slice(1, 3).map((src, i) => (
                <div key={i} className={cellClass}>
                  <img src={src} alt="" className={imgClass} onClick={() => open(i + 1)} loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4 images */}
        {count === 4 && (
          <div className="grid grid-cols-2 gap-1">
            {images.map((src, i) => (
              <div key={i} className={`${cellClass} h-36`}>
                <img src={src} alt="" className={imgClass} onClick={() => open(i)} loading="lazy" />
              </div>
            ))}
          </div>
        )}

        {/* 5+ images */}
        {count >= 5 && (
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-1 h-52">
              <div className={`${cellClass} col-span-2`}>
                <img src={images[0]} alt="" className={imgClass} onClick={() => open(0)} loading="lazy" />
              </div>
              <div className={cellClass}>
                <img src={images[1]} alt="" className={imgClass} onClick={() => open(1)} loading="lazy" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 h-36">
              {images.slice(2, 5).map((src, i) => (
                <div key={i} className={`${cellClass} relative`}>
                  <img src={src} alt="" className={imgClass} onClick={() => open(i + 2)} loading="lazy" />
                  {i === 2 && extra > 0 && (
                    <button
                      className="absolute inset-0 bg-black/55 flex items-center justify-center rounded-lg"
                      onClick={() => open(4)}
                    >
                      <span className="text-white font-bold text-lg">+{extra}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {videos.map((src, i) => (
          <div key={i} className={`${cellClass} h-44 relative`}>
            <video src={src} className="w-full h-full object-cover" preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg pointer-events-none">
              <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="h-5 w-5 text-slate-800 ml-0.5" />
              </div>
            </div>
            <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
              VIDEO
            </span>
          </div>
        ))}
      </div>

      <GalleryLightbox
        images={images}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
