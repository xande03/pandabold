

# Plano: Corrigir QR Codes para arquivos + adicionar tipo "Arquivo"

## Problema
Para tipos **imagem, música e PDF**, o QR code atualmente codifica o texto `"Panda Bold - image: foto.jpg"` — que não aponta para nenhum lugar. O correto é **fazer upload do arquivo para o storage** e codificar a **URL pública** no QR code, para que ao escanear o código o usuário acesse o arquivo real.

## Mudanças

### 1. Migration SQL — Criar bucket de storage `qr-files`
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('qr-files', 'qr-files', true);
CREATE POLICY "Anyone can upload qr files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr-files');
CREATE POLICY "Anyone can read qr files" ON storage.objects FOR SELECT USING (bucket_id = 'qr-files');
```

### 2. `src/components/modules/qr-code-generator.tsx`
- Adicionar tipo **"Arquivo"** (ícone `File`) ao `QR_TYPES` e ao `ACCEPTED_FILES` (aceitar `*`)
- No `handleGenerate`, para tipos com arquivo:
  1. Upload do arquivo para `qr-files` bucket via `supabase.storage.from('qr-files').upload(...)`
  2. Obter URL pública com `getPublicUrl()`
  3. Usar essa URL como conteúdo do QR code
- Para **link**: manter como está (codifica a URL diretamente)
- Para **texto**: manter como está (codifica o texto diretamente)

### 3. Nenhuma outra mudança necessária
O histórico e realtime já funcionam corretamente — o `content` salvo no banco passará a ser a URL pública em vez do texto placeholder.

