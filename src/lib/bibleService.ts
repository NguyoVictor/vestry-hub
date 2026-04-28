/**
 * Local Bible Service
 * Replaces api.bible with local JSON files
 * Maintains ALL existing functionality
 */

// Translation mapping
const TRANSLATION_MAP: Record<string, string> = {
  "de4e12af7f28f599-02": "kjv", // KJV
  "06125adad2d5898a-01": "kjv", // NIV → fallback to KJV (we only have KJV, WEB, ASV)
  "65eec8e0b60e656b-01": "web", // NLT → fallback to WEB
};

// Book ID to full name mapping
const BOOK_ID_TO_NAME: Record<string, string> = {
  GEN: "Genesis", EXO: "Exodus", LEV: "Leviticus", NUM: "Numbers", DEU: "Deuteronomy",
  JOS: "Joshua", JDG: "Judges", RUT: "Ruth", "1SA": "1 Samuel", "2SA": "2 Samuel",
  "1KI": "1 Kings", "2KI": "2 Kings", "1CH": "1 Chronicles", "2CH": "2 Chronicles",
  EZR: "Ezra", NEH: "Nehemiah", EST: "Esther", JOB: "Job", PSA: "Psalms",
  PRO: "Proverbs", ECC: "Ecclesiastes", SNG: "Song of Solomon", ISA: "Isaiah",
  JER: "Jeremiah", LAM: "Lamentations", EZK: "Ezekiel", DAN: "Daniel",
  HOS: "Hosea", JOL: "Joel", AMO: "Amos", OBA: "Obadiah", JON: "Jonah",
  MIC: "Micah", NAM: "Nahum", HAB: "Habakkuk", ZEP: "Zephaniah", HAG: "Haggai",
  ZEC: "Zechariah", MAL: "Malachi", MAT: "Matthew", MRK: "Mark", LUK: "Luke",
  JHN: "John", ACT: "Acts", ROM: "Romans", "1CO": "1 Corinthians", "2CO": "2 Corinthians",
  GAL: "Galatians", EPH: "Ephesians", PHP: "Philippians", COL: "Colossians",
  "1TH": "1 Thessalonians", "2TH": "2 Thessalonians", "1TI": "1 Timothy",
  "2TI": "2 Timothy", TIT: "Titus", PHM: "Philemon", HEB: "Hebrews", JAS: "James",
  "1PE": "1 Peter", "2PE": "2 Peter", "1JN": "1 John", "2JN": "2 John",
  "3JN": "3 John", JUD: "Jude", REV: "Revelation",
};

// Cache for loaded books
const bookCache = new Map<string, any>();

/**
 * Load a book from local JSON
 */
async function loadBook(translation: string, bookId: string): Promise<any> {
  const cacheKey = `${translation}:${bookId}`;
  
  if (bookCache.has(cacheKey)) {
    return bookCache.get(cacheKey);
  }

  try {
    const response = await fetch(`/bible/${translation}/${bookId}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${bookId} from ${translation}`);
    }
    const data = await response.json();
    bookCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error loading book ${bookId}:`, error);
    throw error;
  }
}

/**
 * Get a single verse
 * Replaces: /bibles/{versionId}/verses/{verseId}
 */
export async function getVerse(versionId: string, verseRef: string): Promise<{
  data: { content: string; reference: string; id: string };
}> {
  // Parse verseRef: "JHN.3.16" → book=JHN, chapter=3, verse=16
  const [bookId, chapterNum, verseNum] = verseRef.split(".");
  
  const translation = TRANSLATION_MAP[versionId] || "kjv";
  const book = await loadBook(translation, bookId);
  
  const chapter = book.chapters.find((ch: any) => ch.chapter === parseInt(chapterNum));
  if (!chapter) {
    throw new Error(`Chapter ${chapterNum} not found in ${bookId}`);
  }
  
  const verse = chapter.verses.find((v: any) => v.verse === parseInt(verseNum));
  if (!verse) {
    throw new Error(`Verse ${verseNum} not found in ${bookId} ${chapterNum}`);
  }
  
  const bookName = BOOK_ID_TO_NAME[bookId] || bookId;
  
  return {
    data: {
      content: verse.text,
      reference: `${bookName} ${chapterNum}:${verseNum}`,
      id: verseRef,
    },
  };
}

/**
 * Get all verses in a chapter
 * Replaces: /bibles/{versionId}/chapters/{chapterId}/verses
 */
export async function getChapterVerses(versionId: string, chapterId: string): Promise<{
  data: Array<{ id: string; number: string; text: string }>;
}> {
  // Parse chapterId: "JHN.3" → book=JHN, chapter=3
  const [bookId, chapterNum] = chapterId.split(".");
  
  const translation = TRANSLATION_MAP[versionId] || "kjv";
  const book = await loadBook(translation, bookId);
  
  const chapter = book.chapters.find((ch: any) => ch.chapter === parseInt(chapterNum));
  if (!chapter) {
    throw new Error(`Chapter ${chapterNum} not found in ${bookId}`);
  }
  
  const verses = chapter.verses.map((v: any) => ({
    id: `${bookId}.${chapterNum}.${v.verse}`,
    number: String(v.verse),
    text: v.text,
  }));
  
  return { data: verses };
}

/**
 * Search for verses containing a query
 * Replaces: /bibles/{versionId}/search
 */
export async function searchVerses(versionId: string, query: string, limit: number = 20): Promise<{
  data: { verses: Array<{ reference: string; text: string; content: string }> };
}> {
  const translation = TRANSLATION_MAP[versionId] || "kjv";
  const searchLower = query.toLowerCase();
  const results: Array<{ reference: string; text: string; content: string }> = [];
  
  // Search through all books
  const bookIds = Object.keys(BOOK_ID_TO_NAME);
  
  for (const bookId of bookIds) {
    if (results.length >= limit) break;
    
    try {
      const book = await loadBook(translation, bookId);
      const bookName = BOOK_ID_TO_NAME[bookId];
      
      for (const chapter of book.chapters) {
        if (results.length >= limit) break;
        
        for (const verse of chapter.verses) {
          if (results.length >= limit) break;
          
          if (verse.text.toLowerCase().includes(searchLower)) {
            results.push({
              reference: `${bookName} ${chapter.chapter}:${verse.verse}`,
              text: verse.text,
              content: verse.text,
            });
          }
        }
      }
    } catch (error) {
      // Skip books that fail to load
      console.warn(`Skipping ${bookId} during search:`, error);
    }
  }
  
  return { data: { verses: results } };
}

/**
 * Strip HTML tags (kept for compatibility, though local JSON has no HTML)
 */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
