import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status === 503 && attempt < maxRetries - 1) {
      const delay = Math.pow(2, attempt + 1) * 2000;
      console.log(`503 received, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await response.text();
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    return response;
  }
  throw new Error("Max retries exceeded");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, style, resolution = "1344x768", frameIndex, totalFrames } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const progress = totalFrames > 1 ? Math.round((frameIndex / (totalFrames - 1)) * 100) : 100;
    const framePrompt = `Create frame ${frameIndex + 1} of ${totalFrames} for a short animation sequence. Scene: ${prompt}. Style: ${style || "cinematic"}. This frame shows the scene at ${progress}% progression. Resolution: ${resolution}. Make it photorealistic and cinematic with smooth motion between frames. Frame ${frameIndex + 1} should show natural temporal progression from the previous frame.`;

    const response = await fetchWithRetry(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: framePrompt }],
          modalities: ["image", "text"],
        }),
      },
      3
    );

    if (!response.ok) {
      const t = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Aguarde alguns segundos." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error(`Frame ${frameIndex + 1} error:`, response.status, t);
      return new Response(JSON.stringify({ error: `Erro ao gerar frame ${frameIndex + 1}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: `Frame ${frameIndex + 1} sem imagem na resposta` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Frame ${frameIndex + 1}/${totalFrames} generated successfully`);
    return new Response(JSON.stringify({ frame: imageUrl, frameIndex }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-video error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
