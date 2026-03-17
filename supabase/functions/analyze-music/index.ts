import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { songInfo, youtubeUrl } = await req.json();
    const ZAI_API_KEY = Deno.env.get("ZAI_API_KEY");
    if (!ZAI_API_KEY) throw new Error("ZAI_API_KEY is not configured");

    const prompt = youtubeUrl
      ? `Analise a música do YouTube: ${youtubeUrl}. ${songInfo || ""}`
      : `Analise a seguinte música: ${songInfo}`;

    const response = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ZAI_API_KEY}`,
        "Content-Type": "application/json",
        "Accept-Language": "en-US,en",
      },
      body: JSON.stringify({
        model: "glm-5",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em análise e identificação musical. Identifique a música com precisão e retorne APENAS um JSON válido com a seguinte estrutura (sem markdown, sem código):
{
  "artist": "nome do artista/banda",
  "songTitle": "nome da música",
  "album": "nome do álbum",
  "key": {"note": "C", "scale": "major", "confidence": 0.0-1.0},
  "genres": [{"name": "string", "confidence": 0.0-1.0}],
  "moods": [{"name": "string", "confidence": 0.0-1.0}],
  "tempo": {"bpm": number, "confidence": 0.0-1.0},
  "instruments": [{"name": "string", "presence": 0.0-1.0}],
  "vocals": {"type": "string", "gender": "string", "characteristics": ["string"], "confidence": 0.0-1.0},
  "structure": {"sections": [{"name": "string", "duration": "string", "timestamp": "string"}]},
  "similarArtists": [{"name": "string", "similarity": 0.0-1.0}],
  "similarSongs": [{"title": "string", "artist": "string", "similarity": 0.0-1.0}],
  "lyrics": "letra completa da música se disponível, ou 'Letra não disponível'",
  "overallConfidence": 0.0-1.0
}
Identifique com precisão: artista, nome da música, álbum, tonalidade (key musical com nota e escala), BPM, gêneros, instrumentos e letra completa.`
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Analyze music error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro na análise musical" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    let analysis;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = { error: "Não foi possível analisar a resposta", raw: content };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-music error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
