

# Plano: Correções QR Code + Music DNA

## Problemas identificados

### QR Code - Upload de música falha
O erro `InvalidKey` no network log mostra que nomes de arquivo com espaços e caracteres especiais causam falha no storage. O filePath `1773015786558-06 Reina Sobre Mim - Nívea Soares CD Reina Sobre Mim.mp3` contém espaços — Supabase Storage rejeita isso.

### QR Code - Aceitar .zip
O tipo "file" já aceita `*`, mas precisa aceitar `.zip` explicitamente também.

### Music DNA - Identificação mais completa
O prompt do edge function precisa ser melhorado para retornar artista, álbum, tom (key) e dados mais detalhados. A interface precisa exibir campos extras: artista, álbum, tom.

### Music DNA - Link yout.com incorreto
Atualmente gera `https://yout.com/video/{id}`, mas o formato correto é `https://yout.com/playlist/?list=RD{id}&v={id}`.

## Mudanças

### 1. `src/components/modules/qr-code-generator.tsx`
- **Sanitizar nome do arquivo** no upload: remover espaços e caracteres especiais do filePath usando `encodeURIComponent` ou substituindo por `_`.
- **Aceitar .zip** no tipo "file": alterar `ACCEPTED_FILES.file` para incluir `.zip` explicitamente — na verdade `*` já aceita tudo, mas o `accept="*"` pode não funcionar em todos browsers. Mudar para `*/*,.zip` ou manter `*` que já cobre.

### 2. `src/components/modules/music-dna.tsx`
- **Corrigir `getYoutComUrl`**: mudar de `https://yout.com/video/${id}` para `https://yout.com/playlist/?list=RD${id}&v=${id}`.
- **Adicionar cards** para: Artista/Álbum, Tom (key musical).
- **Adicionar campos** à interface para exibir `artist`, `album`, `key`.

### 3. `src/lib/store/app-store.ts`
- **Expandir `MusicAnalysis`** com campos opcionais: `artist?: string`, `album?: string`, `key?: { note: string; scale: string; confidence: number }`.

### 4. `supabase/functions/analyze-music/index.ts`
- **Melhorar o prompt** para pedir identificação da música: artista, nome da música, álbum, tom (key), e letra completa. Adicionar campos `artist`, `songTitle`, `album`, `key` ao JSON de retorno esperado.

