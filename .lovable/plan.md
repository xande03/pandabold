

# Plano: Nova ferramenta de Upscale de Imagem

## Resumo
Criar um novo módulo "Upscale de Imagem" onde o usuário faz upload, escolhe proporção e descrição de upscale, e o processamento é feito pelo Nano Banana Pro (`google/gemini-3-pro-image-preview`) via a edge function `edit-image` já existente. Adicionar classificação "upscale" na galeria.

## Mudanças

### 1. `src/lib/store/app-store.ts`
- Adicionar `'upscale'` ao tipo `ModuleId`
- Adicionar interface `UpscaledImage` (id, originalUrl, upscaledUrl, scale, description, timestamp)
- Adicionar `upscaledImages[]` e `addUpscaledImage()` ao store

### 2. `src/components/modules/image-upscale.tsx` (novo)
- Upload de imagem com preview
- Select de proporção: 2x, 4x, 8x
- 4 botões de descrição pré-definida:
  - "Restaurar detalhes e nitidez máxima"
  - "Aumentar resolução preservando texturas"
  - "Melhorar cores e contraste com HDR"
  - "Restaurar rosto com detalhes realistas"
- Input de texto livre como alternativa
- Chama `supabase.functions.invoke('edit-image')` com instrução combinando proporção + descrição
- Resultado exibido lado a lado (antes/depois) com download
- Usa `GenerationLoading` durante processamento

### 3. `src/components/app-sidebar.tsx`
- Adicionar `{ id: "upscale", label: "Upscale de Imagem", icon: Maximize2 }` na lista de módulos

### 4. `src/pages/Index.tsx`
- Importar `ImageUpscale` e adicionar ao `moduleComponents` e `moduleTitles`

### 5. `src/components/modules/gallery.tsx`
- Adicionar `upscaledImages` ao `allItems` com `type: "upscale"`
- Adicionar filtro "Upscale" no select
- Adicionar ícone e label para o tipo "upscale"

### Sem mudanças no backend
A edge function `edit-image` já suporta qualquer instrução de edição com o modelo Nano Banana Pro — basta enviar a instrução de upscale como `instruction`.

