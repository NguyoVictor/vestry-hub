import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, BookOpen, Star, StickyNote, Highlighter } from "lucide-react";

const BOOKS = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra",
  "Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon",
  "Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah",
  "Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians",
  "2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians",
  "2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James",
  "1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation",
];

const CHAPTERS: Record<string, number> = {
  Genesis: 50, Exodus: 40, Psalms: 150, Proverbs: 31, Matthew: 28, Mark: 16,
  Luke: 24, John: 21, Acts: 28, Romans: 16, Revelation: 22,
};

function getChapterCount(book: string) {
  return CHAPTERS[book] || 30;
}

export default function MemberBible() {
  const member = useMemberPortal();
  const queryClient = useQueryClient();
  const [book, setBook] = useState("John");
  const [chapter, setChapter] = useState(1);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"read" | "search" | "notes" | "favorites">("read");
  const [noteText, setNoteText] = useState("");
  const [noteVerse, setNoteVerse] = useState("");

  // Fetch chapter from Bible API
  const { data: verses = [], isLoading } = useQuery({
    queryKey: ["bible-chapter", book, chapter],
    queryFn: async () => {
      try {
        const res = await fetch(`https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=kjv`);
        const json = await res.json();
        return json.verses || [];
      } catch {
        return [];
      }
    },
    enabled: activeTab === "read",
  });

  // Search
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["bible-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      try {
        const res = await fetch(`https://bible-api.com/${encodeURIComponent(searchQuery)}?translation=kjv`);
        const json = await res.json();
        return json.verses || [];
      } catch {
        return [];
      }
    },
    enabled: !!searchQuery && activeTab === "search",
  });

  // User notes
  const { data: notes = [] } = useQuery({
    queryKey: ["bible-notes", member.userId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("bible_notes")
        .select("*")
        .eq("user_id", member.userId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: activeTab === "notes",
  });

  // User favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ["bible-favorites", member.userId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("bible_favorites")
        .select("*")
        .eq("user_id", member.userId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: activeTab === "favorites",
  });

  const saveNote = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("bible_notes").insert({
        user_id: member.userId,
        book,
        chapter,
        verse: noteVerse,
        note: noteText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bible-notes", member.userId] });
      setNoteText(""); setNoteVerse("");
      toast.success("Note saved");
    },
    onError: () => toast.error("Failed to save note"),
  });

  const addFavorite = useMutation({
    mutationFn: async (verse: any) => {
      const { error } = await (supabase as any).from("bible_favorites").insert({
        user_id: member.userId,
        book: verse.book_name || book,
        chapter: verse.chapter || chapter,
        verse: verse.verse,
        text: verse.text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bible-favorites", member.userId] });
      toast.success("Added to favorites");
    },
    onError: () => toast.error("Failed to add favorite"),
  });

  const chapterCount = getChapterCount(book);

  return (
    <>
      <Helmet><title>Bible — Vestry</title></Helmet>
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Bible</h1>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "read", label: "Read", icon: BookOpen },
            { key: "search", label: "Search", icon: Search },
            { key: "notes", label: "Notes", icon: StickyNote },
            { key: "favorites", label: "Favorites", icon: Star },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === key ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
            >
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Read Tab */}
        {activeTab === "read" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={book} onValueChange={v => { setBook(v); setChapter(1); }}>
                <SelectTrigger className="flex-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {BOOKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(chapter)} onValueChange={v => setChapter(Number(v))}>
                <SelectTrigger className="w-24 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {Array.from({ length: chapterCount }, (_, i) => i + 1).map(c => (
                    <SelectItem key={c} value={String(c)}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-full" disabled={chapter <= 1} onClick={() => setChapter(c => c - 1)}>← Prev</Button>
              <span className="flex-1 text-center text-sm text-muted-foreground self-center">{book} {chapter}</span>
              <Button variant="outline" size="sm" className="rounded-full" disabled={chapter >= chapterCount} onClick={() => setChapter(c => c + 1)}>Next →</Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
            ) : verses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Could not load chapter. Check your connection.</p>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                {verses.map((v: any) => (
                  <div key={v.verse} className="group flex gap-3">
                    <span className="text-xs text-indigo-500 font-bold w-6 shrink-0 mt-0.5">{v.verse}</span>
                    <p className="text-sm leading-relaxed flex-1">{v.text}</p>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => addFavorite.mutate(v)}
                      title="Add to favorites"
                    >
                      <Star className="h-4 w-4 text-amber-400 hover:fill-amber-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Tab */}
        {activeTab === "search" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search the Bible..."
                className="rounded-xl"
                onKeyDown={e => e.key === "Enter" && setSearchQuery(search)}
              />
              <Button className="rounded-xl" onClick={() => setSearchQuery(search)}>Search</Button>
            </div>
            {searchLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : searchResults.length === 0 && searchQuery ? (
              <p className="text-center text-muted-foreground py-8">No results found</p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((v: any, i: number) => (
                  <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-xs font-semibold text-indigo-600 mb-1">{v.book_name} {v.chapter}:{v.verse}</p>
                    <p className="text-sm leading-relaxed">{v.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <p className="text-sm font-medium">Add a Note</p>
              <Input value={noteVerse} onChange={e => setNoteVerse(e.target.value)} placeholder="Reference (e.g. John 3:16)" className="rounded-xl" />
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Your note..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button className="w-full rounded-full" onClick={() => saveNote.mutate()} disabled={!noteText || saveNote.isPending}>
                {saveNote.isPending ? "Saving..." : "Save Note"}
              </Button>
            </div>
            {notes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No notes yet</p>
            ) : (
              <div className="space-y-2">
                {notes.map((n: any) => (
                  <div key={n.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    {n.verse && <p className="text-xs font-semibold text-indigo-600 mb-1">{n.book} {n.chapter}:{n.verse}</p>}
                    <p className="text-sm">{n.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === "favorites" && (
          <div className="space-y-2">
            {favorites.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Star className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p>No favorites yet</p>
                <p className="text-sm mt-1">Hover over a verse while reading and click the star to save it</p>
              </div>
            ) : (
              favorites.map((f: any) => (
                <div key={f.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs font-semibold text-indigo-600 mb-1">{f.book} {f.chapter}:{f.verse}</p>
                  <p className="text-sm leading-relaxed italic">"{f.text}"</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
