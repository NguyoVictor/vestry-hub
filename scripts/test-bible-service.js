/**
 * Test script to verify Bible service works correctly
 * Run with: node scripts/test-bible-service.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Bible Service...\n');

// Test 1: Check if all book files exist
console.log('📚 Test 1: Checking book files...');
const translations = ['kjv', 'web', 'asv'];
const bookIds = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
  '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
  'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
  'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL', 'MAT',
  'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP',
  'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE',
  '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'
];

let totalFiles = 0;
let missingFiles = 0;

translations.forEach(translation => {
  const dir = path.join(__dirname, `../public/bible/${translation}`);
  
  if (!fs.existsSync(dir)) {
    console.log(`❌ Directory missing: ${translation}/`);
    missingFiles += 66;
    return;
  }
  
  bookIds.forEach(bookId => {
    const filePath = path.join(dir, `${bookId}.json`);
    totalFiles++;
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Missing: ${translation}/${bookId}.json`);
      missingFiles++;
    }
  });
});

console.log(`✅ Found ${totalFiles - missingFiles}/${totalFiles} book files`);
if (missingFiles > 0) {
  console.log(`⚠️  ${missingFiles} files missing!\n`);
  process.exit(1);
}

// Test 2: Verify JSON structure
console.log('\n📖 Test 2: Verifying JSON structure...');
const testBook = path.join(__dirname, '../public/bible/kjv/GEN.json');
const genesis = JSON.parse(fs.readFileSync(testBook, 'utf8'));

const requiredFields = ['book_name', 'book', 'abbreviation', 'chapters'];
const hasAllFields = requiredFields.every(field => genesis.hasOwnProperty(field));

if (!hasAllFields) {
  console.log('❌ Missing required fields in book structure');
  process.exit(1);
}

if (!Array.isArray(genesis.chapters) || genesis.chapters.length === 0) {
  console.log('❌ Chapters array is invalid');
  process.exit(1);
}

const firstChapter = genesis.chapters[0];
if (!firstChapter.chapter || !Array.isArray(firstChapter.verses)) {
  console.log('❌ Chapter structure is invalid');
  process.exit(1);
}

const firstVerse = firstChapter.verses[0];
if (!firstVerse.verse || !firstVerse.text) {
  console.log('❌ Verse structure is invalid');
  process.exit(1);
}

console.log('✅ JSON structure is valid');
console.log(`   Book: ${genesis.book_name}`);
console.log(`   Chapters: ${genesis.chapters.length}`);
console.log(`   First verse: "${firstVerse.text.substring(0, 50)}..."`);

// Test 3: Verify famous verses exist
console.log('\n🔍 Test 3: Checking famous verses...');
const famousVerses = [
  { book: 'JHN', chapter: 3, verse: 16, text: 'For God so loved the world' },
  { book: 'PSA', chapter: 23, verse: 1, text: 'my shepherd' },
  { book: 'GEN', chapter: 1, verse: 1, text: 'In the beginning' },
];

let verseTestsPassed = 0;

famousVerses.forEach(test => {
  const bookPath = path.join(__dirname, `../public/bible/kjv/${test.book}.json`);
  const book = JSON.parse(fs.readFileSync(bookPath, 'utf8'));
  const chapter = book.chapters.find(ch => ch.chapter === test.chapter);
  
  if (!chapter) {
    console.log(`❌ Chapter ${test.chapter} not found in ${test.book}`);
    return;
  }
  
  const verse = chapter.verses.find(v => v.verse === test.verse);
  
  if (!verse) {
    console.log(`❌ Verse ${test.verse} not found in ${test.book} ${test.chapter}`);
    return;
  }
  
  if (!verse.text.toLowerCase().includes(test.text.toLowerCase())) {
    console.log(`❌ Verse text doesn't match for ${test.book} ${test.chapter}:${test.verse}`);
    console.log(`   Expected: "${test.text}"`);
    console.log(`   Got: "${verse.text.substring(0, 50)}..."`);
    return;
  }
  
  console.log(`✅ ${test.book} ${test.chapter}:${test.verse} - "${verse.text.substring(0, 40)}..."`);
  verseTestsPassed++;
});

if (verseTestsPassed !== famousVerses.length) {
  console.log(`\n❌ Only ${verseTestsPassed}/${famousVerses.length} verse tests passed`);
  process.exit(1);
}

// Test 4: Check file sizes
console.log('\n📊 Test 4: Checking file sizes...');
let totalSize = 0;
let largestFile = { name: '', size: 0 };

translations.forEach(translation => {
  bookIds.forEach(bookId => {
    const filePath = path.join(__dirname, `../public/bible/${translation}/${bookId}.json`);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
      
      if (stats.size > largestFile.size) {
        largestFile = { name: `${translation}/${bookId}.json`, size: stats.size };
      }
    }
  });
});

const totalMB = (totalSize / 1024 / 1024).toFixed(2);
const largestKB = (largestFile.size / 1024).toFixed(2);

console.log(`✅ Total size: ${totalMB} MB`);
console.log(`   Largest file: ${largestFile.name} (${largestKB} KB)`);

if (totalSize > 50 * 1024 * 1024) {
  console.log('⚠️  Warning: Total size exceeds 50MB');
}

// All tests passed!
console.log('\n✨ All tests passed! Bible service is ready to use.\n');
console.log('📝 Summary:');
console.log(`   - ${totalFiles} book files across ${translations.length} translations`);
console.log(`   - Total size: ${totalMB} MB`);
console.log(`   - All famous verses verified`);
console.log(`   - JSON structure validated`);
console.log('\n🎉 Migration successful! You can now use the Bible Explorer.\n');
