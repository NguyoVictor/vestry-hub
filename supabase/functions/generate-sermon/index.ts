import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildPrompt(params: {
  type: string; style: string; theme: string; scripture: string;
  audience: string; duration: string; draftNotes: string; instructions: string;
}): string {
  const isSermon = params.type === "sermon";
  return `You are an expert ${isSermon ? "sermon" : "Bible study"} writer for a Christian church.

Generate a complete, structured ${isSermon ? "sermon" : "Bible study guide"} with the following details:
- Type: ${isSermon ? "Sermon" : "Bible Study"}
- Style: ${params.style}
- Theme/Topic: ${params.theme || "Not specified"}
- Main Scripture: ${params.scripture || "Not specified"}
- Target Audience: ${params.audience}
- Duration: ${params.duration}
${params.draftNotes ? `- Draft Notes/Foundation: ${params.draftNotes}` : ""}
${params.instructions ? `- Additional Instructions: ${params.instructions}` : ""}

Please provide the following sections clearly labeled:

**TITLE:** [A compelling, specific title]

**SCRIPTURE REFERENCES:** [Main and supporting scriptures]

**INTRODUCTION:** [Engaging opening that hooks the audience, 2-3 paragraphs]

**MAIN POINTS:**
Point 1: [Title]
- Sub-point A: [Detail with scripture support]
- Sub-point B: [Detail with scripture support]
- Illustration: [Real-life story or analogy]
- Application: [Practical takeaway]

Point 2: [Title]
- Sub-point A: [Detail with scripture support]
- Sub-point B: [Detail with scripture support]
- Illustration: [Real-life story or analogy]
- Application: [Practical takeaway]

Point 3: [Title]
- Sub-point A: [Detail with scripture support]
- Sub-point B: [Detail with scripture support]
- Illustration: [Real-life story or analogy]
- Application: [Practical takeaway]

**CONCLUSION:** [Powerful closing that ties everything together, 2 paragraphs]

${isSermon ? "**ALTAR CALL:** [Invitation for salvation or rededication, warm and welcoming]" : "**DISCUSSION QUESTIONS:** [5-7 thought-provoking questions for group discussion]"}

**PREACHER'S NOTES:** [Key reminders, delivery tips, timing suggestions]

Make the content biblically sound, culturally relevant, and spiritually impactful. Write in a warm, pastoral tone appropriate for ${params.audience.toLowerCase()}.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const params = await req.json();

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    return new Response(JSON.stringify({ content }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
