

# Correções: Fontes maiores no menu + cores do sidebar seguindo o tema

## Problema
1. Fontes e ícones do menu estão pequenos
2. No modo escuro, as variáveis `--sidebar-*` não estão definidas no `.dark`, então o sidebar mantém cores claras

## Mudanças

### `src/index.css`
Adicionar variáveis `--sidebar-*` dentro do bloco `.dark` para que o sidebar acompanhe o tema escuro:
```css
--sidebar-background: 222 47% 11%;
--sidebar-foreground: 210 40% 98%;
--sidebar-primary: 210 40% 98%;
--sidebar-primary-foreground: 222 47% 11%;
--sidebar-accent: 217 33% 17%;
--sidebar-accent-foreground: 210 40% 98%;
--sidebar-border: 217 33% 20%;
--sidebar-ring: 24 94% 53%;
```

### `src/components/app-sidebar.tsx`
- Aumentar ícones: `h-5 w-5` (expandido) e `h-6 w-6` (colapsado)
- Aumentar fonte dos labels: adicionar `text-sm` explícito no `<span>`
- Aumentar label "Ferramentas": classe `text-xs` → já padrão, manter
- Usar `text-sidebar-foreground` nos labels para garantir cor correta

