import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, string> = {
  resumo: `Você é um especialista em análise e síntese de textos. Resuma o texto a seguir de forma detalhada e profissional.

REGRAS OBRIGATÓRIAS:
- Comece com um parágrafo de contextualização explicando do que se trata o texto, quem é o autor (se mencionado), qual é o tema central e a relevância do assunto.
- Use subtítulos em negrito (**Subtítulo**) em linhas separadas para dividir o resumo em seções temáticas claras.
- Dentro de cada seção, escreva em parágrafos contínuos e bem estruturados (NUNCA use bullet points ou listas).
- Preserve dados, números, porcentagens, datas, nomes e citações relevantes do texto original — não generalize quando houver informação específica.
- Mantenha coerência e fluidez entre os parágrafos e seções.
- Use linguagem formal e precisa.
- Termine com uma seção **Síntese Final** que condense os pontos mais críticos em um parágrafo conclusivo.
- O resumo deve cobrir todos os pontos principais do texto original sem omissões significativas.
- Responda em português brasileiro.`,

  "pontos-chave": `Você é um especialista em análise de conteúdo. Extraia os pontos-chave do texto a seguir.

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
- Comece com um parágrafo de contexto geral (2-3 frases) explicando o tema do texto e sua relevância. Este parágrafo deve vir ANTES de qualquer categoria e NÃO deve ter título/negrito.
- Depois do contexto, organize os pontos por categorias temáticas em ordem de importância (pontos mais críticos primeiro).
- Cada categoria deve ter um título em negrito usando ** (ex: **Categoria**)
- Abaixo de cada categoria, liste os pontos no formato: "• **Título do Ponto** — Descrição detalhada com no mínimo 1-2 frases completas explicando o ponto, seu impacto e contexto."
- Cada descrição deve ser autoexplicativa — o leitor deve entender o ponto sem precisar ler o texto original.
- Quando relevante, mencione relações entre pontos (ex: "Este ponto se conecta diretamente com..." ou "Em contraste com o ponto anterior...").
- Cubra todos os aspectos importantes do texto.
- Use entre 5 a 15 pontos dependendo da extensão do texto.
- Responda em português brasileiro.`,

  flashcards: `Você é um especialista em criar material de estudo. Crie flashcards baseados no conteúdo do texto a seguir.

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
- O PRIMEIRO flashcard DEVE ser uma visão geral do tema, com a pergunta "Qual é o tema central deste conteúdo?" e uma resposta que sintetize o assunto.
- Crie entre 5 a 20 flashcards dependendo da extensão do conteúdo.
- Cada flashcard DEVE seguir EXATAMENTE este formato:
[Nível] PERGUNTA: [pergunta clara e específica sobre o conteúdo]
RESPOSTA: [resposta completa, autoexplicativa, com contexto suficiente para ser compreendida sem ler a pergunta novamente]

- O [Nível] deve ser um destes: [Básico], [Intermediário] ou [Avançado]
  - [Básico]: definições, fatos, conceitos fundamentais
  - [Intermediário]: relações causa-efeito, comparações, análises
  - [Avançado]: aplicação prática, síntese de múltiplos conceitos, pensamento crítico

- Separe cada flashcard com uma linha em branco.
- Varie os tipos de perguntas: definição, causa-efeito, comparação, aplicação prática.
- As respostas devem ser precisas, completas e baseadas exclusivamente no conteúdo fornecido.
- Distribua os níveis de dificuldade: ~40% Básico, ~40% Intermediário, ~20% Avançado.
- Responda em português brasileiro.`,
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
        model: "google/gemini-2.5-pro",
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
