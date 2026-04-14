import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
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
  CheckCircle2, Circle, Calendar, Target, Zap, BookOpenText,
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

// ── Main component ────────────────────────────────────────────────────────────

const BibleExplorer = () => {
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
  const [notes, setNotes] = useState<{ ref: string; text: string; date: string }[]>(() => lsGet("bible_notes", []));
  const [noteRef, setNoteRef] = useState("");
  const [noteText, setNoteText] = useState("");
  const [planDone, setPlanDone] = useState<number[]>(() => lsGet("bible_plan_done", []));
  const [joinedChallenges, setJoinedChallenges] = useState<Record<string, number>>(() => lsGet("bible_challenges", {}));
  const [reminderTime, setReminderTime] = useState(() => lsGet("bible_reminder", "07:00"));
  const [reminderOn, setReminderOn] = useState(() => lsGet("bible_reminder_on", false));
  const [streak, setStreak] = useState(() => lsGet("bible_streak", 0));
  const [longestStreak, setLongestStreak] = useState(() => lsGet("bible_longest_streak", 0));
  const [chaptersRead, setChaptersRead] = useState<string[]>(() => lsGet("bible_chapters_read", []));
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
      if (!chaptersRead.includes(chKey)) {
        const updated = [...chaptersRead, chKey];
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
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await bibleGet(`/bibles/${versionId}/search?query=${encodeURIComponent(searchQuery)}&limit=20`);
      setSearchResults(data.data?.verses || []);
    } catch { toast.error("Search failed"); }
    finally { setSearching(false); }
  };

  // ── Lookup ──
  const handleLookup = async () => {
    if (!lookupRef.trim()) return;
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

  // ── Notes ──
  const saveNote = () => {
    if (!noteRef.trim() || !noteText.trim()) { toast.error("Reference and note required"); return; }
    const entry = { ref: noteRef, text: noteText, date: format(new Date(), "dd MMM yyyy") };
    const updated = [entry, ...notes.filter(n => n.ref !== noteRef)];
    setNotes(updated);
    lsSet("bible_notes", updated);
    setNoteRef(""); setNoteText("");
    toast.success("Note saved!");
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
      {activeTab === "bookmarks" && (() => {
        const [bmSearch, setBmSearch] = useState("");
        const [bmFilter, setBmFilter] = useState<"all" | "favorites" | "notes">("all");

        const filtered = bookmarks.filter(b => {
          const matchSearch = !bmSearch.trim() || b.ref.toLowerCase().includes(bmSearch.toLowerCase()) || b.text.toLowerCase().includes(bmSearch.toLowerCase());
          return matchSearch;
        });

        return (
          <Card className="border border-slate-200 dark:border-slate-700">
            <CardContent className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-orange-500" />
                  <h3 className="font-semibold text-sm">My Bookmarks &amp; Notes</h3>
                </div>
                <span className="text-xs text-muted-foreground">{bookmarks.length} saved</span>
              </div>

              {/* Search + filter row */}
              <div className="flex items-center gap-3 mb-5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 h-8 text-xs"
                    placeholder="Search bookmarks..."
                    value={bmSearch}
                    onChange={e => setBmSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1">
                  {(["all", "favorites", "notes"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setBmFilter(f)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        bmFilter === f
                          ? "bg-orange-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {f === "favorites" && <span className="text-[10px]">☆</span>}
                      {f === "notes" && <PenLine className="h-3 w-3" />}
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {bookmarks.length === 0
                      ? "No bookmarks yet. Click a verse while reading to save it!"
                      : "No bookmarks match your search."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((b, i) => (
                    <div key={i} className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-orange-600 mb-1">
                            {b.ref}
                            <span className="text-muted-foreground font-normal ml-1">· {b.version}</span>
                          </p>
                          <p className="text-sm leading-relaxed">{b.text}</p>
                        </div>
                        <button
                          onClick={() => removeBookmark(b.ref)}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
                        >
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
      })()}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* NOTES TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <Card className="border border-slate-200 dark:border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <PenLine className="h-4 w-4 text-orange-500" />
                <h3 className="font-semibold text-sm">Add Note</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Bible Reference</Label>
                  <Input className="mt-1 h-8 text-sm" placeholder="e.g. John 3:16" value={noteRef} onChange={e => setNoteRef(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Note</Label>
                  <Textarea className="mt-1 text-sm resize-none" rows={4} placeholder="Write your reflection or study note..." value={noteText} onChange={e => setNoteText(e.target.value)} />
                </div>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={saveNote}>Save Note</Button>
              </div>
            </CardContent>
          </Card>
          {notes.length > 0 && (
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-5">
                <h3 className="font-semibold text-sm mb-3">Saved Notes ({notes.length})</h3>
                <div className="space-y-3">
                  {notes.map((n, i) => (
                    <div key={i} className="p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-orange-600">{n.ref}</span>
                        <span className="text-[10px] text-muted-foreground">{n.date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SEARCH TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "search" && (
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-sm">Search the Bible</h3>
            </div>
            <div className="flex gap-2 mb-4">
              <Input
                className="flex-1 text-sm"
                placeholder="Search for a word or phrase..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
              <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSearch} disabled={searching}>
                {searching ? "Searching..." : "Search"}
              </Button>
            </div>
            {searching ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{searchResults.length} results</p>
                {searchResults.map((r: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-orange-600 mb-1">{r.reference}</p>
                    <p className="text-sm">{stripHtml(r.text || r.content || "")}</p>
                  </div>
                ))}
              </div>
            ) : searchQuery && !searching ? (
              <p className="text-sm text-muted-foreground text-center py-8">No results found.</p>
            ) : null}
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
            <div className="flex gap-2 mb-4">
              <Input
                className="flex-1 text-sm"
                placeholder="e.g. John 3:16"
                value={lookupRef}
                onChange={e => setLookupRef(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLookup()}
              />
              <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleLookup} disabled={looking}>
                {looking ? "Looking up..." : "Lookup"}
              </Button>
            </div>
            {lookupResult && (
              <div className="p-4 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
                <p className="text-xs font-semibold text-orange-600 mb-2">{lookupResult.ref}</p>
                <p className="text-base leading-relaxed italic">"{lookupResult.text}"</p>
                <p className="text-xs text-muted-foreground mt-2">{versionLabel}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* READING PLAN TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "plan" && (
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-500" />
                <h3 className="font-semibold text-sm">30-Day Reading Plan</h3>
              </div>
              <Badge variant="secondary" className="text-xs">{planDone.length}/30 complete</Badge>
            </div>
            <div className="space-y-2">
              {READING_PLAN.map(day => {
                const done = planDone.includes(day.day);
                return (
                  <div key={day.day} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${done ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-slate-100 dark:border-slate-700"}`}>
                    <button onClick={() => {
                      const updated = done ? planDone.filter(d => d !== day.day) : [...planDone, day.day];
                      setPlanDone(updated);
                      lsSet("bible_plan_done", updated);
                    }}>
                      {done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Day {day.day}</p>
                      <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{day.passage}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                      const [b, c] = day.ref.split(".");
                      const bookName = Object.entries(BOOK_IDS).find(([, id]) => id === b)?.[0];
                      if (bookName) { setBook(bookName); setChapter(Number(c)); setActiveTab("reader"); }
                    }}>Read →</Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* STREAKS TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "streaks" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border border-slate-200 dark:border-slate-700">
            <CardContent className="p-6 text-center">
              <Flame className="h-12 w-12 text-orange-500 mx-auto mb-3" />
              <p className="text-4xl font-bold text-orange-500">{streak}</p>
              <p className="text-sm text-muted-foreground mt-1">Current Streak</p>
              <p className="text-xs text-muted-foreground mt-0.5">consecutive days</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 dark:border-slate-700">
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 text-amber-500 mx-auto mb-3" />
              <p className="text-4xl font-bold text-amber-500">{longestStreak}</p>
              <p className="text-sm text-muted-foreground mt-1">Longest Streak</p>
              <p className="text-xs text-muted-foreground mt-0.5">personal best</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 dark:border-slate-700 sm:col-span-2">
            <CardContent className="p-5">
              <p className="text-sm font-medium mb-2">Keep it up!</p>
              <p className="text-sm text-muted-foreground">Open Bible Explorer every day to maintain your streak. Your streak resets if you miss a day.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* STATISTICS TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "stats" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: BookOpen, color: "text-orange-500 bg-orange-50", val: chaptersRead.length, label: "Chapters Read" },
            { icon: Search, color: "text-blue-500 bg-blue-50", val: versesLooked, label: "Verses Looked Up" },
            { icon: PenLine, color: "text-purple-500 bg-purple-50", val: notes.length, label: "Notes Written" },
            { icon: Bookmark, color: "text-emerald-500 bg-emerald-50", val: bookmarks.length, label: "Bookmarks Saved" },
          ].map(({ icon: Icon, color, val, label }) => (
            <Card key={label} className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-5 text-center">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-3 ${color.split(" ").slice(1).join(" ")}`}>
                  <Icon className={`h-5 w-5 ${color.split(" ")[0]}`} />
                </div>
                <p className="text-2xl font-bold">{val}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CHALLENGES TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "challenges" && (
        <div className="space-y-3">
          {CHALLENGES.map(c => {
            const progress = joinedChallenges[c.id] || 0;
            const joined = c.id in joinedChallenges;
            const pct = Math.round((progress / c.days) * 100);
            return (
              <Card key={c.id} className="border border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">{c.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{c.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                        {joined && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Day {progress} of {c.days}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {!joined ? (
                        <Button size="sm" className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white" onClick={() => {
                          const updated = { ...joinedChallenges, [c.id]: 0 };
                          setJoinedChallenges(updated);
                          lsSet("bible_challenges", updated);
                          toast.success("Challenge joined!");
                        }}>Join</Button>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                            const updated = { ...joinedChallenges, [c.id]: Math.min(progress + 1, c.days) };
                            setJoinedChallenges(updated);
                            lsSet("bible_challenges", updated);
                          }}>+1 Day</Button>
                          {progress >= c.days && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">Complete!</Badge>}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* REMINDERS TAB */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "reminders" && (
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <Bell className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-sm">Daily Reading Reminder</h3>
            </div>
            <div className="space-y-5 max-w-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enable Daily Reminder</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Get reminded to read your Bible every day</p>
                </div>
                <Switch checked={reminderOn} onCheckedChange={v => { setReminderOn(v); lsSet("bible_reminder_on", v); toast.success(v ? "Reminder enabled" : "Reminder disabled"); }} />
              </div>
              <div>
                <Label className="text-sm">Reminder Time</Label>
                <Input
                  type="time"
                  className="mt-1.5 w-40"
                  value={reminderTime}
                  onChange={e => { setReminderTime(e.target.value); lsSet("bible_reminder", e.target.value); }}
                  disabled={!reminderOn}
                />
              </div>
              {reminderOn && (
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                  <p className="text-xs text-orange-700 dark:text-orange-400">
                    ✓ Reminder set for {reminderTime} daily. Note: Browser push notifications require additional setup. This saves your preference for when notifications are configured.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default BibleExplorer;
