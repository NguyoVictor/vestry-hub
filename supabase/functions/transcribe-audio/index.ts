import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const formData = await req.formData();
    const audioFile = formData.get("file") as File;
    const formatPrompt = formData.get("formatPrompt") as string | null;

    if (!audioFile) {
      return new Response(JSON.stringify({ error: "Audio file is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Transcribe with Whisper
    const transcribeFormData = new FormData();
    transcribeFormData.append("file", audioFile);
    transcribeFormData.append("model", "whisper-large-v3");
    transcribeFormData.append("response_format", "text");

    const transcribeResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
      },
      body: transcribeFormData,
    });

    if (!transcribeResponse.ok) {
      const errText = await transcribeResponse.text();
      return new Response(
        JSON.stringify({ error: `Transcription failed: ${transcribeResponse.status}`, detail: errText }),
        {
          status: transcribeResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const transcript = await transcribeResponse.text();

    if (!transcript.trim()) {
      return new Response(JSON.stringify({ error: "Empty transcription" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Format transcript if formatPrompt is provided
    let formattedNotes = transcript;
    if (formatPrompt) {
      const formatResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are a sermon notes formatter. You take raw speech transcripts and format them into clean, structured sermon notes.",
            },
            {
              role: "user",
              content: `${formatPrompt}\n\nRaw transcript:\n${transcript}`,
            },
          ],
        }),
      });

      if (formatResponse.ok) {
        const formatData = await formatResponse.json();
        formattedNotes = formatData.choices?.[0]?.message?.content || transcript;
      }
    }

    return new Response(
      JSON.stringify({ transcript, formattedNotes }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
