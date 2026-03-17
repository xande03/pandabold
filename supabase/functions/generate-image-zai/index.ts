import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "npm:openai@4.85.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateWithZai(prompt: string, size: string, creationMode?: string): Promise<string | null> {
  const ZAI_API_KEY = Deno.env.get("ZAI_API_KEY");
  if (!ZAI_API_KEY) return null;

  const client = new OpenAI({
    apiKey: ZAI_API_KEY,
    baseURL: "https://api.z.ai/api/paas/v4/",
  });

  let enhancedPrompt = prompt;
  if (creationMode) {
    enhancedPrompt = `[Modo de criação: ${creationMode}] ${prompt}`;
  }

  const response = await client.images.generate({
    model: "glm-image",
    prompt: enhancedPrompt,
    size: size as any,
  });

  return response.data?.[0]?.url || null;
}

async function generateWithGemini(prompt: string, creationMode?: string): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  let finalPrompt = prompt;
  if (creationMode) {
    finalPrompt = `[Modo de criação: ${creationMode}] ${prompt}`;
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [{ role: "user", content: [{ type: "text", text: finalPrompt }] }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("Gemini fallback error:", response.status, t);
    return null;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, size, creationMode } = await req.json();
    const sizeStr = size || "1024x1024";

    // Try Z.ai first
    let imageUrl: string | null = null;
    try {
      imageUrl = await generateWithZai(prompt, sizeStr, creationMode);
    } catch (e) {
      console.warn("Z.ai failed, falling back to Gemini:", e instanceof Error ? e.message : e);
    }

    // Fallback to Gemini
    if (!imageUrl) {
      try {
        imageUrl = await generateWithGemini(prompt, creationMode);
        if (imageUrl) console.log("Image generated via Gemini fallback");
      } catch (e) {
        console.error("Gemini fallback also failed:", e);
      }
    }

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Nenhum provedor conseguiu gerar a imagem. Verifique os créditos da Z.ai ou tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-image-zai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
