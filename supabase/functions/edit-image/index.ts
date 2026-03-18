import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_MODELS = [
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
];

async function editWithGemini(
  apiKey: string,
  model: string,
  instruction: string,
  imageUrl: string
): Promise<string | null> {
  const parts: any[] = [{ text: instruction }];

  // Handle base64 image
  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  } else {
    // For URL images, fetch and convert to base64
    try {
      const imgResp = await fetch(imageUrl);
      const buf = await imgResp.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const contentType = imgResp.headers.get("content-type") || "image/png";
      parts.push({ inlineData: { mimeType: contentType, data: base64 } });
    } catch (e) {
      console.error("Failed to fetch image URL:", e);
      return null;
    }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    }
  );

  if (!response.ok) {
    const t = await response.text();
    console.error(`${model} error [${response.status}]:`, t);
    return null;
  }

  const data = await response.json();
  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData) {
        const mime = part.inlineData.mimeType || "image/png";
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, instruction, model } = await req.json();
    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not configured");

    if (!imageUrl || !instruction) {
      return new Response(JSON.stringify({ error: "Imagem e instrução são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip "google/" prefix if present (from old Lovable AI model IDs)
    const cleanModel = (model || "").replace("google/", "") || "gemini-3.1-flash-image-preview";
    const modelsToTry = [cleanModel, ...FALLBACK_MODELS.filter(m => m !== cleanModel)];

    for (const tryModel of modelsToTry) {
      console.log(`Trying edit with: ${tryModel}`);
      const result = await editWithGemini(apiKey, tryModel, instruction, imageUrl);

      if (result) {
        console.log(`Edited via ${tryModel}`);
        return new Response(JSON.stringify({ imageUrl: result, model: tryModel }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.warn(`${tryModel} returned no image, trying next...`);
    }

    return new Response(JSON.stringify({ error: "Nenhum modelo conseguiu editar a imagem. Verifique o billing do Google AI Studio." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("edit-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
