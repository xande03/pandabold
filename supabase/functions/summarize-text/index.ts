import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, string> = {
  resumo: `Você é um especialista em análise e síntese de textos. Sua tarefa é ler cuidadosamente o texto/documento fornecido e criar um resumo CONCISO e bem estruturado.

INSTRUÇÕES:
1. Primeiro, leia e compreenda TODO o conteúdo fornecido, identificando o tema central, contexto e pontos principais.
2. Se o texto parecer ser de um PDF ou documento formatado, ignore caracteres estranhos, cabeçalhos repetidos, números de página, etc. Foque no conteúdo real.

REGRAS DE FORMATAÇÃO:
- Comece com um parágrafo curto de contextualização (2-3 frases): do que se trata, quem é o autor (se mencionado), e qual a relevância.
- Use subtítulos em negrito (**Subtítulo**) em linhas separadas para dividir o resumo em seções temáticas.
- Dentro de cada seção, escreva parágrafos curtos e objetivos (NÃO use bullet points ou listas).
- Preserve dados específicos: números, porcentagens, datas, nomes e citações relevantes.
- Seja CONCISO: cada parágrafo deve ter no máximo 3-4 frases. Elimine redundâncias.
- Termine com uma seção **Síntese Final** com um parágrafo conclusivo de no máximo 3 frases.
- Responda SEMPRE em português brasileiro.
- Se o texto estiver em outro idioma, traduza o resumo para português brasileiro.`,

  "pontos-chave": `Você é um especialista em análise de conteúdo. Sua tarefa é extrair os pontos-chave do texto/documento fornecido em formato de TÓPICOS claros e organizados.

INSTRUÇÕES:
1. Leia e compreenda TODO o conteúdo, mesmo que pareça mal formatado (PDF, OCR, etc.).
2. Identifique os pontos mais importantes e organize-os hierarquicamente.

REGRAS DE FORMATAÇÃO:
- Comece com 1-2 frases de contexto geral sobre o tema (SEM título/negrito neste parágrafo inicial).
- Organize os pontos por categorias temáticas com títulos em negrito: **Categoria**
- Abaixo de cada categoria, liste os pontos como tópicos:
  • **Título do Ponto** — Explicação clara e direta em 1-2 frases.
- Cada tópico deve ser autoexplicativo — o leitor deve entender sem ler o texto original.
- Use entre 5 a 12 pontos, priorizando os mais relevantes.
- Ordene do mais importante para o menos importante.
- Responda SEMPRE em português brasileiro.
- Se o texto estiver em outro idioma, traduza para português brasileiro.`,

  flashcards: `Você é um especialista em criar material de estudo. Sua tarefa é criar flashcards de estudo baseados no conteúdo do texto/documento fornecido.

INSTRUÇÕES:
1. Leia e compreenda TODO o conteúdo fornecido, ignorando problemas de formatação.
2. Identifique os conceitos, fatos e relações mais importantes para transformar em flashcards.

REGRAS DE FORMATAÇÃO (SIGA EXATAMENTE):
- O PRIMEIRO flashcard deve ser sobre o tema central: "Qual é o tema central deste conteúdo?"
- Crie entre 5 a 15 flashcards dependendo da extensão.
- Cada flashcard DEVE seguir EXATAMENTE este formato:

[Nível] PERGUNTA: [pergunta clara e específica]
RESPOSTA: [resposta completa e autoexplicativa]

- Separe cada flashcard com uma linha em branco.
- Níveis de dificuldade:
  [Básico] = definições, fatos, conceitos fundamentais (~40%)
  [Intermediário] = relações causa-efeito, comparações (~40%)
  [Avançado] = aplicação prática, síntese, pensamento crítico (~20%)
- Varie os tipos: definição, causa-efeito, comparação, aplicação.
- As respostas devem ser baseadas EXCLUSIVAMENTE no conteúdo fornecido.
- Responda SEMPRE em português brasileiro.`,
};

interface ProviderConfig {
  url: string;
  apiKey: string;
  model: string;
  headers?: Record<string, string>;
}

function getProviderConfig(provider: string, model?: string): ProviderConfig {
  if (provider === "openrouter") {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada");
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      apiKey,
      model: model || "deepseek/deepseek-chat-v3-0324",
      headers: {
        "HTTP-Referer": "https://pandabold.lovable.app",
        "X-Title": "Panda Bold",
      },
    };
  }

  // Default: Z.ai
  const apiKey = Deno.env.get("ZAI_API_KEY");
  if (!apiKey) throw new Error("ZAI_API_KEY não configurada");
  return {
    url: "https://api.z.ai/api/paas/v4/chat/completions",
    apiKey,
    model: model || "glm-5",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, type, provider, model } = await req.json();
    if (!text) throw new Error("Texto não fornecido");

    const config = getProviderConfig(provider || "lovable", model);

    let inputText = text;
    if (text.startsWith("__PDF_BASE64__")) {
      inputText = "O conteúdo abaixo foi extraído de um documento PDF. Ignore caracteres estranhos, cabeçalhos/rodapés repetidos e números de página. Foque apenas no conteúdo textual real:\n\n" + text.slice(14).substring(0, 80000);
    }

    const systemPrompt = PROMPTS[type] || PROMPTS.resumo;

    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...(config.headers || {}),
      },
      body: JSON.stringify({
        model: config.model,
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
