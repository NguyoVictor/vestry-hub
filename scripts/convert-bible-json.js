import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSLATIONS = ['kjv', 'web', 'asv'];

// All 66 books in order
const BOOKS = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
  '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
  'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
  'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL', 'MAT',
  'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP',
  'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE',
  '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'
];

console.log('🔄 Starting Bible JSON conversion...\n');

TRANSLATIONS.forEach(translation => {
  const inputPath = path.join(__dirname, `../public/bible/${translation}.json`);
  const outputDir = path.join(__dirname, `../public/bible/${translation}`);

  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️  ${translation}.json not found, skipping...`);
    return;
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`📖 Processing ${translation.toUpperCase()}...`);

  try {
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    
    // The JSON structure has metadata and verses array
    if (!data.verses || !Array.isArray(data.verses)) {
      console.log(`❌ No verses array found in ${translation}`);
      return;
    }

    // Group verses by book number
    const bookMap = new Map();
    
    data.verses.forEach(verse => {
      const bookNum = verse.book;
      
      if (!bookMap.has(bookNum)) {
        bookMap.set(bookNum, {
          book_name: verse.book_name,
          book: bookNum,
          chapters: {}
        });
      }
      
      const book = bookMap.get(bookNum);
      const chapterNum = verse.chapter;
      
      if (!book.chapters[chapterNum]) {
        book.chapters[chapterNum] = [];
      }
      
      book.chapters[chapterNum].push({
        verse: verse.verse,
        text: verse.text
      });
    });

    // Book number to abbreviation mapping (66 books)
    const bookAbbreviations = [
      'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
      '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
      'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
      'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL', 'MAT',
      'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP',
      'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE',
      '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'
    ];

    let successCount = 0;

    // Save each book as a separate file
    bookMap.forEach((book, bookNum) => {
      const bookAbbr = bookAbbreviations[bookNum - 1];
      
      if (!bookAbbr) {
        console.log(`⚠️  Unknown book number ${bookNum}`);
        return;
      }

      const fileName = `${bookAbbr}.json`;
      const outputPath = path.join(outputDir, fileName);
      
      // Convert chapters object to array format
      const chaptersArray = Object.keys(book.chapters)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(chapterNum => ({
          chapter: parseInt(chapterNum),
          verses: book.chapters[chapterNum]
        }));
      
      const bookData = {
        book_name: book.book_name,
        book: book.book,
        abbreviation: bookAbbr,
        chapters: chaptersArray
      };
      
      fs.writeFileSync(
        outputPath,
        JSON.stringify(bookData, null, 2)
      );
      
      successCount++;
    });

    console.log(`✅ Created ${successCount} book files for ${translation.toUpperCase()}`);
    console.log(`   Location: public/bible/${translation}/\n`);

  } catch (error) {
    console.error(`❌ Error processing ${translation}:`, error.message);
  }
});

console.log('✨ Conversion complete!\n');
console.log('📁 Files created in:');
console.log('   - public/bible/kjv/');
console.log('   - public/bible/web/');
console.log('   - public/bible/asv/');
