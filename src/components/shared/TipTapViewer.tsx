import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface TipTapViewerProps {
  /** HTML content to display */
  content: string;
  /** Optional additional className for the wrapper */
  className?: string;
}

/**
 * Read-only viewer for TipTap HTML content
 * Sanitizes HTML using DOMPurify for security
 */
export function TipTapViewer({ content, className }: TipTapViewerProps) {
  const [sanitizedContent, setSanitizedContent] = useState("");

  useEffect(() => {
    // Sanitize the HTML content to prevent XSS attacks
    const clean = DOMPurify.sanitize(content, {
      // Allow common formatting tags
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'
      ],
      // Allow safe attributes
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      // Ensure links open in new tab and are safe
      ADD_ATTR: ['target', 'rel'],
      FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror']
    });
    
    setSanitizedContent(clean);
  }, [content]);

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none font-jakarta",
        // Match TipTap editor styling
        "prose-headings:font-semibold prose-headings:text-slate-900 dark:prose-headings:text-slate-100",
        "prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed",
        "prose-a:text-orange-500 prose-a:no-underline hover:prose-a:underline",
        "prose-ul:text-slate-700 dark:prose-ul:text-slate-300",
        "prose-ol:text-slate-700 dark:prose-ol:text-slate-300",
        "prose-li:text-slate-700 dark:prose-li:text-slate-300",
        "prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-400",
        "prose-blockquote:border-l-orange-500",
        "prose-code:text-orange-600 prose-code:bg-orange-50 dark:prose-code:bg-orange-900/20",
        "prose-pre:bg-slate-100 dark:prose-pre:bg-slate-800",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}