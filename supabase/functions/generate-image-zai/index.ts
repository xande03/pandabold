import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.85.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateImageWithFallback(prompt: string, referenceImage?: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured for fallback");
  }

  const content: any[] = [{ type: "text", text: prompt }];
  if (referenceImage) {
    content.push({ type: "image_url", image_url: { url: referenceImage } });
  }

  const fallbackResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });

  if (!fallbackResponse.ok) {
    const t = await fallbackResponse.text();
    throw new Error(`Fallback image generation failed (${fallbackResponse.status}): ${t}`);
  }

  const fallbackData = await fallbackResponse.json();
  const fallbackImageUrl = fallbackData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!fallbackImageUrl) {
    throw new Error("Fallback did not return an image");
  }

  return fallbackImageUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, size, creationMode, referenceImage } = await req.json();
    const ZAI_API_KEY = Deno.env.get("ZAI_API_KEY");
    if (!ZAI_API_KEY) throw new Error("ZAI_API_KEY is not configured");

    // Initialize OpenAI SDK with Z.ai endpoint
    const client = new OpenAI({
      apiKey: ZAI_API_KEY,
      baseURL: "https://api.z.ai/api/paas/v4/",
    });

    // Build enhanced prompt with creation mode context
    let enhancedPrompt = prompt;
    if (creationMode) {
      enhancedPrompt = `[Modo de criação: ${creationMode}] ${prompt}`;
    }
    if (referenceImage) {
      enhancedPrompt = `${enhancedPrompt}\n\n[Use a imagem de referência fornecida como base para a transformação]`;
    }

    // Parse size to width x height format
    const sizeStr = size || "1024x1024";

    try {
      const response = await client.images.generate({
        model: "glm-image",
        prompt: enhancedPrompt,
        size: sizeStr as any,
      });

      const imageUrl = response.data?.[0]?.url;

      if (!imageUrl) {
        throw new Error("Nenhuma imagem retornada pela Z.ai");
      }

      return new Response(JSON.stringify({ imageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (zaiError: any) {
      console.error("Z.ai SDK error:", zaiError.status || zaiError.message);
      // Fallback to Lovable AI
      console.log(`Z.ai failed (${zaiError.status || "unknown"}), falling back to Lovable AI...`);
      try {
        const fallbackImageUrl = await generateImageWithFallback(prompt, referenceImage);
        return new Response(
          JSON.stringify({
            imageUrl: fallbackImageUrl,
            fallbackUsed: true,
            fallbackProvider: "Lovable AI",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (fallbackError) {
        console.error("Fallback image error:", fallbackError);
        return new Response(JSON.stringify({
          error: "Erro na geração de imagem. Tente novamente.",
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  } catch (e) {
    console.error("generate-image-zai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
