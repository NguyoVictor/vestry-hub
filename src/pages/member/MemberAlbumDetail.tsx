import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import { PageTransition } from "@/components/ui/PageTransition";
import { MediaLightbox } from "@/components/media/MediaLightbox";
import MasonryGrid from "@/components/ui/MasonryGrid";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import type { ChurchMediaItem } from "@/types/media";

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url); const blob = await res.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = filename; document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(a.href);
  } catch { window.open(url, "_blank"); }
}

export default function MemberAlbumDetail() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const member = useMemberPortal();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data: album } = useQuery({
    queryKey: ["member-album", albumId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.MEDIA_ALBUMS).select("*").eq("id", albumId!).single();
      return data;
    },
    enabled: !!albumId,
    staleTime: 300_000,
  });

  const { data: media = [], isLoading } = useQuery<ChurchMediaItem[]>({
    queryKey: ["member-album-media", albumId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.CHURCH_MEDIA_ITEMS)
        .select("*, media_categories(name, color)")
        .eq("tenant_id", member.churchId)
        .eq("album_id", albumId!)
        .in("visibility", ["members", "featured"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChurchMediaItem[];
    },
    enabled: !!albumId,
    staleTime: 300_000,
  });

  const images = media.filter(m => m.media_type === "image");

  return (
    <PageTransition>
      <Helmet><title>{album?.name ?? "Album"} — Church Media</title></Helmet>
      <div className="min-h-screen bg-slate-50 font-jakarta">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* Back button + header */}
          <BlurFadeIn delay={0}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/member/church-media")}
                className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-jakarta">{album?.name ?? "Album"}</h1>
                {album?.description && <p className="text-sm text-slate-500 font-jakarta mt-0.5">{album.description}</p>}
              </div>
              <span className="ml-auto text-xs text-slate-400 font-jakarta">{media.length} item{media.length !== 1 ? "s" : ""}</span>
            </div>
          </BlurFadeIn>

          {/* Media grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <Camera className="h-12 w-12 text-slate-300" />
              <p className="text-base font-semibold text-slate-600 font-jakarta">No photos in this album</p>
              <p className="text-sm text-slate-400 font-jakarta">Photos will appear here once they're added to this album.</p>
            </div>
          ) : (
            <MasonryGrid
              items={images}
              className="columns-1 sm:columns-2 lg:columns-3"
              staggerDelay={0.05}
              renderItem={(item, i) => (
                <div
                  className="group relative rounded-xl overflow-hidden cursor-pointer bg-slate-100"
                  onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                >
                  <img src={item.file_url} alt={item.title || ""} className="w-full h-auto object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-end">
                    <div className="w-full p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 flex items-end justify-between">
                      <p className="text-white text-xs font-medium truncate font-jakarta">{item.title || item.file_name || "Photo"}</p>
                      {item.download_enabled && (
                        <button
                          onClick={e => { e.stopPropagation(); downloadFile(item.file_url, item.file_name || item.title || "photo"); }}
                          className="h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0 ml-2"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </div>

      <MediaLightbox
        items={images}
        initialIndex={lightboxIndex}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
        canDownload
      />
    </PageTransition>
  );
}
