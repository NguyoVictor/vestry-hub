import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Style instructions ────────────────────────────────────────────────────────

const STYLE_INSTRUCTIONS: Record<string, string> = {
  expository:
    "Use a verse-by-verse expository approach. Unpack the scripture deeply with scholarly analysis. " +
    "Explain the original context, meaning of key words, and theological significance. " +
    "Each main point should flow directly from the text.",
  topical:
    "Use a topical approach. Build the entire sermon around one central theme or question. " +
    "Draw from multiple scriptures across the Bible that all speak to this topic. " +
    "Make it practical and show how the theme applies to everyday life.",
  narrative:
    "Use a narrative storytelling approach. Open with a compelling story and weave stories throughout. " +
    "Use real-life illustrations, parables, and vivid descriptions heavily. " +
    "The sermon should feel like a journey the listener is taken on.",
  devotional:
    "Use a warm, personal, devotional tone. Keep points shorter and more reflective. " +
    "Focus heavily on personal application and spiritual growth. " +
    "Write as if speaking intimately to each individual listener.",
  apologetic:
    "Use a logical, evidence-based apologetic approach. Address common doubts and questions about faith. " +
    "Use reason, historical evidence, and scripture together. " +
    "Anticipate objections and answer them clearly and respectfully.",
  evangelistic:
    "Use a conversational, welcoming evangelistic tone aimed at non-believers or seekers. " +
    "Avoid church jargon. Explain concepts simply. " +
    "Build toward a clear, warm salvation message and invitation at the end.",
};

const AUDIENCE_INSTRUCTIONS: Record<string, string> = {
  "general congregation":
    "Write for a mixed-age, inclusive congregation. Use broad applications that speak to all life stages.",
  youth:
    "Write for teenagers and young adults. Use energetic language, pop culture references where appropriate, " +
    "short punchy points, and relatable real-life scenarios.",
  children:
    "Write for children. Use very simple language, short sentences, object lessons, and stories. " +
    "Every point must be immediately understandable to a child.",
  men:
    "Write for men. Use direct, action-oriented language. Emphasise leadership, responsibility, " +
    "integrity, and practical steps. Avoid overly emotional language.",
  women:
    "Write for women. Use nurturing, community-focused language with emotional depth. " +
    "Emphasise relationships, identity, and practical daily application.",
  couples:
    "Write for married couples or those in relationships. Focus on relationship dynamics, " +
    "marriage themes, communication, and practical partnership applications from scripture.",
  leaders:
    "Write for church leaders and ministry workers. Include deeper theological depth, " +
    "leadership principles, stewardship of responsibility, and equipping language.",
};

const DURATION_INSTRUCTIONS: Record<string, string> = {
  "15 minutes":
    "This is a SHORT sermon (15 minutes). Write a brief outline with exactly 2 main points. " +
    "Keep illustrations short (1-2 sentences each). Total content should be 600-800 words.",
  "30 minutes":
    "This is a STANDARD sermon (30 minutes). Write a standard outline with exactly 3 main points. " +
    "Include moderate illustrations (3-5 sentences each). Total content should be 1200-1500 words.",
  "45 minutes":
    "This is a DETAILED sermon (45 minutes). Write a detailed outline with 3-4 main points. " +
    "Include full illustrations with development. Total content should be 1800-2200 words.",
  "60 minutes":
    "This is a COMPREHENSIVE sermon (60 minutes). Write a comprehensive outline with 4-5 main points. " +
    "Include extensive illustrations, sub-points, and application sections. Total content should be 2500-3000 words.",
};

function generateMainPointsTemplate(duration: string): string {
  const count = duration === "15 minutes" ? 2 : duration === "60 minutes" ? 5 : duration === "45 minutes" ? 4 : 3;
  return Array.from({ length: count }, (_, i) =>
    `MAIN POINT ${i + 1}:\n[Point title and explanation]\n\nScripture Support:\n[Key verse(s) for this point]\n\nIllustration:\n[Story or real-life example]\n\nApplication:\n[Practical takeaway for the listener]`
  ).join("\n\n");
}

function generateBibleStudyTemplate(duration: string): string {
  const count = duration === "15 minutes" ? 2 : duration === "60 minutes" ? 5 : duration === "45 minutes" ? 4 : 3;
  return Array.from({ length: count }, (_, i) =>
    `STUDY SECTION ${i + 1}:\n[Section title and key teaching]\n\nKey Verse:\n[Scripture reference and text]\n\nExplanation:\n[What this passage means in context]\n\nApplication:\n[How this applies to daily life]`
  ).join("\n\n");
}

function buildPrompt(params: {
  type: string; style: string; theme: string; scripture: string;
  audience: string; duration: string; draftNotes: string; instructions: string;
  churchContext: string;
}): string {
  const isSermon = params.type === "sermon";
  const styleKey = params.style.toLowerCase();
  const audienceKey = params.audience.toLowerCase();
  const durationKey = params.duration.toLowerCase();

  const styleGuide = STYLE_INSTRUCTIONS[styleKey] || STYLE_INSTRUCTIONS["expository"];
  const audienceGuide = AUDIENCE_INSTRUCTIONS[audienceKey] || AUDIENCE_INSTRUCTIONS["general congregation"];
  const durationGuide = DURATION_INSTRUCTIONS[durationKey] || DURATION_INSTRUCTIONS["30 minutes"];

  const mandatoryNotes = (params.draftNotes || params.instructions)
    ? `\nMANDATORY PASTOR REQUIREMENTS — you MUST incorporate ALL of the following exactly as specified:\n` +
      (params.draftNotes ? `Draft Notes: ${params.draftNotes}\n` : "") +
      (params.instructions ? `Additional Instructions: ${params.instructions}\n` : "")
    : "";

  const churchContextSection = params.churchContext
    ? `\nCHURCH VOICE & DOCTRINE CONTEXT:\nThe following is extracted from this church's own sermon archives. Use this to match their specific doctrine, tone, language patterns, and delivery style:\n\n${params.churchContext}\n`
    : "";

  return `You are an expert ${isSermon ? "sermon" : "Bible study"} writer for a Christian church.

CRITICAL FORMATTING RULES — follow these exactly:
- Return clean plain text only. No markdown. No asterisks. No ** bold markers. No # headers.
- Use plain section labels followed by a colon, like: TITLE:, INTRODUCTION:, MAIN POINT 1:, etc.
- Separate each section with a blank line.
- Do not use bullet points with dashes or asterisks. Use numbered lists or plain paragraphs instead.

STYLE: ${params.style}
${styleGuide}

AUDIENCE: ${params.audience}
${audienceGuide}

LENGTH AND DEPTH:
${durationGuide}
${churchContextSection}
CONTENT DETAILS:
- Type: ${isSermon ? "Full Sermon" : "Bible Study Guide"}
- Theme/Topic: ${params.theme || "Not specified — choose a relevant theme from the scripture"}
- Main Scripture: ${params.scripture || "Choose an appropriate scripture for the theme"}
${mandatoryNotes}
Now generate the complete ${isSermon ? "sermon" : "Bible study"} using this exact structure:

TITLE:
[A compelling, specific title — no quotes, no markdown]

SCRIPTURE REFERENCES:
[Main scripture and 2-3 supporting scriptures, written as plain text]

INTRODUCTION:
[Engaging opening appropriate for the audience and style. Hook the listener immediately.]

${isSermon ? generateMainPointsTemplate(durationKey) : generateBibleStudyTemplate(durationKey)}

CONCLUSION:
[Powerful closing that ties all points together. Call the congregation to action or reflection.]

${isSermon
  ? "ALTAR CALL:\n[A warm, sincere invitation. For evangelistic style make this the centrepiece. For other styles keep it brief but genuine.]"
  : "DISCUSSION QUESTIONS:\n[5-7 thought-provoking questions for group discussion, numbered plainly]"}

PREACHER'S NOTES:
[Key delivery reminders, timing suggestions, and any special notes for the pastor]`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const params = await req.json();

    // Check AI usage limits if tenantId is provided
    if (params.tenantId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data: subscription } = await supabase
        .from("tenant_subscriptions")
        .select("ai_credits, ai_addons, ai_used")
        .eq("tenant_id", params.tenantId)
        .maybeSingle();

      if (subscription) {
        const aiLimit = (subscription.ai_credits || 0) + (subscription.ai_addons || 0);
        const aiUsed = subscription.ai_used || 0;
        
        if (aiUsed >= aiLimit) {
          return new Response(JSON.stringify({ 
            error: "AI credit limit reached. Top up to continue.",
            limit_reached: true 
          }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch processed sermon archives for this tenant to inject as church context
    let churchContext = "";
    if (params.tenantId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: archives } = await supabase
        .from("sermon_archives")
        .select("title, category, extracted_text")
        .eq("tenant_id", params.tenantId)
        .eq("status", "processed")
        .not("extracted_text", "is", null)
        .limit(5); // Use up to 5 archives to stay within token limits

      if (archives && archives.length > 0) {
        churchContext = archives
          .map((a: any) => `[Archive: ${a.title} — Category: ${a.category}]\n${a.extracted_text}`)
          .join("\n\n---\n\n")
          .slice(0, 6000); // Cap at 6000 chars to leave room for the prompt
      }
    }

    const prompt = buildPrompt({
      type: params.type || "sermon",
      style: params.style || "Expository",
      theme: params.theme || "",
      scripture: params.scripture || "",
      audience: params.audience || "General Congregation",
      duration: params.duration || "30 minutes",
      draftNotes: params.draftNotes || "",
      instructions: params.instructions || "",
      churchContext,
    });

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return new Response(JSON.stringify({ error: `Groq error: ${groqRes.status}`, detail: errText }), {
        status: groqRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await groqRes.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Increment AI usage after successful call
    if (params.tenantId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data: subscription } = await supabase
        .from("tenant_subscriptions")
        .select("ai_used")
        .eq("tenant_id", params.tenantId)
        .maybeSingle();

      if (subscription) {
        await supabase
          .from("tenant_subscriptions")
          .update({ 
            ai_used: (subscription.ai_used || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq("tenant_id", params.tenantId);
      }
    }

    return new Response(JSON.stringify({ content }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
