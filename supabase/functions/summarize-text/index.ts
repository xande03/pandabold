import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, string> = {
  resumo: `Você é um especialista em análise e síntese de textos. Resuma o texto a seguir de forma detalhada e profissional.

REGRAS OBRIGATÓRIAS:
- Escreva em parágrafos contínuos e bem estruturados (NUNCA use bullet points ou listas)
- Divida o resumo em parágrafos claros, cada um abordando um aspecto diferente do conteúdo
- Descreva detalhes importantes, contexto, aspectos relevantes e informações pertinentes
- Mantenha coerência e fluidez entre os parágrafos
- Use linguagem formal e precisa
- O resumo deve cobrir todos os pontos principais do texto original
- Responda em português brasileiro`,

  "pontos-chave": `Você é um especialista em análise de conteúdo. Extraia os pontos-chave do texto a seguir.

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
- Organize os pontos por categorias temáticas
- Cada categoria deve ter um título em negrito usando ** (ex: **Categoria**)
- Abaixo de cada categoria, liste os pontos no formato: "• **Título do Ponto** - Descrição resumida e objetiva do ponto."
- Cada ponto deve ter um título em negrito seguido de uma descrição clara
- Cubra todos os aspectos importantes do texto
- Use entre 5 a 15 pontos dependendo da extensão do texto
- Responda em português brasileiro`,

  flashcards: `Você é um especialista em criar material de estudo. Crie flashcards baseados no conteúdo do texto a seguir.

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
- Crie entre 5 a 20 flashcards dependendo da extensão do conteúdo
- Cada flashcard DEVE seguir EXATAMENTE este formato:
PERGUNTA: [pergunta clara e específica sobre o conteúdo]
RESPOSTA: [resposta completa e coerente baseada no texto]

- Separe cada flashcard com uma linha em branco
- As perguntas devem cobrir os conceitos mais importantes do texto
- As respostas devem ser precisas e baseadas exclusivamente no conteúdo fornecido
- Varie os tipos de perguntas: conceituais, factuais, comparativas
- Responda em português brasileiro`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, type } = await req.json();
    if (!text) throw new Error("Texto não fornecido");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    let inputText = text;
    if (text.startsWith("__PDF_BASE64__")) {
      inputText = "O seguinte conteúdo é de um arquivo PDF (base64). Extraia e processe o texto: " + text.slice(14).substring(0, 50000);
    }

    const systemPrompt = PROMPTS[type] || PROMPTS.resumo;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: inputText.substring(0, 100000) },
        ],
        stream: true,
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
      console.error("AI error:", response.status, t);
      throw new Error("Erro no gateway de IA");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("summarize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
