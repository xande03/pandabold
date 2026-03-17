import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, referenceImage } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not configured");

    // Try Imagen 3 first (dedicated image generation model)
    const imagenResult = await generateWithImagen(apiKey, prompt);
    if (imagenResult) {
      return new Response(JSON.stringify({ imageUrl: imagenResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try Gemini with image generation capability
    const geminiResult = await generateWithGemini(apiKey, prompt, referenceImage);
    if (geminiResult) {
      return new Response(JSON.stringify({ imageUrl: geminiResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Nenhuma imagem retornada" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-image-google error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateWithImagen(apiKey: string, prompt: string): Promise<string | null> {
  try {
    console.log("Trying Imagen 3...");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Imagen 3 error [${response.status}]:`, errorText);
      return null;
    }

    const data = await response.json();
    const imageBytes = data.predictions?.[0]?.bytesBase64Encoded;
    if (imageBytes) {
      console.log("Image generated via Imagen 3");
      return `data:image/png;base64,${imageBytes}`;
    }
    return null;
  } catch (e) {
    console.warn("Imagen 3 failed:", e);
    return null;
  }
}

async function generateWithGemini(apiKey: string, prompt: string, referenceImage?: string): Promise<string | null> {
  try {
    console.log("Trying Gemini image generation...");
    const parts: any[] = [{ text: prompt }];
    
    if (referenceImage) {
      const match = referenceImage.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: { mimeType: match[1], data: match[2] },
        });
      }
    }

    // Use gemini-2.0-flash-preview-image-generation which supports image output
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
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
      console.warn(`Gemini image error [${response.status}]:`, errorText);
      return null;
    }

    const data = await response.json();
    for (const candidate of data.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || "image/png";
          console.log("Image generated via Gemini");
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (e) {
    console.warn("Gemini image failed:", e);
    return null;
  }
}
