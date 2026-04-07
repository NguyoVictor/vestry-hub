import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Music, Plus, MoreVertical, Search, Trash2, Edit, Eye } from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const GENRES: Record<string, string> = { hymn: "Hymn", contemporary_gospel: "Contemporary", praise: "Praise", worship: "Worship", other: "Other" };
const TEMPOS: Record<string, string> = { slow: "Slow", medium: "Medium", fast: "Fast" };
const KEYS = ["A", "A#", "Bb", "B", "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab"];

const SongLibrary = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<any>(null);
  const [editingSong, setEditingSong] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lyrics, setLyrics] = useState("");
  const form = useForm({ defaultValues: { title: "", artist: "", genre: "worship", key: "C", tempo: "medium", bpm: 0, ccli_number: "", notes: "", chord_chart: "" } });

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ["songs", church.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("songs").select("*").eq("tenant_id", church.tenantId!).order("title");
      if (error) throw error;
      return data || [];
    },
  });

  const saveSong = useMutation({
    mutationFn: async (values: any) => {
      const payload = { ...values, tenant_id: church.tenantId, created_by: church.userId, sections: lyrics ? [{ label: "Full Lyrics", content: lyrics }] : [] };
      if (editingSong) {
        const { error } = await supabase.from("songs").update(payload).eq("id", editingSong.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("songs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["songs"] }); toast.success(editingSong ? "Song updated" : "Song added"); setFormOpen(false); setEditingSong(null); form.reset(); setLyrics(""); },
  });

  const deleteSong = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("songs").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["songs"] }); toast.success("Song deleted"); },
  });

  const openEdit = (song: any) => {
    setEditingSong(song);
    form.reset({ title: song.title, artist: song.artist || "", genre: song.genre || "worship", key: song.key || "C", tempo: song.tempo || "medium", bpm: song.bpm || 0, ccli_number: song.ccli_number || "", notes: song.notes || "", chord_chart: song.chord_chart || "" });
    setLyrics(song.sections?.[0]?.content || "");
    setFormOpen(true);
  };

  const filtered = songs.filter((s: any) => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.artist?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <Helmet><title>Song Library — Vestry</title></Helmet>
      <PageHeader title="Song Library" subtitle="Manage your worship songs and lyrics" action={<Button size="sm" onClick={() => { setEditingSong(null); form.reset(); setLyrics(""); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Song</Button>} />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search songs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" /></div>
      </div>

      {isLoading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}</div> :
      filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16"><Music className="h-16 w-16 text-muted-foreground/30 mb-4" /><h3 className="font-semibold text-lg">No songs yet</h3><p className="text-sm text-muted-foreground mt-1">Add your first worship song</p><Button className="mt-4" onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Song</Button></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((song: any) => (
            <Card key={song.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base truncate">{song.title}</h3>
                    {song.artist && <p className="text-sm text-muted-foreground">{song.artist}</p>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setDetailOpen(song)}><Eye className="mr-2 h-4 w-4" />View Lyrics</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(song)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteSong.mutate(song.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge variant="secondary">{GENRES[song.genre] || song.genre}</Badge>
                  {song.tempo && <Badge variant="outline">{TEMPOS[song.tempo]}</Badge>}
                  {song.key && <Badge variant="outline">Key of {song.key}</Badge>}
                </div>
                {song.last_used_date && <p className="text-xs text-muted-foreground mt-3">Last used {new Date(song.last_used_date).toLocaleDateString()}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{editingSong ? "Edit Song" : "Add Song"}</SheetTitle></SheetHeader>
          <form onSubmit={form.handleSubmit(v => saveSong.mutate(v))} className="mt-6 space-y-4">
            <div><Label>Title *</Label><Input {...form.register("title", { required: true })} /></div>
            <div><Label>Artist</Label><Input {...form.register("artist")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Genre</Label><Select value={form.watch("genre")} onValueChange={v => form.setValue("genre", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(GENRES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Key</Label><Select value={form.watch("key")} onValueChange={v => form.setValue("key", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tempo</Label><Select value={form.watch("tempo")} onValueChange={v => form.setValue("tempo", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TEMPOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>BPM</Label><Input type="number" {...form.register("bpm", { valueAsNumber: true })} /></div>
            </div>
            <div><Label>Lyrics</Label><Textarea value={lyrics} onChange={e => setLyrics(e.target.value)} rows={8} placeholder="Enter lyrics..." /></div>
            <div><Label>Chord Chart</Label><Textarea {...form.register("chord_chart")} rows={4} placeholder="Chord notation..." /></div>
            <div><Label>CCLI Number</Label><Input {...form.register("ccli_number")} /></div>
            <div><Label>Notes</Label><Textarea {...form.register("notes")} /></div>
            <Button type="submit" className="w-full" disabled={saveSong.isPending}>{editingSong ? "Update Song" : "Add Song"}</Button>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={!!detailOpen} onOpenChange={open => { if (!open) setDetailOpen(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailOpen && (
            <>
              <SheetHeader><SheetTitle>{detailOpen.title}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex gap-2">{detailOpen.artist && <p className="text-sm text-muted-foreground">{detailOpen.artist}</p>}<Badge variant="outline">Key of {detailOpen.key || "C"}</Badge><Badge variant="secondary">{TEMPOS[detailOpen.tempo] || "Medium"}</Badge></div>
                {detailOpen.sections?.map((s: any, i: number) => (
                  <div key={i}>
                    <p className="text-xs font-bold uppercase text-primary mb-1">{s.label || `Section ${i + 1}`}</p>
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed">{s.content}</pre>
                  </div>
                ))}
                {detailOpen.chord_chart && <div><p className="text-xs font-bold uppercase text-primary mb-1">Chord Chart</p><pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-3 rounded-md">{detailOpen.chord_chart}</pre></div>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default SongLibrary;
