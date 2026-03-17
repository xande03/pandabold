import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Models that use the "predict" API (Imagen)
const IMAGEN_MODELS = [
  "imagen-4.0-generate-001",
  "imagen-4.0-ultra-generate-001",
  "imagen-4.0-fast-generate-001",
];

// Models that use generateContent with image modality (Nano Banana)
const GEMINI_IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3-pro-image-preview",
  "gemini-3.1-flash-image-preview",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, referenceImage, model } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not configured");

    const selectedModel = model || "imagen-4.0-fast-generate-001";
    let imageUrl: string | null = null;

    if (IMAGEN_MODELS.includes(selectedModel)) {
      imageUrl = await generateWithImagen(apiKey, selectedModel, prompt);
    } else if (GEMINI_IMAGE_MODELS.includes(selectedModel)) {
      imageUrl = await generateWithGemini(apiKey, selectedModel, prompt, referenceImage);
    } else {
      // Default fallback to Imagen 4 Fast
      imageUrl = await generateWithImagen(apiKey, "imagen-4.0-fast-generate-001", prompt);
    }

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Nenhuma imagem retornada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-image-google error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateWithImagen(apiKey: string, model: string, prompt: string): Promise<string | null> {
  try {
    console.log(`Generating with ${model}...`);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${model} error [${response.status}]:`, errorText);
      return null;
    }

    const data = await response.json();
    const imageBytes = data.predictions?.[0]?.bytesBase64Encoded;
    if (imageBytes) {
      console.log(`Image generated via ${model}`);
      return `data:image/png;base64,${imageBytes}`;
    }
    return null;
  } catch (e) {
    console.error(`${model} failed:`, e);
    return null;
  }
}

async function generateWithGemini(apiKey: string, model: string, prompt: string, referenceImage?: string): Promise<string | null> {
  try {
    console.log(`Generating with ${model}...`);
    const parts: any[] = [{ text: prompt }];

    if (referenceImage) {
      const match = referenceImage.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: { mimeType: match[1], data: match[2] },
        });
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${model} error [${response.status}]:`, errorText);
      return null;
    }

    const data = await response.json();
    for (const candidate of data.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || "image/png";
          console.log(`Image generated via ${model}`);
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (e) {
    console.error(`${model} failed:`, e);
    return null;
  }
}
