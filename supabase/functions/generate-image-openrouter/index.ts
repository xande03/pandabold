import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map model IDs to their corresponding API key env var
const MODEL_KEY_MAP: Record<string, string> = {
  "black-forest-labs/flux.2-pro": "OPENROUTER_FLUX_API_KEY",
  "bytedance-seed/seedream-4.5": "OPENROUTER_SEEDREAM_API_KEY",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, model, referenceImage } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modelId = model || "black-forest-labs/flux.2-pro";
    const keyEnvVar = MODEL_KEY_MAP[modelId] || "OPENROUTER_FLUX_API_KEY";
    const apiKey = Deno.env.get(keyEnvVar);

    if (!apiKey) {
      throw new Error(`${keyEnvVar} is not configured`);
    }

    // Build message content
    const content: any[] = [{ type: "text", text: prompt }];
    if (referenceImage) {
      content.push({ type: "image_url", image_url: { url: referenceImage } });
    }

    console.log(`Generating image with model: ${modelId}, key: ${keyEnvVar}`);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://pandabold.lovable.app",
        "X-Title": "Panda Bold",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content }],
        modalities: ["image"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter image error [${response.status}]:`, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos OpenRouter insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback to Lovable AI
      console.log("OpenRouter failed, falling back to Lovable AI...");
      return await fallbackToLovable(prompt, referenceImage);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image in OpenRouter response:", JSON.stringify(data));
      return await fallbackToLovable(prompt, referenceImage);
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-image-openrouter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fallbackToLovable(prompt: string, referenceImage?: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "Fallback indisponível" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const content: any[] = [{ type: "text", text: prompt }];
  if (referenceImage) {
    content.push({ type: "image_url", image_url: { url: referenceImage } });
  }

  const fallbackResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

  if (!fallbackResp.ok) {
    return new Response(JSON.stringify({ error: "Erro na geração de imagem (fallback)" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fallbackData = await fallbackResp.json();
  const imageUrl = fallbackData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: "Nenhuma imagem retornada" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ imageUrl, fallbackUsed: true, fallbackProvider: "Lovable AI" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
