import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, duration = 5, resolution = "1920x1080", fps = 30 } = await req.json();
    const ZAI_API_KEY = Deno.env.get("ZAI_API_KEY");
    if (!ZAI_API_KEY) throw new Error("ZAI_API_KEY is not configured");

    // Step 1: Submit video generation task
    const submitResponse = await fetch("https://api.z.ai/api/paas/v4/videos/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ZAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "cogvideox-2",
        prompt,
        duration,
        resolution,
        fps,
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error("Z.ai video submit error:", submitResponse.status, errorText);
      
      // Fallback to frame-based generation via Lovable AI
      return await generateVideoFallback(prompt, resolution);
    }

    const submitData = await submitResponse.json();
    const taskId = submitData.id || submitData.task_id;

    if (!taskId) {
      console.error("No task ID returned:", submitData);
      return await generateVideoFallback(prompt, resolution);
    }

    // Step 2: Poll for completion (max 120s)
    const maxWait = 120_000;
    const pollInterval = 3_000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      await new Promise(r => setTimeout(r, pollInterval));

      const statusResponse = await fetch(`https://api.z.ai/api/paas/v4/async-result/${taskId}`, {
        headers: { Authorization: `Bearer ${ZAI_API_KEY}` },
      });

      if (!statusResponse.ok) continue;

      const statusData = await statusResponse.json();
      const taskStatus = statusData.task_status;

      if (taskStatus === "SUCCESS") {
        const videoUrl = statusData.video_result?.[0]?.url;
        const coverUrl = statusData.video_result?.[0]?.cover_image_url;

        if (videoUrl) {
          return new Response(
            JSON.stringify({ videoUrl, coverUrl, provider: "Z.ai" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (taskStatus === "FAIL") {
        console.error("Z.ai video task failed:", statusData);
        return await generateVideoFallback(prompt, resolution);
      }
    }

    // Timeout - return task ID for later polling
    return new Response(
      JSON.stringify({ taskId, status: "processing", message: "Vídeo ainda em processamento. Tente novamente em alguns minutos." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("generate-video-zai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateVideoFallback(prompt: string, resolution: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Falha na geração de vídeo. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Fallback: generate a single high-quality frame as preview
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: `Generate a cinematic still frame for a video scene: ${prompt}. Resolution: ${resolution}. Make it photorealistic and cinematic.` }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Falha no fallback de geração de vídeo." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    return new Response(
      JSON.stringify({ 
        coverUrl: imageUrl, 
        fallbackUsed: true, 
        provider: "Lovable AI",
        message: "Geração de vídeo indisponível no momento. Preview gerado como imagem." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Erro no fallback de vídeo." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
