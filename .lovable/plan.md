

# Estúdio de Vídeo — Geração Real de Vídeo

## Problema Atual
1. A edge function `generate-video` recebe erros 503 ao gerar frames sequenciais (sobrecarga do gateway)
2. Os frames são exibidos apenas como slideshow — não há vídeo real exportável
3. Não há compilação dos frames em arquivo de vídeo

## Solução

### 1. Edge Function mais robusta
- Adicionar **retry com backoff** (até 3 tentativas) quando receber 503
- Aumentar o delay entre frames de 1.5s para 3s para evitar rate limiting
- Retornar frames parciais em caso de falha parcial (já implementado)

### 2. Compilação de vídeo real no client (Canvas + MediaRecorder API)
Usar APIs nativas do browser — **sem dependências extras**:
- Carregar os frames gerados pela IA em um `<canvas>`
- Usar `canvas.captureStream()` + `MediaRecorder` para gravar como `.webm`
- Controle de FPS (frames por segundo) para ajustar a velocidade da animação
- Cada frame é desenhado no canvas por uma duração calculada (ex: 500ms por frame)
- O resultado é um blob `.webm` real que pode ser baixado como vídeo

### 3. UI atualizada
- Botão **"Baixar Vídeo (.webm)"** que compila e exporta o vídeo real
- Manter botão "Baixar Frames" para download individual dos PNGs
- Controle de velocidade de playback (lento/normal/rápido)
- Indicador de progresso durante a compilação do vídeo

### Arquivos a modificar
1. **`supabase/functions/generate-video/index.ts`** — Retry com backoff no 503, delay maior
2. **`src/components/modules/video-studio.tsx`** — Adicionar função `compileVideo()` usando Canvas+MediaRecorder, botão de download de vídeo, controle de velocidade
3. Redeploy da edge function

### Fluxo
```text
Prompt → Edge Function (gera 4-8 frames via IA com retry)
                ↓
        Frames retornados (base64 PNG)
                ↓
   Client: Canvas + MediaRecorder → .webm real
                ↓
        Download como arquivo de vídeo
```

