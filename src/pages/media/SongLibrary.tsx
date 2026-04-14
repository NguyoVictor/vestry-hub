import { useState, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Music, Plus, Search, Pencil, Trash2, ChevronDown, FileText,
  Youtube, GripVertical, CalendarDays, ListMusic, Eye, Download,
  Upload, X, ExternalLink, Loader2, BookOpen,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const MUSICAL_KEYS = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];

function isValidVideoUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)/.test(url);
}

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

// ── Song Form Dialog ──────────────────────────────────────────────────────────
function SongDialog({ open, onClose, tenantId, editing, onSuccess }: {
  open: boolean; onClose: () => void; tenantId: string;
  editing: any | null; onSuccess: () => void;
}) {
  const chordRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(editing?.title || "");
  const [artist, setArtist] = useState(editing?.artist || "");
  const [key, setKey] = useState(editing?.key || "");
  const [lyrics, setLyrics] = useState(editing?.lyrics || "");
  const [chords, setChords] = useState(editing?.chords || "");
  const [videoUrl, setVideoUrl] = useState(editing?.video_url || "");
  const [videoError, setVideoError] = useState("");
  const [chordFile, setChordFile] = useState<File | null>(null);
  const [chordMode, setChordMode] = useState<"text" | "pdf">(editing?.chord_sheet_path ? "pdf" : "text");
  const [saving, setSaving] = useState(false);

  const handleVideoChange = (v: string) => {
    setVideoUrl(v);
    if (v && !isValidVideoUrl(v)) setVideoError("Must be a valid YouTube or Vimeo URL");
    else setVideoError("");
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (videoUrl && !isValidVideoUrl(videoUrl)) { toast.error("Invalid video URL"); return; }
    setSaving(true);
    try {
      let chordSheetPath = editing?.chord_sheet_path || null;
      if (chordMode === "pdf" && chordFile) {
        const path = `${tenantId}/${Date.now()}-${chordFile.name}`;
        const { error: upErr } = await supabase.storage.from("chord-sheets").upload(path, chordFile);
        if (upErr) throw upErr;
        chordSheetPath = path;
      }
      const payload: any = {
        tenant_id: tenantId,
        title: title.trim(),
        artist: artist.trim() || null,
        key: key || null,
        lyrics: lyrics || null,
        chords: chordMode === "text" ? (chords || null) : null,
        chord_sheet_path: chordMode === "pdf" ? chordSheetPath : null,
        video_url: videoUrl.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (editing?.id) {
        const { error } = await supabase.from(TABLES.SONGS).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.SONGS).insert(payload);
        if (error) throw error;
      }
      toast.success(editing?.id ? "Song updated" : "Song added");
      onSuccess(); onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-indigo-500" />
            {editing?.id ? "Edit Song" : "Add Song"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Title *</Label>
              <Input className="mt-1.5" placeholder="e.g. Amazing Grace" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Artist / Author</Label>
              <Input className="mt-1.5" placeholder="e.g. John Newton" value={artist} onChange={e => setArtist(e.target.value)} />
            </div>
            <div>
              <Label>Key</Label>
              <Select value={key} onValueChange={setKey}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select key..." /></SelectTrigger>
                <SelectContent>{MUSICAL_KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Lyrics</Label>
            <Textarea className="mt-1.5 font-mono text-sm resize-none" rows={8} placeholder="Paste lyrics here..." value={lyrics} onChange={e => setLyrics(e.target.value)} />
          </div>

          <div>
            <Label>Chord Sheet</Label>
            <div className="mt-1.5 flex gap-2 mb-2">
              <Button size="sm" variant={chordMode === "text" ? "default" : "outline"} onClick={() => setChordMode("text")}>Plain Text</Button>
              <Button size="sm" variant={chordMode === "pdf" ? "default" : "outline"} onClick={() => setChordMode("pdf")}>Upload PDF</Button>
            </div>
            {chordMode === "text" ? (
              <Textarea className="font-mono text-sm resize-none" rows={5} placeholder="[Verse 1]&#10;G    D    Em   C&#10;Amazing grace how sweet the sound..." value={chords} onChange={e => setChords(e.target.value)} />
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <input ref={chordRef} type="file" accept="application/pdf" className="hidden" onChange={e => setChordFile(e.target.files?.[0] || null)} />
                <Button variant="outline" size="sm" onClick={() => chordRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />Choose PDF
                </Button>
                {chordFile
                  ? <span className="text-sm text-muted-foreground">{chordFile.name}</span>
                  : editing?.chord_sheet_path
                    ? <span className="text-sm text-emerald-600">PDF already uploaded</span>
                    : <span className="text-sm text-muted-foreground">No file chosen</span>}
              </div>
            )}
          </div>

          <div>
            <Label>Music Video URL</Label>
            <div className="relative mt-1.5">
              <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="https://youtube.com/watch?v=... or vimeo.com/..." value={videoUrl} onChange={e => handleVideoChange(e.target.value)} />
            </div>
            {videoError && <p className="text-xs text-red-500 mt-1">{videoError}</p>}
            <p className="text-xs text-muted-foreground mt-1">Supports YouTube and Vimeo links</p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Song"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Song Detail Panel ─────────────────────────────────────────────────────────
function SongDetail({ song, onEdit, onClose }: { song: any; onEdit: () => void; onClose: () => void }) {
  const embedUrl = song.video_url ? getEmbedUrl(song.video_url) : null;
  const [tab, setTab] = useState<"lyrics" | "chords" | "video">("lyrics");

  const downloadChordSheet = async () => {
    if (!song.chord_sheet_path) return;
    const { data } = await supabase.storage.from("chord-sheets").createSignedUrl(song.chord_sheet_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Could not generate download link");
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-xl">{song.title}</DialogTitle>
              {song.artist && <p className="text-sm text-muted-foreground mt-0.5">{song.artist}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {song.key && <Badge variant="outline" className="font-mono">{song.key}</Badge>}
              <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex gap-2 mt-2">
          <Button size="sm" variant={tab === "lyrics" ? "default" : "outline"} onClick={() => setTab("lyrics")}>
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />Lyrics
          </Button>
          {(song.chords || song.chord_sheet_path) && (
            <Button size="sm" variant={tab === "chords" ? "default" : "outline"} onClick={() => setTab("chords")}>
              <FileText className="h-3.5 w-3.5 mr-1.5" />Chords
            </Button>
          )}
          {song.video_url && (
            <Button size="sm" variant={tab === "video" ? "default" : "outline"} onClick={() => setTab("video")}>
              <Youtube className="h-3.5 w-3.5 mr-1.5" />Video
            </Button>
          )}
        </div>

        <Separator />

        {tab === "lyrics" && (
          <ScrollArea className="h-80">
            {song.lyrics
              ? <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{song.lyrics}</pre>
              : <p className="text-muted-foreground text-sm italic">No lyrics added yet.</p>}
          </ScrollArea>
        )}

        {tab === "chords" && (
          <div>
            {song.chord_sheet_path ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <FileText className="h-12 w-12 text-indigo-400" />
                <p className="text-sm text-muted-foreground">Chord sheet PDF attached</p>
                <Button onClick={downloadChordSheet} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Download className="mr-2 h-4 w-4" />Download Chord Sheet
                </Button>
              </div>
            ) : song.chords ? (
              <ScrollArea className="h-80">
                <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed">{song.chords}</pre>
              </ScrollArea>
            ) : null}
          </div>
        )}

        {tab === "video" && embedUrl && (
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={song.title}
            />
          </div>
        )}
        {tab === "video" && !embedUrl && song.video_url && (
          <div className="flex flex-col items-center gap-3 py-8">
            <ExternalLink className="h-10 w-10 text-muted-foreground/40" />
            <a href={song.video_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline text-sm">{song.video_url}</a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Set List Dialog ───────────────────────────────────────────────────────────
function SetListDialog({ open, onClose, tenantId, songs, editing, onSuccess }: {
  open: boolean; onClose: () => void; tenantId: string;
  songs: any[]; editing: any | null; onSuccess: () => void;
}) {
  const [name, setName] = useState(editing?.name || "");
  const [serviceDate, setServiceDate] = useState(editing?.service_date || "");
  const [notes, setNotes] = useState(editing?.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Service name is required"); return; }
    setSaving(true);
    try {
      const payload = { tenant_id: tenantId, name: name.trim(), service_date: serviceDate || null, notes: notes || null };
      if (editing?.id) {
        const { error } = await supabase.from(TABLES.SET_LISTS).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.SET_LISTS).insert(payload);
        if (error) throw error;
      }
      toast.success(editing?.id ? "Service updated" : "Service created");
      onSuccess(); onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-500" />
            {editing?.id ? "Edit Service" : "New Service"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Service Name *</Label>
            <Input className="mt-1.5" placeholder="e.g. Sunday Morning 20 April" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" className="mt-1.5" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea className="mt-1.5 resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Setlist Detail (with drag-and-drop reorder) ───────────────────────────────
function SetlistDetail({ setList, songs, tenantId, onBack, onRefresh }: {
  setList: any; songs: any[]; tenantId: string; onBack: () => void; onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [addSongId, setAddSongId] = useState("");
  const [keyOverride, setKeyOverride] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const { data: setListSongs = [], isLoading } = useQuery({
    queryKey: ["set-list-songs", setList.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.SET_LIST_SONGS)
        .select("*, songs(id, title, artist, key)")
        .eq("set_list_id", setList.id)
        .order("position");
      if (error) throw error;
      return data || [];
    },
    staleTime: 300_000,
  });

  const addSong = useMutation({
    mutationFn: async () => {
      if (!addSongId) throw new Error("Select a song");
      const nextPos = setListSongs.length + 1;
      const { error } = await supabase.from(TABLES.SET_LIST_SONGS).insert({
        set_list_id: setList.id, song_id: addSongId,
        position: nextPos, key_override: keyOverride || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["set-list-songs", setList.id] });
      setAddSongId(""); setKeyOverride("");
      toast.success("Song added to setlist");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeSong = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.SET_LIST_SONGS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["set-list-songs", setList.id] });
      toast.success("Song removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const reorderSongs = useCallback(async (reordered: any[]) => {
    const updates = reordered.map((s, i) =>
      supabase.from(TABLES.SET_LIST_SONGS).update({ position: i + 1 }).eq("id", s.id)
    );
    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: ["set-list-songs", setList.id] });
  }, [setList.id, queryClient]);

  // Drag handlers
  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIdx(i); };
  const handleDrop = async (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...setListSongs];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(i, 0, moved);
    setDragIdx(null); setDragOverIdx(null);
    await reorderSongs(reordered);
  };

  const assignedIds = new Set(setListSongs.map((s: any) => s.song_id));
  const availableSongs = songs.filter(s => !assignedIds.has(s.id));

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <div>
          <h2 className="text-lg font-semibold">{setList.name}</h2>
          {setList.service_date && (
            <p className="text-sm text-muted-foreground">{format(new Date(setList.service_date), "EEEE, d MMMM yyyy")}</p>
          )}
        </div>
      </div>

      {/* Add song row */}
      <Card className="mb-4 border border-slate-200 dark:border-slate-700 shadow-sm">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Add song to setlist</p>
          <div className="flex flex-wrap gap-2">
            <Select value={addSongId} onValueChange={setAddSongId}>
              <SelectTrigger className="flex-1 min-w-[200px]"><SelectValue placeholder="Select a song..." /></SelectTrigger>
              <SelectContent>
                {availableSongs.length === 0
                  ? <SelectItem value="__none" disabled>All songs already added</SelectItem>
                  : availableSongs.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.title}{s.artist ? ` — ${s.artist}` : ""}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={keyOverride} onValueChange={setKeyOverride}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Key..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Original</SelectItem>
                {MUSICAL_KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => addSong.mutate()}
              disabled={!addSongId || addSong.isPending}
            >
              {addSong.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Setlist */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : setListSongs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ListMusic className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No songs in this setlist yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {setListSongs.map((item: any, i: number) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDrop={e => handleDrop(e, i)}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-grab active:cursor-grabbing
                ${dragOverIdx === i ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"}
              `}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              <span className="text-sm font-mono text-muted-foreground w-5 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{(item.songs as any)?.title}</p>
                {(item.songs as any)?.artist && (
                  <p className="text-xs text-muted-foreground truncate">{(item.songs as any).artist}</p>
                )}
              </div>
              {(item.key_override || (item.songs as any)?.key) && (
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  {item.key_override || (item.songs as any)?.key}
                </Badge>
              )}
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 shrink-0"
                onClick={() => removeSong.mutate(item.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SongLibrary() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState("songs");
  const [search, setSearch] = useState("");
  const [keyFilter, setKeyFilter] = useState("all");

  // Song state
  const [songDialogOpen, setSongDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<any>(null);
  const [viewingSong, setViewingSong] = useState<any>(null);
  const [deleteSongTarget, setDeleteSongTarget] = useState<any>(null);

  // Set list state
  const [setListDialogOpen, setSetListDialogOpen] = useState(false);
  const [editingSetList, setEditingSetList] = useState<any>(null);
  const [viewingSetList, setViewingSetList] = useState<any>(null);
  const [deleteSetListTarget, setDeleteSetListTarget] = useState<any>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: songs = [], isLoading: loadingSongs } = useQuery({
    queryKey: ["songs", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("title");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });

  const { data: setLists = [], isLoading: loadingSetLists } = useQuery({
    queryKey: ["set-lists", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.SET_LISTS)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("service_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const deleteSong = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.SONGS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs", tenantId] });
      toast.success("Song deleted");
      setDeleteSongTarget(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteSetList = useMutation({
    mutationFn: async (id: string) => {
      // Remove songs first
      await supabase.from(TABLES.SET_LIST_SONGS).delete().eq("set_list_id", id);
      const { error } = await supabase.from(TABLES.SET_LISTS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["set-lists", tenantId] });
      toast.success("Service deleted");
      setDeleteSetListTarget(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const invalidateSongs = () => queryClient.invalidateQueries({ queryKey: ["songs", tenantId] });
  const invalidateSetLists = () => queryClient.invalidateQueries({ queryKey: ["set-lists", tenantId] });

  // ── Filtered songs ────────────────────────────────────────────────────────
  const filteredSongs = songs.filter((s: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.title?.toLowerCase().includes(q) || s.artist?.toLowerCase().includes(q);
    const matchKey = keyFilter === "all" || s.key === keyFilter;
    return matchSearch && matchKey;
  });

  // If viewing a setlist detail, render that instead of the tab content
  if (viewingSetList) {
    return (
      <>
        <Helmet><title>Song Library — Vestry</title></Helmet>
        <PageHeader title="Song Library" subtitle="Manage songs, chord sheets, and service setlists" />
        <SetlistDetail
          setList={viewingSetList}
          songs={songs}
          tenantId={tenantId!}
          onBack={() => setViewingSetList(null)}
          onRefresh={invalidateSetLists}
        />
      </>
    );
  }

  return (
    <>
      <Helmet><title>Song Library — Vestry</title></Helmet>

      <PageHeader
        title="Song Library"
        subtitle="Manage songs, chord sheets, and service setlists"
        action={
          tab === "songs" ? (
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setEditingSong(null); setSongDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />Add Song
            </Button>
          ) : (
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setEditingSetList(null); setSetListDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />New Service
            </Button>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Songs", value: songs.length, icon: Music, color: "bg-indigo-100 text-indigo-600" },
          { label: "With Lyrics", value: songs.filter((s: any) => s.lyrics).length, icon: BookOpen, color: "bg-emerald-100 text-emerald-600" },
          { label: "With Chords", value: songs.filter((s: any) => s.chords || s.chord_sheet_path).length, icon: FileText, color: "bg-amber-100 text-amber-600" },
          { label: "Services", value: setLists.length, icon: CalendarDays, color: "bg-purple-100 text-purple-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="songs"><Music className="h-4 w-4 mr-1.5" />Songs</TabsTrigger>
          <TabsTrigger value="services"><CalendarDays className="h-4 w-4 mr-1.5" />Service Planning</TabsTrigger>
        </TabsList>

        {/* ── Songs Tab ── */}
        <TabsContent value="songs">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by title or artist..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={keyFilter} onValueChange={setKeyFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Key" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Keys</SelectItem>
                {MUSICAL_KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loadingSongs ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
          ) : filteredSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Music className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">No songs found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Add your first song to get started</p>
              <Button size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setEditingSong(null); setSongDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />Add Song
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Artist</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Key</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Extras</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredSongs.map((song: any) => (
                    <tr key={song.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          className="font-medium text-left hover:text-indigo-600 transition-colors"
                          onClick={() => setViewingSong(song)}
                        >
                          {song.title}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{song.artist || "—"}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {song.key ? <Badge variant="outline" className="font-mono text-xs">{song.key}</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex gap-1.5">
                          {song.lyrics && <Badge variant="secondary" className="text-xs">Lyrics</Badge>}
                          {(song.chords || song.chord_sheet_path) && <Badge variant="secondary" className="text-xs">Chords</Badge>}
                          {song.video_url && <Badge variant="secondary" className="text-xs"><Youtube className="h-3 w-3 mr-1" />Video</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingSong(song)}>
                              <Eye className="mr-2 h-4 w-4" />View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingSong(song); setSongDialogOpen(true); }}>
                              <Pencil className="mr-2 h-4 w-4" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteSongTarget(song)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Services Tab ── */}
        <TabsContent value="services">
          {loadingSetLists ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
          ) : setLists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">No services yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Create a service to start building setlists</p>
              <Button size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setEditingSetList(null); setSetListDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />New Service
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {setLists.map((sl: any) => (
                <Card key={sl.id} className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewingSetList(sl)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{sl.name}</p>
                        {sl.service_date && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {format(new Date(sl.service_date), "EEEE, d MMM yyyy")}
                          </p>
                        )}
                        {sl.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sl.notes}</p>}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); setViewingSetList(sl); }}>
                            <ListMusic className="mr-2 h-4 w-4" />View Setlist
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); setEditingSetList(sl); setSetListDialogOpen(true); }}>
                            <Pencil className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); setDeleteSetListTarget(sl); }} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <ListMusic className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Click to manage setlist</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <SongDialog
        open={songDialogOpen}
        onClose={() => { setSongDialogOpen(false); setEditingSong(null); }}
        tenantId={tenantId!}
        editing={editingSong}
        onSuccess={invalidateSongs}
      />

      <SetListDialog
        open={setListDialogOpen}
        onClose={() => { setSetListDialogOpen(false); setEditingSetList(null); }}
        tenantId={tenantId!}
        songs={songs}
        editing={editingSetList}
        onSuccess={invalidateSetLists}
      />

      {viewingSong && (
        <SongDetail
          song={viewingSong}
          onEdit={() => { setEditingSong(viewingSong); setViewingSong(null); setSongDialogOpen(true); }}
          onClose={() => setViewingSong(null)}
        />
      )}

      {/* Delete song confirm */}
      <AlertDialog open={!!deleteSongTarget} onOpenChange={v => { if (!v) setDeleteSongTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Song</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteSongTarget?.title}</strong>? This will also remove it from any setlists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteSongTarget && deleteSong.mutate(deleteSongTarget.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete setlist confirm */}
      <AlertDialog open={!!deleteSetListTarget} onOpenChange={v => { if (!v) setDeleteSetListTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteSetListTarget?.name}</strong> and its entire setlist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteSetListTarget && deleteSetList.mutate(deleteSetListTarget.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
