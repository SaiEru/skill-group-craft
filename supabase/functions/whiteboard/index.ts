import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const lengthPrompts: Record<string, string> = {
  short: "Return exactly 3-4 sections.",
  medium: "Return exactly 5-7 sections.",
  long: "Return exactly 8-12 sections.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, length } = await req.json();
    if (!topic) throw new Error("Topic is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lengthInstruction = lengthPrompts[length] || lengthPrompts.medium;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert teacher explaining topics on a whiteboard. You must return a JSON array of sections. Each section has a "heading" and "body". The body should be a clear explanation in plain text (no markdown). Write as if you're speaking to a student. ${lengthInstruction}

Return ONLY valid JSON in this format, no other text:
[
  { "heading": "Section Title", "body": "Explanation text here..." },
  { "heading": "Another Section", "body": "More explanation..." }
]`,
          },
          {
            role: "user",
            content: `Explain: "${topic}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "whiteboard_sections",
              description: "Return structured whiteboard sections for teaching a topic.",
              parameters: {
                type: "object",
                properties: {
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        heading: { type: "string", description: "Section heading" },
                        body: { type: "string", description: "Section explanation in plain spoken English" },
                      },
                      required: ["heading", "body"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["sections"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "whiteboard_sections" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let sections;
    if (toolCall) {
      sections = JSON.parse(toolCall.function.arguments).sections;
    } else {
      // Fallback: try parsing content directly
      const content = data.choices?.[0]?.message?.content || "[]";
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      sections = JSON.parse(cleaned);
    }

    return new Response(JSON.stringify({ sections }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whiteboard error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
