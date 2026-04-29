import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, Languages, Eye, Bookmark, BarChart2 } from 'lucide-react';
import { searchVerses } from '@/lib/bibleService';
import { Skeleton } from '@/components/ui/skeleton';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (book: string, chapter: number) => void;
  onTranslationChange: (versionId: string) => void;
  onToggleFocusMode: () => void;
  currentTranslation: string;
}

const ALL_BOOKS = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel",
  "1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs",
  "Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel",
  "Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
  "Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians",
  "Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon",
  "Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
];

const TRANSLATIONS = [
  { id: "de4e12af7f28f599-02", label: "KJV" },
  { id: "06125adad2d5898a-01", label: "WEB" },
  { id: "65eec8e0b60e656b-01", label: "ASV" },
];

/**
 * CommandPalette — ⌘K modal overlay for navigation, search, and commands
 */
export function CommandPalette({
  open,
  onClose,
  onNavigate,
  onTranslationChange,
  onToggleFocusMode,
  currentTranslation,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build command list
  const commands = React.useMemo(() => {
    const cmds: any[] = [];
    
    // Book navigation commands
    ALL_BOOKS.forEach(book => {
      cmds.push({
        type: 'navigate',
        label: `Go to ${book}`,
        book,
        icon: BookOpen,
      });
    });

    // Translation commands
    TRANSLATIONS.forEach(trans => {
      cmds.push({
        type: 'translation',
        label: `Switch to ${trans.label}`,
        versionId: trans.id,
        icon: Languages,
      });
    });

    // Other commands
    cmds.push(
      { type: 'focus', label: 'Toggle Focus Mode', icon: Eye },
      { type: 'bookmarks', label: 'Go to Bookmarks', icon: Bookmark },
      { type: 'progress', label: 'Go to Progress', icon: BarChart2 }
    );

    return cmds;
  }, []);

  // Filter commands based on query
  const filteredCommands = React.useMemo(() => {
    if (!query) return commands.slice(0, 10);
    const lowerQuery = query.toLowerCase();
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);
  }, [query, commands]);

  // Search verses when query length >= 2
  useEffect(() => {
    if (query.length >= 2) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          const results = await searchVerses(currentTranslation, query, 5);
          setSearchResults(results.data.verses);
        } catch (error) {
          console.error('Search failed:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [query, currentTranslation]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setSearchResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = filteredCommands.length + searchResults.length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (index: number) => {
    if (index < filteredCommands.length) {
      const cmd = filteredCommands[index];
      if (cmd.type === 'navigate') {
        onNavigate(cmd.book, 1);
      } else if (cmd.type === 'translation') {
        onTranslationChange(cmd.versionId);
      } else if (cmd.type === 'focus') {
        onToggleFocusMode();
      } else if (cmd.type === 'bookmarks' || cmd.type === 'progress') {
        // Handle tab navigation (would need to be passed as prop)
      }
      onClose();
    } else {
      // Search result selected
      const resultIndex = index - filteredCommands.length;
      const result = searchResults[resultIndex];
      // Parse reference and navigate
      const match = result.reference.match(/^(.+?)\s+(\d+):(\d+)$/);
      if (match) {
        onNavigate(match[1], parseInt(match[2]));
        onClose();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl p-0 font-jakarta"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          <Search className="h-5 w-5 text-slate-400" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands or verses..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            aria-label="Command palette search"
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {/* Commands */}
          {filteredCommands.length > 0 && (
            <div className="py-2">
              <p className="px-4 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Commands
              </p>
              {filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleSelect(index)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      selectedIndex === index
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{cmd.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Search Results */}
          {query.length >= 2 && (
            <div className="py-2 border-t border-slate-100">
              <p className="px-4 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Verse Results
              </p>
              {isSearching ? (
                <div className="px-4 py-2 space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result, index) => {
                  const globalIndex = filteredCommands.length + index;
                  return (
                    <button
                      key={index}
                      onClick={() => handleSelect(globalIndex)}
                      className={`w-full flex flex-col gap-1 px-4 py-2.5 text-left transition-colors ${
                        selectedIndex === globalIndex
                          ? 'bg-orange-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-semibold text-orange-500">
                        {result.reference}
                      </span>
                      <span className="text-sm text-slate-700 line-clamp-2">
                        {result.text}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-4 py-2 text-sm text-slate-400">No verses found</p>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-4">
          <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">Enter</kbd> Select</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">Esc</kbd> Close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
