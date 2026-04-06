import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Play, Search, Clock, User, ArrowLeft, BookOpen } from "lucide-react";
import ReactPlayer from "react-player";

export function MemberSermons() {
  const member = useMemberPortal();
  const [search, setSearch] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);

  const { data: sermons = [], isLoading } = useQuery({
    queryKey: ["member-sermons", member.churchId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("studio_media")
        .select("*")
        .eq("church_id", member.churchId)
        .eq("status", "published")
        .order("published_at", { ascending: false });
      return data || [];
    },
  });

  const series = [...new Set(sermons.map((s: any) => s.series).filter(Boolean))];

  const filtered = sermons.filter((s: any) => {
    const matchSearch = !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.speaker?.toLowerCase().includes(search.toLowerCase());
    const matchSeries = !selectedSeries || s.series === selectedSeries;
    return matchSearch && matchSeries;
  });

  return (
    <>
      <Helmet><title>Sermons — Vestry</title></Helmet>
      <div className="max-w-2xl mx-auto space-y-5">
        <h1 className="text-2xl font-bold">Sermons</h1>

        {/* Series row */}
        {series.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Series</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedSeries(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors ${!selectedSeries ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}
              >
                All
              </button>
              {series.map(s => (
                <button
                  key={s as string}
                  onClick={() => setSelectedSeries(s as string)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedSeries === s ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}
                >
                  {s as string}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 rounded-xl" placeholder="Search sermons..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Sermon cards */}
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p>No sermons found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s: any) => (
              <Link key={s.id} to={`/member/sermons/${s.id}`} className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-sm transition-shadow">
                <div className="h-16 w-16 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 overflow-hidden">
                  {s.thumbnail_url ? (
                    <img src={s.thumbnail_url} alt={s.title} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Play className="h-6 w-6 text-indigo-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.title}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {s.speaker && <span className="flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" />{s.speaker}</span>}
                    {s.duration && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{s.duration}</span>}
                    {s.series && <Badge variant="secondary" className="text-xs">{s.series}</Badge>}
                  </div>
                  {s.published_at && <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(s.published_at), "dd MMM yyyy")}</p>}
                </div>
                <Play className="h-5 w-5 text-indigo-500 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function MemberSermonDetail() {
  const { sermonId } = useParams<{ sermonId: string }>();
  const member = useMemberPortal();

  const { data: sermon, isLoading } = useQuery({
    queryKey: ["member-sermon", sermonId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("studio_media").select("*").eq("id", sermonId!).single();
      return data;
    },
    enabled: !!sermonId,
  });

  if (isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!sermon) return (
    <div className="text-center py-16 text-muted-foreground">
      <p>Sermon not found</p>
      <Button variant="outline" asChild className="mt-4"><Link to="/member/sermons"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
    </div>
  );

  return (
    <>
      <Helmet><title>{sermon.title} — Vestry</title></Helmet>
      <div className="max-w-2xl mx-auto space-y-5">
        <Button variant="ghost" size="sm" asChild className="gap-1"><Link to="/member/sermons"><ArrowLeft className="h-4 w-4" />Sermons</Link></Button>

        {/* Player */}
        {sermon.media_url && (
          <div className="rounded-2xl overflow-hidden bg-black aspect-video">
            <ReactPlayer url={sermon.media_url} width="100%" height="100%" controls />
          </div>
        )}

        <div className="space-y-3">
          <h1 className="text-2xl font-bold">{sermon.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {sermon.speaker && <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{sermon.speaker}</span>}
            {sermon.duration && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{sermon.duration}</span>}
            {sermon.series && <Badge variant="secondary">{sermon.series}</Badge>}
          </div>
          {sermon.description && <p className="text-muted-foreground leading-relaxed">{sermon.description}</p>}
        </div>
      </div>
    </>
  );
}
