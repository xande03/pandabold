

# Plano: Correções e persistência de QR Codes no banco de dados

## Problemas identificados

1. **`summarize-text` não está registrada no `config.toml`** — a função existe e funciona quando chamada diretamente, mas falta a entrada `[functions.summarize-text]` no config.toml. Isso pode causar problemas de deploy.

2. **Título "Estúdio de Vídeo" desatualizado no `Index.tsx`** — a sidebar já mostra "Frames de Vídeo" mas o título no header ainda diz "Estúdio de Vídeo".

3. **QR Codes só existem em memória (Zustand)** — os QR codes gerados se perdem ao recarregar a página. O usuário quer persistência no banco de dados com acesso livre e simultâneo para múltiplos usuários.

4. **Music DNA — redirecionamento yout.com** — já está funcionando corretamente (função `getYoutComUrl` com `window.open`).

5. **Demais ferramentas (Chat, Image Lab, Editor, Video, Summarizer, Signature)** — todas testadas e funcionando via edge functions.

## Mudanças

### 1. `supabase/config.toml` — Adicionar summarize-text
```toml
[functions.summarize-text]
verify_jwt = false
```

### 2. `src/pages/Index.tsx` — Corrigir título do vídeo
Alterar `video: "Estúdio de Vídeo"` → `video: "Frames de Vídeo"`.

### 3. Criar tabela `qr_codes` no banco de dados (migration)
```sql
CREATE TABLE public.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  qr_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- Acesso livre para todos (sem autenticação necessária)
CREATE POLICY "Anyone can read qr_codes" ON public.qr_codes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert qr_codes" ON public.qr_codes FOR INSERT WITH CHECK (true);

-- Habilitar realtime para acesso simultâneo
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_codes;
```

### 4. `src/components/modules/qr-code-generator.tsx` — Persistir no banco + carregar em tempo real
- Importar `supabase` client
- No `useEffect` inicial, carregar QR codes do banco e inscrever-se no canal realtime para receber novos QR codes de outros usuários em tempo real
- Na geração, fazer `INSERT` na tabela `qr_codes` além de salvar no Zustand
- Exibir QR codes do banco (combinados com os locais ou substituindo-os)

### 5. `src/lib/store/app-store.ts` — Adicionar setter para qrCodes
- Adicionar `setQRCodes` para substituir a lista inteira quando carregada do banco

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `supabase/config.toml` | Adicionar `summarize-text` |
| `src/pages/Index.tsx` | Corrigir título vídeo |
| Migration SQL | Criar tabela `qr_codes` com RLS pública e realtime |
| `src/components/modules/qr-code-generator.tsx` | Persistir e carregar do banco com realtime |
| `src/lib/store/app-store.ts` | Adicionar `setQRCodes` |

