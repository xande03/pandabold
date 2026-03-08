import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status === 503 && attempt < maxRetries - 1) {
      const delay = Math.pow(2, attempt + 1) * 2000; // 4s, 8s, 16s
      console.log(`503 received, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await response.text(); // consume body
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
    const { prompt, style, frameCount = 6, resolution = "1344x768" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const frames: string[] = [];
    const totalFrames = Math.min(Math.max(frameCount, 4), 8);

    for (let i = 0; i < totalFrames; i++) {
      const progress = totalFrames > 1 ? Math.round((i / (totalFrames - 1)) * 100) : 100;
      const framePrompt = `Create frame ${i + 1} of ${totalFrames} for a short animation sequence. Scene: ${prompt}. Style: ${style || "cinematic"}. This frame shows the scene at ${progress}% progression. Resolution: ${resolution}. Make it photorealistic and cinematic with smooth motion between frames. Frame ${i + 1} should show natural temporal progression from the previous frame.`;

      try {
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
          if (response.status === 429) {
            const t = await response.text();
            return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos.", frames }), {
              status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (response.status === 402) {
            const t = await response.text();
            return new Response(JSON.stringify({ error: "Créditos insuficientes.", frames }), {
              status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const t = await response.text();
          console.error(`Frame ${i + 1} error:`, response.status, t);
          continue;
        }

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (imageUrl) {
          frames.push(imageUrl);
          console.log(`Frame ${i + 1}/${totalFrames} generated successfully`);
        }
      } catch (frameErr) {
        console.error(`Frame ${i + 1} exception:`, frameErr);
        continue;
      }

      // Longer delay between frames to avoid rate limiting
      if (i < totalFrames - 1) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    if (frames.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum frame gerado. Tente novamente." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ frames, totalGenerated: frames.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-video error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
