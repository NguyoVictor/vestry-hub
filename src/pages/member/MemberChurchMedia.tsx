import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Music, Video, Play, Image as ImageIcon, Download, FolderOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import { PageTransition } from "@/components/ui/PageTransition";
import { AudioPlayer } from "@/components/media/AudioPlayer";
import { MediaLightbox } from "@/components/media/MediaLightbox";
import MasonryGrid from "@/components/ui/MasonryGrid";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import type { ChurchMediaItem, MediaCategory } from "@/types/media";

type ActiveTab = "image" | "audio" | "video" | "albums";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function MediaEmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center font-jakarta">
      <Icon className="h-12 w-12 text-slate-300" />
      <p className="text-base font-semibold text-slate-600 font-jakarta">{title}</p>
      <p className="text-sm text-slate-400 max-w-sm font-jakarta">{subtitle}</p>
    </div>
  );
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url); const blob = await res.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = filename; document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(a.href);
  } catch { window.open(url, "_blank"); }
}

const MemberChurchMedia = () => {
  const member = useMemberPortal();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>("image");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxItems, setLightboxItems] = useState<ChurchMediaItem[]>([]);

  const { data: allMedia = [], isLoading } = useQuery<ChurchMediaItem[]>({
    queryKey: ["member-church-media", member.churchId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.CHURCH_MEDIA_ITEMS)
        .select("*, media_categories(name, color)").eq("tenant_id", member.churchId)
        .in("visibility", ["members", "featured"]).order("created_at", { ascending: false });
      if (error) throw error; return (data ?? []) as ChurchMediaItem[];
    },
    staleTime: 300_000,
  });

  const { data: categories = [] } = useQuery<MediaCategory[]>({
    queryKey: ["media-categories", member.churchId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.MEDIA_CATEGORIES).select("*").eq("tenant_id", member.churchId).eq("status", "active").order("sort_order");
      return (data ?? []) as MediaCategory[];
    },
    staleTime: 300_000,
  });

  const { data: albums = [], isLoading: albumsLoading } = useQuery({
    queryKey: ["member-media-albums", member.churchId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.MEDIA_ALBUMS).select("*").eq("tenant_id", member.churchId).in("visibility", ["members"]).order("sort_order");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const images = allMedia.filter(m => m.media_type === "image");
  const audio = allMedia.filter(m => m.media_type === "audio");
  const videos = allMedia.filter(m => m.media_type === "video");
  const featured = allMedia.filter(m => m.is_featured);
  const filteredImages = categoryFilter ? images.filter(m => m.category_id === categoryFilter) : images;
  const filteredAudio = categoryFilter ? audio.filter(m => m.category_id === categoryFilter) : audio;
  const filteredVideos = categoryFilter ? videos.filter(m => m.category_id === categoryFilter) : videos;

  const openLightbox = (items: ChurchMediaItem[], index: number) => {
    setLightboxItems(items); setLightboxIndex(index); setLightboxOpen(true);
  };

  const TABS = [
    { key: "image" as ActiveTab, label: "Images", icon: ImageIcon, count: images.length },
    { key: "audio" as ActiveTab, label: "Audio", icon: Music, count: audio.length },
    { key: "video" as ActiveTab, label: "Video", icon: Video, count: videos.length },
    { key: "albums" as ActiveTab, label: "Albums", icon: FolderOpen, count: albums.length },
  ];

  return (
    <PageTransition>
      <Helmet><title>Church Media — Vestry</title></Helmet>
      <div className="min-h-screen bg-slate-50 font-jakarta">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          {/* Hero */}
          <BlurFadeIn delay={0}>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 font-jakarta">Church Media</p>
              <h1 className="text-2xl font-bold text-slate-900 font-jakarta tracking-tight">Moments Worth Remembering</h1>
              <p className="text-sm text-slate-500 font-jakarta">Browse photos, videos, and audio from our church community.</p>
              {!isLoading && (
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <span className="flex items-center gap-1.5 text-sm text-slate-500 font-jakarta"><ImageIcon className="h-4 w-4 text-violet-500" /><span className="font-semibold text-slate-700">{images.length}</span> Photos</span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1.5 text-sm text-slate-500 font-jakarta"><Video className="h-4 w-4 text-violet-500" /><span className="font-semibold text-slate-700">{videos.length}</span> Videos</span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1.5 text-sm text-slate-500 font-jakarta"><Music className="h-4 w-4 text-violet-500" /><span className="font-semibold text-slate-700">{audio.length}</span> Audio clips</span>
                </div>
              )}
            </div>
          </BlurFadeIn>

          {/* Featured strip */}
          {featured.length > 0 && (
            <BlurFadeIn delay={0.08}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-800 font-jakarta">Featured</h2>
                  <button className="text-xs text-violet-600 hover:text-violet-700 font-medium font-jakarta transition-colors" onClick={() => { setActiveTab("image"); setCategoryFilter(null); }}>See all →</button>
                </div>
                <div className="flex overflow-x-auto gap-4 scrollbar-none pb-2">
                  {featured.map((item, i) => (
                    <BlurFadeIn key={item.id} delay={i * 0.06}>
                      <motion.div whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.12)" }} transition={{ duration: 0.2 }}
                        className="w-48 shrink-0 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-sm cursor-pointer"
                        onClick={() => openLightbox(featured, i)}>
                        {item.media_type === "image" ? (
                          <div className="h-32 bg-slate-100 overflow-hidden"><img src={item.file_url} alt={item.title || ""} className="w-full h-full object-cover" /></div>
                        ) : item.media_type === "video" ? (
                          <div className="h-32 bg-slate-900 flex items-center justify-center relative overflow-hidden">
                            {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Video className="h-8 w-8 text-white/40" />}
                            <div className="absolute inset-0 flex items-center justify-center"><div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><Play className="h-4 w-4 text-white ml-0.5" /></div></div>
                          </div>
                        ) : (
                          <div className="h-32 bg-violet-50 flex items-center justify-center"><Music className="h-8 w-8 text-violet-400" /></div>
                        )}
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-slate-700 truncate font-jakarta">{item.title || item.file_name || "Untitled"}</p>
                          {item.media_categories && <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium mt-1" style={{ backgroundColor: `${item.media_categories.color}20`, color: item.media_categories.color }}>{item.media_categories.name}</span>}
                        </div>
                      </motion.div>
                    </BlurFadeIn>
                  ))}
                </div>
              </div>
            </BlurFadeIn>
          )}

          {/* Tabs */}
          <BlurFadeIn delay={0.1}>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
              {TABS.map(({ key, label, icon: Icon }) => {
                const isActive = activeTab === key;
                return (
                  <button key={key} onClick={() => { setActiveTab(key); setCategoryFilter(null); }}
                    className="relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors font-jakarta"
                    style={{ color: isActive ? "#fff" : "#64748b" }}>
                    {isActive && <motion.div layoutId="memberMediaTab" className="absolute inset-0 rounded-lg bg-violet-600" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                    <span className="relative z-10 flex items-center gap-1.5"><Icon className="h-4 w-4" />{label}</span>
                  </button>
                );
              })}
            </div>
          </BlurFadeIn>

          {/* Category pills — not shown on albums tab */}
          {activeTab !== "albums" && categories.length > 0 && (
            <BlurFadeIn delay={0.12}>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setCategoryFilter(null)} className="relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors font-jakarta"
                  style={{ color: categoryFilter === null ? "#fff" : "#64748b", backgroundColor: categoryFilter === null ? "#7c3aed" : "transparent", border: categoryFilter === null ? "none" : "1px solid #e2e8f0" }}>
                  {categoryFilter === null && <motion.div layoutId="memberCategoryPill" className="absolute inset-0 rounded-full bg-violet-600" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                  <span className="relative z-10">All</span>
                </button>
                {categories.map(cat => {
                  const isActive = categoryFilter === cat.id;
                  return (
                    <button key={cat.id} onClick={() => setCategoryFilter(isActive ? null : cat.id)}
                      className="relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors font-jakarta"
                      style={{ color: isActive ? "#fff" : cat.color, backgroundColor: isActive ? cat.color : `${cat.color}15`, border: `1px solid ${cat.color}40` }}>
                      {isActive && <motion.div layoutId="memberCategoryPill" className="absolute inset-0 rounded-full" style={{ backgroundColor: cat.color }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                      <span className="relative z-10">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </BlurFadeIn>
          )}

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
              </motion.div>

            ) : activeTab === "image" ? (
              <motion.div key="images" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {filteredImages.length === 0 ? (
                  <MediaEmptyState icon={Camera} title="No photos yet" subtitle="Check back soon — our team will be uploading memories here." />
                ) : (
                  <MasonryGrid items={filteredImages} className="columns-1 sm:columns-2 lg:columns-3" staggerDelay={0.06}
                    renderItem={(item, i) => (
                      <div className="group relative rounded-xl overflow-hidden cursor-pointer bg-slate-100" onClick={() => openLightbox(filteredImages, i)}>
                        <img src={item.file_url} alt={item.title || ""} className="w-full h-auto object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-end">
                          <div className="w-full p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 flex items-end justify-between">
                            <div className="min-w-0">
                              <p className="text-white text-xs font-medium truncate font-jakarta">{item.title || item.file_name || "Photo"}</p>
                              {item.media_categories && <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium mt-1" style={{ backgroundColor: `${item.media_categories.color}30`, color: item.media_categories.color }}>{item.media_categories.name}</span>}
                            </div>
                            {/* Download button — only if download_enabled */}
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
                    )} />
                )}
              </motion.div>

            ) : activeTab === "audio" ? (
              <motion.div key="audio" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-3">
                {filteredAudio.length === 0 ? (
                  <MediaEmptyState icon={Music} title="No audio recordings yet" subtitle="Worship recordings and messages will appear here." />
                ) : filteredAudio.map((item, i) => (
                  <BlurFadeIn key={item.id} delay={i * 0.07}>
                    <AudioPlayer src={item.file_url} title={item.title || item.file_name || "Audio"} category={item.media_categories?.name || item.category || "General"} color={item.media_categories?.color || "#6366f1"} />
                  </BlurFadeIn>
                ))}
              </motion.div>

            ) : activeTab === "video" ? (
              <motion.div key="video" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {filteredVideos.length === 0 ? (
                  <MediaEmptyState icon={Video} title="No videos yet" subtitle="Church service recordings will be available here soon." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredVideos.map((item, i) => (
                      <BlurFadeIn key={item.id} delay={i * 0.06}>
                        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}
                          className="group rounded-xl overflow-hidden bg-white border border-slate-200 shadow-sm cursor-pointer"
                          onClick={() => openLightbox(filteredVideos, i)}>
                          <div className="relative h-44 bg-slate-900 overflow-hidden">
                            {item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title || ""} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Video className="h-10 w-10 text-white/20" /></div>}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                              <motion.div whileHover={{ scale: 1.1 }} className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center"><Play className="h-5 w-5 text-white ml-0.5" /></motion.div>
                            </div>
                            {item.duration && <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded font-jakarta">{formatDuration(item.duration)}</span>}
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-medium text-slate-800 truncate font-jakarta">{item.title || item.file_name || "Video"}</p>
                            {item.media_categories && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mt-1" style={{ backgroundColor: `${item.media_categories.color}20`, color: item.media_categories.color }}>{item.media_categories.name}</span>}
                          </div>
                        </motion.div>
                      </BlurFadeIn>
                    ))}
                  </div>
                )}
              </motion.div>

            ) : (
              /* Albums tab */
              <motion.div key="albums" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {albumsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
                  </div>
                ) : albums.length === 0 ? (
                  <MediaEmptyState icon={FolderOpen} title="No albums yet" subtitle="Our media team is organizing photos into albums." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {albums.map((album: any, i: number) => (
                      <BlurFadeIn key={album.id} delay={i * 0.06}>
                        <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm cursor-pointer"
                          onClick={() => navigate(`/member/church-media/albums/${album.id}`)}>
                          <div className="aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
                            {album.cover_url ? (
                              <img src={album.cover_url} alt={album.name} className="w-full h-full object-cover" />
                            ) : (
                              <FolderOpen className="h-12 w-12 text-slate-300" />
                            )}
                          </div>
                          <div className="p-4">
                            <p className="font-semibold text-sm text-slate-800 font-jakarta">{album.name}</p>
                            {album.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 font-jakarta">{album.description}</p>}
                          </div>
                        </motion.div>
                      </BlurFadeIn>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <MediaLightbox items={lightboxItems} initialIndex={lightboxIndex} currentIndex={lightboxIndex} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} onNavigate={setLightboxIndex} canDownload />
    </PageTransition>
  );
};

export default MemberChurchMedia;
