import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
      model: "google/gemini-2.5-flash-image",
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

    // Build enhanced prompt with creation mode context
    let enhancedPrompt = prompt;
    if (creationMode) {
      enhancedPrompt = `[Modo de criação: ${creationMode}] ${prompt}`;
    }

    // If reference image is provided, add instruction
    if (referenceImage) {
      enhancedPrompt = `${enhancedPrompt}\n\n[Use a imagem de referência fornecida como base para a transformação]`;
    }

    const response = await fetch("https://api.z.ai/api/paas/v4/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ZAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "glm-image",
        prompt: enhancedPrompt,
        size: size || "1024x1024",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
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
            error: "Limite de requisições excedido. Tente novamente em instantes.",
            code: 429,
            retryable: true,
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const t = await response.text();
      console.error("Z.ai image error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro na geração de imagem Z.ai" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Nenhuma imagem retornada pela Z.ai" }), {
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
