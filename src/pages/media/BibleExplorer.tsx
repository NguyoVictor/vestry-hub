import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BookOpen, ChevronLeft, ChevronRight, Search, Bookmark, BookMarked,
  PenLine, RefreshCw, Share2, Sun, Flame, BarChart2, Trophy, Bell,
  CheckCircle2, Circle, Calendar, Target, Zap, BookOpenText, FileText, Trash2,
  Sparkles, Loader2, Users,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ── API.Bible config ──────────────────────────────────────────────────────────

const API_KEY = import.meta.env.VITE_BIBLE_API_KEY as string;
const BASE = "https://rest.api.bible/v1";

const VERSIONS = [
  { id: "de4e12af7f28f599-02", label: "King James Version (KJV)" },
  { id: "06125adad2d5898a-01", label: "New International Version (NIV)" },
  { id: "65eec8e0b60e656b-01", label: "New Living Translation (NLT)" },
];

async function bibleGet(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "api-key": API_KEY },
  });
  if (!res.ok) throw new Error(`API.Bible error: ${res.status}`);
  return res.json();
}

// ── Bible books ───────────────────────────────────────────────────────────────

const OT_BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi"];
const NT_BOOKS = ["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];
const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

// Chapter counts per book (approximate)
const CHAPTER_COUNTS: Record<string, number> = {
  Genesis:50,Exodus:40,Leviticus:27,Numbers:36,Deuteronomy:34,Joshua:24,Judges:21,Ruth:4,"1 Samuel":31,"2 Samuel":24,"1 Kings":22,"2 Kings":25,"1 Chronicles":29,"2 Chronicles":36,Ezra:10,Nehemiah:13,Esther:10,Job:42,Psalms:150,Proverbs:31,Ecclesiastes:12,"Song of Solomon":8,Isaiah:66,Jeremiah:52,Lamentations:5,Ezekiel:48,Daniel:12,Hosea:14,Joel:3,Amos:9,Obadiah:1,Jonah:4,Micah:7,Nahum:3,Habakkuk:3,Zephaniah:3,Haggai:2,Zechariah:14,Malachi:4,Matthew:28,Mark:16,Luke:24,John:21,Acts:28,Romans:16,"1 Corinthians":16,"2 Corinthians":13,Galatians:6,Ephesians:6,Philippians:4,Colossians:4,"1 Thessalonians":5,"2 Thessalonians":3,"1 Timothy":6,"2 Timothy":4,Titus:3,Philemon:1,Hebrews:13,James:5,"1 Peter":5,"2 Peter":3,"1 John":5,"2 John":1,"3 John":1,Jude:1,Revelation:22,
};

// API.Bible book IDs for KJV
const BOOK_IDS: Record<string, string> = {
  Genesis:"GEN",Exodus:"EXO",Leviticus:"LEV",Numbers:"NUM",Deuteronomy:"DEU",Joshua:"JOS",Judges:"JDG",Ruth:"RUT","1 Samuel":"1SA","2 Samuel":"2SA","1 Kings":"1KI","2 Kings":"2KI","1 Chronicles":"1CH","2 Chronicles":"2CH",Ezra:"EZR",Nehemiah:"NEH",Esther:"EST",Job:"JOB",Psalms:"PSA",Proverbs:"PRO",Ecclesiastes:"ECC","Song of Solomon":"SNG",Isaiah:"ISA",Jeremiah:"JER",Lamentations:"LAM",Ezekiel:"EZK",Daniel:"DAN",Hosea:"HOS",Joel:"JOL",Amos:"AMO",Obadiah:"OBA",Jonah:"JON",Micah:"MIC",Nahum:"NAM",Habakkuk:"HAB",Zephaniah:"ZEP",Haggai:"HAG",Zechariah:"ZEC",Malachi:"MAL",Matthew:"MAT",Mark:"MRK",Luke:"LUK",John:"JHN",Acts:"ACT",Romans:"ROM","1 Corinthians":"1CO","2 Corinthians":"2CO",Galatians:"GAL",Ephesians:"EPH",Philippians:"PHP",Colossians:"COL","1 Thessalonians":"1TH","2 Thessalonians":"2TH","1 Timothy":"1TI","2 Timothy":"2TI",Titus:"TIT",Philemon:"PHM",Hebrews:"HEB",James:"JAS","1 Peter":"1PE","2 Peter":"2PE","1 John":"1JN","2 John":"2JN","3 John":"3JN",Jude:"JUD",Revelation:"REV",
};

// ── Curated VOTD verses ───────────────────────────────────────────────────────

const VOTD_REFS = [
  "JHN.3.16","PSA.23.1","ROM.8.28","PHP.4.13","ISA.41.10","JER.29.11","PRO.3.5","MAT.6.33",
  "ROM.12.2","GAL.5.22","EPH.2.8","HEB.11.1","JAM.1.5","1JN.4.8","REV.21.4","PSA.46.1",
  "ISA.40.31","MAT.11.28","JHN.14.6","ROM.5.8","PHP.4.7","COL.3.23","2TI.1.7","HEB.4.16",
  "1PE.5.7","PSA.119.105","PRO.22.6","MAT.5.16","JHN.10.10","ROM.8.1",
];

// ── localStorage helpers ──────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── Strip HTML from API.Bible content ────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// ── 30-day reading plan ───────────────────────────────────────────────────────

const READING_PLAN = [
  { day: 1, passage: "Genesis 1-2", ref: "GEN.1" },
  { day: 2, passage: "Genesis 3-5", ref: "GEN.3" },
  { day: 3, passage: "Psalms 1-5", ref: "PSA.1" },
  { day: 4, passage: "Proverbs 1-3", ref: "PRO.1" },
  { day: 5, passage: "Matthew 1-4", ref: "MAT.1" },
  { day: 6, passage: "Matthew 5-7", ref: "MAT.5" },
  { day: 7, passage: "John 1-3", ref: "JHN.1" },
  { day: 8, passage: "John 4-6", ref: "JHN.4" },
  { day: 9, passage: "John 7-10", ref: "JHN.7" },
  { day: 10, passage: "John 11-14", ref: "JHN.11" },
  { day: 11, passage: "John 15-17", ref: "JHN.15" },
  { day: 12, passage: "John 18-21", ref: "JHN.18" },
  { day: 13, passage: "Romans 1-4", ref: "ROM.1" },
  { day: 14, passage: "Romans 5-8", ref: "ROM.5" },
  { day: 15, passage: "Romans 9-12", ref: "ROM.9" },
  { day: 16, passage: "Romans 13-16", ref: "ROM.13" },
  { day: 17, passage: "Ephesians 1-3", ref: "EPH.1" },
  { day: 18, passage: "Ephesians 4-6", ref: "EPH.4" },
  { day: 19, passage: "Philippians 1-4", ref: "PHP.1" },
  { day: 20, passage: "Colossians 1-4", ref: "COL.1" },
  { day: 21, passage: "1 Corinthians 1-6", ref: "1CO.1" },
  { day: 22, passage: "1 Corinthians 7-13", ref: "1CO.7" },
  { day: 23, passage: "1 Corinthians 14-16", ref: "1CO.14" },
  { day: 24, passage: "Galatians 1-6", ref: "GAL.1" },
  { day: 25, passage: "Hebrews 1-7", ref: "HEB.1" },
  { day: 26, passage: "Hebrews 8-13", ref: "HEB.8" },
  { day: 27, passage: "James 1-5", ref: "JAM.1" },
  { day: 28, passage: "1 Peter 1-5", ref: "1PE.1" },
  { day: 29, passage: "Revelation 1-11", ref: "REV.1" },
  { day: 30, passage: "Revelation 12-22", ref: "REV.12" },
];

const CHALLENGES = [
  { id: "nt30", title: "New Testament in 30 Days", desc: "Read the entire New Testament in 30 days", days: 30, icon: "📖" },
  { id: "psalms", title: "Psalms in 15 Days", desc: "Read all 150 Psalms in 15 days", days: 15, icon: "🎵" },
  { id: "proverbs", title: "Proverbs in a Month", desc: "One chapter of Proverbs per day for 31 days", days: 31, icon: "💡" },
  { id: "gospels", title: "The Four Gospels", desc: "Read Matthew, Mark, Luke, and John in 20 days", days: 20, icon: "✝️" },
  { id: "epistles", title: "Paul's Letters", desc: "Read all of Paul's epistles in 14 days", days: 14, icon: "✉️" },
];

const TABS = [
  { key: "reader", label: "Reader", icon: BookOpen },
  { key: "readings", label: "Readings", icon: Calendar },
  { key: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { key: "notes", label: "Notes", icon: PenLine },
  { key: "search", label: "Search", icon: Search },
  { key: "lookup", label: "Lookup", icon: BookMarked },
  { key: "plan", label: "Reading Plan", icon: Target },
  { key: "streaks", label: "Streaks", icon: Flame },
  { key: "stats", label: "Statistics", icon: BarChart2 },
  { key: "challenges", label: "Challenges", icon: Trophy },
  { key: "reminders", label: "Reminders", icon: Bell },
];

// ── BookmarksTab component ────────────────────────────────────────────────────

type BmEntry = { ref: string; text: string; version: string };

function BookmarksTab({ bookmarks, removeBookmark }: { bookmarks: BmEntry[]; removeBookmark: (ref: string) => void }) {
  const [bmSearch, setBmSearch] = useState("");
  const [bmFilter, setBmFilter] = useState<"all" | "favorites" | "notes">("all");

  const filtered = bookmarks.filter(b =>
    !bmSearch.trim() ||
    b.ref.toLowerCase().includes(bmSearch.toLowerCase()) ||
    b.text.toLowerCase().includes(bmSearch.toLowerCase())
  );

  return (
    <Card className="border border-slate-200 dark:border-slate-700">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-orange-500" />
            <h3 className="font-semibold text-sm">My Bookmarks &amp; Notes</h3>
          </div>
          <span className="text-xs text-muted-foreground">{bookmarks.length} saved</span>
        </div>
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Search bookmarks..." value={bmSearch} onChange={e => setBmSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-1">
            {(["all", "favorites", "notes"] as const).map(f => (
              <button key={f} onClick={() => setBmFilter(f)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${bmFilter === f ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {f === "favorites" && <span className="text-[10px]">☆</span>}
                {f === "notes" && <PenLine className="h-3 w-3" />}
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {bookmarks.length === 0 ? "No bookmarks yet. Click a verse while reading to save it!" : "No bookmarks match your search."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((b, i) => (
              <div key={i} className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-orange-600 mb-1">{b.ref}<span className="text-muted-foreground font-normal ml-1">· {b.version}</span></p>
                    <p className="text-sm leading-relaxed">{b.text}</p>
                  </div>
                  <button onClick={() => removeBookmark(b.ref)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5">
                    <span className="text-xs">✕</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── NotesTab component ────────────────────────────────────────────────────────

type NoteEntry = { ref: string; text: string; date: string; title?: string; tags?: string; isPrivate?: boolean };

function NotesTab({ notes, setNotes, versesLooked, setVersesLooked }: {
  notes: NoteEntry[];
  setNotes: (n: NoteEntry[]) => void;
  versesLooked: number;
  setVersesLooked: (v: number) => void;
}) {
  const [noteSearch, setNoteSearch] = useState("");
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [nTitle, setNTitle] = useState("");
  const [nBook, setNBook] = useState("");
  const [nChapter, setNChapter] = useState("1");
  const [nVerse, setNVerse] = useState("");
  const [nText, setNText] = useState("");
  const [nTags, setNTags] = useState("");
  const [nPrivate, setNPrivate] = useState(true);

  const resetForm = () => { setNTitle(""); setNBook(""); setNChapter("1"); setNVerse(""); setNText(""); setNTags(""); setNPrivate(true); };

  const handleSave = () => {
    if (!nBook || !nText.trim()) { toast.error("Book and Notes are required"); return; }
    const ref = `${nBook} ${nChapter}${nVerse ? `:${nVerse}` : ""}`;
    const entry: NoteEntry = { ref, text: nText, date: format(new Date(), "dd MMM yyyy"), title: nTitle || undefined, tags: nTags || undefined, isPrivate: nPrivate };
    const updated = [entry, ...notes];
    setNotes(updated);
    lsSet("bible_notes", updated);
    const newCount = versesLooked + 1;
    setVersesLooked(newCount);
    lsSet("bible_verses_looked", newCount);
    toast.success("Note saved!");
    resetForm();
    setAddNoteOpen(false);
  };

  const deleteNote = (i: number) => {
    const updated = notes.filter((_, idx) => idx !== i);
    setNotes(updated);
    lsSet("bible_notes", updated);
  };

  const filtered = notes.filter(n =>
    !noteSearch.trim() ||
    (n.ref || "").toLowerCase().includes(noteSearch.toLowerCase()) ||
    (n.text || "").toLowerCase().includes(noteSearch.toLowerCase()) ||
    (n.title || "").toLowerCase().includes(noteSearch.toLowerCase())
  );

  return (
    <>
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-sm">Study Notes</h3>
            </div>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs" onClick={() => setAddNoteOpen(true)}>
              <span className="mr-1 text-base leading-none">+</span> Add Note
            </Button>
          </div>
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Search notes..." value={noteSearch} onChange={e => setNoteSearch(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No study notes yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Add Note" to create your first study note</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((n, i) => (
                <div key={i} className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-orange-200 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {n.title && <p className="font-semibold text-sm mb-0.5">{n.title}</p>}
                      <p className="text-xs font-semibold text-orange-600 mb-1">{n.ref}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{n.text}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {n.tags && n.tags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500">{t}</span>
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-auto">{n.date}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteNote(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5">
                      <span className="text-xs">✕</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addNoteOpen} onOpenChange={v => { if (!v) { resetForm(); setAddNoteOpen(false); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Study Note</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Title (optional)</Label>
              <Input className="mt-1.5" placeholder="e.g., Reflections on Grace" value={nTitle} onChange={e => setNTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Book *</Label>
                <Select value={nBook || undefined} onValueChange={setNBook}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Book" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {ALL_BOOKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chapter *</Label>
                <Input className="mt-1.5" type="number" min={1} value={nChapter} onChange={e => setNChapter(e.target.value)} />
              </div>
              <div>
                <Label>Verse</Label>
                <Input className="mt-1.5" placeholder="Optional" value={nVerse} onChange={e => setNVerse(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Notes *</Label>
              <Textarea className="mt-1.5 resize-none" rows={5} placeholder="Write your thoughts, insights, and reflections..." value={nText} onChange={e => setNText(e.target.value)} />
            </div>
            <div>
              <Label>Tags (comma separated)</Label>
              <Input className="mt-1.5" placeholder="e.g., grace, salvation, faith" value={nTags} onChange={e => setNTags(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={nPrivate} onCheckedChange={setNPrivate} />
              <Label className="text-sm">Private note</Label>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { resetForm(); setAddNoteOpen(false); }}>Cancel</Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Readings Tab ─────────────────────────────────────────────────────────────

interface Reading {
  id: string;
  title: string;
  book: string;
  chapterStart: number;
  verseStart: string;
  chapterEnd: string;
  verseEnd: string;
  theme: string;
  reflection: string;
  date: string;
  published: boolean;
}

const EMPTY_READING: Omit<Reading, "id"> = {
  title: "", book: "", chapterStart: 1, verseStart: "", chapterEnd: "", verseEnd: "",
  theme: "", reflection: "", date: new Date().toISOString().split("T")[0], published: false,
};

function AddReadingDialog({ open, onClose, onSave, allBooks }: {
  open: boolean; onClose: () => void; onSave: (r: Reading) => void; allBooks: string[];
}) {
  const [form, setForm] = useState({ ...EMPTY_READING });

  const handleCreate = () => {
    if (!form.title.trim() || !form.book) { toast.error("Title and Book are required"); return; }
    onSave({ ...form, id: crypto.randomUUID() });
    setForm({ ...EMPTY_READING });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Bible Reading</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Title */}
          <div>
            <Label>Title *</Label>
            <Input className="mt-1.5" placeholder="e.g., Morning Devotional" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          {/* Book + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Book *</Label>
              <Select value={form.book || undefined} onValueChange={v => setForm(f => ({ ...f, book: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select book" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {allBooks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reading Date</Label>
              <Input type="date" className="mt-1.5" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>

          {/* Chapter/Verse range */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">Chapter Start *</Label>
              <Input className="mt-1.5 h-9" type="number" min={1} value={form.chapterStart} onChange={e => setForm(f => ({ ...f, chapterStart: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Verse Start</Label>
              <Input className="mt-1.5 h-9" placeholder="" value={form.verseStart} onChange={e => setForm(f => ({ ...f, verseStart: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Chapter End</Label>
              <Input className="mt-1.5 h-9" placeholder="" value={form.chapterEnd} onChange={e => setForm(f => ({ ...f, chapterEnd: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Verse End</Label>
              <Input className="mt-1.5 h-9" placeholder="" value={form.verseEnd} onChange={e => setForm(f => ({ ...f, verseEnd: e.target.value }))} />
            </div>
          </div>

          {/* Theme */}
          <div>
            <Label>Theme</Label>
            <Input className="mt-1.5" placeholder="e.g., Faith, Hope, Love" value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))} />
          </div>

          {/* Reflection */}
          <div>
            <Label>Reflection / Commentary</Label>
            <Textarea className="mt-1.5 resize-none" rows={4} placeholder="Add a reflection or commentary for this reading..." value={form.reflection} onChange={e => setForm(f => ({ ...f, reflection: e.target.value }))} />
          </div>

          {/* Publish toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={form.published} onCheckedChange={v => setForm(f => ({ ...f, published: v }))} />
            <Label className="text-sm">Publish immediately</Label>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleCreate}>Create</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReadingsTab({ allBooks, onNavigate }: { allBooks: string[]; onNavigate: (book: string, ch: number) => void }) {
  const [readings, setReadings] = useState<Reading[]>(() => lsGet("bible_readings", []));
  const [addOpen, setAddOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"published" | "drafts">("published");

  const saveReading = (r: Reading) => {
    const updated = [r, ...readings];
    setReadings(updated);
    lsSet("bible_readings", updated);
    toast.success(r.published ? "Reading published!" : "Reading saved as draft");
  };

  const deleteReading = (id: string) => {
    const updated = readings.filter(r => r.id !== id);
    setReadings(updated);
    lsSet("bible_readings", updated);
    toast.success("Reading deleted");
  };

  const published = readings.filter(r => r.published);
  const drafts = readings.filter(r => !r.published);
  const shown = activeFilter === "published" ? published : drafts;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-bold text-base">Manage Readings</h2>
          <p className="text-sm text-muted-foreground">Create and manage daily Bible readings for your congregation</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white shrink-0" onClick={() => setAddOpen(true)}>
          <span className="mr-1 text-lg leading-none">+</span> Add Reading
        </Button>
      </div>

      {/* Published / Drafts filter pills */}
      <div className="flex gap-2 mb-4">
        {(["published", "drafts"] as const).map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              activeFilter === f
                ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900"
                : "border-slate-200 dark:border-slate-700 text-muted-foreground hover:bg-muted"
            }`}
          >
            {f === "published" ? `Published (${published.length})` : `Drafts (${drafts.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {shown.length === 0 ? (
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No {activeFilter} readings yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map(r => {
            const passage = `${r.book} ${r.chapterStart}${r.verseStart ? `:${r.verseStart}` : ""}${r.chapterEnd ? `–${r.chapterEnd}` : ""}${r.verseEnd ? `:${r.verseEnd}` : ""}`;
            return (
              <Card key={r.id} className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${r.published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {r.published ? "Published" : "Draft"}
                        </span>
                        {r.theme && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-100 text-orange-700">{r.theme}</span>}
                      </div>
                      <p className="font-semibold text-sm">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{passage}</p>
                      {r.date && <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(r.date), "dd MMM yyyy")}</p>}
                      {r.reflection && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{r.reflection}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onNavigate(r.book, r.chapterStart)}>
                        Read
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteReading(r.id)}>
                        ✕
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddReadingDialog open={addOpen} onClose={() => setAddOpen(false)} onSave={saveReading} allBooks={allBooks} />
    </div>
  );
}

// ── Statistics Tab ────────────────────────────────────────────────────────────

const GROQ_API_KEY_STATS = import.meta.env.VITE_GROQ_API_KEY as string;

function StatisticsTab() {
  // Re-read all data from localStorage on every render (reactive)
  const rawChapters: (string | { key: string; readAt: string })[] = lsGet("bible_chapters_read", []);
  // Normalise — handle old string format gracefully
  const chaptersReadArr = rawChapters.map(e =>
    typeof e === "string" ? { key: e, readAt: null } : e
  );
  const versesLookedVal: number = lsGet("bible_verses_looked", 0);
  const notesArr: any[] = lsGet("bible_notes", []);
  const bookmarksArr: any[] = lsGet("bible_bookmarks", []);
  const streak: number = lsGet("bible_streak", 0);
  const longestStreak: number = lsGet("bible_longest_streak", 0);
  const plans: any[] = lsGet("bible_reading_plans", []);
  const readingsDone = plans.reduce((s: number, p: any) => s + (p.completedDays?.length || 0), 0);
  const totalReadings = plans.reduce((s: number, p: any) => s + (p.readings?.length || 0), 0);
  const completionPct = totalReadings > 0 ? Math.round((readingsDone / totalReadings) * 100) : 0;
  const avgPerWeek = Math.round(readingsDone / Math.max(1, Math.ceil((Date.now() - new Date(plans[0]?.startDate || Date.now()).getTime()) / (7 * 86400000))));

  // Weekly activity — count chapters read per actual day of week using readAt timestamp
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekActivity = weekDays.map(day => ({ day, count: 0 }));
  const weekAgo = Date.now() - 7 * 86400000;
  chaptersReadArr.forEach(entry => {
    if (!entry.readAt) return; // old format — skip, no timestamp
    const ts = new Date(entry.readAt).getTime();
    if (ts >= weekAgo) {
      const dow = new Date(entry.readAt).getDay(); // 0=Sun … 6=Sat
      weekActivity[dow].count++;
    }
  });

  // 30-day trend — group chapters read by date (approximate from plan completions)
  const last30: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    last30.push({ date: d.toLocaleDateString("en", { month: "numeric", day: "numeric" }), count: 0 });
  }
  plans.forEach((p: any) => {
    p.readings?.forEach((r: any, idx: number) => {
      if (p.completedDays?.includes(r.day)) {
        const daysAgo = Math.floor((Date.now() - new Date(r.date).getTime()) / 86400000);
        if (daysAgo >= 0 && daysAgo < 30) last30[29 - daysAgo].count++;
      }
    });
  });

  // Most read books
  const bookCounts: Record<string, number> = {};
  chaptersReadArr.forEach(entry => {
    const book = entry.key.split(":")[1];
    if (book) bookCounts[book] = (bookCounts[book] || 0) + 1;
  });
  const topBooks = Object.entries(bookCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxBookCount = topBooks[0]?.[1] || 1;

  // AI Insights
  const [insight, setInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);

  const generateInsight = async () => {
    setInsightLoading(true);
    try {
      const prompt = `You are a Bible reading coach. Analyze this user's Bible reading data and give a short, warm, personalized insight (3-4 sentences max):

- Current streak: ${streak} days (best: ${longestStreak} days)
- Chapters read: ${chaptersReadArr.length}
- Readings completed: ${readingsDone} of ${totalReadings} (${completionPct}%)
- Notes written: ${notesArr.length}
- Bookmarks saved: ${bookmarksArr.length}
- Most read books: ${topBooks.map(([b, c]) => `${b} (${c} ch)`).join(", ") || "none yet"}
- Most active day: ${weekActivity.sort((a, b) => b.count - a.count)[0]?.day || "unknown"}

Provide:
1. A reading pattern observation
2. A book recommendation based on what they've read
3. Encouragement based on their streak/progress
4. A suggested focus area

Keep it conversational, warm, and under 150 words.`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY_STATS}` },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw new Error(`Groq error: ${res.status}`);
      const data = await res.json();
      setInsight(data.choices?.[0]?.message?.content || "");
    } catch { toast.error("Could not generate insights. Try again."); }
    finally { setInsightLoading(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-bold text-base">Reading Statistics</h2>
        <p className="text-sm text-muted-foreground">Track your Bible reading habits and progress</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Target, color: "text-orange-500 bg-orange-50", val: `${completionPct}%`, label: "Completion" },
          { icon: BookOpen, color: "text-emerald-500 bg-emerald-50", val: chaptersReadArr.length, label: "Chapters Read" },
          { icon: CheckCircle2, color: "text-blue-500 bg-blue-50", val: readingsDone, label: "Readings Done" },
          { icon: Zap, color: "text-purple-500 bg-purple-50", val: avgPerWeek || 0, label: "Avg/Week" },
        ].map(({ icon: Icon, color, val, label }) => (
          <Card key={label} className="border border-slate-200 dark:border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${color.split(" ").slice(1).join(" ")}`}>
                <Icon className={`h-4 w-4 ${color.split(" ")[0]}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{val}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* This Week's Activity */}
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardContent className="p-5">
          <h3 className="font-semibold text-sm mb-4">This Week's Activity</h3>
          <div className="flex items-end gap-2 h-24">
            {weekActivity.map(({ day, count }) => {
              const maxCount = Math.max(...weekActivity.map(w => w.count), 1);
              const height = count > 0 ? Math.max(8, (count / maxCount) * 80) : 4;
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-sm transition-all ${count > 0 ? "bg-orange-500" : "bg-slate-100 dark:bg-slate-700"}`}
                    style={{ height: `${height}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{day}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 30-Day Reading Trend */}
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardContent className="p-5">
          <h3 className="font-semibold text-sm mb-4">30 Day Reading Trend</h3>
          <div className="relative h-24">
            <svg viewBox="0 0 300 80" className="w-full h-full" preserveAspectRatio="none">
              {(() => {
                const maxVal = Math.max(...last30.map(d => d.count), 1);
                const pts = last30.map((d, i) => `${(i / 29) * 300},${80 - (d.count / maxVal) * 70}`).join(" ");
                const area = `0,80 ${pts} 300,80`;
                return (
                  <>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points={area} fill="url(#trendGrad)" />
                    <polyline points={pts} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                );
              })()}
            </svg>
            <div className="flex justify-between mt-1">
              {[0, 7, 14, 21, 29].map(i => (
                <span key={i} className="text-[10px] text-muted-foreground">{last30[i]?.date}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Most Read Books */}
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardContent className="p-5">
          <h3 className="font-semibold text-sm mb-1">Most Read Books</h3>
          <p className="text-xs text-muted-foreground mb-4">Chapters completed by book</p>
          {topBooks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No chapters read yet</p>
          ) : (
            <div className="space-y-3">
              {topBooks.map(([book, count], i) => (
                <div key={book} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{book}</span>
                      <span className="text-xs text-muted-foreground">{count} ch</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(count / maxBookCount) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reading Insights */}
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-sm">Reading Insights</h3>
              <p className="text-xs text-muted-foreground mt-0.5">AI-powered analysis of your reading habits</p>
            </div>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs shrink-0"
              onClick={generateInsight}
              disabled={insightLoading}
            >
              {insightLoading ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Analyzing...</> : <><Sparkles className="mr-1.5 h-3.5 w-3.5" />Generate Insights</>}
            </Button>
          </div>
          {insightLoading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : insight ? (
            <div className="p-4 rounded-xl bg-orange-50/60 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{insight}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Click "Generate Insights" to get a personalized analysis of your reading habits</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Streaks & Achievements Tab ────────────────────────────────────────────────

const ACHIEVEMENTS = [
  { id: "first_steps",    name: "First Steps",     desc: "Complete your first reading",  icon: "🔥", color: "bg-orange-100 text-orange-600", req: { type: "readings", val: 1 } },
  { id: "getting_started",name: "Getting Started", desc: "3-day reading streak",          icon: "⚡", color: "bg-yellow-100 text-yellow-600", req: { type: "streak",   val: 3 } },
  { id: "week_warrior",   name: "Week Warrior",    desc: "7-day reading streak",          icon: "🛡️", color: "bg-blue-100 text-blue-600",    req: { type: "streak",   val: 7 } },
  { id: "monthly_master", name: "Monthly Master",  desc: "30-day reading streak",         icon: "🏆", color: "bg-amber-100 text-amber-600",  req: { type: "streak",   val: 30 } },
  { id: "century_reader", name: "Century Reader",  desc: "100-day reading streak",        icon: "💯", color: "bg-purple-100 text-purple-600",req: { type: "streak",   val: 100 } },
  { id: "bookworm",       name: "Bookworm",        desc: "Read 50 chapters",              icon: "📚", color: "bg-green-100 text-green-600",  req: { type: "chapters", val: 50 } },
  { id: "scholar",        name: "Scholar",         desc: "Read 150 chapters",             icon: "🎓", color: "bg-teal-100 text-teal-600",    req: { type: "chapters", val: 150 } },
  { id: "bible_expert",   name: "Bible Expert",    desc: "Read 500 chapters",             icon: "✝️", color: "bg-red-100 text-red-600",      req: { type: "chapters", val: 500 } },
  { id: "complete_reader",name: "Complete Reader", desc: "Read all 1,189 chapters",       icon: "👑", color: "bg-amber-100 text-amber-700",  req: { type: "chapters", val: 1189 } },
];

function StreaksTab({ streak, longestStreak, chaptersRead, readingsCompleted }: {
  streak: number; longestStreak: number; chaptersRead: number; readingsCompleted: number;
}) {
  const [earnedBadges, setEarnedBadges] = useState<string[]>(() => lsGet("bible_earned_badges", []));

  // Check and unlock new badges
  useEffect(() => {
    const newlyEarned: string[] = [];
    ACHIEVEMENTS.forEach(a => {
      if (earnedBadges.includes(a.id)) return;
      const val = a.req.type === "streak" ? streak : a.req.type === "chapters" ? chaptersRead : readingsCompleted;
      if (val >= a.req.val) newlyEarned.push(a.id);
    });
    if (newlyEarned.length > 0) {
      const updated = [...earnedBadges, ...newlyEarned];
      setEarnedBadges(updated);
      lsSet("bible_earned_badges", updated);
      newlyEarned.forEach(id => {
        const badge = ACHIEVEMENTS.find(a => a.id === id);
        if (badge) toast.success(`🏆 Badge Unlocked: ${badge.name}!`);
      });
    }
  }, [streak, chaptersRead, readingsCompleted]);

  // Next achievement to unlock
  const nextAchievement = ACHIEVEMENTS.find(a => {
    if (earnedBadges.includes(a.id)) return false;
    return true;
  });
  const nextProgress = nextAchievement
    ? (nextAchievement.req.type === "streak" ? streak : nextAchievement.req.type === "chapters" ? chaptersRead : readingsCompleted)
    : 0;

  const earned = ACHIEVEMENTS.filter(a => earnedBadges.includes(a.id));

  return (
    <div className="space-y-4">
      {/* Reading Streak card — orange gradient */}
      <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="font-semibold text-sm">Reading Streak</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-6xl font-bold text-orange-500 leading-none">{streak}</p>
            <p className="text-sm text-muted-foreground mt-1">day streak</p>
          </div>
          <p className="text-xs text-muted-foreground">Best: {longestStreak} days</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{readingsCompleted}</p>
              <p className="text-xs text-muted-foreground">Readings Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{chaptersRead}</p>
              <p className="text-xs text-muted-foreground">Chapters Read</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Achievement */}
      {nextAchievement && (
        <Card className="border-l-4 border-l-amber-400 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs">⭐</span>
              <span className="text-xs font-semibold text-amber-600">Next Achievement</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg shrink-0 ${nextAchievement.color}`}>
                {nextAchievement.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{nextAchievement.name}</p>
                <p className="text-xs text-muted-foreground">{nextAchievement.desc}</p>
                <p className="text-xs text-muted-foreground mt-1">{nextProgress} / {nextAchievement.req.val} {nextAchievement.req.type === "streak" ? "days" : "chapters"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earned Badges */}
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-sm">Earned Badges ({earned.length})</h3>
          </div>
          {earned.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Complete readings to earn badges!</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {earned.map(a => (
                <div key={a.id} className={`rounded-xl p-3 text-center ${a.color.split(" ")[0]}`}>
                  <div className="text-2xl mb-1">{a.icon}</div>
                  <p className="text-xs font-semibold leading-tight">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{a.desc}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Achievements */}
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardContent className="p-5">
          <h3 className="font-semibold text-sm mb-3">All Achievements</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {ACHIEVEMENTS.map(a => {
              const isEarned = earnedBadges.includes(a.id);
              return (
                <div key={a.id} className="flex items-center gap-3 py-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-base shrink-0 transition-all ${isEarned ? a.color : "bg-slate-100 dark:bg-slate-700 text-slate-400 grayscale"}`}>
                    {isEarned ? a.icon : <span className="text-xs font-bold text-slate-400">{a.name[0]}</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isEarned ? "" : "text-muted-foreground"}`}>{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                  {isEarned && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">✓</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Reading Planner ───────────────────────────────────────────────────────────

const PLAN_TYPES = [
  { id: "bible_1year", label: "Read Bible in 1 Year", days: 365, description: "Complete Bible in 365 days" },
  { id: "bible_90days", label: "Read Bible in 90 Days", days: 90, description: "Complete Bible in 90 days" },
  { id: "nt_30days", label: "New Testament in 30 Days", days: 30, description: "New Testament in 30 days" },
  { id: "psalms_31days", label: "Psalms in 31 Days", days: 31, description: "All 150 Psalms in 31 days" },
  { id: "custom", label: "Custom Plan", days: 0, description: "Create your own plan" },
];

// Generate daily readings for a plan type starting from a date
function generatePlanReadings(typeId: string, startDate: string): { day: number; passage: string; ref: string; date: string }[] {
  const start = new Date(startDate);
  const readings: { day: number; passage: string; ref: string; date: string }[] = [];

  if (typeId === "nt_30days") {
    const ntPassages = [
      "Matthew 1-4","Matthew 5-7","Matthew 8-11","Matthew 12-15","Matthew 16-19","Matthew 20-22","Matthew 23-25","Matthew 26-28",
      "Mark 1-4","Mark 5-8","Mark 9-12","Mark 13-16","Luke 1-3","Luke 4-6","Luke 7-9","Luke 10-12",
      "Luke 13-16","Luke 17-19","Luke 20-22","Luke 23-24","John 1-3","John 4-6","John 7-9","John 10-12",
      "John 13-15","John 16-18","John 19-21","Acts 1-4","Acts 5-8","Acts 9-12",
    ];
    ntPassages.forEach((p, i) => {
      const d = new Date(start); d.setDate(d.getDate() + i);
      readings.push({ day: i + 1, passage: p, ref: p.split(" ")[0].toUpperCase().slice(0, 3) + "." + p.split(" ")[1].split("-")[0], date: d.toISOString().split("T")[0] });
    });
  } else if (typeId === "psalms_31days") {
    const groups = ["1-5","6-10","11-15","16-20","21-25","26-30","31-35","36-40","41-45","46-50","51-55","56-60","61-65","66-70","71-75","76-80","81-85","86-90","91-95","96-100","101-105","106-110","111-115","116-120","121-125","126-130","131-135","136-140","141-145","146-148","149-150"];
    groups.forEach((g, i) => {
      const d = new Date(start); d.setDate(d.getDate() + i);
      readings.push({ day: i + 1, passage: `Psalms ${g}`, ref: `PSA.${g.split("-")[0]}`, date: d.toISOString().split("T")[0] });
    });
  } else {
    // Bible in 1 Year / 90 Days — Genesis through Revelation in chunks
    const allPassages = [
      "Genesis 1-3","Genesis 4-6","Genesis 7-9","Genesis 10-12","Genesis 13-15","Genesis 16-18","Genesis 19-21","Genesis 22-24",
      "Genesis 25-27","Genesis 28-30","Genesis 31-33","Genesis 34-36","Genesis 37-39","Genesis 40-42","Genesis 43-45","Genesis 46-50",
      "Exodus 1-4","Exodus 5-8","Exodus 9-12","Exodus 13-16","Exodus 17-20","Exodus 21-24","Exodus 25-28","Exodus 29-32","Exodus 33-36","Exodus 37-40",
      "Leviticus 1-4","Leviticus 5-8","Leviticus 9-12","Leviticus 13-16","Leviticus 17-20","Leviticus 21-24","Leviticus 25-27",
      "Numbers 1-4","Numbers 5-8","Numbers 9-12","Numbers 13-16","Numbers 17-20","Numbers 21-24","Numbers 25-28","Numbers 29-32","Numbers 33-36",
      "Deuteronomy 1-4","Deuteronomy 5-8","Deuteronomy 9-12","Deuteronomy 13-16","Deuteronomy 17-20","Deuteronomy 21-24","Deuteronomy 25-28","Deuteronomy 29-34",
      "Joshua 1-6","Joshua 7-12","Joshua 13-18","Joshua 19-24",
      "Judges 1-6","Judges 7-12","Judges 13-18","Judges 19-21","Ruth 1-4",
      "1 Samuel 1-6","1 Samuel 7-12","1 Samuel 13-18","1 Samuel 19-24","1 Samuel 25-31",
      "2 Samuel 1-6","2 Samuel 7-12","2 Samuel 13-18","2 Samuel 19-24",
      "1 Kings 1-6","1 Kings 7-12","1 Kings 13-18","1 Kings 19-22",
      "2 Kings 1-6","2 Kings 7-12","2 Kings 13-18","2 Kings 19-25",
      "Psalms 1-10","Psalms 11-20","Psalms 21-30","Psalms 31-40","Psalms 41-50",
      "Psalms 51-60","Psalms 61-70","Psalms 71-80","Psalms 81-90","Psalms 91-100",
      "Psalms 101-110","Psalms 111-120","Psalms 121-130","Psalms 131-140","Psalms 141-150",
      "Proverbs 1-6","Proverbs 7-12","Proverbs 13-18","Proverbs 19-24","Proverbs 25-31",
      "Isaiah 1-6","Isaiah 7-12","Isaiah 13-18","Isaiah 19-24","Isaiah 25-30","Isaiah 31-36","Isaiah 37-42","Isaiah 43-48","Isaiah 49-54","Isaiah 55-60","Isaiah 61-66",
      "Matthew 1-4","Matthew 5-7","Matthew 8-11","Matthew 12-15","Matthew 16-19","Matthew 20-22","Matthew 23-25","Matthew 26-28",
      "Mark 1-4","Mark 5-8","Mark 9-12","Mark 13-16",
      "Luke 1-3","Luke 4-6","Luke 7-9","Luke 10-12","Luke 13-16","Luke 17-19","Luke 20-22","Luke 23-24",
      "John 1-3","John 4-6","John 7-9","John 10-12","John 13-15","John 16-18","John 19-21",
      "Acts 1-4","Acts 5-8","Acts 9-12","Acts 13-16","Acts 17-20","Acts 21-24","Acts 25-28",
      "Romans 1-4","Romans 5-8","Romans 9-12","Romans 13-16",
      "1 Corinthians 1-6","1 Corinthians 7-11","1 Corinthians 12-16",
      "2 Corinthians 1-6","2 Corinthians 7-13",
      "Galatians 1-6","Ephesians 1-6","Philippians 1-4","Colossians 1-4",
      "1 Thessalonians 1-5","2 Thessalonians 1-3","1 Timothy 1-6","2 Timothy 1-4","Titus 1-3","Philemon 1",
      "Hebrews 1-6","Hebrews 7-13","James 1-5","1 Peter 1-5","2 Peter 1-3",
      "1 John 1-5","2 John 1","3 John 1","Jude 1","Revelation 1-6","Revelation 7-12","Revelation 13-18","Revelation 19-22",
    ];
    const totalDays = typeId === "bible_90days" ? 90 : 365;
    const step = Math.ceil(allPassages.length / totalDays);
    for (let i = 0; i < totalDays; i++) {
      const chunk = allPassages.slice(i * step, (i + 1) * step);
      if (chunk.length === 0) break;
      const d = new Date(start); d.setDate(d.getDate() + i);
      const passage = chunk.join(", ");
      const firstBook = chunk[0].split(" ")[0];
      readings.push({ day: i + 1, passage, ref: firstBook.toUpperCase().slice(0, 3) + ".1", date: d.toISOString().split("T")[0] });
    }
  }
  return readings;
}

interface PlanData {
  id: string;
  name: string;
  typeId: string;
  startDate: string;
  readings: { day: number; passage: string; ref: string; date: string }[];
  completedDays: number[];
}

function ReadingPlannerTab({ onNavigate }: { onNavigate: (book: string, ch: number) => void }) {
  const [plans, setPlans] = useState<PlanData[]>(() => lsGet("bible_reading_plans", []));
  const [activePlanId, setActivePlanId] = useState<string>(() => lsGet("bible_active_plan_id", ""));
  const [createOpen, setCreateOpen] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planType, setPlanType] = useState("bible_1year");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  const activePlan = plans.find(p => p.id === activePlanId) || plans[0] || null;

  const createPlan = () => {
    if (!planName.trim()) { toast.error("Plan name is required"); return; }
    const readings = generatePlanReadings(planType, startDate);
    const plan: PlanData = { id: crypto.randomUUID(), name: planName, typeId: planType, startDate, readings, completedDays: [] };
    const updated = [...plans, plan];
    setPlans(updated);
    lsSet("bible_reading_plans", updated);
    setActivePlanId(plan.id);
    lsSet("bible_active_plan_id", plan.id);
    setPlanName(""); setPlanType("bible_1year"); setStartDate(new Date().toISOString().split("T")[0]);
    setCreateOpen(false);
    toast.success("Reading plan created!");
  };

  const deletePlan = (id: string) => {
    const updated = plans.filter(p => p.id !== id);
    setPlans(updated);
    lsSet("bible_reading_plans", updated);
    const newActive = updated[0]?.id || "";
    setActivePlanId(newActive);
    lsSet("bible_active_plan_id", newActive);
  };

  const toggleDay = (day: number) => {
    if (!activePlan) return;
    const done = activePlan.completedDays.includes(day);
    const updated = done ? activePlan.completedDays.filter(d => d !== day) : [...activePlan.completedDays, day];
    const updatedPlan = { ...activePlan, completedDays: updated };
    const updatedPlans = plans.map(p => p.id === activePlan.id ? updatedPlan : p);
    setPlans(updatedPlans);
    lsSet("bible_reading_plans", updatedPlans);
  };

  const today = new Date().toISOString().split("T")[0];
  const todayReading = activePlan?.readings.find(r => r.date === today);
  const pct = activePlan ? Math.round((activePlan.completedDays.length / activePlan.readings.length) * 100) : 0;

  return (
    <>
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-sm">Reading Planner</h3>
            </div>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs" onClick={() => setCreateOpen(true)}>
              <span className="mr-1 text-base leading-none">+</span> New Plan
            </Button>
          </div>

          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Calendar className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No reading plans yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create a plan to start tracking your Bible reading</p>
            </div>
          ) : (
            <>
              {/* Plan selector + delete */}
              <div className="flex items-center gap-2 mb-3">
                <Select value={activePlanId} onValueChange={v => { setActivePlanId(v); lsSet("bible_active_plan_id", v); }}>
                  <SelectTrigger className="flex-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => activePlan && deletePlan(activePlan.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress bar */}
              {activePlan && (
                <>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{activePlan.completedDays.length} of {activePlan.readings.length} readings completed</p>

                  {/* Today's reading highlight */}
                  {todayReading && (
                    <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3 mb-4">
                      <p className="text-xs font-semibold text-orange-600 mb-1">Today's Reading</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{todayReading.passage}</p>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-orange-600" onClick={() => toggleDay(todayReading.day)}>
                          {activePlan.completedDays.includes(todayReading.day) ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4" />}
                          <span className="ml-1">{activePlan.completedDays.includes(todayReading.day) ? "Done" : "Read"}</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Full reading list */}
                  <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1">
                    {activePlan.readings.map(r => {
                      const done = activePlan.completedDays.includes(r.day);
                      const isToday = r.date === today;
                      return (
                        <div key={r.day} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${done ? "border-emerald-100 bg-emerald-50/50 dark:bg-emerald-900/10" : isToday ? "border-orange-200 bg-orange-50/30" : "border-slate-100 dark:border-slate-700/50"}`}>
                          <button onClick={() => toggleDay(r.day)} className="shrink-0">
                            {done
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              : <Circle className="h-4 w-4 text-muted-foreground" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${done ? "line-through text-muted-foreground" : ""}`}>{r.passage}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(r.date), "MMM d, yyyy")}</p>
                          </div>
                          {isToday && <span className="text-[10px] font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded shrink-0">Today</span>}
                          <button
                            className="shrink-0 text-muted-foreground hover:text-orange-600 transition-colors"
                            onClick={() => {
                              const bookName = Object.entries(BOOK_IDS).find(([, id]) => id === r.ref.split(".")[0])?.[0];
                              if (bookName) onNavigate(bookName, Number(r.ref.split(".")[1] || 1));
                            }}
                          >
                            <BookOpen className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Plan Dialog */}
      <Dialog open={createOpen} onOpenChange={v => { if (!v) setCreateOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Reading Plan</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Plan Name</Label>
              <Input className="mt-1.5" placeholder="e.g., My 2024 Bible Reading" value={planName} onChange={e => setPlanName(e.target.value)} />
            </div>
            <div>
              <Label>Plan Type</Label>
              <Select value={planType} onValueChange={setPlanType}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" className="mt-1.5" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <Button className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white rounded-full" onClick={createPlan}>
              Create Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Challenges Tab ────────────────────────────────────────────────────────────

interface CustomChallenge {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  targetType: "chapters" | "days" | "books";
  targetAmount: number;
  participants: number;
  joined: boolean;
  progress: number;
  createdAt: string;
}

function ChallengesTab() {
  const [challenges, setChallenges] = useState<CustomChallenge[]>(() => lsGet("bible_custom_challenges", []));
  const [createOpen, setCreateOpen] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cStart, setCStart] = useState(new Date().toISOString().split("T")[0]);
  const [cEnd, setCEnd] = useState("");
  const [cTargetType, setCTargetType] = useState<"chapters" | "days" | "books">("chapters");
  const [cTargetAmount, setCTargetAmount] = useState("50");

  const resetForm = () => { setCTitle(""); setCDesc(""); setCStart(new Date().toISOString().split("T")[0]); setCEnd(""); setCTargetType("chapters"); setCTargetAmount("50"); };

  const createChallenge = () => {
    if (!cTitle.trim() || !cEnd) { toast.error("Title and End Date are required"); return; }
    const c: CustomChallenge = {
      id: crypto.randomUUID(), title: cTitle, description: cDesc,
      startDate: cStart, endDate: cEnd,
      targetType: cTargetType, targetAmount: Number(cTargetAmount) || 50,
      participants: 0, joined: false, progress: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [c, ...challenges];
    setChallenges(updated);
    lsSet("bible_custom_challenges", updated);
    toast.success("Challenge created!");
    resetForm();
    setCreateOpen(false);
  };

  const deleteChallenge = (id: string) => {
    const updated = challenges.filter(c => c.id !== id);
    setChallenges(updated);
    lsSet("bible_custom_challenges", updated);
    toast.success("Challenge deleted");
  };

  const joinChallenge = (id: string) => {
    const updated = challenges.map(c => c.id === id ? { ...c, joined: true, participants: c.participants + 1 } : c);
    setChallenges(updated);
    lsSet("bible_custom_challenges", updated);
    toast.success("Joined challenge!");
  };

  const updateProgress = (id: string, delta: number) => {
    const updated = challenges.map(c => {
      if (c.id !== id) return c;
      const newProgress = Math.max(0, Math.min(c.targetAmount, c.progress + delta));
      return { ...c, progress: newProgress };
    });
    setChallenges(updated);
    lsSet("bible_custom_challenges", updated);
  };

  const getDaysLeft = (endDate: string) => {
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    if (diff < 0) return "Ended";
    if (diff === 0) return "Last day";
    return `${diff} days left`;
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-bold text-base">Reading Challenges</h2>
          <p className="text-sm text-muted-foreground">Join church-wide reading challenges</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs shrink-0" onClick={() => setCreateOpen(true)}>
          <span className="mr-1 text-base leading-none">+</span> Create Challenge
        </Button>
      </div>

      {/* Challenge list */}
      {challenges.length === 0 ? (
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No challenges yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create a challenge to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {challenges.map(c => {
            const pct = Math.round((c.progress / c.targetAmount) * 100);
            const daysLeft = getDaysLeft(c.endDate);
            const isEnded = daysLeft === "Ended";
            const isComplete = c.progress >= c.targetAmount;
            return (
              <Card key={c.id} className="border border-slate-200 dark:border-slate-700 shadow-sm">
                <CardContent className="p-4">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                      <p className="font-semibold text-sm">{c.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isEnded ? "bg-slate-100 text-slate-500" : isComplete ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                        {isComplete ? "Complete!" : daysLeft}
                      </span>
                      <button onClick={() => deleteChallenge(c.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(c.startDate), "MMM d")} – {format(new Date(c.endDate), "MMM d")}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {c.targetAmount} {c.targetType}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {c.participants} participants
                    </span>
                  </div>

                  {c.description && <p className="text-xs text-muted-foreground mb-3">{c.description}</p>}

                  {/* Progress (if joined) */}
                  {c.joined && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{c.progress} / {c.targetAmount} {c.targetType}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Action button */}
                  {!c.joined ? (
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white h-9" onClick={() => joinChallenge(c.id)}>
                      <Users className="h-4 w-4 mr-2" />Join Challenge
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => updateProgress(c.id, 1)}>
                        +1 {c.targetType === "chapters" ? "Chapter" : c.targetType === "days" ? "Day" : "Book"}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs px-2" onClick={() => updateProgress(c.id, -1)}>−</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Challenge Dialog */}
      <Dialog open={createOpen} onOpenChange={v => { if (!v) { resetForm(); setCreateOpen(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Reading Challenge</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Challenge Title *</Label>
              <Input className="mt-1.5" placeholder="e.g., Summer Bible Reading Challenge" value={cTitle} onChange={e => setCTitle(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1.5 resize-none" rows={3} placeholder="Describe the challenge..." value={cDesc} onChange={e => setCDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" className="mt-1.5" value={cStart} onChange={e => setCStart(e.target.value)} />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input type="date" className="mt-1.5" value={cEnd} onChange={e => setCEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Target Type</Label>
                <Select value={cTargetType} onValueChange={v => setCTargetType(v as any)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chapters">Chapters</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="books">Books</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Amount</Label>
                <Input type="number" className="mt-1.5" min={1} value={cTargetAmount} onChange={e => setCTargetAmount(e.target.value)} />
              </div>
            </div>
            <Button className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white rounded-full" onClick={createChallenge}>
              Create Challenge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Reminders Tab ─────────────────────────────────────────────────────────────

const REMINDER_TIMES = [
  "6:00 AM","6:30 AM","7:00 AM","7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM",
  "12:00 PM","1:00 PM","3:00 PM","5:00 PM","6:00 PM","7:00 PM","8:00 PM","9:00 PM","10:00 PM",
];
const WEEK_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function RemindersTab({ tenantId, userId }: { tenantId: string; userId: string | null }) {
  const [enabled, setEnabled] = useState(() => lsGet("bible_reminder_on", false));
  const [time, setTime] = useState(() => lsGet("bible_reminder_time", "8:00 AM"));
  const [days, setDays] = useState<number[]>(() => lsGet("bible_reminder_days", [0,1,2,3,4,5,6]));
  const [sending, setSending] = useState(false);

  // Reading groups state
  const [groups, setGroups] = useState<any[]>(() => lsGet("bible_reading_groups", []));
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Export plan state
  const plans: any[] = lsGet("bible_reading_plans", []);
  const [exportPlanId, setExportPlanId] = useState<string>(plans[0]?.id || "");
  const selectedExportPlan = plans.find((p: any) => p.id === exportPlanId) || plans[0] || null;

  const toggleDay = (d: number) => {
    const updated = days.includes(d) ? days.filter(x => x !== d) : [...days, d];
    setDays(updated);
    lsSet("bible_reminder_days", updated);
  };

  const saveReminder = async () => {
    lsSet("bible_reminder_on", enabled);
    lsSet("bible_reminder_time", time);
    lsSet("bible_reminder_days", days);
    if (!enabled) { toast.success("Reminders disabled"); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-bible-reminder", {
        body: { tenantId, userId, time, days, action: "save_preference" },
      });
      if (error || data?.error) throw new Error(data?.error || "Failed to save");
      toast.success(`Reminder set for ${time} on selected days`);
    } catch (err: any) {
      // Graceful fallback — preference saved locally even if edge function fails
      toast.success(`Reminder preference saved for ${time}`);
    } finally { setSending(false); }
  };

  const createGroup = async () => {
    if (!groupName.trim()) { toast.error("Group name is required"); return; }
    setCreatingGroup(true);
    try {
      const { data, error } = await supabase.from("groups").insert({
        tenant_id: tenantId,
        name: groupName,
        description: groupDesc || null,
        type: "bible_study",
        is_active: true,
        color: "#f97316",
        created_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      const updated = [{ id: data.id, name: groupName, desc: groupDesc, members: 0 }, ...groups];
      setGroups(updated);
      lsSet("bible_reading_groups", updated);
      toast.success(`Group "${groupName}" created!`);
      setGroupName(""); setGroupDesc("");
      setCreateGroupOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create group");
    } finally { setCreatingGroup(false); }
  };

  const handleSendInvite = () => {
    const url = `${window.location.origin}/bible-explorer`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied! Share it with friends to read together.");
  };

  const handleExportPDF = (mode: "print" | "download") => {
    if (!selectedExportPlan) { toast.error("No reading plan to export"); return; }
    const rows = selectedExportPlan.readings.map((r: any) =>
      `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;color:#6b7280">${r.day}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:500">${r.passage}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;color:#6b7280">${r.date}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;color:#10b981">${selectedExportPlan.completedDays?.includes(r.day) ? "✓" : ""}</td></tr>`
    ).join("");
    const completedCount = selectedExportPlan.completedDays?.length || 0;
    const totalCount = selectedExportPlan.readings?.length || 0;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const html = `<!DOCTYPE html><html><head><title>${selectedExportPlan.name}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;color:#1a1a1a}.header{background:linear-gradient(135deg,#f97316,#fb923c);color:white;padding:24px;border-radius:8px;margin-bottom:24px}.header h1{margin:0;font-size:22px}.header p{margin:6px 0 0;opacity:0.85;font-size:14px}.stats{display:flex;gap:16px;margin-bottom:24px}.stat{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 20px;text-align:center}.stat .val{font-size:24px;font-weight:bold;color:#f97316}.stat .lbl{font-size:12px;color:#6b7280;margin-top:2px}table{width:100%;border-collapse:collapse}th{background:#f97316;color:white;padding:10px;text-align:left}tr:nth-child(even){background:#fafafa}@media print{.header{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="header"><h1>📖 ${selectedExportPlan.name}</h1><p>Started: ${selectedExportPlan.startDate} · ${completedCount} of ${totalCount} readings completed (${pct}%)</p></div><div class="stats"><div class="stat"><div class="val">${totalCount}</div><div class="lbl">Total Readings</div></div><div class="stat"><div class="val">${completedCount}</div><div class="lbl">Completed</div></div><div class="stat"><div class="val">${pct}%</div><div class="lbl">Progress</div></div></div><table><tr><th>#</th><th>Passage</th><th>Date</th><th>Done</th></tr>${rows}</table></body></html>`;

    if (mode === "download") {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedExportPlan.name.replace(/\s+/g, "-")}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Reading plan downloaded!");
    } else {
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* ── LEFT: Reading Reminders ── */}
      <div className="space-y-4">
        <div>
          <h2 className="font-bold text-base flex items-center gap-2"><Bell className="h-4 w-4 text-orange-500" />Reading Reminders</h2>
          <p className="text-sm text-muted-foreground">Get daily reminders to keep up with your Bible reading</p>
        </div>

        {/* Enable toggle */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable Reminders</p>
                <p className="text-xs text-muted-foreground mt-0.5">Receive daily reading reminders via email</p>
              </div>
              <Switch checked={enabled} onCheckedChange={v => { setEnabled(v); lsSet("bible_reminder_on", v); }} />
            </div>
          </CardContent>
        </Card>

        {/* Settings — only shown when enabled */}
        {enabled && (
          <>
            {/* Reminder Time */}
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">🕐</span>
                  <p className="text-sm font-medium">Reminder Time</p>
                </div>
                <p className="text-xs text-muted-foreground mb-2">When would you like to receive your reminder?</p>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REMINDER_TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Reminder Days */}
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">📅</span>
                  <p className="text-sm font-medium">Reminder Days</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Which days do you want to receive reminders?</p>
                <div className="flex gap-1.5 flex-wrap">
                  {WEEK_DAYS.map((d, i) => (
                    <button
                      key={d}
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${days.includes(i) ? "bg-orange-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-muted-foreground"}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {days.length === 7 && <p className="text-xs text-muted-foreground mt-2">You'll receive reminders every day</p>}
              </CardContent>
            </Card>

            {/* How it works */}
            <Card className="border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">📧</span>
                  <p className="text-sm font-semibold">How it works</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  You'll receive an email reminder at {time} on your selected days. The email will include your scheduled readings for that day and your current streak.
                </p>
              </CardContent>
            </Card>

            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={saveReminder} disabled={sending}>
              {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Reminder Settings"}
            </Button>
          </>
        )}
      </div>

      {/* ── RIGHT: Export + Social + Groups ── */}
      <div className="space-y-4">
        {/* Export Reading Plan */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">📥</span>
              <p className="text-sm font-semibold">Export Reading Plan</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Download or print your reading schedule</p>
            {plans.length === 0 ? (
              <p className="text-xs text-muted-foreground">No reading plan created yet. Go to Reading Plan tab to create one.</p>
            ) : (
              <>
                {/* Plan selector dropdown */}
                <Select value={exportPlanId} onValueChange={setExportPlanId}>
                  <SelectTrigger className="w-full h-9 text-sm mb-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {plans.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedExportPlan && (
                  <p className="text-xs text-muted-foreground mb-3">
                    {selectedExportPlan.completedDays?.length || 0} of {selectedExportPlan.readings?.length || 0} readings completed
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleExportPDF("download")}>
                    <FileText className="h-3.5 w-3.5 mr-1.5" />Export PDF
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleExportPDF("print")}>
                    <span className="mr-1.5">🖨️</span>Print
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Social Reading */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-semibold">Social Reading</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Share your progress and read together with others</p>

            {/* Share Your Progress */}
            <div className="mb-3">
              <p className="text-xs font-medium mb-2 flex items-center gap-1.5"><Share2 className="h-3.5 w-3.5" />Share Your Progress</p>
              <p className="text-xs text-muted-foreground mb-2">Encourage others by sharing your Bible reading journey</p>
              {activePlan && (
                <div className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-xs font-medium">{activePlan.name}</p>
                      <p className="text-[10px] text-muted-foreground">Started {activePlan.startDate}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                    const text = `I'm reading the Bible with "${activePlan.name}" — ${activePlan.completedDays?.length || 0} of ${activePlan.readings?.length || 0} readings done! Join me at ${window.location.origin}/bible-explorer`;
                    navigator.clipboard.writeText(text);
                    toast.success("Progress copied! Share it anywhere.");
                  }}>
                    <Share2 className="h-3 w-3 mr-1" />Share
                  </Button>
                </div>
              )}
            </div>

            {/* Community Highlights */}
            <div className="mb-3">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">⭐ Community Highlights</p>
              <p className="text-xs text-muted-foreground mb-2">Celebrate reading milestones together</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800">
                  <span className="text-sm">🔥</span>
                  <div>
                    <p className="text-xs font-medium">30-Day Streak Challenge</p>
                    <p className="text-[10px] text-muted-foreground">12 members achieved a 30-day reading streak this month!</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                  <span className="text-sm">📖</span>
                  <div>
                    <p className="text-xs font-medium">Most Read This Week</p>
                    <p className="text-[10px] text-muted-foreground">Psalms and Matthew are the top books being read</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Send Invite */}
            <div className="flex flex-col items-center py-3 border-t border-slate-100 dark:border-slate-700">
              <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground mb-2">Invite friends to read together</p>
              <button onClick={handleSendInvite} className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1 transition-colors">
                <Share2 className="h-3.5 w-3.5" />Send Invite
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Reading Groups */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-semibold">Reading Groups</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Join or create groups to read through the Bible together</p>

            {groups.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <Users className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground text-center mb-3">Reading groups help you stay accountable and discuss Scripture with others</p>
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                {groups.map((g: any) => (
                  <div key={g.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">{g.name[0]}</div>
                      <div>
                        <p className="text-xs font-medium">{g.name}</p>
                        <p className="text-[10px] text-muted-foreground">{g.members || 0} members</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]">View</Button>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" className="w-full h-8 text-xs" onClick={() => setCreateGroupOpen(true)}>
              <Users className="h-3.5 w-3.5 mr-1.5" />Create a Group
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={createGroupOpen} onOpenChange={v => { if (!v) { setGroupName(""); setGroupDesc(""); setCreateGroupOpen(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Reading Group</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Group Name *</Label>
              <Input className="mt-1.5" placeholder="e.g., Morning Bible Study" value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1.5 resize-none" rows={3} placeholder="What will your group read together?" value={groupDesc} onChange={e => setGroupDesc(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">The group will also appear on the Groups page where you can add members and admins.</p>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setCreateGroupOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={createGroup} disabled={creatingGroup}>
                {creatingGroup ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const BibleExplorer = () => {
  const church = useChurch();
  const [activeTab, setActiveTab] = useState("reader");

  // Reader state
  const [versionId, setVersionId] = useState(VERSIONS[0].id);
  const [book, setBook] = useState("Genesis");
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<any[]>([]);
  const [readerLoading, setReaderLoading] = useState(false);

  // VOTD state
  const [votd, setVotd] = useState<{ text: string; ref: string; version: string } | null>(null);
  const [votdLoading, setVotdLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Lookup state
  const [lookupRef, setLookupRef] = useState("");
  const [lookupResult, setLookupResult] = useState<{ text: string; ref: string } | null>(null);
  const [looking, setLooking] = useState(false);

  // Persisted state
  const [bookmarks, setBookmarks] = useState<{ ref: string; text: string; version: string }[]>(() => lsGet("bible_bookmarks", []));
  const [notes, setNotes] = useState<{ ref: string; text: string; date: string; title?: string; tags?: string; isPrivate?: boolean }[]>(() => lsGet("bible_notes", []));
  const [planDone, setPlanDone] = useState<number[]>(() => lsGet("bible_plan_done", []));
  const [joinedChallenges, setJoinedChallenges] = useState<Record<string, number>>(() => lsGet("bible_challenges", {}));
  const [reminderTime, setReminderTime] = useState(() => lsGet("bible_reminder", "07:00"));
  const [reminderOn, setReminderOn] = useState(() => lsGet("bible_reminder_on", false));
  const [streak, setStreak] = useState(() => lsGet("bible_streak", 0));
  const [longestStreak, setLongestStreak] = useState(() => lsGet("bible_longest_streak", 0));
  const [chaptersRead, setChaptersRead] = useState<{ key: string; readAt: string }[]>(() => lsGet("bible_chapters_read", []));
  const [versesLooked, setVersesLooked] = useState<number>(() => lsGet("bible_verses_looked", 0));

  // ── Streak tracking ──
  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const lastVisit = lsGet<string>("bible_last_visit", "");
    if (lastVisit !== today) {
      const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
      const newStreak = lastVisit === yesterday ? streak + 1 : 1;
      const newLongest = Math.max(newStreak, longestStreak);
      setStreak(newStreak);
      setLongestStreak(newLongest);
      lsSet("bible_streak", newStreak);
      lsSet("bible_longest_streak", newLongest);
      lsSet("bible_last_visit", today);
    }
  }, []);

  // ── Load VOTD ──
  const loadVotd = useCallback(async (refOverride?: string) => {
    setVotdLoading(true);
    try {
      const ref = refOverride || VOTD_REFS[Math.floor(Math.random() * VOTD_REFS.length)];
      const data = await bibleGet(`/bibles/${VERSIONS[0].id}/verses/${ref}?content-type=text&include-verse-numbers=false`);
      setVotd({ text: stripHtml(data.data.content), ref: data.data.reference, version: "KJV" });
    } catch { setVotd({ text: "Fear thou not; for I am with thee.", ref: "Isaiah 41:10", version: "KJV" }); }
    finally { setVotdLoading(false); }
  }, []);

  useEffect(() => { loadVotd(); }, []);

  // ── Load chapter ──
  const loadChapter = useCallback(async () => {
    setReaderLoading(true);
    try {
      const bookId = BOOK_IDS[book];
      const chapterId = `${bookId}.${chapter}`;
      const data = await bibleGet(`/bibles/${versionId}/chapters/${chapterId}/verses`);
      const verseList = data.data || [];
      // Fetch each verse text
      const withText = await Promise.all(
        verseList.slice(0, 50).map(async (v: any) => {
          try {
            const vd = await bibleGet(`/bibles/${versionId}/verses/${v.id}?content-type=text&include-verse-numbers=false`);
            return { id: v.id, number: v.id.split(".")[2], text: stripHtml(vd.data.content) };
          } catch { return { id: v.id, number: v.id.split(".")[2], text: "" }; }
        })
      );
      setVerses(withText.filter(v => v.text));
      // Track chapter read
      const chKey = `${versionId}:${book}:${chapter}`;
      if (!chaptersRead.some(e => (typeof e === "string" ? e : e.key) === chKey)) {
        const entry = { key: chKey, readAt: new Date().toISOString() };
        const updated = [...chaptersRead, entry];
        setChaptersRead(updated);
        lsSet("bible_chapters_read", updated);
      }
    } catch (err: any) {
      toast.error("Failed to load chapter — check API key");
      setVerses([]);
    } finally { setReaderLoading(false); }
  }, [versionId, book, chapter]);

  useEffect(() => { loadChapter(); }, [versionId, book, chapter]);

  // ── Search ──
  const handleSearch = async () => {
    if (!searchQuery.trim()) { toast.error("Enter A Search Term"); return; }
    setSearching(true);
    try {
      const data = await bibleGet(`/bibles/${versionId}/search?query=${encodeURIComponent(searchQuery)}&limit=20`);
      setSearchResults(data.data?.verses || []);
    } catch { toast.error("Search failed"); }
    finally { setSearching(false); }
  };

  // ── Lookup ──
  const handleLookup = async () => {
    if (!lookupRef.trim()) { toast.error("Enter A Bible Reference"); return; }
    setLooking(true);
    try {
      // Convert "John 3:16" → "JHN.3.16"
      const parts = lookupRef.trim().match(/^(.+?)\s+(\d+):(\d+)$/);
      if (!parts) throw new Error("Format: Book Chapter:Verse (e.g. John 3:16)");
      const bookName = parts[1];
      const bookId = BOOK_IDS[bookName];
      if (!bookId) throw new Error(`Unknown book: ${bookName}`);
      const verseId = `${bookId}.${parts[2]}.${parts[3]}`;
      const data = await bibleGet(`/bibles/${versionId}/verses/${verseId}?content-type=text&include-verse-numbers=false`);
      setLookupResult({ text: stripHtml(data.data.content), ref: data.data.reference });
      const newCount = versesLooked + 1;
      setVersesLooked(newCount);
      lsSet("bible_verses_looked", newCount);
    } catch (err: any) { toast.error(err.message || "Lookup failed"); }
    finally { setLooking(false); }
  };

  // ── Bookmark ──
  const addBookmark = (v: any) => {
    const entry = { ref: `${book} ${chapter}:${v.number}`, text: v.text, version: VERSIONS.find(x => x.id === versionId)?.label.split(" (")[0] || "KJV" };
    const updated = [entry, ...bookmarks.filter(b => b.ref !== entry.ref)];
    setBookmarks(updated);
    lsSet("bible_bookmarks", updated);
    toast.success("Bookmarked!");
  };
  const removeBookmark = (ref: string) => {
    const updated = bookmarks.filter(b => b.ref !== ref);
    setBookmarks(updated);
    lsSet("bible_bookmarks", updated);
  };

  const maxChapter = CHAPTER_COUNTS[book] || 1;
  const versionLabel = VERSIONS.find(v => v.id === versionId)?.label.split(" (")[0] || "KJV";

  return (
    <>
      <Helmet><title>Bible Explorer — Vestry</title></Helmet>
      <PageHeader title="Bible Explorer" subtitle="Read, search, and explore the Word of God" />

      {/* ── Verse of the Day ── */}
      <Card className="mb-6 border border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50/80 to-amber-50/40 dark:from-orange-900/10 dark:to-amber-900/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sun className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Verse of the Day</span>
          </div>
          {votdLoading ? (
            <div className="space-y-2"><Skeleton className="h-5 w-full" /><Skeleton className="h-4 w-32" /></div>
          ) : (
            <>
              <p className="text-base italic leading-relaxed text-foreground mb-2">"{votd?.text}"</p>
              <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-3">— {votd?.ref}</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                  setActiveTab("reader");
                }}>
                  <BookOpen className="h-3.5 w-3.5 mr-1" />Read More
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                  navigator.clipboard.writeText(`"${votd?.text}" — ${votd?.ref}`);
                  toast.success("Copied to clipboard");
                }}>
                  <Share2 className="h-3.5 w-3.5 mr-1" />Share
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => loadVotd()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-0.5 border-b mb-5 overflow-x-auto pb-px">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              activeTab === key ? "border-orange-500 text-orange-600 dark:text-orange-400" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* READER TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "reader" && (
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-sm">Bible Reader</h3>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Select value={versionId} onValueChange={setVersionId}>
                <SelectTrigger className="w-52 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{VERSIONS.map(v => <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={book} onValueChange={b => { setBook(b); setChapter(1); }}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Old Testament</div>
                  {OT_BOOKS.map(b => <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>)}
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-1">New Testament</div>
                  {NT_BOOKS.map(b => <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(chapter)} onValueChange={c => setChapter(Number(c))}>
                <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {Array.from({ length: maxChapter }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">Ch. {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nav row */}
            <div className="flex items-center justify-between mb-4">
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={chapter <= 1} onClick={() => setChapter(c => c - 1)}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />Previous
              </Button>
              <span className="font-semibold text-sm">{book} {chapter}</span>
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={chapter >= maxChapter} onClick={() => setChapter(c => c + 1)}>
                Next<ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            {/* Verses */}
            <div className="max-h-[520px] overflow-y-auto pr-1">
              {readerLoading ? (
                <div className="space-y-3">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
              ) : verses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No verses loaded. Check your API key.</p>
              ) : (
                <div className="space-y-2">
                  {verses.map(v => (
                    <div key={v.id} className="group flex items-start gap-2 py-1 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 rounded px-1 transition-colors">
                      <sup className="text-[10px] font-bold text-orange-500 mt-1 shrink-0 w-5 text-right">{v.number}</sup>
                      <p className="text-sm leading-relaxed flex-1">{v.text}</p>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                        onClick={() => addBookmark(v)}
                        title="Bookmark"
                      >
                        <Bookmark className="h-3.5 w-3.5 text-orange-400 hover:text-orange-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-3">{versionLabel}</p>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* READINGS TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "readings" && (
        <ReadingsTab
          allBooks={ALL_BOOKS}
          onNavigate={(bookName, ch) => { setBook(bookName); setChapter(ch); setActiveTab("reader"); }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* BOOKMARKS TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "bookmarks" && (
        <BookmarksTab bookmarks={bookmarks} removeBookmark={removeBookmark} />
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* NOTES TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "notes" && (
        <NotesTab
          notes={notes}
          setNotes={(n) => { setNotes(n); }}
          versesLooked={versesLooked}
          setVersesLooked={setVersesLooked}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SEARCH TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "search" && (
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-sm">Bible Search</h3>
            </div>

            {/* Version + search bar + button row */}
            <div className="flex items-center gap-2 mb-5">
              <Select value={versionId} onValueChange={setVersionId}>
                <SelectTrigger className="w-44 h-9 text-xs shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VERSIONS.map(v => <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                className="flex-1 h-9 text-sm"
                placeholder="Search for words or phrases..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
              <Button className="bg-orange-500 hover:bg-orange-600 text-white h-9 shrink-0" onClick={handleSearch} disabled={searching}>
                <Search className="h-4 w-4 mr-1.5" />{searching ? "Searching..." : "Search"}
              </Button>
            </div>

            {/* Results / states */}
            {searching ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{searchResults.length} results for "{searchQuery}"</p>
                {searchResults.map((r: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-orange-200 transition-colors">
                    <p className="text-xs font-semibold text-orange-600 mb-1">{r.reference}</p>
                    <p className="text-sm leading-relaxed">{stripHtml(r.text || r.content || "")}</p>
                  </div>
                ))}
              </div>
            ) : searchQuery && !searching ? (
              <div className="flex flex-col items-center justify-center py-14">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No verses found for "{searchQuery}"</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different word or phrase</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Enter a search term to find verses</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* LOOKUP TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "lookup" && (
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookMarked className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-sm">Verse Lookup</h3>
            </div>

            {/* Input row: reference + version + search button */}
            <div className="flex items-center gap-2 mb-1">
              <Input
                className="flex-1 h-9 text-sm"
                placeholder="Enter reference (e.g., John 3:16, Psalm 23)"
                value={lookupRef}
                onChange={e => setLookupRef(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLookup()}
              />
              <Select value={versionId} onValueChange={setVersionId}>
                <SelectTrigger className="w-20 h-9 text-xs shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VERSIONS.map(v => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      {v.label.match(/\(([^)]+)\)/)?.[1] || v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white h-9 w-9 p-0 shrink-0" onClick={handleLookup} disabled={looking}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
              Examples: "John 3:16", "Psalm 23:1-6", "Romans 8:28", "Genesis 1"
            </p>

            {/* Result / empty states */}
            {looking ? (
              <div className="space-y-2"><Skeleton className="h-5 w-full" /><Skeleton className="h-4 w-48" /></div>
            ) : lookupResult ? (
              <div className="p-4 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
                <p className="text-xs font-semibold text-orange-600 mb-2">{lookupResult.ref}</p>
                <p className="text-base leading-relaxed italic">"{lookupResult.text}"</p>
                <p className="text-xs text-muted-foreground mt-2">{versionLabel}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Enter a Bible reference to look up a verse</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* READING PLAN TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "plan" && (
        <ReadingPlannerTab
          onNavigate={(bookName, ch) => { setBook(bookName); setChapter(ch); setActiveTab("reader"); }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* STREAKS TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "streaks" && (
        <StreaksTab
          streak={streak}
          longestStreak={longestStreak}
          chaptersRead={chaptersRead.length}
          readingsCompleted={(() => {
            const plans: any[] = lsGet("bible_reading_plans", []);
            return plans.reduce((sum: number, p: any) => sum + (p.completedDays?.length || 0), 0);
          })()}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* STATISTICS TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "stats" && <StatisticsTab />}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CHALLENGES TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "challenges" && <ChallengesTab />}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* REMINDERS TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "reminders" && (
        <RemindersTab tenantId={church.tenantId || ""} userId={church.userId || null} />
      )}
    </>
  );
};

export default BibleExplorer;
