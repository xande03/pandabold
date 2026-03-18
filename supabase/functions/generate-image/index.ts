import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_MODELS = [
  "google/gemini-3.1-flash-image-preview",
  "google/gemini-3-pro-image-preview",
  "google/gemini-2.5-flash-image",
];

async function callGateway(apiKey: string, model: string, content: any[]) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });
  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, referenceImage, model } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content: any[] = [{ type: "text", text: prompt }];
    if (referenceImage) {
      content.push({ type: "image_url", image_url: { url: referenceImage } });
    }

    // Build ordered model list: requested model first, then fallbacks
    const requestedModel = model || "google/gemini-3.1-flash-image-preview";
    const modelsToTry = [requestedModel, ...FALLBACK_MODELS.filter(m => m !== requestedModel)];

    for (const tryModel of modelsToTry) {
      console.log(`Trying model: ${tryModel}`);
      const response = await callGateway(LOVABLE_API_KEY, tryModel, content);

      if (response.status === 429) {
        console.warn(`Rate limited on ${tryModel}, trying next...`);
        continue;
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Recarregue em Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!response.ok) {
        const t = await response.text();
        console.error(`${tryModel} error [${response.status}]:`, t);
        continue;
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) {
        console.log(`Image generated via ${tryModel}`);
        return new Response(JSON.stringify({ imageUrl, model: tryModel }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.warn(`No image returned from ${tryModel}, trying next...`);
    }

    return new Response(JSON.stringify({ error: "Nenhum modelo disponível conseguiu gerar a imagem. Tente novamente." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
