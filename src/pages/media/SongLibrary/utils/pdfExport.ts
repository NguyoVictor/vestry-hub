/**
 * PDF Export Utility for Setlists
 * Generates formatted PDF documents for printing
 */

import type { Setlist, SetlistItem, Song } from '@/types/song-library';

// We'll use jsPDF for PDF generation
// Note: This will need to be lazy-loaded in the component
export interface PDFExportOptions {
  includeChords: boolean;
  includeLyrics: boolean;
  includeNotes: boolean;
  includeMetadata: boolean;
  pageSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  fontSize: number;
  includePageNumbers: boolean;
  includeCoverPage: boolean;
}

const DEFAULT_OPTIONS: PDFExportOptions = {
  includeChords: true,
  includeLyrics: false,
  includeNotes: true,
  includeMetadata: true,
  pageSize: 'letter',
  orientation: 'portrait',
  fontSize: 12,
  includePageNumbers: true,
  includeCoverPage: true,
};

/**
 * Generate PDF content for a setlist
 * Returns HTML string that can be converted to PDF
 */
export function generateSetlistPDFContent(
  setlist: Setlist,
  options: Partial<PDFExportOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const html: string[] = [];
  
  // Add styles
  html.push(`
    <style>
      @page {
        size: ${opts.pageSize} ${opts.orientation};
        margin: 1in;
      }
      
      body {
        font-family: 'Arial', sans-serif;
        font-size: ${opts.fontSize}pt;
        line-height: 1.6;
        color: #000;
      }
      
      .cover-page {
        page-break-after: always;
        text-align: center;
        padding-top: 3in;
      }
      
      .cover-title {
        font-size: 24pt;
        font-weight: bold;
        margin-bottom: 0.5in;
      }
      
      .cover-date {
        font-size: 14pt;
        color: #666;
        margin-bottom: 0.25in;
      }
      
      .cover-metadata {
        font-size: 12pt;
        color: #666;
      }
      
      .song-item {
        page-break-inside: avoid;
        margin-bottom: 1.5em;
        border-bottom: 1px solid #ddd;
        padding-bottom: 1em;
      }
      
      .song-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 0.5em;
      }
      
      .song-number {
        font-weight: bold;
        color: #666;
        margin-right: 0.5em;
      }
      
      .song-title {
        font-size: ${opts.fontSize + 2}pt;
        font-weight: bold;
        flex: 1;
      }
      
      .song-metadata {
        font-size: ${opts.fontSize - 1}pt;
        color: #666;
        display: flex;
        gap: 1em;
      }
      
      .song-artist {
        font-style: italic;
        color: #666;
        margin-bottom: 0.5em;
      }
      
      .song-chords {
        font-family: 'Courier New', monospace;
        white-space: pre-wrap;
        background: #f5f5f5;
        padding: 0.5em;
        border-radius: 4px;
        margin-bottom: 0.5em;
      }
      
      .song-lyrics {
        white-space: pre-wrap;
        margin-bottom: 0.5em;
      }
      
      .song-notes {
        font-size: ${opts.fontSize - 1}pt;
        font-style: italic;
        color: #666;
        background: #fffbeb;
        padding: 0.5em;
        border-left: 3px solid #f59e0b;
        margin-top: 0.5em;
      }
      
      .setlist-summary {
        margin-top: 2em;
        padding-top: 1em;
        border-top: 2px solid #000;
      }
      
      .summary-title {
        font-weight: bold;
        margin-bottom: 0.5em;
      }
      
      .key-transitions {
        margin-top: 1em;
      }
      
      .transition-item {
        margin-bottom: 0.25em;
        font-size: ${opts.fontSize - 1}pt;
      }
      
      .page-number {
        position: fixed;
        bottom: 0.5in;
        right: 0.5in;
        font-size: ${opts.fontSize - 2}pt;
        color: #666;
      }
      
      @media print {
        .page-break {
          page-break-before: always;
        }
      }
    </style>
  `);
  
  // Add cover page
  if (opts.includeCoverPage) {
    html.push('<div class="cover-page">');
    html.push(`<div class="cover-title">${escapeHtml(setlist.name)}</div>`);
    
    if (setlist.service_date) {
      const date = new Date(setlist.service_date);
      html.push(`<div class="cover-date">${formatDate(date)}</div>`);
    }
    
    if (opts.includeMetadata) {
      html.push('<div class="cover-metadata">');
      if (setlist.service_type) {
        html.push(`<div>Service Type: ${setlist.service_type}</div>`);
      }
      if (setlist.total_duration) {
        html.push(`<div>Total Duration: ${formatDuration(setlist.total_duration)}</div>`);
      }
      html.push(`<div>Songs: ${setlist.items.length}</div>`);
      html.push('</div>');
    }
    
    html.push('</div>');
  }
  
  // Add songs
  setlist.items.forEach((item, index) => {
    const song = item.song;
    if (!song) return;
    
    html.push('<div class="song-item">');
    
    // Song header
    html.push('<div class="song-header">');
    html.push(`<span class="song-number">${index + 1}.</span>`);
    html.push(`<span class="song-title">${escapeHtml(song.title)}</span>`);
    
    if (opts.includeMetadata) {
      html.push('<div class="song-metadata">');
      
      const key = item.key_override || song.key;
      if (key) {
        html.push(`<span>Key: ${key}</span>`);
      }
      
      const bpm = item.tempo_override || song.bpm;
      if (bpm) {
        html.push(`<span>BPM: ${bpm}</span>`);
      }
      
      if (song.time_signature) {
        html.push(`<span>Time: ${song.time_signature}</span>`);
      }
      
      const duration = item.duration_override || song.duration_seconds;
      if (duration) {
        html.push(`<span>${formatDuration(duration)}</span>`);
      }
      
      html.push('</div>');
    }
    
    html.push('</div>');
    
    // Artist
    if (song.artist) {
      html.push(`<div class="song-artist">${escapeHtml(song.artist)}</div>`);
    }
    
    // Chords
    if (opts.includeChords && song.chords) {
      html.push(`<div class="song-chords">${escapeHtml(song.chords)}</div>`);
    }
    
    // Lyrics
    if (opts.includeLyrics && song.lyrics) {
      html.push(`<div class="song-lyrics">${escapeHtml(song.lyrics)}</div>`);
    }
    
    // Notes
    if (opts.includeNotes) {
      const notes: string[] = [];
      if (item.notes) notes.push(item.notes);
      if (item.intro_notes) notes.push(`Intro: ${item.intro_notes}`);
      if (item.outro_notes) notes.push(`Outro: ${item.outro_notes}`);
      
      if (notes.length > 0) {
        html.push(`<div class="song-notes">${escapeHtml(notes.join(' • '))}</div>`);
      }
    }
    
    html.push('</div>');
  });
  
  // Add summary
  if (opts.includeMetadata && setlist.key_transitions && setlist.key_transitions.length > 0) {
    html.push('<div class="setlist-summary">');
    html.push('<div class="summary-title">Key Transitions</div>');
    html.push('<div class="key-transitions">');
    
    setlist.key_transitions.forEach((transition) => {
      const fromSong = setlist.items.find(i => i.song_id === transition.from_song_id)?.song;
      const toSong = setlist.items.find(i => i.song_id === transition.to_song_id)?.song;
      
      if (fromSong && toSong) {
        html.push(`
          <div class="transition-item">
            ${escapeHtml(fromSong.title)} (${transition.from_key}) → 
            ${escapeHtml(toSong.title)} (${transition.to_key}) 
            [${Math.abs(transition.semitone_difference)} semitones]
          </div>
        `);
      }
    });
    
    html.push('</div>');
    html.push('</div>');
  }
  
  return html.join('\n');
}

/**
 * Export setlist to PDF using browser print
 */
export function exportSetlistToPDF(
  setlist: Setlist,
  options: Partial<PDFExportOptions> = {}
): void {
  const content = generateSetlistPDFContent(setlist, options);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow popups.');
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(setlist.name)}</title>
        ${content}
      </head>
      <body>
        ${content}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.print();
  };
}

/**
 * Generate PDF blob for download (requires jsPDF)
 */
export async function generateSetlistPDFBlob(
  setlist: Setlist,
  options: Partial<PDFExportOptions> = {}
): Promise<Blob> {
  // Lazy load jsPDF
  const { default: jsPDF } = await import('jspdf');
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'pt',
    format: opts.pageSize,
  });
  
  let yPosition = 72; // 1 inch margin
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 72;
  const contentWidth = pageWidth - (margin * 2);
  
  // Cover page
  if (opts.includeCoverPage) {
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(setlist.name, pageWidth / 2, pageHeight / 3, { align: 'center' });
    
    if (setlist.service_date) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      const date = new Date(setlist.service_date);
      doc.text(formatDate(date), pageWidth / 2, pageHeight / 3 + 30, { align: 'center' });
    }
    
    doc.addPage();
    yPosition = margin;
  }
  
  // Songs
  setlist.items.forEach((item, index) => {
    const song = item.song;
    if (!song) return;
    
    // Check if we need a new page
    if (yPosition > pageHeight - margin - 100) {
      doc.addPage();
      yPosition = margin;
    }
    
    // Song number and title
    doc.setFontSize(opts.fontSize + 2);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${song.title}`, margin, yPosition);
    yPosition += 20;
    
    // Artist
    if (song.artist) {
      doc.setFontSize(opts.fontSize);
      doc.setFont('helvetica', 'italic');
      doc.text(song.artist, margin, yPosition);
      yPosition += 15;
    }
    
    // Metadata
    if (opts.includeMetadata) {
      doc.setFontSize(opts.fontSize - 1);
      doc.setFont('helvetica', 'normal');
      const metadata: string[] = [];
      
      const key = item.key_override || song.key;
      if (key) metadata.push(`Key: ${key}`);
      
      const bpm = item.tempo_override || song.bpm;
      if (bpm) metadata.push(`BPM: ${bpm}`);
      
      if (song.time_signature) metadata.push(`Time: ${song.time_signature}`);
      
      if (metadata.length > 0) {
        doc.text(metadata.join(' • '), margin, yPosition);
        yPosition += 15;
      }
    }
    
    yPosition += 10;
    
    // Chords
    if (opts.includeChords && song.chords) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(opts.fontSize - 1);
      const chordLines = song.chords.split('\n');
      chordLines.forEach(line => {
        if (yPosition > pageHeight - margin - 20) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 12;
      });
      yPosition += 5;
    }
    
    // Notes
    if (opts.includeNotes && item.notes) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(opts.fontSize - 1);
      const noteLines = doc.splitTextToSize(item.notes, contentWidth);
      noteLines.forEach((line: string) => {
        if (yPosition > pageHeight - margin - 20) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 12;
      });
    }
    
    yPosition += 20;
  });
  
  return doc.output('blob');
}

/**
 * Download PDF file
 */
export async function downloadSetlistPDF(
  setlist: Setlist,
  options: Partial<PDFExportOptions> = {}
): Promise<void> {
  const blob = await generateSetlistPDFBlob(setlist, options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const filename = `${setlist.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Helper functions
 */

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
