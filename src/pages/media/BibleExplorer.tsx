import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpenText, ChevronLeft, ChevronRight, Search, Star, Minus, Plus } from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const BOOKS = {
  OT: ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi"],
  NT: ["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"],
};

const BibleExplorer = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const [book, setBook] = useState("John");
  const [chapter, setChapter] = useState(1);
  const [fontSize, setFontSize] = useState(16);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

  const { data: verses = [], isLoading } = useQuery({
    queryKey: ["bible", book, chapter],
    queryFn: async () => {
      const ref = `${book}+${chapter}`;
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      return data.verses || [];
    },
    staleTime: Infinity,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["bible_favorites", church.userId],
    queryFn: async () => {
      const { data } = await supabase.from("bible_favorites").select("*").eq("user_id", church.userId);
      return data || [];
    },
  });

  const { data: highlights = [] } = useQuery({
    queryKey: ["bible_highlights", church.userId, book, chapter],
    queryFn: async () => {
      const { data } = await supabase.from("bible_highlights").select("*").eq("user_id", church.userId).eq("book", book).eq("chapter", chapter);
      return data || [];
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async (verse: any) => {
      const existing = favorites.find((f: any) => f.book === book && f.chapter === chapter && f.verse === verse.verse);
      if (existing) {
        await supabase.from("bible_favorites").delete().eq("id", existing.id);
      } else {
        await supabase.from("bible_favorites").insert({ user_id: church.userId, book, chapter, verse: verse.verse, verse_text: verse.text });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bible_favorites"] }); },
  });

  const highlightVerse = useMutation({
    mutationFn: async ({ verse, color }: { verse: number; color: string }) => {
      const existing = highlights.find((h: any) => h.verse === verse);
      if (existing) {
        await supabase.from("bible_highlights").delete().eq("id", existing.id);
      } else {
        await supabase.from("bible_highlights").upsert({ user_id: church.userId, book, chapter, verse, color }, { onConflict: "user_id,book,chapter,verse" });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bible_highlights"] }); },
  });

  const getHighlightColor = (v: number) => {
    const h = highlights.find((hl: any) => hl.verse === v);
    if (!h) return "";
    const colors: Record<string, string> = { yellow: "bg-yellow-100 dark:bg-yellow-900/30", green: "bg-green-100 dark:bg-green-900/30", blue: "bg-blue-100 dark:bg-blue-900/30", pink: "bg-pink-100 dark:bg-pink-900/30" };
    return colors[h.color] || "";
  };

  const isFavorited = (v: number) => favorites.some((f: any) => f.book === book && f.chapter === chapter && f.verse === v);

  return (
    <>
      <Helmet><title>Bible Explorer — Vestry</title></Helmet>
      <PageHeader title="Bible Explorer" subtitle="Search, read and study the Bible" />

      <div className="flex gap-4 h-[calc(100vh-220px)]">
        <div className="hidden lg:block w-48 shrink-0">
          <ScrollArea className="h-full rounded-lg border bg-card p-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Old Testament</h3>
            {BOOKS.OT.map(b => (
              <button key={b} onClick={() => { setBook(b); setChapter(1); }} className={`w-full text-left px-2 py-1 rounded text-sm ${book === b ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>{b}</button>
            ))}
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mt-4 mb-2">New Testament</h3>
            {BOOKS.NT.map(b => (
              <button key={b} onClick={() => { setBook(b); setChapter(1); }} className={`w-full text-left px-2 py-1 rounded text-sm ${book === b ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>{b}</button>
            ))}
          </ScrollArea>
        </div>

        <div className="flex-1 min-w-0">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setChapter(c => Math.max(1, c - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                  <h2 className="font-semibold text-lg">{book} {chapter}</h2>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setChapter(c => c + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFontSize(s => Math.max(12, s - 2))}><Minus className="h-3.5 w-3.5" /></Button>
                  <span className="text-xs text-muted-foreground w-8 text-center">{fontSize}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFontSize(s => Math.min(28, s + 2))}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {isLoading ? (
                  <div className="space-y-3">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
                ) : (
                  <div className="space-y-1 pb-8" style={{ fontSize: `${fontSize}px` }}>
                    {verses.map((v: any) => (
                      <span
                        key={v.verse}
                        className={`inline cursor-pointer rounded px-0.5 transition-colors ${getHighlightColor(v.verse)} ${selectedVerse === v.verse ? "ring-2 ring-primary" : ""}`}
                        onClick={() => setSelectedVerse(selectedVerse === v.verse ? null : v.verse)}
                      >
                        <sup className="text-xs font-bold text-muted-foreground mr-1 select-none">{v.verse}</sup>
                        <span className="leading-relaxed">{v.text} </span>
                      </span>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:block w-64 shrink-0">
          <Tabs defaultValue="search" className="h-full">
            <TabsList className="w-full"><TabsTrigger value="search" className="flex-1">Search</TabsTrigger><TabsTrigger value="favorites" className="flex-1">Favorites</TabsTrigger></TabsList>
            <TabsContent value="search" className="mt-3">
              <div className="relative mb-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search the Bible..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" /></div>
              {selectedVerse && (
                <Card className="mb-3">
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-sm font-medium">{book} {chapter}:{selectedVerse}</p>
                    <div className="flex gap-1">
                      {["yellow", "green", "blue", "pink"].map(color => (
                        <button key={color} onClick={() => highlightVerse.mutate({ verse: selectedVerse, color })} className={`w-6 h-6 rounded-full border-2 ${color === "yellow" ? "bg-yellow-300" : color === "green" ? "bg-green-300" : color === "blue" ? "bg-blue-300" : "bg-pink-300"}`} />
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => toggleFavorite.mutate(verses.find((v: any) => v.verse === selectedVerse))}>
                      <Star className={`mr-2 h-3.5 w-3.5 ${isFavorited(selectedVerse) ? "fill-amber-400 text-amber-400" : ""}`} />
                      {isFavorited(selectedVerse) ? "Unfavorite" : "Add to Favorites"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="favorites" className="mt-3">
              <ScrollArea className="h-[400px]">
                {favorites.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No favorites yet</p> :
                  favorites.map((f: any) => (
                    <Card key={f.id} className="mb-2 cursor-pointer hover:shadow-sm" onClick={() => { setBook(f.book); setChapter(f.chapter); }}>
                      <CardContent className="py-2 px-3">
                        <p className="text-xs font-semibold text-primary">{f.book} {f.chapter}:{f.verse}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{f.verse_text}</p>
                      </CardContent>
                    </Card>
                  ))
                }
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default BibleExplorer;
