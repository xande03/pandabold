

# Correção: Vídeo gerado mas conexão expira antes de receber resposta

## Problema Raiz
Os logs do backend mostram que **todos os 6 frames foram gerados com sucesso**, mas a conexão HTTP expirou antes de enviar a resposta ao cliente:
```
Frame 1/6 generated successfully (22:11:51)
Frame 2/6 generated successfully (22:12:13)
...
Frame 6/6 generated successfully (22:14:10)
ERROR: Http: connection closed before message completed
```

A geração leva ~2.5 minutos. O cliente Supabase desconecta antes disso, resultando em "Failed to fetch" → status "Falhou".

## Solução: Gerar frames individualmente no client

Em vez de uma única chamada longa ao edge function, **gerar cada frame separadamente** no frontend. Cada chamada leva ~20s (bem dentro do timeout).

### Mudanças:

1. **`supabase/functions/generate-video/index.ts`** — Simplificar para gerar **1 frame por chamada**. Recebe `prompt`, `style`, `resolution`, `frameIndex`, `totalFrames` e retorna 1 imagem.

2. **`src/components/modules/video-studio.tsx`** — Loop no client: chamar a edge function N vezes (1 por frame), atualizando o progresso em tempo real no store. Cada frame recebido é adicionado ao array imediatamente, permitindo visualização progressiva.

### Fluxo novo:
```text
Client loop (frame 1..N):
  → POST generate-video { frameIndex: i, totalFrames: N, prompt, style }
  ← { frame: "data:image/png;base64,..." }
  → updateVideoTask(id, { frames: [...prev, newFrame], progress: i/N*100 })
```

### Benefícios:
- Cada request dura ~20s (sem timeout)
- Progresso real visível frame a frame
- Se um frame falhar, os anteriores são preservados
- Feedback visual imediato conforme cada frame chega

