import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayCircle, Search, Mic2, Video, Download } from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const Sermons = () => {
  const church = useChurch();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["published_sermons", church.tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("studio_media").select("*").eq("status", "published").order("recording_date", { ascending: false });
      return data || [];
    },
  });

  const { data: sermonPreps = [] } = useQuery({
    queryKey: ["published_sermon_preps", church.tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("sermons").select("*").eq("status", "published").order("date_to_preach", { ascending: false });
      return data || [];
    },
  });

  const allSermons = [
    ...media.map((m: any) => ({ ...m, source: "studio", name: m.title })),
    ...sermonPreps.filter((s: any) => !media.some((m: any) => m.linked_sermon_id === s.id)).map((s: any) => ({ ...s, source: "prep", name: s.title, media_type: "text", recording_date: s.date_to_preach })),
  ];

  const filtered = allSermons.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <Helmet><title>Sermons & Messages — Vestry</title></Helmet>
      <PageHeader title="Sermons & Messages" subtitle="Published sermon archive" action={<Button size="sm" asChild><Link to="/church-studio"><Mic2 className="mr-2 h-4 w-4" />Upload Sermon</Link></Button>} />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search sermons..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" /></div>
      </div>

      {isLoading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-lg" />)}</div> :
      filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16"><PlayCircle className="h-16 w-16 text-muted-foreground/30 mb-4" /><h3 className="font-semibold text-lg">No published sermons</h3><p className="text-sm text-muted-foreground mt-1">Publish a sermon from Sermon Preparation or upload via Church Studio</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sermon: any) => (
            <Card key={sermon.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                {sermon.thumbnail_url ? <img src={sermon.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <PlayCircle className="h-12 w-12 text-primary/40" />}
                <div className="absolute top-2 left-2">
                  <Badge variant={sermon.media_type === "video" ? "default" : "secondary"} className="text-xs">
                    {sermon.media_type === "video" ? <><Video className="mr-1 h-3 w-3" />Video</> : sermon.media_type === "audio" ? <><Mic2 className="mr-1 h-3 w-3" />Audio</> : "Notes"}
                  </Badge>
                </div>
                {sermon.duration_seconds && (
                  <div className="absolute top-2 right-2"><Badge variant="secondary" className="text-xs">{Math.floor(sermon.duration_seconds / 60)}:{String(sermon.duration_seconds % 60).padStart(2, "0")}</Badge></div>
                )}
              </div>
              <CardContent className="pt-4">
                <h3 className="font-semibold line-clamp-2">{sermon.name}</h3>
                {sermon.scripture_reference && <p className="text-sm text-primary mt-1">{sermon.scripture_reference}</p>}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  {sermon.speaker && <span>{sermon.speaker}</span>}
                  {sermon.recording_date && <span>· {format(new Date(sermon.recording_date), "MMM d, yyyy")}</span>}
                </div>
                {sermon.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{sermon.description}</p>}
                <div className="flex gap-2 mt-3">
                  {sermon.file_url && sermon.file_url !== "pending" && (
                    <>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(sermon.file_url, "_blank")}><PlayCircle className="mr-2 h-3.5 w-3.5" />Play</Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(sermon.file_url, "_blank")}><Download className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};

export default Sermons;
