import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function extractText(fileBytes: Uint8Array, ext: string): Promise<string> {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const raw = decoder.decode(fileBytes);

  if (ext === "txt") {
    return raw;
  }

  if (ext === "pdf") {
    // Extract text between stream markers and readable ASCII
    const textMatches = raw.match(/BT[\s\S]*?ET/g) || [];
    const fromMarkers = textMatches
      .join(" ")
      .replace(/\(([^)]+)\)/g, "$1 ")
      .replace(/[^\x20-\x7E\n]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (fromMarkers.length > 200) return fromMarkers;
    // Fallback: extract all readable ASCII
    return raw.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim();
  }

  if (ext === "docx") {
    // DOCX is a ZIP — extract w:t XML text nodes
    const xmlMatches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
    const text = xmlMatches.map(m => m.replace(/<[^>]+>/g, "")).join(" ").replace(/\s+/g, " ").trim();
    if (text.length > 50) return text;
    // Fallback: extract readable ASCII
    return raw.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim();
  }

  if (ext === "pptx") {
    // PPTX is a ZIP — extract a:t XML text nodes
    const xmlMatches = raw.match(/<a:t>([^<]+)<\/a:t>/g) || [];
    const text = xmlMatches.map(m => m.replace(/<[^>]+>/g, "")).join(" ").replace(/\s+/g, " ").trim();
    if (text.length > 50) return text;
    return raw.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim();
  }

  // Default: return as text
  return raw;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      tenant_id,
      file_path,
      file_base64,   // base64-encoded file content (fallback when storage upload failed)
      file_name,
      file_type,
      grade_level,
      dok_levels,
      question_types,
      num_questions,
      language,
      allow_doc_reading,
    } = await req.json();

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!file_path && !file_base64) {
      return new Response(JSON.stringify({ error: "Either file_path or file_base64 is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Get file bytes — either from storage or base64
    let fileBytes: Uint8Array;

    if (file_path) {
      const { data: fileData, error: downloadErr } = await supabase.storage
        .from("quiz-documents")
        .download(file_path);

      if (downloadErr || !fileData) {
        return new Response(JSON.stringify({ error: `Failed to download file: ${downloadErr?.message}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const buffer = await fileData.arrayBuffer();
      fileBytes = new Uint8Array(buffer);
    } else {
      // Decode base64
      const binaryStr = atob(file_base64);
      fileBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        fileBytes[i] = binaryStr.charCodeAt(i);
      }
    }

    const ext = (file_type || file_name?.split(".").pop() || "txt").toLowerCase();
    const extractedText = await extractText(fileBytes, ext);
    const truncated = extractedText.slice(0, 12000);

    if (truncated.trim().length < 30) {
      return new Response(JSON.stringify({ error: "Could not extract enough text from the document. Please try a TXT or DOCX file." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Groq prompt
    const resolvedCount = (!num_questions || num_questions === "auto") ? 10 : Number(num_questions);
    const dokStr = Array.isArray(dok_levels) && dok_levels.length > 0 ? dok_levels.join(", ") : "Level 1";
    const typesStr = Array.isArray(question_types) && question_types.length > 0 ? question_types.join(", ") : "MCQ";

    const systemPrompt = `You are an expert educational assessment creator. Generate quiz questions strictly following the specifications. Return ONLY a valid JSON array — no markdown fences, no explanation, no preamble. Start your response with [ and end with ].`;

    const userPrompt = `Generate exactly ${resolvedCount} quiz questions based on this document.

SPECIFICATIONS:
- Grade Level: ${grade_level || "University"}
- Depth of Knowledge: ${dokStr}
- Question Types to use: ${typesStr}
- Output Language: ${language || "English"}
- Total questions: ${resolvedCount}

DOCUMENT:
${truncated}

RETURN FORMAT — a JSON array of ${resolvedCount} objects. Use these formats based on type:

MCQ: {"type":"MCQ","text":"Question?","options":["A","B","C","D"],"correctIndex":0,"correctAnswer":"A","dok":"Level 1","points":1,"timeLimit":30}
Fill in the blank: {"type":"Fill in the blank","text":"The ___ is the foundation.","correctAnswer":"Bible","dok":"Level 1","points":1,"timeLimit":30}
Open: {"type":"Open","text":"Explain the significance of...","modelAnswer":"A good answer includes...","dok":"Level 3","points":5,"timeLimit":120}
Passage: {"type":"Passage","passage":"Short passage text here...","text":"According to the passage...","options":["A","B","C","D"],"correctIndex":0,"correctAnswer":"A","dok":"Level 2","points":2,"timeLimit":60}

Rules:
- Distribute question types proportionally across ${resolvedCount} questions based on: ${typesStr}
- Match ${grade_level || "University"} vocabulary and complexity
- Write everything in ${language || "English"}
- Return EXACTLY ${resolvedCount} questions`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 4096,
        temperature: 0.6,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Groq error ${groqRes.status}: ${errText.slice(0, 300)}`);
    }

    const groqData = await groqRes.json();
    const rawContent: string = groqData.choices?.[0]?.message?.content ?? "";

    // Parse JSON — find the array
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error(`AI did not return valid JSON. Response preview: ${rawContent.slice(0, 200)}`);
    }

    const questions = JSON.parse(jsonMatch[0]);

    // Clean up temp file from storage if it was uploaded there
    if (file_path) {
      await supabase.storage.from("quiz-documents").remove([file_path]).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, questions, count: questions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("generate-quiz error:", String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
