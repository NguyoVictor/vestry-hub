# Bible Data Structure

This directory contains offline Bible translations in JSON format for the Vestry Hub Bible Explorer.

## Available Translations

- **KJV** (King James Version) - 1611/1769 Edition
- **WEB** (World English Bible) - Public Domain
- **ASV** (American Standard Version) - 1901 Edition

## Directory Structure

```
public/bible/
├── kjv/
│   ├── GEN.json
│   ├── EXO.json
│   └── ... (66 books)
├── web/
│   ├── GEN.json
│   ├── EXO.json
│   └── ... (66 books)
├── asv/
│   ├── GEN.json
│   ├── EXO.json
│   └── ... (66 books)
├── kjv.json (source file)
├── web.json (source file)
└── asv.json (source file)
```

## JSON Structure

Each book file follows this structure:

```json
{
  "book_name": "Genesis",
  "book": 1,
  "abbreviation": "GEN",
  "chapters": [
    {
      "chapter": 1,
      "verses": [
        {
          "verse": 1,
          "text": "In the beginning God created the heaven and the earth."
        },
        {
          "verse": 2,
          "text": "And the earth was without form..."
        }
      ]
    }
  ]
}
```

## Book Abbreviations

### Old Testament (39 books)
- GEN, EXO, LEV, NUM, DEU
- JOS, JDG, RUT, 1SA, 2SA
- 1KI, 2KI, 1CH, 2CH, EZR
- NEH, EST, JOB, PSA, PRO
- ECC, SNG, ISA, JER, LAM
- EZK, DAN, HOS, JOL, AMO
- OBA, JON, MIC, NAM, HAB
- ZEP, HAG, ZEC, MAL

### New Testament (27 books)
- MAT, MRK, LUK, JHN, ACT
- ROM, 1CO, 2CO, GAL, EPH
- PHP, COL, 1TH, 2TH, 1TI
- 2TI, TIT, PHM, HEB, JAS
- 1PE, 2PE, 1JN, 2JN, 3JN
- JUD, REV

## Usage in Code

```typescript
// Load a specific book
const response = await fetch('/bible/kjv/GEN.json');
const genesis = await response.json();

// Access verses
const firstVerse = genesis.chapters[0].verses[0];
console.log(firstVerse.text); // "In the beginning..."
```

## Regenerating Book Files

If you need to regenerate the individual book files from the source JSON files:

```bash
node scripts/convert-bible-json.js
```

This script will:
1. Read the source files (kjv.json, web.json, asv.json)
2. Group verses by book
3. Create individual JSON files for each of the 66 books
4. Save them in the respective translation folders

## Copyright & Licensing

- **KJV**: Public Domain in most countries. Under perpetual Crown copyright in the UK.
- **WEB**: Public Domain worldwide
- **ASV**: Public Domain worldwide

All translations are free to use for non-commercial and commercial purposes.

## Data Source

These Bible translations were imported from Bible Analyzer:
https://www.bibleanalyzer.com/download.htm
