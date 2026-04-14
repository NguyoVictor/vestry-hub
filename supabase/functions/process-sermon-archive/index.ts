import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Text extraction ───────────────────────────────────────────────────────────

async function extractText(fileUrl: string, mimeType: string, fileName: string): Promise<string> {
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);

  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  // Plain text formats — read directly
  if (
    mimeType.includes("text/plain") ||
    mimeType.includes("text/markdown") ||
    ext === "txt" || ext === "md"
  ) {
    return await res.text();
  }

  // RTF — strip RTF control words, extract readable text
  if (mimeType.includes("rtf") || ext === "rtf") {
    const raw = await res.text();
    // Strip RTF control sequences and extract plain text
    const stripped = raw
      .replace(/\{\\[^}]*\}/g, "")          // remove groups like {\fonttbl ...}
      .replace(/\\[a-z]+\d*\s?/g, " ")       // remove control words like \par \b \fs24
      .replace(/[{}\\]/g, " ")               // remove remaining braces and backslashes
      .replace(/\s+/g, " ")
      .trim();
    return stripped;
  }

  // PDF — use Groq to extract/summarize since we can't parse binary in Deno easily
  // We'll send the raw bytes as base64 and ask Groq to extract the text content
  if (mimeType.includes("pdf") || ext === "pdf") {
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Try to extract readable ASCII text from PDF (works for text-based PDFs)
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(bytes);
    // Extract text between BT (begin text) and ET (end text) markers in PDF
    const textChunks: string[] = [];
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let match;
    while ((match = btEtRegex.exec(raw)) !== null) {
      const block = match[1];
      // Extract strings in parentheses (PDF text objects)
      const strRegex = /\(([^)]+)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(block)) !== null) {
        const text = strMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "")
          .replace(/\\t/g, " ")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\");
        if (text.trim().length > 1) textChunks.push(text);
      }
    }
    const extracted = textChunks.join(" ").replace(/\s+/g, " ").trim();
    if (extracted.length > 100) return extracted;
    // Fallback: return raw printable ASCII if PDF parsing yields little
    return raw.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 50000);
  }

  // DOCX — it's a ZIP containing word/document.xml, extract XML text
  if (
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("msword") ||
    ext === "docx" || ext === "doc"
  ) {
    // For DOCX: read as text and extract content between <w:t> tags
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(buffer);
    const textMatches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
    const extracted = textMatches
      .map(t => t.replace(/<[^>]+>/g, ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (extracted.length > 50) return extracted;
    // Fallback for older .doc format
    return raw.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 50000);
  }

  // Fallback — try reading as text
  return await res.text();
}

// ── Summarise with Groq ───────────────────────────────────────────────────────

async function summariseWithGroq(text: string, title: string, groqKey: string): Promise<string> {
  // Truncate to ~8000 chars to stay within token limits
  const truncated = text.slice(0, 8000);

  const prompt = `You are analysing a sermon or teaching document to extract key information about a church's doctrine, message tone, and delivery style.

Document Title: "${title}"

Document Content:
${truncated}

Please extract and summarise:
1. The main theological themes and doctrines taught
2. The preaching/teaching style and tone
3. Key scripture passages used
4. Recurring phrases or language patterns
5. The church's apparent values and beliefs

Keep the summary concise (300-500 words) and focused on what would help an AI generate sermons in this church's voice.`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Groq summarisation error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || truncated;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { archiveId } = await req.json();
    if (!archiveId) {
      return new Response(JSON.stringify({ error: "archiveId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) throw new Error("GROQ_API_KEY not configured");

    // Fetch the archive record
    const { data: archive, error: fetchErr } = await supabase
      .from("sermon_archives")
      .select("*")
      .eq("id", archiveId)
      .single();

    if (fetchErr || !archive) {
      return new Response(JSON.stringify({ error: "Archive not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as processing
    await supabase
      .from("sermon_archives")
      .update({ status: "pending" })
      .eq("id", archiveId);

    // Get a signed URL for the file (bucket is private)
    const { data: signedData, error: signedErr } = await supabase.storage
      .from("sermon-archives")
      .createSignedUrl(archive.storage_path || archive.file_url, 300);

    if (signedErr || !signedData?.signedUrl) {
      throw new Error("Could not generate signed URL for file");
    }

    const rawText = await extractText(
      signedData.signedUrl,
      archive.file_name?.split(".").pop()?.toLowerCase() === "pdf" ? "application/pdf"
        : archive.file_name?.split(".").pop()?.toLowerCase() === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "text/plain",
      archive.file_name || "document.txt"
    );

    if (!rawText || rawText.trim().length < 20) {
      await supabase
        .from("sermon_archives")
        .update({ status: "failed", extracted_text: "Could not extract readable text from this file." })
        .eq("id", archiveId);
      return new Response(JSON.stringify({ error: "Could not extract text" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Summarise with Groq so we have a clean, useful context snippet
    const summary = await summariseWithGroq(rawText, archive.title, groqKey);

    // Save extracted text and mark as processed
    const { error: updateErr } = await supabase
      .from("sermon_archives")
      .update({
        extracted_text: summary,
        status: "processed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", archiveId);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, summary }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Processing failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
