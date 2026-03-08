

# Plano: Sidebar, PWA, Responsividade e Novos Módulos

## 1. Sidebar de Navegação (substituir nav atual)

Usar o componente `Sidebar` do shadcn/ui com `collapsible="icon"` para funcionar como menu lateral esquerdo.

**Mudanças:**
- **`src/pages/Index.tsx`** — Envolver com `SidebarProvider`, layout flex com `AppSidebar` + conteúdo
- **Novo: `src/components/app-sidebar.tsx`** — Sidebar com todos os módulos (ícones + labels), logo Panda Bold no topo, ThemeToggle no footer. No mobile, usar `collapsible="offcanvas"` para overlay
- **`src/components/modules/main-nav.tsx`** — Remover ou simplificar para apenas um header fino com `SidebarTrigger` + título do módulo ativo
- **`src/lib/store/app-store.ts`** — Adicionar os 2 novos ModuleIds: `'summarizer' | 'signature'`

## 2. Responsividade Mobile

- Todos os módulos: revisar grids para usar `grid-cols-1` no mobile, `grid-cols-2` no tablet
- Sidebar: no mobile, colapsa como overlay (offcanvas) com trigger no header
- Remover bottom nav mobile (substituída pela sidebar)
- Ajustar padding/margins para telas pequenas (`px-2 sm:px-4`)
- Cards de ferramentas: stack vertical no mobile

## 3. PWA Efetiva

- Instalar `vite-plugin-pwa` e configurar no `vite.config.ts` com manifest inline, icons, `navigateFallbackDenylist: [/^\/~oauth/]`
- Atualizar `public/manifest.json` com ícones de múltiplos tamanhos (192x192, 512x512)
- Gerar ícones SVG do panda em PNG via componente ou usar ícones inline no manifest
- Adicionar `<link rel="apple-touch-icon">` no `index.html`
- Criar ícones PWA como SVG convertidos (ou usar favicon existente referenciado em múltiplos tamanhos)

## 4. Novo Módulo: Resumidor de Texto/PDF com IA

**Novo: `src/components/modules/text-summarizer.tsx`**
- Upload de PDF via `<input type="file" accept=".pdf,.txt">`
- Para PDF: usar edge function que extrai texto e envia ao modelo de IA
- Para texto: textarea para colar texto longo
- Opções: Resumo, Pontos-chave, Flashcards
- Resultado renderizado com markdown

**Novo: `supabase/functions/summarize-text/index.ts`**
- Recebe texto + tipo (resumo/pontos-chave/flashcards)
- Usa `google/gemini-3-flash-preview` via Lovable AI Gateway
- Streaming response para feedback em tempo real

## 5. Novo Módulo: Gerador de Assinatura Digital

**Novo: `src/components/modules/digital-signature.tsx`**
- Canvas HTML5 para desenhar com mouse/touch
- Controles: cor da caneta, espessura, limpar, desfazer
- Fundo transparente (checkerboard visual)
- Exportar como PNG transparente (download)
- Responsivo: canvas adapta ao tamanho da tela

## Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `src/components/app-sidebar.tsx` | Criar — sidebar com todos os 9 módulos |
| `src/components/modules/text-summarizer.tsx` | Criar — módulo resumidor |
| `src/components/modules/digital-signature.tsx` | Criar — módulo assinatura |
| `supabase/functions/summarize-text/index.ts` | Criar — edge function IA |
| `src/pages/Index.tsx` | Modificar — SidebarProvider + layout |
| `src/components/modules/main-nav.tsx` | Modificar — simplificar para header com trigger |
| `src/lib/store/app-store.ts` | Modificar — adicionar novos ModuleIds |
| `vite.config.ts` | Modificar — adicionar vite-plugin-pwa |
| `public/manifest.json` | Modificar — ícones multi-tamanho |
| `index.html` | Modificar — apple-touch-icon |
| `supabase/config.toml` | Modificar — adicionar summarize-text function |

