import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "npm:openai@4.85.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, size, creationMode, referenceImage } = await req.json();
    const ZAI_API_KEY = Deno.env.get("ZAI_API_KEY");
    if (!ZAI_API_KEY) throw new Error("ZAI_API_KEY is not configured");

    const client = new OpenAI({
      apiKey: ZAI_API_KEY,
      baseURL: "https://api.z.ai/api/paas/v4/",
    });

    let enhancedPrompt = prompt;
    if (creationMode) {
      enhancedPrompt = `[Modo de criação: ${creationMode}] ${prompt}`;
    }
    if (referenceImage) {
      enhancedPrompt = `${enhancedPrompt}\n\n[Use a imagem de referência fornecida como base para a transformação]`;
    }

    const sizeStr = size || "1024x1024";

    const response = await client.images.generate({
      model: "glm-image",
      prompt: enhancedPrompt,
      size: sizeStr as any,
    });

    const imageUrl = response.data?.[0]?.url;

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
