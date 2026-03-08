

# Plano: Ícones PWA profissionais, Sidebar com toggle, e Resumidor IA melhorado

## 1. Ícones PWA Profissionais
Gerar novos ícones `panda-icon-192.png` e `panda-icon-512.png` com design mais profissional e minimalista -- um panda estilizado com linhas limpas, sem cara infantil. Usar um SVG inline no código para gerar via canvas e exportar como PNG, ou criar SVGs profissionais diretamente.

**Abordagem**: Criar ícones usando SVG com design geométrico/minimalista do panda em cores laranja/preto que combinem com o tema do app. Converter para PNG nas duas resoluções.

## 2. Sidebar -- Toggle maximizar/minimizar + cores do tema

**`src/components/app-sidebar.tsx`**:
- Adicionar botão de toggle (ícone `PanelLeftClose`/`PanelLeft`) no footer da sidebar para colapsar/expandir via `toggleSidebar()`
- As cores já usam variáveis CSS do tema (`--sidebar-*`), mas garantir que os itens ativos e hover respeitem corretamente dark/light mode
- Remover estilos hardcoded e usar apenas variáveis CSS do sidebar

**`src/pages/Index.tsx`**:
- O `SidebarTrigger` no header já existe -- manter como alternativa mobile

## 3. Resumidor IA -- Prompts especializados por modo

**`supabase/functions/summarize-text/index.ts`** -- Reescrever os prompts do sistema:

- **Resumo**: Prompt detalhado pedindo texto contínuo com parágrafos bem estruturados, descrevendo detalhes, aspectos relevantes, contexto e informações pertinentes. Sem bullet points, apenas texto corrido dividido em parágrafos.

- **Pontos-chave**: Prompt pedindo tópicos com **título em negrito** seguido de descrição resumida, organizados por categorias. Formato: `**Título do Tópico** - Descrição resumida do ponto.` Agrupados por categoria quando aplicável.

- **Flashcards**: Prompt pedindo cards no formato estruturado `Pergunta: ... | Resposta: ...` com perguntas e respostas coerentes, cobrindo todo o conteúdo do texto/PDF.

**`src/components/modules/text-summarizer.tsx`** -- Melhorar renderização do resultado:

- **Resumo**: Renderizar como texto corrido com `whitespace-pre-wrap` (já existe)
- **Pontos-chave**: Parsear os tópicos e renderizar com ícones/badges por categoria
- **Flashcards**: Renderizar como cards flip (frente: pergunta, verso: resposta) usando estado local para virar cada card. Grid responsivo de cards.

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `public/panda-icon-192.png` | Substituir por ícone profissional |
| `public/panda-icon-512.png` | Substituir por ícone profissional |
| `src/components/app-sidebar.tsx` | Adicionar botão toggle, ajustar cores tema |
| `supabase/functions/summarize-text/index.ts` | Reescrever prompts para cada modo |
| `src/components/modules/text-summarizer.tsx` | Renderização específica por modo (cards flip para flashcards, tópicos categorizados para pontos-chave) |

