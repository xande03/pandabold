

# Plano de Implementação

## 1. Feedback visual durante processamento de imagem/vídeo

**Problema**: O `GenerationLoading` só aparece no painel lateral do Image Lab. Não há feedback visual na área principal onde o resultado aparece, nem no Video Studio.

**Solução**:
- No **Image Lab**: Mostrar o `GenerationLoading` na área da galeria (painel direito) durante `loading`, substituindo o estado vazio
- No **Video Studio**: Mostrar `GenerationLoading` com `type="video"` enquanto tasks estão processando, com animação de progresso mais rica (barra gradiente animada + mensagens dinâmicas)
- No **Image Editor**: Mostrar loading na área de resultado durante edição

## 2. Auto-preenchimento de prompt ao clicar em modelo de criação

**Problema**: O `handleCreationModelSelect` já preenche o prompt, mas o comportamento precisa ser mais claro — ao clicar num modelo com imagem já carregada, o prompt deve ser preenchido automaticamente com instruções específicas do modelo, pronto para gerar.

**Solução**:
- Melhorar os prompts de cada `CREATION_MODEL` para serem mais descritivos e específicos
- Quando há `referenceImage` + modelo selecionado, adicionar prefixo contextual ao prompt (ex: "Transforme a imagem enviada em...")
- Mostrar indicação visual de que o prompt foi preenchido automaticamente (toast ou highlight)

## 3. Funcionamento efetivo do Estúdio de Vídeo

**Problema**: O Video Studio usa simulação local (`setInterval` com progresso fictício). Não gera vídeo real.

**Solução**: Usar o modelo de imagem `google/gemini-3-pro-image-preview` para gerar **múltiplos frames** a partir do prompt (sequência de imagens) e exibi-los como slideshow/animação. Isso cria uma experiência de "vídeo" real usando a API disponível:
- Gerar 4-8 frames sequenciais via edge function `generate-image` com prompts incrementais (frame 1, frame 2, etc.)
- Exibir como slideshow animado com controles de play/pause
- Permitir download como GIF ou sequência de imagens
- Manter a progress bar real baseada no número de frames gerados
- Criar nova edge function `generate-video` que orquestra a geração sequencial de frames

## Arquivos a modificar

1. **`src/components/modules/image-lab.tsx`** — Loading na galeria + toast de auto-fill
2. **`src/components/modules/video-studio.tsx`** — Reescrever para gerar frames reais via API + loading visual
3. **`src/components/ui/generation-loading.tsx`** — Adicionar variante `video` com mensagens específicas
4. **`src/components/modules/image-editor.tsx`** — Loading durante edição
5. **`supabase/functions/generate-video/index.ts`** — Nova edge function para gerar frames sequenciais
6. **`supabase/config.toml`** — Adicionar config da nova function
7. **`src/lib/store/app-store.ts`** — Atualizar `VideoTask` para armazenar array de frames

