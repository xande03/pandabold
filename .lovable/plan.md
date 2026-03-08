

# Plano: Seletor de tamanho/proporção no Upscale + responsividade mobile

## Mudanças em `src/components/modules/image-upscale.tsx`

### 1. Adicionar seletor de tamanho de saída
Novo estado `outputSize` com opções pré-definidas de dimensões:
- **Personalizado** (mantém proporção original)
- **1080×1080** (Instagram quadrado)
- **1920×1080** (Full HD / 16:9)
- **1080×1920** (Stories / 9:16)
- **2560×1440** (2K / 16:9)
- **3840×2160** (4K / 16:9)
- **1200×628** (Open Graph / Redes sociais)

Renderizado como um `Select` ao lado do seletor de escala existente.

### 2. Adicionar seletor de proporção (aspect ratio)
Novo estado `aspectRatio` com opções:
- **Original** (sem corte)
- **1:1** (Quadrado)
- **16:9** (Widescreen)
- **9:16** (Vertical/Stories)
- **4:3** (Padrão)
- **3:2** (Fotografia)

Renderizado como badges clicáveis (mesmo padrão dos presets de descrição).

### 3. Incluir no prompt da instrução
A instrução enviada à edge function incluirá o tamanho e proporção escolhidos:
```
Upscale this image by ${scale}. Output size: ${outputSize}. Aspect ratio: ${aspectRatio}. ${desc}...
```

### 4. Layout responsivo para mobile
- Seletores de escala, tamanho e proporção em grid `grid-cols-1 sm:grid-cols-2` para empilhar no mobile
- Badges dos presets com `flex-wrap` (já existe) e tamanho de toque adequado (`min-h-[44px]` nos badges)
- Resultado antes/depois já é `grid-cols-1 md:grid-cols-2` (ok)
- Upload area com padding reduzido no mobile: `p-6 sm:p-10`
- Cards com `p-3 sm:p-4` para melhor uso de espaço no mobile

Nenhuma mudança em outros arquivos necessária.

