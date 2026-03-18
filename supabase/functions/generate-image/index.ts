import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODELS = [
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
];

const IMAGEN_MODELS = [
  "imagen-4.0-fast-generate-001",
  "imagen-4.0-generate-001",
  "imagen-4.0-ultra-generate-001",
];

async function generateWithGemini(
  apiKey: string,
  model: string,
  prompt: string,
  referenceImage?: string
): Promise<string | null> {
  const parts: any[] = [{ text: prompt }];
  if (referenceImage) {
    const match = referenceImage.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
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

async function generateWithImagen(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1 },
      }),
    }
  );

  if (!response.ok) {
    const t = await response.text();
    console.error(`${model} error [${response.status}]:`, t);
    return null;
  }

  const data = await response.json();
  const bytes = data.predictions?.[0]?.bytesBase64Encoded;
  return bytes ? `data:image/png;base64,${bytes}` : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, referenceImage, model } = await req.json();
    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not configured");

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectedModel = model || "gemini-3.1-flash-image-preview";
    const isImagen = IMAGEN_MODELS.includes(selectedModel);

    // Build fallback chain: requested model first, then others of same type, then cross-type
    let modelsToTry: string[];
    if (isImagen) {
      modelsToTry = [selectedModel, ...IMAGEN_MODELS.filter(m => m !== selectedModel), ...GEMINI_MODELS];
    } else {
      modelsToTry = [selectedModel, ...GEMINI_MODELS.filter(m => m !== selectedModel)];
    }

    // If reference image provided, skip Imagen (doesn't support image input)
    if (referenceImage) {
      modelsToTry = modelsToTry.filter(m => !IMAGEN_MODELS.includes(m));
    }

    for (const tryModel of modelsToTry) {
      console.log(`Trying: ${tryModel}`);
      let imageUrl: string | null;

      if (IMAGEN_MODELS.includes(tryModel)) {
        imageUrl = await generateWithImagen(apiKey, tryModel, prompt);
      } else {
        imageUrl = await generateWithGemini(apiKey, tryModel, prompt, referenceImage);
      }

      if (imageUrl) {
        console.log(`Generated via ${tryModel}`);
        return new Response(JSON.stringify({ imageUrl, model: tryModel }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.warn(`${tryModel} returned no image, trying next...`);
    }

    return new Response(JSON.stringify({ error: "Nenhum modelo conseguiu gerar a imagem. Verifique o billing do Google AI Studio." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
