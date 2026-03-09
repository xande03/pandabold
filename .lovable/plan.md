

# Plano: Refinar prompts e renderização do Resumidor de IA

## Mudanças

### 1. Edge Function `supabase/functions/summarize-text/index.ts` — Prompts mais detalhados

**Resumo:**
- Adicionar instrução para usar subtítulos em negrito (`**Subtítulo**`) para separar seções temáticas
- Pedir contextualização inicial (do que se trata o texto) antes de entrar nos detalhes
- Exigir conclusão/síntese final
- Pedir que mantenha dados, números e citações relevantes do original

**Pontos-chave:**
- Adicionar instrução para começar com um parágrafo de contexto geral antes das categorias
- Pedir hierarquia de importância (pontos mais críticos primeiro)
- Exigir que cada ponto tenha descrição com no mínimo 1-2 frases completas (não apenas fragmentos)
- Adicionar instrução para incluir relações entre pontos quando relevante

**Flashcards:**
- Adicionar instrução para variar níveis de dificuldade (básico, intermediário, avançado) e marcar cada um
- Pedir flashcards de diferentes tipos: definição, causa-efeito, comparação, aplicação prática
- Exigir que respostas tenham contexto suficiente para serem autoexplicativas (sem depender da pergunta)
- Adicionar instrução para incluir flashcard de "visão geral" como primeiro card

### 2. Frontend `src/components/modules/text-summarizer.tsx` — Melhorias na renderização

**Resumo:**
- Renderizar subtítulos em negrito (`**texto**`) como headings estilizados, em vez de texto plano

**Pontos-chave:**
- Renderizar o parágrafo de contexto inicial com estilo diferenciado (itálico/destaque)

**Flashcards:**
- Adicionar badge de dificuldade (Básico/Intermediário/Avançado) em cada card, parseado do texto
- Melhorar o parsing para aceitar variações de formato (ex: `**PERGUNTA:**` além de `PERGUNTA:`)

### 3. Modelo — Trocar para `google/gemini-2.5-pro`
Para resultados mais completos e precisos em tarefas de raciocínio e síntese, usar o modelo mais capaz em vez do flash.

