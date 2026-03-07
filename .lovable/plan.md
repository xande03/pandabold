

# Panda Bold - Plano de Implementação Completo

## Visão Geral
Renomear para "Panda Bold", traduzir para PT-BR, conectar ao Lovable Cloud, e implementar todas as funcionalidades solicitadas. O LOVABLE_API_KEY já está disponível.

---

## 1. Conectar ao Lovable Cloud + Edge Functions

Criar as seguintes edge functions usando o Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`):

- **`supabase/functions/chat/index.ts`** — Chat streaming com seleção de modelo (Gemini 2.5 Pro, Flash, GPT-5, etc. + Gemini 3 Pro Preview)
- **`supabase/functions/generate-image/index.ts`** — Geração de imagens via `google/gemini-3-pro-image-preview` (Nano Banana Pro como padrão)
- **`supabase/functions/edit-image/index.ts`** — Edição de imagens (upscale, remoção de fundo, inserção de texto, etc.)
- **`supabase/functions/analyze-music/index.ts`** — Análise musical via IA (gêneros, BPM, mood, instrumentos, letra)

Configurar `supabase/config.toml` com `verify_jwt = false` para todas as funções.

---

## 2. Rebranding: "Panda Bold" + Tradução PT-BR

- Renomear "OmniArena" → "Panda Bold" em `main-nav.tsx` e `Index.tsx`
- Logo: Ícone de panda estilizado (emoji 🐼 ou SVG) no header
- Traduzir TODOS os textos da interface:
  - Navegação: Chat → Chat, Imagem → Laboratório de Imagem, Editor, Vídeo, QR Code, Música DNA
  - Botões, labels, placeholders, toasts, mensagens vazias
  - Módulos: "Battle" → "Batalha", "Individual" → "Individual", "Generate" → "Gerar", "Settings" → "Configurações", etc.

---

## 3. Módulo de Galeria Unificada

Adicionar novo módulo `gallery` ao app:
- **Nova aba** na navegação: "Galeria" (ícone Grid/LayoutGrid)
- Exibir TODAS as gerações: imagens, vídeos e QR codes em um grid unificado
- **Filtros**: tipo (imagem/vídeo/QR code), data, modelo usado
- Cada item mostra thumbnail, tipo (badge), data e ações (download, visualizar)
- Atualizar `ModuleId` no store para incluir `'gallery'`

---

## 4. Image Lab - Modelos de Criação

Adicionar seção "Modelos de Criação" com os seguintes modos:
- **Cartoon, Caricatura, Web UI, Slide, Logomarca, Anime, HQ, Poster, Adesivo, Modo Livre, Avatar**

Cada modelo terá um prompt template pré-configurado. Quando o usuário:
1. Faz upload de uma imagem de referência
2. Clica em um modelo de criação
3. O prompt é preenchido automaticamente com as propriedades do modelo selecionado
4. Basta clicar "Gerar" — a IA transforma a imagem no estilo do modelo

**Avatar**: 3 modos de geração:
- Somente imagem (upload de foto do rosto)
- Upload + descrição
- Somente descrição no prompt

**Modelo de IA padrão**: `google/gemini-3-pro-image-preview` (Nano Banana Pro) para todas as operações de imagem.

---

## 5. Chat Arena - Adicionar Gemini 3 Pro

Adicionar `google/gemini-3-pro-preview` (Gemini 3 Pro) à lista de modelos disponíveis no Chat Arena.

---

## 6. Editor de Imagem - Inserção de Texto com Preview ao Vivo

Nova operação "Texto" no editor:
- Canvas overlay sobre a imagem onde o usuário seleciona a área clicando/arrastando
- Preview em tempo real da posição e do texto digitado
- Seletor de fontes (Arial, Roboto, Playfair, Montserrat, Comic Sans, etc.)
- Opções de tamanho, cor, negrito/itálico
- Botão "Confirmar" que envia para a IA aplicar o texto final
- Seção adicional para figurinhas/colagens (emojis decorativos)

---

## 7. Music DNA - Letra da Música + Download via yout.com

- **Letra**: Adicionar campo de resultado para exibir a letra da música (obtida via análise IA)
- **Download via yout.com**: Quando o usuário cola um link do YouTube, o botão "Baixar MP3" abrirá uma nova aba com o link correto: `https://yout.com/video/{VIDEO_ID}` (extraindo o ID do link do YouTube). O redirecionamento atual não funciona — corrigir a construção da URL.

---

## 8. Animações de Loading

Para todas as gerações (imagens, QR codes, vídeos):
- Substituir a progress bar simples por uma animação visual rica
- Skeleton shimmer pulsante no espaço onde o resultado aparecerá
- Ícone animado rotativo com efeito de partículas/brilho
- Mensagens de status dinâmicas ("Criando sua imagem...", "Aplicando estilo...", "Quase lá...")

---

## Ordem de Implementação

1. Lovable Cloud + Edge Functions (chat, generate-image, edit-image, analyze-music)
2. Rebranding "Panda Bold" + tradução PT-BR completa
3. Chat Arena - adicionar Gemini 3 Pro
4. Image Lab - modelos de criação + auto-fill prompt + modelo padrão Nano Banana Pro
5. Galeria unificada com filtros
6. Editor de imagem - inserção de texto com preview
7. Music DNA - letra + correção yout.com
8. Animações de loading aprimoradas

---

## Notas Técnicas

- **Edge Functions**: Usam `LOVABLE_API_KEY` (já disponível) para chamar `ai.gateway.lovable.dev`
- **Streaming**: Chat usa SSE token-by-token; imagens usam invocação não-streaming
- **Imagens**: Geradas como base64, armazenadas no Zustand store
- **yout.com**: URL correta é `https://yout.com/video/VIDEO_ID` — o ID é extraído do link YouTube com regex
- **QR Code**: Usar biblioteca client-side (`qrcode` npm) para geração real

