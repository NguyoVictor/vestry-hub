import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemberPortal } from '@/contexts/MemberPortalContext';
import { useQuery } from '@tanstack/react-query';
import { getVerse, getChapterVerses } from '@/lib/bibleService';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { AnimatedList } from '@/components/ui/AnimatedList';
import { AnimatedProgressCard } from '@/components/ui/progress-card';
import { CommandPalette } from '@/components/ui/command-palette';
import { 
  BookOpen, ChevronLeft, ChevronRight, Search, Bookmark, 
  PenLine, Flame, Eye, EyeOff, Command 
} from 'lucide-react';
import { useBibleHighlights } from '@/hooks/useBibleHighlights';
import { useBibleBookmarks } from '@/hooks/useBibleBookmarks';
import { useBibleReactions } from '@/hooks/useBibleReactions';
import { useBibleProgress } from '@/hooks/useBibleProgress';
import { useBibleNotes } from '@/hooks/useBibleNotes';
import { useMemberPreferences } from '@/hooks/useMemberPreferences';
import confetti from 'canvas-confetti';

// ── Constants ─────────────────────────────────────────────────────────────────

const VERSIONS = [
  { id: "de4e12af7f28f599-02", label: "KJV" },
  { id: "06125adad2d5898a-01", label: "WEB" },
  { id: "65eec8e0b60e656b-01", label: "ASV" },
];

const OT_BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi"];
const NT_BOOKS = ["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];
const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

const CHAPTER_COUNTS: Record<string, number> = {
  Genesis:50,Exodus:40,Leviticus:27,Numbers:36,Deuteronomy:34,Joshua:24,Judges:21,Ruth:4,"1 Samuel":31,"2 Samuel":24,"1 Kings":22,"2 Kings":25,"1 Chronicles":29,"2 Chronicles":36,Ezra:10,Nehemiah:13,Esther:10,Job:42,Psalms:150,Proverbs:31,Ecclesiastes:12,"Song of Solomon":8,Isaiah:66,Jeremiah:52,Lamentations:5,Ezekiel:48,Daniel:12,Hosea:14,Joel:3,Amos:9,Obadiah:1,Jonah:4,Micah:7,Nahum:3,Habakkuk:3,Zephaniah:3,Haggai:2,Zechariah:14,Malachi:4,Matthew:28,Mark:16,Luke:24,John:21,Acts:28,Romans:16,"1 Corinthians":16,"2 Corinthians":13,Galatians:6,Ephesians:6,Philippians:4,Colossians:4,"1 Thessalonians":5,"2 Thessalonians":3,"1 Timothy":6,"2 Timothy":4,Titus:3,Philemon:1,Hebrews:13,James:5,"1 Peter":5,"2 Peter":3,"1 John":5,"2 John":1,"3 John":1,Jude:1,Revelation:22,
};

const BOOK_IDS: Record<string, string> = {
  Genesis:"GEN",Exodus:"EXO",Leviticus:"LEV",Numbers:"NUM",Deuteronomy:"DEU",Joshua:"JOS",Judges:"JDG",Ruth:"RUT","1 Samuel":"1SA","2 Samuel":"2SA","1 Kings":"1KI","2 Kings":"2KI","1 Chronicles":"1CH","2 Chronicles":"2CH",Ezra:"EZR",Nehemiah:"NEH",Esther:"EST",Job:"JOB",Psalms:"PSA",Proverbs:"PRO",Ecclesiastes:"ECC","Song of Solomon":"SNG",Isaiah:"ISA",Jeremiah:"JER",Lamentations:"LAM",Ezekiel:"EZK",Daniel:"DAN",Hosea:"HOS",Joel:"JOL",Amos:"AMO",Obadiah:"OBA",Jonah:"JON",Micah:"MIC",Nahum:"NAM",Habakkuk:"HAB",Zephaniah:"ZEP",Haggai:"HAG",Zechariah:"ZEC",Malachi:"MAL",Matthew:"MAT",Mark:"MRK",Luke:"LUK",John:"JHN",Acts:"ACT",Romans:"ROM","1 Corinthians":"1CO","2 Corinthians":"2CO",Galatians:"GAL",Ephesians:"EPH",Philippians:"PHP",Colossians:"COL","1 Thessalonians":"1TH","2 Thessalonians":"2TH","1 Timothy":"1TI","2 Timothy":"2TI",Titus:"TIT",Philemon:"PHM",Hebrews:"HEB",James:"JAS","1 Peter":"1PE","2 Peter":"2PE","1 John":"1JN","2 John":"2JN","3 John":"3JN",Jude:"JUD",Revelation:"REV",
};

const VOTD_REFS = [
  "JHN.3.16","PSA.23.1","ROM.8.28","PHP.4.13","ISA.41.10","JER.29.11","PRO.3.5","MAT.6.33",
  "ROM.12.2","GAL.5.22","EPH.2.8","HEB.11.1","JAM.1.5","1JN.4.8","REV.21.4","PSA.46.1",
  "ISA.40.31","MAT.11.28","JHN.14.6","ROM.5.8","PHP.4.7","COL.3.23","2TI.1.7","HEB.4.16",
  "1PE.5.7","PSA.119.105","PRO.22.6","MAT.5.16","JHN.10.10","ROM.8.1",
];

// ── VOTD Utilities ────────────────────────────────────────────────────────────

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getVOTDRef(date?: Date, refs?: string[]): string {
  const d = date || new Date();
  const r = refs || VOTD_REFS;
  const dayOfYear = getDayOfYear(d);
  return r[dayOfYear % r.length];
}

// ── State Interface ───────────────────────────────────────────────────────────

interface BibleExplorerState {
  book: string;
  chapter: number;
  translation: string;
  focusMode: boolean;
  activeTab: 'read' | 'search' | 'bookmarks' | 'progress';
  commandPaletteOpen: boolean;
  openNoteVerse: number | null;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BibleExplorer() {
  const member = useMemberPortal();
  const tenantId = member.tenantId;
  const memberId = member.memberId;

  // Load preferences
  const { bibleSettings, updateBibleSettings } = useMemberPreferences(tenantId, memberId);

  // State
  const [book, setBook] = useState(bibleSettings.lastBook);
  const [chapter, setChapter] = useState(bibleSettings.lastChapter);
  const [translation, setTranslation] = useState(bibleSettings.lastTranslation);
  const [focusMode, setFocusMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'read' | 'search' | 'bookmarks' | 'progress'>('read');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [openNoteVerse, setOpenNoteVerse] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Hooks
  const bookId = BOOK_IDS[book];
  const { highlights, toggleHighlight } = useBibleHighlights(tenantId, memberId, bookId, chapter);
  const { bookmarks, isBookmarked, toggleBookmark } = useBibleBookmarks(tenantId, memberId);
  const { reactionCounts, toggleReaction } = useBibleReactions(tenantId, memberId, bookId, chapter);
  const { chaptersRead, percentComplete, markChapterRead } = useBibleProgress(tenantId, memberId);
  const { hasNote, getNote, saveNote } = useBibleNotes(tenantId, memberId, bookId, chapter);

  // VOTD query
  const votdRef = getVOTDRef();
  const { data: votdData, isLoading: votdLoading } = useQuery({
    queryKey: ['votd', translation, votdRef],
    queryFn: () => getVerse(translation, votdRef),
    staleTime: 300_000,
  });

  // Chapter verses query
  const chapterId = `${bookId}.${chapter}`;
  const { data: versesData, isLoading: versesLoading } = useQuery({
    queryKey: ['chapter-verses', translation, chapterId],
    queryFn: () => getChapterVerses(translation, chapterId),
    staleTime: 300_000,
  });

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Persist navigation state
  useEffect(() => {
    updateBibleSettings({ lastBook: book, lastChapter: chapter, lastTranslation: translation });
  }, [book, chapter, translation]);

  // Navigate handler
  const handleNavigate = (newBook: string, newChapter: number) => {
    setBook(newBook);
    setChapter(newChapter);
    setActiveTab('read');
  };

  // Chapter navigation
  const handlePrevChapter = () => {
    if (chapter > 1) {
      setChapter(chapter - 1);
    } else {
      const bookIndex = ALL_BOOKS.indexOf(book);
      if (bookIndex > 0) {
        const prevBook = ALL_BOOKS[bookIndex - 1];
        setBook(prevBook);
        setChapter(CHAPTER_COUNTS[prevBook]);
      }
    }
  };

  const handleNextChapter = () => {
    const maxChapter = CHAPTER_COUNTS[book];
    if (chapter < maxChapter) {
      setChapter(chapter + 1);
    } else {
      const bookIndex = ALL_BOOKS.indexOf(book);
      if (bookIndex < ALL_BOOKS.length - 1) {
        const nextBook = ALL_BOOKS[bookIndex + 1];
        setBook(nextBook);
        setChapter(1);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] font-jakarta">
      <Helmet>
        <title>Bible Explorer</title>
      </Helmet>

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        onTranslationChange={setTranslation}
        onToggleFocusMode={() => setFocusMode(!focusMode)}
        currentTranslation={translation}
      />

      {/* Sticky Header */}
      <motion.div
        className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bible Explorer</h1>
            <p className="text-sm text-slate-500">Read, study, and engage with Scripture</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandPaletteOpen(true)}
              className="gap-2"
            >
              <Command className="h-4 w-4" />
              <span className="hidden sm:inline">⌘K</span>
            </Button>
            <Button
              variant={focusMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFocusMode(!focusMode)}
              className="gap-2"
              aria-pressed={focusMode}
            >
              {focusMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden sm:inline">Focus Mode</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* VOTD Hero Card */}
      {!focusMode && (
        <motion.div
          className="px-6 py-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
        >
          <SpotlightCard className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            {votdLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-500 mb-3">
                  Verse of the Day
                </p>
                <p className="text-xl text-slate-900 leading-relaxed mb-4">
                  {votdData?.data.content}
                </p>
                <button
                  onClick={() => {
                    const [bookId, ch] = votdRef.split('.');
                    const bookName = Object.keys(BOOK_IDS).find(k => BOOK_IDS[k] === bookId);
                    if (bookName) handleNavigate(bookName, parseInt(ch));
                  }}
                  className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                >
                  {votdData?.data.reference} →
                </button>
              </div>
            )}
          </SpotlightCard>
        </motion.div>
      )}

      {/* Main Content Area */}
      <div className="px-6 pb-12">
        <div className={`grid gap-6 ${focusMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-[320px_1fr]'}`}>
          {/* Sidebar */}
          {!focusMode && (
            <div className="space-y-4">
              {/* Progress Card */}
              <AnimatedProgressCard chaptersRead={chaptersRead} />

              {/* Tabs */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex gap-2 mb-4 border-b border-slate-100">
                  {(['read', 'search', 'bookmarks', 'progress'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-2 text-sm font-medium capitalize transition-colors relative ${
                        activeTab === tab
                          ? 'text-orange-500'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab}
                      {activeTab === tab && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'read' && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Book</Label>
                      <Select value={book} onValueChange={setBook}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_BOOKS.map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Chapter</Label>
                      <Select value={String(chapter)} onValueChange={v => setChapter(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: CHAPTER_COUNTS[book] }, (_, i) => i + 1).map(ch => (
                            <SelectItem key={ch} value={String(ch)}>{ch}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {activeTab === 'bookmarks' && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {bookmarks.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-8">No bookmarks yet</p>
                    ) : (
                      <AnimatedList
                        items={bookmarks.map(bm => (
                          <button
                            key={bm.id}
                            onClick={() => {
                              const bookName = Object.keys(BOOK_IDS).find(k => BOOK_IDS[k] === bm.book_id);
                              if (bookName) handleNavigate(bookName, bm.chapter);
                            }}
                            className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <p className="text-xs font-semibold text-orange-500 mb-1">
                              {Object.keys(BOOK_IDS).find(k => BOOK_IDS[k] === bm.book_id)} {bm.chapter}:{bm.verse_number}
                            </p>
                            <p className="text-sm text-slate-700 line-clamp-2">{bm.verse_text}</p>
                          </button>
                        ))}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'progress' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Chapters Read</span>
                      <span className="text-lg font-bold text-slate-900">{chaptersRead}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Completion</span>
                      <span className="text-lg font-bold text-orange-500">{percentComplete}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reading Area */}
          <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${focusMode ? 'max-w-[680px] mx-auto' : ''}`}>
            {/* Translation Switcher */}
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1" role="radiogroup">
                {VERSIONS.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setTranslation(v.id)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors relative ${
                      translation === v.id
                        ? 'bg-white text-orange-500 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    aria-checked={translation === v.id}
                  >
                    {v.label}
                    {translation === v.id && (
                      <motion.div layoutId="translationIndicator" className="absolute inset-0 bg-white rounded-md shadow-sm -z-10" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Chapter Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {book} {chapter}
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevChapter}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextChapter}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Verses */}
            {versesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={chapterId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    {versesData?.data.map((verse, index) => {
                      const verseNumber = parseInt(verse.number);
                      const highlight = highlights.find(h => h.verse_number === verseNumber);
                      const isBookmarkedVerse = isBookmarked(bookId, chapter, verseNumber);
                      const hasNoteIndicator = hasNote(verseNumber);

                      return (
                        <motion.div
                          key={verse.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.015 }}
                          className={`p-3 rounded-lg transition-colors ${
                            highlight ? `bg-${highlight.color}-100` : 'hover:bg-slate-50'
                          }`}
                          role="article"
                          aria-label={`${book} ${chapter}:${verseNumber}`}
                        >
                          <div className="flex gap-3">
                            <span className="text-orange-500/40 font-semibold text-sm shrink-0 w-8">
                              {verseNumber}
                            </span>
                            <div className="flex-1">
                              <p
                                className="text-[#1c1917] leading-relaxed"
                                style={{
                                  fontSize: `${bibleSettings.fontSize}px`,
                                  fontFamily: bibleSettings.fontFamily === 'serif' ? 'Georgia, serif' : 'inherit',
                                  lineHeight: bibleSettings.lineSpacing,
                                }}
                              >
                                {verse.text}
                              </p>
                              {hasNoteIndicator && (
                                <div className="mt-1">
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500" />
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Focus Mode Exit Button */}
      {focusMode && (
        <motion.div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            onClick={() => setFocusMode(false)}
            className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
          >
            Exit Focus Mode
          </Button>
        </motion.div>
      )}
    </div>
  );
}
